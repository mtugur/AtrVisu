import { describe, expect, it, vi } from "vitest";
import { RUNTIME_PANEL_IDS } from "../../platform/runtimePanels";
import { normalizeWorkbenchUiPreferences } from "../uiPreferences/uiPreferencesNormalizer";
import { createDefaultWorkbenchUiPreferences } from "../uiPreferences";
import type { UiPreferencesRuntimeStore } from "../uiPreferences";
import { createWorkspaceRuntime, deriveWorkspaceRuntimeProjection } from "./workspaceRuntime";
import {
  LAYOUT_ENGINEERING_WORKSPACE_ID,
  SALES_LAYOUT_WORKSPACE_ID
} from "./workspacePresetDefinitions";

const createStore = () => {
  let preferences = createDefaultWorkbenchUiPreferences();
  const updatePreferences = vi.fn<UiPreferencesRuntimeStore["updatePreferences"]>((update) => {
    preferences = typeof update === "function" ? update(preferences) : update;
    return { accepted: true, persisted: Promise.resolve(true) };
  });
  const store = {
    getSnapshot: () => ({ preferences, hydrationStatus: "ready" as const, warning: null, revision: 1 }),
    updatePreferences,
    updateTheme: vi.fn((theme) => updatePreferences((current) => ({ ...current, theme })))
  } as unknown as UiPreferencesRuntimeStore;
  return { store, getPreferences: () => preferences, updatePreferences };
};

describe("workspace runtime", () => {
  it("derives contextual defaults without treating Current arrangement as Sales", () => {
    expect(deriveWorkspaceRuntimeProjection(createDefaultWorkbenchUiPreferences())).toEqual({
      inspectorMode: "contextual",
      emphasizedCommandIds: [],
      defaultEditorId: "layout.3d"
    });
  });

  it("applies one workspace with exactly one preference-runtime transaction", () => {
    const harness = createStore();
    const runtime = createWorkspaceRuntime(harness.store);
    const result = runtime.applyWorkspace(SALES_LAYOUT_WORKSPACE_ID);

    expect(result.accepted).toBe(true);
    expect(harness.updatePreferences).toHaveBeenCalledTimes(1);
    expect(harness.getPreferences().activeWorkspaceId).toBe(SALES_LAYOUT_WORKSPACE_ID);
    expect(runtime.getProjection()).toMatchObject({
      activeWorkspaceId: SALES_LAYOUT_WORKSPACE_ID,
      inspectorMode: "summary",
      defaultEditorId: "layout.3d"
    });
  });

  it("keeps workspace identity for theme and matching density changes", () => {
    const harness = createStore();
    const runtime = createWorkspaceRuntime(harness.store);
    runtime.applyWorkspace(SALES_LAYOUT_WORKSPACE_ID);
    runtime.updateTheme("light");
    runtime.updateDensity("comfortable");
    expect(harness.getPreferences()).toMatchObject({
      activeWorkspaceId: SALES_LAYOUT_WORKSPACE_ID,
      theme: "light",
      density: "comfortable"
    });
  });

  it("clears workspace identity for density and panel visibility composition overrides", () => {
    const harness = createStore();
    const runtime = createWorkspaceRuntime(harness.store);
    runtime.applyWorkspace(SALES_LAYOUT_WORKSPACE_ID);
    runtime.updateDensity("compact");
    expect(harness.getPreferences().activeWorkspaceId).toBeUndefined();

    runtime.applyWorkspace(LAYOUT_ENGINEERING_WORKSPACE_ID);
    runtime.updatePanelVisibility(RUNTIME_PANEL_IDS.layers, false);
    expect(harness.getPreferences().activeWorkspaceId).toBeUndefined();
    expect(harness.getPreferences().panels.find(({ panelId }) => panelId === RUNTIME_PANEL_IDS.layers)?.visible)
      .toBe(false);
  });

  it("rejects unknown workspace and shell visibility operations without a runtime update", () => {
    const harness = createStore();
    const runtime = createWorkspaceRuntime(harness.store);
    expect(runtime.applyWorkspace("workspace.unknown").accepted).toBe(false);
    expect(runtime.updatePanelVisibility(RUNTIME_PANEL_IDS.rightPanelShell, false).accepted).toBe(false);
    expect(harness.updatePreferences).not.toHaveBeenCalled();
  });

  it("normalizes an unknown persisted workspace to Current arrangement with a bounded warning", () => {
    const result = normalizeWorkbenchUiPreferences({
      ...createDefaultWorkbenchUiPreferences(),
      activeWorkspaceId: "workspace.unknown"
    });
    expect(result.preferences.activeWorkspaceId).toBeUndefined();
    expect(result.warnings).toContain('Unknown workspace preference "workspace.unknown" was removed.');
  });
});
