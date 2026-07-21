import type { AnnotationObject } from "../../types/annotations";
import type { CivilReferenceItem } from "../../types/civil";
import type { ObjectGroup } from "../../types/groups";
import type { LayoutLayer } from "../../types/layers";
import { DEFAULT_LAYER_ID } from "../../types/layers";
import type { PlacedMachine } from "../../types/machine";
import { getMachineReferencePositionMm } from "../../utils/coordinateReference";
import { getMachineDimensionsMm } from "../../utils/machineDimensions";
import { getGroupEntityKeys } from "../../utils/groups";
import type { EntityProperty, PlatformEntity } from "../contracts";

export type LegacyEntityFamily = "machine" | "civil" | "annotation" | "group";

export type LegacyEntitySnapshotInput = {
  machines: readonly PlacedMachine[];
  civilReferences: readonly CivilReferenceItem[];
  annotations: readonly AnnotationObject[];
  layers: readonly LayoutLayer[];
  groups?: readonly ObjectGroup[];
};

type EffectiveLayerContext = {
  layerId: string;
  visible: boolean;
  locked: boolean;
};

const property = (
  key: string,
  label: string,
  value: EntityProperty["value"],
  unit: EntityProperty["unit"] = "unknown"
): EntityProperty => ({ key, label, value, unit, readOnly: true });

const optionalProperty = (
  key: string,
  label: string,
  value: EntityProperty["value"] | undefined,
  unit: EntityProperty["unit"] = "unknown"
): EntityProperty | null => value === undefined ? null : property(key, label, value, unit);

const compactProperties = (
  values: readonly (EntityProperty | null)[]
): readonly EntityProperty[] => values.filter((value): value is EntityProperty => value !== null);

const resolveEffectiveLayerContext = (
  layerId: string | undefined,
  layers: readonly LayoutLayer[]
): EffectiveLayerContext => {
  const associatedLayer = layers.find((layer) => layer.id === layerId);
  const defaultLayer = layers.find((layer) => layer.id === DEFAULT_LAYER_ID);
  const effectiveLayer = associatedLayer ?? defaultLayer;

  return {
    layerId: effectiveLayer?.id ?? DEFAULT_LAYER_ID,
    visible: effectiveLayer?.visible ?? true,
    locked: effectiveLayer?.locked ?? false
  };
};

export const createLegacyPlatformEntityId = (
  family: LegacyEntityFamily,
  sourceId: string
) => `${family}:${sourceId}`;

export const adaptPlacedMachineToPlatformEntity = (
  machine: PlacedMachine,
  layers: readonly LayoutLayer[]
): PlatformEntity => {
  const layer = resolveEffectiveLayerContext(machine.layerId, layers);
  const position = getMachineReferencePositionMm(machine);
  const dimensions = getMachineDimensionsMm(machine.definition);
  const machineSubtype = machine.definition.machineType ?? machine.definition.category;

  return {
    id: createLegacyPlatformEntityId("machine", machine.instanceId),
    type: "machine",
    name: machine.definition.name,
    transform: {
      planX: position.xMm,
      planY: position.yMm,
      elevation: machine.elevationMm ?? 0,
      rotationDeg: machine.rotationDeg ?? machine.rotationY
    },
    properties: compactProperties([
      property("sourceFamily", "Source family", "machine"),
      property("sourceId", "Source ID", machine.instanceId),
      property("sourceSubtype", "Source subtype", machineSubtype),
      property("machineDefinitionId", "Machine definition ID", machine.machineDefinitionId),
      property("machineCategory", "Machine category", machine.definition.category),
      optionalProperty("machineType", "Machine type", machine.definition.machineType),
      property("widthMm", "Width", dimensions.widthMm, "mm"),
      property("depthMm", "Depth", dimensions.depthMm, "mm"),
      property("heightMm", "Height", dimensions.heightMm, "mm")
    ]),
    connectors: [],
    childrenIds: [],
    layerId: layer.layerId,
    visible: layer.visible,
    locked: layer.locked,
    selectable: layer.visible
  };
};

export const adaptCivilReferenceToPlatformEntity = (
  item: CivilReferenceItem,
  layers: readonly LayoutLayer[]
): PlatformEntity => {
  const layer = resolveEffectiveLayerContext(item.layerId, layers);
  const visible = item.visible !== false && layer.visible;

  return {
    id: createLegacyPlatformEntityId("civil", item.id),
    type: "civil",
    name: item.name,
    transform: {
      planX: item.positionMm.xMm,
      planY: item.positionMm.yMm,
      elevation: item.positionMm.zMm ?? 0,
      rotationDeg: item.rotationDeg
    },
    properties: compactProperties([
      property("sourceFamily", "Source family", "civil"),
      property("sourceId", "Source ID", item.id),
      property("sourceSubtype", "Source subtype", item.type),
      optionalProperty("description", "Description", item.description),
      property("widthMm", "Width", item.sizeMm.widthMm, "mm"),
      property("depthMm", "Depth", item.sizeMm.depthMm, "mm"),
      optionalProperty("heightMm", "Height", item.sizeMm.heightMm, "mm")
    ]),
    connectors: [],
    childrenIds: [],
    layerId: layer.layerId,
    visible,
    locked: Boolean(item.locked || layer.locked),
    selectable: visible
  };
};

