import type {
  AtaraConnectionPointType,
  AtaraMachineData,
  AtaraMaintenanceClearance,
  MachineConnectionPoint
} from "../types/ataraMachineData";
import type { MachineDefinition } from "../types/machine";
import { normalizeCollisionEnvelope } from "./collision";
import { getMachineDimensionsMm } from "./machineDimensions";

const CONNECTION_POINT_TYPES = new Set<AtaraConnectionPointType>([
  "product-in",
  "product-out",
  "electrical",
  "pneumatic",
  "network",
  "aspiration",
  "dust-collection",
  "compressed-air",
  "other"
]);

const DIRECTIONS = new Set(["x+", "x-", "y+", "y-", "z+", "z-"]);

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === "object" && value !== null && !Array.isArray(value);
};

const text = (value: unknown) => (typeof value === "string" && value.trim() ? value.trim() : undefined);
const bool = (value: unknown) => (typeof value === "boolean" ? value : undefined);
const nonNegative = (value: unknown) => (typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : undefined);
const positive = (value: unknown) => (typeof value === "number" && Number.isFinite(value) && value > 0 ? value : undefined);
const stringList = (value: unknown) =>
  Array.isArray(value) ? value.flatMap((item) => (text(item) ? [text(item) as string] : [])) : undefined;

const compact = <T extends Record<string, unknown>>(value: T): Partial<T> | undefined => {
  const entries = Object.entries(value).filter(([, item]) => item !== undefined);
  return entries.length > 0 ? Object.fromEntries(entries) as Partial<T> : undefined;
};

export const normalizeConnectionPointType = (value: unknown): AtaraConnectionPointType => {
  return typeof value === "string" && CONNECTION_POINT_TYPES.has(value as AtaraConnectionPointType)
    ? value as AtaraConnectionPointType
    : "other";
};

const normalizeConnectionPoint = (value: unknown, index: number): MachineConnectionPoint | null => {
  if (!isRecord(value)) {
    return null;
  }

  const id = text(value.id) ?? `connection-${index + 1}`;
  const name = text(value.name);
  if (!name) {
    return null;
  }

  const position = isRecord(value.positionMm) ? value.positionMm : {};
  const size = isRecord(value.sizeMm)
    ? compact({
        widthMm: positive(value.sizeMm.widthMm),
        heightMm: positive(value.sizeMm.heightMm),
        diameterMm: positive(value.sizeMm.diameterMm)
      })
    : undefined;
  const metadata = isRecord(value.metadata)
    ? compact({
        voltage: nonNegative(value.metadata.voltage),
        powerKw: nonNegative(value.metadata.powerKw),
        airPressureBar: nonNegative(value.metadata.airPressureBar),
        airConsumptionNlMin: nonNegative(value.metadata.airConsumptionNlMin),
        protocol: text(value.metadata.protocol),
        description: text(value.metadata.description)
      })
    : undefined;
  const direction = typeof value.direction === "string" && DIRECTIONS.has(value.direction) ? value.direction : "z+";

  return {
    id,
    name,
    type: normalizeConnectionPointType(value.type),
    positionMm: {
      xMm: nonNegative(position.xMm) ?? 0,
      yMm: nonNegative(position.yMm) ?? 0,
      zMm: nonNegative(position.zMm) ?? 0
    },
    direction: direction as MachineConnectionPoint["direction"],
    ...(size ? { sizeMm: size } : {}),
    ...(metadata ? { metadata } : {})
  };
};

