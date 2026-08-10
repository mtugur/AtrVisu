import { describe, expect, it, vi } from "vitest";
import {
  PROPERTY_SCHEMA_VERSION,
  type PropertyFieldDefinition,
  type PropertySchemaDefinition
} from "../platform/contracts";
import { validatePropertySchemaDefinition } from "../platform/phase1ArchitectureValidation";
import { resolvePropertyMessage } from "./localization";
import { projectPropertySchema } from "./projection";
import {
  PropertySchemaRegistryError,
  createPropertyAccessorRegistry,
  createPropertySchemaRegistry
} from "./registry";
import { formatPropertyNumber, parsePropertyNumber } from "./units";
import {
  createPropertyValidatorRegistry,
  validatePropertyValue
} from "./validation";

const source = { entityId: "machine:test", entityType: "entity.machine", value: {} } as const;

const baseField = (overrides: Partial<PropertyFieldDefinition> = {}): PropertyFieldDefinition => ({
  id: "test.identity.name",
  path: "identity.name",
  accessorId: "test.identity.name",
  labelKey: "property.field.machine-code",
  dataType: "string",
  editable: false,
  required: false,
  exportMappings: [{ target: "bom", key: "machineCode" }],
  ...overrides
});

const schema = (field = baseField()): PropertySchemaDefinition => ({
  schemaVersion: PROPERTY_SCHEMA_VERSION,
  id: "schema.test.machine",
  labelKey: "property.schema.atara-machine.label",
  sections: [{
    id: "identity",
    labelKey: "property.section.identity",
    order: 0,
    appliesTo: ["entity.machine"],
    fields: [field]
  }]
});

const accessors = (value: string | number | boolean | undefined) => createPropertyAccessorRegistry([{
  id: "test.identity.name",
  read: () => ({ value })
}]);

const validators = createPropertyValidatorRegistry();

const expectRegistryCode = (action: () => unknown, code: PropertySchemaRegistryError["code"]) => {
  expect(action).toThrowError(expect.objectContaining({ code }));
};

