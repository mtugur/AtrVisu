import type { PropertyFieldDefinition } from "../platform/contracts";
import type {
  PropertyCustomValidator,
  PropertyPrimitiveValue,
  PropertyProjectionSource,
  PropertyValidationIssue
} from "./types";

export class PropertyValidatorRegistryError extends Error {
  constructor(public readonly code: "PROPERTY_VALIDATOR_DUPLICATE_ID", message: string) {
    super(message);
    this.name = "PropertyValidatorRegistryError";
  }
}

export type PropertyValidatorRegistry = {
  has: (id: string) => boolean;
  get: (id: string) => PropertyCustomValidator | undefined;
};

export const createPropertyValidatorRegistry = (
  validators: readonly PropertyCustomValidator[] = []
): PropertyValidatorRegistry => {
  const byId = new Map<string, PropertyCustomValidator>();
  validators.forEach((validator) => {
    if (byId.has(validator.id)) {
      throw new PropertyValidatorRegistryError(
        "PROPERTY_VALIDATOR_DUPLICATE_ID",
        `Duplicate property validator: ${validator.id}`
      );
    }
    byId.set(validator.id, validator);
  });
  return Object.freeze({
    has: (id: string) => byId.has(id),
    get: (id: string) => byId.get(id)
  });
};

const issue = (field: PropertyFieldDefinition, code: string, messageKey: string): PropertyValidationIssue => ({
  code,
  severity: "error",
  propertyId: field.id,
  messageKey
});

const isMissing = (value: PropertyPrimitiveValue | undefined) => (
  value === undefined || (typeof value === "string" && value.trim() === "")
);

export const validatePropertyValue = (
  field: PropertyFieldDefinition,
  value: PropertyPrimitiveValue | undefined,
  source: PropertyProjectionSource,
  validators: PropertyValidatorRegistry
): readonly PropertyValidationIssue[] => {
  if (isMissing(value)) {
    return field.required ? [issue(field, "property.required", "property.validation.required")] : [];
  }

  const expectedType = field.dataType === "number"
    ? "number"
    : field.dataType === "boolean"
      ? "boolean"
      : "string";
  if (typeof value !== expectedType || (typeof value === "number" && !Number.isFinite(value))) {
    return [issue(field, "property.type", "property.validation.type")];
  }

  const issues: PropertyValidationIssue[] = [];
  const validation = field.validation;
  if (typeof value === "number" && validation) {
    if (validation.min !== undefined && value < validation.min) {
      issues.push(issue(field, "property.min", "property.validation.min"));
    }
    if (validation.max !== undefined && value > validation.max) {
      issues.push(issue(field, "property.max", "property.validation.max"));
    }
    if (validation.step !== undefined) {
      const origin = validation.min ?? 0;
      const quotient = (value - origin) / validation.step;
      if (Math.abs(quotient - Math.round(quotient)) > 1e-9) {
        issues.push(issue(field, "property.step", "property.validation.step"));
      }
    }
  }
  if (typeof value === "string" && validation?.pattern && !new RegExp(validation.pattern).test(value)) {
    issues.push(issue(field, "property.pattern", "property.validation.pattern"));
  }
  if (validation?.allowedValues && !validation.allowedValues.some((candidate) => candidate === value)) {
    issues.push(issue(field, "property.allowed", "property.validation.allowed"));
  }
  if (validation?.validatorId) {
    const validator = validators.get(validation.validatorId);
    if (validator) {
      issues.push(...validator.validate(value, field, source));
    }
  }
  return issues;
};
