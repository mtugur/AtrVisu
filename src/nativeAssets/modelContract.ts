import type { VisualModelDefinition } from "../types/machine";

export const MODEL_LOCATOR_PREFIX = "atrvisu-model:";
export const modelKeyFromPath = (path?: string | null) =>
  path?.startsWith(MODEL_LOCATOR_PREFIX) ? path.slice(MODEL_LOCATOR_PREFIX.length) : null;

export type ModelBounds = { min: [number, number, number]; max: [number, number, number] };
export type ModelCalibration = VisualModelDefinition["calibration"];
export const DEFAULT_IMPORT_CALIBRATION: ModelCalibration = {
  centerOnFootprint: true, bottomOnFloor: true, preserveAspectRatio: true,
  forwardAxis: "z+", upAxis: "y+"
};
type Axis = [number, number, number];
const axes: Record<string, Axis> = {
  "x+": [1, 0, 0], "x-": [-1, 0, 0], "y+": [0, 1, 0],
  "z+": [0, 0, 1], "z-": [0, 0, -1]
};
export const orientationBasis = (calibration: ModelCalibration) => {
  const up = axes[calibration.upAxis];
  const forward = axes[calibration.forwardAxis];
  if (!up || !forward || up.some((value, index) => value !== 0 && forward[index] !== 0)) {
    throw new Error("Forward and up axes must be perpendicular.");
  }
  const right: Axis = [up[1] * forward[2] - up[2] * forward[1],
    up[2] * forward[0] - up[0] * forward[2], up[0] * forward[1] - up[1] * forward[0]];
  return [right, up, forward] as const;
};

export const assertModelBounds = (bounds: ModelBounds) => {
  if (!bounds.min.every(Number.isFinite) || !bounds.max.every(Number.isFinite)
    || bounds.min.some((value, index) => bounds.max[index] <= value)) {
    throw new Error("The model must have finite, positive width, depth and height.");
  }
};

export const projectModelCalibration = (bounds: ModelBounds, unit: "mm" | "m", calibration: ModelCalibration) => {
  assertModelBounds(bounds);
  const basis = orientationBasis(calibration);
  const corners = Array.from({ length: 8 }, (_, mask) => bounds.min.map((v, i) => mask & (1 << i) ? bounds.max[i] : v));
  const rotated = corners.map((point) => basis.map((axis) => axis.reduce((sum, v, i) => sum + v * point[i], 0)));
  const min = [0, 1, 2].map((i) => Math.min(...rotated.map((point) => point[i])));
  const max = [0, 1, 2].map((i) => Math.max(...rotated.map((point) => point[i])));
  const mm = unit === "m" ? 1000 : 1;
  const size = min.map((v, i) => (max[i] - v) * mm);
  return {
    widthMm: size[0], heightMm: size[1], depthMm: size[2],
    offsetMeters: [
      calibration.centerOnFootprint ? -(min[0] + max[0]) / 2 * mm / 1000 : 0,
      calibration.bottomOnFloor ? -min[1] * mm / 1000 : 0,
      calibration.centerOnFootprint ? -(min[2] + max[2]) / 2 * mm / 1000 : 0
    ] as Axis
  };
};

// Reject external resources before the loader can initiate network requests.
export const validateGlb = (bytes: ArrayBuffer) => {
  const fail = () => { throw new Error("Choose a valid, self-contained GLB 2.0 model with renderable geometry."); };
  if (bytes.byteLength < 28) return fail();
  const view = new DataView(bytes);
  if (view.getUint32(0, true) !== 0x46546c67 || view.getUint32(4, true) !== 2
    || view.getUint32(8, true) !== bytes.byteLength) return fail();
  let json: Record<string, unknown> | undefined;
  let offset = 12;
  let binaryLength = 0;
  while (offset < bytes.byteLength) {
    if (offset + 8 > bytes.byteLength) return fail();
    const length = view.getUint32(offset, true);
    const type = view.getUint32(offset + 4, true);
    if (length % 4 || offset + 8 + length > bytes.byteLength) return fail();
    if (offset === 12 && type !== 0x4e4f534a) return fail();
    if (type === 0x4e4f534a) {
      if (json) return fail();
      try { json = JSON.parse(new TextDecoder().decode(bytes.slice(offset + 8, offset + 8 + length))); }
      catch { return fail(); }
    }
    if (type === 0x004e4942) binaryLength += length;
    offset += 8 + length;
  }
  if (!json || !Array.isArray(json.meshes) || !json.meshes.length || binaryLength === 0) return fail();
  if (!json.meshes.some((mesh: unknown) => mesh && typeof mesh === "object"
    && "primitives" in mesh && Array.isArray(mesh.primitives) && mesh.primitives.length > 0)) return fail();
  const visit = (value: unknown): void => {
    if (!value || typeof value !== "object") return;
    for (const [key, nested] of Object.entries(value)) {
      if (key === "uri") fail();
      visit(nested);
    }
  };
  visit(json);
  return json;
};
