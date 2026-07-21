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
  return groups.map((group) =>
    group.id === groupId
      ? {
          ...group,
          objectIds: [...new Set([
            ...group.objectIds.flatMap((objectId) => {
              const entityId = getCanonicalGroupMemberEntityId(objectId);
              return entityId ? [entityId] : [];
            }),
            ...ids
          ])],
          updatedAt: nowIso()
        }
      : {
          ...group,
          objectIds: group.objectIds.filter((objectId) => {
            const entityId = getCanonicalGroupMemberEntityId(objectId);
            return !entityId || !ids.includes(entityId);
          })
        }
  );
};

export const removeObjectsFromGroup = (groups: ObjectGroup[], groupId: string, objectIds: string[]) => {
  const ids = new Set(objectIds.flatMap((objectId) => {
    const entityId = getCanonicalGroupMemberEntityId(objectId);
    return entityId ? [entityId] : [];
  }));
  return groups.map((group) =>
    group.id === groupId
      ? {
          ...group,
          objectIds: group.objectIds.filter((objectId) => {
            const entityId = getCanonicalGroupMemberEntityId(objectId);
            return !entityId || !ids.has(entityId);
          }),
          updatedAt: nowIso()
        }
      : group
  );
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
