import {
  WORKSPACE_PRESET_SCHEMA_VERSION,
  type WorkspaceId,
  type WorkspacePreset
} from "../../platform/contracts";
import { RUNTIME_FEATURE_COMMAND_IDS } from "../../platform/runtimeCommands/runtimeFeatureCommands";
import { CORE_EDITOR_COMMAND_IDS } from "../../platform/runtimeCommands/coreEditorRuntimeCommands";
import { RUNTIME_PANEL_IDS } from "../../platform/runtimePanels";
import { LAYOUT_3D_EDITOR_ID } from "../layout3dEditorDefinition";

export const SALES_LAYOUT_WORKSPACE_ID = "workspace.sales-layout" as const;
export const LAYOUT_ENGINEERING_WORKSPACE_ID = "workspace.layout-engineering" as const;

export const workspacePresetDefinitions = Object.freeze([
  Object.freeze({
    schemaVersion: WORKSPACE_PRESET_SCHEMA_VERSION,
    id: SALES_LAYOUT_WORKSPACE_ID,
    labelKey: "workspace.salesLayout",
    tooltipKey: "workspace.salesLayout.tooltip",
    defaultEditorId: LAYOUT_3D_EDITOR_ID,
    initiallyVisiblePanelIds: Object.freeze([
      RUNTIME_PANEL_IDS.machineLibrary,
      RUNTIME_PANEL_IDS.layoutExplorer,
      RUNTIME_PANEL_IDS.viewpoints,
      RUNTIME_PANEL_IDS.inspector
    ]),
    emphasizedCommandIds: Object.freeze([
      RUNTIME_FEATURE_COMMAND_IDS.projectSave,
      CORE_EDITOR_COMMAND_IDS.duplicateSelected,
      RUNTIME_FEATURE_COMMAND_IDS.toggleLabels,
      RUNTIME_FEATURE_COMMAND_IDS.viewpoints
    ]),
    inspectorMode: "summary",
    densityPreference: "comfortable"
  }),
  Object.freeze({
    schemaVersion: WORKSPACE_PRESET_SCHEMA_VERSION,
    id: LAYOUT_ENGINEERING_WORKSPACE_ID,
    labelKey: "workspace.layoutEngineering",
    tooltipKey: "workspace.layoutEngineering.tooltip",
    defaultEditorId: LAYOUT_3D_EDITOR_ID,
    initiallyVisiblePanelIds: Object.freeze([
      RUNTIME_PANEL_IDS.machineLibrary,
      RUNTIME_PANEL_IDS.layoutExplorer,
      RUNTIME_PANEL_IDS.viewpoints,
      RUNTIME_PANEL_IDS.layers,
      RUNTIME_PANEL_IDS.groups,
      RUNTIME_PANEL_IDS.annotations,
      RUNTIME_PANEL_IDS.precisionPlacement,
      RUNTIME_PANEL_IDS.alignmentTools,
      RUNTIME_PANEL_IDS.connectionPointSnap,
      RUNTIME_PANEL_IDS.inspector
    ]),
    emphasizedCommandIds: Object.freeze([
      CORE_EDITOR_COMMAND_IDS.undo,
      CORE_EDITOR_COMMAND_IDS.redo,
      CORE_EDITOR_COMMAND_IDS.duplicateSelected,
      CORE_EDITOR_COMMAND_IDS.deleteSelected,
      RUNTIME_FEATURE_COMMAND_IDS.showMeasurements,
      RUNTIME_FEATURE_COMMAND_IDS.toggleConnectionPoints
    ]),
    inspectorMode: "engineering",
    densityPreference: "compact"
  })
] satisfies readonly WorkspacePreset[]);

export const workspaceFallbackLabels = Object.freeze({
  [SALES_LAYOUT_WORKSPACE_ID]: "Sales Layout",
  [LAYOUT_ENGINEERING_WORKSPACE_ID]: "Layout Engineering"
} satisfies Readonly<Record<WorkspaceId, string>>);

export const workspaceFallbackTooltips = Object.freeze({
  [SALES_LAYOUT_WORKSPACE_ID]: "Apply the sales-focused layout workspace.",
  [LAYOUT_ENGINEERING_WORKSPACE_ID]: "Apply the engineering-focused layout workspace."
} satisfies Readonly<Record<WorkspaceId, string>>);
