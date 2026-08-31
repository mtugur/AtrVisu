import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import {
  ATRVISU_DB_NAME,
  UI_PREFERENCES_RECORD_KEY,
  UI_PREFERENCES_STORE_NAME,
  openAtrVisuDatabase,
  resetAtrVisuDatabaseConnectionForTests
} from "../../utils/storage/indexedDb";
import { RUNTIME_PANEL_IDS } from "../../platform/runtimePanels/runtimePanelRegistryBridge";
import { createDefaultWorkbenchUiPreferences } from "./uiPreferencesDefaults";
import { normalizeWorkbenchUiPreferences } from "./uiPreferencesNormalizer";
import { createIndexedDbUiPreferencesStorage } from "./uiPreferencesStorage";

const deleteDatabase = () => new Promise<void>((resolve, reject) => {
  const request = indexedDB.deleteDatabase(ATRVISU_DB_NAME);
  request.onsuccess = () => resolve();
  request.onerror = () => reject(request.error);
});

describe("UI preferences storage and normalization", () => {
  beforeEach(async () => {
    resetAtrVisuDatabaseConnectionForTests();
    await deleteDatabase();
  });

  it("distinguishes absence, saves a validated clone, reloads, and deletes", async () => {
    const storage = createIndexedDbUiPreferencesStorage();
    expect(await storage.read()).toEqual({ status: "absent" });

    const preferences = createDefaultWorkbenchUiPreferences();
    await storage.put(preferences);
    (preferences.panels[0] as { collapsed: boolean }).collapsed = true;

    const saved = await storage.read();
    expect(saved.status).toBe("valid");
    if (saved.status === "valid") {
      expect(saved.preferences.panels[0].collapsed).toBe(false);
      (saved.preferences.panels[0] as { collapsed: boolean }).collapsed = true;
    }
    const reloaded = await storage.read();
    expect(reloaded.status === "valid" && reloaded.preferences.panels[0].collapsed).toBe(false);

    await storage.delete();
    expect(await storage.read()).toEqual({ status: "absent" });
  });

  it("normalizes invalid fields, duplicates, orders, dock sizes, docks, and unknown panels", () => {
    const defaults = createDefaultWorkbenchUiPreferences();
    const result = normalizeWorkbenchUiPreferences({
      ...defaults,
      theme: "invalid",
      density: "invalid",
      panels: [
        { ...defaults.panels[0], size: 9999, order: 20, dock: "invalid" },
        { ...defaults.panels[0], collapsed: true },
        { ...defaults.panels[1], size: 9999, order: 20 },
        { ...defaults.panels[2], size: 1, order: 21 },
        { ...defaults.panels[3], panelId: "panel.unknown" }
      ]
    });

    expect(result.preferences.theme).toBe("dark");
    expect(result.preferences.density).toBe("comfortable");
    expect(result.preferences.panels).toHaveLength(defaults.panels.length);
    expect(result.preferences.panels.find((panel) => panel.panelId === RUNTIME_PANEL_IDS.rightPanelShell)?.size).toBe(600);
    expect(result.preferences.panels.find((panel) => panel.panelId === RUNTIME_PANEL_IDS.primaryDockShell)?.size).toBe(480);
    expect(result.preferences.panels.find((panel) => panel.panelId === RUNTIME_PANEL_IDS.bottomDockShell)?.size).toBe(100);
    expect(new Set(result.preferences.panels.map((panel) => panel.order)).size).toBe(defaults.panels.length);
    result.preferences.panels.forEach((panel) => {
      expect(panel.dock).toBe(defaults.panels.find(({ panelId }) => panelId === panel.panelId)?.dock);
    });
    expect(result.warnings.join(" ")).toContain("Duplicate");
    expect(result.warnings.join(" ")).toContain("Unknown");
  });

  it("rejects domain-shaped and malformed data without throwing", () => {
    expect(normalizeWorkbenchUiPreferences({ projectId: "project-1" }).rejectedDomainPayload).toBe(true);
    expect(normalizeWorkbenchUiPreferences(null).preferences).toEqual(createDefaultWorkbenchUiPreferences());
  });

  it("converges legacy Viewpoints ownership to Primary Dock without changing Bottom Dock sizing", () => {
    const defaults = createDefaultWorkbenchUiPreferences();
    const result = normalizeWorkbenchUiPreferences({
      ...defaults,
      theme: "light",
      panels: defaults.panels.map((panel) => {
        if (panel.panelId === RUNTIME_PANEL_IDS.viewpoints) {
          return { ...panel, dock: "bottom-dock" };
        }
        if (panel.panelId === RUNTIME_PANEL_IDS.bottomDockShell) {
          return { ...panel, size: 233, collapsed: false };
        }
        return panel;
      })
    });

    expect(result.preferences.theme).toBe("light");
    expect(result.preferences.panels.find(({ panelId }) => panelId === RUNTIME_PANEL_IDS.viewpoints)?.dock)
      .toBe("primary-dock");
    expect(result.preferences.panels.find(({ panelId }) => panelId === RUNTIME_PANEL_IDS.bottomDockShell))
      .toMatchObject({ size: 233, collapsed: false });
    expect(result.warnings).toContain("Legacy Viewpoints dock ownership was normalized to Primary Dock.");
  });

  it("preserves future and corrupt stored records without automatic writes", async () => {
    const database = await openAtrVisuDatabase();
    const future = { schemaVersion: 99, theme: "future", panels: [{ raw: true }] };
    await database.put(UI_PREFERENCES_STORE_NAME, future as never, UI_PREFERENCES_RECORD_KEY);
    const storage = createIndexedDbUiPreferencesStorage();
    const futureResult = await storage.read();
    expect(futureResult.status).toBe("future-version");
    expect(await database.get(UI_PREFERENCES_STORE_NAME, UI_PREFERENCES_RECORD_KEY)).toEqual(future);

    const corrupt = { schemaVersion: 1, theme: "dark", density: "comfortable", panels: "bad" };
    await database.put(UI_PREFERENCES_STORE_NAME, corrupt as never, UI_PREFERENCES_RECORD_KEY);
    const corruptResult = await storage.read();
    expect(corruptResult.status).toBe("invalid");
    expect(await database.get(UI_PREFERENCES_STORE_NAME, UI_PREFERENCES_RECORD_KEY)).toEqual(corrupt);
  });
});
