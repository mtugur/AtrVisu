import { describe, expect, it } from "vitest";
import {
  BABYLON_SCENE_ENGINE_OPTIONS,
  createSceneLifecycleResizeController,
  type SceneLifecycleResizableEngine,
  type SceneLifecycleResizeTarget
} from "./sceneLifecycle";

const createResizeTarget = () => {
  let resizeListener: EventListenerOrEventListenerObject | null = null;

  const target: SceneLifecycleResizeTarget = {
    addEventListener: ((_type: string, listener: EventListenerOrEventListenerObject | null) => {
      resizeListener = listener;
    }) as Window["addEventListener"],
    removeEventListener: ((_type: string, listener: EventListenerOrEventListenerObject | null) => {
      if (resizeListener === listener) {
        resizeListener = null;
      }
    }) as Window["removeEventListener"]
  };

  return {
    target,
    triggerResize: () => {
      if (typeof resizeListener === "function") {
        resizeListener(new Event("resize"));
      }
    },
    hasResizeListener: () => resizeListener !== null
  };
};

describe("scene lifecycle", () => {
  it("keeps the current Babylon engine options", () => {
    expect(BABYLON_SCENE_ENGINE_OPTIONS).toEqual({
      adaptToDeviceRatio: true,
      antialias: true,
      preserveDrawingBuffer: true,
      stencil: true
    });
  });

  it("attaches and detaches the resize controller", () => {
    let resizeCount = 0;
    const engine: SceneLifecycleResizableEngine = {
      resize: () => {
        resizeCount += 1;
      }
    };
    const resizeTarget = createResizeTarget();

    const disposeResizeController = createSceneLifecycleResizeController(engine, resizeTarget.target);

    expect(resizeTarget.hasResizeListener()).toBe(true);

    resizeTarget.triggerResize();
    expect(resizeCount).toBe(1);

    disposeResizeController();
    expect(resizeTarget.hasResizeListener()).toBe(false);

    resizeTarget.triggerResize();
    expect(resizeCount).toBe(1);
  });
});
