import type { ObjectGroup } from "../types/groups";
import type { LayoutLayer } from "../types/layers";
import type { PlacedMachine } from "../types/machine";
import { getLayerId, isLayerVisible } from "./layers";

const nowIso = () => new Date().toISOString();

const uniqueStrings = (values: unknown): string[] =>
  Array.isArray(values)
    ? [...new Set(values.filter((value): value is string => typeof value === "string" && Boolean(value.trim())).map((value) => value.trim()))]
    : [];

const normalizeGroup = (value: unknown, index: number): ObjectGroup | null => {
  if (!value || typeof value !== "object") {
    return null;
  }
  const candidate = value as Partial<ObjectGroup>;
  const id = typeof candidate.id === "string" && candidate.id.trim() ? candidate.id.trim() : `group-${index + 1}`;
  const name = typeof candidate.name === "string" && candidate.name.trim() ? candidate.name.trim() : "";
  if (!name) {
    return null;
  }
  const timestamp = typeof candidate.updatedAt === "string" ? candidate.updatedAt : nowIso();
  return {
    id,
    name,
    description: typeof candidate.description === "string" ? candidate.description : "",
    objectIds: uniqueStrings(candidate.objectIds),
    annotationIds: uniqueStrings(candidate.annotationIds),
    layerId: typeof candidate.layerId === "string" ? candidate.layerId : undefined,
    collapsed: Boolean(candidate.collapsed),
    createdAt: typeof candidate.createdAt === "string" ? candidate.createdAt : timestamp,
    updatedAt: timestamp
  };
};

export const createGroupId = () => `group-${Date.now()}-${Math.round(Math.random() * 10000)}`;

export const normalizeGroups = (
  groups: unknown,
  machines: PlacedMachine[] = [],
  layers: LayoutLayer[] = []
): ObjectGroup[] => {
  const machineIds = new Set(machines.map((machine) => machine.instanceId));
  const claimedObjectIds = new Set<string>();
  const normalized = Array.isArray(groups)
    ? groups.flatMap((group, index) => {
        const normalizedGroup = normalizeGroup(group, index);
        return normalizedGroup ? [normalizedGroup] : [];
      })
    : [];

  const byId = new Map<string, ObjectGroup>();
  normalized.forEach((group) => {
    if (byId.has(group.id)) {
      return;
    }
    const objectIds = group.objectIds.filter((objectId) => {
      if ((machineIds.size > 0 && !machineIds.has(objectId)) || claimedObjectIds.has(objectId)) {
        return false;
      }
      claimedObjectIds.add(objectId);
      return true;
    });
    byId.set(group.id, {
      ...group,
      objectIds,
      layerId: group.layerId && layers.length > 0 ? getLayerId(group.layerId, layers) : group.layerId
    });
  });
  return [...byId.values()];
};

export const createObjectGroup = (name: string, objectIds: string[], timestamp = nowIso()): ObjectGroup => {
  const trimmedName = name.trim();
  if (!trimmedName) {
    throw new Error("Group name is required.");
  }
  return {
    id: createGroupId(),
    name: trimmedName,
    objectIds: [...new Set(objectIds)],
    annotationIds: [],
    collapsed: false,
    createdAt: timestamp,
    updatedAt: timestamp
  };
};

export const removeObjectsFromGroups = (groups: ObjectGroup[], objectIds: Iterable<string>) => {
  const ids = new Set(objectIds);
  return groups.map((group) => ({
    ...group,
    objectIds: group.objectIds.filter((objectId) => !ids.has(objectId)),
    updatedAt: group.objectIds.some((objectId) => ids.has(objectId)) ? nowIso() : group.updatedAt
  }));
};

export const addObjectsToGroup = (groups: ObjectGroup[], groupId: string, objectIds: string[]) => {
  const ids = [...new Set(objectIds)];
  return groups.map((group) =>
    group.id === groupId
      ? { ...group, objectIds: [...new Set([...group.objectIds, ...ids])], updatedAt: nowIso() }
      : { ...group, objectIds: group.objectIds.filter((objectId) => !ids.includes(objectId)) }
  );
};

export const removeObjectsFromGroup = (groups: ObjectGroup[], groupId: string, objectIds: string[]) => {
  const ids = new Set(objectIds);
  return groups.map((group) =>
    group.id === groupId
      ? { ...group, objectIds: group.objectIds.filter((objectId) => !ids.has(objectId)), updatedAt: nowIso() }
      : group
  );
};

export const getVisibleGroupObjectIds = (
  group: ObjectGroup,
  machines: PlacedMachine[],
  layers: LayoutLayer[]
) => {
  const machinesById = new Map(machines.map((machine) => [machine.instanceId, machine]));
  return group.objectIds.filter((objectId) => {
    const machine = machinesById.get(objectId);
    return machine ? isLayerVisible(machine.layerId, layers) : false;
  });
};
