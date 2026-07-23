import { describe, expect, it } from "vitest";
import {
  BABYLON_SCENE_ENGINE_OPTIONS
} from "./sceneLifecycle";

describe("scene lifecycle", () => {
  it("keeps the current Babylon engine options", () => {
    expect(BABYLON_SCENE_ENGINE_OPTIONS).toEqual({
      adaptToDeviceRatio: true,
      antialias: true,
      preserveDrawingBuffer: true,
      stencil: true
    });
  });

  it("leaves resize ownership to the dedicated viewport controller", () => {
    expect(BABYLON_SCENE_ENGINE_OPTIONS.adaptToDeviceRatio).toBe(true);
  });
});
