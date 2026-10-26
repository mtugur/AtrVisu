import { describe, expect, it } from "vitest";
import { createMeasureAuthority, getMeasureLines, getMeasureResult, measurePointToReference, measureSessionMatchesDimension, type MeasureContext } from "./measureAuthority";
import { primaryDistanceValue, projectMeasureB, projectedDistanceResult, type MeasureProjectionMode } from "./measureProjection";
import { createAnnotation } from "../utils/annotations";
import { annotationsFromLayout, createLayoutSnapshotFromMachines } from "../utils/layoutSerialization";
import { createLayoutHistory, pushHistorySnapshot, redoHistory, undoHistory } from "../utils/layoutHistory";
import { cloneMeasureDimensionStyle } from "./referenceTypes";
import { getDimensionResult } from "./measureReferences";
import type { PlatformEntity } from "../platform/contracts";

const a = { xMm: 0, yMm: 0, zMm: 0 }, b = { xMm: 3000, yMm: 4000, zMm: 1200 };
const context: MeasureContext = { selectionIds: [], entities: [], machines: [] };
const begin = (c = context) => { const authority = createMeasureAuthority(); authority.dispatch({ type: "toggle" }, c); return authority; };
const pick = (authority: ReturnType<typeof begin>, point = a) => {
  authority.beginPress(1, 10, 10);
  return authority.endPress(1, 10, 10, true, point);
};

describe("Issue 139 world-reference constraint arithmetic (independent oracle)", () => {
  const cases: [MeasureProjectionMode, number, number[]][] = [
    ["true-3d", Math.sqrt(26440000), [3000, 4000, 1200]],
    ["plan-xy", 5000, [3000, 4000, 0]], ["vertical-xz", Math.sqrt(10440000), [3000, 0, 1200]],
    ["vertical-yz", Math.sqrt(17440000), [0, 4000, 1200]],
    ["axis-x", 3000, [3000, 0, 0]], ["axis-y", 4000, [0, 4000, 0]], ["axis-z", 1200, [0, 0, 1200]]
  ];
  for (const [mode, expected, coordinates] of cases) it(`${mode} preserves actual references and exposes explicit A-anchored projection`, () => {
    const before = structuredClone([a, b]);
    expect(projectMeasureB(a, b, mode)).toEqual({ xMm: coordinates[0], yMm: coordinates[1], zMm: coordinates[2] });
    const result = projectedDistanceResult(a, b, mode);
    expect(primaryDistanceValue(result.values)!.value).toBeCloseTo(expected, 9);
    for (const [label, value] of [["Delta X", 3000], ["Delta Y", 4000], ["Delta Z", 1200]] as const)
      expect(result.values.find(item => item.label === label)?.value).toBe(value);
    expect([a, b]).toEqual(before);
    const authority = begin(); pick(authority, a); pick(authority, b);
    authority.dispatch({ type: "projectionMode", projectionMode: mode }, context);
    const session = authority.getSnapshot()!;
    const resultBeforeNavigation = getMeasureResult(session);
    authority.dispatch({ type: "mode", mode: "navigate" }, context);
    expect(getMeasureResult(authority.getSnapshot()!)).toEqual(resultBeforeNavigation);
    expect(authority.getSnapshot()!.points).toEqual([a, b]);
    if (mode !== "true-3d") expect(getMeasureLines(session)).toEqual([
      expect.objectContaining({ points: [a, projectMeasureB(a, b, mode)] }),
      { points: [projectMeasureB(a, b, mode), b], preview: true }
    ]);
  });
  it("uses A, not world zero, for excluded coordinates and retains signed deltas", () => {
    expect(projectMeasureB({ xMm: 900, yMm: -500, zMm: 700 }, b, "axis-y")).toEqual({ xMm: 900, yMm: 4000, zMm: 700 });
    expect(projectedDistanceResult(b, a, "axis-z").values.find(v => v.label === "Delta Z")!.value).toBe(-1200);
  });
});