export const adaptAnnotationToPlatformEntity = (
  annotation: AnnotationObject,
  layers: readonly LayoutLayer[]
): PlatformEntity => {
  const layer = resolveEffectiveLayerContext(annotation.layerId, layers);

  return {
    id: createLegacyPlatformEntityId("annotation", annotation.id),
    type: "annotation",
    name: annotation.text,
    transform: {
      planX: annotation.positionMm.xMm,
      planY: annotation.positionMm.yMm,
      elevation: annotation.positionMm.zMm ?? 0,
      rotationDeg: annotation.rotationDeg ?? 0
    },
    properties: compactProperties([
      property("sourceFamily", "Source family", "annotation"),
      property("sourceId", "Source ID", annotation.id),
      property("sourceSubtype", "Source subtype", annotation.type),
      optionalProperty("targetObjectId", "Target object ID", annotation.targetObjectId),
      optionalProperty(
        "targetConnectionPointId",
        "Target connection point ID",
        annotation.targetConnectionPointId
      )
    ]),
    connectors: [],
    childrenIds: [],
    layerId: layer.layerId,
    visible: layer.visible,
    locked: layer.locked,
    selectable: layer.visible
  };
};

export const adaptObjectGroupToPlatformEntity = (
  group: ObjectGroup,
  childEntities: readonly PlatformEntity[],
  layers: readonly LayoutLayer[]
): PlatformEntity => {
  const layer = resolveEffectiveLayerContext(group.layerId, layers);
  const childrenIds = getGroupEntityKeys(group);
  const childById = new Map(childEntities.map((entity) => [entity.id, entity]));
  const resolvedChildren = childrenIds.flatMap((entityId) => {
    const entity = childById.get(entityId);
    return entity ? [entity] : [];
  });

  return {
    id: createLegacyPlatformEntityId("group", group.id),
    type: "group",
    name: group.name,
    transform: {
      planX: resolvedChildren.length > 0
        ? Math.min(...resolvedChildren.map((entity) => entity.transform.planX))
        : 0,
      planY: resolvedChildren.length > 0
        ? Math.min(...resolvedChildren.map((entity) => entity.transform.planY))
        : 0,
      elevation: resolvedChildren.length > 0
        ? Math.min(...resolvedChildren.map((entity) => entity.transform.elevation))
        : 0,
      rotationDeg: 0
    },
    properties: [
      property("sourceFamily", "Source family", "group"),
      property("sourceId", "Source ID", group.id),
      property("memberCount", "Member count", childrenIds.length)
    ],
    connectors: [],
    childrenIds,
    layerId: layer.layerId,
    visible: layer.visible,
    locked: layer.locked,
    selectable: layer.visible
  };
};

const assertUniqueEntityIds = (entities: readonly PlatformEntity[]) => {
  const seenIds = new Set<string>();

  entities.forEach((entity) => {
    if (seenIds.has(entity.id)) {
      throw new Error(`Duplicate legacy platform entity id "${entity.id}".`);
    }
    seenIds.add(entity.id);
  });
};

export const createLegacyEntitySnapshot = ({
  machines,
  civilReferences,
  annotations,
  layers,
  groups = []
}: LegacyEntitySnapshotInput): readonly PlatformEntity[] => {
  const sourceEntities = [
    ...machines.map((machine) => adaptPlacedMachineToPlatformEntity(machine, layers)),
    ...civilReferences.map((item) => adaptCivilReferenceToPlatformEntity(item, layers)),
    ...annotations.map((annotation) => adaptAnnotationToPlatformEntity(annotation, layers))
  ];
  const groupEntities = groups.map((group) => adaptObjectGroupToPlatformEntity(group, sourceEntities, layers));
  const parentByChildId = new Map<string, string>();
  groupEntities.forEach((groupEntity) => {
    groupEntity.childrenIds.forEach((childId) => {
      if (!parentByChildId.has(childId)) {
        parentByChildId.set(childId, groupEntity.id);
      }
    });
  });
  const entities = [
    ...sourceEntities.map((entity) => {
      const parentId = parentByChildId.get(entity.id);
      return parentId ? { ...entity, parentId } : entity;
    }),
    ...groupEntities
  ];

  assertUniqueEntityIds(entities);
  return entities;
};
