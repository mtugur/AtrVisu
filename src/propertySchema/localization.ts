export const PROPERTY_LOCALES = ["en"] as const;
export type PropertyLocale = (typeof PROPERTY_LOCALES)[number];

export type PropertyMessageCatalog = Readonly<Record<string, Readonly<Record<PropertyLocale, string>>>>;

export const PROPERTY_MESSAGES: PropertyMessageCatalog = Object.freeze({
  "property.schema.atara-machine.label": Object.freeze({ en: "Smart Asset Properties" }),
  "property.schema.atara-machine.description": Object.freeze({ en: "Canonical engineering and commercial machine data." }),
  "property.section.identity": Object.freeze({ en: "Identity" }),
  "property.section.physical": Object.freeze({ en: "Physical" }),
  "property.section.capacity": Object.freeze({ en: "Capacity" }),
  "property.section.electrical": Object.freeze({ en: "Electrical" }),
  "property.section.pneumatic": Object.freeze({ en: "Pneumatic" }),
  "property.section.network": Object.freeze({ en: "Network" }),
  "property.section.maintenance": Object.freeze({ en: "Maintenance Clearance" }),
  "property.field.manufacturer": Object.freeze({ en: "Manufacturer" }),
  "property.field.atara-product": Object.freeze({ en: "ATARA Product" }),
  "property.field.atr-id": Object.freeze({ en: "ATR ID" }),
  "property.field.machine-code": Object.freeze({ en: "Machine Code" }),
  "property.field.product-family-code": Object.freeze({ en: "Product Family Code" }),
  "property.field.pdn-code": Object.freeze({ en: "PDN Code" }),
  "property.field.revision": Object.freeze({ en: "Revision" }),
  "property.field.width": Object.freeze({ en: "Width" }),
  "property.field.depth": Object.freeze({ en: "Depth" }),
  "property.field.height": Object.freeze({ en: "Height" }),
  "property.field.weight": Object.freeze({ en: "Weight" }),
  "property.field.operating-weight": Object.freeze({ en: "Operating Weight" }),
  "property.field.capacity-min": Object.freeze({ en: "Minimum Capacity" }),
  "property.field.capacity-nominal": Object.freeze({ en: "Nominal Capacity" }),
  "property.field.capacity-max": Object.freeze({ en: "Maximum Capacity" }),
  "property.field.electrical-power": Object.freeze({ en: "Power" }),
  "property.field.electrical-voltage": Object.freeze({ en: "Voltage" }),
  "property.field.electrical-phase": Object.freeze({ en: "Phase" }),
  "property.field.electrical-frequency": Object.freeze({ en: "Frequency" }),
  "property.field.electrical-current": Object.freeze({ en: "Current" }),
  "property.field.pneumatic-pressure": Object.freeze({ en: "Pressure" }),
  "property.field.pneumatic-consumption": Object.freeze({ en: "Air Consumption" }),
  "property.field.pneumatic-connection": Object.freeze({ en: "Connection Size" }),
  "property.field.network-protocols": Object.freeze({ en: "Protocols" }),
  "property.field.clearance-front": Object.freeze({ en: "Front" }),
  "property.field.clearance-back": Object.freeze({ en: "Back" }),
  "property.field.clearance-left": Object.freeze({ en: "Left" }),
  "property.field.clearance-right": Object.freeze({ en: "Right" }),
  "property.field.clearance-top": Object.freeze({ en: "Top" }),
  "property.value.unknown": Object.freeze({ en: "Not available" }),
  "property.value.yes": Object.freeze({ en: "Yes" }),
  "property.value.no": Object.freeze({ en: "No" }),
  "property.validation.required": Object.freeze({ en: "A value is required." }),
  "property.validation.type": Object.freeze({ en: "The value has an invalid type." }),
  "property.validation.min": Object.freeze({ en: "The value is below the allowed minimum." }),
  "property.validation.max": Object.freeze({ en: "The value exceeds the allowed maximum." }),
  "property.validation.step": Object.freeze({ en: "The value does not match the required step." }),
  "property.validation.pattern": Object.freeze({ en: "The value does not match the required format." }),
  "property.validation.allowed": Object.freeze({ en: "The value is not an allowed option." }),
  "property.unit.mm": Object.freeze({ en: "mm" }),
  "property.unit.kg": Object.freeze({ en: "kg" }),
  "property.unit.kw": Object.freeze({ en: "kW" }),
  "property.unit.v": Object.freeze({ en: "V" }),
  "property.unit.hz": Object.freeze({ en: "Hz" }),
  "property.unit.a": Object.freeze({ en: "A" }),
  "property.unit.bar": Object.freeze({ en: "bar" }),
  "property.unit.nl-min": Object.freeze({ en: "Nl/min" })
});

export const hasPropertyMessage = (key: string, catalog: PropertyMessageCatalog = PROPERTY_MESSAGES) => (
  Object.prototype.hasOwnProperty.call(catalog, key)
);

export const resolvePropertyMessage = (
  key: string,
  locale: PropertyLocale = "en",
  catalog: PropertyMessageCatalog = PROPERTY_MESSAGES
) => catalog[key]?.[locale] ?? `[${key}]`;
