import type { PlanPositionMm } from "./coordinates";

export type CollisionSeverity = "warning" | "error";

export type CollisionEntityType = "object" | "civil";

export type CollisionEntityRef = {
  entityType: CollisionEntityType;
  id: string;
  name?: string;
  typeLabel?: string;
};

export type CollisionEnvelope = {
  widthMm: number;
  depthMm: number;
  heightMm: number;
  offsetMm?: {
    xMm: number;
    yMm: number;
    zMm: number;
  };
  enabled: boolean;
};

export type CollisionPair = {
  objectAId: string;
  objectBId: string;
  objectAName: string;
  objectBName: string;
  entityA?: CollisionEntityRef;
  entityB?: CollisionEntityRef;
  severity: CollisionSeverity;
  reason: string;
};

export type CollisionCheckResult = {
  enabled: boolean;
  checkedObjectCount: number;
  pairs: CollisionPair[];
  collidingObjectIds: string[];
};

export type CollisionSettings = {
  enabled: boolean;
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

