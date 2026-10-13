import { describe, expect, it } from "vitest";
import { dimensionTextPx, formatDimensionValue, layoutLinearDimension, dimensionLabelLines, measureDimensionLabel, fitDimensionLabel, dimensionLabelBounds, dimensionLabelsOverlap, dimensionMarkerBounds } from "./dimensionPresentation";
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
  it("presents canonical square millimetres in the selected metric area style", () => {
    const value = { label: "Plan Area", unit: "mm2" as const, value: 54101912.889123 };
    expect(formatDimensionValue(value, cloneMeasureDimensionStyle({ precision: 3, unitPresentation: "mm-metric" }))).toBe("54.102 m2");
    expect(formatDimensionValue(value, cloneMeasureDimensionStyle({ precision: 1 }))).toBe("54101912.9 mm2");
    expect(value.value).toBe(54101912.889123);
  });
  it("uses one area value and one perimeter line in either unit style", () => {
    const values = [{ label: "Plan Area", unit: "mm2" as const, value: 2000000 }, { label: "Plan Area", unit: "m2" as const, value: 2 }, { label: "Plan Perimeter", unit: "mm" as const, value: 6000 }];
    expect(dimensionLabelLines("area", values, cloneMeasureDimensionStyle({ precision: 1 }))).toEqual(["Plan Area 2000000.0 mm2", "Plan Perimeter 6000.0 mm"]);
    expect(dimensionLabelLines("area", values, cloneMeasureDimensionStyle({ precision: 1, unitPresentation: "mm-metric" }))).toEqual(["Plan Area 2.0 m2", "Plan Perimeter 6000.0 mm (6.0 m)"]);
  });
  for (const width of [640, 1024, 1440]) it(`fits measured labels away from A/B/C and other labels at ${width}`, () => {
    const insets = { left: width === 1440 ? 292 : 0, right: width === 640 ? 0 : 360, bottom: width === 640 ? 380 : 0 };
    const obstacles = [{ x: width * .42, y: 270 }, { x: width * .57, y: 360 }, { x: width * .45, y: 405 }].map(point => dimensionMarkerBounds(point));
    obstacles.push({ x: width * .42 - 60, y: 220, width: 180, height: 30 });
    const size = { width: 220, height: 36 };
    const point = fitDimensionLabel({ x: width * .42, y: 270 }, size, { width, height: 900 }, insets, obstacles);
    const bounds = dimensionLabelBounds(point, size.width, size.height);
    expect(bounds.x).toBeGreaterThanOrEqual(insets.left);
    expect(bounds.x + bounds.width).toBeLessThanOrEqual(width - insets.right);
    expect(bounds.y + bounds.height).toBeLessThanOrEqual(900 - insets.bottom);
    expect(obstacles.every(obstacle => !dimensionLabelsOverlap(bounds, obstacle))).toBe(true);
  });
  it("wraps measured text instead of clipping or reducing its style-governed font", () => {
    const label = measureDimensionLabel(["Plan Area 54101912.889 mm2", "Plan Perimeter 35936.707 mm"], 12, text => text.length * 6, 140);
    expect(label.width).toBeLessThanOrEqual(140);
    expect(label.lines.join(" ")).toContain("54101912.889 mm2");
    expect(label.lines.join(" ")).toContain("35936.707 mm");
    expect(label.height).toBe(label.lines.length * 18);
  });
});
