import { ArcRotateCamera, Scene, Vector3 } from "@babylonjs/core";

export const BABYLON_CAMERA_VIEWPORT_SETTINGS = {
  name: "orbit-camera",
  alpha: Math.PI / 4,
  beta: Math.PI / 3,
  radius: 34,
  lowerRadiusLimit: 8,
  upperRadiusLimit: 78,
  wheelPrecision: 35,
  panningSensibility: 75,
  panningInertia: 0.18,
  inertia: 0.65,
  pointerButtons: [0],
  panningMouseButton: 1
} as const;

export const createBabylonCameraViewport = (
  scene: Scene,
  canvas: HTMLCanvasElement
): ArcRotateCamera => {
  const camera = new ArcRotateCamera(
    BABYLON_CAMERA_VIEWPORT_SETTINGS.name,
    BABYLON_CAMERA_VIEWPORT_SETTINGS.alpha,
    BABYLON_CAMERA_VIEWPORT_SETTINGS.beta,
    BABYLON_CAMERA_VIEWPORT_SETTINGS.radius,
    Vector3.Zero(),
    scene
  );
  camera.attachControl(canvas, true);
  camera.lowerRadiusLimit = BABYLON_CAMERA_VIEWPORT_SETTINGS.lowerRadiusLimit;
  camera.upperRadiusLimit = BABYLON_CAMERA_VIEWPORT_SETTINGS.upperRadiusLimit;
  camera.wheelPrecision = BABYLON_CAMERA_VIEWPORT_SETTINGS.wheelPrecision;
  camera.panningSensibility = BABYLON_CAMERA_VIEWPORT_SETTINGS.panningSensibility;
  camera.panningInertia = BABYLON_CAMERA_VIEWPORT_SETTINGS.panningInertia;
  camera.inertia = BABYLON_CAMERA_VIEWPORT_SETTINGS.inertia;

  const pointerInput = camera.inputs.attached.pointers as unknown as {
    buttons?: number[];
    panningMouseButton?: number;
  };
  if (pointerInput) {
    pointerInput.buttons = [...BABYLON_CAMERA_VIEWPORT_SETTINGS.pointerButtons];
    pointerInput.panningMouseButton = BABYLON_CAMERA_VIEWPORT_SETTINGS.panningMouseButton;
  }

  return camera;
};
