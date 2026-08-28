import { describe, expect, it, vi } from "vitest";
import type { PlatformEntity } from "../platform/contracts";
import { replaceRuntimeSelection } from "../platform/runtimeSelection";
import type { MachineConnectionPoint } from "../types/ataraMachineData";
import type { MachineDefinition, PlacedMachine } from "../types/machine";
import {
  applyConnectionPointSnap,
  evaluateConnectionPointSnapContext,
  evaluatePremiumConnectionPointSnapContext,
  evaluateConnectionPointSnapRuntimeAccess,
  evaluateConnectionPointSnapCandidate,
  executeGuardedConnectionPointSnap,
  findProductFlowConnectionPointPair,
  formatConnectionPointSelectorLabel,
  getConnectionPointCompatibility,
  getConnectionPointSnapContextMessage,
  getConnectionPointSnapDelta
} from "./connectionPointSnap";

const point = (
  id: string,
  type: MachineConnectionPoint["type"],
  xMm: number,
  yMm: number,
  direction: MachineConnectionPoint["direction"],
  name = id
): MachineConnectionPoint => ({
  id,
  name,
  type,
  positionMm: { xMm, yMm, zMm: 500 },
  direction
});

const definition = (id: string, connectionPoints: MachineConnectionPoint[]): MachineDefinition => ({
  id,
  name: id,
  category: "Conveyor",
  widthMm: 2000,
  depthMm: 1000,
  heightMm: 1000,
  width: 2,
  depth: 1,
  height: 1,
  defaultColor: "#cccccc",
  connectionPoints: [],
  capabilities: {
    canConvey: true,
    canPalletize: false,
    canWrap: false,
    hasFlowDirection: true
  },
  ataraMachineData: {
    connectionPoints
  }
});

const machine = (
  instanceId: string,
  xMm: number,
  yMm: number,
  rotationDeg: number,
  connectionPoints: MachineConnectionPoint[]
): PlacedMachine => {
  const itemDefinition = definition(instanceId, connectionPoints);
  return {
    instanceId,
    machineDefinitionId: itemDefinition.id,
    definition: itemDefinition,
    definitionSnapshot: itemDefinition,
    position: { x: xMm / 1000, z: yMm / 1000 },
    positionMm: { xMm, yMm },
    elevationMm: 0,
    rotationDeg,
    rotationY: rotationDeg,
    flowDirection: "forward"
  };
};

