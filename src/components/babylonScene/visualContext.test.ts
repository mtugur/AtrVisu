import { describe, expect, it } from "vitest";
import { NullEngine, Scene, StandardMaterial } from "@babylonjs/core";
import {
  createSceneVisualContext,
  SCENE_INTERACTION_PLANE_SIZE_METERS,
  SCENE_VISUAL_CONTEXT_MESH_COUNT,
  SCENE_VISUAL_LIGHT_SPECS
} from "./visualContext";
import { calculateWorkplaneBoundsFromPlanBounds } from "./workplaneGrid";

describe("scene visual context", () => {
  it("uses four bounded fill/line/interaction meshes for small and large extents", () => {
    const empty = calculateWorkplaneBoundsFromPlanBounds([]);
    const large = calculateWorkplaneBoundsFromPlanBounds([{
      minXMm: -200_000,
      maxXMm: 200_000,
      minYMm: -170_000,
      maxYMm: 230_000,
      centerXMm: 0,
      centerYMm: 30_000,
      widthMm: 400_000,
      depthMm: 400_000
    }]);

    expect(SCENE_VISUAL_CONTEXT_MESH_COUNT).toBe(4);
    expect(empty.widthMm).toBe(40000);
    expect(large.widthMm).toBeGreaterThan(empty.widthMm);
  });

  it("defines the exact neutral three-light hierarchy", () => {
    expect(SCENE_VISUAL_LIGHT_SPECS).toEqual([
      { id: "key-light", type: "directional", intensity: 1 },
      { id: "fill-light", type: "directional", intensity: 0.45 },
      { id: "ambient-light", type: "hemispheric", intensity: 0.35 }
    ]);
  });

  it("keeps presentation resources bounded across palette and extent updates", () => {
    const engine = new NullEngine();
    const scene = new Scene(engine);
    const initialBounds = calculateWorkplaneBoundsFromPlanBounds([]);
    const context = createSceneVisualContext(scene, "dark", initialBounds);
    const initialMeshes = [...scene.meshes];
    const initialLights = [...scene.lights];
    const initialMaterials = [...scene.materials];
    const initialTextures = [...scene.textures];

    expect(context.visualWorkplane.isPickable).toBe(false);
    expect(context.visualWorkplane.checkCollisions).toBe(false);
    expect(context.interactionPlane).not.toBe(context.visualWorkplane);
    expect(context.interactionPlane.isPickable).toBe(true);
    expect(context.interactionPlane.visibility).toBe(0);
    expect(context.interactionPlane.getBoundingInfo().boundingBox.minimumWorld.x)
      .toBeCloseTo(-SCENE_INTERACTION_PLANE_SIZE_METERS / 2);
    expect(context.interactionPlane.getBoundingInfo().boundingBox.maximumWorld.x)
      .toBeCloseTo(SCENE_INTERACTION_PLANE_SIZE_METERS / 2);
    expect(scene.meshes).toHaveLength(4);
    expect(scene.lights).toHaveLength(3);
    const workplaneMaterial = scene.getMaterialByName("visual-workplane-material");
    expect(workplaneMaterial).toBeInstanceOf(StandardMaterial);
    expect((workplaneMaterial as StandardMaterial).disableLighting).toBe(true);
    expect(workplaneMaterial!.disableDepthWrite).toBe(true);
    expect(scene.textures).toHaveLength(0);

    for (let index = 0; index < 12; index += 1) {
      context.updatePalette(index % 2 === 0 ? "light" : "dark");
    }
    expect(scene.meshes).toEqual(initialMeshes);
    const gridBeforeBounds = context.getDiagnostics().gridGeometry;
    context.updateBounds(calculateWorkplaneBoundsFromPlanBounds([{
      minXMm: -200_000,
      maxXMm: 200_000,
      minYMm: -170_000,
      maxYMm: 230_000,
      centerXMm: 0,
      centerYMm: 30_000,
      widthMm: 400_000,
      depthMm: 400_000
    }]));

    expect(scene.meshes).toHaveLength(4);
    expect(scene.meshes).toContain(context.visualWorkplane);
    expect(scene.meshes).toContain(context.interactionPlane);
    expect(scene.lights).toEqual(initialLights);
    expect(scene.materials).toHaveLength(initialMaterials.length);
    expect(context.getDiagnostics().gridGeometry.generation).toBe(gridBeforeBounds.generation + 1);
    expect(scene.textures).toEqual(initialTextures);
    expect(context.interactionPlane.position.x).toBe(0);
    expect(context.interactionPlane.position.z).toBe(0);
    expect(context.interactionPlane.scaling.x).toBe(1);
    expect(context.interactionPlane.scaling.z).toBe(1);
    expect(context.interactionPlane.getBoundingInfo().boundingBox.minimumWorld.z)
      .toBeCloseTo(-SCENE_INTERACTION_PLANE_SIZE_METERS / 2);
    expect(context.interactionPlane.getBoundingInfo().boundingBox.maximumWorld.z)
      .toBeCloseTo(SCENE_INTERACTION_PLANE_SIZE_METERS / 2);
    expect(context.getDiagnostics()).toMatchObject({
      effectiveThemeId: "dark",
      meshCount: 4,
      lightCount: 3,
      gridGeometry: { renderer: "rigid-world-line-systems", phaseOriginMm: 0, rebuildCount: 1 },
      gridMinorSpacingMm: 1000,
      gridMajorSpacingMm: 5000
    });

    context.dispose();
    scene.dispose();
    engine.dispose();
  });
});
