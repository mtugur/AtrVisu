import { describe, expect, it, vi } from "vitest";
import type { PlatformEntity } from "../contracts";
import {
  applyRuntimeSelectionRequest,
  createEmptyRuntimeSelection,
  evaluateAtomicMovement,
  executeAtomicSelectionMutation,
  getAtomicMovementEntityIds,
  parseRuntimeSelectionEntityId,
  projectRuntimeSelection,
  reconcileRuntimeSelection,
  replaceRuntimeSelection
} from "./runtimeSelectionBridge";

const entity = (
  id: string,
  type: "machine" | "civil" | "annotation",
  overrides: Partial<PlatformEntity> = {}
): PlatformEntity => ({
  id,
  type,
  name: id,
  transform: { planX: 0, planY: 0, elevation: 0, rotationDeg: 0 },
  properties: [],
  connectors: [],
  childrenIds: [],
  layerId: "default",
  visible: true,
  locked: false,
  selectable: true,
  ...overrides
});

const entities = [
  entity("machine:m1", "machine"),
  entity("machine:m2", "machine"),
  entity("civil:c1", "civil"),
  entity("annotation:a1", "annotation")
];

describe("runtime selection bridge", () => {
  it("creates an empty canonical selection", () => {
    expect(createEmptyRuntimeSelection("scene")).toEqual({ ids: [], source: "scene" });
  });

  it.each([
    ["machine:m1", "machine", ["m1"]],
    ["civil:c1", "civil", ["c1"]],
    ["annotation:a1", "annotation", ["a1"]]
  ] as const)("selects a canonical %s entity", (targetId, family, expectedIds) => {
    const selection = applyRuntimeSelectionRequest(createEmptyRuntimeSelection("scene"), {
      targetId,
      mode: "replace",
      source: "scene"
    }, entities);
    const projection = projectRuntimeSelection(selection);

    expect(selection.ids).toEqual([targetId]);
    if (family === "machine") {
      expect(projection.selectedMachineIds).toEqual(expectedIds);
    } else if (family === "civil") {
      expect(projection.selectedCivilReferenceIds).toEqual(expectedIds);
    } else {
      expect(projection.selectedAnnotationId).toBe(expectedIds[0]);
    }
  });

  it("preserves mixed machine and civil order with a stable first-selected primary", () => {
    const machineSelection = applyRuntimeSelectionRequest(createEmptyRuntimeSelection("scene"), {
      targetId: "machine:m1",
      mode: "replace",
      source: "scene"
    }, entities);
    const mixedSelection = applyRuntimeSelectionRequest(machineSelection, {
      targetId: "civil:c1",
      mode: "toggle",
      source: "scene"
    }, entities);

    expect(mixedSelection).toEqual({
      ids: ["machine:m1", "civil:c1"],
      primaryId: "machine:m1",
      source: "scene"
    });
    expect(projectRuntimeSelection(mixedSelection).selectedAlignableEntityIds).toEqual([
      "machine:m1",
      "civil:c1"
    ]);
  });

  it("supports additive selection and deterministic toggle removal", () => {
    const selection = replaceRuntimeSelection(["machine:m1", "machine:m2", "civil:c1"], "explorer");
    const next = applyRuntimeSelectionRequest(selection, {
      targetId: "machine:m1",
      mode: "toggle",
      source: "scene"
    }, entities);

    expect(next.ids).toEqual(["machine:m2", "civil:c1"]);
    expect(next.primaryId).toBe("machine:m2");
  });

  it("clears the complete selection", () => {
    expect(applyRuntimeSelectionRequest(replaceRuntimeSelection(["machine:m1"], "scene"), {
      targetId: null,
      mode: "clear",
      source: "scene"
    }, entities)).toEqual({ ids: [], source: "scene" });
  });

  it("does not introduce multi-annotation selection", () => {
    const next = applyRuntimeSelectionRequest(replaceRuntimeSelection(["machine:m1"], "scene"), {
      targetId: "annotation:a1",
      mode: "toggle",
      source: "scene"
    }, entities);

    expect(next.ids).toEqual(["annotation:a1"]);
  });

  it("removes deleted and unknown entity ids deterministically", () => {
    const selection = replaceRuntimeSelection([
      "machine:m1",
      "machine:deleted",
      "unknown:value",
      "civil:c1"
    ], "command");

    expect(reconcileRuntimeSelection(selection, entities).ids).toEqual(["machine:m1", "civil:c1"]);
  });

  it("rejects hidden and non-selectable entities from active selection", () => {
    const unavailableEntities = [
      ...entities,
      entity("machine:hidden", "machine", { visible: false }),
      entity("civil:disabled", "civil", { selectable: false })
    ];

    expect(reconcileRuntimeSelection(
      replaceRuntimeSelection(["machine:hidden", "civil:disabled", "machine:m1"], "scene"),
      unavailableEntities
    ).ids).toEqual(["machine:m1"]);
  });

  it("keeps a locked visible entity selectable", () => {
    const lockedEntities = [entity("machine:locked", "machine", { locked: true })];

    expect(reconcileRuntimeSelection(
      replaceRuntimeSelection(["machine:locked"], "scene"),
      lockedEntities
    ).ids).toEqual(["machine:locked"]);
  });

  it("deduplicates selected ids without changing first-seen order", () => {
    expect(reconcileRuntimeSelection(
      replaceRuntimeSelection(["machine:m1", "civil:c1", "machine:m1"], "scene"),
      entities
    ).ids).toEqual(["machine:m1", "civil:c1"]);
  });

  it("parses canonical keys without confusing family-like source ids", () => {
    expect(parseRuntimeSelectionEntityId("machine:civil:column-1")).toEqual({
      family: "machine",
      sourceId: "civil:column-1"
    });
    expect(parseRuntimeSelectionEntityId("civil:machine:m1")).toEqual({
      family: "civil",
      sourceId: "machine:m1"
    });
    expect(parseRuntimeSelectionEntityId("group:machine:m1")).toBeNull();
  });
});

