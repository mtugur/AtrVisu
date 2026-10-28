import { describe, expect, it } from "vitest";
import { createAnnotation } from "../utils/annotations";
import { createDefaultLayer, createLayer } from "../utils/layers";
import { cloneMeasureDimensionStyle } from "./referenceTypes";
import { isSavedMeasureDimensionEditable } from "./dimensionEditPermissions";

const dimension = {
  schemaVersion: 1 as const, dimensionKind: "distance" as const, name: "Reference",
  visible: true, references: [], style: cloneMeasureDimensionStyle(), status: "healthy" as const
};

describe("saved Measure dimensions follow canonical layer permissions", () => {
  const defaultLayer = createDefaultLayer("2026-10-28");
  const lockedLayer = { ...createLayer("Locked", "2026-10-28"), locked: true };
  const layers = [defaultLayer, lockedLayer];
  it("blocks editing a saved dimension on a locked layer", () => {
    const annotation = { ...createAnnotation({ type: "dimension-note" }), layerId: lockedLayer.id, dimension };
    expect(isSavedMeasureDimensionEditable(annotation, layers)).toBe(false);
    expect(isSavedMeasureDimensionEditable(annotation, [defaultLayer, { ...lockedLayer, locked: false }])).toBe(true);
  });
  it("permits unlocked dimensions but not absent or non-dimension annotations", () => {
    const annotation = { ...createAnnotation({ type: "dimension-note" }), layerId: defaultLayer.id, dimension };
    expect(isSavedMeasureDimensionEditable(annotation, layers)).toBe(true);
    expect(isSavedMeasureDimensionEditable(undefined, layers)).toBe(false);
    expect(isSavedMeasureDimensionEditable(createAnnotation({ type: "dimension-note" }), layers)).toBe(false);
  });
});
