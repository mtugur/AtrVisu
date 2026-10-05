import type { CivilReferenceItem } from "../../types/civil";
import type { PlacedMachine } from "../../types/machine";
import type { LayoutLayer } from "../../types/layers";
import type { RuntimeViewportCameraSnapshot } from "../../platform/runtimeViewport";
import type { ViewpointCameraState } from "../../types/viewpoints";
import { getCivilReferenceRenderCenterMm, getMachineRenderCenterMm, getReferenceFromCenterMm, getFootprintCornersFromReferenceMm } from "../../utils/coordinateReference";
import { getMachineDimensionsMm } from "../../utils/machineDimensions";
import { isLayerVisible } from "../../utils/layers";
import { mmToMeters } from "../../utils/units";

export type Point3 = Readonly<{ x: number; y: number; z: number }>;
export const VIEW_PRESET_POLE_EPSILON_RAD = 0.01;
export const FIT_VIEW_FRAMING_FACTOR = 1.20;
const normalize = (v: Point3): Point3 => {
  const length = Math.hypot(v.x, v.y, v.z);
  return { x: v.x / length, y: v.y / length, z: v.z / length };
};
export const dot3 = (a: Point3, b: Point3) => a.x * b.x + a.y * b.y + a.z * b.z;
const sides = [
  { axis: "x", sign: 1, name: "Right", token: "X+" },
  { axis: "x", sign: -1, name: "Left", token: "X-" },
  { axis: "y", sign: -1, name: "Front", token: "Y-" },
  { axis: "y", sign: 1, name: "Back", token: "Y+" },
  { axis: "z", sign: 1, name: "Top", token: "Z+" },
  { axis: "z", sign: -1, name: "Bottom", token: "Z-" }
] as const;
export type ViewPreset = Readonly<{ id: string; label: string; faceLabel?: string; direction: Point3; kind: "face" | "edge" | "corner" }>;
const presets: ViewPreset[] = [];
for (let mask = 1; mask < 64; mask += 1) {
  const chosen = sides.filter((_, index) => (mask & (1 << index)) !== 0);
  if (chosen.length > 3 || new Set(chosen.map((side) => side.axis)).size !== chosen.length) continue;
  const vector = { x: 0, y: 0, z: 0 };
  chosen.forEach((side) => { vector[side.axis] = side.sign; });
  presets.push(Object.freeze({
    id: chosen.map((side) => side.token.toLowerCase()).join("-"),
    label: `${chosen.map((side) => side.name).join(" / ")} view (${chosen.map((side) => `${side.sign > 0 ? "+" : "-"}${side.axis.toUpperCase()}`).join(" / ")})`,
    ...(chosen.length === 1 ? { faceLabel: chosen[0].token } : {}),
    direction: Object.freeze(normalize(vector)),
    kind: chosen.length === 1 ? "face" : chosen.length === 2 ? "edge" : "corner"
  }));
}
export const VIEW_PRESETS: readonly ViewPreset[] = Object.freeze(presets);
export const domainToBabylonDirection = (v: Point3): Point3 => ({ x: v.x, y: v.z, z: v.y });
export const getPresetAngles = (domainSide: Point3) => {
  const side = domainToBabylonDirection(normalize(domainSide));
  return {
    alpha: side.x === 0 && side.z === 0 ? -Math.PI / 2 : Math.atan2(side.z, side.x),
    beta: Math.max(VIEW_PRESET_POLE_EPSILON_RAD, Math.min(Math.PI - VIEW_PRESET_POLE_EPSILON_RAD, Math.acos(Math.max(-1, Math.min(1, side.y)))))
  };
};
export const getCameraBasis = (alpha: number, beta: number) => ({
  side: { x: Math.sin(beta) * Math.cos(alpha), y: Math.cos(beta), z: Math.sin(beta) * Math.sin(alpha) },
  right: { x: -Math.sin(alpha), y: 0, z: Math.cos(alpha) },
  up: { x: -Math.cos(beta) * Math.cos(alpha), y: Math.sin(beta), z: -Math.cos(beta) * Math.sin(alpha) }
});
export const createPresetCameraState = (camera: RuntimeViewportCameraSnapshot, presetId: string): ViewpointCameraState | null => {
  const preset = VIEW_PRESETS.find((item) => item.id === presetId);
  if (!preset) return null;
  return {
    mode: "orthographic", ...getPresetAngles(preset.direction), radius: camera.radius,
    targetX: camera.targetX, targetY: camera.targetY, targetZ: camera.targetZ,
    orthographic: {
      centerX: camera.orthographicIntent?.centerX ?? 0,
      centerY: camera.orthographicIntent?.centerY ?? 0,
      verticalWorldSpan: camera.orthographicIntent?.verticalWorldSpan ?? 2 * camera.radius * Math.tan(camera.fov / 2)
    }
  };
};

