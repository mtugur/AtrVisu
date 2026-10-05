// @vitest-environment jsdom
import { ArcRotateCamera, Matrix, NullEngine, Scene, Vector3 } from "@babylonjs/core";
import { describe, expect, it } from "vitest";
import { createNavigationRenderProbe } from "./navigationRenderProbe";
import { applyCameraPan, beginCameraPan } from "./cameraPan";

describe("opt-in render-frame observation", () => {
  it("records every completed render, latest real pointer input, actual matrices and three fixed anchors without changing camera state", () => {
    const engine = new NullEngine({ renderWidth: 1440, renderHeight: 900, textureSize: 512, deterministicLockstep: false, lockstepMaxSteps: 4 });
    const scene = new Scene(engine), camera = new ArcRotateCamera("test", 0.7, 1.3, 34, Vector3.Zero(), scene);
    const canvas = document.createElement("canvas");
    canvas.getBoundingClientRect = () => new DOMRect(7, 9, 1440, 900);
    let active = false;
    const observer = createNavigationRenderProbe(scene, camera, canvas, 1, () => active);
    const anchors = [{ x: 0, y: 0, z: 0 }, { x: 1, y: 0, z: 0 }, { x: 0, y: 1, z: 0 }];
    expect(observer.start(anchors)).toBe(true);
    scene.render();
    const gesture = beginCameraPan(camera, 700, 400, 1440, 900);
    active = true;
    for (let step = 1; step <= 4; step++) {
      canvas.dispatchEvent(new MouseEvent("pointermove", { clientX: 700 + step * 5, clientY: 400, buttons: 4 }));
      applyCameraPan(camera, gesture, 700 + step * 5, 400);
      scene.render();
    }
    const target = camera.target.clone(), position = camera.position.clone();
    const samples = observer.read(true);
    expect(samples).toHaveLength(5);
    expect(samples[4].pointer).toMatchObject({ x: 720, y: 400, sequence: 4, buttons: 4 });
    expect(samples[4].viewMatrix).toEqual(Array.from(scene.getViewMatrix().m));
    expect(samples[4].projectionMatrix).toEqual(Array.from(scene.getProjectionMatrix().m));
    expect(samples[4].projected).toHaveLength(3);
    const actual = Vector3.Project(Vector3.Zero(), Matrix.Identity(), scene.getTransformMatrix(), camera.viewport.toGlobal(1440, 900));
    expect(samples[4].projected[0].x).toBeCloseTo(actual.x + 7);
    expect(samples[4].projected[0].y).toBeCloseTo(actual.y + 9);
    expect(samples[4].canvas).toMatchObject({ lifecycle: 1, renderWidth: 1440, renderHeight: 900, cssWidth: 1440, cssHeight: 900 });
    expect(samples.slice(1).every(s => s.panActive && s.inertia.every(v => v === 0))).toBe(true);
    expect(camera.target.asArray()).toEqual(target.asArray()); expect(camera.position.asArray()).toEqual(position.asArray());
    scene.render(); expect(observer.read()).toHaveLength(5);
    observer.dispose(); scene.dispose(); engine.dispose();
  });
});
