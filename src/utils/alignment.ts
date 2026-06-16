import type {
  AlignmentAction,
  DistributionAction,
  EqualGapAction,
  FootprintAnchor,
  PlanBounds,
  PairAlignmentAction,
  PlanAxis
} from "../types/alignment";
import type { PlacedMachine } from "../types/machine";
import { COORDINATE_REFERENCE_VERSION, LAYOUT_REFERENCE_POINT } from "./coordinateReference";
import { getMachinePlanPositionMm } from "./placement";
import { mmToMeters } from "./units";
import { getObjectPlanBounds, getSelectionPlanBounds } from "./selectionBounds";

const selectedSet = (ids: string[]) => new Set(ids);

export type AlignableEntityKind = "machine" | "civil";

export type AlignableEntity = {
  id: string;
  kind: AlignableEntityKind;
  label: string;
  bounds: PlanBounds;
  positionMm: { xMm: number; yMm: number };
  locked?: boolean;
  hidden?: boolean;
};

export type AlignableEntityPositionUpdate = {
  id: string;
  kind: AlignableEntityKind;
  xMm: number;
  yMm: number;
};

export const getAlignableEntityKey = (kind: AlignableEntityKind, id: string) => `${kind}:${id}`;

const selectedEntitySet = (ids: string[]) => new Set(ids);

const getEntityAxisCenter = (entity: AlignableEntity, axis: PlanAxis) =>
  axis === "x" ? entity.bounds.centerXMm : entity.bounds.centerYMm;

const getEntityAxisSize = (entity: AlignableEntity, axis: PlanAxis) =>
  axis === "x" ? entity.bounds.widthMm : entity.bounds.depthMm;

const getEntityAxisMin = (entity: AlignableEntity, axis: PlanAxis) =>
  axis === "x" ? entity.bounds.minXMm : entity.bounds.minYMm;

const getEntityAxisMax = (entity: AlignableEntity, axis: PlanAxis) =>
  axis === "x" ? entity.bounds.maxXMm : entity.bounds.maxYMm;

const entityUpdate = (entity: AlignableEntity, xMm: number, yMm: number): AlignableEntityPositionUpdate => ({
  id: entity.id,
  kind: entity.kind,
  xMm,
  yMm
});

const moveEntityAxisCenter = (entity: AlignableEntity, axis: PlanAxis, centerMm: number) => {
  const deltaMm = centerMm - getEntityAxisCenter(entity, axis);
  return entityUpdate(
    entity,
    axis === "x" ? entity.positionMm.xMm + deltaMm : entity.positionMm.xMm,
    axis === "y" ? entity.positionMm.yMm + deltaMm : entity.positionMm.yMm
  );
};

const moveEntityAxisMin = (entity: AlignableEntity, axis: PlanAxis, minMm: number) => {
  const deltaMm = minMm - getEntityAxisMin(entity, axis);
  return entityUpdate(
    entity,
    axis === "x" ? entity.positionMm.xMm + deltaMm : entity.positionMm.xMm,
    axis === "y" ? entity.positionMm.yMm + deltaMm : entity.positionMm.yMm
  );
};

const moveEntityAxisMax = (entity: AlignableEntity, axis: PlanAxis, maxMm: number) => {
  const deltaMm = maxMm - getEntityAxisMax(entity, axis);
  return entityUpdate(
    entity,
    axis === "x" ? entity.positionMm.xMm + deltaMm : entity.positionMm.xMm,
    axis === "y" ? entity.positionMm.yMm + deltaMm : entity.positionMm.yMm
  );
};

const getSelectedAlignableEntities = (entities: AlignableEntity[], selectedEntityIds: string[]) => {
  const byKey = new Map(entities.map((entity) => [getAlignableEntityKey(entity.kind, entity.id), entity]));
  return selectedEntityIds.flatMap((key) => {
    const entity = byKey.get(key);
    return entity && !entity.hidden ? [entity] : [];
  });
};

const getEntitiesPlanBounds = (entities: AlignableEntity[]): PlanBounds | null => {
  if (entities.length === 0) {
    return null;
  }

  const minXMm = Math.min(...entities.map((entity) => entity.bounds.minXMm));
  const maxXMm = Math.max(...entities.map((entity) => entity.bounds.maxXMm));
  const minYMm = Math.min(...entities.map((entity) => entity.bounds.minYMm));
  const maxYMm = Math.max(...entities.map((entity) => entity.bounds.maxYMm));

  return {
    centerXMm: (minXMm + maxXMm) / 2,
    centerYMm: (minYMm + maxYMm) / 2,
    minXMm,
    maxXMm,
    minYMm,
    maxYMm,
    widthMm: maxXMm - minXMm,
    depthMm: maxYMm - minYMm
  };
};

