import type { PlanPositionMm } from "./coordinates";

export type CollisionSeverity = "info" | "warning" | "critical";

export type CollisionEnvelope = {
  widthMm: number;
  depthMm: number;
  heightMm: number;
  offsetMm?: {
    xMm: number;
    yMm: number;
    elevationMm: number;
  };
};

export type ClearanceEnvelope = {
  frontMm: number;
  backMm: number;
  leftMm: number;
  rightMm: number;
  topMm?: number;
};

export type OperatorArea = {
  id: string;
  name: string;
  polygonMm: PlanPositionMm[];
};

export type ForkliftPath = {
  id: string;
  name: string;
  centerlineMm: PlanPositionMm[];
  widthMm: number;
};

export type BuildingObstacle = {
  id: string;
  name: string;
  envelope: CollisionEnvelope;
  positionMm: PlanPositionMm;
  elevationMm: number;
};