const platformMachine = (
  id: string,
  overrides: Partial<PlatformEntity> = {}
): PlatformEntity => ({
  id: `machine:${id}`,
  type: "machine",
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

const platformGroup = (id: string, childrenIds: string[]): PlatformEntity => ({
  id: `group:${id}`,
  type: "group",
  name: id,
  transform: { planX: 0, planY: 0, elevation: 0, rotationDeg: 0 },
  properties: [],
  connectors: [],
  childrenIds,
  layerId: "default",
  visible: true,
  locked: false,
  selectable: true
});

const platformCivil = (id: string): PlatformEntity => ({
  id: `civil:${id}`,
  type: "civil",
  name: id,
  transform: { planX: 0, planY: 0, elevation: 0, rotationDeg: 0 },
  properties: [],
  connectors: [],
  childrenIds: [],
  layerId: "default",
  visible: true,
  locked: false,
  selectable: true
});

describe("connection point snap helpers", () => {
  const movingOut = point("CP-OUT", "product-out", 1000, 0, "x+", "Product Out");
  const fixedIn = point("CP-IN", "product-in", -1000, 0, "x-", "Product In");

  it("formats useful selector labels", () => {
    expect(formatConnectionPointSelectorLabel(movingOut)).toBe("Product Out - CP-OUT - Product Out");
    expect(getConnectionPointSnapContextMessage("explicit-selection-required"))
      .toBe("Select exactly two explicit machines.");
  });

  it("reports product-out to product-in compatibility", () => {
    const moving = machine("moving", 0, 0, 0, [movingOut]);
    const fixed = machine("fixed", 5000, 0, 0, [fixedIn]);
    expect(getConnectionPointCompatibility(moving, fixed, movingOut, fixedIn)).toMatchObject({
      level: "good"
    });
  });

  it("warns for same product connection type", () => {
    const moving = machine("moving", 0, 0, 0, [movingOut]);
    const fixed = machine("fixed", 5000, 0, 0, [movingOut]);
    const compatibility = getConnectionPointCompatibility(moving, fixed, movingOut, movingOut);
    expect(compatibility.level).toBe("warning");
    expect(compatibility.messages.join(" ")).toContain("Same connection type selected");
  });

  it("handles missing point selection safely", () => {
    expect(getConnectionPointCompatibility(undefined, undefined, undefined, undefined)).toMatchObject({
      level: "invalid"
    });
  });

  it("marks snap candidate missing when one or both machines have no connection points", () => {
    const moving = machine("moving", 0, 0, 0, []);
    const fixed = machine("fixed", 5000, 0, 0, [fixedIn]);

    expect(evaluateConnectionPointSnapCandidate(moving, fixed, undefined, fixedIn)).toMatchObject({
      status: "missing-points",
      canSnap: false
    });
    expect(evaluateConnectionPointSnapCandidate(moving, machine("empty-fixed", 5000, 0, 0, []), undefined, undefined)).toMatchObject({
      status: "missing-points",
      canSnap: false
    });
  });

  it("does not allow snap candidate when snap is disabled", () => {
    const moving = machine("moving", 0, 0, 0, [movingOut]);
    const fixed = machine("fixed", 5000, 0, 0, [fixedIn]);

    expect(evaluateConnectionPointSnapCandidate(moving, fixed, movingOut, fixedIn, { enabled: false })).toEqual({
      status: "disabled",
      canSnap: false
    });
  });

  it("rejects snap candidate outside the configured distance threshold", () => {
    const moving = machine("moving", 0, 0, 0, [movingOut]);
    const fixed = machine("fixed", 5000, 0, 0, [fixedIn]);
    const evaluation = evaluateConnectionPointSnapCandidate(moving, fixed, movingOut, fixedIn, {
      maxSnapDistanceMm: 2500
    });

    expect(evaluation.status).toBe("out-of-threshold");
    expect(evaluation.canSnap).toBe(false);
    expect(evaluation.distanceMm).toBe(3000);
  });

  it("accepts snap candidate inside the configured distance threshold", () => {
    const moving = machine("moving", 0, 0, 0, [movingOut]);
    const fixed = machine("fixed", 5000, 0, 0, [fixedIn]);
    const evaluation = evaluateConnectionPointSnapCandidate(moving, fixed, movingOut, fixedIn, {
      maxSnapDistanceMm: 3500
    });

    expect(evaluation.status).toBe("ready");
    expect(evaluation.canSnap).toBe(true);
    expect(evaluation.distanceMm).toBe(3000);
    expect(evaluation.delta).toMatchObject({ deltaXMm: 3000, deltaYMm: 0 });
  });

  it("calculates zero-gap delta without rotation", () => {
    const moving = machine("moving", 0, 0, 0, [movingOut]);
    const fixed = machine("fixed", 5000, 0, 0, [fixedIn]);
    expect(getConnectionPointSnapDelta(moving, fixed, movingOut, fixedIn, 0)).toMatchObject({
      deltaXMm: 3000,
      deltaYMm: 0
    });
  });

  it("calculates delta with 90 degree object rotation", () => {
    const moving = machine("moving", 0, 0, 90, [movingOut]);
    const fixed = machine("fixed", 5000, 0, 0, [fixedIn]);
    expect(getConnectionPointSnapDelta(moving, fixed, movingOut, fixedIn, 0)).toMatchObject({
      deltaXMm: 4000,
      deltaYMm: -1000
    });
  });

  it("applies snap with zero gap and keeps fixed object unchanged", () => {
    const moving = machine("moving", 0, 0, 0, [movingOut]);
    const fixed = machine("fixed", 5000, 0, 0, [fixedIn]);
    const result = applyConnectionPointSnap(
      [moving, fixed],
      { movingMachineId: "moving", fixedMachineId: "fixed", movingPointId: "CP-OUT", fixedPointId: "CP-IN", gapMm: 0 },
      movingOut,
      fixedIn
    );
    expect(result.find((item) => item.instanceId === "moving")?.positionMm).toEqual({ xMm: 3000, yMm: 0 });
    expect(result.find((item) => item.instanceId === "fixed")?.positionMm).toEqual({ xMm: 5000, yMm: 0 });
  });

  it("applies snap with 500 mm gap along fixed point world direction", () => {
    const moving = machine("moving", 0, 0, 0, [movingOut]);
    const fixed = machine("fixed", 5000, 0, 0, [fixedIn]);
    const result = applyConnectionPointSnap(
      [moving, fixed],
      { movingMachineId: "moving", fixedMachineId: "fixed", movingPointId: "CP-OUT", fixedPointId: "CP-IN", gapMm: 500 },
      movingOut,
      fixedIn
    );
    expect(result.find((item) => item.instanceId === "moving")?.positionMm).toEqual({ xMm: 2500, yMm: 0 });
  });

  it("preserves snap access for two explicitly selected ungrouped machines", () => {
    const selection = replaceRuntimeSelection(["machine:moving", "machine:fixed"], "scene");
    const entities = [platformMachine("moving"), platformMachine("fixed")];

    expect(evaluateConnectionPointSnapContext({ selection, entities })).toMatchObject({
      available: true,
      machineIds: ["moving", "fixed"]
    });
    expect(evaluateConnectionPointSnapRuntimeAccess({
      selection,
      entities,
      movingMachineId: "moving",
      fixedMachineId: "fixed"
    })).toEqual({ allowed: true });
  });

  it("exposes premium snap only for a deterministic product-out to product-in pair", () => {
    const flowPack = machine("flow-pack", 0, 0, 0, [movingOut]);
    const conveyor = machine("conveyor", 5000, 0, 0, [fixedIn]);
    const selection = replaceRuntimeSelection(["machine:flow-pack", "machine:conveyor"], "scene");
    const entities = [platformMachine("flow-pack"), platformMachine("conveyor")];

    expect(findProductFlowConnectionPointPair([flowPack, conveyor])).toMatchObject({
      movingMachineId: "flow-pack",
      fixedMachineId: "conveyor",
      movingPoint: { id: "CP-OUT" },
      fixedPoint: { id: "CP-IN" }
    });
    expect(evaluatePremiumConnectionPointSnapContext({
      selection,
      entities,
      machines: [flowPack, conveyor]
    })).toMatchObject({
      available: true,
      productFlowPair: {
        movingMachineId: "flow-pack",
        fixedMachineId: "conveyor"
      }
    });
  });

  it("swaps moving and fixed machine order to obtain a valid product-flow pair", () => {
    const conveyor = machine("conveyor", 5000, 0, 0, [fixedIn]);
    const flowPack = machine("flow-pack", 0, 0, 0, [movingOut]);

    expect(findProductFlowConnectionPointPair([conveyor, flowPack])).toMatchObject({
      movingMachineId: "flow-pack",
      fixedMachineId: "conveyor",
      movingPoint: { type: "product-out" },
      fixedPoint: { type: "product-in" }
    });
  });

  it.each([
    ["two load-only pallets", point("LOAD-A", "other", 0, 0, "z+"), point("LOAD-B", "other", 0, 0, "z-")],
    ["same product-in points", fixedIn, fixedIn],
    ["same product-out points", movingOut, movingOut],
    ["utility-only points", point("POWER", "electrical", 0, 0, "x+"), point("AIR", "pneumatic", 0, 0, "x-")]
  ])("rejects %s from the premium contextual snap surface", (_label, firstPoint, secondPoint) => {
    const first = machine("first", 0, 0, 0, [firstPoint]);
    const second = machine("second", 5000, 0, 0, [secondPoint]);
    const selection = replaceRuntimeSelection(["machine:first", "machine:second"], "scene");

    expect(evaluatePremiumConnectionPointSnapContext({
      selection,
      entities: [platformMachine("first"), platformMachine("second")],
      machines: [first, second]
    })).toEqual({ available: false, reason: "no-product-flow-pair" });
  });

  it("keeps premium command execution inside the guarded snap authority", () => {
    const mutate = vi.fn();
    const selection = replaceRuntimeSelection(["machine:moving", "machine:fixed"], "scene");
    const entities = [platformMachine("moving"), platformMachine("fixed")];

    expect(executeGuardedConnectionPointSnap({
      selection,
      entities,
      movingMachineId: "moving",
      fixedMachineId: "fixed",
      movingPoint: movingOut,
      fixedPoint: movingOut,
      requireProductFlowPair: true
    }, mutate)).toEqual({ allowed: false, reason: "no-product-flow-pair" });
    expect(mutate).not.toHaveBeenCalled();

    expect(executeGuardedConnectionPointSnap({
      selection,
      entities,
      movingMachineId: "moving",
      fixedMachineId: "fixed",
      movingPoint: movingOut,
      fixedPoint: fixedIn,
      requireProductFlowPair: true
    }, mutate)).toEqual({ allowed: true });
    expect(mutate).toHaveBeenCalledTimes(1);
  });

  it("rejects two machines with any additional authoritative entity", () => {
    const entities = [
      platformMachine("moving"),
      platformMachine("fixed"),
      platformMachine("extra"),
      platformCivil("column")
    ];

    expect(evaluateConnectionPointSnapContext({
      selection: replaceRuntimeSelection(["machine:moving", "machine:fixed", "civil:column"], "scene"),
      entities
    })).toEqual({ available: false, reason: "explicit-selection-required" });
    expect(evaluateConnectionPointSnapContext({
      selection: replaceRuntimeSelection(["machine:moving", "machine:fixed", "machine:extra"], "scene"),
      entities
    })).toEqual({ available: false, reason: "explicit-selection-required" });
  });

  it("rejects a group root projection instead of treating projected machines as explicit selection", () => {
    const parentId = "group:assembly";
    const entities = [
      platformMachine("moving", { parentId }),
      platformMachine("fixed", { parentId }),
      platformGroup("assembly", ["machine:moving", "machine:fixed"])
    ];

    expect(evaluateConnectionPointSnapContext({
      selection: replaceRuntimeSelection([parentId], "scene"),
      entities
    })).toEqual({ available: false, reason: "explicit-selection-required" });
  });

  it.each([
    ["moving hidden", { visible: false }, {}],
    ["moving non-selectable", { selectable: false }, {}],
    ["fixed hidden", {}, { visible: false }],
    ["fixed non-selectable", {}, { selectable: false }]
  ] as const)("rejects %s machine context", (_label, movingOverrides, fixedOverrides) => {
    expect(evaluateConnectionPointSnapContext({
      selection: replaceRuntimeSelection(["machine:moving", "machine:fixed"], "scene"),
      entities: [
        platformMachine("moving", movingOverrides),
        platformMachine("fixed", fixedOverrides)
      ]
    })).toEqual({ available: false, reason: "machine-unavailable" });
  });

  it("rejects grouped-member snap outside group edit without movement, history, or dirty state", () => {
    const moving = machine("moving", 0, 0, 0, [movingOut]);
    const fixed = machine("fixed", 5000, 0, 0, [fixedIn]);
    const originalPositions = [moving, fixed].map((item) => ({ ...item.positionMm }));
    const recordHistory = vi.fn();
    const markDirty = vi.fn();
    let machines = [moving, fixed];
    const parentId = "group:assembly";
    const entities = [
      platformMachine("moving", { parentId }),
      platformMachine("fixed", { parentId }),
      platformGroup("assembly", ["machine:moving", "machine:fixed"])
    ];

    const evaluation = executeGuardedConnectionPointSnap({
      selection: replaceRuntimeSelection([parentId], "scene"),
      entities,
      movingMachineId: "moving",
      fixedMachineId: "fixed"
    }, () => {
      recordHistory();
      markDirty();
      machines = applyConnectionPointSnap(
        machines,
        { movingMachineId: "moving", fixedMachineId: "fixed", movingPointId: "CP-OUT", fixedPointId: "CP-IN", gapMm: 0 },
        movingOut,
        fixedIn
      );
    });

    expect(evaluation).toEqual({ allowed: false, reason: "explicit-selection-required" });
    expect(machines.map((item) => item.positionMm)).toEqual(originalPositions);
    expect(recordHistory).not.toHaveBeenCalled();
    expect(markDirty).not.toHaveBeenCalled();
  });

  it("allows explicitly selected editable children only in their matching group edit mode", () => {
    const parentId = "group:assembly";
    const entities = [
      platformMachine("moving", { parentId }),
      platformMachine("fixed", { parentId }),
      platformGroup("assembly", ["machine:moving", "machine:fixed"])
    ];
    const groupRootSelection = replaceRuntimeSelection([parentId], "scene");
    const explicitChildren = replaceRuntimeSelection(["machine:moving", "machine:fixed"], "scene");

    expect(evaluateConnectionPointSnapRuntimeAccess({
      selection: groupRootSelection,
      entities,
      activeGroupEditId: "assembly",
      movingMachineId: "moving",
      fixedMachineId: "fixed"
    })).toEqual({ allowed: false, reason: "explicit-selection-required" });
    expect(evaluateConnectionPointSnapRuntimeAccess({
      selection: explicitChildren,
      entities,
      activeGroupEditId: "assembly",
      movingMachineId: "moving",
      fixedMachineId: "fixed"
    })).toEqual({ allowed: true });
    expect(evaluateConnectionPointSnapContext({
      selection: explicitChildren,
      entities,
      activeGroupEditId: "assembly"
    })).toMatchObject({ available: true });
    expect(evaluateConnectionPointSnapContext({
      selection: replaceRuntimeSelection([
        "machine:moving",
        "machine:fixed",
        "civil:extra"
      ], "scene"),
      entities: [...entities, platformCivil("extra")],
      activeGroupEditId: "assembly"
    })).toEqual({ available: false, reason: "explicit-selection-required" });
  });

  it("keeps active group edit snap subject to atomic lock rules", () => {
    const parentId = "group:assembly";
    const entities = [
      platformMachine("moving", { parentId }),
      platformMachine("fixed", { parentId, locked: true }),
      platformGroup("assembly", ["machine:moving", "machine:fixed"])
    ];

    expect(evaluateConnectionPointSnapRuntimeAccess({
      selection: replaceRuntimeSelection(["machine:moving", "machine:fixed"], "scene"),
      entities,
      activeGroupEditId: "assembly",
      movingMachineId: "moving",
      fixedMachineId: "fixed"
    })).toEqual({ allowed: false, reason: "locked" });
  });

  it("applies the existing atomic lock contract to ungrouped machines", () => {
    expect(evaluateConnectionPointSnapContext({
      selection: replaceRuntimeSelection(["machine:moving", "machine:fixed"], "scene"),
      entities: [platformMachine("moving"), platformMachine("fixed", { locked: true })]
    })).toEqual({ available: false, reason: "locked" });
  });

  it("rejects invalid explicit context before mutation, history, or dirty state", () => {
    const mutate = vi.fn();
    const evaluation = executeGuardedConnectionPointSnap({
      selection: replaceRuntimeSelection([
        "machine:moving",
        "machine:fixed",
        "civil:column"
      ], "scene"),
      entities: [platformMachine("moving"), platformMachine("fixed"), platformCivil("column")],
      movingMachineId: "moving",
      fixedMachineId: "fixed"
    }, mutate);

    expect(evaluation).toEqual({ allowed: false, reason: "explicit-selection-required" });
    expect(mutate).not.toHaveBeenCalled();
  });
});

