import { Matrix, Vector3, type Mesh, type Quaternion } from "@babylonjs/core";
import { describe, expect, it, vi } from "vitest";
import { calibrateImportedRoot } from "./modelRendering";
import { DEFAULT_IMPORT_CALIBRATION, type ModelCalibration } from "./modelContract";

describe("imported model render calibration", () => {
  it.each(["x+", "x-", "z+", "z-"] as const)("maps %s forward into Babylon +Z and preserves floor/bounds", (forwardAxis) => {
    for (const upAxis of ["y+", "z+", "x+"] as const) {
      if (forwardAxis[0] === upAxis[0]) continue;
      const root = { rotationQuaternion: null as Quaternion | null, scaling: Vector3.One(), position: Vector3.Zero(), computeWorldMatrix: vi.fn() };
      const calibration: ModelCalibration = { ...DEFAULT_IMPORT_CALIBRATION, forwardAxis, upAxis };
      const bounds = { min: [1, 2, 3] as [number, number, number], max: [3, 6, 9] as [number, number, number] };
      const projection = calibrateImportedRoot(root as unknown as Mesh, bounds, "mm", calibration);
      const transform = Matrix.Compose(root.scaling, root.rotationQuaternion!, root.position);
      const points = Array.from({ length: 8 }, (_, mask) => Vector3.TransformCoordinates(Vector3.FromArray(bounds.min.map((v, i) => mask & (1 << i) ? bounds.max[i] : v)), transform));
      const min = [0, 1, 2].map((i) => Math.min(...points.map((point) => point.asArray()[i])));
      const max = [0, 1, 2].map((i) => Math.max(...points.map((point) => point.asArray()[i])));
      expect(min[1]).toBeCloseTo(0);
      expect(min[0] + max[0]).toBeCloseTo(0);
      expect(min[2] + max[2]).toBeCloseTo(0);
      expect((max[0] - min[0]) * 1000).toBeCloseTo(projection.widthMm);
      expect((max[1] - min[1]) * 1000).toBeCloseTo(projection.heightMm);
      expect((max[2] - min[2]) * 1000).toBeCloseTo(projection.depthMm);
      const sourceForward = forwardAxis[0] === "x" ? new Vector3(forwardAxis[1] === "+" ? 1 : -1, 0, 0) : new Vector3(0, 0, forwardAxis[1] === "+" ? 1 : -1);
      const output = Vector3.TransformNormal(sourceForward, transform).normalize();
      expect(output.z).toBeCloseTo(1);
    }
  });
});
