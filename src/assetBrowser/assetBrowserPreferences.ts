import {
  ASSET_BROWSER_PREFERENCES_RECORD_KEY,
  ASSET_BROWSER_PREFERENCES_STORE_NAME,
  openAtrVisuDatabase
} from "../utils/storage/indexedDb";

export const ASSET_BROWSER_PREFERENCES_SCHEMA_VERSION = 1;
export const MAX_RECENT_ASSETS = 12;

export type AssetBrowserPreferences = Readonly<{
  schemaVersion: 1;
  favoriteAssetKeys: readonly string[];
  recentAssetKeys: readonly string[];
}>;

export type AssetBrowserPreferencesStatus = "idle" | "loading" | "ready" | "degraded";

export type AssetBrowserPreferencesSnapshot = Readonly<{
  preferences: AssetBrowserPreferences;
  status: AssetBrowserPreferencesStatus;
  warning: string | null;
  revision: number;
}>;

export type AssetBrowserPreferencesStorage = Readonly<{
  read: () => Promise<unknown>;
  write: (preferences: AssetBrowserPreferences) => Promise<void>;
}>;

export type AssetBrowserPreferencesRuntime = Readonly<{
  getSnapshot: () => AssetBrowserPreferencesSnapshot;
  subscribe: (listener: () => void) => () => void;
  hydrate: () => Promise<AssetBrowserPreferencesSnapshot>;
  toggleFavorite: (assetKey: string) => Promise<boolean>;
  recordRecent: (assetKey: string) => Promise<boolean>;
}>;

const uniqueKeys = (value: unknown, limit?: number) => {
  if (!Array.isArray(value)) {
    return [];
  }
  const keys = value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
  return [...new Set(keys)].slice(0, limit);
};

export const createDefaultAssetBrowserPreferences = (): AssetBrowserPreferences => Object.freeze({
  schemaVersion: ASSET_BROWSER_PREFERENCES_SCHEMA_VERSION,
  favoriteAssetKeys: Object.freeze([]),
  recentAssetKeys: Object.freeze([])
});

export const normalizeAssetBrowserPreferences = (value: unknown): AssetBrowserPreferences => {
  if (
    typeof value !== "object"
    || value === null
    || (value as { schemaVersion?: unknown }).schemaVersion !== ASSET_BROWSER_PREFERENCES_SCHEMA_VERSION
  ) {
    return createDefaultAssetBrowserPreferences();
  }
  const candidate = value as {
    favoriteAssetKeys?: unknown;
    recentAssetKeys?: unknown;
  };
  return Object.freeze({
    schemaVersion: ASSET_BROWSER_PREFERENCES_SCHEMA_VERSION,
    favoriteAssetKeys: Object.freeze(uniqueKeys(candidate.favoriteAssetKeys)),
    recentAssetKeys: Object.freeze(uniqueKeys(candidate.recentAssetKeys, MAX_RECENT_ASSETS))
  });
};

export const toggleFavoriteAssetKey = (
  preferences: AssetBrowserPreferences,
  assetKey: string
): AssetBrowserPreferences => {
  const favorites = new Set(preferences.favoriteAssetKeys);
  if (favorites.has(assetKey)) {
    favorites.delete(assetKey);
  } else {
    favorites.add(assetKey);
  }
  return normalizeAssetBrowserPreferences({
    ...preferences,
    favoriteAssetKeys: [...favorites]
  });
};

export const recordRecentAssetKey = (
  preferences: AssetBrowserPreferences,
  assetKey: string
): AssetBrowserPreferences => normalizeAssetBrowserPreferences({
  ...preferences,
  recentAssetKeys: [
    assetKey,
    ...preferences.recentAssetKeys.filter((key) => key !== assetKey)
  ]
});

export const createIndexedDbAssetBrowserPreferencesStorage = (): AssetBrowserPreferencesStorage => ({
  async read() {
    const database = await openAtrVisuDatabase();
    return database.get(
      ASSET_BROWSER_PREFERENCES_STORE_NAME,
      ASSET_BROWSER_PREFERENCES_RECORD_KEY
    ) as Promise<unknown>;
  },
  async write(preferences) {
    const database = await openAtrVisuDatabase();
    await database.put(
      ASSET_BROWSER_PREFERENCES_STORE_NAME,
      normalizeAssetBrowserPreferences(preferences),
      ASSET_BROWSER_PREFERENCES_RECORD_KEY
    );
  }
});

