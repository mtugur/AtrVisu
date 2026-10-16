import type { MeasureDimensionKind, MeasureDimensionStyle } from "./referenceTypes";
import type { MeasureValue } from "./measureGeometry";
import { MEASURE_ANCHOR_MARKER_RADIUS_CSS_PX, type MeasureSafeArea } from "./measurePresentation";

export type DimensionScreenPoint = { x: number; y: number; z: number };
export type DimensionSegment = readonly [DimensionScreenPoint, DimensionScreenPoint];
export const dimensionTextPx = (style: MeasureDimensionStyle, zoomDerivedPx: number) =>
  style.textSizeMode === "fixed" ? style.fixedTextPx : Math.max(style.adaptiveMinTextPx, Math.min(style.adaptiveMaxTextPx, zoomDerivedPx));
export const formatDimensionValue = (value: MeasureValue, style: MeasureDimensionStyle) => {
  if (style.unitPresentation === "mm-metric" && value.unit === "mm2")
    return `${(value.value / 1e6).toFixed(style.precision)} m2`;
  const rounded = Number(value.value.toFixed(style.precision));
  const primary = `${(rounded === 0 ? 0 : value.value).toFixed(style.precision)} ${value.unit}`;
  return style.unitPresentation === "mm-metric" && value.unit === "mm" ? `${primary} (${(value.value / 1000).toFixed(style.precision)} m)` : primary;
};

export const dimensionLabelLines = (kind: MeasureDimensionKind, values: readonly MeasureValue[], style: MeasureDimensionStyle) => {
  const shown = kind === "area" ? values.filter(value => value.unit !== "m2")
    : kind === "distance" || kind === "pair" ? values.filter(value => value.label === "3D Distance") : values;
  return shown.map(value => `${kind === "area" ? value.label + " " : kind === "angle" ? "Angle " : ""}${formatDimensionValue(value, style)}`);
};

export type DimensionLabelBounds = { x: number; y: number; width: number; height: number };
export const dimensionMarkerBounds = (point: { x: number; y: number }, letterWidth = 9): DimensionLabelBounds => {
  const radius = MEASURE_ANCHOR_MARKER_RADIUS_CSS_PX;
  return { x: point.x - radius, y: point.y - 22, width: radius * 2 + 8 + letterWidth, height: 22 + radius };
};
export const dimensionLabelBounds = (point: { x: number; y: number }, width: number, height: number): DimensionLabelBounds =>
  ({ x: point.x - width / 2, y: point.y - height / 2, width, height });
export const dimensionLabelsOverlap = (a: DimensionLabelBounds, b: DimensionLabelBounds, gap = 0) =>
  a.x < b.x + b.width + gap && a.x + a.width + gap > b.x && a.y < b.y + b.height + gap && a.y + a.height + gap > b.y;

export const measureDimensionLabel = (lines: readonly string[], textPx: number, measure: (text: string) => number, maximumWidth: number) => {
  const padding = textPx / 2, available = Math.max(textPx, maximumWidth - padding);
  const wrapped: string[] = [];
  for (const line of lines) {
    let current = "";
    for (const word of line.split(" ")) {
      const next = current ? current + " " + word : word;
      if (measure(next) <= available) { current = next; continue; }
      if (current) wrapped.push(current);
      current = "";
      for (const character of word) {
        if (current && measure(current + character) > available) { wrapped.push(current); current = ""; }
        current += character;
      }
    }
    if (current) wrapped.push(current);
  }
  return { lines: wrapped, width: Math.max(0, ...wrapped.map(measure)) + padding, height: Math.max(1, wrapped.length) * textPx * 1.5 };
};

