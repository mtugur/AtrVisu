import { describe, expect, it } from "vitest";
import type { WorkbenchUiPreferences } from "../../platform/contracts";
import { RUNTIME_PANEL_IDS } from "../../platform/runtimePanels";
import { createDefaultWorkbenchUiPreferences } from "../uiPreferences";
import {
  applyWorkspaceToPreferences,
  clearActiveWorkspace
} from "./workspaceApplication";
import {
  LAYOUT_ENGINEERING_WORKSPACE_ID,
  SALES_LAYOUT_WORKSPACE_ID
} from "./workspacePresetDefinitions";
import {
  liveWorkspacePanelDescriptors,
  workspacePresetRegistry
} from "./workspacePresetRegistry";

const customizePreferences = () => {
  const defaults = createDefaultWorkbenchUiPreferences();
  return {
    ...defaults,
    theme: "light" as const,
    panels: defaults.panels.map((panel, order) => ({
      ...panel,
      visible: order % 2 === 0,
      collapsed: order % 3 === 0,
      size: panel.size === undefined ? undefined : 512,
      order: defaults.panels.length - order - 1,
      dock: order % 2 === 0 ? "primary-dock" as const : "bottom-dock" as const
    }))
  };
};

const getPanel = (preferences: WorkbenchUiPreferences, panelId: string) =>
  preferences.panels.find((panel) => panel.panelId === panelId)!;

const liveContentPanelIds = new Set(
  liveWorkspacePanelDescriptors.map(({ definition }) => definition.id)
);

const isWorkbenchShellPanel = (panelId: string) => panelId === RUNTIME_PANEL_IDS.primaryDockShell
  || panelId === RUNTIME_PANEL_IDS.rightPanelShell
  || panelId === RUNTIME_PANEL_IDS.bottomDockShell;

const isAlwaysOpenWorkspaceShell = (panelId: string) => panelId === RUNTIME_PANEL_IDS.primaryDockShell
  || panelId === RUNTIME_PANEL_IDS.rightPanelShell;

describe("workspace application", () => {
  it("applies Sales Layout in one presentation result while preserving theme and panel geometry", () => {
    const before = customizePreferences();
    const result = applyWorkspaceToPreferences(before, SALES_LAYOUT_WORKSPACE_ID);
    const preset = workspacePresetRegistry.require(SALES_LAYOUT_WORKSPACE_ID);

    expect(result.accepted).toBe(true);
    expect(result.preferences).toMatchObject({
      activeWorkspaceId: SALES_LAYOUT_WORKSPACE_ID,
      density: "comfortable",
      theme: "light"
    });
    expect(getPanel(result.preferences, RUNTIME_PANEL_IDS.rightPanelShell)).toMatchObject({
      visible: true,
      collapsed: false,
      size: 512
    });
    result.preferences.panels.forEach((panel) => {
      const previous = getPanel(before, panel.panelId);
      const isAlwaysOpenShell = isAlwaysOpenWorkspaceShell(panel.panelId);
      expect(panel).toMatchObject({
        collapsed: isAlwaysOpenShell ? false : previous.collapsed,
        order: previous.order,
        dock: previous.dock
      });
      if (!isAlwaysOpenShell) {
        expect(panel.visible).toBe(liveContentPanelIds.has(panel.panelId)
          ? preset.initiallyVisiblePanelIds.includes(panel.panelId)
          : previous.visible);
      }
    });
    expect(before).toEqual(customizePreferences());
  });

  it("keeps Viewpoints in Primary Dock while preserving the dormant Bottom Dock preference", () => {
    const defaults = createDefaultWorkbenchUiPreferences();
    const before = {
      ...defaults,
      panels: defaults.panels.map((panel) => panel.panelId === RUNTIME_PANEL_IDS.bottomDockShell
        ? { ...panel, collapsed: false, size: 233 }
        : panel)
    };
    const bottomBefore = getPanel(before, RUNTIME_PANEL_IDS.bottomDockShell);
    const result = applyWorkspaceToPreferences(before, SALES_LAYOUT_WORKSPACE_ID);

    expect(getPanel(result.preferences, RUNTIME_PANEL_IDS.viewpoints)).toMatchObject({
      visible: true,
      dock: "primary-dock"
    });
    expect(getPanel(result.preferences, RUNTIME_PANEL_IDS.bottomDockShell)).toEqual(bottomBefore);
  });

  it("applies Layout Engineering with compact density and exact visibility", () => {
    const before = customizePreferences();
    const result = applyWorkspaceToPreferences(before, LAYOUT_ENGINEERING_WORKSPACE_ID);
    const preset = workspacePresetRegistry.require(LAYOUT_ENGINEERING_WORKSPACE_ID);

    expect(result.preferences.activeWorkspaceId).toBe(LAYOUT_ENGINEERING_WORKSPACE_ID);
    expect(result.preferences.density).toBe("compact");
    result.preferences.panels
      .filter(({ panelId }) => !isWorkbenchShellPanel(panelId))
      .forEach((panel) => {
        const previous = getPanel(before, panel.panelId);
        expect(panel.visible).toBe(liveContentPanelIds.has(panel.panelId)
          ? preset.initiallyVisiblePanelIds.includes(panel.panelId)
          : previous.visible);
        expect(panel.collapsed).toBe(previous.collapsed);
      });
  });

  it("clears to Current arrangement without any additional presentation mutation", () => {
    const applied = applyWorkspaceToPreferences(customizePreferences(), SALES_LAYOUT_WORKSPACE_ID).preferences;
    const cleared = clearActiveWorkspace(applied);
    expect(cleared.activeWorkspaceId).toBeUndefined();
    expect({ ...cleared, activeWorkspaceId: SALES_LAYOUT_WORKSPACE_ID }).toEqual(applied);
  });

  it("rejects unknown workspaces without cloning or changing preferences", () => {
    const before = customizePreferences();
    const result = applyWorkspaceToPreferences(before, "workspace.unknown");
    expect(result).toMatchObject({ accepted: false, preferences: before });
    expect(result.preferences).toBe(before);
  });
});
