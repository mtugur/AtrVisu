import type {
  AtaraConnectionDirection,
  AtaraConnectionPointType,
  MachineConnectionPoint
} from "../types/ataraMachineData";
import type { PlacedMachine } from "../types/machine";
import type { PlatformEntity, SelectionState } from "../platform/contracts";
import { evaluateAtomicMovement } from "../platform/runtimeSelection";
import {
  getConnectionPointsForObject,
  getConnectionPointTypeLabel,
  getConnectionPointWorldDirection,
  getConnectionPointWorldPosition
} from "./connectionPoints";
import { COORDINATE_REFERENCE_VERSION, LAYOUT_REFERENCE_POINT } from "./coordinateReference";
import { getMachinePlanPositionMm } from "./placement";
import { mmToMeters } from "./units";

export type ConnectionPointSnapSelection = {
  movingMachineId: string;
  fixedMachineId: string;
  movingPointId: string;
  fixedPointId: string;
  gapMm: number;
};

export type ConnectionPointSnapDelta = {
  deltaXMm: number;
  deltaYMm: number;
  targetPointXMm: number;
  targetPointYMm: number;
  currentDistanceMm: number;
};

export type ConnectionPointCompatibility = {
  level: "good" | "warning" | "invalid";
  messages: string[];
};

export type ConnectionPointSnapCandidateEvaluation = {
  status: "disabled" | "missing-points" | "out-of-threshold" | "ready";
  canSnap: boolean;
  distanceMm?: number;
  delta?: ConnectionPointSnapDelta;
};

export type ConnectionPointSnapRuntimeAccessEvaluation =
  | { allowed: true }
  | {
      allowed: false;
      reason: ConnectionPointSnapContextFailureReason;
    };

export type ConnectionPointSnapContextFailureReason =
  | "unresolved"
  | "machine-unavailable"
  | "assembly-edit-required"
  | "explicit-selection-required"
  | "locked"
  | "no-product-flow-pair";

export type ConnectionPointSnapContextEvaluation =
  | {
      available: true;
      machineEntityIds: readonly [string, string];
      machineIds: readonly [string, string];
    }
  | {
      available: false;
      reason: ConnectionPointSnapContextFailureReason;
    };

export type ConnectionPointSnapContextInput = {
  selection: SelectionState;
  entities: readonly PlatformEntity[];
  activeGroupEditId?: string | null;
};

export type ProductFlowConnectionPointPair = Readonly<{
  movingMachineId: string;
  fixedMachineId: string;
  movingPoint: MachineConnectionPoint;
  fixedPoint: MachineConnectionPoint;
}>;

export type PremiumConnectionPointSnapContextInput = ConnectionPointSnapContextInput & {
  machines: readonly PlacedMachine[];
};

export type PremiumConnectionPointSnapContextEvaluation =
  | (Extract<ConnectionPointSnapContextEvaluation, { available: true }> & {
      productFlowPair: ProductFlowConnectionPointPair;
    })
  | Extract<ConnectionPointSnapContextEvaluation, { available: false }>;

const connectionPointSnapContextMessages: Readonly<Record<ConnectionPointSnapContextFailureReason, string>> = {
  unresolved: "Selected machines could not be resolved.",
  "machine-unavailable": "Both selected machines must be visible and selectable.",
  "assembly-edit-required": "Grouped machines require their matching active Edit Group.",
  "explicit-selection-required": "Select exactly two explicit machines.",
  locked: "Connection Point Snap is blocked because the selection contains a locked entity.",
  "no-product-flow-pair": "Selected machines do not provide a Product Out to Product In connection."
};

export const getConnectionPointSnapContextMessage = (
  reason: ConnectionPointSnapContextFailureReason
) => connectionPointSnapContextMessages[reason];

export type ConnectionPointSnapRuntimeAccessInput = {
  selection: SelectionState;
  entities: readonly PlatformEntity[];
  activeGroupEditId?: string | null;
  movingMachineId: string;
  fixedMachineId: string;
  movingPoint?: MachineConnectionPoint;
  fixedPoint?: MachineConnectionPoint;
  requireProductFlowPair?: boolean;
};

