import type { CollisionCheckResult, CollisionEnvelope, CollisionPair } from "../types/collision";
import type { PlacedMachine } from "../types/machine";
import { getMachineDimensionsMm } from "./machineDimensions";
import { metersToMm } from "./units";

const EPSILON_MM = 0.001;

type PlanPoint = {
  xMm: number;
  yMm: number;
};

export type CollisionFootprint = {
  objectId: string;
  objectName: string;
  center: PlanPoint;
  elevationMm: number;
  rotationDeg: number;
  envelope: CollisionEnvelope;
  corners: PlanPoint[];
};

const isPositiveFinite = (value: unknown): value is number => {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
};

const isFiniteNumber = (value: unknown): value is number => {
  return typeof value === "number" && Number.isFinite(value);
};

export const normalizeCollisionEnvelope = (
  value: unknown,
  fallback: { widthMm: number; depthMm: number; heightMm: number }
): CollisionEnvelope => {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return {
      ...fallback,
      offsetMm: { xMm: 0, yMm: 0, zMm: 0 },
      enabled: true
    };
  }

  const envelope = value as Partial<CollisionEnvelope>;
  const offset = envelope.offsetMm;
  const offsetRecord =
    typeof offset === "object" && offset !== null && !Array.isArray(offset)
      ? (offset as Partial<NonNullable<CollisionEnvelope["offsetMm"]>>)
      : {};

  return {
    widthMm: isPositiveFinite(envelope.widthMm) ? envelope.widthMm : fallback.widthMm,
    depthMm: isPositiveFinite(envelope.depthMm) ? envelope.depthMm : fallback.depthMm,
    heightMm: isPositiveFinite(envelope.heightMm) ? envelope.heightMm : fallback.heightMm,
    offsetMm: {
      xMm: isFiniteNumber(offsetRecord.xMm) ? offsetRecord.xMm : 0,
      yMm: isFiniteNumber(offsetRecord.yMm) ? offsetRecord.yMm : 0,
      zMm: isFiniteNumber(offsetRecord.zMm) ? offsetRecord.zMm : 0
    },
    enabled: envelope.enabled !== false
  };
};

export const getCollisionEnvelopeForMachine = (machine: Pick<PlacedMachine, "definition">): CollisionEnvelope => {
  const dimensionsMm = getMachineDimensionsMm(machine.definition);
  return normalizeCollisionEnvelope(machine.definition.collisionEnvelope, dimensionsMm);
};

export const getRotatedFootprintCorners = (
  center: PlanPoint,
  widthMm: number,
  depthMm: number,
  rotationDeg: number
): PlanPoint[] => {
  const halfWidth = widthMm / 2;
  const halfDepth = depthMm / 2;
  const radians = (rotationDeg * Math.PI) / 180;
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  const localCorners = [
    { xMm: -halfWidth, yMm: -halfDepth },
    { xMm: halfWidth, yMm: -halfDepth },
    { xMm: halfWidth, yMm: halfDepth },
    { xMm: -halfWidth, yMm: halfDepth }
  ];

  return localCorners.map((point) => ({
    xMm: center.xMm + point.xMm * cos - point.yMm * sin,
    yMm: center.yMm + point.xMm * sin + point.yMm * cos
  }));
};

const getAxes = (corners: PlanPoint[]) => {
  const axes: PlanPoint[] = [];
  for (let index = 0; index < corners.length; index += 1) {
    const current = corners[index];
    const next = corners[(index + 1) % corners.length];
    const edge = { xMm: next.xMm - current.xMm, yMm: next.yMm - current.yMm };
    const normal = { xMm: -edge.yMm, yMm: edge.xMm };
    const length = Math.hypot(normal.xMm, normal.yMm);
    if (length > EPSILON_MM) {
      axes.push({ xMm: normal.xMm / length, yMm: normal.yMm / length });
    }
  }
  return axes;
};

const projectPolygon = (corners: PlanPoint[], axis: PlanPoint) => {
  const projections = corners.map((corner) => corner.xMm * axis.xMm + corner.yMm * axis.yMm);
  return {
    min: Math.min(...projections),
    max: Math.max(...projections)
  };
};

