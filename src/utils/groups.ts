import type { ObjectGroup } from "../types/groups";
import type { CivilReferenceItem } from "../types/civil";
import type { LayoutLayer } from "../types/layers";
import type { PlacedMachine } from "../types/machine";
import { getAlignableEntityKey } from "./alignment";
import { getLayerId, isLayerVisible } from "./layers";

const nowIso = () => new Date().toISOString();

const uniqueStrings = (values: unknown): string[] =>
  Array.isArray(values)
    ? [...new Set(values.filter((value): value is string => typeof value === "string" && Boolean(value.trim())).map((value) => value.trim()))]
    : [];

export const getCanonicalGroupMemberEntityId = (objectId: string) => {
  const trimmed = objectId.trim();
  if (!trimmed) {
    return null;
  }
  if (trimmed.startsWith("civil:")) {
    return trimmed.length > "civil:".length ? trimmed : null;
  }
  if (trimmed.startsWith("group:") || trimmed.startsWith("annotation:")) {
    return null;
  }
  const machineId = trimmed.replace(/^(object|machine):/, "");
  return machineId ? getAlignableEntityKey("machine", machineId) : null;
};

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
  _machines: PlacedMachine[] = [],
  layers: LayoutLayer[] = [],
  _civilReferences: CivilReferenceItem[] = []
): ObjectGroup[] => {
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
    const objectIds = group.objectIds.flatMap((objectId) => {
      const entityId = getCanonicalGroupMemberEntityId(objectId);
      if (!entityId) {
        return [];
      }
      if (claimedObjectIds.has(entityId)) {
        return [];
      }
      claimedObjectIds.add(entityId);
      return [entityId];
    });
    if (objectIds.length === 0) {
      return;
    }
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
    objectIds: [...new Set(objectIds.flatMap((objectId) => {
      const entityId = getCanonicalGroupMemberEntityId(objectId);
      return entityId ? [entityId] : [];
    }))],
    annotationIds: [],
    collapsed: false,
    createdAt: timestamp,
    updatedAt: timestamp
  };
};

export const removeObjectsFromGroups = (groups: ObjectGroup[], objectIds: Iterable<string>) => {
  const ids = new Set([...objectIds].flatMap((objectId) => {
    const entityId = getCanonicalGroupMemberEntityId(objectId);
    return entityId ? [entityId] : [];
  }));
  return groups.map((group) => ({
    ...group,
    objectIds: group.objectIds.filter((objectId) => {
      const entityId = getCanonicalGroupMemberEntityId(objectId);
      return !entityId || !ids.has(entityId);
    }),
    updatedAt: group.objectIds.some((objectId) => {
      const entityId = getCanonicalGroupMemberEntityId(objectId);
      return Boolean(entityId && ids.has(entityId));
    }) ? nowIso() : group.updatedAt
  }));
};

export const addObjectsToGroup = (groups: ObjectGroup[], groupId: string, objectIds: string[]) => {
  const ids = [...new Set(objectIds.flatMap((objectId) => {
    const entityId = getCanonicalGroupMemberEntityId(objectId);
    return entityId ? [entityId] : [];
  }))];
  if (ids.length === 0 || !groups.some((group) => group.id === groupId)) {
    return groups;
  }

  let changed = false;
  const updatedAt = nowIso();
  const nextGroups = groups.map((group) => {
    const canonicalObjectIds = group.objectIds.flatMap((objectId) => {
      const entityId = getCanonicalGroupMemberEntityId(objectId);
      return entityId ? [entityId] : [];
    });
    const nextObjectIds = group.id === groupId
      ? [...new Set([...canonicalObjectIds, ...ids])]
      : canonicalObjectIds.filter((entityId) => !ids.includes(entityId));
    const groupChanged = nextObjectIds.length !== canonicalObjectIds.length
      || nextObjectIds.some((entityId, index) => entityId !== canonicalObjectIds[index]);
    if (!groupChanged) {
      return group;
    }
    changed = true;
    return {
      ...group,
      objectIds: nextObjectIds,
      updatedAt: group.id === groupId ? updatedAt : group.updatedAt
    };
  });

  if (!changed) {
    return groups;
  }
  return nextGroups.filter((group) => group.id === groupId || group.objectIds.length > 0);
};

