import { ArcRotateCamera, NullEngine, Scene, Vector3 } from "@babylonjs/core";
import { describe, expect, it } from "vitest";
import { getViewportVisualPalette } from "../../designSystem";
import { EMPTY_WORKPLANE_BOUNDS_MM, calculateWorkplaneBoundsFromPlanBounds } from "./workplaneGrid";
import { createWorldGridLinesMm, createWorkplaneGridGeometry } from "./workplaneGridGeometry";

describe("rigid world grid", () => {
  it("generates origin-phased 1000/5000mm coordinates with separate minor and major families", () => {
    const lines = createWorldGridLinesMm(EMPTY_WORKPLANE_BOUNDS_MM);
    expect(lines.minor).toHaveLength(64); expect(lines.major).toHaveLength(18);
    for (const [family, spacing] of [[lines.minor, 1000], [lines.major, 5000]] as const) {
      for (const [a, b] of family) {
        const fixed = a[0] === b[0] ? a[0] : a[1];
        expect(fixed % spacing).toBeCloseTo(0);
        if (spacing === 1000) expect(Math.abs(fixed % 5000)).not.toBe(0);
        expect([...a, ...b].every(Number.isFinite)).toBe(true);
      }
    }
  });

  it("keeps uploaded vertices and both mesh identities fixed through Pan/Orbit/Zoom and palette changes", () => {
    const engine = new NullEngine(), scene = new Scene(engine);
    const camera = new ArcRotateCamera("test", 0.5, 1.2, 34, Vector3.Zero(), scene);
    const grid = createWorkplaneGridGeometry(scene, EMPTY_WORKPLANE_BOUNDS_MM, getViewportVisualPalette("dark"));
    const initial = grid.getDiagnostics(); const meshes = [...scene.meshes];
    for (let i = 0; i < 12; i++) {
      camera.target.x += 1; camera.alpha += 0.1; camera.beta += 0.01; camera.radius += 1;
      camera.getViewMatrix(true);
      grid.updatePalette(getViewportVisualPalette(i % 2 ? "dark" : "light"));
      grid.updateBounds({ ...EMPTY_WORKPLANE_BOUNDS_MM });
      expect(grid.getDiagnostics()).toEqual(initial); expect(scene.meshes).toEqual(meshes);
    }
    expect(scene.meshes).toHaveLength(2); expect(scene.textures).toHaveLength(0);
    for (const mesh of scene.meshes) { expect(mesh.isPickable).toBe(false); expect(mesh.material!.disableDepthWrite).toBe(true); }
    const bounds = calculateWorkplaneBoundsFromPlanBounds([{ minXMm: 38000, maxXMm: 42000, minYMm: -1000, maxYMm: 1000, centerXMm: 40000, centerYMm: 0, widthMm: 4000, depthMm: 2000 }]);
    grid.updateBounds(bounds);
    const changed = grid.getDiagnostics();
    expect(changed.generation).toBe(2); expect(changed.rebuildCount).toBe(1);
    expect(changed.minor.meshId).not.toBe(initial.minor.meshId);
    expect(changed.major.meshId).not.toBe(initial.major.meshId);
    expect(scene.meshes).toHaveLength(2); expect(scene.materials).toHaveLength(2);
    grid.dispose(); expect(scene.meshes).toHaveLength(0); expect(scene.materials).toHaveLength(0);
    scene.dispose(); engine.dispose();
  });
});
