import { describe, expect, it } from "vitest";
import type { PlacedMachine } from "../types/machine";
import {
  calculateAnnotationDragPosition,
  createAnnotation,
  deleteAnnotation,
  detachAnnotationsForDeletedObjects,
  getAnnotationPickMetadata,
  getAnnotationReadableScale,
  getAnnotationVisualStyle,
  getRayPlanePlanPointMm,
  moveAnnotationByDelta,
  normalizeAnnotation,
  normalizeAnnotationCoordinateInput,
  normalizeAnnotationSizeScale,
  updateAnnotation
} from "./annotations";

const machine = (): PlacedMachine => ({
  instanceId: "machine-1",
  machineDefinitionId: "machine",
  definition: {
    id: "machine",
    name: "Machine",
    category: "Packaging Machine",
    width: 1,
    depth: 1,
    height: 1,
    widthMm: 1000,
    depthMm: 1000,
    heightMm: 1000,
    defaultColor: "#aaaaaa",
    connectionPoints: []
  },
  definitionSnapshot: {
    id: "machine",
    name: "Machine",
    category: "Packaging Machine",
    width: 1,
    depth: 1,
    height: 1,
    widthMm: 1000,
    depthMm: 1000,
    heightMm: 1000,
    defaultColor: "#aaaaaa",
    connectionPoints: []
  },
  position: { x: 1, z: 2 },
  positionMm: { xMm: 1000, yMm: 2000 },
  rotationY: 0,
  rotationDeg: 0,
  flowDirection: "forward"
});