const directionVectors: Record<AtaraConnectionDirection, { xMm: number; yMm: number; zMm: number }> = {
  "x+": { xMm: 1, yMm: 0, zMm: 0 },
  "x-": { xMm: -1, yMm: 0, zMm: 0 },
  "y+": { xMm: 0, yMm: 1, zMm: 0 },
  "y-": { xMm: 0, yMm: -1, zMm: 0 },
  "z+": { xMm: 0, yMm: 0, zMm: 1 },
  "z-": { xMm: 0, yMm: 0, zMm: -1 }
};

const productTypes = new Set<AtaraConnectionPointType>(["product-in", "product-out"]);

export const isProductFlowConnectionPointPair = (
  movingPoint: MachineConnectionPoint | null | undefined,
  fixedPoint: MachineConnectionPoint | null | undefined
) => movingPoint?.type === "product-out" && fixedPoint?.type === "product-in";

export const findProductFlowConnectionPointPair = (
  machines: readonly PlacedMachine[]
): ProductFlowConnectionPointPair | null => {
  if (machines.length !== 2) {
    return null;
  }

  const [firstMachine, secondMachine] = machines;
  const firstPoints = getConnectionPointsForObject(firstMachine);
  const secondPoints = getConnectionPointsForObject(secondMachine);
  const firstOut = firstPoints.find((point) => point.type === "product-out");
  const firstIn = firstPoints.find((point) => point.type === "product-in");
  const secondOut = secondPoints.find((point) => point.type === "product-out");
  const secondIn = secondPoints.find((point) => point.type === "product-in");

  if (firstOut && secondIn) {
    return {
      movingMachineId: firstMachine.instanceId,
      fixedMachineId: secondMachine.instanceId,
      movingPoint: firstOut,
      fixedPoint: secondIn
    };
  }
  if (secondOut && firstIn) {
    return {
      movingMachineId: secondMachine.instanceId,
      fixedMachineId: firstMachine.instanceId,
      movingPoint: secondOut,
      fixedPoint: firstIn
    };
  }
  return null;
};

const directionDot = (a: AtaraConnectionDirection, b: AtaraConnectionDirection) => {
  const first = directionVectors[a];
  const second = directionVectors[b];
  return first.xMm * second.xMm + first.yMm * second.yMm + first.zMm * second.zMm;
};

export const getConnectionPointById = (points: MachineConnectionPoint[], pointId: string) =>
  points.find((point) => point.id === pointId) ?? null;

export const formatConnectionPointSelectorLabel = (point: MachineConnectionPoint) => {
  const name = point.name.trim() || point.id;
  return `${getConnectionPointTypeLabel(point.type)} - ${point.id} - ${name}`;
};

export const getConnectionPointSnapDelta = (
  movingMachine: PlacedMachine,
  fixedMachine: PlacedMachine,
  movingPoint: MachineConnectionPoint,
  fixedPoint: MachineConnectionPoint,
  gapMm = 0
): ConnectionPointSnapDelta => {
  const movingWorld = getConnectionPointWorldPosition(movingMachine, movingPoint);
  const fixedWorld = getConnectionPointWorldPosition(fixedMachine, fixedPoint);
  const fixedDirection = getConnectionPointWorldDirection(fixedMachine, fixedPoint);
  const fixedVector = directionVectors[fixedDirection];
  const safeGapMm = Number.isFinite(gapMm) ? Math.max(0, gapMm) : 0;
  const targetPointXMm = fixedWorld.xMm + fixedVector.xMm * safeGapMm;
  const targetPointYMm = fixedWorld.yMm + fixedVector.yMm * safeGapMm;

  return {
    deltaXMm: targetPointXMm - movingWorld.xMm,
    deltaYMm: targetPointYMm - movingWorld.yMm,
    targetPointXMm,
    targetPointYMm,
    currentDistanceMm: Math.hypot(fixedWorld.xMm - movingWorld.xMm, fixedWorld.yMm - movingWorld.yMm)
  };
};

