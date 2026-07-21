import type {
  EntityId,
  PlatformEntity,
  SelectionSource,
  SelectionState
} from "../contracts";
import { createSelectionStateFromIds } from "../adapters/selectionAdapter";

export type RuntimeSelectionFamily = "machine" | "civil" | "annotation" | "group";
export type RuntimeSelectionMode = "replace" | "toggle" | "clear";

export type RuntimeSelectionRequest = {
  targetId: EntityId | null;
  mode: RuntimeSelectionMode;
  source: SelectionSource;
};

export type RuntimeSelectionProjection = {
  selectedMachineIds: string[];
  primarySelectedMachineId: string | null;
  selectedCivilReferenceIds: string[];
  selectedCivilReferenceId: string | null;
  selectedAnnotationId: string | null;
  selectedGroupIds: string[];
  selectedGroupId: string | null;
  selectedAlignableEntityIds: string[];
};

export type AtomicMovementBlockReason =
  | "empty-selection"
  | "unresolved"
  | "hidden"
  | "non-selectable"
  | "locked";

export type AtomicMovementEvaluation =
  | { allowed: true; entityIds: readonly EntityId[] }
  | {
      allowed: false;
      entityIds: readonly EntityId[];
      blockedEntityId?: EntityId;
      reason: AtomicMovementBlockReason;
    };

export type AtomicSelectionMutationOptions = {
  entityIds: readonly EntityId[];
  entities: readonly PlatformEntity[];
  beforeMutation?: () => void;
  mutate: () => void;
};

export type RuntimeSelectionMovementSnapshot = {
  selection: SelectionState;
  entities: readonly PlatformEntity[];
  activeGroupEditId?: string | null;
};

const FAMILY_BY_ENTITY_TYPE: Readonly<Partial<Record<PlatformEntity["type"], RuntimeSelectionFamily>>> = {
  machine: "machine",
  civil: "civil",
  annotation: "annotation",
  group: "group"
};

export const parseRuntimeSelectionEntityId = (
  entityId: string
): { family: RuntimeSelectionFamily; sourceId: string } | null => {
  const separatorIndex = entityId.indexOf(":");
  if (separatorIndex <= 0 || separatorIndex === entityId.length - 1) {
    return null;
  }

  const family = entityId.slice(0, separatorIndex);
  const sourceId = entityId.slice(separatorIndex + 1);
  if (family !== "machine" && family !== "civil" && family !== "annotation" && family !== "group") {
    return null;
  }

  return { family, sourceId };
};

const getRuntimeEntityMap = (entities: readonly PlatformEntity[]) =>
  new Map(entities.map((entity) => [entity.id, entity]));

const isCanonicalEntityMatch = (entity: PlatformEntity) => {
  const parsedId = parseRuntimeSelectionEntityId(entity.id);
  return parsedId !== null && FAMILY_BY_ENTITY_TYPE[entity.type] === parsedId.family;
};

const getActiveSelectionIds = (
  ids: readonly EntityId[],
  entities: readonly PlatformEntity[]
) => {
  const entityById = getRuntimeEntityMap(entities);
  const normalized = createSelectionStateFromIds(ids, "command").ids.filter((id) => {
    const entity = entityById.get(id);
    return Boolean(entity && isCanonicalEntityMatch(entity) && entity.visible && entity.selectable);
  });
  const firstAnnotationId = normalized.find((id) => parseRuntimeSelectionEntityId(id)?.family === "annotation");

  return firstAnnotationId ? [firstAnnotationId] : normalized;
};

export const createEmptyRuntimeSelection = (
  source: SelectionSource = "command"
): SelectionState => createSelectionStateFromIds([], source);

export const replaceRuntimeSelection = (
  entityIds: readonly EntityId[],
  source: SelectionSource
): SelectionState => createSelectionStateFromIds(entityIds, source);

export const reconcileRuntimeSelection = (
  selection: SelectionState,
  entities: readonly PlatformEntity[],
  source: SelectionSource = selection.source
): SelectionState => createSelectionStateFromIds(
  getActiveSelectionIds(selection.ids, entities),
  source
);

