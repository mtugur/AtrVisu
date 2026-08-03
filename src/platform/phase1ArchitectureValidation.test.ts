import { describe, expect, it, vi } from "vitest";
import {
  CANONICAL_WORKBENCH_REGION_DEFINITIONS,
  DESIGN_TOKEN_FAMILIES,
  EDITOR_DEFINITION_SCHEMA_VERSION,
  PROPERTY_SCHEMA_VERSION,
  UI_PREFERENCES_SCHEMA_VERSION,
  WORKBENCH_REGION_IDS,
  WORKSPACE_PRESET_SCHEMA_VERSION,
  type EditorDefinition,
  type PropertyFieldDefinition,
  type PropertySchemaDefinition,
  type WorkbenchUiPreferences,
  type WorkspacePreset
} from "./contracts";
import {
  validateCanonicalWorkbenchRegions,
  validateEditorDefinition,
  validatePropertySchemaDefinition,
  validateWorkbenchUiPreferences,
  validateWorkspacePreset
} from "./phase1ArchitectureValidation";

const validEditor = (): EditorDefinition => ({
  schemaVersion: EDITOR_DEFINITION_SCHEMA_VERSION,
  id: "layout.3d",
  kind: "visual",
  titleKey: "editor.layout3d.title",
  tooltipKey: "editor.layout3d.tooltip",
  availability: "available"
});

const salesWorkspace = (): WorkspacePreset => ({
  schemaVersion: WORKSPACE_PRESET_SCHEMA_VERSION,
  id: "workspace.sales-layout",
  labelKey: "workspace.salesLayout.label",
  tooltipKey: "workspace.salesLayout.tooltip",
  defaultEditorId: "layout.3d",
  initiallyVisiblePanelIds: ["panel.machineLibrary", "panel.inspector"],
  emphasizedCommandIds: ["library.addMachine", "project.save"],
  inspectorMode: "contextual",
  densityPreference: "comfortable"
});

const engineeringWorkspace = (): WorkspacePreset => ({
  schemaVersion: WORKSPACE_PRESET_SCHEMA_VERSION,
  id: "workspace.layout-engineering",
  labelKey: "workspace.layoutEngineering.label",
  defaultEditorId: "layout.3d",
  initiallyVisiblePanelIds: ["panel.layers", "panel.groups", "panel.inspector"],
  emphasizedCommandIds: ["alignment.alignSelection", "collision.check"],
  inspectorMode: "engineering",
  densityPreference: "compact"
});

const validUiPreferences = (): WorkbenchUiPreferences => ({
  schemaVersion: UI_PREFERENCES_SCHEMA_VERSION,
  theme: "system",
  density: "comfortable",
  activeWorkspaceId: "workspace.sales-layout",
  panels: [
    {
      panelId: "panel.machineLibrary",
      visible: true,
      collapsed: false,
      size: 320,
      order: 0,
      dock: "primary-dock"
    },
    {
      panelId: "panel.inspector",
      visible: true,
      collapsed: false,
      size: 360,
      order: 0,
      dock: "secondary-dock"
    }
  ]
});

const identityField = (): PropertyFieldDefinition => ({
  id: "machine-code",
  path: "identity.machineCode",
  labelKey: "property.machineCode.label",
  dataType: "string",
  editable: true,
  required: true,
  validation: {
    required: true,
    pattern: "^[A-Z0-9-]+$",
    validatorId: "validator.machineCode"
  },
  exportMappings: [
    { target: "bom", key: "machineCode" },
    { target: "report", key: "machineCode" }
  ]
});

const capacityField = (): PropertyFieldDefinition => ({
  id: "capacity",
  path: "operational.capacity",
  labelKey: "property.capacity.label",
  dataType: "number",
  unit: "pcs_per_hour",
  editable: true,
  required: false,
  validation: { min: 0, max: 100000, step: 1 },
  exportMappings: [{ target: "report", key: "capacity" }]
});

const propertySchema = (
  id = "schema.machine.case-packer",
  appliesTo = "machine.case-packer"
): PropertySchemaDefinition => ({
  schemaVersion: PROPERTY_SCHEMA_VERSION,
  id,
  labelKey: `${id}.label`,
  sections: [
    {
      id: "identity",
      labelKey: "property.section.identity",
      order: 0,
      appliesTo: [appliesTo],
      fields: [identityField()]
    },
    {
      id: "operational",
      labelKey: "property.section.operational",
      order: 1,
      appliesTo: [appliesTo],
      fields: [capacityField()]
    }
  ]
});