describe("annotation helpers", () => {
  it("creates a default free-standing note", () => {
    const annotation = createAnnotation({ type: "note", now: "2026-06-12T00:00:00.000Z" });
    expect(annotation).toMatchObject({
      type: "note",
      text: "New note",
      positionMm: { xMm: 0, yMm: 0, zMm: 1600 }
    });
  });

  it("creates a callout attached to the selected object", () => {
    const annotation = createAnnotation({ type: "callout", selectedMachine: machine(), now: "now" });
    expect(annotation.targetObjectId).toBe("machine-1");
    expect(annotation.positionMm).toEqual({ xMm: 2200, yMm: 800, zMm: 1600 });
  });

  it("updates text and moves annotation", () => {
    const annotation = createAnnotation({ type: "note", now: "now" });
    const updated = updateAnnotation([annotation], annotation.id, { text: "Forklift access required" }, "later");
    expect(updated[0].text).toBe("Forklift access required");
    const moved = moveAnnotationByDelta(updated, annotation.id, 100, -200);
    expect(moved[0].positionMm).toMatchObject({ xMm: 100, yMm: -200 });
  });

  it("updates annotation position with positive and negative values", () => {
    const annotation = createAnnotation({ type: "note", now: "now" });
    const [updated] = updateAnnotation([annotation], annotation.id, {
      positionMm: { xMm: 1200, yMm: -200, zMm: 1600 }
    });

    expect(updated.positionMm).toEqual({ xMm: 1200, yMm: -200, zMm: 1600 });
  });

  it("normalizes annotation coordinate input safely", () => {
    expect(normalizeAnnotationCoordinateInput("-200", 0)).toBe(-200);
    expect(normalizeAnnotationCoordinateInput("-", 125)).toBe(125);
    expect(normalizeAnnotationCoordinateInput("bad", 125)).toBe(125);
    expect(normalizeAnnotationCoordinateInput("-20", 0, { allowNegative: false })).toBe(0);
  });

  it("maps annotation type to visible semantic style tokens", () => {
    expect(getAnnotationVisualStyle({ type: "note", style: {} })).toMatchObject({
      typeToken: "note",
      indicator: "NOTE"
    });
    expect(getAnnotationVisualStyle({ type: "warning", style: {} })).toMatchObject({
      typeToken: "warning",
      indicator: "WARN"
    });
    expect(getAnnotationVisualStyle({ type: "callout", style: {} })).toMatchObject({
      typeToken: "callout",
      indicator: "CALL"
    });
  });

  it("creates stable annotation pick metadata", () => {
    expect(getAnnotationPickMetadata("annotation-1", "hit-target")).toEqual({
      kind: "annotation",
      annotationId: "annotation-1",
      annotationPickKind: "hit-target"
    });
  });

  it("maps emphasis to visibly stronger style tokens", () => {
    const normal = getAnnotationVisualStyle({ type: "note", style: { emphasis: "normal" } });
    const important = getAnnotationVisualStyle({ type: "note", style: { emphasis: "important" } });
    const critical = getAnnotationVisualStyle({ type: "warning", style: { emphasis: "critical" } });

    expect(important.borderWidthPx).toBeGreaterThan(normal.borderWidthPx);
    expect(critical.borderWidthPx).toBeGreaterThan(important.borderWidthPx);
    expect(critical.indicator).toBe("CRIT");
  });

  it("normalizes legacy and invalid annotation size scale values", () => {
    expect(normalizeAnnotationSizeScale({ size: "small" })).toBe(2);
    expect(normalizeAnnotationSizeScale({ size: "medium" })).toBe(4);
    expect(normalizeAnnotationSizeScale({ size: "large" })).toBe(7);
    expect(normalizeAnnotationSizeScale({ sizeScale: -2 })).toBe(1);
    expect(normalizeAnnotationSizeScale({ sizeScale: 42 })).toBe(10);
  });

  it("maps background and size scale settings to render tokens", () => {
    expect(getAnnotationVisualStyle({ type: "info", style: { background: false } }).filledBackground).toBe(false);
    expect(getAnnotationVisualStyle({ type: "info", style: { sizeScale: 1 } }).fontSizePx)
      .toBeLessThan(getAnnotationVisualStyle({ type: "info", style: { sizeScale: 10 } }).fontSizePx);
    expect(getAnnotationVisualStyle({ type: "info", style: { sizeScale: 10 } }).sizeScale).toBe(10);
  });

  it("scales annotation readability by size and camera distance", () => {
    const small = getAnnotationReadableScale({ cameraDistanceMeters: 18, sizeScale: 1 });
    const medium = getAnnotationReadableScale({ cameraDistanceMeters: 18, sizeScale: 4 });
    const large = getAnnotationReadableScale({ cameraDistanceMeters: 18, sizeScale: 10 });

    expect(medium).toBeGreaterThan(small);
    expect(large).toBeGreaterThan(medium);
    expect(getAnnotationReadableScale({ cameraDistanceMeters: 40, sizeScale: 4 }))
      .toBeGreaterThan(getAnnotationReadableScale({ cameraDistanceMeters: 8, sizeScale: 4 }));
  });

  it("keeps annotation position independent of size scale", () => {
    const annotation = createAnnotation({ type: "note", now: "now" });
    const [updated] = updateAnnotation([annotation], annotation.id, {
      positionMm: { xMm: -1200, yMm: 900, zMm: 1600 },
      style: { ...annotation.style, sizeScale: 10 }
    });

    expect(updated.positionMm).toEqual({ xMm: -1200, yMm: 900, zMm: 1600 });
    expect(updated.style?.sizeScale).toBe(10);
  });

  it("calculates annotation drag from initial position and pointer delta", () => {
    expect(calculateAnnotationDragPosition({
      initialAnnotationPosition: { xMm: 1000, yMm: -500 },
      initialPointerPosition: { xMm: 250, yMm: 100 },
      currentPointerPosition: { xMm: 750, yMm: -300 }
    })).toEqual({ xMm: 1500, yMm: -900 });
  });

  it("applies requested ground-plane drag delta exactly", () => {
    expect(calculateAnnotationDragPosition({
      initialAnnotationPosition: { xMm: -200, yMm: 100 },
      initialPointerPosition: { xMm: 1000, yMm: 1000 },
      currentPointerPosition: { xMm: 1500, yMm: 700 }
    })).toEqual({ xMm: 300, yMm: -200 });
  });

  it("calculates pointer plan points on the annotation elevation plane", () => {
    const rayDirection = { x: 0.2, y: -1, z: -0.1 };
    const floorPoint = getRayPlanePlanPointMm({
      rayOrigin: { x: 1, y: 2, z: 1 },
      rayDirection,
      planeElevationMeters: 0
    });
    const elevatedPoint = getRayPlanePlanPointMm({
      rayOrigin: { x: 1, y: 2, z: 1 },
      rayDirection,
      planeElevationMeters: 1.5
    });

    expect(floorPoint?.xMm).toBeCloseTo(1400);
    expect(floorPoint?.yMm).toBeCloseTo(800);
    expect(elevatedPoint?.xMm).toBeCloseTo(1100);
    expect(elevatedPoint?.yMm).toBeCloseTo(950);
  });

  it("keeps drag delta consistent when using matching elevation-plane points", () => {
    const initialAnnotationPosition = { xMm: 500, yMm: -100 };
    const initialPointerPosition = { xMm: 1000, yMm: 1000 };
    const currentPointerPosition = { xMm: 1300, yMm: 700 };

    expect(calculateAnnotationDragPosition({
      initialAnnotationPosition,
      initialPointerPosition,
      currentPointerPosition
    })).toEqual({ xMm: 800, yMm: -400 });
  });

  it("keeps drag calculation independent of annotation size scale", () => {
    const small = {
      ...createAnnotation({ type: "note", now: "now" }),
      positionMm: { xMm: -1200, yMm: 900, zMm: 1600 },
      style: { sizeScale: 1 }
    };
    const large = {
      ...small,
      style: { sizeScale: 10 }
    };
    const sharedPointerInput = {
      initialPointerPosition: { xMm: -100, yMm: -100 },
      currentPointerPosition: { xMm: -300, yMm: 500 }
    };
    const smallResult = calculateAnnotationDragPosition({
      initialAnnotationPosition: small.positionMm,
      ...sharedPointerInput
    });
    const largeResult = calculateAnnotationDragPosition({
      initialAnnotationPosition: large.positionMm,
      ...sharedPointerInput
    });

    expect(smallResult).toEqual({ xMm: -1400, yMm: 1500 });
    expect(largeResult).toEqual(smallResult);
  });

  it("deletes annotation from list", () => {
    const annotation = createAnnotation({ type: "warning", now: "now" });
    expect(deleteAnnotation([annotation], annotation.id)).toEqual([]);
  });

  it("normalizes missing fields safely", () => {
    expect(normalizeAnnotation({
      id: "",
      type: "bad",
      text: 42,
      positionMm: { xMm: "x", yMm: 20 }
    })).toMatchObject({
      type: "note",
      text: "New note",
      positionMm: { xMm: 0, yMm: 20 }
    });
  });

  it("detaches annotations when target object is deleted", () => {
    const annotation = createAnnotation({ type: "callout", selectedMachine: machine(), now: "now" });
    const [detached] = detachAnnotationsForDeletedObjects([annotation], new Set(["machine-1"]));
    expect(detached.targetObjectId).toBeUndefined();
  });
});
