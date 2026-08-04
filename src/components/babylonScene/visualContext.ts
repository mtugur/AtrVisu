import {
  HemisphericLight,
  Mesh,
  MeshBuilder,
  Scene,
  StandardMaterial,
  Vector3
} from "@babylonjs/core";
import { createTechnicalColor3, createTechnicalColor4 } from "../../designSystem/technicalPaletteBabylon";

export const SCENE_VISUAL_CONTEXT_GRID_SIZE = 42;
export const SCENE_VISUAL_CONTEXT_GRID_MAJOR_STEP = 6;
export const SCENE_VISUAL_CONTEXT_GRID_MINOR_STEP = 1;

export type SceneVisualContext = {
  floor: Mesh;
};

export type SceneVisualContextGridLine = {
  axis: "x" | "z";
  index: number;
  isMajor: boolean;
  thickness: number;
};

export const getSceneVisualContextGridLines = (): readonly SceneVisualContextGridLine[] => {
  const lines: SceneVisualContextGridLine[] = [];

  for (
    let i = -SCENE_VISUAL_CONTEXT_GRID_SIZE;
    i <= SCENE_VISUAL_CONTEXT_GRID_SIZE;
    i += SCENE_VISUAL_CONTEXT_GRID_MINOR_STEP
  ) {
    const isMajor = i % SCENE_VISUAL_CONTEXT_GRID_MAJOR_STEP === 0;
    const thickness = isMajor ? 0.045 : 0.018;

    lines.push({ axis: "x", index: i, isMajor, thickness });
    lines.push({ axis: "z", index: i, isMajor, thickness });
  }

  return lines;
};

export const createSceneVisualContext = (scene: Scene): SceneVisualContext => {
  scene.clearColor = createTechnicalColor4("sceneClear");
  scene.ambientColor = createTechnicalColor3("sceneAmbient");

  const keyLight = new HemisphericLight("key-light", new Vector3(0.2, 1, 0.35), scene);
  keyLight.intensity = 0.88;
  keyLight.groundColor = createTechnicalColor3("sceneGround");

  const gridMaterial = new StandardMaterial("grid-material", scene);
  gridMaterial.diffuseColor = createTechnicalColor3("gridMinor");
  gridMaterial.emissiveColor = createTechnicalColor3("gridMinorEmissive");
  gridMaterial.alpha = 0.88;

  const majorMaterial = new StandardMaterial("major-grid-material", scene);
  majorMaterial.diffuseColor = createTechnicalColor3("gridMajor");
  majorMaterial.emissiveColor = createTechnicalColor3("gridMajorEmissive");
  majorMaterial.alpha = 0.95;

  for (const gridLine of getSceneVisualContextGridLines()) {
    const material = gridLine.isMajor ? majorMaterial : gridMaterial;

    const line = MeshBuilder.CreateBox(
      `grid-${gridLine.axis}-${gridLine.index}`,
      gridLine.axis === "x"
        ? {
            width: SCENE_VISUAL_CONTEXT_GRID_SIZE * 2,
            height: gridLine.thickness,
            depth: gridLine.thickness
          }
        : {
            width: gridLine.thickness,
            height: gridLine.thickness,
            depth: SCENE_VISUAL_CONTEXT_GRID_SIZE * 2
          },
      scene
    );

    if (gridLine.axis === "x") {
      line.position.z = gridLine.index;
    } else {
      line.position.x = gridLine.index;
    }
    line.material = material;
    line.isPickable = false;
  }

  const floor = MeshBuilder.CreateGround(
    "floor-pick-plane",
    {
      width: SCENE_VISUAL_CONTEXT_GRID_SIZE * 2,
      height: SCENE_VISUAL_CONTEXT_GRID_SIZE * 2
    },
    scene
  );
  const floorMaterial = new StandardMaterial("floor-pick-material", scene);
  floorMaterial.alpha = 0;
  floor.material = floorMaterial;
  floor.visibility = 0;
  floor.isPickable = true;

  return { floor };
};