export const normalizeAtaraMachineData = (
  value: unknown,
  definitionDimensions?: { widthMm: number; depthMm: number; heightMm: number }
): AtaraMachineData | undefined => {
  if (!isRecord(value)) {
    return undefined;
  }

  const dimensions = definitionDimensions ?? {
    widthMm: positive(isRecord(value.physical) ? value.physical.widthMm : undefined) ?? 0,
    depthMm: positive(isRecord(value.physical) ? value.physical.depthMm : undefined) ?? 0,
    heightMm: positive(isRecord(value.physical) ? value.physical.heightMm : undefined) ?? 0
  };
  const physical = isRecord(value.physical)
    ? compact({
        widthMm: positive(value.physical.widthMm) ?? dimensions.widthMm,
        depthMm: positive(value.physical.depthMm) ?? dimensions.depthMm,
        heightMm: positive(value.physical.heightMm) ?? dimensions.heightMm,
        weightKg: nonNegative(value.physical.weightKg),
        operatingWeightKg: nonNegative(value.physical.operatingWeightKg),
        footprintNotes: text(value.physical.footprintNotes),
        maintenanceOpenDimensionsMm: isRecord(value.physical.maintenanceOpenDimensionsMm)
          ? compact({
              widthMm: positive(value.physical.maintenanceOpenDimensionsMm.widthMm),
              depthMm: positive(value.physical.maintenanceOpenDimensionsMm.depthMm),
              heightMm: positive(value.physical.maintenanceOpenDimensionsMm.heightMm)
            })
          : undefined
      })
    : undefined;
  const maintenance = isRecord(value.maintenanceClearance)
    ? {
        frontMm: nonNegative(value.maintenanceClearance.frontMm) ?? 0,
        backMm: nonNegative(value.maintenanceClearance.backMm) ?? 0,
        leftMm: nonNegative(value.maintenanceClearance.leftMm) ?? 0,
        rightMm: nonNegative(value.maintenanceClearance.rightMm) ?? 0,
        topMm: nonNegative(value.maintenanceClearance.topMm) ?? 0,
        ...(text(value.maintenanceClearance.notes) ? { notes: text(value.maintenanceClearance.notes) } : {})
      }
    : undefined;
  const connectionPoints = Array.isArray(value.connectionPoints)
    ? value.connectionPoints.flatMap((point, index) => {
        const normalized = normalizeConnectionPoint(point, index);
        return normalized ? [normalized] : [];
      })
    : undefined;
  const utility = isRecord(value.utilityRequirements)
    ? compact({
        electrical: isRecord(value.utilityRequirements.electrical)
          ? compact({
              powerKw: nonNegative(value.utilityRequirements.electrical.powerKw),
              voltage: nonNegative(value.utilityRequirements.electrical.voltage),
              phase: text(value.utilityRequirements.electrical.phase),
              frequencyHz: nonNegative(value.utilityRequirements.electrical.frequencyHz),
              currentA: nonNegative(value.utilityRequirements.electrical.currentA),
              notes: text(value.utilityRequirements.electrical.notes)
            })
          : undefined,
        pneumatic: isRecord(value.utilityRequirements.pneumatic)
          ? compact({
              pressureBar: nonNegative(value.utilityRequirements.pneumatic.pressureBar),
              airConsumptionNlMin: nonNegative(value.utilityRequirements.pneumatic.airConsumptionNlMin),
              connectionSize: text(value.utilityRequirements.pneumatic.connectionSize),
              notes: text(value.utilityRequirements.pneumatic.notes)
            })
          : undefined,
        network: isRecord(value.utilityRequirements.network)
          ? compact({
              protocols: stringList(value.utilityRequirements.network.protocols),
              notes: text(value.utilityRequirements.network.notes)
            })
          : undefined,
        aspiration: isRecord(value.utilityRequirements.aspiration)
          ? compact({
              required: bool(value.utilityRequirements.aspiration.required),
              airflowM3h: nonNegative(value.utilityRequirements.aspiration.airflowM3h),
              connectionDiameterMm: positive(value.utilityRequirements.aspiration.connectionDiameterMm),
              notes: text(value.utilityRequirements.aspiration.notes)
            })
          : undefined
      })
    : undefined;
  const operational = isRecord(value.operationalData)
    ? compact({
        capacityMin: nonNegative(value.operationalData.capacityMin),
        capacityNominal: nonNegative(value.operationalData.capacityNominal),
        capacityMax: nonNegative(value.operationalData.capacityMax),
        capacityUnit: text(value.operationalData.capacityUnit),
        productTypes: stringList(value.operationalData.productTypes),
        noiseDb: nonNegative(value.operationalData.noiseDb),
        vibrationClass: text(value.operationalData.vibrationClass),
        notes: text(value.operationalData.notes)
      })
    : undefined;
  const normalized = compact({
    identity: isRecord(value.identity)
      ? compact({
          atrId: text(value.identity.atrId),
          machineCode: text(value.identity.machineCode),
          productFamilyCode: text(value.identity.productFamilyCode),
          pdnCode: text(value.identity.pdnCode),
          displayName: text(value.identity.displayName),
          revision: text(value.identity.revision),
          manufacturer: text(value.identity.manufacturer),
          isAtaraProduct: bool(value.identity.isAtaraProduct)
        })
      : undefined,
    physical,
    maintenanceClearance: maintenance,
    connectionPoints,
    utilityRequirements: utility,
    operationalData: operational,
    collisionEnvelope: isRecord(value.collisionEnvelope) ? normalizeCollisionEnvelope(value.collisionEnvelope, dimensions) : undefined,
    clearanceEnvelope: isRecord(value.clearanceEnvelope)
      ? {
          frontMm: nonNegative(value.clearanceEnvelope.frontMm) ?? 0,
          backMm: nonNegative(value.clearanceEnvelope.backMm) ?? 0,
          leftMm: nonNegative(value.clearanceEnvelope.leftMm) ?? 0,
          rightMm: nonNegative(value.clearanceEnvelope.rightMm) ?? 0,
          topMm: nonNegative(value.clearanceEnvelope.topMm)
        }
      : undefined,
    operationalEnvelope: isRecord(value.operationalEnvelope) ? normalizeCollisionEnvelope(value.operationalEnvelope, dimensions) : undefined
  });

  return normalized as AtaraMachineData | undefined;
};

