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
});
