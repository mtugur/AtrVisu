export const PROPERTY_FIELD_DATA_TYPES = ["string", "number", "boolean", "enum", "text"] as const;
export type PropertyFieldDataType = (typeof PROPERTY_FIELD_DATA_TYPES)[number];

export type PropertyAllowedValue = string | number | boolean;

export type PropertyValidationDefinition = {
  min?: number;
  max?: number;
  step?: number;
  pattern?: string;
  allowedValues?: readonly PropertyAllowedValue[];
  validatorId?: string;
};

export const PROPERTY_EXPORT_TARGETS = ["bom", "report"] as const;
export type PropertyExportTarget = (typeof PROPERTY_EXPORT_TARGETS)[number];

export type PropertyExportMapping = {
  target: PropertyExportTarget;
  key: string;
};

export type PropertyExportMappings = readonly PropertyExportMapping[];

export type PropertyFieldDefinition = {
  id: string;
  path: string;
  accessorId?: string;
  labelKey: string;
  descriptionKey?: string;
  helpKey?: string;
  dataType: PropertyFieldDataType;
  unit?: string;
  editable: boolean;
  required: boolean;
  validation?: PropertyValidationDefinition;
  exportMappings?: PropertyExportMappings;
};

export type PropertySectionDefinition = {
  id: string;
  labelKey: string;
  descriptionKey?: string;
  order: number;
  appliesTo: readonly string[];
  fields: readonly PropertyFieldDefinition[];
};

export const PROPERTY_SCHEMA_VERSION = 1 as const;

export type PropertySchemaDefinition = {
  schemaVersion: typeof PROPERTY_SCHEMA_VERSION;
  id: string;
  labelKey: string;
  descriptionKey?: string;
  sections: readonly PropertySectionDefinition[];
};
