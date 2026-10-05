import { ArcRotateCamera, Camera, Matrix, Scene, Vector3 } from "@babylonjs/core";
import type { NavigationProjectionProbe, NavigationRenderFrame } from "../../platform/runtimeViewport";

// Opt-in diagnostics observe the matrix actually used by the completed render.
// They never force a camera update or publish React state.
export const createNavigationRenderProbe = (
  scene: Scene,
  camera: ArcRotateCamera,
  canvas: HTMLCanvasElement,
  lifecycle: number,
  isPanActive: () => boolean
) => {
  const sceneId = scene.getUniqueId();
  let anchors: readonly Vector3[] | null = null;
  let samples: NavigationRenderFrame[] = [];
  let pointer = { x: 0, y: 0, timeMs: 0, sequence: 0, buttons: 0 };
  const input = (event: PointerEvent) => {
    pointer = { x: event.clientX, y: event.clientY, timeMs: performance.now(), sequence: pointer.sequence + 1, buttons: event.buttons };
  };
  for (const name of ["pointermove", "pointerdown", "pointerup"] as const) canvas.addEventListener(name, input, true);
  const observer = scene.onAfterRenderObservable.add(() => {
    if (!anchors) return;
    const rect = canvas.getBoundingClientRect();
    const engine = scene.getEngine();
    const viewport = camera.viewport.toGlobal(engine.getRenderWidth(), engine.getRenderHeight());
    samples.push({
      frame: scene.getFrameId(), timeMs: performance.now(), pointer: { ...pointer }, panActive: isPanActive(),
      target: camera.target.asArray(), position: camera.position.asArray(),
      alpha: camera.alpha, beta: camera.beta, radius: camera.radius, fov: camera.fov,
      mode: camera.mode === Camera.ORTHOGRAPHIC_CAMERA ? "orthographic" : "perspective",
      ortho: [camera.orthoLeft, camera.orthoRight, camera.orthoBottom, camera.orthoTop],
      viewMatrix: Array.from(scene.getViewMatrix().m), projectionMatrix: Array.from(scene.getProjectionMatrix().m),
      projected: anchors.map(anchor => {
        const p = Vector3.Project(anchor, Matrix.Identity(), scene.getTransformMatrix(), viewport);
        return { x: rect.left + p.x * rect.width / viewport.width, y: rect.top + p.y * rect.height / viewport.height, z: p.z };
      }),
      canvas: { id: lifecycle, sceneId, lifecycle, cssWidth: rect.width, cssHeight: rect.height,
        renderWidth: engine.getRenderWidth(), renderHeight: engine.getRenderHeight(), dpr: window.devicePixelRatio },
      inertia: [camera.inertialAlphaOffset, camera.inertialBetaOffset, camera.inertialRadiusOffset, camera.inertialPanningX, camera.inertialPanningY]
    });
  });
  return {
    start: (points: readonly NavigationProjectionProbe["reference"][]) => {
      if (points.length < 3 || points.some(p => ![p.x, p.y, p.z].every(Number.isFinite))) return false;
      samples = [];
      anchors = points.map(p => new Vector3(p.x, p.y, p.z));
      return true;
    },
    read: (stop = false): readonly NavigationRenderFrame[] => {
      if (stop) anchors = null;
      return [...samples];
    },
    dispose: () => {
      anchors = null; samples = [];
      scene.onAfterRenderObservable.remove(observer);
      for (const name of ["pointermove", "pointerdown", "pointerup"] as const) canvas.removeEventListener(name, input, true);
    }
  };
};
