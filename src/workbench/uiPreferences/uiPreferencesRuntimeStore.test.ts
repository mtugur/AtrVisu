import { describe, expect, it, vi } from "vitest";
import { RUNTIME_PANEL_IDS } from "../../platform/runtimePanels/runtimePanelRegistryBridge";
import { createDefaultWorkbenchUiPreferences } from "./uiPreferencesDefaults";
import { createUiPreferencesRuntimeStore } from "./uiPreferencesRuntimeStore";
import type { UiPreferencesReadResult, UiPreferencesStorage } from "./uiPreferencesStorage";

const deferred = <T>() => {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
};

const createStorage = (readResult: UiPreferencesReadResult = { status: "absent" }) => {
  const writes: ReturnType<typeof createDefaultWorkbenchUiPreferences>[] = [];
  const storage: UiPreferencesStorage = {
    read: vi.fn(async () => readResult),
    put: vi.fn(async (preferences) => {
      writes.push(preferences);
    }),
    delete: vi.fn(async () => undefined)
  };
  return { storage, writes };
};

const emptyLegacyStorage = {
  getItem: () => null,
  removeItem: vi.fn()
};

const getPanel = (
  preferences: ReturnType<typeof createDefaultWorkbenchUiPreferences>,
  panelId: string
) => preferences.panels.find((panel) => panel.panelId === panelId)!;

const createPersistedPreferences = () => {
  const preferences = createDefaultWorkbenchUiPreferences();
  preferences.theme = "light";
  preferences.density = "compact";
  preferences.panels = preferences.panels.map((panel) => panel.panelId === RUNTIME_PANEL_IDS.rightPanelShell
    ? { ...panel, size: 420 }
    : panel);
  return preferences;
};

