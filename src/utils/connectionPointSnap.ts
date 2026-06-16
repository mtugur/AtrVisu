import type {
  AtaraConnectionDirection,
  AtaraConnectionPointType,
  MachineConnectionPoint
} from "../types/ataraMachineData";
import type { PlacedMachine } from "../types/machine";
import {
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

const directionVectors: Record<AtaraConnectionDirection, { xMm: number; yMm: number; zMm: number }> = {
  "x+": { xMm: 1, yMm: 0, zMm: 0 },
  "x-": { xMm: -1, yMm: 0, zMm: 0 },
  "y+": { xMm: 0, yMm: 1, zMm: 0 },
  "y-": { xMm: 0, yMm: -1, zMm: 0 },
  "z+": { xMm: 0, yMm: 0, zMm: 1 },
  "z-": { xMm: 0, yMm: 0, zMm: -1 }
};

const productTypes = new Set<AtaraConnectionPointType>(["product-in", "product-out"]);

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

