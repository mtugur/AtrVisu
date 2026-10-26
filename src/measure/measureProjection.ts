import { distanceResult, type MeasurePoint, type MeasureResult, type MeasureValue } from "./measureGeometry";

export const MEASURE_PROJECTION_LABELS = {
  "true-3d": "True 3D", "plan-xy": "Plan XY", "vertical-xz": "Vertical XZ",
  "vertical-yz": "Vertical YZ", "axis-x": "Axis X", "axis-y": "Axis Y", "axis-z": "Axis Z"
} as const;
export type MeasureProjectionMode = keyof typeof MEASURE_PROJECTION_LABELS;
export const isMeasureProjectionMode = (value: unknown): value is MeasureProjectionMode =>
  typeof value === "string" && Object.prototype.hasOwnProperty.call(MEASURE_PROJECTION_LABELS, value);
export const primaryDistanceValue = (values: readonly MeasureValue[]) => values.find(value => value.label.endsWith(" Distance") && !["3D Distance", "Plan Distance"].includes(value.label))
  ?? values.find(value => value.label === "3D Distance");

// Projection is anchored at actual A, in canonical world axes; never camera axes.
export const projectMeasureB = (a: MeasurePoint, b: MeasurePoint, mode: MeasureProjectionMode = "true-3d"): MeasurePoint => ({
  xMm: ["vertical-yz", "axis-y", "axis-z"].includes(mode) ? a.xMm : b.xMm,
  yMm: ["vertical-xz", "axis-x", "axis-z"].includes(mode) ? a.yMm : b.yMm,
  zMm: ["plan-xy", "axis-x", "axis-y"].includes(mode) ? a.zMm : b.zMm
});
export const projectedDistanceResult = (a: MeasurePoint, b: MeasurePoint, mode: MeasureProjectionMode = "true-3d"): MeasureResult => {
  const actual = distanceResult(a, b);
  if (mode === "true-3d" || actual.reason) return actual;
  const p = projectMeasureB(a, b, mode);
  return { values: [{ label: MEASURE_PROJECTION_LABELS[mode] + " Distance", unit: "mm",
    value: Math.hypot(p.xMm - a.xMm, p.yMm - a.yMm, p.zMm - a.zMm) }, ...actual.values] };
};
