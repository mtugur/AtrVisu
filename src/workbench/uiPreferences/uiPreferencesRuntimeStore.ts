import type {
  DensityId,
  PanelPreference,
  PanelId,
  ThemeId,
  WorkbenchUiPreferences
} from "../../platform/contracts";
import { cloneWorkbenchUiPreferences, createDefaultWorkbenchUiPreferences } from "./uiPreferencesDefaults";
import {
  prepareUiPreferencesInitialization,
  type LegacyStorageLike,
  type UiPreferencesInitializationPlan
} from "./uiPreferencesLegacyMigration";
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

export type UiPreferencesE2EBridge = {
  getSnapshot: () => UiPreferencesRuntimeSnapshot;
  updateTheme: UiPreferencesRuntimeStore["updateTheme"];
  updateDensity: UiPreferencesRuntimeStore["updateDensity"];
  updatePanelPreference: UiPreferencesRuntimeStore["updatePanelPreference"];
};

declare global {
  interface Window {
    __atrvisuUiPreferences?: UiPreferencesE2EBridge;
  }
}

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

type PendingHydrationUpdate = {
  apply: (base: WorkbenchUiPreferences) => WorkbenchUiPreferences;
  resolvePersistence: (persisted: boolean) => void;
};

const PANEL_MUTATION_KEYS = ["visible", "collapsed", "size", "order", "dock"] as const;

