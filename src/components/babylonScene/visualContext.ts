import {
  Color3,
  Color4,
  HemisphericLight,
  Mesh,
  MeshBuilder,
  Scene,
  StandardMaterial,
  Vector3
} from "@babylonjs/core";

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
  scene.clearColor = new Color4(0.035, 0.045, 0.055, 1);
  scene.ambientColor = new Color3(0.18, 0.22, 0.25);

  const keyLight = new HemisphericLight("key-light", new Vector3(0.2, 1, 0.35), scene);
  keyLight.intensity = 0.88;
  keyLight.groundColor = new Color3(0.08, 0.09, 0.1);

  const gridMaterial = new StandardMaterial("grid-material", scene);
  gridMaterial.diffuseColor = new Color3(0.18, 0.68, 0.74);
  gridMaterial.emissiveColor = new Color3(0.04, 0.17, 0.18);
  gridMaterial.alpha = 0.88;

  const majorMaterial = new StandardMaterial("major-grid-material", scene);
  majorMaterial.diffuseColor = new Color3(0.7, 0.86, 0.56);
  majorMaterial.emissiveColor = new Color3(0.12, 0.16, 0.08);
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
