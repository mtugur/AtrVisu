import type { ClearanceEnvelope, CollisionEnvelope } from "./collision";

export type AtaraConnectionPointType =
  | "product-in"
  | "product-out"
  | "electrical"
  | "pneumatic"
  | "network"
  | "aspiration"
  | "dust-collection"
  | "compressed-air"
  | "other";

export type AtaraConnectionDirection = "x+" | "x-" | "y+" | "y-" | "z+" | "z-";

export type MachineConnectionPoint = {
  id: string;
  name: string;
  type: AtaraConnectionPointType;
  positionMm: {
    xMm: number;
    yMm: number;
    zMm: number;
  };
  direction: AtaraConnectionDirection;
  sizeMm?: {
    widthMm?: number;
    heightMm?: number;
    diameterMm?: number;
  };
  metadata?: {
    voltage?: number;
    powerKw?: number;
    airPressureBar?: number;
    airConsumptionNlMin?: number;
    protocol?: string;
    description?: string;
  };
};

export type AtaraMachineIdentity = {
  atrId?: string;
  machineCode?: string;
  productFamilyCode?: string;
  pdnCode?: string;
  displayName?: string;
  revision?: string;
  manufacturer?: string;
  isAtaraProduct?: boolean;
};

export type AtaraPhysicalData = {
  widthMm: number;
  depthMm: number;
  heightMm: number;
  weightKg?: number;
  operatingWeightKg?: number;
  footprintNotes?: string;
  maintenanceOpenDimensionsMm?: {
    widthMm?: number;
    depthMm?: number;
    heightMm?: number;
  };
};

export type AtaraMaintenanceClearance = {
  frontMm: number;
  backMm: number;
  leftMm: number;
  rightMm: number;
  topMm: number;
  notes?: string;
};

export type AtaraUtilityRequirements = {
  electrical?: {
    powerKw?: number;
    voltage?: number;
    phase?: string;
    frequencyHz?: number;
    currentA?: number;
    notes?: string;
  };
  pneumatic?: {
    pressureBar?: number;
    airConsumptionNlMin?: number;
    connectionSize?: string;
    notes?: string;
  };
  network?: {
    protocols?: string[];
    notes?: string;
  };
  aspiration?: {
    required?: boolean;
    airflowM3h?: number;
    connectionDiameterMm?: number;
    notes?: string;
  };
};

export type AtaraOperationalData = {
  capacityMin?: number;
  capacityNominal?: number;
  capacityMax?: number;
  capacityUnit?: string;
  productTypes?: string[];
  noiseDb?: number;
  vibrationClass?: string;
  notes?: string;
};

export type AtaraMachineData = {
  identity?: AtaraMachineIdentity;
  physical?: AtaraPhysicalData;
  maintenanceClearance?: AtaraMaintenanceClearance;
  connectionPoints?: MachineConnectionPoint[];
  utilityRequirements?: AtaraUtilityRequirements;
  operationalData?: AtaraOperationalData;
  collisionEnvelope?: CollisionEnvelope;
  clearanceEnvelope?: ClearanceEnvelope;
  operationalEnvelope?: CollisionEnvelope;
};