const expectError = (
  result: ReturnType<typeof validatePropertySchemaDefinition>,
  code: string,
  path?: string
) => {
  expect(result.valid).toBe(false);
  expect(result.errors).toEqual(expect.arrayContaining([
    expect.objectContaining({ code, ...(path ? { path } : {}) })
  ]));
};

describe("Phase 1 workbench architecture validation", () => {
  it("contains exactly nine unique required canonical regions through the contracts barrel", () => {
    const result = validateCanonicalWorkbenchRegions();

    expect(result).toEqual({ valid: true, errors: [] });
    expect(WORKBENCH_REGION_IDS).toHaveLength(9);
    expect(new Set(WORKBENCH_REGION_IDS)).toHaveLength(9);
    expect(CANONICAL_WORKBENCH_REGION_DEFINITIONS.map((region) => region.id)).toEqual(WORKBENCH_REGION_IDS);
    expect(CANONICAL_WORKBENCH_REGION_DEFINITIONS.filter((region) => region.hostsPanels).map((region) => region.id))
      .toEqual(["primary-dock", "secondary-dock", "bottom-dock"]);
    expect(DESIGN_TOKEN_FAMILIES).toContain("technical-palette");
  });

  it("rejects missing, duplicate, and unknown workbench regions", () => {
    const missing = CANONICAL_WORKBENCH_REGION_DEFINITIONS.slice(1);
    const duplicate = [
      ...CANONICAL_WORKBENCH_REGION_DEFINITIONS,
      CANONICAL_WORKBENCH_REGION_DEFINITIONS[0]
    ];
    const unknown = CANONICAL_WORKBENCH_REGION_DEFINITIONS.map((region, index) => (
      index === 0 ? { ...region, id: "future-region" } : region
    ));

    expect(validateCanonicalWorkbenchRegions(missing).errors.map((error) => error.code))
      .toContain("workbench.missing_region");
    expect(validateCanonicalWorkbenchRegions(duplicate).errors.map((error) => error.code))
      .toContain("workbench.duplicate_region");
    expect(validateCanonicalWorkbenchRegions(unknown).errors.map((error) => error.code))
      .toContain("workbench.unknown_region");
  });
});

describe("Phase 1 editor metadata validation", () => {
  it("accepts serializable layout editor metadata", () => {
    expect(validateEditorDefinition(validEditor())).toEqual({ valid: true, errors: [] });
    expect(JSON.parse(JSON.stringify(validEditor()))).toEqual(validEditor());
  });

  it("rejects unsupported editor kind and schema version", () => {
    const unsupportedKind = validateEditorDefinition({ ...validEditor(), kind: "canvas" });
    const badVersion = validateEditorDefinition({ ...validEditor(), schemaVersion: 2 });

    expect(unsupportedKind.errors).toContainEqual(expect.objectContaining({
      code: "editor.kind",
      path: "editor.kind"
    }));
    expect(badVersion.errors).toContainEqual(expect.objectContaining({
      code: "schema.version",
      path: "editor.schemaVersion"
    }));
  });

  it("rejects executable runtime bindings in editor metadata", () => {
    const render = vi.fn();
    const result = validateEditorDefinition({ ...validEditor(), render });

    expect(result.errors).toContainEqual(expect.objectContaining({
      code: "value.executable",
      path: "editor.render"
    }));
    expect(render).not.toHaveBeenCalled();
  });
});

describe("Phase 1 workspace validation", () => {
  it("accepts Sales and Engineering workspace presets", () => {
    expect(validateWorkspacePreset(salesWorkspace())).toEqual({ valid: true, errors: [] });
    expect(validateWorkspacePreset(engineeringWorkspace())).toEqual({ valid: true, errors: [] });
  });

  it("rejects duplicate panel and command IDs", () => {
    const duplicatePanels = validateWorkspacePreset({
      ...salesWorkspace(),
      initiallyVisiblePanelIds: ["panel.inspector", "panel.inspector"]
    });
    const duplicateCommands = validateWorkspacePreset({
      ...salesWorkspace(),
      emphasizedCommandIds: ["project.save", "project.save"]
    });

    expect(duplicatePanels.errors).toContainEqual(expect.objectContaining({ code: "workspace.duplicate_panel" }));
    expect(duplicateCommands.errors).toContainEqual(expect.objectContaining({ code: "workspace.duplicate_command" }));
  });

  it("keeps workspace fixtures free of domain-data fields and rejects leakage", () => {
    const prohibited = [
      "entities",
      "selection",
      "transforms",
      "history",
      "dirtyState",
      "viewpoints",
      "project",
      "layout",
      "revision"
    ];

    expect(Object.keys(salesWorkspace())).not.toEqual(expect.arrayContaining(prohibited));
    prohibited.forEach((key) => {
      const result = validateWorkspacePreset({ ...salesWorkspace(), [key]: {} });
      expect(result.errors).toContainEqual(expect.objectContaining({
        code: "boundary.domain_payload",
        path: `workspace.${key}`
      }));
    });
  });
});

