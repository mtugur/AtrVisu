import { metersToMm } from "../../utils/units";

export type PlanPositionMm = { xMm: number; yMm: number };
export type FloorPointMeters = { x: number; z: number };
export type RayPointMeters = FloorPointMeters & { y: number };
export type SceneDragMutationResult = "applied" | "noop" | "blocked";
export type PlanDragProjection = { readonly anchorPoint: RayPointMeters; readonly startPoint: RayPointMeters };
export type PlanDragFrame = { readonly deltaMeters: FloorPointMeters; readonly anchorPoint: RayPointMeters };
export type DraggableMachine = { instanceId: string; position: { x: number; z: number }; positionMm?: PlanPositionMm };
export type MachineDragState = { instanceIds: string[]; projection: PlanDragProjection; startPositions: Record<string, PlanPositionMm> };
export type CivilDragState = { id: string; projection: PlanDragProjection; startPosition: PlanPositionMm };
export type MachineDragPositionUpdate = { instanceId: string; xMm: number; yMm: number };

const MIN_HORIZONTAL_PLANE_RAY_Y = 0.1;
const isFinitePoint = (point: RayPointMeters | null | undefined): point is RayPointMeters =>
  Boolean(point && Number.isFinite(point.x) && Number.isFinite(point.y) && Number.isFinite(point.z));

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
  targetInstanceId, projection, selectedInstanceIds, lockedInstanceIds, machines, isToggleSelection
}: {
  targetInstanceId: string;
  projection: PlanDragProjection;
  selectedInstanceIds: readonly string[];
  lockedInstanceIds: readonly string[];
  machines: readonly DraggableMachine[];
  isToggleSelection: boolean;
}): MachineDragState | null => {
  const instanceIds = getMachineDragInstanceIds(targetInstanceId, selectedInstanceIds, lockedInstanceIds, isToggleSelection);
  if (instanceIds.length === 0) return null;
  const startPositions = instanceIds.reduce<Record<string, PlanPositionMm>>((result, instanceId) => {
    const machine = machines.find((item) => item.instanceId === instanceId);
    if (machine) result[instanceId] = getMachineStartPositionMm(machine);
    return result;
  }, {});
  return Object.keys(startPositions).length === instanceIds.length ? { instanceIds, projection, startPositions } : null;
};

export const createCivilDragState = (id: string, projection: PlanDragProjection, startPosition: PlanPositionMm): CivilDragState => ({
  id, projection, startPosition
});

export const intersectRayWithHorizontalDragPlane = (
  origin: RayPointMeters,
  direction: RayPointMeters,
  planeElevationMeters: number
): RayPointMeters | null => {
  if (!isFinitePoint(origin) || !isFinitePoint(direction) || !Number.isFinite(planeElevationMeters)) return null;
  if (Math.abs(direction.y) <= MIN_HORIZONTAL_PLANE_RAY_Y) return null;
  const distance = (planeElevationMeters - origin.y) / direction.y;
  if (!Number.isFinite(distance) || distance < 0) return null;
  const point = { x: origin.x + direction.x * distance, y: planeElevationMeters, z: origin.z + direction.z * distance };
  return isFinitePoint(point) ? point : null;
};

export const createPlanDragProjection = ({ rayOrigin, rayDirection, pickedPoint, viewPlaneDot }: {
  rayOrigin: RayPointMeters;
  rayDirection: RayPointMeters;
  pickedPoint: RayPointMeters | null | undefined;
  viewPlaneDot?: number;
}): PlanDragProjection | null => {
  if (!isFinitePoint(pickedPoint)) return null;
  if (viewPlaneDot !== undefined && (!Number.isFinite(viewPlaneDot) || viewPlaneDot <= MIN_HORIZONTAL_PLANE_RAY_Y)) return null;
  const startPoint = intersectRayWithHorizontalDragPlane(rayOrigin, rayDirection, pickedPoint.y);
  return startPoint ? { anchorPoint: { x: pickedPoint.x, y: pickedPoint.y, z: pickedPoint.z }, startPoint } : null;
};

export const resolvePlanDragFrame = ({ projection, rayOrigin, rayDirection }: {
  projection: PlanDragProjection;
  rayOrigin: RayPointMeters;
  rayDirection: RayPointMeters;
}): PlanDragFrame | null => {
  const point = intersectRayWithHorizontalDragPlane(rayOrigin, rayDirection, projection.anchorPoint.y);
  if (!point) return null;
  const deltaMeters = { x: point.x - projection.startPoint.x, z: point.z - projection.startPoint.z };
  return {
    deltaMeters,
    anchorPoint: {
      x: projection.anchorPoint.x + deltaMeters.x,
      y: projection.anchorPoint.y,
      z: projection.anchorPoint.z + deltaMeters.z
    }
  };
};

export const shouldKeepSceneDragActive = (result: SceneDragMutationResult) => result !== "blocked";
export const didSceneDragApplyMutation = (result: SceneDragMutationResult) => result === "applied";
export const calculateCivilDragPosition = (state: CivilDragState, deltaMeters: FloorPointMeters): PlanPositionMm => ({
  xMm: state.startPosition.xMm + metersToMm(deltaMeters.x),
  yMm: state.startPosition.yMm + metersToMm(deltaMeters.z)
});
export const calculateMachineDragPositionUpdates = (
  state: MachineDragState,
  deltaMeters: FloorPointMeters
): MachineDragPositionUpdate[] => state.instanceIds.map((instanceId) => ({
  instanceId,
  xMm: state.startPositions[instanceId].xMm + metersToMm(deltaMeters.x),
  yMm: state.startPositions[instanceId].yMm + metersToMm(deltaMeters.z)
}));
