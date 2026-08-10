import type {
  PropertyExportMappings,
  PropertyFieldDataType,
  PropertyFieldDefinition,
  PropertySchemaDefinition
} from "../platform/contracts";

export type PropertyPrimitiveValue = string | number | boolean;

export type PropertyProjectionSource = {
  entityId: string;
  entityType: string;
  value: unknown;
};

export type PropertyAccessorResult = {
  value: PropertyPrimitiveValue | undefined;
  unitOverride?: string;
};

export type PropertyAccessor = {
  id: string;
  read: (source: PropertyProjectionSource) => PropertyAccessorResult;
};

export type PropertyValidationIssue = {
  code: string;
  severity: "error";
  propertyId: string;
  messageKey: string;
  params?: Readonly<Record<string, string | number | boolean>>;
};

export type PropertyCustomValidator = {
  id: string;
  validate: (
    value: PropertyPrimitiveValue | undefined,
    field: PropertyFieldDefinition,
    source: PropertyProjectionSource
  ) => readonly PropertyValidationIssue[];
};

export type PropertyFieldViewModel = {
  id: string;
  label: string;
  description?: string;
  help?: string;
  dataType: PropertyFieldDataType;
  rawValue: PropertyPrimitiveValue | undefined;
  displayValue: string;
  unitLabel?: string;
  missing: boolean;
  editable: boolean;
  required: boolean;
  issues: readonly PropertyValidationIssue[];
  exportMappings: PropertyExportMappings;
};

export type PropertySectionViewModel = {
  id: string;
  label: string;
  description?: string;
  fields: readonly PropertyFieldViewModel[];
};

export type PropertyProjection = {
  schemaId: string;
  schemaVersion: number;
  entityId: string;
  label: string;
  description?: string;
  sections: readonly PropertySectionViewModel[];
  issueCount: number;
};

export type RegisteredPropertySchema = Readonly<PropertySchemaDefinition>;
