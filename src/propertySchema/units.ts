import { resolvePropertyMessage, type PropertyLocale } from "./localization";

export type PropertyUnitDefinition = {
  id: string;
  labelKey: string;
  precision: number;
};

const definitions = [
  { id: "mm", labelKey: "property.unit.mm", precision: 0 },
  { id: "kg", labelKey: "property.unit.kg", precision: 2 },
  { id: "kw", labelKey: "property.unit.kw", precision: 2 },
  { id: "v", labelKey: "property.unit.v", precision: 2 },
  { id: "hz", labelKey: "property.unit.hz", precision: 2 },
  { id: "a", labelKey: "property.unit.a", precision: 2 },
  { id: "bar", labelKey: "property.unit.bar", precision: 2 },
  { id: "nl-min", labelKey: "property.unit.nl-min", precision: 2 }
] as const satisfies readonly PropertyUnitDefinition[];

export const PROPERTY_UNIT_DEFINITIONS = Object.freeze(definitions);

const unitsById = new Map<string, PropertyUnitDefinition>(
  PROPERTY_UNIT_DEFINITIONS.map((definition) => [definition.id, definition])
);

export const hasPropertyUnit = (unitId: string) => unitsById.has(unitId);

export const resolvePropertyUnitLabel = (unitId: string, locale: PropertyLocale = "en") => {
  const unit = unitsById.get(unitId);
  return unit ? resolvePropertyMessage(unit.labelKey, locale) : undefined;
};

const formatNumber = (value: number, precision: number) => {
  const rounded = Number(value.toFixed(precision));
  return Object.is(rounded, -0) ? "0" : String(rounded);
};

export const formatPropertyNumber = (
  value: number,
  unitId?: string,
  unitOverride?: string,
  locale: PropertyLocale = "en"
) => {
  if (!Number.isFinite(value)) {
    return undefined;
  }
  const unit = unitId ? unitsById.get(unitId) : undefined;
  if (unitId && !unit) {
    return undefined;
  }
  const formatted = formatNumber(value, unit?.precision ?? 2);
  const unitLabel = unitOverride?.trim() || (unit ? resolvePropertyUnitLabel(unit.id, locale) : undefined);
  return unitLabel ? `${formatted} ${unitLabel}` : formatted;
};

export type PropertyNumberParseResult =
  | { ok: true; value: number }
  | { ok: false; code: "property.parse.empty" | "property.parse.invalid" | "property.parse.unknown_unit" };

const DECIMAL_NUMBER_PATTERN = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/;

export const parsePropertyNumber = (input: string, unitId?: string): PropertyNumberParseResult => {
  if (unitId && !hasPropertyUnit(unitId)) {
    return { ok: false, code: "property.parse.unknown_unit" };
  }
  const normalized = input.trim();
  if (!normalized) {
    return { ok: false, code: "property.parse.empty" };
  }
  if (!DECIMAL_NUMBER_PATTERN.test(normalized)) {
    return { ok: false, code: "property.parse.invalid" };
  }
  const value = Number(normalized);
  return Number.isFinite(value)
    ? { ok: true, value }
    : { ok: false, code: "property.parse.invalid" };
};