describe("atomic selection movement", () => {
  it("allows an all-unlocked multi-selection and executes it exactly once", () => {
    const beforeMutation = vi.fn();
    const mutate = vi.fn();
    const result = executeAtomicSelectionMutation({
      entityIds: ["machine:m1", "machine:m2"],
      entities,
      beforeMutation,
      mutate
    });

    expect(result.allowed).toBe(true);
    expect(beforeMutation).toHaveBeenCalledTimes(1);
    expect(mutate).toHaveBeenCalledTimes(1);
  });

  it.each([
    ["locked machine", entity("machine:m2", "machine", { locked: true })],
    ["layer-locked machine", entity("machine:m2", "machine", { locked: true, layerId: "locked-layer" })],
    ["locked civil reference", entity("civil:c1", "civil", { locked: true })],
    ["layer-locked annotation", entity("annotation:a1", "annotation", {
      locked: true,
      layerId: "locked-layer"
    })]
  ])("blocks the complete mutation for one %s", (_label, blockedEntity) => {
    const beforeMutation = vi.fn();
    const mutate = vi.fn();
    const result = executeAtomicSelectionMutation({
      entityIds: ["machine:m1", blockedEntity.id],
      entities: [entity("machine:m1", "machine"), blockedEntity],
      beforeMutation,
      mutate
    });

    expect(result).toMatchObject({ allowed: false, blockedEntityId: blockedEntity.id, reason: "locked" });
    expect(beforeMutation).not.toHaveBeenCalled();
    expect(mutate).not.toHaveBeenCalled();
  });

  it("blocks movement for a single locked object", () => {
    expect(evaluateAtomicMovement(
      ["machine:locked"],
      [entity("machine:locked", "machine", { locked: true })]
    )).toEqual({
      allowed: false,
      entityIds: ["machine:locked"],
      blockedEntityId: "machine:locked",
      reason: "locked"
    });
  });

  it("blocks a mixed machine and civil selection without partial movement", () => {
    const sourcePositions = [
      { id: "machine:m1", xMm: 100 },
      { id: "civil:c1", xMm: 500 }
    ];
    const mutate = vi.fn(() => {
      sourcePositions[0].xMm += 100;
      sourcePositions[1].xMm += 100;
    });
    const result = executeAtomicSelectionMutation({
      entityIds: ["machine:m1", "civil:c1"],
      entities: [
        entity("machine:m1", "machine"),
        entity("civil:c1", "civil", { locked: true })
      ],
      mutate
    });

    expect(result.allowed).toBe(false);
    expect(mutate).not.toHaveBeenCalled();
    expect(sourcePositions).toEqual([
      { id: "machine:m1", xMm: 100 },
      { id: "civil:c1", xMm: 500 }
    ]);
  });

  it.each([
    ["unresolved", ["machine:missing"], entities],
    ["hidden", ["machine:hidden"], [entity("machine:hidden", "machine", { visible: false })]],
    ["non-selectable", ["machine:disabled"], [entity("machine:disabled", "machine", { selectable: false })]]
  ] as const)("rejects a %s movement candidate", (reason, entityIds, availableEntities) => {
    expect(evaluateAtomicMovement(entityIds, availableEntities)).toMatchObject({
      allowed: false,
      reason
    });
  });

  it("does not create history, dirty state, or a transaction for a rejected drag", () => {
    const recordHistory = vi.fn();
    const markUnsaved = vi.fn();
    let transactionState: { active: true } | null = null;
    const result = executeAtomicSelectionMutation({
      entityIds: ["machine:m1", "machine:m2"],
      entities: [
        entity("machine:m1", "machine"),
        entity("machine:m2", "machine", { locked: true })
      ],
      beforeMutation: () => {
        recordHistory();
        markUnsaved();
      },
      mutate: () => {
        transactionState = { active: true };
      }
    });

    expect(result.allowed).toBe(false);
    expect(recordHistory).not.toHaveBeenCalled();
    expect(markUnsaved).not.toHaveBeenCalled();
    expect(transactionState).toBeNull();
  });

  it("uses the complete current selection for a selected drag target", () => {
    const selection = replaceRuntimeSelection(["machine:m1", "civil:c1"], "scene");

    expect(getAtomicMovementEntityIds(selection, ["machine:m1"], true)).toEqual([
      "machine:m1",
      "civil:c1"
    ]);
    expect(getAtomicMovementEntityIds(selection, ["machine:m1"], false)).toEqual(["machine:m1"]);
  });
});
