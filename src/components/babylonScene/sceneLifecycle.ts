import { Engine, Scene } from "@babylonjs/core";

export const BABYLON_SCENE_ENGINE_OPTIONS = {
  adaptToDeviceRatio: true,
  antialias: true,
  preserveDrawingBuffer: true,
  stencil: true
} as const;

export type SceneLifecycleResizeTarget = {
  addEventListener: Window["addEventListener"];
  removeEventListener: Window["removeEventListener"];
};

export type SceneLifecycleResizableEngine = Pick<Engine, "resize">;

export type BabylonSceneLifecycle = {
  engine: Engine;
  scene: Scene;
  startRenderLoop: (renderFrame: () => void) => void;
  dispose: (beforeDispose?: () => void) => void;
};

export const createSceneLifecycleResizeController = (
  engine: SceneLifecycleResizableEngine,
  resizeTarget: SceneLifecycleResizeTarget
) => {
  const handleResize = () => {
    engine.resize();
  };

  resizeTarget.addEventListener("resize", handleResize);

  return () => {
    resizeTarget.removeEventListener("resize", handleResize);
  };
};

export const createBabylonSceneLifecycle = (
  canvas: HTMLCanvasElement,
  resizeTarget: SceneLifecycleResizeTarget
): BabylonSceneLifecycle => {
  const engine = new Engine(canvas, true, BABYLON_SCENE_ENGINE_OPTIONS);
  const scene = new Scene(engine);
  const disposeResizeController = createSceneLifecycleResizeController(engine, resizeTarget);

  return {
    engine,
    scene,
    startRenderLoop: (renderFrame) => {
      engine.runRenderLoop(renderFrame);
    },
    dispose: (beforeDispose) => {
      disposeResizeController();
      beforeDispose?.();
      scene.dispose();
      engine.dispose();
    }
  };
};
