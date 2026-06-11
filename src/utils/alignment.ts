import type {
  AlignmentAction,
  DistributionAction,
  EqualGapAction,
  FootprintAnchor,
  PairAlignmentAction,
  PlanAxis
} from "../types/alignment";
import type { PlacedMachine } from "../types/machine";
import { getMachinePlanPositionMm } from "./placement";
import { mmToMeters } from "./units";
import { getObjectPlanBounds, getSelectionPlanBounds } from "./selectionBounds";

const selectedSet = (ids: string[]) => new Set(ids);

const withPlanPositionMm = (machine: PlacedMachine, xMm: number, yMm: number): PlacedMachine => ({
  ...machine,
  positionMm: { xMm, yMm },
  position: {
    x: mmToMeters(xMm),
    z: mmToMeters(yMm)
  }
});

const getAxisCenter = (machine: PlacedMachine, axis: PlanAxis) => {
  const bounds = getObjectPlanBounds(machine);
  return axis === "x" ? bounds.centerXMm : bounds.centerYMm;
};

const getAxisSize = (machine: PlacedMachine, axis: PlanAxis) => {
  const bounds = getObjectPlanBounds(machine);
  return axis === "x" ? bounds.widthMm : bounds.depthMm;
};

const getAxisMin = (machine: PlacedMachine, axis: PlanAxis) => {
  const bounds = getObjectPlanBounds(machine);
  return axis === "x" ? bounds.minXMm : bounds.minYMm;
};

const getAxisMax = (machine: PlacedMachine, axis: PlanAxis) => {
  const bounds = getObjectPlanBounds(machine);
  return axis === "x" ? bounds.maxXMm : bounds.maxYMm;
};

const moveAxisCenter = (machine: PlacedMachine, axis: PlanAxis, centerMm: number) => {
  const position = getMachinePlanPositionMm(machine);
  return withPlanPositionMm(
    machine,
    axis === "x" ? centerMm : position.xMm,
    axis === "y" ? centerMm : position.yMm
  );
};

const moveAxisMin = (machine: PlacedMachine, axis: PlanAxis, minMm: number) => {
  return moveAxisCenter(machine, axis, minMm + getAxisSize(machine, axis) / 2);
};

const moveAxisMax = (machine: PlacedMachine, axis: PlanAxis, maxMm: number) => {
  return moveAxisCenter(machine, axis, maxMm - getAxisSize(machine, axis) / 2);
};

export const getFootprintAnchorPoint = (machine: PlacedMachine, anchor: FootprintAnchor) => {
  const bounds = getObjectPlanBounds(machine);

  switch (anchor) {
    case "leftCenter":
      return { xMm: bounds.minXMm, yMm: bounds.centerYMm };
    case "rightCenter":
      return { xMm: bounds.maxXMm, yMm: bounds.centerYMm };
    case "frontCenter":
      return { xMm: bounds.centerXMm, yMm: bounds.minYMm };
    case "backCenter":
      return { xMm: bounds.centerXMm, yMm: bounds.maxYMm };
    case "frontLeft":
      return { xMm: bounds.minXMm, yMm: bounds.minYMm };
    case "frontRight":
      return { xMm: bounds.maxXMm, yMm: bounds.minYMm };
    case "backLeft":
      return { xMm: bounds.minXMm, yMm: bounds.maxYMm };
    case "backRight":
      return { xMm: bounds.maxXMm, yMm: bounds.maxYMm };
    case "center":
    default:
      return { xMm: bounds.centerXMm, yMm: bounds.centerYMm };
  }
};

export const moveObjectsByDelta = (
  machines: PlacedMachine[],
  selectedObjectIds: string[],
  deltaXMm: number,
  deltaYMm: number
) => {
  const ids = selectedSet(selectedObjectIds);

  return machines.map((machine) => {
    if (!ids.has(machine.instanceId)) {
      return machine;
    }

    const position = getMachinePlanPositionMm(machine);
    return withPlanPositionMm(machine, position.xMm + deltaXMm, position.yMm + deltaYMm);
  });
};

export const applyMachinePositionUpdates = (
  machines: PlacedMachine[],
  updates: Array<{ instanceId: string; xMm: number; yMm: number }>
) => {
  const updateMap = new Map(updates.map((update) => [update.instanceId, update]));

  return machines.map((machine) => {
    const update = updateMap.get(machine.instanceId);
    return update ? withPlanPositionMm(machine, update.xMm, update.yMm) : machine;
  });
};

export const alignObjectsToAnchor = (
  machines: PlacedMachine[],
  selectedObjectIds: string[],
  primarySelectedObjectId: string | null,
  action: AlignmentAction
) => {
  if (selectedObjectIds.length < 2) {
    return machines;
  }

  const ids = selectedSet(selectedObjectIds);
  const selectedMachines = machines.filter((machine) => ids.has(machine.instanceId));
  const anchorMachine = primarySelectedObjectId
    ? selectedMachines.find((machine) => machine.instanceId === primarySelectedObjectId)
    : undefined;
  const anchorBounds = anchorMachine ? getObjectPlanBounds(anchorMachine) : getSelectionPlanBounds(selectedMachines);

  if (!anchorBounds) {
    return machines;
  }

  return machines.map((machine) => {
    if (!ids.has(machine.instanceId) || machine.instanceId === anchorMachine?.instanceId) {
      return machine;
    }

    switch (action) {
      case "left":
        return moveAxisMin(machine, "x", anchorBounds.minXMm);
      case "right":
        return moveAxisMax(machine, "x", anchorBounds.maxXMm);
      case "front":
        return moveAxisMin(machine, "y", anchorBounds.minYMm);
      case "back":
        return moveAxisMax(machine, "y", anchorBounds.maxYMm);
      case "centerX":
        return moveAxisCenter(machine, "x", anchorBounds.centerXMm);
      case "centerY":
        return moveAxisCenter(machine, "y", anchorBounds.centerYMm);
      default:
        return machine;
    }
  });
};