export const validateAtaraMachineData = (value: unknown) => ({
  valid: value === undefined || normalizeAtaraMachineData(value) !== undefined,
  normalized: normalizeAtaraMachineData(value)
});

export const getEffectiveMachineDimensions = (definition: MachineDefinition) => {
  const dimensions = getMachineDimensionsMm(definition);
  const physical = normalizeAtaraMachineData(definition.ataraMachineData, dimensions)?.physical;
  return {
    widthMm: positive(physical?.widthMm) ?? dimensions.widthMm,
    depthMm: positive(physical?.depthMm) ?? dimensions.depthMm,
    heightMm: positive(physical?.heightMm) ?? dimensions.heightMm
  };
};

export const getEffectiveMaintenanceClearance = (definition: MachineDefinition): AtaraMaintenanceClearance => {
  const data = normalizeAtaraMachineData(definition.ataraMachineData, getMachineDimensionsMm(definition));
  return data?.maintenanceClearance ?? {
    frontMm: 0,
    backMm: 0,
    leftMm: 0,
    rightMm: 0,
    topMm: 0
  };
};

export const getConnectionPointsByType = (
  data: AtaraMachineData | undefined,
  type: AtaraConnectionPointType
) => {
  return (normalizeAtaraMachineData(data)?.connectionPoints ?? []).filter((point) => point.type === type);
};

export const summarizeUtilityRequirements = (data: AtaraMachineData | undefined) => {
  const utility = normalizeAtaraMachineData(data)?.utilityRequirements;
  const parts = [
    utility?.electrical?.powerKw !== undefined ? `${utility.electrical.powerKw} kW` : "",
    utility?.electrical?.voltage !== undefined ? `${utility.electrical.voltage} V` : "",
    utility?.pneumatic?.pressureBar !== undefined ? `${utility.pneumatic.pressureBar} bar` : "",
    utility?.pneumatic?.airConsumptionNlMin !== undefined ? `${utility.pneumatic.airConsumptionNlMin} Nl/min` : "",
    utility?.network?.protocols?.length ? `Network: ${utility.network.protocols.join(", ")}` : "",
    utility?.aspiration?.required ? `Aspiration${utility.aspiration.airflowM3h ? ` ${utility.aspiration.airflowM3h} m3/h` : ""}` : ""
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(" | ") : "No utility requirements assigned.";
};
