import { ArcRotateCamera, Camera, NullEngine, Scene, Vector3 } from "@babylonjs/core";
import { describe, expect, it } from "vitest";
import {
  applyBabylonCameraPose,
  BABYLON_CAMERA_VIEWPORT_SETTINGS
} from "./cameraViewport";

describe("camera viewport", () => {
  it("keeps the current orbit camera startup values", () => {
    expect(BABYLON_CAMERA_VIEWPORT_SETTINGS.name).toBe("orbit-camera");
    expect(BABYLON_CAMERA_VIEWPORT_SETTINGS.alpha).toBe(Math.PI / 4);
    expect(BABYLON_CAMERA_VIEWPORT_SETTINGS.beta).toBe(Math.PI / 3);
    expect(BABYLON_CAMERA_VIEWPORT_SETTINGS.radius).toBe(34);
  });

  it("keeps the current camera control limits and inertia values", () => {
    expect(BABYLON_CAMERA_VIEWPORT_SETTINGS.lowerRadiusLimit).toBe(8);
    expect(BABYLON_CAMERA_VIEWPORT_SETTINGS.upperRadiusLimit).toBe(78);
    expect(BABYLON_CAMERA_VIEWPORT_SETTINGS.wheelPrecision).toBe(35);
    expect(BABYLON_CAMERA_VIEWPORT_SETTINGS.panningSensibility).toBe(75);
    expect(BABYLON_CAMERA_VIEWPORT_SETTINGS.panningInertia).toBe(0.18);
    expect(BABYLON_CAMERA_VIEWPORT_SETTINGS.inertia).toBe(0.65);
  });

  it("keeps the current pointer input behavior", () => {
    expect(BABYLON_CAMERA_VIEWPORT_SETTINGS.pointerButtons).toEqual([0]);
    expect(BABYLON_CAMERA_VIEWPORT_SETTINGS.panningMouseButton).toBe(1);
  });

  it.each([
    { mode: "perspective" as const, expectedMode: Camera.PERSPECTIVE_CAMERA },
    { mode: "orthographic" as const, expectedMode: Camera.ORTHOGRAPHIC_CAMERA }
  ])("applies a changed target and explicit $mode spherical pose together", ({ mode, expectedMode }) => {
    const engine = new NullEngine();
    const scene = new Scene(engine);
    const camera = new ArcRotateCamera(
      "camera",
      Math.PI / 4,
      Math.PI / 3,
      34,
      new Vector3(6, 2, -5),
      scene
    );

    applyBabylonCameraPose(camera, {
      mode,
      alpha: -Math.PI / 2,
      beta: 0.01,
      radius: 32,
      targetX: -3,
      targetY: 1,
      targetZ: 4
    });
    camera.getViewMatrix(true);

    expect(camera.mode).toBe(expectedMode);
    expect(camera.target.asArray()).toEqual([-3, 1, 4]);
    expect(camera.alpha).toBeCloseTo(-Math.PI / 2);
    expect(camera.beta).toBeCloseTo(0.01);
    expect(camera.radius).toBeCloseTo(32);

    scene.dispose();
    engine.dispose();
  });
});
