import type { MeasureDimensionStyle } from "./referenceTypes";
import type { MeasureValue } from "./measureGeometry";

export type DimensionScreenPoint = { x: number; y: number; z: number };
export type DimensionSegment = readonly [DimensionScreenPoint, DimensionScreenPoint];
export const dimensionTextPx = (style: MeasureDimensionStyle, zoomDerivedPx: number) =>
  style.textSizeMode === "fixed" ? style.fixedTextPx : Math.max(style.adaptiveMinTextPx, Math.min(style.adaptiveMaxTextPx, zoomDerivedPx));
export const formatDimensionValue = (value: MeasureValue, style: MeasureDimensionStyle) => {
  const rounded = Number(value.value.toFixed(style.precision));
  const primary = `${(rounded === 0 ? 0 : value.value).toFixed(style.precision)} ${value.unit}`;
  return style.unitPresentation === "mm-metric" && value.unit === "mm" ? `${primary} (${(value.value / 1000).toFixed(style.precision)} m)` : primary;
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
