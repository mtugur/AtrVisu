import {
  PROPERTY_SCHEMA_VERSION,
  type PropertyExportMappings,
  type PropertyFieldDataType,
  type PropertyFieldDefinition,
  type PropertySchemaDefinition
} from "../platform/contracts";
import type { AtaraMachineData } from "../types/ataraMachineData";
import type { PlacedMachine } from "../types/machine";
import { normalizeAtaraMachineData } from "../utils/ataraMachineData";
import { getMachineDimensionsMm } from "../utils/machineDimensions";
import { projectPropertySchema } from "./projection";
import { createPropertyAccessorRegistry, createPropertySchemaRegistry } from "./registry";
import type { PropertyAccessor, PropertyAccessorResult, PropertyProjectionSource } from "./types";
import { createPropertyValidatorRegistry } from "./validation";

export const ATARA_MACHINE_PROPERTY_SCHEMA_ID = "schema.atara.machine";
export const ATARA_MACHINE_ENTITY_TYPE = "entity.machine";

type AtaraMachinePropertySourceValue = {
  machine: PlacedMachine;
  ataraMachineData: AtaraMachineData | undefined;
  hasNewerLibraryAtaraData: boolean;
};

const bomAndReport = (key: string): PropertyExportMappings => [
  { target: "bom", key },
  { target: "report", key }
];

const field = (options: {
  id: string;
  path: string;
  labelKey: string;
  dataType: PropertyFieldDataType;
  unit?: string;
  exportKey: string;
}): PropertyFieldDefinition => ({
  id: options.id,
  path: options.path,
  accessorId: options.id,
  labelKey: options.labelKey,
  dataType: options.dataType,
  ...(options.unit ? { unit: options.unit } : {}),
  editable: false,
  required: false,
  ...(options.dataType === "number" ? { validation: { min: 0 } } : {}),
  exportMappings: bomAndReport(options.exportKey)
});

const identityFields = [
  field({ id: "atara.identity.manufacturer", path: "identity.manufacturer", labelKey: "property.field.manufacturer", dataType: "string", exportKey: "manufacturer" }),
  field({ id: "atara.identity.is-atara-product", path: "identity.isAtaraProduct", labelKey: "property.field.atara-product", dataType: "boolean", exportKey: "isAtaraProduct" }),
  field({ id: "atara.identity.atr-id", path: "identity.atrId", labelKey: "property.field.atr-id", dataType: "string", exportKey: "atrId" }),
  field({ id: "atara.identity.machine-code", path: "identity.machineCode", labelKey: "property.field.machine-code", dataType: "string", exportKey: "machineCode" }),
  field({ id: "atara.identity.product-family-code", path: "identity.productFamilyCode", labelKey: "property.field.product-family-code", dataType: "string", exportKey: "productFamilyCode" }),
  field({ id: "atara.identity.pdn-code", path: "identity.pdnCode", labelKey: "property.field.pdn-code", dataType: "string", exportKey: "pdnCode" }),
  field({ id: "atara.identity.revision", path: "identity.revision", labelKey: "property.field.revision", dataType: "string", exportKey: "revision" })
] as const;

const physicalFields = [
  field({ id: "atara.physical.width", path: "physical.widthMm", labelKey: "property.field.width", dataType: "number", unit: "mm", exportKey: "widthMm" }),
  field({ id: "atara.physical.depth", path: "physical.depthMm", labelKey: "property.field.depth", dataType: "number", unit: "mm", exportKey: "depthMm" }),
  field({ id: "atara.physical.height", path: "physical.heightMm", labelKey: "property.field.height", dataType: "number", unit: "mm", exportKey: "heightMm" }),
  field({ id: "atara.physical.weight", path: "physical.weightKg", labelKey: "property.field.weight", dataType: "number", unit: "kg", exportKey: "weightKg" }),
  field({ id: "atara.physical.operating-weight", path: "physical.operatingWeightKg", labelKey: "property.field.operating-weight", dataType: "number", unit: "kg", exportKey: "operatingWeightKg" })
] as const;

