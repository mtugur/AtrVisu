import type { DensityId, ThemeId } from "./designSystem";
import type { PanelId } from "./panel";
import type { WorkbenchDockRegionId } from "./workbench";
import type { WorkspaceId } from "./workspace";

export type ThemePreference = ThemeId;
export type DensityPreference = DensityId;

export type PanelPreference = {
  panelId: PanelId;
  visible: boolean;
  collapsed: boolean;
  size?: number;
  order: number;
  dock: WorkbenchDockRegionId;
};

export const UI_PREFERENCES_SCHEMA_VERSION = 1 as const;

export type WorkbenchUiPreferences = {
  schemaVersion: typeof UI_PREFERENCES_SCHEMA_VERSION;
  theme: ThemePreference;
  density: DensityPreference;
  activeWorkspaceId?: WorkspaceId;
  panels: readonly PanelPreference[];
};