export const applyRuntimeSelectionRequest = (
  selection: SelectionState,
  request: RuntimeSelectionRequest,
  entities: readonly PlatformEntity[],
  options: { activeGroupEditId?: string | null } = {}
): SelectionState => {
  const current = reconcileRuntimeSelection(selection, entities, request.source);
  if (!request.targetId || request.mode === "clear") {
    return createEmptyRuntimeSelection(request.source);
  }

  const resolvedTargetId = resolveRuntimeSelectionTargetId(
    request.targetId,
    entities,
    options.activeGroupEditId
  );
  const activeTargetIds = getActiveSelectionIds([resolvedTargetId], entities);
  const targetId = activeTargetIds[0];
  if (!targetId) {
    return request.mode === "replace" ? createEmptyRuntimeSelection(request.source) : current;
  }

  const targetFamily = parseRuntimeSelectionEntityId(targetId)?.family;
  const currentContainsAnnotation = current.ids.some(
    (id) => parseRuntimeSelectionEntityId(id)?.family === "annotation"
  );
  if (request.mode === "replace" || targetFamily === "annotation" || currentContainsAnnotation) {
    return createSelectionStateFromIds([targetId], request.source);
  }

  const nextIds = current.ids.includes(targetId)
    ? current.ids.filter((id) => id !== targetId)
    : [...current.ids, targetId];

  return createSelectionStateFromIds(nextIds, request.source);
};

export const projectRuntimeSelection = (
  selection: SelectionState,
  entities: readonly PlatformEntity[] = []
): RuntimeSelectionProjection => {
  const selectedMachineIds: string[] = [];
  const selectedCivilReferenceIds: string[] = [];
  const selectedAnnotationIds: string[] = [];
  const selectedGroupIds: string[] = [];
  const selectedAlignableEntityIds: string[] = [];
  const entityById = getRuntimeEntityMap(entities);
  const projectedIds: string[] = [];

  selection.ids.forEach((entityId) => {
    const entity = entityById.get(entityId);
    if (entity?.type === "group") {
      entity.childrenIds.forEach((childId) => {
        const child = entityById.get(childId);
        if (child && isCanonicalEntityMatch(child) && child.visible && child.selectable) {
          projectedIds.push(childId);
        }
      });
      return;
    }
    projectedIds.push(entityId);
  });

  createSelectionStateFromIds(projectedIds, selection.source).ids.forEach((entityId) => {
    const parsedId = parseRuntimeSelectionEntityId(entityId);
    if (!parsedId) {
      return;
    }
    if (parsedId.family === "machine") {
      selectedMachineIds.push(parsedId.sourceId);
      selectedAlignableEntityIds.push(entityId);
    } else if (parsedId.family === "civil") {
      selectedCivilReferenceIds.push(parsedId.sourceId);
      selectedAlignableEntityIds.push(entityId);
    } else {
      selectedAnnotationIds.push(parsedId.sourceId);
    }
  });

  selection.ids.forEach((entityId) => {
    const parsedId = parseRuntimeSelectionEntityId(entityId);
    if (parsedId?.family === "group") {
      selectedGroupIds.push(parsedId.sourceId);
    }
  });

  return {
    selectedMachineIds,
    primarySelectedMachineId: selectedMachineIds[0] ?? null,
    selectedCivilReferenceIds,
    selectedCivilReferenceId: selectedCivilReferenceIds[0] ?? null,
    selectedAnnotationId: selectedAnnotationIds[0] ?? null,
    selectedGroupIds,
    selectedGroupId: selectedGroupIds[0] ?? null,
    selectedAlignableEntityIds
  };
};

export const resolveRuntimeSelectionTargetId = (
  targetId: EntityId,
  entities: readonly PlatformEntity[],
  activeGroupEditId?: string | null
) => {
  const target = getRuntimeEntityMap(entities).get(targetId);
  const parentId = target?.parentId;
  if (!parentId) {
    return targetId;
  }
  const parsedParent = parseRuntimeSelectionEntityId(parentId);
  return parsedParent?.family === "group" && parsedParent.sourceId !== activeGroupEditId
    ? parentId
    : targetId;
};

