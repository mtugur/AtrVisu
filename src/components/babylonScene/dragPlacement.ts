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

export type PlanDragJacobian = {
  readonly xScreenDelta: ScreenPointCss;
  readonly zScreenDelta: ScreenPointCss;
};

export type PlanDragConditioning = {
  readonly determinant: number;
  readonly conditionNumber: number;
  readonly worldMmPerCssPixel: number;
  readonly orientationScore: number;
  readonly orientationPreserving: boolean;
  readonly exactSafe: boolean;
};

export type PlanDragProjection = {
  readonly anchorPoint: RayPointMeters;
  readonly startPoint: RayPointMeters;
  readonly startPointerScreen: ScreenPointCss;
  readonly lastPointerScreen: ScreenPointCss;
  readonly planRight: FloorPointMeters;
  readonly planForward: FloorPointMeters;
  readonly initialJacobian: PlanDragJacobian;
  readonly initialConditioning: PlanDragConditioning;
  readonly lastDeltaMeters: FloorPointMeters;
  readonly horizontalOriginPoint: RayPointMeters;
  readonly horizontalOriginDeltaMeters: FloorPointMeters;
  readonly maxIncrementMeters: number;
  readonly maxExactWorldMetersPerCssPixel: number;
  readonly coherenceLimitPx: number;
  readonly fallbackMetersPerCssPixel: number;
  readonly mode: PlanDragFrameMode;
  readonly usedFallback: boolean;
};

export type PlanDragFrameMode = "horizontal" | "screen-stable";

