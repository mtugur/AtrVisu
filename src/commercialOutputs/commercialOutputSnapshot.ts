import { projectAtaraMachineProperties } from "../propertySchema";
import type { PropertyFieldViewModel } from "../propertySchema/types";
import type { CivilReferenceItem } from "../types/civil";
import type { ObjectGroup } from "../types/groups";
import type { LayoutLayer } from "../types/layers";
import type { PlacedMachine } from "../types/machine";
import {
  getFootprintCornersFromReferenceMm,
  getMachineReferencePositionMm,
  getReferenceFromCenterMm,
  usesFrontLeftBottomReference,
  type PlanPointMm
} from "../utils/coordinateReference";
import { getMachineDimensionsMm } from "../utils/machineDimensions";
import type {
  CommercialOutputBomGroup,
  CommercialOutputEquipmentInstance,
  CommercialOutputExtents,
  CommercialOutputFootprint,
  CommercialOutputMetadata,
  CommercialOutputProperty,
  CommercialOutputSnapshot
} from "./types";
import { UNKNOWN_COMMERCIAL_VALUE } from "./types";

type SnapshotMetadataInput = {
  projectId?: string | null;
  projectName?: string | null;
  layoutId?: string | null;
  layoutName?: string | null;
  revisionId?: string | null;
  revision?: string | null;
};

export type CreateCommercialOutputSnapshotInput = {
  metadata: SnapshotMetadataInput;
  machines: readonly PlacedMachine[];
  civilReferences: readonly CivilReferenceItem[];
  layers: readonly LayoutLayer[];
  groups: readonly ObjectGroup[];
  now?: () => Date;
};

const deepFreeze = <T>(value: T): T => {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.values(value as Record<string, unknown>).forEach(deepFreeze);
    Object.freeze(value);
  }
  return value;
};

const normalizedLabel = (value: string | null | undefined, fallback: string) => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : fallback;
};

const toMetadata = (input: SnapshotMetadataInput, now: () => Date): CommercialOutputMetadata => ({
  ...(input.projectId ? { projectId: input.projectId } : {}),
  projectName: normalizedLabel(input.projectName, "Untitled"),
  ...(input.layoutId ? { layoutId: input.layoutId } : {}),
  layoutName: normalizedLabel(input.layoutName, "Untitled"),
  ...(input.revisionId ? { revisionId: input.revisionId } : {}),
  revision: normalizedLabel(input.revision, "No revision"),
  generatedAt: now().toISOString(),
  canonicalUnit: "mm"
});

const mappedProperties = (
  fields: readonly PropertyFieldViewModel[],
  target: "bom" | "report"
): CommercialOutputProperty[] => fields.flatMap((field) => field.exportMappings
  .filter((mapping) => mapping.target === target)
  .map((mapping) => ({
    propertyId: field.id,
    key: mapping.key,
    label: field.label,
    rawValue: field.rawValue ?? null,
    displayValue: field.missing ? UNKNOWN_COMMERCIAL_VALUE : field.displayValue,
    ...(field.unitLabel ? { unitLabel: field.unitLabel } : {}),
    missing: field.missing
  })));

const definitionIdentity = (machine: PlacedMachine) => machine.libraryId
  ? `${machine.libraryId}:${machine.machineDefinitionId}`
  : machine.machineDefinitionId;

const layerMaps = (layers: readonly LayoutLayer[]) => ({
  names: new Map(layers.map((layer) => [layer.id, layer.name])),
  visibility: new Map(layers.map((layer) => [layer.id, layer.visible]))
});

const groupNamesForMachine = (machine: PlacedMachine, groups: readonly ObjectGroup[]) => {
  const canonicalId = `machine:${machine.instanceId}`;
  return groups
    .filter((group) => group.objectIds.includes(machine.instanceId) || group.objectIds.includes(canonicalId))
    .map((group) => group.name)
    .sort((left, right) => left.localeCompare(right));
};

const machineFootprint = (
  machine: PlacedMachine,
  visible: boolean
): CommercialOutputFootprint => {
  const dimensions = getMachineDimensionsMm(machine.definition);
  const rotationDeg = machine.rotationDeg ?? machine.rotationY ?? 0;
  const position = getMachineReferencePositionMm(machine);
  const reference = usesFrontLeftBottomReference(machine)
    ? position
    : getReferenceFromCenterMm(position, dimensions, rotationDeg);
  return {
    entityId: `machine:${machine.instanceId}`,
    entityType: "machine",
    name: machine.definition.name,
    cornersMm: getFootprintCornersFromReferenceMm(reference, dimensions, rotationDeg),
    rotationDeg,
    visible
  };
};

const civilFootprint = (
  item: CivilReferenceItem,
  visible: boolean
): CommercialOutputFootprint => {
  const reference = usesFrontLeftBottomReference(item)
    ? item.positionMm
    : getReferenceFromCenterMm(item.positionMm, item.sizeMm, item.rotationDeg);
  return {
    entityId: `civil:${item.id}`,
    entityType: "civil",
    name: item.name,
    cornersMm: getFootprintCornersFromReferenceMm(reference, item.sizeMm, item.rotationDeg),
    rotationDeg: item.rotationDeg,
    visible
  };
};

