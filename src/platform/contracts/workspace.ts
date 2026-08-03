import type { CommandId } from "./command";
import type { DensityId } from "./designSystem";
import type { EditorId } from "./editor";
import type { PanelId } from "./panel";

export type WorkspaceId = string;

export const WORKSPACE_INSPECTOR_MODES = ["contextual", "summary", "engineering"] as const;
export type WorkspaceInspectorMode = (typeof WORKSPACE_INSPECTOR_MODES)[number];

export const PLANNED_WORKSPACE_IDS = [
  "workspace.sales-layout",
  "workspace.layout-engineering"
] as const;

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