describe("Issue 139 reusable operands and explicit persistence boundaries", () => {
  for (const workflow of ["fan-out", "chain"] as const) it(`${workflow} retains unkept relationships and advances only after explicit Next/Keep`, () => {
    const authority = begin(); authority.dispatch({ type: "workflow", workflow }, context);
    expect(pick(authority, a)).toBe(true); expect(pick(authority, b)).toBe(true);
    expect(pick(authority, { ...b, xMm: 7000 })).toBe(false);
    authority.dispatch({ type: "nextRelationship" }, context);
    expect(authority.getSnapshot()!.points).toEqual([workflow === "chain" ? b : a]);
    expect(pick(authority, { ...b, xMm: 7000 })).toBe(true);
    const session = authority.getSnapshot()!;
    expect(session.relationships).toHaveLength(2);
    expect(session.relationships!.every(item => !item.savedAnnotationId)).toBe(true);
    authority.dispatch({ type: "selectRelationship", id: 1 }, context);
    expect(authority.getSnapshot()!.points).toEqual([a, b]);
    authority.markKept("annotation:kept-1");
    expect(authority.getSnapshot()!.relationships![0].savedAnnotationId).toBe("annotation:kept-1");
    authority.dispatch({ type: "selectRelationship", id: 2 }, context); authority.markKept("annotation:kept-2");
    expect(authority.getSnapshot()!.relationships!.map(item => item.savedAnnotationId)).toEqual(["annotation:kept-1", "annotation:kept-2"]);
    authority.dispatch({ type: "kind", kind: "distance" }, context);
    expect(pick(authority, a)).toBe(true); expect(pick(authority, b)).toBe(true);
  });
  it("replaces A or B before Keep without consuming the corner or creating an extra relationship", () => {
    const authority = begin(); pick(authority, a); pick(authority, b);
    authority.dispatch({ type: "changePoint", index: 0 }, context);
    expect(pick(authority, { ...a, zMm: 500 })).toBe(true);
    expect(authority.getSnapshot()!.points).toEqual([{ ...a, zMm: 500 }, b]);
    authority.dispatch({ type: "changePoint", index: 1 }, context); pick(authority, { ...b, xMm: 9000 });
    expect(authority.getSnapshot()!.relationships).toHaveLength(1);
    authority.markKept("kept");
    authority.dispatch({ type: "changePoint", index: 0 }, context);
    expect(authority.getSnapshot()!.completed).toBe(true);
  });
  it("pause cancels unsaved points, releases canonical editing, and resumes the original entry/workflow/constraint", () => {
    const authority = begin(); authority.dispatch({ type: "workflow", workflow: "fan-out" }, context);
    authority.dispatch({ type: "projectionMode", projectionMode: "vertical-xz" }, context);
    pick(authority, a); pick(authority, b); authority.markKept("saved"); pick(authority, b);
    authority.dispatch({ type: "pauseForEdit" }, context);
    expect(authority.getActive()).toBe(false); expect(pick(authority, a)).toBe(false);
    expect(authority.getSnapshot()!.points).toEqual([]);
    authority.dispatch({ type: "resume" }, { ...context, selectionIds: ["not-entry"] });
    expect(authority.getActive()).toBe(true);
    expect(authority.getSnapshot()).toMatchObject({ workflow: "fan-out", projectionMode: "vertical-xz", entry: context, points: [] });
  });
  it("manual selected-pair starts empty and rejects a third entity instead of using origins", () => {
    const entities = ["a", "b", "other"].map(id => ({ id, type: "machine", name: id, visible: true, transform: { planX: 0, planY: 0, elevation: 0, rotationDeg: 0 }, properties: [] } as unknown as PlatformEntity));
    const c = { ...context, selectionIds: ["a", "b"], entities };
    const authority = begin(c); authority.dispatch({ type: "workflow", workflow: "selected-pair" }, c);
    expect(authority.getSnapshot()!.points).toEqual([]); expect(getMeasureResult(authority.getSnapshot()!).values).toEqual([]);
    expect(pick(authority, { ...a, entityId: "other" } as typeof a)).toBe(false);
    expect(pick(authority, { ...a, entityId: "a" } as typeof a)).toBe(true);
    expect(pick(authority, { ...b, entityId: "b" } as typeof a)).toBe(true);
    expect(primaryDistanceValue(getMeasureResult(authority.getSnapshot()!).values)!.value).toBeCloseTo(Math.sqrt(26440000));
  });
  it("resumes local dimensions as a keepable result without applying a previous distance constraint", () => {
    const entity = { id: "a", type: "machine", name: "Machine", visible: true, transform: { planX: 0, planY: 0, elevation: 0, rotationDeg: 0 },
      properties: ["widthMm", "depthMm", "heightMm"].map(key => ({ key, value: 1000 })) } as unknown as PlatformEntity;
    const c = { ...context, selectionIds: ["a"], entities: [entity] }, authority = begin(c);
    authority.dispatch({ type: "projectionMode", projectionMode: "axis-z" }, c);
    authority.dispatch({ type: "kind", kind: "dimensions" }, c);
    authority.dispatch({ type: "pauseForEdit" }, c); authority.dispatch({ type: "resume" }, c);
    expect(authority.getSnapshot()!.completed).toBe(true);
    expect(getMeasureResult(authority.getSnapshot()!).values).toHaveLength(3);
    expect(measureSessionMatchesDimension(authority.getSnapshot(), { schemaVersion: 1, dimensionKind: "dimensions", name: "Local", visible: true,
      references: [{ type: "entity-anchor", entityId: "a", anchor: "front-left-bottom" }], style: cloneMeasureDimensionStyle(), status: "healthy" })).toBe(true);
  });
  it("persists optional interpretation through canonical serialization/history without changing old schema or actual references", () => {
    const authority = begin(); pick(authority, a); pick(authority, b);
    const annotation = { ...createAnnotation({ type: "dimension-note" }), dimension: {
      schemaVersion: 1 as const, dimensionKind: "distance" as const, name: "Explicit XZ", visible: true, projectionMode: "vertical-xz" as const,
      references: [a, b].map(measurePointToReference), style: cloneMeasureDimensionStyle(), status: "healthy" as const
    } };
    const layout = createLayoutSnapshotFromMachines([], "2026-10-23", [annotation]);
    const restored = annotationsFromLayout(JSON.parse(JSON.stringify(layout)))[0];
    expect(restored.dimension).toEqual(annotation.dimension);
    expect(getDimensionResult(restored, [], []).values[0].value).toBeCloseTo(Math.sqrt(10440000));
    expect(measureSessionMatchesDimension(authority.getSnapshot(), annotation.dimension)).toBe(false);
    authority.dispatch({ type: "projectionMode", projectionMode: "vertical-xz" }, context);
    expect(measureSessionMatchesDimension(authority.getSnapshot(), annotation.dimension)).toBe(true);
    const history = pushHistorySnapshot(createLayoutHistory(), [], []);
    const undone = undoHistory(history, [], [restored])!;
    expect(undone.annotations).toEqual([]);
    const redone = redoHistory(undone.history, [], [])!;
    expect(redone.annotations[0].dimension).toEqual(annotation.dimension);
  });
});
