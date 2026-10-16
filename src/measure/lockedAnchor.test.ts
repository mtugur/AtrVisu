import { describe, expect, it } from "vitest";
import type { PlatformEntity } from "../platform/contracts";
import { createMeasureAuthority, type MeasureContext } from "./measureAuthority";
import { getSemanticAnchorPoints } from "./measureReferences";
import { getCandidateVisibility } from "./candidateVisibility";

const entity: PlatformEntity = {
  id: "civil:column", type: "civil", name: "Column", visible: true, locked: false, selectable: true,
  transform: { planX: -3000, planY: 4500, elevation: 6000, rotationDeg: 37 },
  properties: [
    { key: "widthMm", label: "Width", value: 350, unit: "mm" },
    { key: "depthMm", label: "Depth", value: 500, unit: "mm" },
    { key: "heightMm", label: "Height", value: 3000, unit: "mm" }
  ], childrenIds: [], connectors: []
};
const context: MeasureContext = { entities: [entity], selectionIds: [entity.id], primaryId: entity.id, machines: [] };
const begin = () => {
  const authority = createMeasureAuthority();
  authority.dispatch({ type: "toggle" }, context);
  authority.lockAnchor({ ...getSemanticAnchorPoints(entity)["front-left-top"]!, anchorKind: "front-left-top" });
  return authority;
};
const invisible = (authority: ReturnType<typeof begin>, reason: string) => authority.project({ width: 1440, height: 900, lines: [], markers: [],
  lockedAnchor: { reference: authority.getSnapshot()!.lockedReference!, entityName: entity.name, point: authority.resolveLockedAnchor(), visible: false, confirmable: true, reason } });

