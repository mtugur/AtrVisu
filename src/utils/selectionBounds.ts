import type { PlacedMachine } from "../types/machine";
import type { PlanBounds } from "../types/alignment";
import { getMachineFootprintBoundsMm } from "./coordinateReference";

export const getObjectPlanBounds = (machine: PlacedMachine): PlanBounds => {
  const bounds = getMachineFootprintBoundsMm(machine);

  return {
    objectId: machine.instanceId,
    ...bounds
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
