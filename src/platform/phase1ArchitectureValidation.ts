import {
  CANONICAL_WORKBENCH_REGION_DEFINITIONS,
  DENSITY_IDS,
  EDITOR_AVAILABILITY_STATES,
  EDITOR_DEFINITION_SCHEMA_VERSION,
  EDITOR_KINDS,
  PROPERTY_EXPORT_TARGETS,
  PROPERTY_FIELD_DATA_TYPES,
  PROPERTY_SCHEMA_VERSION,
  THEME_IDS,
  UI_PREFERENCES_SCHEMA_VERSION,
  WORKBENCH_REGION_IDS,
  WORKSPACE_INSPECTOR_MODES,
  WORKSPACE_PRESET_SCHEMA_VERSION,
  type PropertyFieldDataType
} from "./contracts";

export type Phase1ArchitectureValidationError = {
  code: string;
  path: string;
  message: string;
};

export type Phase1ArchitectureValidationResult = {
  valid: boolean;
  errors: readonly Phase1ArchitectureValidationError[];
};

type MutableValidationError = Phase1ArchitectureValidationError;
type RecordValue = Record<string, unknown>;

const STABLE_ID_PATTERN = /^[a-z][a-z0-9]*(?:[.-][a-z0-9]+)+$/;
const PROPERTY_PATH_PATTERN = /^[A-Za-z_$][A-Za-z0-9_$]*(?:\.[A-Za-z_$][A-Za-z0-9_$]*)*$/;
const WORKBENCH_REGION_ROLES = [
  "application",
  "navigation",
  "commands",
  "dock",
  "editor",
  "status",
  "overlay"
] as const;
const WORKBENCH_DOCK_IDS = ["primary-dock", "secondary-dock", "bottom-dock"] as const;
const DOMAIN_PAYLOAD_KEYS = new Set([
  "entities",
  "transforms",
  "layers",
  "groups",
  "annotations",
  "connections",
  "viewpoints",
  "savedViewpoints",
  "selection",
  "history",
  "dirtyState",
  "hasUnsavedChanges",
  "project",
  "projectId",
  "layout",
  "layoutId",
  "revision",
  "revisionId"
]);

const isRecord = (value: unknown): value is RecordValue => (
  typeof value === "object" && value !== null && !Array.isArray(value)
);

const isNonEmptyString = (value: unknown): value is string => (
  typeof value === "string" && value.trim().length > 0
);

const isFiniteNumber = (value: unknown): value is number => (
  typeof value === "number" && Number.isFinite(value)
);

const addError = (
  errors: MutableValidationError[],
  code: string,
  path: string,
  message: string
) => {
  errors.push({ code, path, message });
};

const result = (errors: MutableValidationError[]): Phase1ArchitectureValidationResult => ({
  valid: errors.length === 0,
  errors
});

const findNonSerializableValue = (
  value: unknown,
  path: string,
  seen = new WeakSet<object>()
): { code: string; path: string; message: string } | null => {
  if (typeof value === "function") {
    return { code: "value.executable", path, message: "Executable values are not serializable metadata." };
  }
  if (typeof value === "symbol" || typeof value === "bigint") {
    return { code: "value.non_serializable", path, message: "Value is not JSON serializable." };
  }
  if (typeof value !== "object" || value === null) {
    return null;
  }
  if (seen.has(value)) {
    return { code: "value.circular", path, message: "Circular metadata is not supported." };
  }
  seen.add(value);
  const entries = Array.isArray(value)
    ? value.map((item, index) => [String(index), item] as const)
    : Object.entries(value);
  for (const [key, child] of entries) {
    const found = findNonSerializableValue(child, `${path}.${key}`, seen);
    if (found) {
      return found;
    }
  }
  seen.delete(value);
  return null;
};

const addSerializationError = (
  value: unknown,
  rootPath: string,
  errors: MutableValidationError[]
) => {
  const error = findNonSerializableValue(value, rootPath);
  if (error) {
    errors.push(error);
  }
};

const addVersionError = (
  value: unknown,
  expected: number,
  path: string,
  errors: MutableValidationError[]
) => {
  if (value !== expected) {
    addError(errors, "schema.version", path, `Expected schema version ${expected}.`);
  }
};

const addStableIdError = (
  value: unknown,
  path: string,
  errors: MutableValidationError[]
) => {
  if (!isNonEmptyString(value)) {
    addError(errors, "id.required", path, "A non-empty stable ID is required.");
  } else if (!STABLE_ID_PATTERN.test(value)) {
    addError(errors, "id.format", path, "ID must be a language-neutral dotted or dashed identifier.");
  }
};