// Search positions derived from actual label/marker edges; do not move operands or scale the value to fit.
export const fitDimensionLabel = (preferred: { x: number; y: number }, size: { width: number; height: number },
  viewport: { width: number; height: number }, insets: MeasureSafeArea, obstacles: readonly DimensionLabelBounds[], gap = 4) => {
  const left = insets.left + 12 + size.width / 2, right = Math.max(left, viewport.width - insets.right - 12 - size.width / 2);
  const top = 20 + size.height / 2, bottom = Math.max(top, viewport.height - (insets.bottom ?? 0) - 20 - size.height / 2);
  const boundX = (x: number) => Math.max(left, Math.min(right, x));
  const boundY = (y: number) => Math.max(top, Math.min(bottom, y));
  const initial = { x: boundX(preferred.x), y: boundY(preferred.y) };
  if (obstacles.every(obstacle => !dimensionLabelsOverlap(dimensionLabelBounds(initial, size.width, size.height), obstacle, gap)))
    return { ...initial, displaced: initial.x !== preferred.x || initial.y !== preferred.y };
  const xs = [boundX(preferred.x), left, right, ...obstacles.flatMap(obstacle => [boundX(obstacle.x - gap - size.width / 2), boundX(obstacle.x + obstacle.width + gap + size.width / 2)])];
  const ys = [boundY(preferred.y), top, bottom, ...obstacles.flatMap(obstacle => [boundY(obstacle.y - gap - size.height / 2), boundY(obstacle.y + obstacle.height + gap + size.height / 2)])];
  const candidates = xs.flatMap(x => ys.map(y => ({ x, y }))).sort((a, b) =>
    Math.hypot(a.x - preferred.x, a.y - preferred.y) - Math.hypot(b.x - preferred.x, b.y - preferred.y));
  const point = candidates.find(candidate => obstacles.every(obstacle => !dimensionLabelsOverlap(dimensionLabelBounds(candidate, size.width, size.height), obstacle, gap))) ?? candidates[0];
  return { ...point, displaced: point.x !== preferred.x || point.y !== preferred.y };
};

// Fit is derived from measured text and arrow extents in CSS pixels, not world distance.
export const layoutLinearDimension = (a: DimensionScreenPoint, b: DimensionScreenPoint, style: MeasureDimensionStyle,
  textWidth: number, textHeight: number, placement?: DimensionScreenPoint) => {
  const span = Math.hypot(b.x - a.x, b.y - a.y);
  const ux = span > 0 ? (b.x - a.x) / span : 1, uy = span > 0 ? (b.y - a.y) / span : 0;
  const nx = -uy, ny = ux;
  const offset = (p: DimensionScreenPoint, x: number, y: number) => ({ x: p.x + x, y: p.y + y, z: p.z });
  const da = offset(a, nx * style.textOffsetPx, ny * style.textOffsetPx), db = offset(b, nx * style.textOffsetPx, ny * style.textOffsetPx);
  const midpoint = { x: (da.x + db.x) / 2, y: (da.y + db.y) / 2, z: (da.z + db.z) / 2 };
  const outside = span < textWidth + 2 * style.arrowSizePx + textHeight;
  const text = placement ?? (outside ? offset(db, ux * (textWidth / 2 + style.arrowSizePx + textHeight), uy * (textWidth / 2 + style.arrowSizePx + textHeight))
    : offset(midpoint, nx * (textHeight / 2 + style.lineWeightPx), ny * (textHeight / 2 + style.lineWeightPx)));
  const segments: DimensionSegment[] = [];
  if (style.showWitnessLines) segments.push([a, da], [b, db]);
  segments.push([da, db]);
  const arrow = (p: DimensionScreenPoint, sign: number) => {
    const direction = sign * (outside ? -1 : 1);
    const back = offset(p, ux * direction * style.arrowSizePx, uy * direction * style.arrowSizePx);
    if (style.arrowStyle === "tick") segments.push([offset(p, (-ux + nx) * style.arrowSizePx / 2, (-uy + ny) * style.arrowSizePx / 2), offset(p, (ux - nx) * style.arrowSizePx / 2, (uy - ny) * style.arrowSizePx / 2)]);
    else segments.push([p, offset(back, nx * style.arrowSizePx / 2, ny * style.arrowSizePx / 2)], [p, offset(back, -nx * style.arrowSizePx / 2, -ny * style.arrowSizePx / 2)]);
  };
  arrow(da, 1); arrow(db, -1);
  const displaced = placement && Math.hypot(placement.x - midpoint.x, placement.y - midpoint.y) > textHeight;
  if (style.showLeaders && (outside || displaced)) segments.push([outside ? db : midpoint, text]);
  return { segments, text, outside, witnesses: style.showWitnessLines ? 2 : 0 };
};
