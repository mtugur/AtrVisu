import type { PlanPositionMm } from "../types/coordinates";
import type { PlacedMachine } from "../types/machine";
import type { MeasurementResult, PlacementSettings } from "../types/placement";
import { getCollisionEnvelopeForMachine } from "./collision";
import { getMachineReferencePositionMm } from "./coordinateReference";
import { getMachineDimensionsMm } from "./machineDimensions";

export const snapMm = (valueMm: number, stepMm: number) => {
  if (!Number.isFinite(valueMm) || !Number.isFinite(stepMm) || stepMm <= 0) {
    return valueMm;
  }
  return Math.round(valueMm / stepMm) * stepMm;
};

export const normalizeRotationDeg = (valueDeg: number) => {
  if (!Number.isFinite(valueDeg)) {
    return 0;
  }
  return ((valueDeg % 360) + 360) % 360;
};

export const snapDeg = (valueDeg: number, stepDeg: number) => {
  if (!Number.isFinite(valueDeg) || !Number.isFinite(stepDeg) || stepDeg <= 0) {
    return normalizeRotationDeg(valueDeg);
  }
  return normalizeRotationDeg(Math.round(valueDeg / stepDeg) * stepDeg);
};

export const applyPositionSnap = (
  positionMm: PlanPositionMm,
  settings: PlacementSettings
): PlanPositionMm => {
  if (!settings.gridSnapEnabled) {
    return positionMm;
  }

  return {
    xMm: snapMm(positionMm.xMm, settings.gridSnapStepMm),
    yMm: snapMm(positionMm.yMm, settings.gridSnapStepMm)
  };
};

export const applyRotationSnap = (rotationDeg: number, settings: PlacementSettings) => {
  return settings.rotationSnapEnabled
    ? snapDeg(rotationDeg, settings.rotationSnapStepDeg)
    : normalizeRotationDeg(rotationDeg);
};

export const commitRotationAngle = (rotationDeg: number, settings: PlacementSettings) => {
  return applyRotationSnap(rotationDeg, settings);
};

export const getRotationNudgeStepDeg = (settings: PlacementSettings) => {
  return settings.rotationSnapEnabled ? settings.rotationSnapStepDeg : 1;
};

export const distanceBetweenPlanPositionsMm = (a: PlanPositionMm, b: PlanPositionMm) => {
  return Math.hypot(b.xMm - a.xMm, b.yMm - a.yMm);
};

export const getMachinePlanPositionMm = (machine: PlacedMachine): PlanPositionMm => {
  return getMachineReferencePositionMm(machine);
};

export const calculateMeasurementBetweenMachines = (
  objectA: PlacedMachine,
  objectB: PlacedMachine
): MeasurementResult => {
  const a = getMachinePlanPositionMm(objectA);
  const b = getMachinePlanPositionMm(objectB);
  const deltaXMm = b.xMm - a.xMm;
  const deltaYMm = b.yMm - a.yMm;
  const distanceMm = distanceBetweenPlanPositionsMm(a, b);
  const aDimensions = getMachineDimensionsMm(objectA.definition);
  const bDimensions = getMachineDimensionsMm(objectB.definition);
  const aEnvelope = getCollisionEnvelopeForMachine(objectA);
  const bEnvelope = getCollisionEnvelopeForMachine(objectB);
  const approximateRadiusA = Math.hypot(
    aEnvelope.widthMm || aDimensions.widthMm,
    aEnvelope.depthMm || aDimensions.depthMm
  ) / 2;
  const approximateRadiusB = Math.hypot(
    bEnvelope.widthMm || bDimensions.widthMm,
    bEnvelope.depthMm || bDimensions.depthMm
  ) / 2;

  return {
    objectAId: objectA.instanceId,
    objectBId: objectB.instanceId,
    deltaXMm,
    deltaYMm,
    distanceMm,
    distanceMeters: distanceMm / 1000,
    approximateGapMm: Math.max(0, distanceMm - approximateRadiusA - approximateRadiusB)
  };
};
