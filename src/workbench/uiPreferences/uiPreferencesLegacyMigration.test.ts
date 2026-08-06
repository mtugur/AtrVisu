import { describe, expect, it, vi } from "vitest";
import { RUNTIME_PANEL_IDS } from "../../platform/runtimePanels/runtimePanelRegistryBridge";
import { createDefaultWorkbenchUiPreferences } from "./uiPreferencesDefaults";
import {
  LEGACY_PANEL_SECTION_KEYS,
  LEGACY_RIGHT_PANEL_COLLAPSED_KEY,
  LEGACY_RIGHT_PANEL_WIDTH_KEY,
  initializeUiPreferences,
  type LegacyStorageLike
} from "./uiPreferencesLegacyMigration";
import type { UiPreferencesStorage } from "./uiPreferencesStorage";

const createLegacyStorage = (initial: Record<string, string> = {}) => {
  const values = new Map(Object.entries(initial));
  const storage: LegacyStorageLike = {
    getItem: (key) => values.get(key) ?? null,
    removeItem: (key) => void values.delete(key)
  };
  return { values, storage };
};

const createMemoryRepository = (failWrite = false) => {
  let value: ReturnType<typeof createDefaultWorkbenchUiPreferences> | undefined;
  const storage: UiPreferencesStorage = {
    read: vi.fn(async () => value
      ? { status: "valid" as const, preferences: value, warnings: [] }
      : { status: "absent" as const }),
    put: vi.fn(async (preferences) => {
      if (failWrite) {
        throw new Error("write failed");
      }
      value = preferences;
    }),
    delete: vi.fn(async () => {
      value = undefined;
    })
  };
  return { storage, getValue: () => value };
};

describe("legacy UI preference migration", () => {
  it("writes canonical defaults once when no legacy values exist", async () => {
    const repository = createMemoryRepository();
    const legacy = createLegacyStorage();

    const result = await initializeUiPreferences(repository.storage, legacy.storage);

    expect(result.preferences).toEqual(createDefaultWorkbenchUiPreferences());
    expect(result.migrated).toBe(false);
    expect(repository.storage.put).toHaveBeenCalledTimes(1);
  });

  it("maps and clamps every owned legacy value, then removes only consumed keys", async () => {
    const entries = Object.fromEntries(LEGACY_PANEL_SECTION_KEYS.map(([key], index) => [
      key,
      index % 2 === 0 ? "expanded" : "collapsed"
    ]));
    const legacy = createLegacyStorage({
      ...entries,
      [LEGACY_RIGHT_PANEL_WIDTH_KEY]: "900",
      [LEGACY_RIGHT_PANEL_COLLAPSED_KEY]: "collapsed",
      "atrvisu.unrelated": "keep"
    });
    const repository = createMemoryRepository();

    const result = await initializeUiPreferences(repository.storage, legacy.storage);
    const shell = result.preferences.panels.find((panel) => panel.panelId === RUNTIME_PANEL_IDS.rightPanelShell);

    expect(shell?.size).toBe(600);
    expect(shell?.collapsed).toBe(true);
    LEGACY_PANEL_SECTION_KEYS.forEach(([key, panelId], index) => {
      expect(result.preferences.panels.find((panel) => panel.panelId === panelId)?.collapsed).toBe(index % 2 !== 0);
      expect(legacy.values.has(key)).toBe(false);
    });
    expect(legacy.values.get("atrvisu.unrelated")).toBe("keep");
    expect([...legacy.values.keys()].some((key) => key.toLowerCase().includes("migration"))).toBe(false);
  });

  it("lets an existing valid record win and remains idempotent across repeated initialization", async () => {
    const repository = createMemoryRepository();
    const legacy = createLegacyStorage({ [LEGACY_RIGHT_PANEL_WIDTH_KEY]: "420" });
    const first = await initializeUiPreferences(repository.storage, legacy.storage);
    const second = await initializeUiPreferences(repository.storage, legacy.storage);

    expect(first.preferences.panels[0].size).toBe(420);
    expect(second.preferences).toEqual(first.preferences);
    expect(repository.storage.put).toHaveBeenCalledTimes(1);
  });

  it("keeps every legacy key after a failed write so a later startup can retry", async () => {
    const legacy = createLegacyStorage({
      [LEGACY_RIGHT_PANEL_WIDTH_KEY]: "410",
      [LEGACY_PANEL_SECTION_KEYS[0][0]]: "collapsed"
    });
    const repository = createMemoryRepository(true);

    const result = await initializeUiPreferences(repository.storage, legacy.storage);

    expect(result.readResult.status).toBe("storage-error");
    expect(legacy.values.get(LEGACY_RIGHT_PANEL_WIDTH_KEY)).toBe("410");
    expect(legacy.values.get(LEGACY_PANEL_SECTION_KEYS[0][0])).toBe("collapsed");
  });

  it("does not migrate over future or corrupt records", async () => {
    const legacy = createLegacyStorage({ [LEGACY_RIGHT_PANEL_WIDTH_KEY]: "410" });
    const futureStorage: UiPreferencesStorage = {
      read: vi.fn(async () => ({
        status: "future-version" as const,
        raw: { schemaVersion: 2 },
        schemaVersion: 2,
        warning: "future"
      })),
      put: vi.fn(),
      delete: vi.fn()
    };
    const result = await initializeUiPreferences(futureStorage, legacy.storage);

    expect(result.readResult.status).toBe("future-version");
    expect(futureStorage.put).not.toHaveBeenCalled();
    expect(legacy.values.get(LEGACY_RIGHT_PANEL_WIDTH_KEY)).toBe("410");
  });
});
