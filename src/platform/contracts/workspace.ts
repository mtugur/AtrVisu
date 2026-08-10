import type { CommandId } from "./command";
import type { DensityId } from "./designSystem";
import type { EditorId } from "./editor";
import type { PanelId } from "./panel";

export const WORKSPACE_INSPECTOR_MODES = ["contextual", "summary", "engineering"] as const;
export type WorkspaceInspectorMode = (typeof WORKSPACE_INSPECTOR_MODES)[number];

export const WORKSPACE_IDS = [
  "workspace.sales-layout",
  "workspace.layout-engineering"
] as const;
export type WorkspaceId = (typeof WORKSPACE_IDS)[number];

// Compatibility export retained for Phase 1 architecture consumers.
export const PLANNED_WORKSPACE_IDS = WORKSPACE_IDS;

export const WORKSPACE_PRESET_SCHEMA_VERSION = 1 as const;

export type WorkspacePreset = {
  schemaVersion: typeof WORKSPACE_PRESET_SCHEMA_VERSION;
  id: WorkspaceId;
  labelKey: string;
  tooltipKey?: string;
  defaultEditorId: EditorId;
  initiallyVisiblePanelIds: readonly PanelId[];
  emphasizedCommandIds: readonly CommandId[];
  inspectorMode: WorkspaceInspectorMode;
  densityPreference?: DensityId;
};