export const getAtomicMovementEntityIds = (
  selection: SelectionState,
  requestedEntityIds: readonly EntityId[],
  includeCurrentSelection: boolean,
  entities: readonly PlatformEntity[] = [],
  activeGroupEditId?: string | null
) => {
  const requested = createSelectionStateFromIds(
    requestedEntityIds.map((entityId) => resolveRuntimeSelectionTargetId(entityId, entities, activeGroupEditId)),
    selection.source
  ).ids;
  if (
    includeCurrentSelection
    && requested.length > 0
    && requested.every((entityId) => selection.ids.includes(entityId))
  ) {
    return [...selection.ids];
  }
  return [...requested];
};

const expandAtomicMovementEntityIds = (
  entityIds: readonly EntityId[],
  entities: readonly PlatformEntity[]
) => {
  const entityById = getRuntimeEntityMap(entities);
  const expandedIds: EntityId[] = [];
  const append = (entityId: EntityId) => {
    if (!expandedIds.includes(entityId)) {
      expandedIds.push(entityId);
    }
  };

  createSelectionStateFromIds(entityIds, "command").ids.forEach((entityId) => {
    const entity = entityById.get(entityId);
    if (entity?.parentId) {
      append(entity.parentId);
    }
    append(entityId);
    if (entity?.type === "group") {
      entity.childrenIds.forEach(append);
    }
  });

  return expandedIds;
};

export const evaluateAtomicMovement = (
  entityIds: readonly EntityId[],
  entities: readonly PlatformEntity[]
): AtomicMovementEvaluation => {
  const normalizedIds = expandAtomicMovementEntityIds(entityIds, entities);
  if (normalizedIds.length === 0) {
    return { allowed: false, entityIds: normalizedIds, reason: "empty-selection" };
  }

  const entityById = getRuntimeEntityMap(entities);
  for (const entityId of normalizedIds) {
    const entity = entityById.get(entityId);
    if (!entity || !isCanonicalEntityMatch(entity)) {
      return { allowed: false, entityIds: normalizedIds, blockedEntityId: entityId, reason: "unresolved" };
    }
    if (!entity.visible) {
      return { allowed: false, entityIds: normalizedIds, blockedEntityId: entityId, reason: "hidden" };
    }
    if (!entity.selectable) {
      return { allowed: false, entityIds: normalizedIds, blockedEntityId: entityId, reason: "non-selectable" };
    }
    if (entity.locked) {
      return { allowed: false, entityIds: normalizedIds, blockedEntityId: entityId, reason: "locked" };
    }
  }

  return { allowed: true, entityIds: normalizedIds };
};

export const createRuntimeSelectionMovementPreflight = (
  getSnapshot: () => RuntimeSelectionMovementSnapshot
) => (entityId: EntityId, includeCurrentSelection: boolean) => {
  const { selection, entities, activeGroupEditId } = getSnapshot();
  return evaluateAtomicMovement(
    getAtomicMovementEntityIds(selection, [entityId], includeCurrentSelection, entities, activeGroupEditId),
    entities
  ).allowed;
};

export const executeAtomicSelectionMutation = ({
  entityIds,
  entities,
  beforeMutation,
  mutate
}: AtomicSelectionMutationOptions): AtomicMovementEvaluation => {
  const evaluation = evaluateAtomicMovement(entityIds, entities);
  if (!evaluation.allowed) {
    return evaluation;
  }

  beforeMutation?.();
  mutate();
  return evaluation;
};

export const areRuntimeSelectionsEqual = (
  first: SelectionState,
  second: SelectionState
) => first.primaryId === second.primaryId
  && first.source === second.source
  && first.ids.length === second.ids.length
  && first.ids.every((id, index) => id === second.ids[index]);