export const evaluateConnectionPointSnapCandidate = (
  movingMachine: PlacedMachine | null | undefined,
  fixedMachine: PlacedMachine | null | undefined,
  movingPoint: MachineConnectionPoint | null | undefined,
  fixedPoint: MachineConnectionPoint | null | undefined,
  options: {
    enabled?: boolean;
    gapMm?: number;
    maxSnapDistanceMm?: number;
  } = {}
): ConnectionPointSnapCandidateEvaluation => {
  if (options.enabled === false) {
    return { status: "disabled", canSnap: false };
  }

  if (!movingMachine || !fixedMachine || !movingPoint || !fixedPoint) {
    return { status: "missing-points", canSnap: false };
  }

  const delta = getConnectionPointSnapDelta(movingMachine, fixedMachine, movingPoint, fixedPoint, options.gapMm ?? 0);
  const maxSnapDistanceMm = options.maxSnapDistanceMm;
  if (
    typeof maxSnapDistanceMm === "number" &&
    Number.isFinite(maxSnapDistanceMm) &&
    maxSnapDistanceMm >= 0 &&
    delta.currentDistanceMm > maxSnapDistanceMm
  ) {
    return {
      status: "out-of-threshold",
      canSnap: false,
      distanceMm: delta.currentDistanceMm,
      delta
    };
  }

  return {
    status: "ready",
    canSnap: true,
    distanceMm: delta.currentDistanceMm,
    delta
  };
};

export const applyConnectionPointSnap = (
  machines: PlacedMachine[],
  selection: ConnectionPointSnapSelection,
  movingPoint: MachineConnectionPoint,
  fixedPoint: MachineConnectionPoint
) => {
  const movingMachine = machines.find((machine) => machine.instanceId === selection.movingMachineId);
  const fixedMachine = machines.find((machine) => machine.instanceId === selection.fixedMachineId);
  if (!movingMachine || !fixedMachine) {
    return machines;
  }

  const delta = getConnectionPointSnapDelta(
    movingMachine,
    fixedMachine,
    movingPoint,
    fixedPoint,
    selection.gapMm
  );
  const movingPosition = getMachinePlanPositionMm(movingMachine);
  const nextPositionMm = {
    xMm: movingPosition.xMm + delta.deltaXMm,
    yMm: movingPosition.yMm + delta.deltaYMm
  };

  return machines.map((machine) =>
    machine.instanceId === movingMachine.instanceId
      ? {
          ...machine,
          positionMm: nextPositionMm,
          referencePoint: LAYOUT_REFERENCE_POINT,
          coordinateReferenceVersion: COORDINATE_REFERENCE_VERSION,
          position: {
            x: mmToMeters(nextPositionMm.xMm),
            z: mmToMeters(nextPositionMm.yMm)
          }
        }
      : machine
  );
};

export const evaluateConnectionPointSnapContext = ({
  selection,
  entities,
  activeGroupEditId = null
}: ConnectionPointSnapContextInput): ConnectionPointSnapContextEvaluation => {
  if (
    selection.ids.length !== 2
    || selection.ids.some((entityId) => !entityId.startsWith("machine:"))
  ) {
    return { available: false, reason: "explicit-selection-required" };
  }

  const machineEntityIds: readonly [string, string] = [selection.ids[0], selection.ids[1]];
  const entityById = new Map(entities.map((entity) => [entity.id, entity]));
  const firstMachine = entityById.get(machineEntityIds[0]);
  const secondMachine = entityById.get(machineEntityIds[1]);
  if (firstMachine?.type !== "machine" || secondMachine?.type !== "machine") {
    return { available: false, reason: "unresolved" };
  }
  const resolvedMachines: readonly [PlatformEntity, PlatformEntity] = [firstMachine, secondMachine];
  if (resolvedMachines.some((entity) => !entity.visible || !entity.selectable)) {
    return { available: false, reason: "machine-unavailable" };
  }

  if (!activeGroupEditId) {
    if (resolvedMachines.some((entity) => Boolean(entity.parentId))) {
      return { available: false, reason: "assembly-edit-required" };
    }
  } else {
    const activeGroupEntityId = `group:${activeGroupEditId}`;
    const activeGroup = entityById.get(activeGroupEntityId);
    if (
      activeGroup?.type !== "group"
      || resolvedMachines.some((entity) => entity.parentId !== activeGroupEntityId)
      || machineEntityIds.some((entityId) => !activeGroup.childrenIds.includes(entityId))
    ) {
      return { available: false, reason: "assembly-edit-required" };
    }
  }

  const movement = evaluateAtomicMovement(machineEntityIds, entities);
  if (!movement.allowed) {
    return {
      available: false,
      reason: movement.reason === "locked" ? "locked" : "machine-unavailable"
    };
  }

  return {
    available: true,
    machineEntityIds,
    machineIds: [
      machineEntityIds[0].slice("machine:".length),
      machineEntityIds[1].slice("machine:".length)
    ]
  };
};

