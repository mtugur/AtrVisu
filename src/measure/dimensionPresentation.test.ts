import { describe, expect, it } from "vitest";
import { dimensionTextPx, formatDimensionValue, layoutLinearDimension } from "./dimensionPresentation";
import { cloneMeasureDimensionStyle } from "./referenceTypes";

describe("M22/M23 dimension presentation", () => {
  const a = { x: 100, y: 100, z: .5 }, b = { x: 500, y: 100, z: .5 };
  it("uses separate witness segments and a centered label, not an endpoint or zigzag", () => {
    const layout = layoutLinearDimension(a, b, cloneMeasureDimensionStyle(), 100, 18);
    expect(layout.segments[0][0]).toEqual(a); expect(layout.segments[1][0]).toEqual(b);
    expect(layout.witnesses).toBe(2); expect(layout.text.x).toBe(300);
    expect(layout.outside).toBe(false);
  });
  it("fits actual text/arrow extents with outside arrows and a leader for short spans", () => {
    const layout = layoutLinearDimension(a, { ...b, x: 120 }, cloneMeasureDimensionStyle(), 140, 18);
    expect(layout.outside).toBe(true); expect(layout.text.x).toBeGreaterThan(120);
    expect(layout.segments[layout.segments.length - 1]?.[1]).toEqual(layout.text);
  });
  it("disables witnesses/leaders without removing the dimension", () => {
    const style = cloneMeasureDimensionStyle({ showWitnessLines: false, showLeaders: false });
    const layout = layoutLinearDimension(a, b, style, 100, 18, { x: 600, y: 400, z: .5 });
    expect(layout.witnesses).toBe(0); expect(layout.segments).toHaveLength(5);
    expect(layout.text).toEqual({ x: 600, y: 400, z: .5 });
  });
  it("respects text offset, tick style and measured fit independently from engineering values", () => {
    const layout = layoutLinearDimension(a, b, cloneMeasureDimensionStyle({ arrowStyle: "tick", textOffsetPx: 30 }), 100, 18);
    expect(layout.segments[0][1].y).toBe(130); expect(layout.segments).toHaveLength(5);
  });
  it("bounds adaptive CSS sizing and honors fixed size", () => {
    const style = cloneMeasureDimensionStyle({ adaptiveMinTextPx: 11, adaptiveMaxTextPx: 23 });
    expect(dimensionTextPx(style, 1)).toBe(11); expect(dimensionTextPx(style, 100)).toBe(23);
    expect(dimensionTextPx({ ...style, textSizeMode: "fixed", fixedTextPx: 17 }, 100)).toBe(17);
  });
  it("formats units and precision without replacing full precision input", () => {
    const value = { label: "Distance", unit: "mm" as const, value: 1234.56789 };
    expect(formatDimensionValue(value, cloneMeasureDimensionStyle({ precision: 2, unitPresentation: "mm-metric" }))).toBe("1234.57 mm (1.23 m)");
    expect(value.value).toBe(1234.56789);
  });
});
