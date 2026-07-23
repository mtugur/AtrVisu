import { Engine, Scene } from "@babylonjs/core";

export const BABYLON_SCENE_ENGINE_OPTIONS = {
  adaptToDeviceRatio: true,
  antialias: true,
  preserveDrawingBuffer: true,
  stencil: true
} as const;

export type BabylonSceneLifecycle = {
  engine: Engine;
  scene: Scene;
  startRenderLoop: (renderFrame: () => void) => void;
  dispose: (beforeDispose?: () => void) => void;
};

export const createBabylonSceneLifecycle = (
  canvas: HTMLCanvasElement
): BabylonSceneLifecycle => {
  const engine = new Engine(canvas, true, BABYLON_SCENE_ENGINE_OPTIONS);
  const scene = new Scene(engine);

  return {
    engine,
    scene,
    startRenderLoop: (renderFrame) => {
      engine.runRenderLoop(renderFrame);
    },
    dispose: (beforeDispose) => {
      beforeDispose?.();
      scene.dispose();
      engine.dispose();
    }
  };
};