const createExtents = (footprints: readonly CommercialOutputFootprint[]): CommercialOutputExtents | null => {
  const points = footprints.filter((footprint) => footprint.visible).flatMap((footprint) => footprint.cornersMm);
  if (points.length === 0) {
    return null;
  }
  const minXMm = Math.min(...points.map((point) => point.xMm));
  const maxXMm = Math.max(...points.map((point) => point.xMm));
  const minYMm = Math.min(...points.map((point) => point.yMm));
  const maxYMm = Math.max(...points.map((point) => point.yMm));
  return {
    minXMm,
    maxXMm,
    minYMm,
    maxYMm,
    widthMm: maxXMm - minXMm,
    depthMm: maxYMm - minYMm
  };
};

const createBomGroups = (
  equipment: readonly CommercialOutputEquipmentInstance[]
): CommercialOutputBomGroup[] => {
  const groups = new Map<string, CommercialOutputBomGroup>();
  equipment.forEach((instance) => {
    const current = groups.get(instance.bomGroupId);
    if (current) {
      groups.set(instance.bomGroupId, { ...current, quantity: current.quantity + 1 });
      return;
    }
    groups.set(instance.bomGroupId, {
      id: instance.bomGroupId,
      definitionIdentity: instance.definitionIdentity,
      machineDefinitionId: instance.machineDefinitionId,
      ...(instance.libraryId ? { libraryId: instance.libraryId } : {}),
      name: instance.name,
      quantity: 1,
      properties: instance.bomProperties
    });
  });
  return [...groups.values()].sort((left, right) => left.definitionIdentity.localeCompare(right.definitionIdentity));
};

const countDataGaps = (machines: readonly PlacedMachine[]) => machines.reduce((count, machine) => {
  const fields = projectAtaraMachineProperties(machine).sections.flatMap((section) => section.fields);
  return count + fields.filter((field) => field.missing && field.exportMappings.length > 0).length;
}, 0);

export const createCommercialOutputSnapshot = (
  input: CreateCommercialOutputSnapshotInput
): CommercialOutputSnapshot => {
  const { names: layerNames, visibility: layerVisibility } = layerMaps(input.layers);
  const equipment = input.machines.map((machine): CommercialOutputEquipmentInstance => {
    const projection = projectAtaraMachineProperties(machine);
    const fields = projection.sections.flatMap((section) => section.fields);
    const dimensions = getMachineDimensionsMm(machine.definition);
    const position = getMachineReferencePositionMm(machine);
    const identity = definitionIdentity(machine);
    const visible = machine.layerId ? layerVisibility.get(machine.layerId) !== false : true;
    return {
      entityId: `machine:${machine.instanceId}`,
      instanceId: machine.instanceId,
      name: machine.definition.name,
      definitionIdentity: identity,
      machineDefinitionId: machine.machineDefinitionId,
      ...(machine.libraryId ? { libraryId: machine.libraryId } : {}),
      bomGroupId: identity,
      layer: machine.layerId ? layerNames.get(machine.layerId) ?? UNKNOWN_COMMERCIAL_VALUE : "Default",
      groups: groupNamesForMachine(machine, input.groups),
      planXMm: position.xMm,
      planYMm: position.yMm,
      elevationMm: machine.elevationMm ?? 0,
      rotationDeg: machine.rotationDeg ?? machine.rotationY ?? 0,
      widthMm: dimensions.widthMm,
      depthMm: dimensions.depthMm,
      heightMm: dimensions.heightMm,
      visible,
      footprint: machineFootprint(machine, visible),
      bomProperties: mappedProperties(fields, "bom"),
      reportProperties: mappedProperties(fields, "report")
    };
  }).sort((left, right) => left.instanceId.localeCompare(right.instanceId));

  const bomGroups = createBomGroups(equipment);
  const machineFootprints = equipment.map((instance) => instance.footprint);
  const civilFootprints = input.civilReferences.map((item) => {
    const visible = item.visible !== false && (item.layerId ? layerVisibility.get(item.layerId) !== false : true);
    return civilFootprint(item, visible);
  }).sort((left, right) => left.entityId.localeCompare(right.entityId));
  const planFootprints = [...machineFootprints, ...civilFootprints];
  const dataGapCount = countDataGaps(input.machines);
  const warnings = [
    ...(dataGapCount > 0 ? [`${dataGapCount} commercial fields are unknown.`] : []),
    ...(equipment.length === 0 ? ["No equipment is available for commercial output."] : []),
    ...(createExtents(planFootprints) ? [] : ["No visible canonical footprint is available for the layout plan."])
  ];

  return deepFreeze({
    metadata: toMetadata(input.metadata, input.now ?? (() => new Date())),
    equipment,
    bomGroups,
    planFootprints,
    extents: createExtents(planFootprints),
    equipmentCount: equipment.length,
    bomGroupCount: bomGroups.length,
    dataGapCount,
    warnings
  });
};

export const getCommercialOutputProperty = (
  properties: readonly CommercialOutputProperty[],
  key: string
) => properties.find((property) => property.key === key);

export const getFootprintExtents = (points: readonly PlanPointMm[]) => createExtents([{
  entityId: "calculation",
  entityType: "civil",
  name: "Calculation",
  cornersMm: points,
  rotationDeg: 0,
  visible: true
}]);
