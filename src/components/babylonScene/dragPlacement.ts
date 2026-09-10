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

export type PlanDragBasis = {
  readonly planRight: FloorPointMeters;
  readonly planForwardAwayFromCamera: FloorPointMeters;
  readonly worldUnitsPerCssPixel: number;
  readonly pointerStartClientX: number;
  readonly pointerStartClientY: number;
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
  basis: PlanDragBasis;
  startPositions: Record<string, PlanPositionMm>;
};

export type CivilDragState = {
  id: string;
  basis: PlanDragBasis;
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
  basis,
  selectedInstanceIds,
  lockedInstanceIds,
  machines,
  isToggleSelection
}: {
  targetInstanceId: string;
  basis: PlanDragBasis;
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
    basis,
    startPositions
  };
};

export const createCivilDragState = (
  id: string,
  basis: PlanDragBasis,
  startPosition: PlanPositionMm
): CivilDragState => ({
  id,
  basis,
  startPosition
});

const MIN_RAY_PLANE_DOT = 0.000001;
const MIN_PLAN_HEADING_LENGTH = 0.000001;

const isFiniteRayPoint = (point: RayPointMeters | null | undefined): point is RayPointMeters =>
  Boolean(point && Number.isFinite(point.x) && Number.isFinite(point.y) && Number.isFinite(point.z));

const dotRayPoints = (left: RayPointMeters, right: RayPointMeters) =>
  left.x * right.x + left.y * right.y + left.z * right.z;

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

export const createPlanDragBasis = ({
  cameraPosition,
  cameraTarget,
  cameraAlpha,
  cameraMode,
  radius,
  verticalFovRadians,
  viewportCssHeight,
  orthographicVerticalWorldSpan,
  pointerStartClientX,
  pointerStartClientY
}: {
  cameraPosition: RayPointMeters;
  cameraTarget: RayPointMeters;
  cameraAlpha: number;
  cameraMode: "perspective" | "orthographic";
  radius: number;
  verticalFovRadians: number;
  viewportCssHeight: number;
  orthographicVerticalWorldSpan?: number | null;
  pointerStartClientX: number;
  pointerStartClientY: number;
}): PlanDragBasis | null => {
  if (
    !isFiniteRayPoint(cameraPosition)
    || !isFiniteRayPoint(cameraTarget)
    || ![
      cameraAlpha,
      radius,
      verticalFovRadians,
      viewportCssHeight,
      pointerStartClientX,
      pointerStartClientY
    ].every(Number.isFinite)
    || viewportCssHeight <= 0
  ) {
    return null;
  }

  const headingX = cameraTarget.x - cameraPosition.x;
  const headingZ = cameraTarget.z - cameraPosition.z;
  const headingLength = Math.hypot(headingX, headingZ);
  const planForwardAwayFromCamera = headingLength > MIN_PLAN_HEADING_LENGTH
    ? { x: headingX / headingLength, z: headingZ / headingLength }
    : { x: -Math.cos(cameraAlpha), z: -Math.sin(cameraAlpha) };
  const planRight = {
    x: planForwardAwayFromCamera.z,
    z: -planForwardAwayFromCamera.x
  };

  const worldUnitsPerCssPixel = cameraMode === "orthographic"
    ? Number.isFinite(orthographicVerticalWorldSpan) && (orthographicVerticalWorldSpan ?? 0) > 0
      ? (orthographicVerticalWorldSpan as number) / viewportCssHeight
      : Number.NaN
    : radius > 0 && verticalFovRadians > 0 && verticalFovRadians < Math.PI
      ? 2 * radius * Math.tan(verticalFovRadians / 2) / viewportCssHeight
      : Number.NaN;

  if (!Number.isFinite(worldUnitsPerCssPixel) || worldUnitsPerCssPixel <= 0) {
    return null;
  }

  return {
    planRight,
    planForwardAwayFromCamera,
    worldUnitsPerCssPixel,
    pointerStartClientX,
    pointerStartClientY
  };
};

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
  basis: PlanDragBasis,
  pointer: { readonly clientX: number; readonly clientY: number }
) => {
  const deltaCssX = pointer.clientX - basis.pointerStartClientX;
  const deltaCssY = pointer.clientY - basis.pointerStartClientY;
  const rightWorldUnits = deltaCssX * basis.worldUnitsPerCssPixel;
  const forwardWorldUnits = -deltaCssY * basis.worldUnitsPerCssPixel;

  return {
    deltaXMm: metersToMm(
      basis.planRight.x * rightWorldUnits
      + basis.planForwardAwayFromCamera.x * forwardWorldUnits
    ),
    deltaYMm: metersToMm(
      basis.planRight.z * rightWorldUnits
      + basis.planForwardAwayFromCamera.z * forwardWorldUnits
    )
  };
};

export const calculateCivilDragPosition = (
  dragState: CivilDragState,
  pointer: { readonly clientX: number; readonly clientY: number }
): PlanPositionMm => {
  const { deltaXMm, deltaYMm } = getPlanDragDeltaMm(dragState.basis, pointer);

  return {
    xMm: dragState.startPosition.xMm + deltaXMm,
    yMm: dragState.startPosition.yMm + deltaYMm
  };
};

export const calculateMachineDragPositionUpdates = (
  dragState: MachineDragState,
  pointer: { readonly clientX: number; readonly clientY: number }
): MachineDragPositionUpdate[] => {
  const { deltaXMm, deltaYMm } = getPlanDragDeltaMm(dragState.basis, pointer);

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
