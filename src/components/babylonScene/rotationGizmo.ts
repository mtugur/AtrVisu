import type { PlacementSettings } from "../../types/placement";
import { rotationDegToRadians } from "../../utils/coordinates";
import {
  applyRotationSnap,
  commitRotationAngle,
  getRotationNudgeStepDeg
} from "../../utils/placement";

export type RotationVectorDegrees = {
  x: number;
  y: number;
  z: number;
};

export type RotationVectorRadians = RotationVectorDegrees;

export type PlanRotatable = {
  rotation: {
    y: number;
  };
};

export const getPlanRotationRadians = (rotationDeg: number) =>
  rotationDegToRadians(rotationDeg);

export const applyPlanRotationY = <TRotatable extends PlanRotatable>(
  target: TRotatable,
  rotationDeg: number
) => {
  target.rotation.y = getPlanRotationRadians(rotationDeg);

  return target;
};

export const getRotationVectorRadians = (
  rotationDeg: RotationVectorDegrees
): RotationVectorRadians => ({
  x: rotationDegToRadians(rotationDeg.x),
  y: rotationDegToRadians(rotationDeg.y),
  z: rotationDegToRadians(rotationDeg.z)
});

export const commitSceneRotationInputDeg = (
  rotationDeg: number,
  settings: PlacementSettings
) => commitRotationAngle(rotationDeg, settings);

export const getSceneRotationNudgeStepDeg = (settings: PlacementSettings) =>
  getRotationNudgeStepDeg(settings);

export const calculateSceneRotationNudgeDeg = (
  currentRotationDeg: number,
  direction: -1 | 1,
  settings: PlacementSettings
) => applyRotationSnap(
  currentRotationDeg + direction * getSceneRotationNudgeStepDeg(settings),
  settings
);