const createReplayMutation = (
  before: WorkbenchUiPreferences,
  after: WorkbenchUiPreferences
) => (base: WorkbenchUiPreferences): WorkbenchUiPreferences => {
  const next = cloneWorkbenchUiPreferences(base);
  if (before.theme !== after.theme) {
    next.theme = after.theme;
  }
  if (before.density !== after.density) {
    next.density = after.density;
  }
  if (before.activeWorkspaceId !== after.activeWorkspaceId) {
    if (after.activeWorkspaceId === undefined) {
      delete next.activeWorkspaceId;
    } else {
      next.activeWorkspaceId = after.activeWorkspaceId;
    }
  }

  const beforePanels = new Map(before.panels.map((panel) => [panel.panelId, panel]));
  const afterPanels = new Map(after.panels.map((panel) => [panel.panelId, panel]));
  next.panels = next.panels.map((panel) => {
    const beforePanel = beforePanels.get(panel.panelId);
    const afterPanel = afterPanels.get(panel.panelId);
    if (!beforePanel || !afterPanel) {
      return panel;
    }
    const updated = { ...panel };
    PANEL_MUTATION_KEYS.forEach((key) => {
      if (beforePanel[key] !== afterPanel[key]) {
        Object.assign(updated, { [key]: afterPanel[key] });
      }
    });
    return updated;
  });
  return normalizeWorkbenchUiPreferences(next).preferences;
};

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
  let hydrationActive = false;
  let pendingHydrationUpdates: PendingHydrationUpdate[] = [];
  let legacyKeysAwaitingCleanup: readonly string[] = [];

  const commit = (
    preferences: WorkbenchUiPreferences,
    hydrationStatus: UiPreferencesHydrationStatus,
    warning: string | null
  ) => {
    snapshot = createSnapshot(preferences, hydrationStatus, warning, snapshot.revision + 1);
    listeners.forEach((listener) => listener());
    return snapshot;
  };

  const cleanupLegacyKeys = () => {
    if (legacyKeysAwaitingCleanup.length === 0) {
      return true;
    }
    try {
      legacyKeysAwaitingCleanup.forEach((key) => legacyStorage.removeItem(key));
      legacyKeysAwaitingCleanup = [];
      return true;
    } catch {
      return false;
    }
  };

  const enqueueStorageWrite = (preferences: WorkbenchUiPreferences) => {
    const writeValue = cloneWorkbenchUiPreferences(preferences);
    const operation = writeQueue.then(async () => {
      try {
        await storage.put(writeValue);
        return cleanupLegacyKeys();
      } catch {
        return false;
      }
    });
    writeQueue = operation;
    return operation;
  };

  const queuePersistence = (preferences: WorkbenchUiPreferences) => {
    const revisionAtRequest = snapshot.revision;
    return enqueueStorageWrite(preferences).then((persisted) => {
      if (persisted) {
        if (snapshot.revision === revisionAtRequest && snapshot.hydrationStatus === "degraded") {
          commit(snapshot.preferences, "ready", null);
        }
      } else {
        const warning = "UI preferences could not be persisted; the latest in-memory values remain active.";
        warn(warning);
        if (snapshot.revision === revisionAtRequest) {
          commit(snapshot.preferences, "degraded", warning);
        }
      }
      return persisted;
    });
  };

  const replayPendingUpdates = (
    base: WorkbenchUiPreferences,
    startIndex: number,
    endIndex: number
  ) => pendingHydrationUpdates.slice(startIndex, endIndex).reduce(
    (current, pending) => pending.apply(current),
    cloneWorkbenchUiPreferences(base)
  );

  const resolvePendingUpdates = (startIndex: number, endIndex: number, persisted: boolean) => {
    pendingHydrationUpdates.slice(startIndex, endIndex).forEach((pending) => {
      pending.resolvePersistence(persisted);
    });
  };

  const finishHydrationWithoutPersistence = (
    plan: UiPreferencesInitializationPlan,
    status: "degraded" | "future-readonly"
  ) => {
    const preferences = replayPendingUpdates(plan.preferences, 0, pendingHydrationUpdates.length);
    resolvePendingUpdates(0, pendingHydrationUpdates.length, false);
    pendingHydrationUpdates = [];
    hydrationActive = false;
    if (plan.warning) {
      warn(plan.warning);
    }
    return commit(preferences, status, plan.warning ?? null);
  };

  const persistHydratedState = async (plan: UiPreferencesInitializationPlan) => {
    let preferences = cloneWorkbenchUiPreferences(plan.preferences);
    let appliedCount = 0;
    let persistenceRequired = plan.requiresPersistence;
    legacyKeysAwaitingCleanup = plan.consumedLegacyKeys;

    while (persistenceRequired || appliedCount < pendingHydrationUpdates.length) {
      const batchEnd = pendingHydrationUpdates.length;
      preferences = replayPendingUpdates(preferences, appliedCount, batchEnd);
      const persisted = await enqueueStorageWrite(preferences);
      if (!persisted) {
        preferences = replayPendingUpdates(preferences, batchEnd, pendingHydrationUpdates.length);
        const warning = "UI preferences could not be persisted; the latest in-memory values remain active.";
        warn(warning);
        resolvePendingUpdates(appliedCount, pendingHydrationUpdates.length, false);
        pendingHydrationUpdates = [];
        hydrationActive = false;
        return commit(preferences, "degraded", warning);
      }
      resolvePendingUpdates(appliedCount, batchEnd, true);
      appliedCount = batchEnd;
      persistenceRequired = false;
    }

    pendingHydrationUpdates = [];
    hydrationActive = false;
    return commit(preferences, "ready", plan.warning ?? null);
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
    const mutation = createReplayMutation(current, normalized.preferences);
    commit(normalized.preferences, snapshot.hydrationStatus === "idle" ? "ready" : snapshot.hydrationStatus, null);
    if (hydrationActive) {
      let resolvePersistence!: (persisted: boolean) => void;
      const persisted = new Promise<boolean>((resolve) => {
        resolvePersistence = resolve;
      });
      pendingHydrationUpdates.push({ apply: mutation, resolvePersistence });
      return { accepted: true, persisted };
    }
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
      hydrationActive = true;
      commit(snapshot.preferences, "loading", null);
      hydratePromise = prepareUiPreferencesInitialization(storage, legacyStorage).then((plan) => {
        if (plan.readResult.status === "future-version") {
          return finishHydrationWithoutPersistence(plan, "future-readonly");
        }
        if (plan.readResult.status === "storage-error") {
          return finishHydrationWithoutPersistence(plan, "degraded");
        }
        if (plan.readResult.status === "invalid" && pendingHydrationUpdates.length === 0) {
          return finishHydrationWithoutPersistence(plan, "degraded");
        }
        if (plan.readResult.status === "invalid") {
          return persistHydratedState({
            ...plan,
            requiresPersistence: true
          });
        }
        if (plan.readResult.status === "valid" && pendingHydrationUpdates.length === 0) {
          hydrationActive = false;
          if (plan.warning) {
            warn(plan.warning);
          }
          return commit(plan.preferences, "ready", plan.warning ?? null);
        }
        return persistHydratedState(plan);
      }).catch(() => {
        const warning = "UI preference hydration failed; defaults are active in degraded mode.";
        warn(warning);
        const preferences = replayPendingUpdates(
          createDefaultWorkbenchUiPreferences(),
          0,
          pendingHydrationUpdates.length
        );
        resolvePendingUpdates(0, pendingHydrationUpdates.length, false);
        pendingHydrationUpdates = [];
        hydrationActive = false;
        return commit(preferences, "degraded", warning);
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
      resolvePendingUpdates(0, pendingHydrationUpdates.length, false);
      pendingHydrationUpdates = [];
      hydrationActive = false;
      await writeQueue;
      await storage.delete();
      hydratePromise = null;
      writeQueue = Promise.resolve(true);
      commit(createDefaultWorkbenchUiPreferences(), "idle", null);
    }
  };

  return store;
};