const getEntityFootprintAnchorPoint = (entity: AlignableEntity, anchor: FootprintAnchor) => {
  const bounds = entity.bounds;

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

export const selectionHasLockedAlignableEntities = (
  entities: AlignableEntity[],
  selectedEntityIds: string[]
) => getSelectedAlignableEntities(entities, selectedEntityIds).some((entity) => entity.locked);

export const alignEntitiesToAnchor = (
  entities: AlignableEntity[],
  selectedEntityIds: string[],
  primarySelectedEntityId: string | null,
  action: AlignmentAction
): AlignableEntityPositionUpdate[] => {
  const selectedEntities = getSelectedAlignableEntities(entities, selectedEntityIds);
  if (selectedEntities.length < 2 || selectedEntities.some((entity) => entity.locked)) {
    return [];
  }

  const anchorEntity = primarySelectedEntityId
    ? selectedEntities.find((entity) => getAlignableEntityKey(entity.kind, entity.id) === primarySelectedEntityId)
    : undefined;
  const anchorBounds = anchorEntity ? anchorEntity.bounds : getEntitiesPlanBounds(selectedEntities);
  if (!anchorBounds) {
    return [];
  }

  return selectedEntities.flatMap((entity) => {
    if (anchorEntity && getAlignableEntityKey(entity.kind, entity.id) === getAlignableEntityKey(anchorEntity.kind, anchorEntity.id)) {
      return [];
    }

    switch (action) {
      case "left":
        return [moveEntityAxisMin(entity, "x", anchorBounds.minXMm)];
      case "right":
        return [moveEntityAxisMax(entity, "x", anchorBounds.maxXMm)];
      case "front":
        return [moveEntityAxisMin(entity, "y", anchorBounds.minYMm)];
      case "back":
        return [moveEntityAxisMax(entity, "y", anchorBounds.maxYMm)];
      case "centerX":
        return [moveEntityAxisCenter(entity, "x", anchorBounds.centerXMm)];
      case "centerY":
        return [moveEntityAxisCenter(entity, "y", anchorBounds.centerYMm)];
      default:
        return [];
    }
  });
};

export const distributeEntitiesByCenter = (
  entities: AlignableEntity[],
  selectedEntityIds: string[],
  action: DistributionAction
): AlignableEntityPositionUpdate[] => {
  const selectedEntities = getSelectedAlignableEntities(entities, selectedEntityIds);
  if (selectedEntities.length < 3 || selectedEntities.some((entity) => entity.locked)) {
    return [];
  }

  const axis: PlanAxis = action === "horizontal" ? "x" : "y";
  const sorted = [...selectedEntities].sort((a, b) => getEntityAxisCenter(a, axis) - getEntityAxisCenter(b, axis));
  const first = sorted[0];
  const last = sorted[sorted.length - 1];
  const step = (getEntityAxisCenter(last, axis) - getEntityAxisCenter(first, axis)) / (sorted.length - 1);

  return sorted.map((entity, index) => moveEntityAxisCenter(entity, axis, getEntityAxisCenter(first, axis) + step * index));
};

export const equalizeEntityGaps = (
  entities: AlignableEntity[],
  selectedEntityIds: string[],
  action: EqualGapAction
): AlignableEntityPositionUpdate[] => {
  const selectedEntities = getSelectedAlignableEntities(entities, selectedEntityIds);
  if (selectedEntities.length < 3 || selectedEntities.some((entity) => entity.locked)) {
    return [];
  }

  const axis: PlanAxis = action === "gapX" ? "x" : "y";
  const sorted = [...selectedEntities].sort((a, b) => getEntityAxisMin(a, axis) - getEntityAxisMin(b, axis));
  const span = getEntityAxisMax(sorted[sorted.length - 1], axis) - getEntityAxisMin(sorted[0], axis);
  const occupied = sorted.reduce((sum, entity) => sum + getEntityAxisSize(entity, axis), 0);
  const gap = (span - occupied) / (sorted.length - 1);
  let cursor = getEntityAxisMin(sorted[0], axis);

  return sorted.map((entity) => {
    const update = moveEntityAxisMin(entity, axis, cursor);
    cursor += getEntityAxisSize(entity, axis) + gap;
    return update;
  });
};

export const applyEntityPairAlignment = (
  entities: AlignableEntity[],
  selectedEntityIds: string[],
  primarySelectedEntityId: string | null,
  action: PairAlignmentAction,
  gapMm = 0
): AlignableEntityPositionUpdate[] => {
  const selectedEntities = getSelectedAlignableEntities(entities, selectedEntityIds);
  if (selectedEntities.length !== 2 || selectedEntities.some((entity) => entity.locked)) {
    return [];
  }

  const moving = selectedEntities.find((entity) => getAlignableEntityKey(entity.kind, entity.id) === primarySelectedEntityId) ?? selectedEntities[0];
  const fixed = selectedEntities.find((entity) => getAlignableEntityKey(entity.kind, entity.id) !== getAlignableEntityKey(moving.kind, moving.id));
  if (!fixed) {
    return [];
  }

  switch (action) {
    case "leftToRight":
    case "gapX":
      return [moveEntityAxisMin(moving, "x", getEntityAxisMax(fixed, "x") + gapMm)];
    case "rightToLeft":
      return [moveEntityAxisMax(moving, "x", getEntityAxisMin(fixed, "x") - gapMm)];
    case "frontToBack":
    case "gapY":
      return [moveEntityAxisMin(moving, "y", getEntityAxisMax(fixed, "y") + gapMm)];
    case "backToFront":
      return [moveEntityAxisMax(moving, "y", getEntityAxisMin(fixed, "y") - gapMm)];
    case "centerX":
      return [moveEntityAxisCenter(moving, "x", getEntityAxisCenter(fixed, "x"))];
    case "centerY":
      return [moveEntityAxisCenter(moving, "y", getEntityAxisCenter(fixed, "y"))];
    default:
      return [];
  }
};

export const snapPrimaryEntityAnchorToSecondaryAnchor = (
  entities: AlignableEntity[],
  selectedEntityIds: string[],
  primarySelectedEntityId: string | null,
  primaryAnchor: FootprintAnchor,
  secondaryAnchor: FootprintAnchor
): AlignableEntityPositionUpdate[] => {
  const selectedEntities = getSelectedAlignableEntities(entities, selectedEntityIds);
  if (selectedEntities.length !== 2 || selectedEntities.some((entity) => entity.locked)) {
    return [];
  }

  const moving = selectedEntities.find((entity) => getAlignableEntityKey(entity.kind, entity.id) === primarySelectedEntityId) ?? selectedEntities[0];
  const fixed = selectedEntities.find((entity) => getAlignableEntityKey(entity.kind, entity.id) !== getAlignableEntityKey(moving.kind, moving.id));
  if (!fixed) {
    return [];
  }

  const movingAnchor = getEntityFootprintAnchorPoint(moving, primaryAnchor);
  const fixedAnchor = getEntityFootprintAnchorPoint(fixed, secondaryAnchor);
  return [entityUpdate(
    moving,
    moving.positionMm.xMm + fixedAnchor.xMm - movingAnchor.xMm,
    moving.positionMm.yMm + fixedAnchor.yMm - movingAnchor.yMm
  )];
};

const withPlanPositionMm = (machine: PlacedMachine, xMm: number, yMm: number): PlacedMachine => ({
  ...machine,
  positionMm: { xMm, yMm },
  referencePoint: LAYOUT_REFERENCE_POINT,
  coordinateReferenceVersion: COORDINATE_REFERENCE_VERSION,
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
  const bounds = getObjectPlanBounds(machine);
  const deltaMm = centerMm - (axis === "x" ? bounds.centerXMm : bounds.centerYMm);
  return withPlanPositionMm(
    machine,
    axis === "x" ? position.xMm + deltaMm : position.xMm,
    axis === "y" ? position.yMm + deltaMm : position.yMm
  );
};

const moveAxisMin = (machine: PlacedMachine, axis: PlanAxis, minMm: number) => {
  const position = getMachinePlanPositionMm(machine);
  const deltaMm = minMm - getAxisMin(machine, axis);
  return withPlanPositionMm(
    machine,
    axis === "x" ? position.xMm + deltaMm : position.xMm,
    axis === "y" ? position.yMm + deltaMm : position.yMm
  );
};

const moveAxisMax = (machine: PlacedMachine, axis: PlanAxis, maxMm: number) => {
  const position = getMachinePlanPositionMm(machine);
  const deltaMm = maxMm - getAxisMax(machine, axis);
  return withPlanPositionMm(
    machine,
    axis === "x" ? position.xMm + deltaMm : position.xMm,
    axis === "y" ? position.yMm + deltaMm : position.yMm
  );
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
  const targetMins = new Map<string, number>();

  sorted.forEach((machine) => {
    const size = getAxisSize(machine, axis);
    targetMins.set(machine.instanceId, cursor);
    cursor += size + gap;
  });

  return machines.map((machine) => {
    const targetMin = targetMins.get(machine.instanceId);
    return targetMin === undefined ? machine : moveAxisMin(machine, axis, targetMin);
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
