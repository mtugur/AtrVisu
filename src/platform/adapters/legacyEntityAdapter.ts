import type { AnnotationObject } from "../../types/annotations";
import type { CivilReferenceItem } from "../../types/civil";
import type { LayoutLayer } from "../../types/layers";
import { DEFAULT_LAYER_ID } from "../../types/layers";
import type { PlacedMachine } from "../../types/machine";
import { getMachineReferencePositionMm } from "../../utils/coordinateReference";
import { getMachineDimensionsMm } from "../../utils/machineDimensions";
import type { EntityProperty, PlatformEntity } from "../contracts";

export type LegacyEntityFamily = "machine" | "civil" | "annotation";

export type LegacyEntitySnapshotInput = {
  machines: readonly PlacedMachine[];
  civilReferences: readonly CivilReferenceItem[];
  annotations: readonly AnnotationObject[];
  layers: readonly LayoutLayer[];
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
  layers
}: LegacyEntitySnapshotInput): readonly PlatformEntity[] => {
  const entities = [
    ...machines.map((machine) => adaptPlacedMachineToPlatformEntity(machine, layers)),
    ...civilReferences.map((item) => adaptCivilReferenceToPlatformEntity(item, layers)),
    ...annotations.map((annotation) => adaptAnnotationToPlatformEntity(annotation, layers))
  ];

  assertUniqueEntityIds(entities);
  return entities;
};