export const distributeObjectsByCenter = (
  machines: PlacedMachine[],
  selectedObjectIds: string[],
  action: DistributionAction
) => {
  if (selectedObjectIds.length < 3) {
    return machines;
  }

  const axis: PlanAxis = action === "horizontal" ? "x" : "y";
  const ids = selectedSet(selectedObjectIds);
  const sorted = machines
    .filter((machine) => ids.has(machine.instanceId))
    .sort((a, b) => getAxisCenter(a, axis) - getAxisCenter(b, axis));
  const first = sorted[0];
  const last = sorted[sorted.length - 1];
  const step = (getAxisCenter(last, axis) - getAxisCenter(first, axis)) / (sorted.length - 1);
  const centers = new Map(sorted.map((machine, index) => [machine.instanceId, getAxisCenter(first, axis) + step * index]));

  return machines.map((machine) => {
    const center = centers.get(machine.instanceId);
    return center === undefined ? machine : moveAxisCenter(machine, axis, center);
  });
};

export const equalizeGaps = (
  machines: PlacedMachine[],
  selectedObjectIds: string[],
  action: EqualGapAction
) => {
  if (selectedObjectIds.length < 3) {
    return machines;
  }

  const axis: PlanAxis = action === "gapX" ? "x" : "y";
  const ids = selectedSet(selectedObjectIds);
  const sorted = machines
    .filter((machine) => ids.has(machine.instanceId))
    .sort((a, b) => getAxisMin(a, axis) - getAxisMin(b, axis));
  const span = getAxisMax(sorted[sorted.length - 1], axis) - getAxisMin(sorted[0], axis);
  const occupied = sorted.reduce((sum, machine) => sum + getAxisSize(machine, axis), 0);
  const gap = (span - occupied) / (sorted.length - 1);
  let cursor = getAxisMin(sorted[0], axis);
  const centers = new Map<string, number>();

  sorted.forEach((machine) => {
    const size = getAxisSize(machine, axis);
    centers.set(machine.instanceId, cursor + size / 2);
    cursor += size + gap;
  });

  return machines.map((machine) => {
    const center = centers.get(machine.instanceId);
    return center === undefined ? machine : moveAxisCenter(machine, axis, center);
  });
};

export const applyPairAlignment = (
  machines: PlacedMachine[],
  selectedObjectIds: string[],
  primarySelectedObjectId: string | null,
  action: PairAlignmentAction,
  gapMm = 0
) => {
  if (selectedObjectIds.length !== 2) {
    return machines;
  }

  const ids = selectedSet(selectedObjectIds);
  const pair = machines.filter((machine) => ids.has(machine.instanceId));
  const moving = pair.find((machine) => machine.instanceId === primarySelectedObjectId) ?? pair[0];
  const fixed = pair.find((machine) => machine.instanceId !== moving.instanceId);

  if (!fixed) {
    return machines;
  }

  return machines.map((machine) => {
    if (machine.instanceId !== moving.instanceId) {
      return machine;
    }

    switch (action) {
      case "leftToRight":
      case "gapX":
        return moveAxisMin(machine, "x", getAxisMax(fixed, "x") + gapMm);
      case "rightToLeft":
        return moveAxisMax(machine, "x", getAxisMin(fixed, "x") - gapMm);
      case "frontToBack":
      case "gapY":
        return moveAxisMin(machine, "y", getAxisMax(fixed, "y") + gapMm);
      case "backToFront":
        return moveAxisMax(machine, "y", getAxisMin(fixed, "y") - gapMm);
      case "centerX":
        return moveAxisCenter(machine, "x", getAxisCenter(fixed, "x"));
      case "centerY":
        return moveAxisCenter(machine, "y", getAxisCenter(fixed, "y"));
      default:
        return machine;
    }
  });
};

export const snapPrimaryAnchorToSecondaryAnchor = (
  machines: PlacedMachine[],
  selectedObjectIds: string[],
  primarySelectedObjectId: string | null,
  primaryAnchor: FootprintAnchor,
  secondaryAnchor: FootprintAnchor
) => {
  if (selectedObjectIds.length !== 2) {
    return machines;
  }

  const ids = selectedSet(selectedObjectIds);
  const pair = machines.filter((machine) => ids.has(machine.instanceId));
  const moving = pair.find((machine) => machine.instanceId === primarySelectedObjectId) ?? pair[0];
  const fixed = pair.find((machine) => machine.instanceId !== moving.instanceId);

  if (!fixed) {
    return machines;
  }

  const movingAnchor = getFootprintAnchorPoint(moving, primaryAnchor);
  const fixedAnchor = getFootprintAnchorPoint(fixed, secondaryAnchor);
  const movingPosition = getMachinePlanPositionMm(moving);
  const deltaXMm = fixedAnchor.xMm - movingAnchor.xMm;
  const deltaYMm = fixedAnchor.yMm - movingAnchor.yMm;

  return machines.map((machine) =>
    machine.instanceId === moving.instanceId
      ? withPlanPositionMm(machine, movingPosition.xMm + deltaXMm, movingPosition.yMm + deltaYMm)
      : machine
  );
};