export type RemoveObjectsFromGroupResult = {
  groups: ObjectGroup[];
  removedObjectIds: string[];
  removedGroup: boolean;
};

export const removeObjectsFromGroupWithResult = (
  groups: ObjectGroup[],
  groupId: string,
  objectIds: string[]
): RemoveObjectsFromGroupResult | null => {
  const ids = new Set(objectIds.flatMap((objectId) => {
    const entityId = getCanonicalGroupMemberEntityId(objectId);
    return entityId ? [entityId] : [];
  }));
  const group = groups.find((item) => item.id === groupId);
  if (!group || ids.size === 0) {
    return null;
  }

  const removedObjectIds = group.objectIds.flatMap((objectId) => {
    const entityId = getCanonicalGroupMemberEntityId(objectId);
    return entityId && ids.has(entityId) ? [entityId] : [];
  });
  if (removedObjectIds.length === 0) {
    return null;
  }

  const remainingObjectIds = group.objectIds.flatMap((objectId) => {
    const entityId = getCanonicalGroupMemberEntityId(objectId);
    return entityId && !ids.has(entityId) ? [entityId] : [];
  });
  const removedGroup = remainingObjectIds.length === 0;
  const updatedAt = nowIso();

  return {
    groups: removedGroup
      ? groups.filter((item) => item.id !== groupId)
      : groups.map((item) => item.id === groupId
        ? { ...item, objectIds: remainingObjectIds, updatedAt }
        : item),
    removedObjectIds,
    removedGroup
  };
};

export const removeObjectsFromGroup = (groups: ObjectGroup[], groupId: string, objectIds: string[]) => {
  return removeObjectsFromGroupWithResult(groups, groupId, objectIds)?.groups ?? groups;
};

export const getVisibleGroupObjectIds = (
  group: ObjectGroup,
  machines: PlacedMachine[],
  layers: LayoutLayer[],
  civilReferences: CivilReferenceItem[] = []
) => {
  const machinesById = new Map(machines.map((machine) => [machine.instanceId, machine]));
  const civilById = new Map(civilReferences.map((item) => [item.id, item]));
  return group.objectIds.filter((objectId) => {
    if (objectId.startsWith("civil:")) {
      const civil = civilById.get(objectId.slice("civil:".length));
      return civil ? isLayerVisible(civil.layerId, layers) : false;
    }
    const machineId = objectId.replace(/^(object|machine):/, "");
    const machine = machinesById.get(machineId);
    return machine ? isLayerVisible(machine.layerId, layers) : false;
  });
};

export const getGroupEntityKeys = (group: ObjectGroup) =>
  group.objectIds.flatMap((objectId) => {
    const entityId = getCanonicalGroupMemberEntityId(objectId);
    return entityId ? [entityId] : [];
  });

export const getSelectedGroupMemberEntityIds = (
  group: ObjectGroup,
  selectedEntityIds: readonly string[]
) => {
  const memberIds = new Set(getGroupEntityKeys(group));
  return selectedEntityIds.flatMap((entityId) => {
    const canonicalEntityId = getCanonicalGroupMemberEntityId(entityId);
    return canonicalEntityId && memberIds.has(canonicalEntityId) ? [canonicalEntityId] : [];
  });
};

export const getGroupByMemberEntityId = (
  groups: readonly ObjectGroup[],
  entityId: string
) => {
  const canonicalEntityId = getCanonicalGroupMemberEntityId(entityId);
  return canonicalEntityId
    ? groups.find((group) => getGroupEntityKeys(group).includes(canonicalEntityId))
    : undefined;
};

export const ungroupObjectGroup = (groups: readonly ObjectGroup[], groupId: string) => {
  const group = groups.find((item) => item.id === groupId);
  return group
    ? {
        groups: groups.filter((item) => item.id !== groupId),
        memberEntityIds: getGroupEntityKeys(group)
      }
    : null;
};