export type FitGeometry = Readonly<{ entityId: string; corners: readonly Point3[] }>;
const cornersForBox = (center: { xMm: number; yMm: number }, size: { widthMm: number; depthMm: number }, rotation: number, bottom: number, height: number): Point3[] =>
  getFootprintCornersFromReferenceMm(getReferenceFromCenterMm(center, size, rotation), size, rotation)
    .flatMap((p) => [bottom, bottom + height].map((zMm) => ({ x: mmToMeters(p.xMm), y: mmToMeters(zMm), z: mmToMeters(p.yMm) })));

export const getFitViewGeometry = (machines: readonly PlacedMachine[], civil: readonly CivilReferenceItem[], layers: LayoutLayer[]) => {
  const included: FitGeometry[] = [];
  const excludedIds: string[] = [];
  machines.forEach((machine) => {
    const entityId = `machine:${machine.instanceId}`;
    if (!isLayerVisible(machine.layerId, layers)) { excludedIds.push(entityId); return; }
    const size = getMachineDimensionsMm(machine.definition);
    included.push({ entityId, corners: cornersForBox(getMachineRenderCenterMm(machine), size, machine.rotationDeg ?? machine.rotationY, machine.elevationMm ?? 0, size.heightMm) });
  });
  civil.forEach((item) => {
    const entityId = `civil:${item.id}`;
    if (item.visible === false || !isLayerVisible(item.layerId, layers)) { excludedIds.push(entityId); return; }
    included.push({ entityId, corners: cornersForBox(getCivilReferenceRenderCenterMm(item), item.sizeMm, item.rotationDeg, item.positionMm.zMm ?? 0, item.sizeMm.heightMm ?? 20) });
  });
  return { included, excludedIds };
};

export const fitViewCamera = (geometry: readonly FitGeometry[], camera: RuntimeViewportCameraSnapshot, aspect: number): ViewpointCameraState | null => {
  const corners = geometry.flatMap((item) => item.corners);
  if (corners.length === 0 || !Number.isFinite(aspect) || aspect <= 0 || corners.some((p) => !Object.values(p).every(Number.isFinite))) return null;
  const target = { x: 0, y: 0, z: 0 };
  for (const axis of ["x", "y", "z"] as const) {
    const values = corners.map((p) => p[axis]);
    target[axis] = Math.min(...values) / 2 + Math.max(...values) / 2;
  }
  const basis = getCameraBasis(camera.alpha, camera.beta);
  const projected = corners.map((p) => {
    const delta = { x: p.x - target.x, y: p.y - target.y, z: p.z - target.z };
    return { x: dot3(delta, basis.right), y: dot3(delta, basis.up), z: dot3(delta, basis.side) };
  });
  const tanVertical = Math.tan(camera.fov / 2);
  const radius = Math.max(8, ...projected.flatMap((p) => [p.z + FIT_VIEW_FRAMING_FACTOR * Math.abs(p.x) / (tanVertical * aspect), p.z + FIT_VIEW_FRAMING_FACTOR * Math.abs(p.y) / tanVertical, p.z + 0.1]));
  const verticalWorldSpan = Math.max(0.01, ...projected.flatMap((p) => [2 * FIT_VIEW_FRAMING_FACTOR * Math.abs(p.x) / aspect, 2 * FIT_VIEW_FRAMING_FACTOR * Math.abs(p.y)]));
  return {
    mode: camera.mode, alpha: camera.alpha, beta: camera.beta,
    radius: camera.mode === "perspective" ? radius : camera.radius,
    targetX: target.x, targetY: target.y, targetZ: target.z,
    ...(camera.mode === "orthographic" ? { orthographic: { centerX: 0, centerY: 0, verticalWorldSpan } } : {})
  };
};