describe("Phase 1 UI preference validation", () => {
  it("accepts stable-ID-only UI preferences", () => {
    expect(validateWorkbenchUiPreferences(validUiPreferences())).toEqual({ valid: true, errors: [] });
  });

  it.each([
    ["theme", { theme: "sepia" }, "ui_preferences.theme", "uiPreferences.theme"],
    ["density", { density: "dense" }, "ui_preferences.density", "uiPreferences.density"],
    ["dock", { panels: [{ ...validUiPreferences().panels[0], dock: "editor-host" }] }, "ui_preferences.dock", "uiPreferences.panels.0.dock"],
    ["zero size", { panels: [{ ...validUiPreferences().panels[0], size: 0 }] }, "ui_preferences.size", "uiPreferences.panels.0.size"],
    ["negative order", { panels: [{ ...validUiPreferences().panels[0], order: -1 }] }, "ui_preferences.order", "uiPreferences.panels.0.order"]
  ])("rejects invalid %s", (_label, replacement, code, path) => {
    const result = validateWorkbenchUiPreferences({ ...validUiPreferences(), ...replacement });

    expect(result.errors).toContainEqual(expect.objectContaining({ code, path }));
  });

  it("rejects duplicate panel preference identity", () => {
    const panel = validUiPreferences().panels[0];
    const result = validateWorkbenchUiPreferences({
      ...validUiPreferences(),
      panels: [panel, { ...panel, order: 1 }]
    });

    expect(result.errors).toContainEqual(expect.objectContaining({ code: "ui_preferences.duplicate_panel" }));
  });

  it("does not include or accept domain and session properties in WorkbenchUiPreferences", () => {
    const contractKeys: readonly (keyof WorkbenchUiPreferences)[] = [
      "schemaVersion",
      "theme",
      "density",
      "activeWorkspaceId",
      "panels"
    ];
    const prohibited = ["savedViewpoints", "entities", "transforms", "history", "dirtyState"];

    expect(contractKeys).not.toEqual(expect.arrayContaining(prohibited));
    prohibited.forEach((key) => {
      const result = validateWorkbenchUiPreferences({ ...validUiPreferences(), [key]: [] });
      expect(result.errors).toContainEqual(expect.objectContaining({
        code: "boundary.domain_payload",
        path: `uiPreferences.${key}`
      }));
    });
  });
});