describe("property schema runtime contracts", () => {
  it("resolves bounded localization keys and exposes missing keys explicitly", () => {
    expect(resolvePropertyMessage("property.field.machine-code")).toBe("Machine Code");
    expect(resolvePropertyMessage("property.missing.key")).toBe("[property.missing.key]");
  });

  it("formats and parses canonical values without silent unit coercion", () => {
    expect(formatPropertyNumber(1250, "mm")).toBe("1250 mm");
    expect(formatPropertyNumber(3.456, "bar")).toBe("3.46 bar");
    expect(parsePropertyNumber("-200", "mm")).toEqual({ ok: true, value: -200 });
    expect(parsePropertyNumber("2.5", "bar")).toEqual({ ok: true, value: 2.5 });
    expect(parsePropertyNumber("2,5", "bar")).toEqual({ ok: false, code: "property.parse.invalid" });
    expect(parsePropertyNumber("20 mm", "mm")).toEqual({ ok: false, code: "property.parse.invalid" });
    expect(parsePropertyNumber("20", "future-unit")).toEqual({ ok: false, code: "property.parse.unknown_unit" });
  });

  it("projects one normalized Inspector/export view through registered accessors", () => {
    const registry = createPropertySchemaRegistry({ schemas: [schema()], accessors: accessors("CP-01"), validators });
    const projection = projectPropertySchema({
      schema: registry.get("schema.test.machine")!,
      source,
      accessors: accessors("CP-01"),
      validators
    });

    expect(projection).toMatchObject({
      schemaId: "schema.test.machine",
      entityId: "machine:test",
      label: "Smart Asset Properties",
      issueCount: 0
    });
    expect(projection.sections[0].fields[0]).toMatchObject({
      id: "test.identity.name",
      label: "Machine Code",
      rawValue: "CP-01",
      displayValue: "CP-01",
      editable: false,
      exportMappings: [{ target: "bom", key: "machineCode" }]
    });
  });

  it("keeps missing values explicit instead of inventing defaults", () => {
    const registry = createPropertySchemaRegistry({ schemas: [schema()], accessors: accessors(undefined), validators });
    const projection = projectPropertySchema({
      schema: registry.get("schema.test.machine")!,
      source,
      accessors: accessors(undefined),
      validators
    });
    expect(projection.sections[0].fields[0]).toMatchObject({
      rawValue: undefined,
      displayValue: "Not available",
      missing: true
    });
  });

  it("runs pure declarative and registered validation with structured issues", () => {
    const field = baseField({
      dataType: "number",
      required: true,
      validation: { min: 10, max: 20, step: 2, validatorId: "validator.even" }
    });
    const custom = vi.fn(() => []);
    const registry = createPropertyValidatorRegistry([{ id: "validator.even", validate: custom }]);
    expect(validatePropertyValue(field, 13, source, registry).map(({ code }) => code)).toEqual(["property.step"]);
    expect(custom).toHaveBeenCalledOnce();
    expect(validatePropertyValue(field, undefined, source, registry)).toEqual([expect.objectContaining({
      code: "property.required",
      propertyId: field.id,
      severity: "error"
    })]);
    expect(validatePropertyValue(field, Number.NaN, source, registry)).toEqual([
      expect.objectContaining({ code: "property.type" })
    ]);
    expect(validatePropertyValue(baseField({ required: true }), "   ", source, validators)).toEqual([
      expect.objectContaining({ code: "property.required" })
    ]);
  });

  it("resolves optional schema descriptions and field help through the same catalog", () => {
    const describedSchema = {
      ...schema(baseField({
        descriptionKey: "property.schema.atara-machine.description",
        helpKey: "property.validation.required"
      })),
      descriptionKey: "property.schema.atara-machine.description"
    };
    const registry = createPropertySchemaRegistry({
      schemas: [describedSchema],
      accessors: accessors("CP-01"),
      validators
    });
    const projection = projectPropertySchema({
      schema: registry.get(describedSchema.id)!,
      source,
      accessors: accessors("CP-01"),
      validators
    });
    expect(projection.description).toBe("Canonical engineering and commercial machine data.");
    expect(projection.sections[0].fields[0]).toMatchObject({
      description: "Canonical engineering and commercial machine data.",
      help: "A value is required."
    });
  });

  it("rejects unsupported versions, malformed schemas, duplicate schemas, and missing accessors", () => {
    expectRegistryCode(() => createPropertySchemaRegistry({
      schemas: [{ ...schema(), schemaVersion: 2 }], accessors: accessors("CP-01"), validators
    }), "PROPERTY_SCHEMA_UNSUPPORTED_VERSION");
    expectRegistryCode(() => createPropertySchemaRegistry({
      schemas: [{ ...schema(), schemaVersion: "1" }], accessors: accessors("CP-01"), validators
    }), "PROPERTY_SCHEMA_INVALID");
    expectRegistryCode(() => createPropertySchemaRegistry({
      schemas: [{ ...schema(), id: "Invalid" }], accessors: accessors("CP-01"), validators
    }), "PROPERTY_SCHEMA_INVALID");
    expectRegistryCode(() => createPropertySchemaRegistry({
      schemas: [schema(), schema()], accessors: accessors("CP-01"), validators
    }), "PROPERTY_SCHEMA_DUPLICATE_ID");
    expectRegistryCode(() => createPropertySchemaRegistry({
      schemas: [schema()], accessors: createPropertyAccessorRegistry([]), validators
    }), "PROPERTY_SCHEMA_ACCESSOR_MISSING");
  });

  it("rejects unknown validators, units, localization keys, and duplicate accessor IDs", () => {
    expectRegistryCode(() => createPropertySchemaRegistry({
      schemas: [schema(baseField({ validation: { validatorId: "validator.unknown" } }))],
      accessors: accessors("CP-01"),
      validators
    }), "PROPERTY_SCHEMA_VALIDATOR_UNKNOWN");
    expectRegistryCode(() => createPropertySchemaRegistry({
      schemas: [schema(baseField({ unit: "future-unit" }))],
      accessors: accessors("CP-01"),
      validators
    }), "PROPERTY_SCHEMA_UNIT_UNKNOWN");
    expectRegistryCode(() => createPropertySchemaRegistry({
      schemas: [schema(baseField({ labelKey: "property.field.not-registered" }))],
      accessors: accessors("CP-01"),
      validators
    }), "PROPERTY_SCHEMA_LOCALIZATION_MISSING");
    expectRegistryCode(() => createPropertyAccessorRegistry([
      { id: "duplicate.accessor", read: () => ({ value: 1 }) },
      { id: "duplicate.accessor", read: () => ({ value: 2 }) }
    ]), "PROPERTY_ACCESSOR_DUPLICATE_ID");
  });

  it("rejects duplicate property IDs across sections and invalid allowed-value types", () => {
    const duplicateAcrossSections = {
      ...schema(),
      sections: [
        schema().sections[0],
        { ...schema().sections[0], id: "other", order: 1 }
      ]
    };
    expect(validatePropertySchemaDefinition(duplicateAcrossSections)).toEqual(expect.objectContaining({
      valid: false,
      errors: expect.arrayContaining([expect.objectContaining({ code: "property.duplicate_field_id" })])
    }));
    expect(validatePropertySchemaDefinition(schema(baseField({
      dataType: "enum",
      validation: { allowedValues: [1, 2] }
    })))).toEqual(expect.objectContaining({
      valid: false,
      errors: expect.arrayContaining([expect.objectContaining({ code: "property.allowed_value_type" })])
    }));
  });
});