describe("UI preferences runtime store", () => {
  it("starts synchronously with defaults and hydrates idle to loading to ready once", async () => {
    const repository = createStorage({
      status: "valid",
      preferences: createDefaultWorkbenchUiPreferences(),
      warnings: []
    });
    const store = createUiPreferencesRuntimeStore({
      storage: repository.storage,
      legacyStorage: emptyLegacyStorage
    });

    expect(store.getSnapshot()).toMatchObject({ hydrationStatus: "idle", revision: 0 });
    const first = store.hydrate();
    const second = store.hydrate();
    expect(first).toBe(second);
    expect(store.getSnapshot().hydrationStatus).toBe("loading");
    await first;
    expect(store.getSnapshot()).toMatchObject({ hydrationStatus: "ready", revision: 2 });
    expect(repository.storage.read).toHaveBeenCalledTimes(1);
  });

  it("commits immutable updates with monotonic revisions and one notification", async () => {
    const repository = createStorage();
    const store = createUiPreferencesRuntimeStore({
      storage: repository.storage,
      legacyStorage: emptyLegacyStorage
    });
    const listener = vi.fn();
    const unsubscribe = store.subscribe(listener);
    const before = store.getSnapshot();

    const update = store.updatePanelPreference(RUNTIME_PANEL_IDS.rightPanelShell, { size: 444 });
    expect(update.accepted).toBe(true);
    expect(store.getSnapshot().revision).toBe(before.revision + 1);
    expect(store.getSnapshot().preferences.panels[0].size).toBe(444);
    expect(Object.isFrozen(store.getSnapshot().preferences)).toBe(true);
    expect(Object.isFrozen(store.getSnapshot().preferences.panels[0])).toBe(true);
    expect(listener).toHaveBeenCalledTimes(1);
    await update.persisted;

    unsubscribe();
    store.updateTheme("light");
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("keeps Primary and Bottom Dock size in the single persisted panel preference authority", async () => {
    const repository = createStorage();
    const store = createUiPreferencesRuntimeStore({
      storage: repository.storage,
      legacyStorage: emptyLegacyStorage
    });

    await store.updatePanelPreference(RUNTIME_PANEL_IDS.primaryDockShell, {
      size: 392,
      collapsed: false
    }).persisted;
    await store.updatePanelPreference(RUNTIME_PANEL_IDS.primaryDockShell, {
      collapsed: true
    }).persisted;
    await store.updatePanelPreference(RUNTIME_PANEL_IDS.primaryDockShell, {
      collapsed: false
    }).persisted;
    await store.updatePanelPreference(RUNTIME_PANEL_IDS.bottomDockShell, {
      size: 184,
      collapsed: false
    }).persisted;
    await store.updatePanelPreference(RUNTIME_PANEL_IDS.bottomDockShell, {
      collapsed: true
    }).persisted;
    await store.updatePanelPreference(RUNTIME_PANEL_IDS.bottomDockShell, {
      collapsed: false
    }).persisted;

    const snapshot = store.getSnapshot().preferences;
    expect(getPanel(snapshot, RUNTIME_PANEL_IDS.primaryDockShell)).toMatchObject({
      size: 392,
      collapsed: false
    });
    expect(getPanel(snapshot, RUNTIME_PANEL_IDS.bottomDockShell)).toMatchObject({
      size: 184,
      collapsed: false
    });
    const persisted = repository.writes[repository.writes.length - 1];
    expect(getPanel(persisted, RUNTIME_PANEL_IDS.primaryDockShell).size).toBe(392);
    expect(getPanel(persisted, RUNTIME_PANEL_IDS.bottomDockShell).size).toBe(184);
  });

  it("serializes writes so stale completions cannot overwrite the latest state", async () => {
    const firstWrite = deferred<void>();
    const secondWrite = deferred<void>();
    const persistedValues: number[] = [];
    let call = 0;
    const storage: UiPreferencesStorage = {
      read: vi.fn(async () => ({ status: "absent" as const })),
      put: vi.fn(async (preferences) => {
        persistedValues.push(preferences.panels[0].size ?? 0);
        call += 1;
        await (call === 1 ? firstWrite.promise : secondWrite.promise);
      }),
      delete: vi.fn()
    };
    const store = createUiPreferencesRuntimeStore({ storage, legacyStorage: emptyLegacyStorage });

    const first = store.updatePanelPreference(RUNTIME_PANEL_IDS.rightPanelShell, { size: 400 });
    const second = store.updatePanelPreference(RUNTIME_PANEL_IDS.rightPanelShell, { size: 500 });
    await Promise.resolve();
    expect(storage.put).toHaveBeenCalledTimes(1);
    firstWrite.resolve();
    await first.persisted;
    await Promise.resolve();
    expect(storage.put).toHaveBeenCalledTimes(2);
    secondWrite.resolve();
    await second.persisted;

    expect(persistedValues).toEqual([400, 500]);
    expect(store.getSnapshot().preferences.panels[0].size).toBe(500);
  });

  it("keeps current memory on failure, enters degraded mode, and retries later", async () => {
    let shouldFail = true;
    const storage: UiPreferencesStorage = {
      read: vi.fn(async () => ({ status: "absent" as const })),
      put: vi.fn(async () => {
        if (shouldFail) {
          throw new Error("offline");
        }
      }),
      delete: vi.fn()
    };
    const warn = vi.fn();
    const store = createUiPreferencesRuntimeStore({ storage, legacyStorage: emptyLegacyStorage, warn });

    await store.updateTheme("light").persisted;
    expect(store.getSnapshot()).toMatchObject({ hydrationStatus: "degraded" });
    expect(store.getSnapshot().preferences.theme).toBe("light");
    shouldFail = false;
    await store.updateDensity("compact").persisted;
    expect(store.getSnapshot()).toMatchObject({ hydrationStatus: "ready", warning: null });
    expect(warn).toHaveBeenCalledTimes(1);
  });

  it("enters future-readonly without downgrading and rejects persistent updates", async () => {
    const future = { schemaVersion: 42 };
    const repository = createStorage({
      status: "future-version",
      raw: future,
      schemaVersion: 42,
      warning: "future"
    });
    const store = createUiPreferencesRuntimeStore({
      storage: repository.storage,
      legacyStorage: emptyLegacyStorage,
      warn: vi.fn()
    });
    await store.hydrate();

    expect(store.getSnapshot().hydrationStatus).toBe("future-readonly");
    expect(store.updateTheme("light").accepted).toBe(false);
    expect(repository.storage.put).not.toHaveBeenCalled();
  });

  it("rejects domain-shaped updates before they enter runtime state", () => {
    const repository = createStorage();
    const store = createUiPreferencesRuntimeStore({
      storage: repository.storage,
      legacyStorage: emptyLegacyStorage
    });
    const before = store.getSnapshot();
    const result = store.updatePreferences({
      ...createDefaultWorkbenchUiPreferences(),
      projectId: "project-1"
    } as never);

    expect(result.accepted).toBe(false);
    expect(store.getSnapshot()).toBe(before);
    expect(repository.storage.put).not.toHaveBeenCalled();
  });

  it("replays an update accepted during a valid deferred hydration over untouched persisted fields", async () => {
    const read = deferred<UiPreferencesReadResult>();
    const writes: ReturnType<typeof createDefaultWorkbenchUiPreferences>[] = [];
    const storage: UiPreferencesStorage = {
      read: vi.fn(() => read.promise),
      put: vi.fn(async (preferences) => void writes.push(structuredClone(preferences))),
      delete: vi.fn()
    };
    const store = createUiPreferencesRuntimeStore({ storage, legacyStorage: emptyLegacyStorage });

    const hydration = store.hydrate();
    const update = store.updatePanelPreference(RUNTIME_PANEL_IDS.rightPanelShell, { collapsed: true });
    expect(getPanel(store.getSnapshot().preferences, RUNTIME_PANEL_IDS.rightPanelShell).collapsed).toBe(true);
    read.resolve({ status: "valid", preferences: createPersistedPreferences(), warnings: [] });

    await expect(update.persisted).resolves.toBe(true);
    await hydration;
    const final = store.getSnapshot();
    expect(final.hydrationStatus).toBe("ready");
    expect(final.preferences).toMatchObject({ theme: "light", density: "compact" });
    expect(getPanel(final.preferences, RUNTIME_PANEL_IDS.rightPanelShell)).toMatchObject({
      size: 420,
      collapsed: true
    });
    expect(writes).toHaveLength(1);
    expect(writes[0]).toEqual(final.preferences);
  });

  it("preserves update order during hydration and cannot regress after a deferred earlier write", async () => {
    const read = deferred<UiPreferencesReadResult>();
    const firstWrite = deferred<void>();
    const secondWrite = deferred<void>();
    const writes: ReturnType<typeof createDefaultWorkbenchUiPreferences>[] = [];
    let writeCall = 0;
    const storage: UiPreferencesStorage = {
      read: vi.fn(() => read.promise),
      put: vi.fn(async (preferences) => {
        writes.push(structuredClone(preferences));
        writeCall += 1;
        await (writeCall === 1 ? firstWrite.promise : secondWrite.promise);
      }),
      delete: vi.fn()
    };
    const store = createUiPreferencesRuntimeStore({ storage, legacyStorage: emptyLegacyStorage });

    const hydration = store.hydrate();
    const first = store.updatePanelPreference(RUNTIME_PANEL_IDS.rightPanelShell, { size: 460 });
    read.resolve({ status: "valid", preferences: createPersistedPreferences(), warnings: [] });
    await vi.waitFor(() => expect(storage.put).toHaveBeenCalledTimes(1));
    const second = store.updatePanelPreference(RUNTIME_PANEL_IDS.rightPanelShell, { size: 510 });
    const third = store.updatePanelPreference(RUNTIME_PANEL_IDS.layers, { collapsed: false });

    firstWrite.resolve();
    await vi.waitFor(() => expect(storage.put).toHaveBeenCalledTimes(2));
    secondWrite.resolve();
    await hydration;
    await expect(Promise.all([first.persisted, second.persisted, third.persisted])).resolves.toEqual([
      true,
      true,
      true
    ]);

    const final = store.getSnapshot().preferences;
    expect(final.theme).toBe("light");
    expect(getPanel(final, RUNTIME_PANEL_IDS.rightPanelShell)).toMatchObject({ size: 510 });
    expect(getPanel(final, RUNTIME_PANEL_IDS.layers).collapsed).toBe(false);
    expect(writes.map((value) => getPanel(value, RUNTIME_PANEL_IDS.rightPanelShell).size)).toEqual([460, 510]);
    expect(writes[writes.length - 1]).toEqual(final);
  });

  it("orders absent-record default initialization before a newer update write", async () => {
    const read = deferred<UiPreferencesReadResult>();
    const defaultWrite = deferred<void>();
    const finalWrite = deferred<void>();
    const writes: ReturnType<typeof createDefaultWorkbenchUiPreferences>[] = [];
    let stored: ReturnType<typeof createDefaultWorkbenchUiPreferences> | undefined;
    let writeCall = 0;
    const storage: UiPreferencesStorage = {
      read: vi.fn(() => read.promise),
      put: vi.fn(async (preferences) => {
        writeCall += 1;
        const gate = writeCall === 1 ? defaultWrite : finalWrite;
        writes.push(structuredClone(preferences));
        await gate.promise;
        stored = structuredClone(preferences);
      }),
      delete: vi.fn()
    };
    const store = createUiPreferencesRuntimeStore({ storage, legacyStorage: emptyLegacyStorage });

    const hydration = store.hydrate();
    read.resolve({ status: "absent" });
    await vi.waitFor(() => expect(storage.put).toHaveBeenCalledTimes(1));
    const update = store.updatePanelPreference(RUNTIME_PANEL_IDS.rightPanelShell, { collapsed: true });
    defaultWrite.resolve();
    await vi.waitFor(() => expect(storage.put).toHaveBeenCalledTimes(2));
    finalWrite.resolve();

    await hydration;
    await expect(update.persisted).resolves.toBe(true);
    expect(getPanel(writes[0], RUNTIME_PANEL_IDS.rightPanelShell).collapsed).toBe(false);
    expect(getPanel(writes[1], RUNTIME_PANEL_IDS.rightPanelShell).collapsed).toBe(true);
    expect(stored).toEqual(store.getSnapshot().preferences);
  });

  it("merges legacy values with updates and cleans consumed keys only after ordered persistence", async () => {
    const read = deferred<UiPreferencesReadResult>();
    const migrationWrite = deferred<void>();
    const finalWrite = deferred<void>();
    const legacyValues = new Map([
      ["atrvisu.rightPanelWidth.v1", "430"],
      ["atrvisu.panelSection.layers.v1", "expanded"]
    ]);
    const removeItem = vi.fn((key: string) => void legacyValues.delete(key));
    const writes: ReturnType<typeof createDefaultWorkbenchUiPreferences>[] = [];
    let writeCall = 0;
    const storage: UiPreferencesStorage = {
      read: vi.fn(() => read.promise),
      put: vi.fn(async (preferences) => {
        writes.push(structuredClone(preferences));
        writeCall += 1;
        await (writeCall === 1 ? migrationWrite.promise : finalWrite.promise);
      }),
      delete: vi.fn()
    };
    const store = createUiPreferencesRuntimeStore({
      storage,
      legacyStorage: {
        getItem: (key) => legacyValues.get(key) ?? null,
        removeItem
      }
    });

    const hydration = store.hydrate();
    read.resolve({ status: "absent" });
    await vi.waitFor(() => expect(storage.put).toHaveBeenCalledTimes(1));
    expect(removeItem).not.toHaveBeenCalled();
    const update = store.updatePanelPreference(RUNTIME_PANEL_IDS.machineLibrary, { collapsed: true });
    migrationWrite.resolve();
    await vi.waitFor(() => expect(storage.put).toHaveBeenCalledTimes(2));
    finalWrite.resolve();

    await hydration;
    await expect(update.persisted).resolves.toBe(true);
    const final = store.getSnapshot().preferences;
    expect(getPanel(final, RUNTIME_PANEL_IDS.rightPanelShell).size).toBe(430);
    expect(getPanel(final, RUNTIME_PANEL_IDS.layers).collapsed).toBe(false);
    expect(getPanel(final, RUNTIME_PANEL_IDS.machineLibrary).collapsed).toBe(true);
    expect(writes[writes.length - 1]).toEqual(final);
    expect(legacyValues.size).toBe(0);
  });

  it("replaces a corrupt record only after replaying an explicit update over safe defaults", async () => {
    const read = deferred<UiPreferencesReadResult>();
    const writes: ReturnType<typeof createDefaultWorkbenchUiPreferences>[] = [];
    const raw = { schemaVersion: 1, panels: "corrupt" };
    const storage: UiPreferencesStorage = {
      read: vi.fn(() => read.promise),
      put: vi.fn(async (preferences) => void writes.push(structuredClone(preferences))),
      delete: vi.fn()
    };
    const store = createUiPreferencesRuntimeStore({ storage, legacyStorage: emptyLegacyStorage, warn: vi.fn() });

    const hydration = store.hydrate();
    const update = store.updateTheme("light");
    expect(writes).toEqual([]);
    read.resolve({ status: "invalid", raw, warning: "corrupt" });

    await hydration;
    await expect(update.persisted).resolves.toBe(true);
    expect(store.getSnapshot()).toMatchObject({ hydrationStatus: "ready" });
    expect(store.getSnapshot().preferences.theme).toBe("light");
    expect(writes).toEqual([store.getSnapshot().preferences]);
  });

  it("keeps the latest hydrated memory after a failed final write and retries the complete state", async () => {
    const read = deferred<UiPreferencesReadResult>();
    const writes: ReturnType<typeof createDefaultWorkbenchUiPreferences>[] = [];
    let shouldFail = true;
    const storage: UiPreferencesStorage = {
      read: vi.fn(() => read.promise),
      put: vi.fn(async (preferences) => {
        writes.push(structuredClone(preferences));
        if (shouldFail) {
          throw new Error("offline");
        }
      }),
      delete: vi.fn()
    };
    const store = createUiPreferencesRuntimeStore({ storage, legacyStorage: emptyLegacyStorage, warn: vi.fn() });

    const hydration = store.hydrate();
    const first = store.updateTheme("light");
    read.resolve({ status: "absent" });
    await hydration;
    await expect(first.persisted).resolves.toBe(false);
    expect(store.getSnapshot()).toMatchObject({ hydrationStatus: "degraded" });
    expect(store.getSnapshot().preferences.theme).toBe("light");

    shouldFail = false;
    const retry = store.updateDensity("compact");
    await expect(retry.persisted).resolves.toBe(true);
    expect(store.getSnapshot()).toMatchObject({ hydrationStatus: "ready", warning: null });
    expect(writes[writes.length - 1]).toEqual(store.getSnapshot().preferences);
    expect(writes[writes.length - 1]).toMatchObject({ theme: "light", density: "compact" });
  });

  it("keeps a future record untouched and resolves an update accepted while loading as not persisted", async () => {
    const read = deferred<UiPreferencesReadResult>();
    const storage: UiPreferencesStorage = {
      read: vi.fn(() => read.promise),
      put: vi.fn(),
      delete: vi.fn()
    };
    const store = createUiPreferencesRuntimeStore({ storage, legacyStorage: emptyLegacyStorage, warn: vi.fn() });
    const raw = { schemaVersion: 42, theme: "future" };

    const hydration = store.hydrate();
    const update = store.updateTheme("light");
    read.resolve({ status: "future-version", raw, schemaVersion: 42, warning: "future" });

    await hydration;
    await expect(update.persisted).resolves.toBe(false);
    expect(store.getSnapshot()).toMatchObject({ hydrationStatus: "future-readonly", warning: "future" });
    expect(store.getSnapshot().preferences.theme).toBe("light");
    expect(storage.put).not.toHaveBeenCalled();
    expect(raw).toEqual({ schemaVersion: 42, theme: "future" });
  });
});
