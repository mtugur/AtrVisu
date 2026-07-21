import type { CivilReferenceItem } from "../types/civil";
import type { PlacedMachine } from "../types/machine";
import { COORDINATE_REFERENCE_VERSION, LAYOUT_REFERENCE_POINT } from "./coordinateReference";
import { getMachinePlanPositionMm } from "./placement";
import { mmToMeters } from "./units";

export type AssemblyPlanDelta = {
  deltaXMm: number;
  deltaYMm: number;
};

export type AssemblyMovementResult = {
  machines: PlacedMachine[];
  civilReferences: CivilReferenceItem[];
};

export const getMachinePositionUpdateDelta = (
  machine: PlacedMachine,
  positionMm: { xMm: number; yMm: number }
): AssemblyPlanDelta => {
  const currentPosition = getMachinePlanPositionMm(machine);
  return {
    deltaXMm: positionMm.xMm - currentPosition.xMm,
    deltaYMm: positionMm.yMm - currentPosition.yMm
  };
};

export const getCivilPositionUpdateDelta = (
  item: CivilReferenceItem,
  positionMm: { xMm: number; yMm: number }
): AssemblyPlanDelta => ({
  deltaXMm: positionMm.xMm - item.positionMm.xMm,
  deltaYMm: positionMm.yMm - item.positionMm.yMm
});

export const moveAssemblyMembersByDelta = ({
  machines,
  civilReferences,
  memberEntityIds,
  deltaXMm,
  deltaYMm
}: {
  machines: readonly PlacedMachine[];
  civilReferences: readonly CivilReferenceItem[];
  memberEntityIds: readonly string[];
  deltaXMm: number;
  deltaYMm: number;
}): AssemblyMovementResult | null => {
  if (
    memberEntityIds.length === 0
    || !Number.isFinite(deltaXMm)
    || !Number.isFinite(deltaYMm)
    || (deltaXMm === 0 && deltaYMm === 0)
  ) {
    return null;
  }

  const machineIds = new Set<string>();
  const civilIds = new Set<string>();

  for (const entityId of memberEntityIds) {
    if (entityId.startsWith("machine:") && entityId.length > "machine:".length) {
      machineIds.add(entityId.slice("machine:".length));
    } else if (entityId.startsWith("civil:") && entityId.length > "civil:".length) {
      civilIds.add(entityId.slice("civil:".length));
    } else {
      return null;
    }
  }

  if (
    [...machineIds].some((id) => !machines.some((machine) => machine.instanceId === id))
    || [...civilIds].some((id) => !civilReferences.some((item) => item.id === id))
  ) {
    return null;
  }

  return {
    machines: machines.map((machine) => {
      if (!machineIds.has(machine.instanceId)) {
        return machine;
      }
      const position = getMachinePlanPositionMm(machine);
      const positionMm = {
        xMm: position.xMm + deltaXMm,
        yMm: position.yMm + deltaYMm
      };
      return {
        ...machine,
        positionMm,
        position: {
          x: mmToMeters(positionMm.xMm),
          z: mmToMeters(positionMm.yMm)
        },
        referencePoint: LAYOUT_REFERENCE_POINT,
        coordinateReferenceVersion: COORDINATE_REFERENCE_VERSION
      };
    }),
    civilReferences: civilReferences.map((item) => item && civilIds.has(item.id)
      ? {
          ...item,
          positionMm: {
            ...item.positionMm,
            xMm: item.positionMm.xMm + deltaXMm,
            yMm: item.positionMm.yMm + deltaYMm
          }
        }
      : item)
  };
};