const capacityFields = [
  field({ id: "atara.capacity.minimum", path: "operationalData.capacityMin", labelKey: "property.field.capacity-min", dataType: "number", exportKey: "capacityMin" }),
  field({ id: "atara.capacity.nominal", path: "operationalData.capacityNominal", labelKey: "property.field.capacity-nominal", dataType: "number", exportKey: "capacityNominal" }),
  field({ id: "atara.capacity.maximum", path: "operationalData.capacityMax", labelKey: "property.field.capacity-max", dataType: "number", exportKey: "capacityMax" })
] as const;

const electricalFields = [
  field({ id: "atara.electrical.power", path: "utilityRequirements.electrical.powerKw", labelKey: "property.field.electrical-power", dataType: "number", unit: "kw", exportKey: "electricalPowerKw" }),
  field({ id: "atara.electrical.voltage", path: "utilityRequirements.electrical.voltage", labelKey: "property.field.electrical-voltage", dataType: "number", unit: "v", exportKey: "electricalVoltage" }),
  field({ id: "atara.electrical.phase", path: "utilityRequirements.electrical.phase", labelKey: "property.field.electrical-phase", dataType: "string", exportKey: "electricalPhase" }),
  field({ id: "atara.electrical.frequency", path: "utilityRequirements.electrical.frequencyHz", labelKey: "property.field.electrical-frequency", dataType: "number", unit: "hz", exportKey: "electricalFrequencyHz" }),
  field({ id: "atara.electrical.current", path: "utilityRequirements.electrical.currentA", labelKey: "property.field.electrical-current", dataType: "number", unit: "a", exportKey: "electricalCurrentA" })
] as const;

const pneumaticFields = [
  field({ id: "atara.pneumatic.pressure", path: "utilityRequirements.pneumatic.pressureBar", labelKey: "property.field.pneumatic-pressure", dataType: "number", unit: "bar", exportKey: "pneumaticPressureBar" }),
  field({ id: "atara.pneumatic.consumption", path: "utilityRequirements.pneumatic.airConsumptionNlMin", labelKey: "property.field.pneumatic-consumption", dataType: "number", unit: "nl-min", exportKey: "airConsumptionNlMin" }),
  field({ id: "atara.pneumatic.connection", path: "utilityRequirements.pneumatic.connectionSize", labelKey: "property.field.pneumatic-connection", dataType: "string", exportKey: "pneumaticConnectionSize" })
] as const;

const networkFields = [
  field({ id: "atara.network.protocols", path: "utilityRequirements.network.protocols", labelKey: "property.field.network-protocols", dataType: "text", exportKey: "networkProtocols" })
] as const;

const maintenanceFields = [
  field({ id: "atara.maintenance.front", path: "maintenanceClearance.frontMm", labelKey: "property.field.clearance-front", dataType: "number", unit: "mm", exportKey: "maintenanceFrontMm" }),
  field({ id: "atara.maintenance.back", path: "maintenanceClearance.backMm", labelKey: "property.field.clearance-back", dataType: "number", unit: "mm", exportKey: "maintenanceBackMm" }),
  field({ id: "atara.maintenance.left", path: "maintenanceClearance.leftMm", labelKey: "property.field.clearance-left", dataType: "number", unit: "mm", exportKey: "maintenanceLeftMm" }),
  field({ id: "atara.maintenance.right", path: "maintenanceClearance.rightMm", labelKey: "property.field.clearance-right", dataType: "number", unit: "mm", exportKey: "maintenanceRightMm" }),
  field({ id: "atara.maintenance.top", path: "maintenanceClearance.topMm", labelKey: "property.field.clearance-top", dataType: "number", unit: "mm", exportKey: "maintenanceTopMm" })
] as const;

