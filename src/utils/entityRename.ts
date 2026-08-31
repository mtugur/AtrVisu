import type { CivilReferenceItem } from "../types/civil";
import type { ObjectGroup } from "../types/groups";
import type { PlacedMachine } from "../types/machine";
import { getPlacedMachineDisplayName } from "./entityNames";

export type RenameProjectEntityInput = Readonly<{
  entityId: string;
  name: string;
  machines: readonly PlacedMachine[];
  civilReferences: readonly CivilReferenceItem[];
  groups: readonly ObjectGroup[];
  lockedEntityIds?: ReadonlySet<string>;
  now?: string;
}>;

export type RenameProjectEntityResult = Readonly<{
  changed: boolean;
  machines: readonly PlacedMachine[];
  civilReferences: readonly CivilReferenceItem[];
  groups: readonly ObjectGroup[];
  reason?: string;
}>;

export const isRenameableProjectEntityId = (entityId: string) =>
  entityId.startsWith("machine:")
  || entityId.startsWith("civil:")
  || entityId.startsWith("group:");

export const renameProjectEntity = ({
  entityId,
  name,
  machines,
  civilReferences,
  groups,
  lockedEntityIds = new Set<string>(),
  now = new Date().toISOString()
}: RenameProjectEntityInput): RenameProjectEntityResult => {
  const nextName = name.trim();
  const unchanged = (reason?: string): RenameProjectEntityResult => ({
    changed: false,
    machines,
    civilReferences,
    groups,
    ...(reason ? { reason } : {})
  });

  if (!nextName) {
    return unchanged("Name is required.");
  }
  if (lockedEntityIds.has(entityId)) {
    return unchanged("Locked entities cannot be renamed.");
  }

  if (entityId.startsWith("machine:")) {
    const id = entityId.slice("machine:".length);
    const current = machines.find((machine) => machine.instanceId === id);
    if (!current) {
      return unchanged("The selected machine instance no longer exists.");
    }
    if (getPlacedMachineDisplayName(current) === nextName) {
      return unchanged();
    }
    return {
      changed: true,
      machines: machines.map((machine) => machine.instanceId === id
        ? {
            ...machine,
            ...(nextName === machine.definition.name
              ? { displayName: undefined }
              : { displayName: nextName })
          }
        : machine),
      civilReferences,
      groups
    };
  }

  if (entityId.startsWith("civil:")) {
    const id = entityId.slice("civil:".length);
    const current = civilReferences.find((item) => item.id === id);
    if (!current) {
      return unchanged("The selected civil reference no longer exists.");
    }
    if (current.name === nextName) {
      return unchanged();
    }
    return {
      changed: true,
      machines,
      civilReferences: civilReferences.map((item) => item.id === id
        ? { ...item, name: nextName, updatedAt: now }
        : item),
      groups
    };
  }

  if (entityId.startsWith("group:")) {
    const id = entityId.slice("group:".length);
    const current = groups.find((group) => group.id === id);
    if (!current) {
      return unchanged("The selected group no longer exists.");
    }
    if (current.name === nextName) {
      return unchanged();
    }
    return {
      changed: true,
      machines,
      civilReferences,
      groups: groups.map((group) => group.id === id
        ? { ...group, name: nextName, updatedAt: now }
        : group)
    };
  }

  return unchanged("The selected entity does not support project-instance rename.");
};
