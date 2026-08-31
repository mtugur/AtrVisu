import { describe, expect, it, vi } from "vitest";
import {
  createDefaultWorkbenchUiPreferences,
  createUiPreferencesRuntimeStore,
  type UiPreferencesStorage
} from "../uiPreferences";
import { RUNTIME_PANEL_IDS } from "../../platform/runtimePanels";
import { createWorkspaceRuntime } from "./workspaceRuntime";
import {
  LAYOUT_ENGINEERING_WORKSPACE_ID,
  SALES_LAYOUT_WORKSPACE_ID
} from "./workspacePresetDefinitions";

const legacyStorage = {
  getItem: () => null,
  removeItem: vi.fn()
};

const createPersistentHarness = (
  initial = createDefaultWorkbenchUiPreferences()
) => {
  let persisted = structuredClone(initial);
  const storage: UiPreferencesStorage = {
    read: vi.fn(async () => ({
      status: "valid" as const,
      preferences: structuredClone(persisted),
      warnings: []
    })),
    put: vi.fn(async (preferences) => {
      persisted = structuredClone(preferences);
    }),
    delete: vi.fn(async () => undefined)
  };
  return { storage, getPersisted: () => persisted };
};

describe("workspace persistence and invariants", () => {
  it("reconciles the previous named Sales Layout snap visibility and persists it", async () => {
    const defaults = createDefaultWorkbenchUiPreferences();
    const harness = createPersistentHarness({
      ...defaults,
      activeWorkspaceId: SALES_LAYOUT_WORKSPACE_ID,
      panels: defaults.panels.map((panel) => panel.panelId === RUNTIME_PANEL_IDS.connectionPointSnap
        ? { ...panel, visible: false }
        : panel)
    });
    const store = createUiPreferencesRuntimeStore({ storage: harness.storage, legacyStorage });

    await store.hydrate();

    expect(store.getSnapshot().preferences.activeWorkspaceId).toBe(SALES_LAYOUT_WORKSPACE_ID);
    expect(store.getSnapshot().preferences.panels.find(
      ({ panelId }) => panelId === RUNTIME_PANEL_IDS.connectionPointSnap
    )?.visible).toBe(true);
    expect(harness.getPersisted().panels.find(
      ({ panelId }) => panelId === RUNTIME_PANEL_IDS.connectionPointSnap
    )?.visible).toBe(true);
    expect(harness.storage.put).toHaveBeenCalledTimes(1);
  });

  it("preserves an intentional Custom Workspace snap visibility override", async () => {
    const defaults = createDefaultWorkbenchUiPreferences();
    const harness = createPersistentHarness({
      ...defaults,
      panels: defaults.panels.map((panel) => panel.panelId === RUNTIME_PANEL_IDS.connectionPointSnap
        ? { ...panel, visible: false }
        : panel)
    });
    const store = createUiPreferencesRuntimeStore({ storage: harness.storage, legacyStorage });

    await store.hydrate();

    expect(store.getSnapshot().preferences.activeWorkspaceId).toBeUndefined();
    expect(store.getSnapshot().preferences.panels.find(
      ({ panelId }) => panelId === RUNTIME_PANEL_IDS.connectionPointSnap
    )?.visible).toBe(false);
    expect(harness.storage.put).not.toHaveBeenCalled();
  });

  it("hydrates a selected workspace without reapplying factory panel visibility", async () => {
    const harness = createPersistentHarness();
    const firstStore = createUiPreferencesRuntimeStore({
      storage: harness.storage,
      legacyStorage
    });
    await firstStore.hydrate();
    const firstRuntime = createWorkspaceRuntime(firstStore);
    await firstRuntime.applyWorkspace(SALES_LAYOUT_WORKSPACE_ID).persisted;

    const manuallyCollapsedLayers = firstStore.updatePanelPreference(
      RUNTIME_PANEL_IDS.layers,
      { collapsed: true }
    );
    await manuallyCollapsedLayers.persisted;
    expect(harness.getPersisted().activeWorkspaceId).toBe(SALES_LAYOUT_WORKSPACE_ID);

    const reloadedStore = createUiPreferencesRuntimeStore({
      storage: harness.storage,
      legacyStorage
    });
    await reloadedStore.hydrate();
    const reloaded = reloadedStore.getSnapshot().preferences;

    expect(reloaded.activeWorkspaceId).toBe(SALES_LAYOUT_WORKSPACE_ID);
    expect(reloaded.panels.find(({ panelId }) => panelId === RUNTIME_PANEL_IDS.layers))
      .toMatchObject({ visible: false, collapsed: true });
    expect(createWorkspaceRuntime(reloadedStore).getProjection()).toMatchObject({
      activeWorkspaceId: SALES_LAYOUT_WORKSPACE_ID,
      inspectorMode: "summary"
    });
  });

  it("persists workspace, theme, density, and visibility overrides through the single preference authority", async () => {
    const harness = createPersistentHarness();
    const store = createUiPreferencesRuntimeStore({ storage: harness.storage, legacyStorage });
    await store.hydrate();
    const runtime = createWorkspaceRuntime(store);

    await runtime.applyWorkspace(LAYOUT_ENGINEERING_WORKSPACE_ID).persisted;
    await runtime.updateTheme("light").persisted;
    await runtime.updateDensity("comfortable").persisted;
    await runtime.updatePanelVisibility(RUNTIME_PANEL_IDS.layers, false).persisted;

    expect(harness.getPersisted()).toMatchObject({
      theme: "light",
      density: "comfortable"
    });
    expect(harness.getPersisted().activeWorkspaceId).toBeUndefined();
    expect(harness.getPersisted().panels.find(({ panelId }) => panelId === RUNTIME_PANEL_IDS.layers))
      .toMatchObject({ visible: false });
  });

  it("uses one store revision and one persistence write for each workspace application", async () => {
    const harness = createPersistentHarness();
    const store = createUiPreferencesRuntimeStore({ storage: harness.storage, legacyStorage });
    await store.hydrate();
    const runtime = createWorkspaceRuntime(store);
    const revisionBefore = store.getSnapshot().revision;
    const writesBefore = vi.mocked(harness.storage.put).mock.calls.length;

    await runtime.applyWorkspace(SALES_LAYOUT_WORKSPACE_ID).persisted;

    expect(store.getSnapshot().revision).toBe(revisionBefore + 1);
    expect(vi.mocked(harness.storage.put).mock.calls.length).toBe(writesBefore + 1);
  });
});
