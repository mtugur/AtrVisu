import type { EntityId, SelectionSource, SelectionState } from "../contracts";

const normalizeSelectionIds = (ids: readonly unknown[]) => {
  const seenIds = new Set<EntityId>();
  const normalizedIds: EntityId[] = [];

  ids.forEach((id) => {
    if (typeof id !== "string") {
      return;
    }
    const normalizedId = id.trim();
    if (!normalizedId || seenIds.has(normalizedId)) {
      return;
    }
    seenIds.add(normalizedId);
    normalizedIds.push(normalizedId);
  });

  return normalizedIds;
};

export const getPrimarySelectionId = (ids: readonly string[]) => normalizeSelectionIds(ids)[0];

export const createSelectionStateFromIds = (
  ids: readonly string[],
  source: SelectionSource
): SelectionState => {
  const normalizedIds = normalizeSelectionIds(ids);
  const primaryId = normalizedIds[0];

  return {
    ids: normalizedIds,
    ...(primaryId ? { primaryId } : {}),
    source
  };
};

export const createSelectionStateFromUnknown = (
  input: unknown,
  source: SelectionSource
): SelectionState => {
  if (!Array.isArray(input)) {
    return createSelectionStateFromIds([], source);
  }

  return createSelectionStateFromIds(input.filter((id): id is string => typeof id === "string"), source);
};

