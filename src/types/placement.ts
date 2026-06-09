import type { PlanPositionMm } from "./coordinates";

export type PlacementSettings = {
  gridSnapEnabled: boolean;
  gridSnapStepMm: number;
  rotationSnapEnabled: boolean;
  rotationSnapStepDeg: number;
  showMeasurementHelpers: boolean;
};

export type MeasurementResult = {
  objectAId: string;
  objectBId: string;
  deltaXMm: number;
  deltaYMm: number;
  distanceMm: number;
  distanceMeters: number;
  approximateGapMm?: number;
};

export type PlanMeasurementPoint = PlanPositionMm;