const addLocalizationKeyError = (
  value: unknown,
  path: string,
  errors: MutableValidationError[]
) => {
  if (!isNonEmptyString(value)) {
    addError(errors, "localization.required", path, "A non-empty localization key is required.");
  }
};

const findDuplicates = (values: readonly string[]) => {
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  values.forEach((value) => {
    if (seen.has(value)) {
      duplicates.add(value);
    }
    seen.add(value);
  });
  return [...duplicates];
};

const addDuplicateErrors = (
  values: readonly string[],
  path: string,
  code: string,
  errors: MutableValidationError[]
) => {
  findDuplicates(values).forEach((duplicate) => {
    addError(errors, code, path, `Duplicate value "${duplicate}" is not allowed.`);
  });
};

const readStringArray = (
  value: unknown,
  path: string,
  errors: MutableValidationError[]
): readonly string[] => {
  if (!Array.isArray(value)) {
    addError(errors, "collection.required", path, "Expected an array.");
    return [];
  }
  const strings: string[] = [];
  value.forEach((item, index) => {
    if (!isNonEmptyString(item)) {
      addError(errors, "collection.item", `${path}.${index}`, "Expected a non-empty string.");
    } else {
      strings.push(item);
    }
  });
  return strings;
};

const addDomainPayloadErrors = (
  value: RecordValue,
  path: string,
  errors: MutableValidationError[]
) => {
  Object.keys(value).forEach((key) => {
    if (DOMAIN_PAYLOAD_KEYS.has(key)) {
      addError(errors, "boundary.domain_payload", `${path}.${key}`, "Domain data is not allowed in this contract.");
    }
  });
};

export const validateCanonicalWorkbenchRegions = (
  input: unknown = CANONICAL_WORKBENCH_REGION_DEFINITIONS
): Phase1ArchitectureValidationResult => {
  const errors: MutableValidationError[] = [];
  addSerializationError(input, "regions", errors);
  if (!Array.isArray(input)) {
    addError(errors, "workbench.regions_required", "regions", "Workbench regions must be an array.");
    return result(errors);
  }

  const ids: string[] = [];
  input.forEach((item, index) => {
    const path = `regions.${index}`;
    if (!isRecord(item)) {
      addError(errors, "workbench.region_type", path, "Region must be an object.");
      return;
    }
    if (isNonEmptyString(item.id)) {
      ids.push(item.id);
      if (!(WORKBENCH_REGION_IDS as readonly string[]).includes(item.id)) {
        addError(errors, "workbench.unknown_region", `${path}.id`, `Unknown canonical region "${item.id}".`);
      }
    } else {
      addError(errors, "id.required", `${path}.id`, "Region ID is required.");
    }
    if (!(WORKBENCH_REGION_ROLES as readonly unknown[]).includes(item.role)) {
      addError(errors, "workbench.role", `${path}.role`, "Unsupported workbench region role.");
    }
    addLocalizationKeyError(item.labelKey, `${path}.labelKey`, errors);
    if (!isFiniteNumber(item.order) || item.order < 0) {
      addError(errors, "workbench.order", `${path}.order`, "Region order must be a non-negative finite number.");
    }
    if (typeof item.hostsPanels !== "boolean") {
      addError(errors, "workbench.hosts_panels", `${path}.hostsPanels`, "hostsPanels must be boolean.");
    }
  });

  addDuplicateErrors(ids, "regions", "workbench.duplicate_region", errors);
  WORKBENCH_REGION_IDS.forEach((id) => {
    if (!ids.includes(id)) {
      addError(errors, "workbench.missing_region", "regions", `Missing canonical region "${id}".`);
    }
  });
  if (input.length !== WORKBENCH_REGION_IDS.length) {
    addError(errors, "workbench.region_count", "regions", `Expected exactly ${WORKBENCH_REGION_IDS.length} regions.`);
  }
  return result(errors);
};

export const validateEditorDefinition = (input: unknown): Phase1ArchitectureValidationResult => {
  const errors: MutableValidationError[] = [];
  addSerializationError(input, "editor", errors);
  if (!isRecord(input)) {
    addError(errors, "editor.type", "editor", "Editor definition must be an object.");
    return result(errors);
  }
  addVersionError(input.schemaVersion, EDITOR_DEFINITION_SCHEMA_VERSION, "editor.schemaVersion", errors);
  addStableIdError(input.id, "editor.id", errors);
  if (!(EDITOR_KINDS as readonly unknown[]).includes(input.kind)) {
    addError(errors, "editor.kind", "editor.kind", "Unsupported editor kind.");
  }
  addLocalizationKeyError(input.titleKey, "editor.titleKey", errors);
  if (!(EDITOR_AVAILABILITY_STATES as readonly unknown[]).includes(input.availability)) {
    addError(errors, "editor.availability", "editor.availability", "Unsupported editor availability state.");
  }
  return result(errors);
};