export type PlanDragFrame = {
  readonly mode: PlanDragFrameMode;
  readonly deltaMeters: FloorPointMeters;
  readonly anchorPoint: RayPointMeters;
  readonly pointerErrorPx: number;
  readonly conditioning: PlanDragConditioning;
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
const MAX_DIRECT_POINTER_ERROR_PX = 2;
const JACOBIAN_SAMPLE_METERS = 0.05;
const JACOBIAN_DAMPING_RATIO = 0.015;
const EXACT_ENTER_MAX_CONDITION = 40;
const EXACT_EXIT_MAX_CONDITION = 55;
const EXACT_ENTER_GAIN_FACTOR = 1;
const EXACT_EXIT_GAIN_FACTOR = 1;
const FALLBACK_WORLD_GAIN_SAFETY_FACTOR = 0.75;
const FALLBACK_MIN_CORRECTION_WEIGHT = 0.05;
const FALLBACK_MAX_CORRECTION_WEIGHT = 0.9;
const FALLBACK_MIN_STEP_FACTOR = 1.1;
const FALLBACK_MAX_STEP_FACTOR = 2;
const FALLBACK_CORRECTION_PRESSURE_START_RATIO = 0.5;
const MIN_PROJECTED_OBJECT_SIZE_PX = 24;
const MAX_POINTER_COHERENCE_PX = 72;

const isFiniteRayPoint = (point: RayPointMeters | null | undefined): point is RayPointMeters =>
  Boolean(point && Number.isFinite(point.x) && Number.isFinite(point.y) && Number.isFinite(point.z));

const isFiniteScreenPoint = (point: ScreenPointCss | null | undefined): point is ScreenPointCss =>
  Boolean(point && Number.isFinite(point.x) && Number.isFinite(point.y));

const dotRayPoints = (left: RayPointMeters, right: RayPointMeters) =>
  left.x * right.x + left.y * right.y + left.z * right.z;

const getPlanLength = (point: FloorPointMeters) => Math.hypot(point.x, point.z);

const normalizePlanPoint = (point: FloorPointMeters): FloorPointMeters | null => {
  const length = getPlanLength(point);
  return Number.isFinite(length) && length > MIN_RAY_PLANE_DOT
    ? { x: point.x / length, z: point.z / length }
    : null;
};

const dotPlanPoints = (left: FloorPointMeters, right: FloorPointMeters) =>
  left.x * right.x + left.z * right.z;

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
  pointerScreen,
  planRight,
  planForward,
  projectedObjectSizePx,
  targetPlanSizeMeters,
  maxIncrementMeters,
  projectToScreen
}: {
  rayOrigin: RayPointMeters;
  rayDirection: RayPointMeters;
  pickedPoint: RayPointMeters | null | undefined;
  pointerScreen: ScreenPointCss;
  planRight: FloorPointMeters;
  planForward: FloorPointMeters;
  projectedObjectSizePx: number;
  targetPlanSizeMeters: number;
  maxIncrementMeters: number;
  projectToScreen: (point: RayPointMeters) => ScreenPointCss | null;
}): PlanDragProjection | null => {
  const normalizedRight = normalizePlanPoint(planRight);
  const normalizedForward = normalizePlanPoint(planForward);
  if (
    !isFiniteRayPoint(rayOrigin)
    || !isFiniteRayPoint(rayDirection)
    || !isFiniteRayPoint(pickedPoint)
    || !isFiniteScreenPoint(pointerScreen)
    || !normalizedRight
    || !normalizedForward
    || Math.abs(dotPlanPoints(normalizedRight, normalizedForward)) > 0.001
    || !Number.isFinite(projectedObjectSizePx)
    || projectedObjectSizePx <= 0
    || !Number.isFinite(targetPlanSizeMeters)
    || targetPlanSizeMeters <= 0
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

  const initialJacobian = samplePlanJacobian(pickedPoint, projectToScreen);
  if (!initialJacobian) {
    return null;
  }
  const coherenceLimitPx = Math.min(
    MAX_POINTER_COHERENCE_PX,
    Math.max(MIN_PROJECTED_OBJECT_SIZE_PX, projectedObjectSizePx * 0.6)
  );
  const maxExactWorldMetersPerCssPixel = Math.min(
    maxIncrementMeters / coherenceLimitPx,
    targetPlanSizeMeters * 0.5 / coherenceLimitPx
  );
  const initialConditioning = getPlanDragConditioning({
    jacobian: initialJacobian,
    planRight: normalizedRight,
    planForward: normalizedForward,
    maxWorldMetersPerCssPixel: maxExactWorldMetersPerCssPixel,
    maxConditionNumber: EXACT_ENTER_MAX_CONDITION
  });
  const rightPixelsPerMeter = getScreenVectorLength(applyJacobian(initialJacobian, normalizedRight));
  const forwardPixelsPerMeter = getScreenVectorLength(applyJacobian(initialJacobian, normalizedForward));
  const fallbackMetersPerCssPixel = Math.min(
    maxExactWorldMetersPerCssPixel,
    targetPlanSizeMeters / projectedObjectSizePx,
    1 / Math.max(rightPixelsPerMeter, forwardPixelsPerMeter, MIN_RAY_PLANE_DOT)
  ) * FALLBACK_WORLD_GAIN_SAFETY_FACTOR;

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
    startPointerScreen: { ...pointerScreen },
    lastPointerScreen: { ...pointerScreen },
    planRight: normalizedRight,
    planForward: normalizedForward,
    initialJacobian,
    initialConditioning,
    lastDeltaMeters: { x: 0, z: 0 },
    horizontalOriginPoint: {
      x: initialPlanePoint?.x ?? pickedPoint.x,
      y: initialPlanePoint?.y ?? pickedPoint.y,
      z: initialPlanePoint?.z ?? pickedPoint.z
    },
    horizontalOriginDeltaMeters: { x: 0, z: 0 },
    maxIncrementMeters,
    maxExactWorldMetersPerCssPixel,
    coherenceLimitPx,
    fallbackMetersPerCssPixel,
    mode: initialConditioning.exactSafe ? "horizontal" : "screen-stable",
    usedFallback: false
  };
};

const getScreenVectorLength = (point: ScreenPointCss) => Math.hypot(point.x, point.y);

const applyJacobian = (
  jacobian: PlanDragJacobian,
  point: FloorPointMeters
): ScreenPointCss => ({
  x: jacobian.xScreenDelta.x / JACOBIAN_SAMPLE_METERS * point.x
    + jacobian.zScreenDelta.x / JACOBIAN_SAMPLE_METERS * point.z,
  y: jacobian.xScreenDelta.y / JACOBIAN_SAMPLE_METERS * point.x
    + jacobian.zScreenDelta.y / JACOBIAN_SAMPLE_METERS * point.z
});

const samplePlanJacobian = (
  point: RayPointMeters,
  projectToScreen: (point: RayPointMeters) => ScreenPointCss | null
): PlanDragJacobian | null => {
  const anchorScreen = projectToScreen(point);
  const xScreen = projectToScreen({
    x: point.x + JACOBIAN_SAMPLE_METERS,
    y: point.y,
    z: point.z
  });
  const zScreen = projectToScreen({
    x: point.x,
    y: point.y,
    z: point.z + JACOBIAN_SAMPLE_METERS
  });
  return anchorScreen && xScreen && zScreen
    ? {
        xScreenDelta: { x: xScreen.x - anchorScreen.x, y: xScreen.y - anchorScreen.y },
        zScreenDelta: { x: zScreen.x - anchorScreen.x, y: zScreen.y - anchorScreen.y }
      }
    : null;
};

