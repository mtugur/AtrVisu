import { describe, expect, it } from "vitest";
import { BABYLON_CAMERA_VIEWPORT_SETTINGS } from "./cameraViewport";

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
});
