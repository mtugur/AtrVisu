import type { ElevationMm, PlanPositionMm, RotationDeg, ScenePositionMeters } from "../types/coordinates";
import { metersToMm, mmToMeters } from "./units";

export const planToScenePosition = (
  positionMm: PlanPositionMm,
  elevationMm: ElevationMm
): ScenePositionMeters => ({
  x: mmToMeters(positionMm.xMm),
  y: mmToMeters(elevationMm),
  z: mmToMeters(positionMm.yMm)
});

export const sceneToPlanPosition = (scenePosition: ScenePositionMeters): PlanPositionMm => ({
  xMm: metersToMm(scenePosition.x),
  yMm: metersToMm(scenePosition.z)
});

export const rotationDegToRadians = (deg: RotationDeg): number => (deg * Math.PI) / 180;

export const rotationRadiansToDeg = (rad: number): RotationDeg => (rad * 180) / Math.PI;

