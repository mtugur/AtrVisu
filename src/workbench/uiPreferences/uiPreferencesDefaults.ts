import type { PanelPreference, WorkbenchUiPreferences } from "../../platform/contracts";
import { UI_PREFERENCES_SCHEMA_VERSION } from "../../platform/contracts";
import { RUNTIME_PANEL_IDS } from "../../platform/runtimePanels/runtimePanelRegistryBridge";
import {
  DEFAULT_BOTTOM_DOCK_HEIGHT,
  DEFAULT_PRIMARY_DOCK_WIDTH
} from "../dockSizing";

export const MIN_RIGHT_PANEL_WIDTH = 280;
export const MAX_RIGHT_PANEL_WIDTH = 600;
export const DEFAULT_RIGHT_PANEL_WIDTH = 360;

export const COMPATIBILITY_PANEL_DEFAULTS = [
  { panelId: RUNTIME_PANEL_IDS.rightPanelShell, collapsed: false, size: DEFAULT_RIGHT_PANEL_WIDTH },
  { panelId: RUNTIME_PANEL_IDS.primaryDockShell, collapsed: false, size: DEFAULT_PRIMARY_DOCK_WIDTH },
  { panelId: RUNTIME_PANEL_IDS.bottomDockShell, collapsed: true, size: DEFAULT_BOTTOM_DOCK_HEIGHT },
  { panelId: RUNTIME_PANEL_IDS.machineLibrary, collapsed: false },
  { panelId: RUNTIME_PANEL_IDS.layoutExplorer, collapsed: false },
  { panelId: RUNTIME_PANEL_IDS.layoutControls, collapsed: false },
  { panelId: RUNTIME_PANEL_IDS.viewpoints, collapsed: true },
  { panelId: RUNTIME_PANEL_IDS.layers, collapsed: true },
  { panelId: RUNTIME_PANEL_IDS.civilReferences, collapsed: true },
  { panelId: RUNTIME_PANEL_IDS.groups, collapsed: true },
  { panelId: RUNTIME_PANEL_IDS.projectStatus, collapsed: false },
  { panelId: RUNTIME_PANEL_IDS.performanceBenchmarkLauncher, collapsed: true },
  { panelId: RUNTIME_PANEL_IDS.simulationControls, collapsed: true },
  { panelId: RUNTIME_PANEL_IDS.annotations, collapsed: true },
  { panelId: RUNTIME_PANEL_IDS.precisionPlacement, collapsed: false },
  { panelId: RUNTIME_PANEL_IDS.alignmentTools, collapsed: true },
  { panelId: RUNTIME_PANEL_IDS.connectionPointSnap, collapsed: false },
  { panelId: RUNTIME_PANEL_IDS.displayOverlayControls, collapsed: true },
  { panelId: RUNTIME_PANEL_IDS.collisionCheck, collapsed: false },
  { panelId: RUNTIME_PANEL_IDS.inspector, collapsed: false },
  { panelId: RUNTIME_PANEL_IDS.statusBar, collapsed: false }
] as const;

export type CompatibilityPanelId = typeof COMPATIBILITY_PANEL_DEFAULTS[number]["panelId"];

export const COMPATIBILITY_PANEL_IDS = COMPATIBILITY_PANEL_DEFAULTS.map(
  ({ panelId }) => panelId
) as readonly CompatibilityPanelId[];

export const createDefaultWorkbenchUiPreferences = (): WorkbenchUiPreferences => ({
  schemaVersion: UI_PREFERENCES_SCHEMA_VERSION,
  theme: "dark",
  density: "comfortable",
  panels: COMPATIBILITY_PANEL_DEFAULTS.map((entry, order): PanelPreference => ({
    panelId: entry.panelId,
    visible: true,
    collapsed: entry.collapsed,
    ...("size" in entry ? { size: entry.size } : {}),
    order,
    dock: entry.panelId === RUNTIME_PANEL_IDS.primaryDockShell
      || entry.panelId === RUNTIME_PANEL_IDS.machineLibrary
      || entry.panelId === RUNTIME_PANEL_IDS.layoutExplorer
      || entry.panelId === RUNTIME_PANEL_IDS.layers
      || entry.panelId === RUNTIME_PANEL_IDS.groups
      || entry.panelId === RUNTIME_PANEL_IDS.viewpoints
      ? "primary-dock"
      : entry.panelId === RUNTIME_PANEL_IDS.bottomDockShell
        || entry.panelId === RUNTIME_PANEL_IDS.alignmentTools
        || entry.panelId === RUNTIME_PANEL_IDS.statusBar
        ? "bottom-dock"
        : "secondary-dock"
  }))
});

export const cloneWorkbenchUiPreferences = (
  preferences: WorkbenchUiPreferences
): WorkbenchUiPreferences => ({
  schemaVersion: preferences.schemaVersion,
  theme: preferences.theme,
  density: preferences.density,
  ...(preferences.activeWorkspaceId ? { activeWorkspaceId: preferences.activeWorkspaceId } : {}),
  panels: preferences.panels.map((panel) => ({ ...panel }))
});
