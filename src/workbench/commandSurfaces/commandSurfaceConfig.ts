import {
  CORE_EDITOR_COMMAND_IDS,
  type CoreEditorCommandId
} from "../../platform/runtimeCommands/coreEditorRuntimeCommands";
import {
  RUNTIME_FEATURE_COMMAND_IDS,
  type RuntimeFeatureCommandId
} from "../../platform/runtimeCommands/runtimeFeatureCommands";

export const APPLICATION_BAR_COMMAND_IDS = [
  RUNTIME_FEATURE_COMMAND_IDS.projectSave
] as const;

export const COMMAND_SURFACE_MENU_DEFINITIONS = [
  {
    id: "file",
    label: "File",
    commandIds: [
      RUNTIME_FEATURE_COMMAND_IDS.projectSave,
      RUNTIME_FEATURE_COMMAND_IDS.projectExportJson,
      RUNTIME_FEATURE_COMMAND_IDS.projectImportJson,
      RUNTIME_FEATURE_COMMAND_IDS.projectRestorePrompt
    ]
  },
  {
    id: "edit",
    label: "Edit",
    commandIds: [
      CORE_EDITOR_COMMAND_IDS.undo,
      CORE_EDITOR_COMMAND_IDS.redo,
      CORE_EDITOR_COMMAND_IDS.duplicateSelected,
      CORE_EDITOR_COMMAND_IDS.deleteSelected
    ]
  },
  {
    id: "view",
    label: "View",
    commandIds: [
      RUNTIME_FEATURE_COMMAND_IDS.toggleLabels,
      RUNTIME_FEATURE_COMMAND_IDS.viewpoints,
      RUNTIME_FEATURE_COMMAND_IDS.toggleConnectionPoints,
      RUNTIME_FEATURE_COMMAND_IDS.showMeasurements
    ]
  },
  {
    id: "tools",
    label: "Tools",
    commandIds: [
      RUNTIME_FEATURE_COMMAND_IDS.libraryManager,
      RUNTIME_FEATURE_COMMAND_IDS.taxonomyManager,
      RUNTIME_FEATURE_COMMAND_IDS.collisionCheck,
      RUNTIME_FEATURE_COMMAND_IDS.performanceBenchmark
    ]
  }
] as const;

export const COMMAND_BAR_COMMAND_IDS = [
  CORE_EDITOR_COMMAND_IDS.undo,
  CORE_EDITOR_COMMAND_IDS.redo,
  CORE_EDITOR_COMMAND_IDS.duplicateSelected,
  CORE_EDITOR_COMMAND_IDS.deleteSelected,
  RUNTIME_FEATURE_COMMAND_IDS.toggleLabels,
  RUNTIME_FEATURE_COMMAND_IDS.showMeasurements,
  RUNTIME_FEATURE_COMMAND_IDS.toggleConnectionPoints,
  RUNTIME_FEATURE_COMMAND_IDS.viewpoints
] as const;

export type CommandSurfaceCoreCommandId = CoreEditorCommandId;
export type CommandSurfaceRuntimeCommandId = RuntimeFeatureCommandId;

const coreCommandIds = new Set<string>(Object.values(CORE_EDITOR_COMMAND_IDS));
const runtimeCommandIds = new Set<string>(Object.values(RUNTIME_FEATURE_COMMAND_IDS));

export const getCommandSurfaceRuntimeRoute = (commandId: string) => {
  if (coreCommandIds.has(commandId)) {
    return "core" as const;
  }
  if (runtimeCommandIds.has(commandId)) {
    return "runtime" as const;
  }
  return undefined;
};
