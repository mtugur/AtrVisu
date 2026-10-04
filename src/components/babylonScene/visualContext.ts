import {
  DirectionalLight,
  HemisphericLight,
  Mesh,
  MeshBuilder,
  Scene,
  StandardMaterial,
  Vector3
} from "@babylonjs/core";
import type { EffectiveThemeId, ViewportVisualPalette } from "../../designSystem";
import { getViewportVisualPalette } from "../../designSystem";
import {
  createViewportPaletteColor3,
  createViewportPaletteColor4
} from "../../designSystem/viewportVisualPaletteBabylon";
import { mmToMeters } from "../../utils/units";
import {
  EMPTY_WORKPLANE_BOUNDS_MM,
  WORKPLANE_GRID_MAJOR_SPACING_MM,
  WORKPLANE_GRID_MINOR_SPACING_MM,
  type WorkplaneBoundsMm
} from "./workplaneGrid";

import { applyWorkplaneGridPalette, createWorkplaneGridMaterial, GRID_SAMPLING } from "./workplaneGridMaterial";
export const SCENE_VISUAL_CONTEXT_MESH_COUNT = 2;
export const SCENE_INTERACTION_PLANE_SIZE_METERS = 84;

export const SCENE_VISUAL_LIGHT_SPECS = Object.freeze([
  Object.freeze({ id: "key-light", type: "directional", intensity: 1 }),
  Object.freeze({ id: "fill-light", type: "directional", intensity: 0.45 }),
  Object.freeze({ id: "ambient-light", type: "hemispheric", intensity: 0.35 })
] as const);

export type SceneVisualContextDiagnostics = Readonly<{
  effectiveThemeId: EffectiveThemeId;
  palette: ViewportVisualPalette;
  workplaneBounds: WorkplaneBoundsMm;
  gridMinorSpacingMm: number;
  gridMajorSpacingMm: number;
  meshCount: number;
  lightCount: number;
  gridSampling: typeof GRID_SAMPLING;
  workplaneTransform: Readonly<{ position: readonly number[]; scaling: readonly number[] }>;
}>;

export type SceneVisualContext = {
  interactionPlane: Mesh;
  visualWorkplane: Mesh;
  updatePalette: (effectiveThemeId: EffectiveThemeId) => void;
  updateBounds: (bounds: WorkplaneBoundsMm) => void;
  getDiagnostics: () => SceneVisualContextDiagnostics;
  dispose: () => void;
};

export const createSceneVisualContext = (
  scene: Scene,
  initialThemeId: EffectiveThemeId,
  initialBounds: WorkplaneBoundsMm = EMPTY_WORKPLANE_BOUNDS_MM
): SceneVisualContext => {
  let effectiveThemeId = initialThemeId;
  let workplaneBounds = initialBounds;
  let palette = getViewportVisualPalette(initialThemeId);

  const keyLight = new DirectionalLight("key-light", new Vector3(-0.45, -1, -0.35), scene);
  const fillLight = new DirectionalLight("fill-light", new Vector3(0.55, -0.7, 0.4), scene);
  const ambientLight = new HemisphericLight("ambient-light", new Vector3(0, 1, 0), scene);
  keyLight.intensity = SCENE_VISUAL_LIGHT_SPECS[0].intensity;
  fillLight.intensity = SCENE_VISUAL_LIGHT_SPECS[1].intensity;
  ambientLight.intensity = SCENE_VISUAL_LIGHT_SPECS[2].intensity;

  const workplaneMaterial = createWorkplaneGridMaterial(scene, palette);

  const visualWorkplane = MeshBuilder.CreateGround(
    "visual-workplane-grid",
    { width: 1, height: 1, subdivisions: 1 },
    scene
  );
  visualWorkplane.material = workplaneMaterial;
  visualWorkplane.isPickable = false;
  visualWorkplane.checkCollisions = false;
  visualWorkplane.position.y = -0.001;

  const interactionPlane = MeshBuilder.CreateGround(
    "floor-pick-plane",
    {
      width: SCENE_INTERACTION_PLANE_SIZE_METERS,
      height: SCENE_INTERACTION_PLANE_SIZE_METERS,
      subdivisions: 1
    },
    scene
  );
  const interactionMaterial = new StandardMaterial("floor-pick-material", scene);
  interactionMaterial.alpha = 0;
  interactionPlane.material = interactionMaterial;
  interactionPlane.visibility = 0;
  interactionPlane.isPickable = true;
  interactionPlane.checkCollisions = false;

  const applyPalette = () => {
    scene.clearColor = createViewportPaletteColor4(palette, "background");
    scene.ambientColor = createViewportPaletteColor3(palette, "neutralLight").scale(0.35);
    const neutralLight = createViewportPaletteColor3(palette, "neutralLight");
    [keyLight, fillLight, ambientLight].forEach((light) => {
      light.diffuse = neutralLight.clone();
      light.specular = neutralLight.clone();
    });
    ambientLight.groundColor = neutralLight.scale(0.18);
    applyWorkplaneGridPalette(workplaneMaterial, palette);
  };

  const applyBounds = () => {
    const widthMeters = mmToMeters(workplaneBounds.widthMm);
    const depthMeters = mmToMeters(workplaneBounds.depthMm);
    const centerXMeters = mmToMeters(workplaneBounds.centerXMm);
    const centerYMeters = mmToMeters(workplaneBounds.centerYMm);
    visualWorkplane.scaling.x = widthMeters;
    visualWorkplane.scaling.z = depthMeters;
    visualWorkplane.position.x = centerXMeters;
    visualWorkplane.position.z = centerYMeters;
  };

  applyPalette();
  applyBounds();

  return {
    interactionPlane,
    visualWorkplane,
    updatePalette: (nextThemeId) => {
      effectiveThemeId = nextThemeId;
      palette = getViewportVisualPalette(nextThemeId);
      applyPalette();
    },
    updateBounds: (nextBounds) => {
      workplaneBounds = nextBounds;
      applyBounds();
    },
    getDiagnostics: () => Object.freeze({
      effectiveThemeId,
      palette,
      workplaneBounds,
      gridMinorSpacingMm: WORKPLANE_GRID_MINOR_SPACING_MM,
      gridMajorSpacingMm: WORKPLANE_GRID_MAJOR_SPACING_MM,
      meshCount: SCENE_VISUAL_CONTEXT_MESH_COUNT,
      lightCount: SCENE_VISUAL_LIGHT_SPECS.length,
      gridSampling: GRID_SAMPLING,
      workplaneTransform: Object.freeze({
        position: Object.freeze(visualWorkplane.position.asArray()),
        scaling: Object.freeze(visualWorkplane.scaling.asArray())
      })
    }),
    dispose: () => {
      interactionPlane.dispose(false, false);
      visualWorkplane.dispose(false, false);
      interactionMaterial.dispose(true, true);
      workplaneMaterial.dispose(true, true);
      keyLight.dispose();
      fillLight.dispose();
      ambientLight.dispose();
    }
  };
};