export const evaluatePremiumConnectionPointSnapContext = ({
  selection,
  entities,
  machines,
  activeGroupEditId = null
}: PremiumConnectionPointSnapContextInput): PremiumConnectionPointSnapContextEvaluation => {
  const context = evaluateConnectionPointSnapContext({ selection, entities, activeGroupEditId });
  if (!context.available) {
    return context;
  }

  const selectedMachines = context.machineIds.flatMap((machineId) => {
    const machine = machines.find((candidate) => candidate.instanceId === machineId);
    return machine ? [machine] : [];
  });
  const productFlowPair = findProductFlowConnectionPointPair(selectedMachines);
  if (!productFlowPair) {
    return { available: false, reason: "no-product-flow-pair" };
  }

  return { ...context, productFlowPair };
};

export const evaluateConnectionPointSnapRuntimeAccess = ({
  selection,
  entities,
  activeGroupEditId = null,
  movingMachineId,
  fixedMachineId,
  movingPoint,
  fixedPoint,
  requireProductFlowPair = false
}: ConnectionPointSnapRuntimeAccessInput): ConnectionPointSnapRuntimeAccessEvaluation => {
  const movingEntityId = `machine:${movingMachineId}`;
  const fixedEntityId = `machine:${fixedMachineId}`;
  const context = evaluateConnectionPointSnapContext({ selection, entities, activeGroupEditId });
  if (!context.available) {
    return { allowed: false, reason: context.reason };
  }
  if (
    !context.machineEntityIds.includes(movingEntityId)
    || !context.machineEntityIds.includes(fixedEntityId)
    || movingEntityId === fixedEntityId
  ) {
    return { allowed: false, reason: "explicit-selection-required" };
  }
  if (requireProductFlowPair && !isProductFlowConnectionPointPair(movingPoint, fixedPoint)) {
    return { allowed: false, reason: "no-product-flow-pair" };
  }
  return { allowed: true };
};

export const executeGuardedConnectionPointSnap = (
  input: ConnectionPointSnapRuntimeAccessInput,
  mutate: () => void
): ConnectionPointSnapRuntimeAccessEvaluation => {
  const evaluation = evaluateConnectionPointSnapRuntimeAccess(input);
  if (evaluation.allowed) {
    mutate();
  }
  return evaluation;
};

export const getConnectionPointCompatibility = (
  movingMachine: PlacedMachine | null | undefined,
  fixedMachine: PlacedMachine | null | undefined,
  movingPoint: MachineConnectionPoint | null | undefined,
  fixedPoint: MachineConnectionPoint | null | undefined
): ConnectionPointCompatibility => {
  if (!movingMachine || !fixedMachine || !movingPoint || !fixedPoint) {
    return {
      level: "invalid",
      messages: ["Select a moving object point and a fixed object point."]
    };
  }

  const messages: string[] = [];
  let level: ConnectionPointCompatibility["level"] = "good";
  if (
    (movingPoint.type === "product-out" && fixedPoint.type === "product-in") ||
    (movingPoint.type === "product-in" && fixedPoint.type === "product-out")
  ) {
    messages.push(`${getConnectionPointTypeLabel(movingPoint.type)} -> ${getConnectionPointTypeLabel(fixedPoint.type)} is a good product-flow match.`);
  } else if (movingPoint.type === fixedPoint.type && productTypes.has(movingPoint.type)) {
    level = "warning";
    messages.push("Same connection type selected. Check direction.");
  } else {
    messages.push("Manual connection point snap is allowed for the selected point types.");
  }

  const movingDirection = getConnectionPointWorldDirection(movingMachine, movingPoint);
  const fixedDirection = getConnectionPointWorldDirection(fixedMachine, fixedPoint);
  if (directionDot(movingDirection, fixedDirection) >= 0) {
    level = "warning";
    messages.push("Directions are not facing each other.");
  }

  return { level, messages };
};

export const formatConnectionPointSnapSummary = (
  delta: ConnectionPointSnapDelta | null,
  gapMm: number
) => {
  if (!delta) {
    return "Select connection points to preview the planned move.";
  }

  return `Distance ${Math.round(delta.currentDistanceMm)} mm | Move X ${Math.round(delta.deltaXMm)} mm, Y ${Math.round(delta.deltaYMm)} mm | Gap ${Math.round(Math.max(0, gapMm || 0))} mm`;
};

