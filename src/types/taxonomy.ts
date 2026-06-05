export type MachineCapabilities = {
  canConvey: boolean;
  canPalletize: boolean;
  canWrap: boolean;
  hasFlowDirection: boolean;
  canWeigh: boolean;
  canDose: boolean;
  canInspect: boolean;
  canStore: boolean;
  canElevate: boolean;
  connectsLevels: boolean;
  mobileEquipment: boolean;
  collisionRelevant: boolean;
  requiresTravelPath: boolean;
  buildingObstacle: boolean;
  safetyEquipment: boolean;
  instrumentation: boolean;
};

export type TaxonomyCategory = {
  id: string;
  name: string;
  readonly?: boolean;
};

export type MachineTypeDefinition = {
  id: string;
  name: string;
  categoryId: string;
  readonly?: boolean;
};

export type PlaceholderVisualType = {
  id: string;
  name: string;
  readonly?: boolean;
};

export type ProductFamilyCode = {
  code: string;
  name: string;
  description: string;
  readonly?: boolean;
};

export type MachineTaxonomy = {
  version: 1;
  categories: TaxonomyCategory[];
  machineTypes: MachineTypeDefinition[];
  placeholderVisualTypes: PlaceholderVisualType[];
  productFamilyCodes: ProductFamilyCode[];
  defaultCapabilities: MachineCapabilities;
};
