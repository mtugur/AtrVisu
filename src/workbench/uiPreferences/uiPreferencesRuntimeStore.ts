import type {
  DensityId,
  PanelPreference,
  PanelId,
  ThemeId,
  WorkbenchUiPreferences
} from "../../platform/contracts";
import { cloneWorkbenchUiPreferences, createDefaultWorkbenchUiPreferences } from "./uiPreferencesDefaults";
import { initializeUiPreferences, type LegacyStorageLike } from "./uiPreferencesLegacyMigration";
import { normalizeWorkbenchUiPreferences } from "./uiPreferencesNormalizer";
import {
  createIndexedDbUiPreferencesStorage,
  type UiPreferencesStorage
} from "./uiPreferencesStorage";

export type UiPreferencesHydrationStatus =
  | "idle"
  | "loading"
  | "ready"
  | "degraded"
  | "future-readonly";

export type UiPreferencesRuntimeSnapshot = {
  preferences: WorkbenchUiPreferences;
  hydrationStatus: UiPreferencesHydrationStatus;
  warning: string | null;
  revision: number;
};

export type UiPreferencesUpdateResult = {
  accepted: boolean;
  persisted: Promise<boolean>;
};

export type UiPreferencesRuntimeStore = {
  getSnapshot: () => UiPreferencesRuntimeSnapshot;
  subscribe: (listener: () => void) => () => void;
  hydrate: () => Promise<UiPreferencesRuntimeSnapshot>;
  updatePreferences: (
    update: WorkbenchUiPreferences | ((current: WorkbenchUiPreferences) => WorkbenchUiPreferences)
  ) => UiPreferencesUpdateResult;
  updateTheme: (theme: ThemeId) => UiPreferencesUpdateResult;
  updateDensity: (density: DensityId) => UiPreferencesUpdateResult;
  updatePanelPreference: (
    panelId: PanelId,
    update: Partial<Omit<PanelPreference, "panelId">>
  ) => UiPreferencesUpdateResult;
  resetForTests: () => Promise<void>;
};

export type UiPreferencesRuntimeStoreOptions = {
  storage?: UiPreferencesStorage;
  legacyStorage?: LegacyStorageLike;
  warn?: (message: string) => void;
};

const freezePreferences = (preferences: WorkbenchUiPreferences): WorkbenchUiPreferences => {
  const clone = cloneWorkbenchUiPreferences(preferences);
  clone.panels.forEach(Object.freeze);
  Object.freeze(clone.panels);
  return Object.freeze(clone);
};

const createSnapshot = (
  preferences: WorkbenchUiPreferences,
  hydrationStatus: UiPreferencesHydrationStatus,
  warning: string | null,
  revision: number
): UiPreferencesRuntimeSnapshot => Object.freeze({
  preferences: freezePreferences(preferences),
  hydrationStatus,
  warning,
  revision
});

export const createUiPreferencesRuntimeStore = (
  options: UiPreferencesRuntimeStoreOptions = {}
): UiPreferencesRuntimeStore => {
  const storage = options.storage ?? createIndexedDbUiPreferencesStorage();
  const legacyStorage = options.legacyStorage ?? window.localStorage;
  const warn = options.warn ?? ((message: string) => console.warn(message));
  const listeners = new Set<() => void>();
  let snapshot = createSnapshot(createDefaultWorkbenchUiPreferences(), "idle", null, 0);
  let hydratePromise: Promise<UiPreferencesRuntimeSnapshot> | null = null;
  let writeQueue = Promise.resolve(true);

  const commit = (
    preferences: WorkbenchUiPreferences,
    hydrationStatus: UiPreferencesHydrationStatus,
    warning: string | null
  ) => {
    snapshot = createSnapshot(preferences, hydrationStatus, warning, snapshot.revision + 1);
    listeners.forEach((listener) => listener());
    return snapshot;
  };

  const queuePersistence = (preferences: WorkbenchUiPreferences) => {
    const revisionAtRequest = snapshot.revision;
    const writeValue = cloneWorkbenchUiPreferences(preferences);
    const operation = writeQueue.then(async () => {
      try {
        await storage.put(writeValue);
        if (snapshot.revision === revisionAtRequest && snapshot.hydrationStatus === "degraded") {
          commit(snapshot.preferences, "ready", null);
        }
        return true;
      } catch {
        const warning = "UI preferences could not be persisted; the latest in-memory values remain active.";
        warn(warning);
        if (snapshot.revision === revisionAtRequest) {
          commit(snapshot.preferences, "degraded", warning);
        }
        return false;
      }
    });
    writeQueue = operation;
    return operation;
  };

  const updatePreferences: UiPreferencesRuntimeStore["updatePreferences"] = (update) => {
    if (snapshot.hydrationStatus === "future-readonly") {
      return { accepted: false, persisted: Promise.resolve(false) };
    }
    const current = cloneWorkbenchUiPreferences(snapshot.preferences);
    const candidate = typeof update === "function" ? update(current) : update;
    const normalized = normalizeWorkbenchUiPreferences(candidate);
    if (normalized.rejectedDomainPayload) {
      return { accepted: false, persisted: Promise.resolve(false) };
    }
    commit(normalized.preferences, snapshot.hydrationStatus === "idle" ? "ready" : snapshot.hydrationStatus, null);
    return { accepted: true, persisted: queuePersistence(normalized.preferences) };
  };

  const store: UiPreferencesRuntimeStore = {
    getSnapshot: () => snapshot,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    hydrate() {
      if (hydratePromise) {
        return hydratePromise;
      }
      commit(snapshot.preferences, "loading", null);
      hydratePromise = initializeUiPreferences(storage, legacyStorage).then((result) => {
        if (result.readResult.status === "future-version") {
          return commit(result.preferences, "future-readonly", result.warning ?? null);
        }
        if (result.readResult.status === "storage-error" || result.readResult.status === "invalid") {
          if (result.warning) {
            warn(result.warning);
          }
          return commit(result.preferences, "degraded", result.warning ?? null);
        }
        return commit(result.preferences, "ready", result.warning ?? null);
      }).catch(() => {
        const warning = "UI preference hydration failed; defaults are active in degraded mode.";
        warn(warning);
        return commit(createDefaultWorkbenchUiPreferences(), "degraded", warning);
      });
      return hydratePromise;
    },
    updatePreferences,
    updateTheme: (theme) => updatePreferences((current) => ({ ...current, theme })),
    updateDensity: (density) => updatePreferences((current) => ({ ...current, density })),
    updatePanelPreference: (panelId, update) => updatePreferences((current) => ({
      ...current,
      panels: current.panels.map((panel) => panel.panelId === panelId
        ? { ...panel, ...update, panelId }
        : panel)
    })),
    async resetForTests() {
      await storage.delete();
      hydratePromise = null;
      writeQueue = Promise.resolve(true);
      commit(createDefaultWorkbenchUiPreferences(), "idle", null);
    }
  };

  return store;
};
