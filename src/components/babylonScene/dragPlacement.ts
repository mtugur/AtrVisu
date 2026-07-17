import { metersToMm } from "../../utils/units";

export type PlanPositionMm = {
  xMm: number;
  yMm: number;
};

export type FloorPointMeters = {
  x: number;
  z: number;
};

export type DraggableMachine = {
  instanceId: string;
  position: {
    x: number;
    z: number;
  };
  positionMm?: PlanPositionMm;
};

export type MachineDragState = {
  instanceIds: string[];
  startFloorX: number;
  startFloorZ: number;
  startPositions: Record<string, PlanPositionMm>;
};

export type CivilDragState = {
  id: string;
  startFloorX: number;
  startFloorZ: number;
  startPosition: PlanPositionMm;
};

export type MachineDragPositionUpdate = {
  instanceId: string;
  xMm: number;
  yMm: number;
};

export const getMachineDragInstanceIds = (
  targetInstanceId: string,
  selectedInstanceIds: readonly string[],
  lockedInstanceIds: readonly string[],
  isToggleSelection: boolean
) => {
  const candidateIds = selectedInstanceIds.includes(targetInstanceId) && !isToggleSelection
    ? selectedInstanceIds
    : [targetInstanceId];
  const lockedIds = new Set(lockedInstanceIds);

  return candidateIds.some((id) => lockedIds.has(id)) ? [] : [...candidateIds];
};

export const getMachineStartPositionMm = (machine: DraggableMachine): PlanPositionMm => ({
  xMm: machine.positionMm?.xMm ?? metersToMm(machine.position.x),
  yMm: machine.positionMm?.yMm ?? metersToMm(machine.position.z)
});

export const createMachineDragState = ({
  targetInstanceId,
  floorPoint,
  selectedInstanceIds,
  lockedInstanceIds,
  machines,
  isToggleSelection
}: {
  targetInstanceId: string;
  floorPoint: FloorPointMeters;
  selectedInstanceIds: readonly string[];
  lockedInstanceIds: readonly string[];
  machines: readonly DraggableMachine[];
  isToggleSelection: boolean;
}): MachineDragState | null => {
  const instanceIds = getMachineDragInstanceIds(
    targetInstanceId,
    selectedInstanceIds,
    lockedInstanceIds,
    isToggleSelection
  );
  if (instanceIds.length === 0) {
    return null;
  }

  const startPositions = instanceIds.reduce<Record<string, PlanPositionMm>>((positions, instanceId) => {
    const machine = machines.find((item) => item.instanceId === instanceId);
    if (machine) {
      positions[instanceId] = getMachineStartPositionMm(machine);
    }
    return positions;
  }, {});
  if (Object.keys(startPositions).length !== instanceIds.length) {
    return null;
  }

  return {
    instanceIds,
    startFloorX: floorPoint.x,
    startFloorZ: floorPoint.z,
    startPositions
  };
};

export const createCivilDragState = (
  id: string,
  floorPoint: FloorPointMeters,
  startPosition: PlanPositionMm
): CivilDragState => ({
  id,
  startFloorX: floorPoint.x,
  startFloorZ: floorPoint.z,
  startPosition
});

export const getPlanDragDeltaMm = (
  dragStart: Pick<MachineDragState | CivilDragState, "startFloorX" | "startFloorZ">,
  floorPoint: FloorPointMeters
) => ({
  deltaXMm: metersToMm(floorPoint.x - dragStart.startFloorX),
  deltaYMm: metersToMm(floorPoint.z - dragStart.startFloorZ)
});

export const calculateCivilDragPosition = (
  dragState: CivilDragState,
  floorPoint: FloorPointMeters
): PlanPositionMm => {
  const { deltaXMm, deltaYMm } = getPlanDragDeltaMm(dragState, floorPoint);

  return {
    xMm: dragState.startPosition.xMm + deltaXMm,
    yMm: dragState.startPosition.yMm + deltaYMm
  };
};

export const calculateMachineDragPositionUpdates = (
  dragState: MachineDragState,
  floorPoint: FloorPointMeters
): MachineDragPositionUpdate[] => {
  const { deltaXMm, deltaYMm } = getPlanDragDeltaMm(dragState, floorPoint);

  return dragState.instanceIds.flatMap((instanceId) => {
    const startPosition = dragState.startPositions[instanceId];
    return startPosition
      ? [{
          instanceId,
          xMm: startPosition.xMm + deltaXMm,
          yMm: startPosition.yMm + deltaYMm
        }]
      : [];
  });
};
