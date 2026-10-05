import { describe, expect, it } from "vitest";
import { Matrix, Vector3 } from "@babylonjs/core/Maths/math.vector";
import type { PlacedMachine, MachineDefinition } from "../../types/machine";
import type { CivilReferenceItem } from "../../types/civil";
import type { RuntimeViewportCameraSnapshot } from "../../platform/runtimeViewport";
import { createPresetCameraState, domainToBabylonDirection, dot3, fitViewCamera, getCameraBasis, getFitViewGeometry, getPresetAngles, VIEW_PRESETS, type FitGeometry } from "./navigationGeometry";

export const cameraFixture = (mode: "perspective" | "orthographic" = "perspective"): RuntimeViewportCameraSnapshot => ({
  mode, alpha: .7, beta: 1.1, radius: 34, targetX: 5, targetY: 2, targetZ: -4,
  positionX: 0, positionY: 0, positionZ: 0, fov: .8
});
const definition: MachineDefinition = { id: "machine", name: "Machine", category: "Test", width: 4, depth: 2, height: 3, connectionPoints: [], defaultColor: "#aaaaaa" };
const machine = (overrides: Partial<PlacedMachine> = {}): PlacedMachine => ({
  instanceId: "one", machineDefinitionId: definition.id, definition, definitionSnapshot: definition,
  position: { x: 0, z: 0 }, positionMm: { xMm: 0, yMm: 0 }, rotationY: 0,
  coordinateReferenceVersion: "front-left-bottom-v1", flowDirection: "forward", ...overrides
});
const civil = (overrides: Partial<CivilReferenceItem> = {}): CivilReferenceItem => ({
  id: "beam", type: "beam", name: "Beam", positionMm: { xMm: 8000, yMm: 3000, zMm: 6000 },
  sizeMm: { widthMm: 16000, depthMm: 300, heightMm: 400 }, rotationDeg: 45,
  coordinateReferenceVersion: "front-left-bottom-v1", createdAt: "", updatedAt: "", ...overrides
});

describe("canonical ViewCube presets", () => {
  it("has six exact face sides, twelve normalized edges and eight normalized corners", () => {
    expect(VIEW_PRESETS.filter(p => p.kind === "face").map(p => p.direction)).toEqual([
      { x: 1, y: 0, z: 0 }, { x: -1, y: 0, z: 0 }, { x: 0, y: -1, z: 0 },
      { x: 0, y: 1, z: 0 }, { x: 0, y: 0, z: 1 }, { x: 0, y: 0, z: -1 }
    ]);
    expect(VIEW_PRESETS.filter(p => p.kind === "edge")).toHaveLength(12);
    expect(VIEW_PRESETS.filter(p => p.kind === "corner")).toHaveLength(8);
    for (const p of VIEW_PRESETS) {
      const values = Object.values(p.direction).filter(v => v !== 0);
      expect(Math.hypot(...values)).toBeCloseTo(1);
      values.forEach(v => expect(Math.abs(v)).toBeCloseTo(1 / Math.sqrt(values.length)));
      const opposite = VIEW_PRESETS.find(q => dot3(q.direction, p.direction) < -.99999);
      expect(opposite).toBeDefined();
    }
  });
  it.each(VIEW_PRESETS)("maps $id to a finite canonical camera side with only the frozen pole approximation", (p) => {
    const angles = getPresetAngles(p.direction);
    expect(Object.values(angles).every(Number.isFinite)).toBe(true);
    expect(dot3(getCameraBasis(angles.alpha, angles.beta).side, domainToBabylonDirection(p.direction))).toBeGreaterThan(.99994);
    if (Math.abs(p.direction.z) === 1) {
      expect(angles.alpha).toBe(-Math.PI / 2);
      expect(angles.beta).toBeCloseTo(p.direction.z > 0 ? .01 : Math.PI - .01);
    }
  });
  it("maps domain XYZ to engine XZY and preserves target/framing without implicit fit", () => {
    expect(domainToBabylonDirection({ x: 1, y: 2, z: 3 })).toEqual({ x: 1, y: 3, z: 2 });
    const c = cameraFixture();
    const preset = createPresetCameraState(c, "z+")!;
    expect(preset).toMatchObject({ mode: "orthographic", radius: c.radius, targetX: 5, targetY: 2, targetZ: -4 });
    expect(preset.orthographic?.verticalWorldSpan).toBeCloseTo(2 * c.radius * Math.tan(c.fov / 2));
    const ortho = { ...c, mode: "orthographic" as const, orthographicIntent: { centerX: 2, centerY: -1, verticalWorldSpan: 28, horizontalWorldSpan: 56, viewportAspectRatio: 2, horizontalWorldUnitsPerPixel: .02, verticalWorldUnitsPerPixel: .02 } };
    expect(createPresetCameraState(ortho, "x+")?.orthographic).toEqual({ centerX: 2, centerY: -1, verticalWorldSpan: 28 });
    expect(createPresetCameraState(c, "unknown")).toBeNull();
  });
});

