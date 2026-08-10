import { PROPERTY_SCHEMA_VERSION, type PropertySchemaDefinition } from "../platform/contracts";
import { validatePropertySchemaDefinition } from "../platform/phase1ArchitectureValidation";
import { hasPropertyMessage } from "./localization";
import type { PropertyAccessor, PropertyProjectionSource, RegisteredPropertySchema } from "./types";
import { hasPropertyUnit } from "./units";
import type { PropertyValidatorRegistry } from "./validation";

export type PropertySchemaRegistryErrorCode =
  | "PROPERTY_SCHEMA_UNSUPPORTED_VERSION"
  | "PROPERTY_SCHEMA_INVALID"
  | "PROPERTY_SCHEMA_DUPLICATE_ID"
  | "PROPERTY_SCHEMA_ACCESSOR_MISSING"
  | "PROPERTY_SCHEMA_VALIDATOR_UNKNOWN"
  | "PROPERTY_SCHEMA_LOCALIZATION_MISSING"
  | "PROPERTY_SCHEMA_UNIT_UNKNOWN"
  | "PROPERTY_ACCESSOR_DUPLICATE_ID";

export class PropertySchemaRegistryError extends Error {
  constructor(public readonly code: PropertySchemaRegistryErrorCode, message: string) {
    super(message);
    this.name = "PropertySchemaRegistryError";
  }
}

export type PropertyAccessorRegistry = {
  has: (id: string) => boolean;
  read: (id: string, source: PropertyProjectionSource) => ReturnType<PropertyAccessor["read"]>;
};

export const createPropertyAccessorRegistry = (
  accessors: readonly PropertyAccessor[]
): PropertyAccessorRegistry => {
  const byId = new Map<string, PropertyAccessor>();
  accessors.forEach((accessor) => {
    if (byId.has(accessor.id)) {
      throw new PropertySchemaRegistryError("PROPERTY_ACCESSOR_DUPLICATE_ID", `Duplicate property accessor: ${accessor.id}`);
    }
    byId.set(accessor.id, accessor);
  });
  return Object.freeze({
    has: (id: string) => byId.has(id),
    read: (id: string, source: PropertyProjectionSource) => {
      const accessor = byId.get(id);
      if (!accessor) {
        throw new PropertySchemaRegistryError("PROPERTY_SCHEMA_ACCESSOR_MISSING", `Unknown property accessor: ${id}`);
      }
      return accessor.read(source);
    }
  });
};

export type PropertySchemaRegistry = {
  get: (id: string) => RegisteredPropertySchema | undefined;
  list: () => readonly RegisteredPropertySchema[];
};

const createCanonicalSchemaSnapshot = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return Object.freeze(value.map((item) => createCanonicalSchemaSnapshot(item)));
  }
  if (typeof value === "object" && value !== null) {
    const snapshot = Object.fromEntries(
      Object.entries(value).map(([key, nestedValue]) => [key, createCanonicalSchemaSnapshot(nestedValue)])
    );
    return Object.freeze(snapshot);
  }
  return value;
};

const messageKeys = (schema: PropertySchemaDefinition) => [
  schema.labelKey,
  schema.descriptionKey,
  ...schema.sections.flatMap((section) => [
    section.labelKey,
    section.descriptionKey,
    ...section.fields.flatMap((field) => [field.labelKey, field.descriptionKey, field.helpKey])
  ])
].filter((key): key is string => Boolean(key));

export const createPropertySchemaRegistry = (options: {
  schemas: readonly unknown[];
  accessors: PropertyAccessorRegistry;
  validators: PropertyValidatorRegistry;
}): PropertySchemaRegistry => {
  const byId = new Map<string, RegisteredPropertySchema>();
  options.schemas.forEach((input) => {
    if (
      typeof input === "object"
      && input !== null
      && "schemaVersion" in input
      && typeof input.schemaVersion === "number"
      && Number.isInteger(input.schemaVersion)
      && input.schemaVersion > PROPERTY_SCHEMA_VERSION
    ) {
      throw new PropertySchemaRegistryError(
        "PROPERTY_SCHEMA_UNSUPPORTED_VERSION",
        `Unsupported property schema version: ${String(input.schemaVersion)}`
      );
    }
    const validation = validatePropertySchemaDefinition(input);
    if (!validation.valid) {
      throw new PropertySchemaRegistryError(
        "PROPERTY_SCHEMA_INVALID",
        validation.errors.map((error) => `${error.code}:${error.path}`).join(", ")
      );
    }
    const schema = input as PropertySchemaDefinition;
    if (byId.has(schema.id)) {
      throw new PropertySchemaRegistryError("PROPERTY_SCHEMA_DUPLICATE_ID", `Duplicate property schema: ${schema.id}`);
    }
    schema.sections.forEach((section) => section.fields.forEach((field) => {
      if (!field.accessorId || !options.accessors.has(field.accessorId)) {
        throw new PropertySchemaRegistryError(
          "PROPERTY_SCHEMA_ACCESSOR_MISSING",
          `Property ${field.id} requires a registered accessor.`
        );
      }
      if (field.validation?.validatorId && !options.validators.has(field.validation.validatorId)) {
        throw new PropertySchemaRegistryError(
          "PROPERTY_SCHEMA_VALIDATOR_UNKNOWN",
          `Property ${field.id} references unknown validator ${field.validation.validatorId}.`
        );
      }
      if (field.unit && !hasPropertyUnit(field.unit)) {
        throw new PropertySchemaRegistryError("PROPERTY_SCHEMA_UNIT_UNKNOWN", `Property ${field.id} uses unknown unit ${field.unit}.`);
      }
    }));
    const missingMessage = messageKeys(schema).find((key) => !hasPropertyMessage(key));
    if (missingMessage) {
      throw new PropertySchemaRegistryError(
        "PROPERTY_SCHEMA_LOCALIZATION_MISSING",
        `Property schema message is not registered: ${missingMessage}`
      );
    }
    const canonicalSchema = createCanonicalSchemaSnapshot(schema) as RegisteredPropertySchema;
    byId.set(canonicalSchema.id, canonicalSchema);
  });
  return Object.freeze({
    get: (id: string) => byId.get(id),
    list: () => Object.freeze([...byId.values()])
  });
};
