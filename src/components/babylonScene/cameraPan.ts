import { ArcRotateCamera, Camera, Matrix, Vector3 } from "@babylonjs/core";

export type CameraPanGesture = Readonly<{
  pointerX: number;
  pointerY: number;
  target: Vector3;
  position: Vector3;
  rightPerPixel: Vector3;
  upPerPixel: Vector3;
}>;

export const beginCameraPan = (
  camera: ArcRotateCamera,
  pointerX: number,
  pointerY: number,
  cssWidth: number,
  cssHeight: number
): CameraPanGesture => {
  const view = camera.getViewMatrix(true);
  const projection = camera.getProjectionMatrix(true);
  const inverseView = Matrix.Invert(view);
  const depth = camera.mode === Camera.ORTHOGRAPHIC_CAMERA
    ? 1
    : Vector3.TransformCoordinates(camera.target, view).z;
  // Projection coefficients encode both FOV modes and orthographic framing.
  // Snapshot them once: subsequent events resolve total displacement, not a
  // pick measured through the already-translated camera.
  return Object.freeze({
    pointerX, pointerY,
    target: camera.target.clone(),
    position: camera.position.clone(),
    rightPerPixel: Vector3.TransformNormal(Vector3.Right(), inverseView)
      .scale(2 * depth / (projection.m[0] * cssWidth)),
    upPerPixel: Vector3.TransformNormal(Vector3.Up(), inverseView)
      .scale(2 * depth / (projection.m[5] * cssHeight))
  });
};

export const applyCameraPan = (
  camera: ArcRotateCamera,
  gesture: CameraPanGesture,
  pointerX: number,
  pointerY: number
) => {
  const delta = gesture.rightPerPixel.scale(gesture.pointerX - pointerX)
    .add(gesture.upPerPixel.scale(pointerY - gesture.pointerY));
  // Mutate the existing target vector, avoiding ArcRotate's target setter
  // (which recomputes alpha/beta/radius from the previous position).
  camera.target.copyFrom(gesture.target.add(delta));
  camera.position.copyFrom(gesture.position.add(delta));
};