export const ATARA_MACHINE_PROPERTY_SCHEMA = Object.freeze({
  schemaVersion: PROPERTY_SCHEMA_VERSION,
  id: ATARA_MACHINE_PROPERTY_SCHEMA_ID,
  labelKey: "property.schema.atara-machine.label",
  descriptionKey: "property.schema.atara-machine.description",
  sections: [
    { id: "identity", labelKey: "property.section.identity", order: 0, appliesTo: [ATARA_MACHINE_ENTITY_TYPE], fields: identityFields },
    { id: "physical", labelKey: "property.section.physical", order: 1, appliesTo: [ATARA_MACHINE_ENTITY_TYPE], fields: physicalFields },
    { id: "capacity", labelKey: "property.section.capacity", order: 2, appliesTo: [ATARA_MACHINE_ENTITY_TYPE], fields: capacityFields },
    { id: "electrical", labelKey: "property.section.electrical", order: 3, appliesTo: [ATARA_MACHINE_ENTITY_TYPE], fields: electricalFields },
    { id: "pneumatic", labelKey: "property.section.pneumatic", order: 4, appliesTo: [ATARA_MACHINE_ENTITY_TYPE], fields: pneumaticFields },
    { id: "network", labelKey: "property.section.network", order: 5, appliesTo: [ATARA_MACHINE_ENTITY_TYPE], fields: networkFields },
    { id: "maintenance", labelKey: "property.section.maintenance", order: 6, appliesTo: [ATARA_MACHINE_ENTITY_TYPE], fields: maintenanceFields }
  ]
} satisfies PropertySchemaDefinition);

const readSourceValue = (source: PropertyProjectionSource): AtaraMachinePropertySourceValue => (
  source.value as AtaraMachinePropertySourceValue
);

const accessor = (
  id: string,
  read: (value: AtaraMachinePropertySourceValue) => PropertyAccessorResult
): PropertyAccessor => ({ id, read: (source) => read(readSourceValue(source)) });

const accessors: readonly PropertyAccessor[] = [
  accessor("atara.identity.manufacturer", ({ ataraMachineData }) => ({ value: ataraMachineData?.identity?.manufacturer })),
  accessor("atara.identity.is-atara-product", ({ ataraMachineData }) => ({ value: ataraMachineData?.identity?.isAtaraProduct })),
  accessor("atara.identity.atr-id", ({ ataraMachineData }) => ({ value: ataraMachineData?.identity?.atrId })),
  accessor("atara.identity.machine-code", ({ ataraMachineData }) => ({ value: ataraMachineData?.identity?.machineCode })),
  accessor("atara.identity.product-family-code", ({ ataraMachineData, machine }) => ({ value: ataraMachineData?.identity?.productFamilyCode ?? machine.definition.productFamilyCode })),
  accessor("atara.identity.pdn-code", ({ ataraMachineData }) => ({ value: ataraMachineData?.identity?.pdnCode })),
  accessor("atara.identity.revision", ({ ataraMachineData }) => ({ value: ataraMachineData?.identity?.revision })),
  accessor("atara.physical.width", ({ machine }) => ({ value: getMachineDimensionsMm(machine.definition).widthMm })),
  accessor("atara.physical.depth", ({ machine }) => ({ value: getMachineDimensionsMm(machine.definition).depthMm })),
  accessor("atara.physical.height", ({ machine }) => ({ value: getMachineDimensionsMm(machine.definition).heightMm })),
  accessor("atara.physical.weight", ({ ataraMachineData }) => ({ value: ataraMachineData?.physical?.weightKg })),
  accessor("atara.physical.operating-weight", ({ ataraMachineData }) => ({ value: ataraMachineData?.physical?.operatingWeightKg })),
  accessor("atara.capacity.minimum", ({ ataraMachineData }) => ({ value: ataraMachineData?.operationalData?.capacityMin, unitOverride: ataraMachineData?.operationalData?.capacityUnit })),
  accessor("atara.capacity.nominal", ({ ataraMachineData }) => ({ value: ataraMachineData?.operationalData?.capacityNominal, unitOverride: ataraMachineData?.operationalData?.capacityUnit })),
  accessor("atara.capacity.maximum", ({ ataraMachineData }) => ({ value: ataraMachineData?.operationalData?.capacityMax, unitOverride: ataraMachineData?.operationalData?.capacityUnit })),
  accessor("atara.electrical.power", ({ ataraMachineData }) => ({ value: ataraMachineData?.utilityRequirements?.electrical?.powerKw })),
  accessor("atara.electrical.voltage", ({ ataraMachineData }) => ({ value: ataraMachineData?.utilityRequirements?.electrical?.voltage })),
  accessor("atara.electrical.phase", ({ ataraMachineData }) => ({ value: ataraMachineData?.utilityRequirements?.electrical?.phase })),
  accessor("atara.electrical.frequency", ({ ataraMachineData }) => ({ value: ataraMachineData?.utilityRequirements?.electrical?.frequencyHz })),
  accessor("atara.electrical.current", ({ ataraMachineData }) => ({ value: ataraMachineData?.utilityRequirements?.electrical?.currentA })),
  accessor("atara.pneumatic.pressure", ({ ataraMachineData }) => ({ value: ataraMachineData?.utilityRequirements?.pneumatic?.pressureBar })),
  accessor("atara.pneumatic.consumption", ({ ataraMachineData }) => ({ value: ataraMachineData?.utilityRequirements?.pneumatic?.airConsumptionNlMin })),
  accessor("atara.pneumatic.connection", ({ ataraMachineData }) => ({ value: ataraMachineData?.utilityRequirements?.pneumatic?.connectionSize })),
  accessor("atara.network.protocols", ({ ataraMachineData }) => ({ value: ataraMachineData?.utilityRequirements?.network?.protocols?.join(", ") })),
  accessor("atara.maintenance.front", ({ ataraMachineData }) => ({ value: ataraMachineData?.maintenanceClearance?.frontMm })),
  accessor("atara.maintenance.back", ({ ataraMachineData }) => ({ value: ataraMachineData?.maintenanceClearance?.backMm })),
  accessor("atara.maintenance.left", ({ ataraMachineData }) => ({ value: ataraMachineData?.maintenanceClearance?.leftMm })),
  accessor("atara.maintenance.right", ({ ataraMachineData }) => ({ value: ataraMachineData?.maintenanceClearance?.rightMm })),
  accessor("atara.maintenance.top", ({ ataraMachineData }) => ({ value: ataraMachineData?.maintenanceClearance?.topMm }))
];