export const getPlanDragConditioning = ({
  jacobian,
  planRight,
  planForward,
  maxWorldMetersPerCssPixel,
  maxConditionNumber
}: {
  jacobian: PlanDragJacobian;
  planRight: FloorPointMeters;
  planForward: FloorPointMeters;
  maxWorldMetersPerCssPixel: number;
  maxConditionNumber: number;
}): PlanDragConditioning => {
  const j00 = jacobian.xScreenDelta.x / JACOBIAN_SAMPLE_METERS;
  const j10 = jacobian.xScreenDelta.y / JACOBIAN_SAMPLE_METERS;
  const j01 = jacobian.zScreenDelta.x / JACOBIAN_SAMPLE_METERS;
  const j11 = jacobian.zScreenDelta.y / JACOBIAN_SAMPLE_METERS;
  const determinant = j00 * j11 - j01 * j10;
  const trace = j00 * j00 + j10 * j10 + j01 * j01 + j11 * j11;
  const discriminant = Math.sqrt(Math.max(0, trace * trace - 4 * determinant * determinant));
  const maximumSingularValue = Math.sqrt(Math.max(0, (trace + discriminant) / 2));
  const minimumSingularValue = Math.sqrt(Math.max(0, (trace - discriminant) / 2));
  const conditionNumber = minimumSingularValue > MIN_RAY_PLANE_DOT
    ? maximumSingularValue / minimumSingularValue
    : Number.POSITIVE_INFINITY;
  const worldMetersPerCssPixel = minimumSingularValue > MIN_RAY_PLANE_DOT
    ? 1 / minimumSingularValue
    : Number.POSITIVE_INFINITY;
  const projectedRight = applyJacobian(jacobian, planRight);
  const projectedForward = applyJacobian(jacobian, planForward);
  const rightLength = getScreenVectorLength(projectedRight);
  const forwardLength = getScreenVectorLength(projectedForward);
  const orientationScore = rightLength > MIN_RAY_PLANE_DOT && forwardLength > MIN_RAY_PLANE_DOT
    ? Math.min(projectedRight.x / rightLength, projectedForward.y / forwardLength)
    : -1;
  const orientationPreserving = orientationScore > 0;
  const exactSafe = Number.isFinite(conditionNumber)
    && Number.isFinite(worldMetersPerCssPixel)
    && Math.abs(determinant) > MIN_RAY_PLANE_DOT
    && conditionNumber <= maxConditionNumber
    && worldMetersPerCssPixel <= maxWorldMetersPerCssPixel
    && orientationPreserving;
  return {
    determinant,
    conditionNumber,
    worldMmPerCssPixel: worldMetersPerCssPixel * 1000,
    orientationScore,
    orientationPreserving,
    exactSafe
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

const getPlanBasisComponents = (
  value: FloorPointMeters,
  right: FloorPointMeters,
  forward: FloorPointMeters
) => ({
  right: dotPlanPoints(value, right),
  forward: dotPlanPoints(value, forward)
});

const fromPlanBasisComponents = (
  rightAmount: number,
  forwardAmount: number,
  right: FloorPointMeters,
  forward: FloorPointMeters
): FloorPointMeters => ({
  x: right.x * rightAmount + forward.x * forwardAmount,
  z: right.z * rightAmount + forward.z * forwardAmount
});

const preservePointerDirection = (
  delta: FloorPointMeters,
  pointerDelta: ScreenPointCss,
  projection: PlanDragProjection
) => {
  const components = getPlanBasisComponents(delta, projection.planRight, projection.planForward);
  const expectedRightSign = Math.sign(pointerDelta.x);
  const expectedForwardSign = Math.sign(pointerDelta.y);
  const rightAmount = expectedRightSign !== 0 && Math.sign(components.right) === -expectedRightSign
    ? 0
    : components.right;
  const forwardAmount = expectedForwardSign !== 0 && Math.sign(components.forward) === -expectedForwardSign
    ? 0
    : components.forward;
  return fromPlanBasisComponents(
    rightAmount,
    forwardAmount,
    projection.planRight,
    projection.planForward
  );
};

const resolveScreenStableFrame = ({
  projection,
  pointerScreen,
  projectToScreen,
  conditioning
}: {
  projection: PlanDragProjection;
  pointerScreen: ScreenPointCss;
  projectToScreen: (point: RayPointMeters) => ScreenPointCss | null;
  conditioning: PlanDragConditioning;
}): PlanDragFrame | null => {
  const pointerIncrement = {
    x: pointerScreen.x - projection.lastPointerScreen.x,
    y: pointerScreen.y - projection.lastPointerScreen.y
  };
  const pointerDelta = {
    x: pointerScreen.x - projection.startPointerScreen.x,
    y: pointerScreen.y - projection.startPointerScreen.y
  };
  const preferredStep = fromPlanBasisComponents(
    pointerIncrement.x * projection.fallbackMetersPerCssPixel,
    pointerIncrement.y * projection.fallbackMetersPerCssPixel,
    projection.planRight,
    projection.planForward
  );
  const currentAnchor = getTranslatedAnchor(projection.anchorPoint, projection.lastDeltaMeters);
  const currentScreen = projectToScreen(currentAnchor);
  const jacobian = samplePlanJacobian(currentAnchor, projectToScreen);
  const currentPointerErrorPx = currentScreen
    ? getScreenErrorLength(currentScreen, pointerScreen)
    : projection.coherenceLimitPx;
  const normalizedPointerError = currentPointerErrorPx / projection.coherenceLimitPx;
  const coherencePressure = Math.min(1, Math.max(
    0,
    (normalizedPointerError - FALLBACK_CORRECTION_PRESSURE_START_RATIO)
      / (1 - FALLBACK_CORRECTION_PRESSURE_START_RATIO)
  ));
  let correction = { x: 0, z: 0 };
  if (currentScreen && jacobian) {
    correction = solveDampedPlanStep({
      screenError: getScreenError(currentScreen, pointerScreen),
      xScreenDelta: jacobian.xScreenDelta,
      zScreenDelta: jacobian.zScreenDelta,
      maxStepMeters: projection.maxIncrementMeters
    }) ?? correction;
  }
  const preferredLength = getPlanLength(preferredStep);
  const pointerIncrementLength = Math.hypot(pointerIncrement.x, pointerIncrement.y);
  const stepLimit = Math.min(
    projection.maxIncrementMeters,
    Math.max(
      preferredLength * (
        FALLBACK_MIN_STEP_FACTOR
        + coherencePressure * (FALLBACK_MAX_STEP_FACTOR - FALLBACK_MIN_STEP_FACTOR)
      ),
      projection.fallbackMetersPerCssPixel * Math.max(1, pointerIncrementLength)
    )
  );
  const correctionWeight = FALLBACK_MIN_CORRECTION_WEIGHT
    + coherencePressure * (FALLBACK_MAX_CORRECTION_WEIGHT - FALLBACK_MIN_CORRECTION_WEIGHT);
  const blendedStep = clampPlanStep({
    x: preferredStep.x * (1 - correctionWeight) + correction.x * correctionWeight,
    z: preferredStep.z * (1 - correctionWeight) + correction.z * correctionWeight
  }, stepLimit);
  let deltaMeters = preservePointerDirection({
    x: projection.lastDeltaMeters.x + blendedStep.x,
    z: projection.lastDeltaMeters.z + blendedStep.z
  }, pointerDelta, projection);
  let anchorPoint = getTranslatedAnchor(projection.anchorPoint, deltaMeters);
  let projectedAnchor = projectToScreen(anchorPoint);
  if (!projectedAnchor) {
    return null;
  }
  let pointerErrorPx = getScreenErrorLength(projectedAnchor, pointerScreen);
  if (!Number.isFinite(pointerErrorPx)) {
    return null;
  }
  if (pointerErrorPx > projection.coherenceLimitPx) {
    const repairJacobian = samplePlanJacobian(anchorPoint, projectToScreen);
    const appliedStep = {
      x: deltaMeters.x - projection.lastDeltaMeters.x,
      z: deltaMeters.z - projection.lastDeltaMeters.z
    };
    const remainingStepMeters = Math.max(
      0,
      projection.maxIncrementMeters - getPlanLength(appliedStep)
    );
    const repair = repairJacobian && remainingStepMeters > 0
      ? solveDampedPlanStep({
          screenError: getScreenError(projectedAnchor, pointerScreen),
          xScreenDelta: repairJacobian.xScreenDelta,
          zScreenDelta: repairJacobian.zScreenDelta,
          maxStepMeters: remainingStepMeters
        })
      : null;
    if (repair) {
      const repairedStep = clampPlanStep({
        x: appliedStep.x + repair.x,
        z: appliedStep.z + repair.z
      }, projection.maxIncrementMeters);
      const repairedDelta = preservePointerDirection({
        x: projection.lastDeltaMeters.x + repairedStep.x,
        z: projection.lastDeltaMeters.z + repairedStep.z
      }, pointerDelta, projection);
      const repairedAnchor = getTranslatedAnchor(projection.anchorPoint, repairedDelta);
      const repairedScreen = projectToScreen(repairedAnchor);
      const repairedErrorPx = repairedScreen
        ? getScreenErrorLength(repairedScreen, pointerScreen)
        : Number.POSITIVE_INFINITY;
      if (repairedErrorPx < pointerErrorPx) {
        deltaMeters = repairedDelta;
        anchorPoint = repairedAnchor;
        pointerErrorPx = repairedErrorPx;
      }
    }
  }
  return {
    mode: "screen-stable",
    deltaMeters,
    anchorPoint,
    pointerErrorPx,
    conditioning,
    projection: {
      ...projection,
      lastDeltaMeters: deltaMeters,
      lastPointerScreen: { ...pointerScreen },
      mode: "screen-stable",
      usedFallback: true
    }
  };
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
  const currentAnchor = getTranslatedAnchor(projection.anchorPoint, projection.lastDeltaMeters);
  const jacobian = samplePlanJacobian(currentAnchor, projectToScreen);
  if (!jacobian) {
    return null;
  }
  const exactMode = projection.mode === "horizontal";
  const conditioning = getPlanDragConditioning({
    jacobian,
    planRight: projection.planRight,
    planForward: projection.planForward,
    maxWorldMetersPerCssPixel: projection.maxExactWorldMetersPerCssPixel
      * (exactMode ? EXACT_EXIT_GAIN_FACTOR : EXACT_ENTER_GAIN_FACTOR),
    maxConditionNumber: exactMode ? EXACT_EXIT_MAX_CONDITION : EXACT_ENTER_MAX_CONDITION
  });
  if (horizontalPoint && conditioning.exactSafe && exactMode) {
    const deltaMeters = {
      x: projection.horizontalOriginDeltaMeters.x
        + horizontalPoint.x - projection.horizontalOriginPoint.x,
      z: projection.horizontalOriginDeltaMeters.z
        + horizontalPoint.z - projection.horizontalOriginPoint.z
    };
    const anchorPoint = getTranslatedAnchor(projection.anchorPoint, deltaMeters);
    const projectedAnchor = projectToScreen(anchorPoint);
    const pointerErrorPx = projectedAnchor
      ? getScreenErrorLength(projectedAnchor, pointerScreen)
      : Number.POSITIVE_INFINITY;
    const pointerIncrementPx = Math.hypot(
      pointerScreen.x - projection.lastPointerScreen.x,
      pointerScreen.y - projection.lastPointerScreen.y
    );
    const maximumExactIncrementMeters = projection.maxExactWorldMetersPerCssPixel
      * Math.max(1, pointerIncrementPx)
      * EXACT_EXIT_GAIN_FACTOR;
    const totalPointerTravelPx = Math.hypot(
      pointerScreen.x - projection.startPointerScreen.x,
      pointerScreen.y - projection.startPointerScreen.y
    );
    const maximumExactDeltaMeters = projection.maxExactWorldMetersPerCssPixel
      * Math.max(1, totalPointerTravelPx)
      * EXACT_EXIT_GAIN_FACTOR;
    if (
      getPlanLength({
        x: deltaMeters.x - projection.lastDeltaMeters.x,
        z: deltaMeters.z - projection.lastDeltaMeters.z
      }) <= Math.min(projection.maxIncrementMeters, maximumExactIncrementMeters)
      && getPlanLength(deltaMeters) <= maximumExactDeltaMeters
      && pointerErrorPx <= MAX_DIRECT_POINTER_ERROR_PX
    ) {
      const nextProjection = {
        ...projection,
        lastDeltaMeters: deltaMeters,
        lastPointerScreen: { ...pointerScreen },
        usedFallback: projection.usedFallback
      };
      return {
        mode: "horizontal",
        deltaMeters,
        anchorPoint,
        pointerErrorPx,
        conditioning,
        projection: nextProjection
      };
    }
  }
  // Once exact projection becomes unsafe, keep this gesture in fallback mode to avoid boundary chatter.
  const fallbackFrame = resolveScreenStableFrame({
    projection,
    pointerScreen,
    projectToScreen,
    conditioning
  });
  return fallbackFrame;
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
