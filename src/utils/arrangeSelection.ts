import type { PlatformEntity, SelectionState } from "../platform/contracts";
import {
  createCompositeAlignableEntity,
  getAlignableEntityKey,
  type AlignableEntity
} from "./alignment";

export type ArrangeSelectionProjection = {
  entities: AlignableEntity[];
  selectedEntityIds: string[];
  primarySelectedEntityId: string | null;
};

export const projectArrangeSelection = ({
  selection,
  platformEntities,
  memberEntities,
  activeGroupEditId
}: {
  selection: SelectionState;
  platformEntities: readonly PlatformEntity[];
  memberEntities: readonly AlignableEntity[];
  activeGroupEditId: string | null;
}): ArrangeSelectionProjection => {
  const platformById = new Map(platformEntities.map((entity) => [entity.id, entity]));
  const memberById = new Map(memberEntities.map((entity) => [
    getAlignableEntityKey(entity.kind, entity.id),
    entity
  ]));
  const entities: AlignableEntity[] = [];
  const selectedEntityIds: string[] = [];

  const append = (entity: AlignableEntity) => {
    const key = getAlignableEntityKey(entity.kind, entity.id);
    if (!selectedEntityIds.includes(key)) {
      entities.push(entity);
      selectedEntityIds.push(key);
    }
  };

  selection.ids.forEach((entityId) => {
    const platformEntity = platformById.get(entityId);
    if (!platformEntity) {
      return;
    }

    if (activeGroupEditId) {
      if (platformEntity.type !== "machine" && platformEntity.type !== "civil") {
        return;
      }
      const member = memberById.get(entityId);
      if (member) {
        append(member);
      }
      return;
    }

    if (platformEntity.type === "group") {
      const members = platformEntity.childrenIds.flatMap((childId) => {
        const member = memberById.get(childId);
        return member ? [member] : [];
      });
      if (members.length !== platformEntity.childrenIds.length) {
        return;
      }
      const group = createCompositeAlignableEntity({
        id: platformEntity.id.slice("group:".length),
        label: platformEntity.name,
        members,
        locked: platformEntity.locked,
        hidden: !platformEntity.visible || !platformEntity.selectable
      });
      if (group) {
        append(group);
      }
      return;
    }

    if (
      (platformEntity.type === "machine" || platformEntity.type === "civil")
      && !platformEntity.parentId
    ) {
      const member = memberById.get(entityId);
      if (member) {
        append(member);
      }
    }
  });

  const primaryPlatformId = selection.primaryId;
  const primaryPlatformEntity = primaryPlatformId
    ? platformById.get(primaryPlatformId)
    : undefined;
  const primarySelectedEntityId = primaryPlatformEntity?.type === "group"
    ? getAlignableEntityKey("group", primaryPlatformEntity.id.slice("group:".length))
    : primaryPlatformEntity && (primaryPlatformEntity.type === "machine" || primaryPlatformEntity.type === "civil")
      ? primaryPlatformEntity.id
      : null;

  return {
    entities,
    selectedEntityIds,
    primarySelectedEntityId: primarySelectedEntityId && selectedEntityIds.includes(primarySelectedEntityId)
      ? primarySelectedEntityId
      : selectedEntityIds[0] ?? null
  };
};
