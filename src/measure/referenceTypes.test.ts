import { describe, expect, it } from "vitest";
import { cloneMeasureDimensionStyle, DEFAULT_MEASURE_DIMENSION_STYLE } from "./referenceTypes";
import { getSemanticAnchorPoints, resolveMeasureReference } from "./measureReferences";
import type { PlatformEntity } from "../platform/contracts";

const machine: PlatformEntity = {
  id: "machine:test",
  type: "machine",
  name: "Test Machine",
  transform: { planX: 1000, planY: 2000, elevation: 300, rotationDeg: 0 },
  properties: [
    { key: "widthMm", label: "Width", value: 4000, unit: "mm" },
    { key: "depthMm", label: "Depth", value: 2000, unit: "mm" },
    { key: "heightMm", label: "Height", value: 3000, unit: "mm" }
  ],
  connectors: [],
  childrenIds: [],
  visible: true,
  locked: false,
  selectable: true
};

describe("C03 V2 reference model", () => {
  it("derives semantic anchors from canonical entity dimensions", () => {
    const anchors = getSemanticAnchorPoints(machine);
    expect(anchors["front-left-bottom"]).toMatchObject({ xMm: 1000, yMm: 2000, zMm: 300 });
    expect(anchors["front-right-bottom"]).toMatchObject({ xMm: 5000, yMm: 2000, zMm: 300 });
    expect(anchors["top-face-center"]).toMatchObject({ xMm: 3000, yMm: 3000, zMm: 3300 });
  });

  it("resolves an entity anchor without using render geometry", () => {
    const point = resolveMeasureReference(
      { type: "entity-anchor", entityId: machine.id, anchor: "back-left-bottom" },
      [machine],
      []
    );
    expect(point).toMatchObject({ xMm: 1000, yMm: 4000, zMm: 300 });
  });

  it("keeps adaptive style bounds explicit and independent from measurement value", () => {
    const style = cloneMeasureDimensionStyle({ adaptiveMinTextPx: 9, adaptiveMaxTextPx: 21 });
    expect(style.adaptiveMinTextPx).toBe(9);
    expect(style.adaptiveMaxTextPx).toBe(21);
    expect(DEFAULT_MEASURE_DIMENSION_STYLE.precision).toBe(3);
  });
});