export const validateWorkspacePreset = (input: unknown): Phase1ArchitectureValidationResult => {
  const errors: MutableValidationError[] = [];
  addSerializationError(input, "workspace", errors);
  if (!isRecord(input)) {
    addError(errors, "workspace.type", "workspace", "Workspace preset must be an object.");
    return result(errors);
  }
  addDomainPayloadErrors(input, "workspace", errors);
  addVersionError(input.schemaVersion, WORKSPACE_PRESET_SCHEMA_VERSION, "workspace.schemaVersion", errors);
  addStableIdError(input.id, "workspace.id", errors);
  addLocalizationKeyError(input.labelKey, "workspace.labelKey", errors);
  addStableIdError(input.defaultEditorId, "workspace.defaultEditorId", errors);
  const panels = readStringArray(input.initiallyVisiblePanelIds, "workspace.initiallyVisiblePanelIds", errors);
  const commands = readStringArray(input.emphasizedCommandIds, "workspace.emphasizedCommandIds", errors);
  addDuplicateErrors(panels, "workspace.initiallyVisiblePanelIds", "workspace.duplicate_panel", errors);
  addDuplicateErrors(commands, "workspace.emphasizedCommandIds", "workspace.duplicate_command", errors);
  if (!(WORKSPACE_INSPECTOR_MODES as readonly unknown[]).includes(input.inspectorMode)) {
    addError(errors, "workspace.inspector_mode", "workspace.inspectorMode", "Unsupported Inspector mode.");
  }
  if (input.densityPreference !== undefined && !(DENSITY_IDS as readonly unknown[]).includes(input.densityPreference)) {
    addError(errors, "workspace.density", "workspace.densityPreference", "Unsupported density preference.");
  }
  return result(errors);
};

export const validateWorkbenchUiPreferences = (input: unknown): Phase1ArchitectureValidationResult => {
  const errors: MutableValidationError[] = [];
  addSerializationError(input, "uiPreferences", errors);
  if (!isRecord(input)) {
    addError(errors, "ui_preferences.type", "uiPreferences", "UI preferences must be an object.");
    return result(errors);
  }
  addDomainPayloadErrors(input, "uiPreferences", errors);
  addVersionError(input.schemaVersion, UI_PREFERENCES_SCHEMA_VERSION, "uiPreferences.schemaVersion", errors);
  if (!(THEME_IDS as readonly unknown[]).includes(input.theme)) {
    addError(errors, "ui_preferences.theme", "uiPreferences.theme", "Unsupported theme preference.");
  }
  if (!(DENSITY_IDS as readonly unknown[]).includes(input.density)) {
    addError(errors, "ui_preferences.density", "uiPreferences.density", "Unsupported density preference.");
  }
  if (input.activeWorkspaceId !== undefined) {
    addStableIdError(input.activeWorkspaceId, "uiPreferences.activeWorkspaceId", errors);
  }
  if (!Array.isArray(input.panels)) {
    addError(errors, "ui_preferences.panels", "uiPreferences.panels", "Panel preferences must be an array.");
    return result(errors);
  }
  const panelIds: string[] = [];
  input.panels.forEach((panel, index) => {
    const path = `uiPreferences.panels.${index}`;
    if (!isRecord(panel)) {
      addError(errors, "ui_preferences.panel_type", path, "Panel preference must be an object.");
      return;
    }
    if (isNonEmptyString(panel.panelId)) {
      panelIds.push(panel.panelId);
    } else {
      addError(errors, "id.required", `${path}.panelId`, "Panel identity is required.");
    }
    if (typeof panel.visible !== "boolean") {
      addError(errors, "ui_preferences.visible", `${path}.visible`, "visible must be boolean.");
    }
    if (typeof panel.collapsed !== "boolean") {
      addError(errors, "ui_preferences.collapsed", `${path}.collapsed`, "collapsed must be boolean.");
    }
    if (panel.size !== undefined && (!isFiniteNumber(panel.size) || panel.size <= 0)) {
      addError(errors, "ui_preferences.size", `${path}.size`, "Panel size must be a positive finite number.");
    }
    if (!isFiniteNumber(panel.order) || panel.order < 0) {
      addError(errors, "ui_preferences.order", `${path}.order`, "Panel order must be a non-negative finite number.");
    }
    if (!(WORKBENCH_DOCK_IDS as readonly unknown[]).includes(panel.dock)) {
      addError(errors, "ui_preferences.dock", `${path}.dock`, "Unsupported workbench dock.");
    }
  });
  addDuplicateErrors(panelIds, "uiPreferences.panels", "ui_preferences.duplicate_panel", errors);
  return result(errors);
};