type PreferenceMutation = (preferences: AssetBrowserPreferences) => AssetBrowserPreferences;
type PendingHydrationMutation = Readonly<{
  mutation: PreferenceMutation;
  resolve: (persisted: boolean) => void;
}>;

export const createAssetBrowserPreferencesRuntime = (
  storage: AssetBrowserPreferencesStorage = createIndexedDbAssetBrowserPreferencesStorage()
): AssetBrowserPreferencesRuntime => {
  const listeners = new Set<() => void>();
  let snapshot: AssetBrowserPreferencesSnapshot = Object.freeze({
    preferences: createDefaultAssetBrowserPreferences(),
    status: "idle",
    warning: null,
    revision: 0
  });
  let hydrationPromise: Promise<AssetBrowserPreferencesSnapshot> | null = null;
  let pendingHydrationMutations: PendingHydrationMutation[] = [];
  let hydrationActive = false;
  let writeQueue = Promise.resolve(true);

  const commit = (
    preferences: AssetBrowserPreferences,
    status: AssetBrowserPreferencesStatus,
    warning: string | null
  ) => {
    snapshot = Object.freeze({
      preferences: normalizeAssetBrowserPreferences(preferences),
      status,
      warning,
      revision: snapshot.revision + 1
    });
    listeners.forEach((listener) => listener());
    return snapshot;
  };

  const persist = (preferences: AssetBrowserPreferences) => {
    const value = normalizeAssetBrowserPreferences(preferences);
    const revisionAtRequest = snapshot.revision;
    writeQueue = writeQueue.then(async () => {
      try {
        await storage.write(value);
        return true;
      } catch {
        return false;
      }
    });
    return writeQueue.then((persisted) => {
      if (!persisted && snapshot.revision === revisionAtRequest) {
        commit(
          snapshot.preferences,
          "degraded",
          "Favorites and recent assets will remain available for this session."
        );
      }
      return persisted;
    });
  };

  const update = (mutation: PreferenceMutation) => {
    const preferences = mutation(snapshot.preferences);
    commit(preferences, snapshot.status === "idle" ? "ready" : snapshot.status, null);
    if (hydrationActive) {
      return new Promise<boolean>((resolve) => {
        pendingHydrationMutations.push({ mutation, resolve });
      });
    }
    return persist(preferences);
  };

  return Object.freeze({
    getSnapshot: () => snapshot,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    hydrate() {
      if (hydrationPromise) {
        return hydrationPromise;
      }
      hydrationActive = true;
      commit(snapshot.preferences, "loading", null);
      hydrationPromise = storage.read().then(async (raw) => {
        let preferences = normalizeAssetBrowserPreferences(raw);
        pendingHydrationMutations.forEach(({ mutation }) => {
          preferences = mutation(preferences);
        });
        const pending = pendingHydrationMutations;
        const shouldPersist = pending.length > 0;
        pendingHydrationMutations = [];
        hydrationActive = false;
        commit(preferences, "ready", null);
        if (shouldPersist) {
          const persisted = await persist(preferences);
          pending.forEach(({ resolve }) => resolve(persisted));
        }
        return snapshot;
      }).catch(() => {
        const pending = pendingHydrationMutations;
        pendingHydrationMutations = [];
        hydrationActive = false;
        const result = commit(
          snapshot.preferences,
          "degraded",
          "Favorites and recent assets will remain available for this session."
        );
        pending.forEach(({ resolve }) => resolve(false));
        return result;
      });
      return hydrationPromise;
    },
    toggleFavorite: (assetKey) => update((preferences) =>
      toggleFavoriteAssetKey(preferences, assetKey)),
    recordRecent: (assetKey) => update((preferences) =>
      recordRecentAssetKey(preferences, assetKey))
  });
};
