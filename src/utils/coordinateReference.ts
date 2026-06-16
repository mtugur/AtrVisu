import type { CivilReferenceItem } from "../types/civil";
import type { PlacedMachine } from "../types/machine";
import { getMachineDimensionsMm } from "./machineDimensions";
import { metersToMm } from "./units";

export const COORDINATE_REFERENCE_VERSION = "front-left-bottom-v1" as const;
export const LAYOUT_REFERENCE_POINT = "front-left-bottom" as const;

export type PlanPointMm = {
  xMm: number;
  yMm: number;
};

export type PlanBoundsMm = {
  centerXMm: number;
  centerYMm: number;
  minXMm: number;
  maxXMm: number;
  minYMm: number;
  maxYMm: number;
  widthMm: number;
  depthMm: number;
};

export const degToRad = (valueDeg: number) => (valueDeg * Math.PI) / 180;

export const rotatePlanPointMm = (point: PlanPointMm, rotationDeg: number): PlanPointMm => {
  const radians = degToRad(rotationDeg);
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);

  return {
    xMm: point.xMm * cos - point.yMm * sin,
    yMm: point.xMm * sin + point.yMm * cos
  };
};

export const getReferenceToCenterOffsetMm = (
  dimensions: { widthMm: number; depthMm: number },
  rotationDeg: number
): PlanPointMm => rotatePlanPointMm(
  { xMm: dimensions.widthMm / 2, yMm: dimensions.depthMm / 2 },
  rotationDeg
);

export const getCenterFromReferenceMm = (
  reference: PlanPointMm,
  dimensions: { widthMm: number; depthMm: number },
  rotationDeg: number
): PlanPointMm => {
  const offset = getReferenceToCenterOffsetMm(dimensions, rotationDeg);
  return {
    xMm: reference.xMm + offset.xMm,
    yMm: reference.yMm + offset.yMm
  };
};

export const getReferenceFromCenterMm = (
  center: PlanPointMm,
  dimensions: { widthMm: number; depthMm: number },
  rotationDeg: number
): PlanPointMm => {
  const offset = getReferenceToCenterOffsetMm(dimensions, rotationDeg);
  return {
    xMm: center.xMm - offset.xMm,
    yMm: center.yMm - offset.yMm
  };
};

export const getFootprintCornersFromReferenceMm = (
  reference: PlanPointMm,
  dimensions: { widthMm: number; depthMm: number },
  rotationDeg: number
): PlanPointMm[] => {
  const localCorners = [
    { xMm: 0, yMm: 0 },
    { xMm: dimensions.widthMm, yMm: 0 },
    { xMm: dimensions.widthMm, yMm: dimensions.depthMm },
    { xMm: 0, yMm: dimensions.depthMm }
  ];

  return localCorners.map((point) => {
    const rotated = rotatePlanPointMm(point, rotationDeg);
    return {
      xMm: reference.xMm + rotated.xMm,
      yMm: reference.yMm + rotated.yMm
    };
  });
};

export const getBoundsFromCornersMm = (corners: PlanPointMm[]): PlanBoundsMm => {
  const minXMm = Math.min(...corners.map((point) => point.xMm));
  const maxXMm = Math.max(...corners.map((point) => point.xMm));
  const minYMm = Math.min(...corners.map((point) => point.yMm));
  const maxYMm = Math.max(...corners.map((point) => point.yMm));

  return {
    centerXMm: (minXMm + maxXMm) / 2,
    centerYMm: (minYMm + maxYMm) / 2,
    minXMm,
    maxXMm,
    minYMm,
    maxYMm,
    widthMm: maxXMm - minXMm,
    depthMm: maxYMm - minYMm
  };
};

export const getBoundsFromReferenceMm = (
  reference: PlanPointMm,
  dimensions: { widthMm: number; depthMm: number },
  rotationDeg: number
): PlanBoundsMm => getBoundsFromCornersMm(getFootprintCornersFromReferenceMm(reference, dimensions, rotationDeg));

export const getMachineReferencePositionMm = (machine: PlacedMachine): PlanPointMm => (
  machine.positionMm ?? {
    xMm: metersToMm(machine.position.x),
    yMm: metersToMm(machine.position.z)
  }
);

export const usesFrontLeftBottomReference = (
  value: { coordinateReferenceVersion?: string; referencePoint?: string }
) => value.coordinateReferenceVersion === COORDINATE_REFERENCE_VERSION || value.referencePoint === LAYOUT_REFERENCE_POINT;

export const getMachineRenderCenterMm = (machine: PlacedMachine): PlanPointMm => {
  const position = getMachineReferencePositionMm(machine);
  if (!usesFrontLeftBottomReference(machine)) {
    return position;
  }

  const dimensions = getMachineDimensionsMm(machine.definition);
  return getCenterFromReferenceMm(
    position,
    dimensions,
    machine.rotationDeg ?? machine.rotationY ?? 0
  );
};

export const getMachineFootprintBoundsMm = (machine: PlacedMachine): PlanBoundsMm => {
  const dimensions = getMachineDimensionsMm(machine.definition);
  const rotationDeg = machine.rotationDeg ?? machine.rotationY ?? 0;
  const position = getMachineReferencePositionMm(machine);

  if (usesFrontLeftBottomReference(machine)) {
    return getBoundsFromReferenceMm(position, dimensions, rotationDeg);
  }

  return getBoundsFromCornersMm(
    getFootprintCornersFromReferenceMm(
      getReferenceFromCenterMm(position, dimensions, rotationDeg),
      dimensions,
      rotationDeg
    )
  );
};

export const getCivilReferenceRenderCenterMm = (item: CivilReferenceItem): PlanPointMm =>
  usesFrontLeftBottomReference(item)
    ? getCenterFromReferenceMm(
      item.positionMm,
      item.sizeMm,
      item.rotationDeg
    )
    : item.positionMm;

export const getCivilReferenceFootprintBoundsMm = (item: CivilReferenceItem): PlanBoundsMm => {
  if (usesFrontLeftBottomReference(item)) {
    return getBoundsFromReferenceMm(item.positionMm, item.sizeMm, item.rotationDeg);
  }

  return getBoundsFromCornersMm(
    getFootprintCornersFromReferenceMm(
      getReferenceFromCenterMm(item.positionMm, item.sizeMm, item.rotationDeg),
      item.sizeMm,
      item.rotationDeg
    )
  );
};
