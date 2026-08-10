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
const METADATA_IDENTIFIER_PATTERN = /^[A-Za-z][A-Za-z0-9._-]*$/;
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
const WORKBENCH_REGION_KEYS = ["id", "role", "labelKey", "order", "hostsPanels"] as const;
const EDITOR_DEFINITION_KEYS = [
  "schemaVersion",
  "id",
  "kind",
  "titleKey",
  "tooltipKey",
  "iconId",
  "availability",
  "unavailableReasonKey"
] as const;
const WORKSPACE_PRESET_KEYS = [
  "schemaVersion",
  "id",
  "labelKey",
  "tooltipKey",
  "defaultEditorId",
  "initiallyVisiblePanelIds",
  "emphasizedCommandIds",
  "inspectorMode",
  "densityPreference"
] as const;
const UI_PREFERENCES_KEYS = ["schemaVersion", "theme", "density", "activeWorkspaceId", "panels"] as const;
const PANEL_PREFERENCE_KEYS = ["panelId", "visible", "collapsed", "size", "order", "dock"] as const;
const PROPERTY_SCHEMA_KEYS = ["schemaVersion", "id", "labelKey", "descriptionKey", "sections"] as const;
const PROPERTY_SECTION_KEYS = ["id", "labelKey", "descriptionKey", "order", "appliesTo", "fields"] as const;
const PROPERTY_FIELD_KEYS = [
  "id",
  "path",
  "accessorId",
  "labelKey",
  "descriptionKey",
  "helpKey",
  "dataType",
  "unit",
  "editable",
  "required",
  "validation",
  "exportMappings"
] as const;
const PROPERTY_VALIDATION_KEYS = ["min", "max", "step", "pattern", "allowedValues", "validatorId"] as const;
const PROPERTY_EXPORT_MAPPING_KEYS = ["target", "key"] as const;
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

