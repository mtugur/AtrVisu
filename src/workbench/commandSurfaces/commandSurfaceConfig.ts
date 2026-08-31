import {
  CORE_EDITOR_COMMAND_IDS,
  type CoreEditorCommandId
} from "../../platform/runtimeCommands/coreEditorRuntimeCommands";
import {
  RUNTIME_FEATURE_COMMAND_IDS,
  type RuntimeFeatureCommandId
} from "../../platform/runtimeCommands/runtimeFeatureCommands";
import {
  ASSEMBLY_COMMAND_IDS,
  type AssemblyCommandId
} from "../../platform/runtimeCommands/assemblyRuntimeCommands";

export const APPLICATION_BAR_COMMAND_IDS = [] as const;

export const COMMAND_SURFACE_MENU_DEFINITIONS = [
  {
    id: "file",
    labelKey: "menu.file",
    fallbackLabel: "File",
    commandIds: [
      RUNTIME_FEATURE_COMMAND_IDS.projectSave,
      RUNTIME_FEATURE_COMMAND_IDS.projectExportJson,
      RUNTIME_FEATURE_COMMAND_IDS.projectImportJson,
      RUNTIME_FEATURE_COMMAND_IDS.projectRestorePrompt,
      RUNTIME_FEATURE_COMMAND_IDS.projectManager,
      RUNTIME_FEATURE_COMMAND_IDS.layoutControls,
      RUNTIME_FEATURE_COMMAND_IDS.commercialOutputs
    ]
  },
  {
    id: "edit",
    labelKey: "menu.edit",
    fallbackLabel: "Edit",
    commandIds: [
      CORE_EDITOR_COMMAND_IDS.undo,
      CORE_EDITOR_COMMAND_IDS.redo,
      RUNTIME_FEATURE_COMMAND_IDS.renameSelected,
      CORE_EDITOR_COMMAND_IDS.duplicateSelected,
      CORE_EDITOR_COMMAND_IDS.deleteSelected
    ]
  },
  {
    id: "view",
    labelKey: "menu.view",
    fallbackLabel: "View",
    commandIds: [
      RUNTIME_FEATURE_COMMAND_IDS.displayOverlayControls,
      RUNTIME_FEATURE_COMMAND_IDS.toggleLabels,
      RUNTIME_FEATURE_COMMAND_IDS.viewpoints,
      RUNTIME_FEATURE_COMMAND_IDS.toggleConnectionPoints
    ]
  },
  {
    id: "insert",
    labelKey: "menu.insert",
    fallbackLabel: "Insert",
    commandIds: [
      RUNTIME_FEATURE_COMMAND_IDS.createAnnotation,
      RUNTIME_FEATURE_COMMAND_IDS.addFloor,
      RUNTIME_FEATURE_COMMAND_IDS.addWall,
      RUNTIME_FEATURE_COMMAND_IDS.addColumn,
      RUNTIME_FEATURE_COMMAND_IDS.addWalkway,
      RUNTIME_FEATURE_COMMAND_IDS.addRestrictedZone,
      RUNTIME_FEATURE_COMMAND_IDS.addReferenceZone
    ]
  },
  {
    id: "arrange",
    labelKey: "menu.arrange",
    fallbackLabel: "Arrange",
    commandIds: [
      RUNTIME_FEATURE_COMMAND_IDS.alignLeft,
      RUNTIME_FEATURE_COMMAND_IDS.alignRight,
      RUNTIME_FEATURE_COMMAND_IDS.alignFront,
      RUNTIME_FEATURE_COMMAND_IDS.alignBack,
      RUNTIME_FEATURE_COMMAND_IDS.alignCenterX,
      RUNTIME_FEATURE_COMMAND_IDS.alignCenterY,
      RUNTIME_FEATURE_COMMAND_IDS.distributeHorizontal,
      RUNTIME_FEATURE_COMMAND_IDS.distributeVertical,
      RUNTIME_FEATURE_COMMAND_IDS.equalGapX,
      RUNTIME_FEATURE_COMMAND_IDS.equalGapY,
      ASSEMBLY_COMMAND_IDS.createGroup,
      ASSEMBLY_COMMAND_IDS.ungroup,
      RUNTIME_FEATURE_COMMAND_IDS.alignmentTools
    ]
  },
  {
    id: "tools",
    labelKey: "menu.tools",
    fallbackLabel: "Tools",
    commandIds: [
      RUNTIME_FEATURE_COMMAND_IDS.libraryManager,
      RUNTIME_FEATURE_COMMAND_IDS.taxonomyManager,
      RUNTIME_FEATURE_COMMAND_IDS.collisionCheck,
      RUNTIME_FEATURE_COMMAND_IDS.performanceBenchmark,
      RUNTIME_FEATURE_COMMAND_IDS.simulationControls,
      RUNTIME_FEATURE_COMMAND_IDS.showMeasurements
    ]
  },
  {
    id: "help",
    labelKey: "menu.help",
    fallbackLabel: "Help",
    commandIds: [
      RUNTIME_FEATURE_COMMAND_IDS.helpQuickStart,
      RUNTIME_FEATURE_COMMAND_IDS.helpKeyboardShortcuts,
      RUNTIME_FEATURE_COMMAND_IDS.helpAbout
    ]
  }
] as const;

