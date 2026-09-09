import { metersToMm } from "../../utils/units";

export type PlanPositionMm = {
  xMm: number;
  yMm: number;
};

export type FloorPointMeters = {
  x: number;
  z: number;
};

export type RayPointMeters = FloorPointMeters & { y: number };

export type PlanDragProjectionMode = "horizontal" | "camera-facing";

export type PlanDragProjection = {
  readonly mode: PlanDragProjectionMode;
  readonly anchorPoint: RayPointMeters;
  readonly planeNormal: RayPointMeters;
  readonly startPoint: RayPointMeters;
};

export type SceneDragMutationResult = "applied" | "noop" | "blocked";

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
  projection: PlanDragProjection;
  planeElevationMeters: number;
  startFloorX: number;
  startFloorZ: number;
  startPositions: Record<string, PlanPositionMm>;
};

export type CivilDragState = {
  id: string;
  projection: PlanDragProjection;
  planeElevationMeters: number;
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
  projection,
  selectedInstanceIds,
  lockedInstanceIds,
  machines,
  isToggleSelection
}: {
  targetInstanceId: string;
  projection: PlanDragProjection;
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
    projection,
    planeElevationMeters: projection.anchorPoint.y,
    startFloorX: projection.startPoint.x,
    startFloorZ: projection.startPoint.z,
    startPositions
  };
};

export const createCivilDragState = (
  id: string,
  projection: PlanDragProjection,
  startPosition: PlanPositionMm
): CivilDragState => ({
  id,
  projection,
  planeElevationMeters: projection.anchorPoint.y,
  startFloorX: projection.startPoint.x,
  startFloorZ: projection.startPoint.z,
  startPosition
});

const MIN_HORIZONTAL_DOWNWARD_COSINE = 0.12;
const MIN_RAY_PLANE_DOT = 0.000001;

const isFiniteRayPoint = (point: RayPointMeters | null | undefined): point is RayPointMeters =>
  Boolean(point && Number.isFinite(point.x) && Number.isFinite(point.y) && Number.isFinite(point.z));

const normalizeRayPoint = (point: RayPointMeters): RayPointMeters | null => {
  const length = Math.hypot(point.x, point.y, point.z);
  return Number.isFinite(length) && length > MIN_RAY_PLANE_DOT
    ? { x: point.x / length, y: point.y / length, z: point.z / length }
    : null;
};

const dotRayPoints = (left: RayPointMeters, right: RayPointMeters) =>
  left.x * right.x + left.y * right.y + left.z * right.z;

const copyRayPoint = (point: RayPointMeters): RayPointMeters => ({
  x: point.x,
  y: point.y,
  z: point.z
});

export const intersectRayWithPlanDragPlane = (
  origin: RayPointMeters,
  direction: RayPointMeters,
  planePoint: RayPointMeters,
  planeNormal: RayPointMeters
): RayPointMeters | null => {
  if (![origin, direction, planePoint, planeNormal].every(isFiniteRayPoint)) {
    return null;
  }
  const denominator = dotRayPoints(direction, planeNormal);
  if (Math.abs(denominator) < MIN_RAY_PLANE_DOT) {
    return null;
  }
  const distance = dotRayPoints({
    x: planePoint.x - origin.x,
    y: planePoint.y - origin.y,
    z: planePoint.z - origin.z
  }, planeNormal) / denominator;
  if (!Number.isFinite(distance) || distance < 0) {
    return null;
  }
  const point = {
    x: origin.x + direction.x * distance,
    y: origin.y + direction.y * distance,
    z: origin.z + direction.z * distance
  };
  return isFiniteRayPoint(point) ? point : null;
};

export const createPlanDragProjection = ({
  rayOrigin,
  rayDirection,
  pickedPoint,
  fallbackPoint
}: {
  rayOrigin: RayPointMeters;
  rayDirection: RayPointMeters;
  pickedPoint?: RayPointMeters | null;
  fallbackPoint?: RayPointMeters | null;
}): PlanDragProjection | null => {
  const anchorPoint = isFiniteRayPoint(pickedPoint) ? pickedPoint : fallbackPoint;
  const normalizedDirection = normalizeRayPoint(rayDirection);
  if (!isFiniteRayPoint(rayOrigin) || !isFiniteRayPoint(anchorPoint) || !normalizedDirection) {
    return null;
  }

  if (normalizedDirection.y <= -MIN_HORIZONTAL_DOWNWARD_COSINE) {
    const horizontalNormal = { x: 0, y: 1, z: 0 };
    const horizontalStartPoint = intersectRayWithPlanDragPlane(
      rayOrigin,
      normalizedDirection,
      anchorPoint,
      horizontalNormal
    );
    if (horizontalStartPoint) {
      return {
        mode: "horizontal",
        anchorPoint: copyRayPoint(anchorPoint),
        planeNormal: horizontalNormal,
        startPoint: horizontalStartPoint
      };
    }
  }

  const cameraFacingStartPoint = intersectRayWithPlanDragPlane(
    rayOrigin,
    normalizedDirection,
    anchorPoint,
    normalizedDirection
  );
  if (!cameraFacingStartPoint) {
    return null;
  }

  return {
    mode: "camera-facing",
    anchorPoint: copyRayPoint(anchorPoint),
    planeNormal: copyRayPoint(normalizedDirection),
    startPoint: cameraFacingStartPoint
  };
};

export const projectRayToPlanDrag = (
  projection: PlanDragProjection,
  rayOrigin: RayPointMeters,
  rayDirection: RayPointMeters
) => intersectRayWithPlanDragPlane(
  rayOrigin,
  rayDirection,
  projection.anchorPoint,
  projection.planeNormal
);

export const getHeightPreservingPlanDragPoint = (
  projection: PlanDragProjection,
  projectedPoint: FloorPointMeters
): RayPointMeters => ({
  x: projection.anchorPoint.x + projectedPoint.x - projection.startPoint.x,
  y: projection.anchorPoint.y,
  z: projection.anchorPoint.z + projectedPoint.z - projection.startPoint.z
});

export const intersectRayWithHorizontalDragPlane = (
  origin: RayPointMeters,
  direction: RayPointMeters,
  planeElevationMeters: number
): RayPointMeters | null => {
  return intersectRayWithPlanDragPlane(
    origin,
    direction,
    { x: 0, y: planeElevationMeters, z: 0 },
    { x: 0, y: 1, z: 0 }
  );
};

export const shouldKeepSceneDragActive = (result: SceneDragMutationResult) => result !== "blocked";

export const didSceneDragApplyMutation = (result: SceneDragMutationResult) => result === "applied";

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
