import type { WorkbenchUiPreferences, WorkspaceId } from "../../platform/contracts";
import { RUNTIME_PANEL_IDS } from "../../platform/runtimePanels";
import { cloneWorkbenchUiPreferences } from "../uiPreferences";
import {
  liveWorkspacePanelDescriptors,
  workspacePresetRegistry,
  type WorkspacePresetRegistry
} from "./workspacePresetRegistry";

export type WorkspaceApplicationResult = Readonly<{
  accepted: boolean;
  preferences: WorkbenchUiPreferences;
  reason?: string;
}>;

const liveContentPanelIds = new Set(
  liveWorkspacePanelDescriptors.map(({ definition }) => definition.id)
);

export const applyWorkspaceToPreferences = (
  current: WorkbenchUiPreferences,
  workspaceId: string,
  registry: WorkspacePresetRegistry = workspacePresetRegistry
): WorkspaceApplicationResult => {
  const preset = registry.get(workspaceId);
  if (!preset) {
    return {
      accepted: false,
      preferences: current,
      reason: `Unknown workspace preset "${workspaceId}".`
    };
  }

  const visiblePanelIds = new Set(preset.initiallyVisiblePanelIds);
  const preferences = cloneWorkbenchUiPreferences(current);
  preferences.activeWorkspaceId = preset.id as WorkspaceId;
  if (preset.densityPreference) {
    preferences.density = preset.densityPreference;
  }
  preferences.panels = preferences.panels.map((panel) => {
    if (
      panel.panelId === RUNTIME_PANEL_IDS.primaryDockShell
      || panel.panelId === RUNTIME_PANEL_IDS.rightPanelShell
    ) {
      return { ...panel, visible: true, collapsed: false };
    }
    if (panel.panelId === RUNTIME_PANEL_IDS.bottomDockShell) {
      return {
        ...panel,
        visible: true,
        collapsed: !visiblePanelIds.has(RUNTIME_PANEL_IDS.viewpoints)
      };
    }
    if (!liveContentPanelIds.has(panel.panelId)) {
      return panel;
    }
    return { ...panel, visible: visiblePanelIds.has(panel.panelId) };
  });

  return { accepted: true, preferences };
};

export const clearActiveWorkspace = (
  current: WorkbenchUiPreferences
): WorkbenchUiPreferences => {
  const preferences = cloneWorkbenchUiPreferences(current);
  delete preferences.activeWorkspaceId;
  return preferences;
};
