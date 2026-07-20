import type {
  EntityId,
  PlatformEntity,
  SelectionSource,
  SelectionState
} from "../contracts";
import { createSelectionStateFromIds } from "../adapters/selectionAdapter";

export type RuntimeSelectionFamily = "machine" | "civil" | "annotation";
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
};

const FAMILY_BY_ENTITY_TYPE: Readonly<Partial<Record<PlatformEntity["type"], RuntimeSelectionFamily>>> = {
  machine: "machine",
  civil: "civil",
  annotation: "annotation"
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
  if (family !== "machine" && family !== "civil" && family !== "annotation") {
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
  entities: readonly PlatformEntity[]
): SelectionState => {
  const current = reconcileRuntimeSelection(selection, entities, request.source);
  if (!request.targetId || request.mode === "clear") {
    return createEmptyRuntimeSelection(request.source);
  }

  const activeTargetIds = getActiveSelectionIds([request.targetId], entities);
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
  selection: SelectionState
): RuntimeSelectionProjection => {
  const selectedMachineIds: string[] = [];
  const selectedCivilReferenceIds: string[] = [];
  const selectedAnnotationIds: string[] = [];
  const selectedAlignableEntityIds: string[] = [];

  selection.ids.forEach((entityId) => {
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

  return {
    selectedMachineIds,
    primarySelectedMachineId: selectedMachineIds[0] ?? null,
    selectedCivilReferenceIds,
    selectedCivilReferenceId: selectedCivilReferenceIds[0] ?? null,
    selectedAnnotationId: selectedAnnotationIds[0] ?? null,
    selectedAlignableEntityIds
  };
};

export const getAtomicMovementEntityIds = (
  selection: SelectionState,
  requestedEntityIds: readonly EntityId[],
  includeCurrentSelection: boolean
) => {
  const requested = createSelectionStateFromIds(requestedEntityIds, selection.source).ids;
  if (
    includeCurrentSelection
    && requested.length > 0
    && requested.every((entityId) => selection.ids.includes(entityId))
  ) {
    return [...selection.ids];
  }
  return [...requested];
};

export const evaluateAtomicMovement = (
  entityIds: readonly EntityId[],
  entities: readonly PlatformEntity[]
): AtomicMovementEvaluation => {
  const normalizedIds = createSelectionStateFromIds(entityIds, "command").ids;
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
  const { selection, entities } = getSnapshot();
  return evaluateAtomicMovement(
    getAtomicMovementEntityIds(selection, [entityId], includeCurrentSelection),
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