describe("Phase 1 Property Schema validation", () => {
  it("accepts two machine-family schemas without family-specific component types", () => {
    const casePacker = propertySchema("schema.machine.case-packer", "machine.case-packer");
    const palletizer = propertySchema("schema.machine.palletizer", "machine.palletizer");

    expect(validatePropertySchemaDefinition(casePacker)).toEqual({ valid: true, errors: [] });
    expect(validatePropertySchemaDefinition(palletizer)).toEqual({ valid: true, errors: [] });
    expect(JSON.stringify([casePacker, palletizer])).not.toMatch(/RobotProperties|FillerProperties|PalletizerProperties/);
  });

  it("rejects duplicate section IDs", () => {
    const schema = propertySchema();
    const result = validatePropertySchemaDefinition({
      ...schema,
      sections: [schema.sections[0], { ...schema.sections[1], id: schema.sections[0].id }]
    });

    expectError(result, "property.duplicate_section_id", "propertySchema.sections");
  });

  it("rejects duplicate field IDs within a section", () => {
    const schema = propertySchema();
    const section = schema.sections[0];
    const result = validatePropertySchemaDefinition({
      ...schema,
      sections: [{ ...section, fields: [identityField(), { ...capacityField(), id: "machine-code" }] }]
    });

    expectError(result, "property.duplicate_field_id", "propertySchema.sections.0.fields");
  });

  it("rejects duplicate field paths across sections", () => {
    const schema = propertySchema();
    const result = validatePropertySchemaDefinition({
      ...schema,
      sections: [
        schema.sections[0],
        { ...schema.sections[1], fields: [{ ...capacityField(), path: "identity.machineCode" }] }
      ]
    });

    expectError(result, "property.duplicate_field_path", "propertySchema.sections");
  });

  it("rejects min greater than max", () => {
    const schema = propertySchema();
    const result = validatePropertySchemaDefinition({
      ...schema,
      sections: [{
        ...schema.sections[1],
        fields: [{ ...capacityField(), validation: { min: 20, max: 10, step: 1 } }]
      }]
    });

    expectError(result, "property.range", "propertySchema.sections.0.fields.0.validation");
  });

  it.each([0, -1])("rejects non-positive step %s", (step) => {
    const schema = propertySchema();
    const result = validatePropertySchemaDefinition({
      ...schema,
      sections: [{
        ...schema.sections[1],
        fields: [{ ...capacityField(), validation: { min: 0, max: 100, step } }]
      }]
    });

    expectError(result, "property.step", "propertySchema.sections.0.fields.0.validation.step");
  });

  it("rejects invalid regex syntax without evaluating arbitrary code", () => {
    const schema = propertySchema();
    const executable = vi.fn();
    const result = validatePropertySchemaDefinition({
      ...schema,
      sections: [{
        ...schema.sections[0],
        fields: [{
          ...identityField(),
          validation: { pattern: "[", validatorId: "validator.safe", executable }
        }]
      }]
    });

    expectError(result, "property.pattern", "propertySchema.sections.0.fields.0.validation.pattern");
    expectError(result, "value.executable", "propertySchema.sections.0.fields.0.validation.executable");
    expect(executable).not.toHaveBeenCalled();
  });

  it("rejects incompatible, duplicate, and missing allowed values", () => {
    const schema = propertySchema();
    const incompatible = validatePropertySchemaDefinition({
      ...schema,
      sections: [{
        ...schema.sections[1],
        fields: [{ ...capacityField(), validation: { allowedValues: ["fast"] } }]
      }]
    });
    const duplicate = validatePropertySchemaDefinition({
      ...schema,
      sections: [{
        ...schema.sections[0],
        fields: [{ ...identityField(), validation: { allowedValues: ["A", "A"] } }]
      }]
    });
    const missingEnum = validatePropertySchemaDefinition({
      ...schema,
      sections: [{
        ...schema.sections[0],
        fields: [{ ...identityField(), dataType: "enum", validation: {} }]
      }]
    });

    expectError(incompatible, "property.allowed_value_type");
    expectError(duplicate, "property.duplicate_allowed_value");
    expectError(missingEnum, "property.enum_values");
  });

  it("rejects executable values as serialized schema content", () => {
    const execute = vi.fn();
    const schema = propertySchema();
    const result = validatePropertySchemaDefinition({
      ...schema,
      sections: [{
        ...schema.sections[0],
        fields: [{ ...identityField(), renderer: execute }]
      }]
    });

    expectError(result, "value.executable", "propertySchema.sections.0.fields.0.renderer");
    expect(execute).not.toHaveBeenCalled();
  });

  it("accepts shared BOM and report export mappings", () => {
    const result = validatePropertySchemaDefinition(propertySchema());

    expect(result).toEqual({ valid: true, errors: [] });
    expect(identityField().exportMappings?.map((mapping) => mapping.target)).toEqual(["bom", "report"]);
  });

  it("treats validatorId as inert metadata", () => {
    const schema = propertySchema();
    const result = validatePropertySchemaDefinition(schema);

    expect(result.valid).toBe(true);
    expect(schema.sections[0].fields[0].validation?.validatorId).toBe("validator.machineCode");
    expect(typeof schema.sections[0].fields[0].validation?.validatorId).toBe("string");
  });

  it("does not mutate supplied architecture inputs", () => {
    const regions = JSON.parse(JSON.stringify(CANONICAL_WORKBENCH_REGION_DEFINITIONS));
    const editor = validEditor();
    const workspace = salesWorkspace();
    const preferences = validUiPreferences();
    const schema = propertySchema();
    const before = JSON.stringify({ regions, editor, workspace, preferences, schema });

    validateCanonicalWorkbenchRegions(regions);
    validateEditorDefinition(editor);
    validateWorkspacePreset(workspace);
    validateWorkbenchUiPreferences(preferences);
    validatePropertySchemaDefinition(schema);

    expect(JSON.stringify({ regions, editor, workspace, preferences, schema })).toBe(before);
  });

  it("returns stable error codes and failing paths for every validation error", () => {
    const results = [
      validateCanonicalWorkbenchRegions([]),
      validateEditorDefinition({}),
      validateWorkspacePreset({}),
      validateWorkbenchUiPreferences({}),
      validatePropertySchemaDefinition({})
    ];

    results.forEach((validation) => {
      expect(validation.valid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
      validation.errors.forEach((error) => {
        expect(error.code).toMatch(/^[a-z][a-z0-9_.]+$/);
        expect(error.path.length).toBeGreaterThan(0);
        expect(error.message.length).toBeGreaterThan(0);
      });
    });
  });
});