const validateAllowedValues = (
  value: unknown,
  dataType: PropertyFieldDataType,
  path: string,
  errors: MutableValidationError[]
) => {
  if (!Array.isArray(value) || value.length === 0) {
    addError(errors, "property.allowed_values", path, "allowedValues must be a non-empty array.");
    return;
  }
  const expectedType = dataType === "enum" ? "string" : dataType;
  const keys: string[] = [];
  value.forEach((item, index) => {
    if (typeof item !== expectedType) {
      addError(errors, "property.allowed_value_type", `${path}.${index}`, `Expected ${expectedType} allowed value.`);
      return;
    }
    keys.push(`${typeof item}:${String(item)}`);
  });
  addDuplicateErrors(keys, path, "property.duplicate_allowed_value", errors);
};

const validatePropertyField = (
  field: unknown,
  path: string,
  fieldIds: string[],
  fieldPaths: string[],
  errors: MutableValidationError[]
) => {
  if (!isRecord(field)) {
    addError(errors, "property.field_type", path, "Property field must be an object.");
    return;
  }
  if (isNonEmptyString(field.id)) {
    fieldIds.push(field.id);
  } else {
    addError(errors, "id.required", `${path}.id`, "Field ID is required.");
  }
  if (!isNonEmptyString(field.path) || !PROPERTY_PATH_PATTERN.test(field.path)) {
    addError(errors, "property.path", `${path}.path`, "Field path must be a dotted property path.");
  } else {
    fieldPaths.push(field.path);
  }
  addLocalizationKeyError(field.labelKey, `${path}.labelKey`, errors);
  if (!(PROPERTY_FIELD_DATA_TYPES as readonly unknown[]).includes(field.dataType)) {
    addError(errors, "property.data_type", `${path}.dataType`, "Unsupported property field data type.");
    return;
  }
  const dataType = field.dataType as PropertyFieldDataType;
  if (typeof field.editable !== "boolean") {
    addError(errors, "property.editable", `${path}.editable`, "editable must be boolean.");
  }
  if (typeof field.required !== "boolean") {
    addError(errors, "property.required", `${path}.required`, "required must be boolean.");
  }

  if (field.validation !== undefined) {
    const validationPath = `${path}.validation`;
    if (!isRecord(field.validation)) {
      addError(errors, "property.validation_type", validationPath, "Validation must be an object.");
    } else {
      const validation = field.validation;
      if (validation.required !== undefined && typeof validation.required !== "boolean") {
        addError(errors, "property.validation_required", `${validationPath}.required`, "required must be boolean.");
      }
      if (validation.min !== undefined && !isFiniteNumber(validation.min)) {
        addError(errors, "property.min", `${validationPath}.min`, "min must be finite.");
      }
      if (validation.max !== undefined && !isFiniteNumber(validation.max)) {
        addError(errors, "property.max", `${validationPath}.max`, "max must be finite.");
      }
      if (isFiniteNumber(validation.min) && isFiniteNumber(validation.max) && validation.min > validation.max) {
        addError(errors, "property.range", validationPath, "min must not be greater than max.");
      }
      if (validation.step !== undefined && (!isFiniteNumber(validation.step) || validation.step <= 0)) {
        addError(errors, "property.step", `${validationPath}.step`, "step must be positive and finite.");
      }
      if ((validation.min !== undefined || validation.max !== undefined || validation.step !== undefined) && dataType !== "number") {
        addError(errors, "property.numeric_validation_type", validationPath, "Numeric validation requires a number field.");
      }
      if (validation.pattern !== undefined) {
        if (typeof validation.pattern !== "string" || dataType !== "string") {
          addError(errors, "property.pattern_type", `${validationPath}.pattern`, "pattern requires a string field and string value.");
        } else {
          try {
            new RegExp(validation.pattern);
          } catch {
            addError(errors, "property.pattern", `${validationPath}.pattern`, "pattern must be valid regular-expression syntax.");
          }
        }
      }
      if (validation.allowedValues !== undefined) {
        validateAllowedValues(validation.allowedValues, dataType, `${validationPath}.allowedValues`, errors);
      } else if (dataType === "enum") {
        addError(errors, "property.enum_values", `${validationPath}.allowedValues`, "Enum fields require allowedValues.");
      }
      if (validation.validatorId !== undefined && !isNonEmptyString(validation.validatorId)) {
        addError(errors, "property.validator_id", `${validationPath}.validatorId`, "validatorId must be a non-empty identifier.");
      }
    }
  } else if (dataType === "enum") {
    addError(errors, "property.enum_values", `${path}.validation.allowedValues`, "Enum fields require allowedValues.");
  }

  if (field.exportMappings !== undefined) {
    const exportPath = `${path}.exportMappings`;
    if (!Array.isArray(field.exportMappings) || field.exportMappings.length === 0) {
      addError(errors, "property.export_mappings", exportPath, "At least one export mapping is required when supplied.");
    } else {
      const targets: string[] = [];
      field.exportMappings.forEach((mapping, index) => {
        const mappingPath = `${exportPath}.${index}`;
        if (!isRecord(mapping)) {
          addError(errors, "property.export_mapping_type", mappingPath, "Export mapping must be an object.");
          return;
        }
        if (!(PROPERTY_EXPORT_TARGETS as readonly unknown[]).includes(mapping.target)) {
          addError(errors, "property.export_target", `${mappingPath}.target`, "Unsupported export target.");
        } else {
          targets.push(mapping.target as string);
        }
        if (!isNonEmptyString(mapping.key)) {
          addError(errors, "property.export_key", `${mappingPath}.key`, "Export mapping key is required.");
        }
      });
      addDuplicateErrors(targets, exportPath, "property.duplicate_export_target", errors);
    }
  }
};

