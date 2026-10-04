import { ArcRotateCamera, Camera, Matrix, NullEngine, Scene, Vector3, Viewport } from "@babylonjs/core";
import { describe, expect, it } from "vitest";
import { beginCameraPan, applyCameraPan } from "./cameraPan";
import { VIEW_PRESETS, getPresetAngles } from "../viewportNavigation/navigationGeometry";

const orientations = [
  { id: "perspective", alpha: Math.PI / 4, beta: Math.PI / 3 },
  { id: "shallow", alpha: -Math.PI / 3, beta: 1.48 },
  ...VIEW_PRESETS.map(preset => ({ id: preset.id, ...getPresetAngles(preset.direction) }))
];

describe.each(["perspective", "orthographic"] as const)("%s view-parallel Pan", mode => {
  it.each(orientations)("projects a fixed target-depth anchor continuously for $id without a scene/floor hit", ({ alpha, beta }) => {
    const engine = new NullEngine({ renderWidth: 1440, renderHeight: 900, textureSize: 512, deterministicLockstep: false, lockstepMaxSteps: 4 });
    const scene = new Scene(engine);
    const camera = new ArcRotateCamera("test", alpha, beta, 34, new Vector3(3, 6, -2), scene);
    camera.mode = mode === "orthographic" ? Camera.ORTHOGRAPHIC_CAMERA : Camera.PERSPECTIVE_CAMERA;
    camera.orthoLeft = -24; camera.orthoRight = 24; camera.orthoBottom = -15; camera.orthoTop = 15;
    const anchor = camera.target.clone();
    const viewport = new Viewport(0, 0, 1440, 900);
    const project = () => Vector3.Project(anchor, Matrix.Identity(), camera.getViewMatrix(true).multiply(camera.getProjectionMatrix(true)), viewport);
    const initial = project();
    const position = camera.position.clone();
    const start = beginCameraPan(camera, 720, 450, 1440, 900);
    for (let step = 1; step <= 24; step++) {
      applyCameraPan(camera, start, 720 + step * 5, 450 + step * 80 / 24);
      const actual = project();
      expect(actual.x - initial.x).toBeCloseTo(step * 5, 3);
      expect(actual.y - initial.y).toBeCloseTo(step * 80 / 24, 3);
      expect(camera.position.subtract(position).subtract(camera.target.subtract(anchor)).length()).toBeLessThan(0.00001);
    }
    const subdivided = project();
    applyCameraPan(camera, start, 840, 530);
    expect(project().subtract(subdivided).length()).toBeLessThan(0.00001);
    applyCameraPan(camera, start, 720, 450);
    expect(project().subtract(initial).length()).toBeLessThan(0.00001);
    expect(camera.alpha).toBe(alpha); expect(camera.beta).toBe(beta); expect(camera.radius).toBe(34);
    expect(camera.fov).toBe(0.8);
    expect(start.target.asArray()).toEqual(anchor.asArray());
    scene.dispose(); engine.dispose();
  });
});