export const COMMAND_BAR_COMMAND_IDS = [
  RUNTIME_FEATURE_COMMAND_IDS.projectSave,
  CORE_EDITOR_COMMAND_IDS.undo,
  CORE_EDITOR_COMMAND_IDS.redo,
  CORE_EDITOR_COMMAND_IDS.duplicateSelected,
  CORE_EDITOR_COMMAND_IDS.deleteSelected,
  RUNTIME_FEATURE_COMMAND_IDS.toggleLabels,
  RUNTIME_FEATURE_COMMAND_IDS.toggleConnectionPoints,
  RUNTIME_FEATURE_COMMAND_IDS.viewpoints
] as const;

export const COMMAND_BAR_SHORT_LABELS: Readonly<Record<string, string>> = Object.freeze({
  [CORE_EDITOR_COMMAND_IDS.undo]: "Undo",
  [CORE_EDITOR_COMMAND_IDS.redo]: "Redo",
  [RUNTIME_FEATURE_COMMAND_IDS.renameSelected]: "Rename",
  [CORE_EDITOR_COMMAND_IDS.duplicateSelected]: "Duplicate",
  [CORE_EDITOR_COMMAND_IDS.deleteSelected]: "Delete",
  [RUNTIME_FEATURE_COMMAND_IDS.toggleLabels]: "Labels",
  [RUNTIME_FEATURE_COMMAND_IDS.toggleConnectionPoints]: "Points",
  [RUNTIME_FEATURE_COMMAND_IDS.viewpoints]: "Viewpoints"
});

export type CommandSurfaceCoreCommandId = CoreEditorCommandId;
export type CommandSurfaceRuntimeCommandId = RuntimeFeatureCommandId;
export type CommandSurfaceAssemblyCommandId = AssemblyCommandId;

const coreCommandIds = new Set<string>(Object.values(CORE_EDITOR_COMMAND_IDS));
const runtimeCommandIds = new Set<string>(Object.values(RUNTIME_FEATURE_COMMAND_IDS));
const assemblyCommandIds = new Set<string>(Object.values(ASSEMBLY_COMMAND_IDS));

export const getCommandSurfaceRuntimeRoute = (commandId: string) => {
  if (coreCommandIds.has(commandId)) {
    return "core" as const;
  }
  if (runtimeCommandIds.has(commandId)) {
    return "runtime" as const;
  }
  if (assemblyCommandIds.has(commandId)) {
    return "assembly" as const;
  }
  return undefined;
};
