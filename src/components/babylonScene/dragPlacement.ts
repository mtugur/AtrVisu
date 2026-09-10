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

export type ScreenPointCss = {
  x: number;
  y: number;
};

export type PlanDragProjection = {
  readonly anchorPoint: RayPointMeters;
  readonly startPoint: RayPointMeters;
  readonly lastDeltaMeters: FloorPointMeters;
  readonly maxIncrementMeters: number;
  readonly usedFallback: boolean;
};

export type PlanDragFrameMode = "horizontal" | "screen-jacobian";

export type PlanDragFrame = {
  readonly mode: PlanDragFrameMode;
  readonly deltaMeters: FloorPointMeters;
  readonly anchorPoint: RayPointMeters;
  readonly pointerErrorPx: number;
  readonly projection: PlanDragProjection;
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
  startPositions: Record<string, PlanPositionMm>;
};

export type CivilDragState = {
  id: string;
  projection: PlanDragProjection;
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
  startPosition
});

const MIN_RAY_PLANE_DOT = 0.000001;
const MIN_WELL_CONDITIONED_VERTICAL_COSINE = 0.015;
const MAX_DIRECT_POINTER_ERROR_PX = 2;
const JACOBIAN_SAMPLE_METERS = 0.05;
const JACOBIAN_DAMPING_RATIO = 0.00000001;
const JACOBIAN_ITERATIONS = 6;

const isFiniteRayPoint = (point: RayPointMeters | null | undefined): point is RayPointMeters =>
  Boolean(point && Number.isFinite(point.x) && Number.isFinite(point.y) && Number.isFinite(point.z));

const isFiniteScreenPoint = (point: ScreenPointCss | null | undefined): point is ScreenPointCss =>
  Boolean(point && Number.isFinite(point.x) && Number.isFinite(point.y));

const dotRayPoints = (left: RayPointMeters, right: RayPointMeters) =>
  left.x * right.x + left.y * right.y + left.z * right.z;

const getNormalizedVerticalCosine = (direction: RayPointMeters) => {
  const length = Math.hypot(direction.x, direction.y, direction.z);
  return Number.isFinite(length) && length > MIN_RAY_PLANE_DOT
    ? Math.abs(direction.y / length)
    : 0;
};

const getPlanLength = (point: FloorPointMeters) => Math.hypot(point.x, point.z);

const clampPlanStep = (step: FloorPointMeters, maxLength: number): FloorPointMeters => {
  const length = getPlanLength(step);
  if (!Number.isFinite(length) || length <= maxLength) {
    return step;
  }
  const scale = maxLength / length;
  return { x: step.x * scale, z: step.z * scale };
};

const getScreenError = (projected: ScreenPointCss, pointer: ScreenPointCss) => ({
  x: pointer.x - projected.x,
  y: pointer.y - projected.y
});

const getScreenErrorLength = (projected: ScreenPointCss, pointer: ScreenPointCss) => {
  const error = getScreenError(projected, pointer);
  return Math.hypot(error.x, error.y);
};