export const ATARA_MACHINE_PROPERTY_ACCESSORS = Object.freeze(accessors);
export const PROPERTY_VALIDATORS = createPropertyValidatorRegistry();
export const ATARA_MACHINE_PROPERTY_ACCESSOR_REGISTRY = createPropertyAccessorRegistry(ATARA_MACHINE_PROPERTY_ACCESSORS);
export const PROPERTY_SCHEMA_REGISTRY = createPropertySchemaRegistry({
  schemas: [ATARA_MACHINE_PROPERTY_SCHEMA],
  accessors: ATARA_MACHINE_PROPERTY_ACCESSOR_REGISTRY,
  validators: PROPERTY_VALIDATORS
});

export const createAtaraMachinePropertySource = (machine: PlacedMachine) => {
  const dimensionsMm = getMachineDimensionsMm(machine.definition);
  const snapshotData = normalizeAtaraMachineData(machine.definitionSnapshot.ataraMachineData, dimensionsMm);
  const definitionData = normalizeAtaraMachineData(machine.definition.ataraMachineData, dimensionsMm);
  return {
    entityId: `machine:${machine.instanceId}`,
    entityType: ATARA_MACHINE_ENTITY_TYPE,
    value: {
      machine,
      ataraMachineData: snapshotData ?? definitionData,
      hasNewerLibraryAtaraData: Boolean(!snapshotData && definitionData)
    } satisfies AtaraMachinePropertySourceValue
  } satisfies PropertyProjectionSource;
};

export const getAtaraMachinePropertySourceValue = (source: PropertyProjectionSource) => readSourceValue(source);

export const projectAtaraMachineProperties = (machine: PlacedMachine) => projectPropertySchema({
  schema: PROPERTY_SCHEMA_REGISTRY.get(ATARA_MACHINE_PROPERTY_SCHEMA_ID) as PropertySchemaDefinition,
  source: createAtaraMachinePropertySource(machine),
  accessors: ATARA_MACHINE_PROPERTY_ACCESSOR_REGISTRY,
  validators: PROPERTY_VALIDATORS
});
