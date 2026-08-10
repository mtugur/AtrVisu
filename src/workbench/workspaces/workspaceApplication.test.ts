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
import { workspacePresetRegistry } from "./workspacePresetRegistry";

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
      expect(panel).toMatchObject({
        collapsed: panel.panelId === RUNTIME_PANEL_IDS.rightPanelShell ? false : previous.collapsed,
        order: previous.order,
        dock: previous.dock
      });
      if (panel.panelId !== RUNTIME_PANEL_IDS.rightPanelShell) {
        expect(panel.visible).toBe(preset.initiallyVisiblePanelIds.includes(panel.panelId));
      }
    });
    expect(before).toEqual(customizePreferences());
  });

  it("applies Layout Engineering with compact density and exact visibility", () => {
    const before = customizePreferences();
    const result = applyWorkspaceToPreferences(before, LAYOUT_ENGINEERING_WORKSPACE_ID);
    const preset = workspacePresetRegistry.require(LAYOUT_ENGINEERING_WORKSPACE_ID);

    expect(result.preferences.activeWorkspaceId).toBe(LAYOUT_ENGINEERING_WORKSPACE_ID);
    expect(result.preferences.density).toBe("compact");
    result.preferences.panels
      .filter(({ panelId }) => panelId !== RUNTIME_PANEL_IDS.rightPanelShell)
      .forEach((panel) => {
        expect(panel.visible).toBe(preset.initiallyVisiblePanelIds.includes(panel.panelId));
        expect(panel.collapsed).toBe(getPanel(before, panel.panelId).collapsed);
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