describe("Fit View canonical geometry", () => {
  it("returns no fit for empty or non-finite geometry", () => {
    expect(fitViewCamera([], cameraFixture(), 1.5)).toBeNull();
    expect(fitViewCamera([{ entityId: "bad", corners: [{ x: NaN, y: 0, z: 0 }] }], cameraFixture(), 1)).toBeNull();
  });
  it("contains only visible Machine/Civil geometry with eight rotated elevated corners each", () => {
    const geometry = getFitViewGeometry([machine({ rotationDeg: 90, elevationMm: 6000 })], [civil()], []);
    expect(geometry.included.map(g => g.entityId)).toEqual(["machine:one", "civil:beam"]);
    expect(geometry.included.map(g => g.corners.length)).toEqual([8, 8]);
    expect(Math.min(...geometry.included[0].corners.map(p => p.x))).toBeCloseTo(-2);
    expect(Math.max(...geometry.included[0].corners.map(p => p.z))).toBeCloseTo(4);
    expect([...new Set(geometry.included[0].corners.map(p => p.y))]).toEqual([6, 9]);
    expect(Math.max(...geometry.included[1].corners.map(p => p.z))).toBeCloseTo(3 + (16 + .3) / Math.sqrt(2));
  });
  it("keeps signed slab bottom and physical top, and excludes hidden layers/hidden Civil", () => {
    const floor = civil({ id: "floor", type: "floor-area", positionMm: { xMm: 0, yMm: 0, zMm: -350 }, sizeMm: { widthMm: 10000, depthMm: 8000, heightMm: 350 } });
    const geometry = getFitViewGeometry([machine({ layerId: "hidden" })], [floor, civil({ visible: false })], [{ id: "hidden", name: "Hidden", visible: false, locked: false, createdAt: "", updatedAt: "" }]);
    expect(geometry.excludedIds).toEqual(["machine:one", "civil:beam"]);
    expect([...new Set(geometry.included[0].corners.map(p => p.y))]).toEqual([-.35, 0]);
  });
  it.each(["perspective", "orthographic"] as const)("analytically fits rotated/elevated bounds in %s with 1.20 total framing", (mode) => {
    const geometries: FitGeometry[][] = [
      getFitViewGeometry([machine()], [], []).included,
      getFitViewGeometry([], [civil()], []).included,
      getFitViewGeometry([machine({ rotationDeg: 35, elevationMm: 8000 })], [civil()], []).included,
      getFitViewGeometry([machine({ positionMm: { xMm: 1e7, yMm: -1e7 } })], [], []).included
    ];
    for (const geometry of geometries) {
      const c = cameraFixture(mode);
      const fit = fitViewCamera(geometry, c, 1.6)!;
      expect(fit).toMatchObject({ mode, alpha: c.alpha, beta: c.beta });
      expect([fit.radius, fit.targetX, fit.targetY, fit.targetZ].every(Number.isFinite)).toBe(true);
      const target = new Vector3(fit.targetX, fit.targetY, fit.targetZ);
      const b = getCameraBasis(fit.alpha, fit.beta);
      const eye = target.add(new Vector3(b.side.x, b.side.y, b.side.z).scale(fit.radius));
      const view = Matrix.LookAtLH(eye, target, Vector3.Up());
      const span = fit.orthographic?.verticalWorldSpan ?? 0;
      const projection = mode === "perspective" ? Matrix.PerspectiveFovLH(c.fov, 1.6, .01, 1e8) : Matrix.OrthoLH(span * 1.6, span, .01, 1e8);
      for (const p of geometry.flatMap(g => g.corners)) {
        const projected = Vector3.TransformCoordinates(new Vector3(p.x, p.y, p.z), view.multiply(projection));
        expect(Math.abs(projected.x)).toBeLessThanOrEqual(1 / 1.20 + .0001);
        expect(Math.abs(projected.y)).toBeLessThanOrEqual(1 / 1.20 + .0001);
      }
    }
  });
});