export const checkOrientedRectangleOverlap = (aCorners: PlanPoint[], bCorners: PlanPoint[]) => {
  const axes = [...getAxes(aCorners), ...getAxes(bCorners)];

  return axes.every((axis) => {
    const a = projectPolygon(aCorners, axis);
    const b = projectPolygon(bCorners, axis);
    // Edge-touching is treated as clear in v0.1 to reduce grid-alignment noise.
    return !(a.max <= b.min + EPSILON_MM || b.max <= a.min + EPSILON_MM);
  });
};

export const buildCollisionEnvelopeFromObject = (machine: PlacedMachine): CollisionFootprint | null => {
  const envelope = getCollisionEnvelopeForMachine(machine);
  if (!envelope.enabled || envelope.widthMm <= 0 || envelope.depthMm <= 0 || envelope.heightMm <= 0) {
    return null;
  }

  const positionMm = machine.positionMm ?? {
    xMm: metersToMm(machine.position.x),
    yMm: metersToMm(machine.position.z)
  };
  const offsetMm = envelope.offsetMm ?? { xMm: 0, yMm: 0, zMm: 0 };
  const rotationDeg = machine.rotationDeg ?? machine.rotationY;
  const radians = (rotationDeg * Math.PI) / 180;
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  const rotatedOffsetX = offsetMm.xMm * cos - offsetMm.zMm * sin;
  const rotatedOffsetY = offsetMm.xMm * sin + offsetMm.zMm * cos;
  const center = {
    xMm: positionMm.xMm + rotatedOffsetX,
    yMm: positionMm.yMm + rotatedOffsetY
  };

  return {
    objectId: machine.instanceId,
    objectName: machine.definition.name,
    center,
    elevationMm: (machine.elevationMm ?? 0) + offsetMm.yMm,
    rotationDeg,
    envelope,
    corners: getRotatedFootprintCorners(center, envelope.widthMm, envelope.depthMm, rotationDeg)
  };
};

const hasVerticalOverlap = (a: CollisionFootprint, b: CollisionFootprint) => {
  const aMin = a.elevationMm;
  const aMax = a.elevationMm + a.envelope.heightMm;
  const bMin = b.elevationMm;
  const bMax = b.elevationMm + b.envelope.heightMm;
  return aMax > bMin + EPSILON_MM && bMax > aMin + EPSILON_MM;
};

export const checkObjectCollision = (
  a: PlacedMachine,
  b: PlacedMachine
): CollisionPair | null => {
  const aFootprint = buildCollisionEnvelopeFromObject(a);
  const bFootprint = buildCollisionEnvelopeFromObject(b);
  if (!aFootprint || !bFootprint) {
    return null;
  }

  if (!hasVerticalOverlap(aFootprint, bFootprint)) {
    return null;
  }

  if (!checkOrientedRectangleOverlap(aFootprint.corners, bFootprint.corners)) {
    return null;
  }

  return {
    objectAId: aFootprint.objectId,
    objectBId: bFootprint.objectId,
    objectAName: aFootprint.objectName,
    objectBName: bFootprint.objectName,
    severity: "error",
    reason: "Collision envelopes overlap on the floor plan."
  };
};

export const checkAllObjectCollisions = (
  machines: PlacedMachine[],
  enabled = true
): CollisionCheckResult => {
  if (!enabled) {
    return {
      enabled,
      checkedObjectCount: 0,
      pairs: [],
      collidingObjectIds: []
    };
  }

  const pairs: CollisionPair[] = [];
  for (let aIndex = 0; aIndex < machines.length; aIndex += 1) {
    for (let bIndex = aIndex + 1; bIndex < machines.length; bIndex += 1) {
      const pair = checkObjectCollision(machines[aIndex], machines[bIndex]);
      if (pair) {
        pairs.push(pair);
      }
    }
  }

  const collidingObjectIds = Array.from(
    new Set(pairs.flatMap((pair) => [pair.objectAId, pair.objectBId]))
  );

  return {
    enabled,
    checkedObjectCount: machines.length,
    pairs,
    collidingObjectIds
  };
};
