import {
  Color3,
  DirectionalLight,
  HemisphericLight,
  Mesh,
  MeshBuilder,
  RawTexture,
  Scene,
  StandardMaterial,
  Texture,
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
  getWorldGridPhaseMm,
  type WorkplaneBoundsMm
} from "./workplaneGrid";

export const SCENE_VISUAL_CONTEXT_TEXTURE_SIZE = 512;
export const SCENE_VISUAL_CONTEXT_MESH_COUNT = 2;
export const SCENE_INTERACTION_PLANE_SIZE_METERS = 84;

const WORKPLANE_GRID_TILE_BOUNDS_MM: WorkplaneBoundsMm = Object.freeze({
  minXMm: 0,
  maxXMm: WORKPLANE_GRID_MAJOR_SPACING_MM,
  minYMm: 0,
  maxYMm: WORKPLANE_GRID_MAJOR_SPACING_MM,
  centerXMm: WORKPLANE_GRID_MAJOR_SPACING_MM / 2,
  centerYMm: WORKPLANE_GRID_MAJOR_SPACING_MM / 2,
  widthMm: WORKPLANE_GRID_MAJOR_SPACING_MM,
  depthMm: WORKPLANE_GRID_MAJOR_SPACING_MM
});

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
}>;

export type SceneVisualContext = {
  interactionPlane: Mesh;
  visualWorkplane: Mesh;
  updatePalette: (effectiveThemeId: EffectiveThemeId) => void;
  updateBounds: (bounds: WorkplaneBoundsMm) => void;
  getDiagnostics: () => SceneVisualContextDiagnostics;
  dispose: () => void;
};

type RgbBytes = readonly [red: number, green: number, blue: number];

const hexToRgbBytes = (hex: string): RgbBytes => {
  const value = Number.parseInt(hex.slice(1), 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
};

const distanceToWorldMultiple = (coordinateMm: number, spacingMm: number) => {
  const remainder = ((coordinateMm % spacingMm) + spacingMm) % spacingMm;
  return Math.min(remainder, spacingMm - remainder);
};

const getGridColorAtCoordinate = (
  coordinateMm: number,
  worldUnitsPerPixel: number,
  palette: ViewportVisualPalette
) => {
  const lineHalfWidthMm = Math.max(worldUnitsPerPixel * 0.6, 1);
  if (distanceToWorldMultiple(coordinateMm, WORKPLANE_GRID_MAJOR_SPACING_MM) <= lineHalfWidthMm) {
    return hexToRgbBytes(palette.gridMajor);
  }
  if (distanceToWorldMultiple(coordinateMm, WORKPLANE_GRID_MINOR_SPACING_MM) <= lineHalfWidthMm) {
    return hexToRgbBytes(palette.gridMinor);
  }
  return null;
};

export const createWorkplaneGridTextureData = (
  bounds: WorkplaneBoundsMm,
  palette: ViewportVisualPalette,
  textureSize = SCENE_VISUAL_CONTEXT_TEXTURE_SIZE
) => {
  const data = new Uint8Array(textureSize * textureSize * 4);
  const fill = hexToRgbBytes(palette.workplaneFill);
  const worldUnitsPerPixelX = bounds.widthMm / Math.max(1, textureSize - 1);
  const worldUnitsPerPixelY = bounds.depthMm / Math.max(1, textureSize - 1);
  const xColors = Array.from({ length: textureSize }, (_, pixel) => getGridColorAtCoordinate(
    bounds.minXMm + pixel * worldUnitsPerPixelX,
    worldUnitsPerPixelX,
    palette
  ));
  const yColors = Array.from({ length: textureSize }, (_, pixel) => getGridColorAtCoordinate(
    bounds.minYMm + pixel * worldUnitsPerPixelY,
    worldUnitsPerPixelY,
    palette
  ));

  for (let y = 0; y < textureSize; y += 1) {
    for (let x = 0; x < textureSize; x += 1) {
      const color = xColors[x] ?? yColors[y] ?? fill;
      const offset = (y * textureSize + x) * 4;
      data[offset] = color[0];
      data[offset + 1] = color[1];
      data[offset + 2] = color[2];
      data[offset + 3] = 255;
    }
  }
  return data;
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

  const texture = RawTexture.CreateRGBATexture(
    createWorkplaneGridTextureData(WORKPLANE_GRID_TILE_BOUNDS_MM, palette),
    SCENE_VISUAL_CONTEXT_TEXTURE_SIZE,
    SCENE_VISUAL_CONTEXT_TEXTURE_SIZE,
    scene,
    false,
    false,
    Texture.BILINEAR_SAMPLINGMODE
  );
  texture.name = "visual-workplane-grid-texture";
  texture.wrapU = Texture.WRAP_ADDRESSMODE;
  texture.wrapV = Texture.WRAP_ADDRESSMODE;

  const workplaneMaterial = new StandardMaterial("visual-workplane-material", scene);
  workplaneMaterial.diffuseTexture = texture;
  workplaneMaterial.emissiveTexture = texture;
  workplaneMaterial.emissiveColor = Color3.White();
  workplaneMaterial.disableLighting = true;
  workplaneMaterial.disableDepthWrite = true;
  workplaneMaterial.backFaceCulling = true;

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
    texture.update(createWorkplaneGridTextureData(WORKPLANE_GRID_TILE_BOUNDS_MM, palette));
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
    texture.uScale = workplaneBounds.widthMm / WORKPLANE_GRID_MAJOR_SPACING_MM;
    texture.vScale = workplaneBounds.depthMm / WORKPLANE_GRID_MAJOR_SPACING_MM;
    texture.uOffset = getWorldGridPhaseMm(
      workplaneBounds.minXMm,
      WORKPLANE_GRID_MAJOR_SPACING_MM
    ) / WORKPLANE_GRID_MAJOR_SPACING_MM;
    texture.vOffset = getWorldGridPhaseMm(
      workplaneBounds.minYMm,
      WORKPLANE_GRID_MAJOR_SPACING_MM
    ) / WORKPLANE_GRID_MAJOR_SPACING_MM;
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
      lightCount: SCENE_VISUAL_LIGHT_SPECS.length
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
