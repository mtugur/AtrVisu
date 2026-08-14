import type { PlanPointMm } from "../utils/coordinateReference";

export const UNKNOWN_COMMERCIAL_VALUE = "Unknown" as const;

export type CommercialOutputMetadata = {
  projectId?: string;
  projectName: string;
  layoutId?: string;
  layoutName: string;
  revisionId?: string;
  revision: string;
  generatedAt: string;
  canonicalUnit: "mm";
};

export type CommercialOutputProperty = {
  propertyId: string;
  key: string;
  label: string;
  rawValue: string | number | boolean | null;
  displayValue: string;
  unitLabel?: string;
  missing: boolean;
};

export type CommercialOutputFootprint = {
  entityId: string;
  entityType: "machine" | "civil";
  name: string;
  cornersMm: readonly PlanPointMm[];
  rotationDeg: number;
  visible: boolean;
};

export type CommercialOutputEquipmentInstance = {
  entityId: string;
  instanceId: string;
  name: string;
  definitionIdentity: string;
  machineDefinitionId: string;
  libraryId?: string;
  bomGroupId: string;
  layer: string;
  groups: readonly string[];
  planXMm: number;
  planYMm: number;
  elevationMm: number;
  rotationDeg: number;
  widthMm: number;
  depthMm: number;
  heightMm: number;
  visible: boolean;
  footprint: CommercialOutputFootprint;
  bomProperties: readonly CommercialOutputProperty[];
  reportProperties: readonly CommercialOutputProperty[];
};

export type CommercialOutputBomGroup = {
  id: string;
  definitionIdentity: string;
  machineDefinitionId: string;
  libraryId?: string;
  name: string;
  quantity: number;
  properties: readonly CommercialOutputProperty[];
};

export type CommercialOutputExtents = {
  minXMm: number;
  maxXMm: number;
  minYMm: number;
  maxYMm: number;
  widthMm: number;
  depthMm: number;
};

export type CommercialOutputSnapshot = {
  metadata: CommercialOutputMetadata;
  equipment: readonly CommercialOutputEquipmentInstance[];
  bomGroups: readonly CommercialOutputBomGroup[];
  planFootprints: readonly CommercialOutputFootprint[];
  extents: CommercialOutputExtents | null;
  equipmentCount: number;
  bomGroupCount: number;
  dataGapCount: number;
  warnings: readonly string[];
};

export type CommercialOutputKind = "bom" | "plan" | "snapshot";