const isPlainRecord = (value: unknown): value is RecordValue => {
  if (!isRecord(value)) {
    return false;
  }
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
};

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
  if (value === undefined) {
    return { code: "value.undefined", path, message: "Undefined is not valid JSON metadata." };
  }
  if (typeof value === "symbol" || typeof value === "bigint") {
    return { code: "value.non_serializable", path, message: "Value is not JSON serializable." };
  }
  if (typeof value === "number" && !Number.isFinite(value)) {
    return { code: "value.non_finite", path, message: "JSON metadata numbers must be finite." };
  }
  if (typeof value !== "object" || value === null) {
    return null;
  }
  if (Array.isArray(value)) {
    if (Object.getPrototypeOf(value) !== Array.prototype) {
      return { code: "value.non_plain_object", path, message: "Metadata arrays must use the plain Array prototype." };
    }
    for (let index = 0; index < value.length; index += 1) {
      if (!Object.prototype.hasOwnProperty.call(value, index)) {
        return { code: "value.sparse_array", path: `${path}.${index}`, message: "Sparse arrays are not valid JSON metadata." };
      }
    }
    const unexpectedKey = Reflect.ownKeys(value).find((key) => (
      key !== "length" && (
        typeof key !== "string"
        || !/^(0|[1-9][0-9]*)$/.test(key)
        || Number(key) >= value.length
      )
    ));
    if (unexpectedKey !== undefined) {
      return {
        code: "value.non_json_property",
        path: `${path}.${String(unexpectedKey)}`,
        message: "Arrays may contain indexed JSON values only."
      };
    }
  } else if (!isPlainRecord(value)) {
    return { code: "value.non_plain_object", path, message: "Metadata objects must be plain JSON records." };
  } else {
    const descriptors = Object.getOwnPropertyDescriptors(value);
    for (const key of Reflect.ownKeys(value)) {
      if (typeof key !== "string") {
        return { code: "value.non_serializable", path: `${path}.${String(key)}`, message: "Symbol keys are not valid JSON metadata." };
      }
      const descriptor = descriptors[key];
      if (!descriptor.enumerable) {
        return { code: "value.non_json_property", path: `${path}.${key}`, message: "Metadata properties must be enumerable." };
      }
      if (!("value" in descriptor)) {
        return { code: "value.accessor", path: `${path}.${key}`, message: "Metadata properties may not use accessors." };
      }
    }
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

const addMetadataIdentifierError = (
  value: unknown,
  path: string,
  errors: MutableValidationError[]
) => {
  if (!isNonEmptyString(value) || !METADATA_IDENTIFIER_PATTERN.test(value)) {
    addError(errors, "identifier.invalid", path, "Expected a non-empty metadata identifier.");
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

const addOptionalLocalizationKeyError = (
  value: unknown,
  path: string,
  errors: MutableValidationError[]
) => {
  if (value !== undefined) {
    addLocalizationKeyError(value, path, errors);
  }
};

const addUnknownKeyErrors = (
  value: RecordValue,
  allowedKeys: readonly string[],
  path: string,
  errors: MutableValidationError[]
) => {
  Object.keys(value).forEach((key) => {
    if (!allowedKeys.includes(key)) {
      addError(errors, "contract.unknown_key", `${path}.${key}`, `Unknown contract key "${key}" is not allowed.`);
    }
  });
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
  value: unknown,
  path: string,
  errors: MutableValidationError[],
  seen = new WeakSet<object>()
) => {
  if (typeof value !== "object" || value === null || seen.has(value)) {
    return;
  }
  seen.add(value);
  if (Array.isArray(value)) {
    value.forEach((item, index) => addDomainPayloadErrors(item, `${path}.${index}`, errors, seen));
    return;
  }
  if (!isPlainRecord(value)) {
    return;
  }
  Object.entries(value).forEach(([key, child]) => {
    if (DOMAIN_PAYLOAD_KEYS.has(key)) {
      addError(errors, "boundary.domain_payload", `${path}.${key}`, "Domain data is not allowed in this contract.");
    }
    addDomainPayloadErrors(child, `${path}.${key}`, errors, seen);
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
  const orders: string[] = [];
  input.forEach((item, index) => {
    const path = `regions.${index}`;
    if (!isRecord(item)) {
      addError(errors, "workbench.region_type", path, "Region must be an object.");
      return;
    }
    addUnknownKeyErrors(item, WORKBENCH_REGION_KEYS, path, errors);
    const canonicalAtIndex = CANONICAL_WORKBENCH_REGION_DEFINITIONS[index];
    if (canonicalAtIndex && item.id !== canonicalAtIndex.id) {
      addError(
        errors,
        "workbench.sequence",
        `${path}.id`,
        `Expected canonical region "${canonicalAtIndex.id}" at index ${index}.`
      );
    }
    if (isNonEmptyString(item.id)) {
      ids.push(item.id);
      if (!(WORKBENCH_REGION_IDS as readonly string[]).includes(item.id)) {
        addError(errors, "workbench.unknown_region", `${path}.id`, `Unknown canonical region "${item.id}".`);
      } else {
        const canonical = CANONICAL_WORKBENCH_REGION_DEFINITIONS.find((region) => region.id === item.id);
        if (canonical) {
          if (item.role !== canonical.role) {
            addError(errors, "workbench.canonical_role", `${path}.role`, `Region "${item.id}" must use role "${canonical.role}".`);
          }
          if (item.labelKey !== canonical.labelKey) {
            addError(errors, "workbench.canonical_label", `${path}.labelKey`, `Region "${item.id}" must use its canonical label key.`);
          }
          if (item.order !== canonical.order) {
            addError(errors, "workbench.canonical_order", `${path}.order`, `Region "${item.id}" must use order ${canonical.order}.`);
          }
          if (item.hostsPanels !== canonical.hostsPanels) {
            addError(
              errors,
              "workbench.canonical_hosts_panels",
              `${path}.hostsPanels`,
              `Region "${item.id}" must preserve canonical panel-hosting semantics.`
            );
          }
        }
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
    } else {
      orders.push(String(item.order));
    }
    if (typeof item.hostsPanels !== "boolean") {
      addError(errors, "workbench.hosts_panels", `${path}.hostsPanels`, "hostsPanels must be boolean.");
    }
  });

  addDuplicateErrors(ids, "regions", "workbench.duplicate_region", errors);
  addDuplicateErrors(orders, "regions", "workbench.duplicate_order", errors);
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
  addUnknownKeyErrors(input, EDITOR_DEFINITION_KEYS, "editor", errors);
  addVersionError(input.schemaVersion, EDITOR_DEFINITION_SCHEMA_VERSION, "editor.schemaVersion", errors);
  addStableIdError(input.id, "editor.id", errors);
  if (!(EDITOR_KINDS as readonly unknown[]).includes(input.kind)) {
    addError(errors, "editor.kind", "editor.kind", "Unsupported editor kind.");
  }
  addLocalizationKeyError(input.titleKey, "editor.titleKey", errors);
  addOptionalLocalizationKeyError(input.tooltipKey, "editor.tooltipKey", errors);
  if (input.iconId !== undefined) {
    addMetadataIdentifierError(input.iconId, "editor.iconId", errors);
  }
  if (!(EDITOR_AVAILABILITY_STATES as readonly unknown[]).includes(input.availability)) {
    addError(errors, "editor.availability", "editor.availability", "Unsupported editor availability state.");
  }
  addOptionalLocalizationKeyError(input.unavailableReasonKey, "editor.unavailableReasonKey", errors);
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
  addUnknownKeyErrors(input, WORKSPACE_PRESET_KEYS, "workspace", errors);
  addVersionError(input.schemaVersion, WORKSPACE_PRESET_SCHEMA_VERSION, "workspace.schemaVersion", errors);
  addStableIdError(input.id, "workspace.id", errors);
  addLocalizationKeyError(input.labelKey, "workspace.labelKey", errors);
  addOptionalLocalizationKeyError(input.tooltipKey, "workspace.tooltipKey", errors);
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
  addUnknownKeyErrors(input, UI_PREFERENCES_KEYS, "uiPreferences", errors);
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
    addUnknownKeyErrors(panel, PANEL_PREFERENCE_KEYS, path, errors);
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
  const expectedType = dataType === "enum" || dataType === "text" ? "string" : dataType;
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
  addUnknownKeyErrors(field, PROPERTY_FIELD_KEYS, path, errors);
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
  if (field.accessorId !== undefined) {
    addMetadataIdentifierError(field.accessorId, `${path}.accessorId`, errors);
  }
  addLocalizationKeyError(field.labelKey, `${path}.labelKey`, errors);
  if (field.descriptionKey !== undefined) {
    addLocalizationKeyError(field.descriptionKey, `${path}.descriptionKey`, errors);
  }
  if (field.helpKey !== undefined) {
    addLocalizationKeyError(field.helpKey, `${path}.helpKey`, errors);
  }
  if (field.unit !== undefined) {
    addMetadataIdentifierError(field.unit, `${path}.unit`, errors);
  }
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
      addUnknownKeyErrors(validation, PROPERTY_VALIDATION_KEYS, validationPath, errors);
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
        if (typeof validation.pattern !== "string" || (dataType !== "string" && dataType !== "text")) {
          addError(errors, "property.pattern_type", `${validationPath}.pattern`, "pattern requires a string or text field and string value.");
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
      if (validation.validatorId !== undefined) {
        addMetadataIdentifierError(validation.validatorId, `${validationPath}.validatorId`, errors);
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
        addUnknownKeyErrors(mapping, PROPERTY_EXPORT_MAPPING_KEYS, mappingPath, errors);
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
  addUnknownKeyErrors(input, PROPERTY_SCHEMA_KEYS, "propertySchema", errors);
  addVersionError(input.schemaVersion, PROPERTY_SCHEMA_VERSION, "propertySchema.schemaVersion", errors);
  addStableIdError(input.id, "propertySchema.id", errors);
  addLocalizationKeyError(input.labelKey, "propertySchema.labelKey", errors);
  if (input.descriptionKey !== undefined) {
    addLocalizationKeyError(input.descriptionKey, "propertySchema.descriptionKey", errors);
  }
  if (!Array.isArray(input.sections)) {
    addError(errors, "property.sections", "propertySchema.sections", "Property sections must be an array.");
    return result(errors);
  }

  const sectionIds: string[] = [];
  const fieldIds: string[] = [];
  const fieldPaths: string[] = [];
  input.sections.forEach((section, sectionIndex) => {
    const sectionPath = `propertySchema.sections.${sectionIndex}`;
    if (!isRecord(section)) {
      addError(errors, "property.section_type", sectionPath, "Property section must be an object.");
      return;
    }
    addUnknownKeyErrors(section, PROPERTY_SECTION_KEYS, sectionPath, errors);
    if (isNonEmptyString(section.id)) {
      sectionIds.push(section.id);
    } else {
      addError(errors, "id.required", `${sectionPath}.id`, "Section ID is required.");
    }
    addLocalizationKeyError(section.labelKey, `${sectionPath}.labelKey`, errors);
    if (section.descriptionKey !== undefined) {
      addLocalizationKeyError(section.descriptionKey, `${sectionPath}.descriptionKey`, errors);
    }
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
    const sectionFieldIds: string[] = [];
    section.fields.forEach((field, fieldIndex) => {
      validatePropertyField(field, `${sectionPath}.fields.${fieldIndex}`, sectionFieldIds, fieldPaths, errors);
    });
    fieldIds.push(...sectionFieldIds);
    addDuplicateErrors(sectionFieldIds, `${sectionPath}.fields`, "property.duplicate_field_id", errors);
  });
  addDuplicateErrors(sectionIds, "propertySchema.sections", "property.duplicate_section_id", errors);
  addDuplicateErrors(fieldIds, "propertySchema.sections", "property.duplicate_field_id", errors);
  addDuplicateErrors(fieldPaths, "propertySchema.sections", "property.duplicate_field_path", errors);
  return result(errors);
};