export const validatePropertySchemaDefinition = (input: unknown): Phase1ArchitectureValidationResult => {
  const errors: MutableValidationError[] = [];
  addSerializationError(input, "propertySchema", errors);
  if (!isRecord(input)) {
    addError(errors, "property.schema_type", "propertySchema", "Property schema must be an object.");
    return result(errors);
  }
  addVersionError(input.schemaVersion, PROPERTY_SCHEMA_VERSION, "propertySchema.schemaVersion", errors);
  addStableIdError(input.id, "propertySchema.id", errors);
  addLocalizationKeyError(input.labelKey, "propertySchema.labelKey", errors);
  if (!Array.isArray(input.sections)) {
    addError(errors, "property.sections", "propertySchema.sections", "Property sections must be an array.");
    return result(errors);
  }

  const sectionIds: string[] = [];
  const fieldPaths: string[] = [];
  input.sections.forEach((section, sectionIndex) => {
    const sectionPath = `propertySchema.sections.${sectionIndex}`;
    if (!isRecord(section)) {
      addError(errors, "property.section_type", sectionPath, "Property section must be an object.");
      return;
    }
    if (isNonEmptyString(section.id)) {
      sectionIds.push(section.id);
    } else {
      addError(errors, "id.required", `${sectionPath}.id`, "Section ID is required.");
    }
    addLocalizationKeyError(section.labelKey, `${sectionPath}.labelKey`, errors);
    if (!isFiniteNumber(section.order) || section.order < 0) {
      addError(errors, "property.section_order", `${sectionPath}.order`, "Section order must be non-negative and finite.");
    }
    const appliesTo = readStringArray(section.appliesTo, `${sectionPath}.appliesTo`, errors);
    if (appliesTo.length === 0) {
      addError(errors, "property.applies_to", `${sectionPath}.appliesTo`, "At least one applicability ID is required.");
    }
    if (!Array.isArray(section.fields)) {
      addError(errors, "property.fields", `${sectionPath}.fields`, "Section fields must be an array.");
      return;
    }
    const fieldIds: string[] = [];
    section.fields.forEach((field, fieldIndex) => {
      validatePropertyField(field, `${sectionPath}.fields.${fieldIndex}`, fieldIds, fieldPaths, errors);
    });
    addDuplicateErrors(fieldIds, `${sectionPath}.fields`, "property.duplicate_field_id", errors);
  });
  addDuplicateErrors(sectionIds, "propertySchema.sections", "property.duplicate_section_id", errors);
  addDuplicateErrors(fieldPaths, "propertySchema.sections", "property.duplicate_field_path", errors);
  return result(errors);
};
