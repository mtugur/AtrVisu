import { describe, expect, it } from "vitest";
import { createMeasureAuthority, getMeasureLines, measurePointToReference, type MeasureContext } from "./measureAuthority";
import { createLayoutSnapshotFromMachines, annotationsFromLayout } from "../utils/layoutSerialization";
import { createAnnotation } from "../utils/annotations";
import { cloneMeasureDimensionStyle } from "./referenceTypes";
import { createLayoutHistory, pushHistorySnapshot, undoHistory, redoHistory } from "../utils/layoutHistory";

const context: MeasureContext = { selectionIds: [], entities: [], machines: [], level: { id: "ground", name: "Ground", elevationMm: 0 } };
const point = (xMm = 0, yMm = 0, zMm = 0) => ({ xMm, yMm, zMm });
const begin = () => { const authority = createMeasureAuthority(); authority.dispatch({ type: "toggle" }, context); return authority; };

describe("C03 V2 M21/M29 transient confirmation contract", () => {
  for (const displacement of [0, 3, 4, 4.01]) it(`classifies ${displacement} CSS px without time or DPR input`, () => {
    const authority = begin(); authority.beginPress(1, 10, 10);
    expect(authority.endPress(1, 10 + displacement, 10, true, point())).toBe(displacement <= 4);
    expect(authority.getSnapshot()!.points).toHaveLength(displacement <= 4 ? 1 : 0);
    expect(authority.endPress(1, 10, 10, true, point())).toBe(false);
    expect(context.selectionIds).toEqual([]);
  });
  for (const reason of ["pointercancel", "capture loss", "focus loss"]) it(`cancels ${reason} without a confirmation`, () => {
    const authority = begin(); authority.beginPress(1, 10, 10); authority.cancelPress(reason);
    expect(authority.endPress(1, 10, 10, true, point())).toBe(false);
    expect(authority.getSnapshot()!.points).toEqual([]);
  });
  it("never turns a cancelled drag or outside release into a pick or navigation", () => {
    const authority = begin(); authority.beginPress(1, 0, 0); authority.movePress(1, 20, 0);
    expect(authority.endPress(1, 0, 0, true, point())).toBe(false);
    authority.beginPress(2, 0, 0); expect(authority.endPress(2, 0, 0, false, point())).toBe(false);
    expect(authority.getSnapshot()!.mode).toBe("pick");
  });
  it("captures area presentation plane once while retaining original Geometry Z", () => {
    const authority = begin(); authority.dispatch({ type: "kind", kind: "area" }, context);
    for (const [i, p] of [point(0, 0, 100), point(1000, 0, 700), point(0, 1000, 900)].entries()) {
      authority.beginPress(i, 0, 0); authority.endPress(i, 0, 0, true, p);
    }
    authority.dispatch({ type: "finish" }, context);
    expect(authority.getSnapshot()!.points.map(p => p.zMm)).toEqual([100, 700, 900]);
    expect(getMeasureLines(authority.getSnapshot()!)[0].points.every(p => p.zMm === 100)).toBe(true);
    authority.dispatch({ type: "mode", mode: "navigate" }, { ...context, level: { ...context.level!, elevationMm: 6000 } });
    expect(authority.getSnapshot()!.presentationElevationMm).toBe(100);
  });
  it("captures the Level identity and FFL until explicit restart", () => {
    const authority = begin(); authority.dispatch({ type: "source", source: "level-plane" }, context);
    const changed = { ...context, level: { id: "level-2", name: "Level 2", elevationMm: 6000 } };
    authority.dispatch({ type: "mode", mode: "navigate" }, changed);
    expect(authority.getSnapshot()!.level).toEqual(context.level);
    authority.dispatch({ type: "restart" }, changed);
    expect(authority.getSnapshot()!.level).toEqual(changed.level);
    expect(measurePointToReference({ ...point(1.2345, 2.3456, 6000), levelId: "level-2" })).toEqual({ type: "level-point", levelId: "level-2", xMm: 1.2345, yMm: 2.3456 });
  });
});

describe("C03 V2 M26/M29 serializable presentation and history", () => {
  it("round-trips project style, references, text placement and area plane without rounding", () => {
    const style = cloneMeasureDimensionStyle({ fixedTextPx: 23, precision: 1 });
    const annotation = { ...createAnnotation({ type: "dimension-note" }), dimension: {
      schemaVersion: 1 as const, dimensionKind: "distance" as const, name: "Reference", visible: true,
      references: [measurePointToReference({ ...point(1.23456, 7.89123, 0), levelId: "ground" }), measurePointToReference(point(8000, 9000, 100))],
      style, textPlacementMm: point(100, 200, 300), presentationElevationMm: 0, status: "healthy" as const
    } };
    const layout = createLayoutSnapshotFromMachines([], "2026-01-01", [annotation], [], [], [], [], [], "ground", style);
    const restored = JSON.parse(JSON.stringify(layout));
    expect(annotationsFromLayout(restored)[0].dimension).toEqual(annotation.dimension);
    expect(restored.measureDimensionStyle).toEqual(style);
    const history = pushHistorySnapshot(createLayoutHistory(), [], [annotation], [], [], [], [], [], "ground", style);
    const edited = { ...annotation, dimension: { ...annotation.dimension, textPlacementMm: point(999, 888, 777) } };
    const undone = undoHistory(history, [], [edited], [], [], [], [], [], "ground", cloneMeasureDimensionStyle())!;
    expect(undone.annotations[0].dimension).toEqual(annotation.dimension);
    expect(undone.measureDimensionStyle).toEqual(style);
    const redone = redoHistory(undone.history, [], undone.annotations, [], [], [], [], [], "ground", undone.measureDimensionStyle)!;
    expect(redone.annotations[0].dimension!.textPlacementMm).toEqual(edited.dimension.textPlacementMm);
  });
});