describe("T03 locked semantic reference authority", () => {
  for (const reason of ["Not in viewport", "Covered by chrome", "Scene-occluded"]) it(`retains ${reason} identity but rejects ordinary viewport/generic confirmation`, () => {
    const authority = begin(), reference = authority.getSnapshot()!.lockedReference;
    invisible(authority, reason);
    authority.dispatch({ type: "mode", mode: "navigate" }, context);
    authority.dispatch({ type: "mode", mode: "pick" }, context);
    expect(authority.getSnapshot()!.lockedReference).toEqual(reference);
    authority.beginPress(1, 10, 10);
    expect(authority.endPress(1, 10, 10, true, authority.resolveLockedAnchor())).toBe(false);
    authority.dispatch({ type: "finish" }, context);
    expect(authority.getSnapshot()!.points).toEqual([]);
    expect(authority.dispatch({ type: "confirmLockedAnchor" }, context)).toBe(true);
    expect(authority.getSnapshot()!.points).toEqual([{ ...getSemanticAnchorPoints(entity)["front-left-top"], anchorKind: "front-left-top" }]);
    expect(authority.dispatch({ type: "confirmLockedAnchor" }, context)).toBe(false);
    expect(authority.getSnapshot()!.points).toHaveLength(1);
    expect(context.selectionIds).toEqual([entity.id]);
  });
  it("uses latest canonical data, not cached picked coordinates, and works after Navigate", () => {
    const authority = begin();
    authority.dispatch({ type: "mode", mode: "navigate" }, context);
    const moved = { ...entity, transform: { ...entity.transform, planX: 19000, elevation: 6200 } };
    authority.updateEntities([moved]);
    expect(authority.resolveLockedAnchor()).toMatchObject({ xMm: 19000, zMm: 9200 });
    expect(authority.dispatch({ type: "confirmLockedAnchor" }, { ...context, entities: [moved] })).toBe(true);
    expect(authority.getSnapshot()!.points[0]).toMatchObject({ xMm: 19000, zMm: 9200 });
    expect(authority.getSnapshot()!.entry.entities[0]).toEqual(entity);
  });
  it("preserves unresolved identity without confirmation or a world-point fallback", () => {
    const authority = begin(), reference = authority.getSnapshot()!.lockedReference;
    authority.updateEntities([]);
    expect(authority.resolveLockedAnchor()).toBeNull();
    expect(authority.getSnapshot()!.lockedReference).toEqual(reference);
    expect(authority.dispatch({ type: "confirmLockedAnchor" }, { ...context, entities: [] })).toBe(false);
    expect(authority.getSnapshot()!.points).toEqual([]);
    const invalid = { ...entity, properties: entity.properties.map(p => p.key === "heightMm" ? { ...p, value: NaN } : p) };
    expect(authority.resolveLockedAnchor([invalid])).toBeNull();
  });
  it("keeps a reference-edit target in the same authority until explicit command orchestration completes it", () => {
    const authority = begin();
    authority.beginReferenceEdit("dimension:1", 0);
    expect(authority.dispatch({ type: "confirmLockedAnchor" }, context)).toBe(false);
    expect(authority.getSnapshot()!.points).toEqual([]);
    expect(authority.getSnapshot()!.referenceEdit).toEqual({ annotationId: "dimension:1", index: 0 });
    authority.completeReferenceEdit();
    expect(authority.getSnapshot()!.lockedReference).toBeUndefined();
    expect(authority.getSnapshot()!.referenceEdit).toBeUndefined();
  });
  it("allows a completed saved dimension to acquire a reference-edit lock without appending transient operands", () => {
    const authority = createMeasureAuthority();
    authority.dispatch({ type: "toggle" }, context);
    for (const [index, anchorKind] of ["front-left-top", "front-right-top"].entries()) {
      const point = { ...getSemanticAnchorPoints(entity)[anchorKind as "front-left-top"]!, anchorKind: anchorKind as "front-left-top" };
      authority.beginPress(index, 10, 10); authority.endPress(index, 10, 10, true, point);
    }
    expect(authority.getSnapshot()!.completed).toBe(true);
    authority.beginReferenceEdit("dimension:1", 0);
    authority.lockAnchor({ ...getSemanticAnchorPoints(entity)["back-left-top"]!, anchorKind: "back-left-top" });
    expect(authority.getSnapshot()!.lockedReference?.anchor).toBe("back-left-top");
    authority.beginPress(3, 10, 10);
    expect(authority.getPress()).toBeNull();
    expect(authority.getSnapshot()!.points).toHaveLength(2);
  });
  it("restart/source reset and exit clear locks, while visible confirmation retains the 4 CSS px rule", () => {
    const authority = begin();
    invisible(authority, "Visible");
    authority.project({ ...authority.getProjection(), lockedAnchor: { ...authority.getProjection().lockedAnchor!, visible: true } });
    authority.beginPress(1, 10, 10);
    expect(authority.endPress(1, 14, 10, true, authority.resolveLockedAnchor())).toBe(true);
    expect(authority.getSnapshot()!.lockedReference).toBeUndefined();
    authority.dispatch({ type: "restart" }, context);
    expect(authority.getSnapshot()!.points).toEqual([]);
    authority.dispatch({ type: "exit" }, context);
    expect(authority.getSnapshot()).toBeNull();
  });
});

describe("T03 visibility is presentation-only with deterministic reason precedence", () => {
  const visible = { x: 20, y: 30, z: .5, width: 640, height: 800, covered: false, occluded: false };
  it("prioritizes offscreen, chrome, scene occlusion without DPR or camera-specific thresholds", () => {
    expect(getCandidateVisibility(visible)).toBe("Visible");
    expect(getCandidateVisibility({ ...visible, x: -1, covered: true, occluded: true })).toBe("Not in viewport");
    expect(getCandidateVisibility({ ...visible, covered: true, occluded: true })).toBe("Covered by chrome");
    expect(getCandidateVisibility({ ...visible, occluded: true })).toBe("Scene-occluded");
    expect(getCandidateVisibility({ ...visible, z: NaN })).toBe("Not in viewport");
  });
});
