import { MEASURE_ANCHOR_MARKER_RADIUS_CSS_PX } from "./measurePresentation";

export type ScreenPoint = { x: number; y: number };
const cross = (a: ScreenPoint, b: ScreenPoint, c: ScreenPoint) => (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);

// This hull is only the screen projection of the existing canonical volume.
// It owns candidate approach, never world geometry or measurement operands.
export const projectedVolumeEnvelope = (points: readonly ScreenPoint[]): ScreenPoint[] => {
  if (points.some(point => !Number.isFinite(point.x) || !Number.isFinite(point.y))) return [];
  const sorted = [...points].sort((a, b) => a.x - b.x || a.y - b.y);
  const half = (input: ScreenPoint[]) => {
    const result: ScreenPoint[] = [];
    for (const point of input) {
      while (result.length > 1 && cross(result[result.length - 2], result[result.length - 1], point) <= 0) result.pop();
      result.push(point);
    }
    return result.slice(0, -1);
  };
  return [...half(sorted), ...half([...sorted].reverse())];
};

export const insideCandidateContext = (pointer: ScreenPoint, envelope: readonly ScreenPoint[], visibleMarkers: readonly ScreenPoint[]) => {
  if (visibleMarkers.some(marker => Math.hypot(marker.x - pointer.x, marker.y - pointer.y) <= MEASURE_ANCHOR_MARKER_RADIUS_CSS_PX)) return true;
  return envelope.length >= 3 && envelope.every((point, index) => cross(point, envelope[(index + 1) % envelope.length], pointer) >= 0);
};