const getTranslatedAnchor = (
  anchorPoint: RayPointMeters,
  deltaMeters: FloorPointMeters
): RayPointMeters => ({
  x: anchorPoint.x + deltaMeters.x,
  y: anchorPoint.y,
  z: anchorPoint.z + deltaMeters.z
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

export const intersectRayWithHorizontalDragPlane = (
  origin: RayPointMeters,
  direction: RayPointMeters,
  planeElevationMeters: number
): RayPointMeters | null => intersectRayWithPlanDragPlane(
  origin,
  direction,
  { x: 0, y: planeElevationMeters, z: 0 },
  { x: 0, y: 1, z: 0 }
);

export const createPlanDragProjection = ({
  rayOrigin,
  rayDirection,
  pickedPoint,
  maxIncrementMeters
}: {
  rayOrigin: RayPointMeters;
  rayDirection: RayPointMeters;
  pickedPoint: RayPointMeters | null | undefined;
  maxIncrementMeters: number;
}): PlanDragProjection | null => {
  if (
    !isFiniteRayPoint(rayOrigin)
    || !isFiniteRayPoint(rayDirection)
    || !isFiniteRayPoint(pickedPoint)
    || !Number.isFinite(maxIncrementMeters)
    || maxIncrementMeters <= 0
  ) {
    return null;
  }

  const initialPlanePoint = intersectRayWithHorizontalDragPlane(
    rayOrigin,
    rayDirection,
    pickedPoint.y
  );

  return {
    anchorPoint: {
      x: pickedPoint.x,
      y: pickedPoint.y,
      z: pickedPoint.z
    },
    startPoint: {
      x: initialPlanePoint?.x ?? pickedPoint.x,
      y: initialPlanePoint?.y ?? pickedPoint.y,
      z: initialPlanePoint?.z ?? pickedPoint.z
    },
    lastDeltaMeters: { x: 0, z: 0 },
    maxIncrementMeters,
    usedFallback: false
  };
};

const solveDampedPlanStep = ({
  screenError,
  xScreenDelta,
  zScreenDelta,
  maxStepMeters
}: {
  screenError: ScreenPointCss;
  xScreenDelta: ScreenPointCss;
  zScreenDelta: ScreenPointCss;
  maxStepMeters: number;
}): FloorPointMeters | null => {
  const j00 = xScreenDelta.x / JACOBIAN_SAMPLE_METERS;
  const j10 = xScreenDelta.y / JACOBIAN_SAMPLE_METERS;
  const j01 = zScreenDelta.x / JACOBIAN_SAMPLE_METERS;
  const j11 = zScreenDelta.y / JACOBIAN_SAMPLE_METERS;
  if (![j00, j10, j01, j11].every(Number.isFinite)) {
    return null;
  }

  const normal00 = j00 * j00 + j10 * j10;
  const normal01 = j00 * j01 + j10 * j11;
  const normal11 = j01 * j01 + j11 * j11;
  const damping = Math.max(
    (normal00 + normal11) * JACOBIAN_DAMPING_RATIO,
    MIN_RAY_PLANE_DOT
  );
  const a00 = normal00 + damping;
  const a11 = normal11 + damping;
  const determinant = a00 * a11 - normal01 * normal01;
  if (!Number.isFinite(determinant) || determinant <= MIN_RAY_PLANE_DOT) {
    return null;
  }

  const rightX = j00 * screenError.x + j10 * screenError.y;
  const rightZ = j01 * screenError.x + j11 * screenError.y;
  const step = {
    x: (a11 * rightX - normal01 * rightZ) / determinant,
    z: (a00 * rightZ - normal01 * rightX) / determinant
  };
  return Number.isFinite(step.x) && Number.isFinite(step.z)
    ? clampPlanStep(step, maxStepMeters)
    : null;
};

export const resolvePlanDragFrame = ({
  projection,
  rayOrigin,
  rayDirection,
  pointerScreen,
  projectToScreen
}: {
  projection: PlanDragProjection;
  rayOrigin: RayPointMeters;
  rayDirection: RayPointMeters;
  pointerScreen: ScreenPointCss;
  projectToScreen: (point: RayPointMeters) => ScreenPointCss | null;
}): PlanDragFrame | null => {
  if (!isFiniteRayPoint(rayOrigin) || !isFiniteRayPoint(rayDirection) || !isFiniteScreenPoint(pointerScreen)) {
    return null;
  }

  const horizontalPoint = intersectRayWithHorizontalDragPlane(
    rayOrigin,
    rayDirection,
    projection.anchorPoint.y
  );
  if (horizontalPoint && getNormalizedVerticalCosine(rayDirection) >= MIN_WELL_CONDITIONED_VERTICAL_COSINE) {
    const deltaMeters = {
      x: horizontalPoint.x - projection.startPoint.x,
      z: horizontalPoint.z - projection.startPoint.z
    };
    const incrementalDelta = {
      x: deltaMeters.x - projection.lastDeltaMeters.x,
      z: deltaMeters.z - projection.lastDeltaMeters.z
    };
    const anchorPoint = getTranslatedAnchor(projection.anchorPoint, deltaMeters);
    const projectedAnchor = projectToScreen(anchorPoint);
    const pointerErrorPx = projectedAnchor
      ? getScreenErrorLength(projectedAnchor, pointerScreen)
      : Number.POSITIVE_INFINITY;
    if (
      (!projection.usedFallback || getPlanLength(incrementalDelta) <= projection.maxIncrementMeters)
      && pointerErrorPx <= MAX_DIRECT_POINTER_ERROR_PX
    ) {
      const nextProjection = {
        ...projection,
        lastDeltaMeters: deltaMeters,
        usedFallback: projection.usedFallback
      };
      return {
        mode: "horizontal",
        deltaMeters,
        anchorPoint,
        pointerErrorPx,
        projection: nextProjection
      };
    }
  }

  let deltaMeters = { ...projection.lastDeltaMeters };
  let remainingStepMeters = projection.maxIncrementMeters;

  for (let iteration = 0; iteration < JACOBIAN_ITERATIONS && remainingStepMeters > 0; iteration += 1) {
    const anchorPoint = getTranslatedAnchor(projection.anchorPoint, deltaMeters);
    const anchorScreen = projectToScreen(anchorPoint);
    const xSampleScreen = projectToScreen({
      x: anchorPoint.x + JACOBIAN_SAMPLE_METERS,
      y: anchorPoint.y,
      z: anchorPoint.z
    });
    const zSampleScreen = projectToScreen({
      x: anchorPoint.x,
      y: anchorPoint.y,
      z: anchorPoint.z + JACOBIAN_SAMPLE_METERS
    });
    if (!anchorScreen || !xSampleScreen || !zSampleScreen) {
      break;
    }

    const screenError = getScreenError(anchorScreen, pointerScreen);
    if (Math.hypot(screenError.x, screenError.y) <= 0.25) {
      break;
    }
    const step = solveDampedPlanStep({
      screenError,
      xScreenDelta: {
        x: xSampleScreen.x - anchorScreen.x,
        y: xSampleScreen.y - anchorScreen.y
      },
      zScreenDelta: {
        x: zSampleScreen.x - anchorScreen.x,
        y: zSampleScreen.y - anchorScreen.y
      },
      maxStepMeters: remainingStepMeters
    });
    if (!step) {
      break;
    }
    deltaMeters = {
      x: deltaMeters.x + step.x,
      z: deltaMeters.z + step.z
    };
    remainingStepMeters -= getPlanLength(step);
  }

  const anchorPoint = getTranslatedAnchor(projection.anchorPoint, deltaMeters);
  const projectedAnchor = projectToScreen(anchorPoint);
  if (!projectedAnchor) {
    return null;
  }
  const pointerErrorPx = getScreenErrorLength(projectedAnchor, pointerScreen);
  if (!Number.isFinite(pointerErrorPx)) {
    return null;
  }
  const nextProjection = { ...projection, lastDeltaMeters: deltaMeters, usedFallback: true };
  return {
    mode: "screen-jacobian",
    deltaMeters,
    anchorPoint,
    pointerErrorPx,
    projection: nextProjection
  };
};

export const shouldKeepSceneDragActive = (result: SceneDragMutationResult) => result !== "blocked";

export const didSceneDragApplyMutation = (result: SceneDragMutationResult) => result === "applied";

export const calculateCivilDragPosition = (
  dragState: CivilDragState,
  deltaMeters: FloorPointMeters
): PlanPositionMm => ({
  xMm: dragState.startPosition.xMm + metersToMm(deltaMeters.x),
  yMm: dragState.startPosition.yMm + metersToMm(deltaMeters.z)
});

export const calculateMachineDragPositionUpdates = (
  dragState: MachineDragState,
  deltaMeters: FloorPointMeters
): MachineDragPositionUpdate[] => dragState.instanceIds.flatMap((instanceId) => {
  const startPosition = dragState.startPositions[instanceId];
  return startPosition
    ? [{
        instanceId,
        xMm: startPosition.xMm + metersToMm(deltaMeters.x),
        yMm: startPosition.yMm + metersToMm(deltaMeters.z)
      }]
    : [];
});
