import type { PlacedMachine } from "../types/machine";
import type { PlanBounds } from "../types/alignment";
import { getMachineDimensionsMm } from "./machineDimensions";
import { getMachinePlanPositionMm } from "./placement";

const degToRad = (valueDeg: number) => (valueDeg * Math.PI) / 180;

export const getObjectPlanBounds = (machine: PlacedMachine): PlanBounds => {
  const position = getMachinePlanPositionMm(machine);
  const dimensions = getMachineDimensionsMm(machine.definition);
  const rotationDeg = machine.rotationDeg ?? machine.rotationY ?? 0;
  const rotationRad = degToRad(rotationDeg);
  const cos = Math.abs(Math.cos(rotationRad));
  const sin = Math.abs(Math.sin(rotationRad));

  // Foundation v0.1 uses axis-aligned plan bounds. Rotated objects expand to
  // the enclosing AABB, which is predictable for alignment and collision UI.
  const rotatedWidthMm = dimensions.widthMm * cos + dimensions.depthMm * sin;
  const rotatedDepthMm = dimensions.widthMm * sin + dimensions.depthMm * cos;

  return {
    objectId: machine.instanceId,
    centerXMm: position.xMm,
    centerYMm: position.yMm,
    minXMm: position.xMm - rotatedWidthMm / 2,
    maxXMm: position.xMm + rotatedWidthMm / 2,
    minYMm: position.yMm - rotatedDepthMm / 2,
    maxYMm: position.yMm + rotatedDepthMm / 2,
    widthMm: rotatedWidthMm,
    depthMm: rotatedDepthMm
  };
};

export const getSelectionPlanBounds = (machines: PlacedMachine[]): PlanBounds | null => {
  if (machines.length === 0) {
    return null;
  }

  const bounds = machines.map(getObjectPlanBounds);
  const minXMm = Math.min(...bounds.map((item) => item.minXMm));
  const maxXMm = Math.max(...bounds.map((item) => item.maxXMm));
  const minYMm = Math.min(...bounds.map((item) => item.minYMm));
  const maxYMm = Math.max(...bounds.map((item) => item.maxYMm));

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
