import type { PropertyFieldDefinition } from "../platform/contracts";
import { resolvePropertyMessage, type PropertyLocale } from "./localization";
import type { PropertyAccessorRegistry } from "./registry";
import type {
  PropertyFieldViewModel,
  PropertyPrimitiveValue,
  PropertyProjection,
  PropertyProjectionSource,
  RegisteredPropertySchema
} from "./types";
import { formatPropertyNumber, resolvePropertyUnitLabel } from "./units";
import { validatePropertyValue, type PropertyValidatorRegistry } from "./validation";

const formatValue = (
  field: PropertyFieldDefinition,
  value: PropertyPrimitiveValue | undefined,
  unitOverride: string | undefined,
  locale: PropertyLocale
) => {
  if (value === undefined || (typeof value === "string" && value.trim() === "")) {
    return resolvePropertyMessage("property.value.unknown", locale);
  }
  if (typeof value === "boolean") {
    return resolvePropertyMessage(value ? "property.value.yes" : "property.value.no", locale);
  }
  if (typeof value === "number") {
    return formatPropertyNumber(value, field.unit, unitOverride, locale)
      ?? resolvePropertyMessage("property.value.unknown", locale);
  }
  return value;
};

export const projectPropertySchema = (options: {
  schema: RegisteredPropertySchema;
  source: PropertyProjectionSource;
  accessors: PropertyAccessorRegistry;
  validators: PropertyValidatorRegistry;
  locale?: PropertyLocale;
  canEdit?: (propertyId: string) => boolean;
}): PropertyProjection => {
  const locale = options.locale ?? "en";
  const sections = options.schema.sections
    .filter((section) => section.appliesTo.includes(options.source.entityType))
    .slice()
    .sort((left, right) => left.order - right.order)
    .map((section) => ({
      id: section.id,
      label: resolvePropertyMessage(section.labelKey, locale),
      ...(section.descriptionKey ? { description: resolvePropertyMessage(section.descriptionKey, locale) } : {}),
      fields: section.fields.map((field): PropertyFieldViewModel => {
        const resolved = options.accessors.read(field.accessorId as string, options.source);
        const issues = validatePropertyValue(field, resolved.value, options.source, options.validators);
        return {
          id: field.id,
          label: resolvePropertyMessage(field.labelKey, locale),
          ...(field.descriptionKey ? { description: resolvePropertyMessage(field.descriptionKey, locale) } : {}),
          ...(field.helpKey ? { help: resolvePropertyMessage(field.helpKey, locale) } : {}),
          dataType: field.dataType,
          rawValue: resolved.value,
          displayValue: formatValue(field, resolved.value, resolved.unitOverride, locale),
          ...(field.unit
            ? { unitLabel: resolvePropertyUnitLabel(field.unit, locale) }
            : resolved.unitOverride ? { unitLabel: resolved.unitOverride } : {}),
          missing: resolved.value === undefined
            || (typeof resolved.value === "string" && resolved.value.trim() === ""),
          editable: field.editable && Boolean(options.canEdit?.(field.id)),
          required: field.required,
          issues,
          exportMappings: field.exportMappings ?? []
        };
      })
    }));
  return {
    schemaId: options.schema.id,
    schemaVersion: options.schema.schemaVersion,
    entityId: options.source.entityId,
    label: resolvePropertyMessage(options.schema.labelKey, locale),
    ...(options.schema.descriptionKey ? { description: resolvePropertyMessage(options.schema.descriptionKey, locale) } : {}),
    sections,
    issueCount: sections.reduce((count, section) => (
      count + section.fields.reduce((fieldCount, field) => fieldCount + field.issues.length, 0)
    ), 0)
  };
};
