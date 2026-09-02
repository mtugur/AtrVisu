import { describe, expect, it, vi } from "vitest";
import {
  MAX_RECENT_ASSETS,
  createAssetBrowserPreferencesRuntime,
  createDefaultAssetBrowserPreferences,
  normalizeAssetBrowserPreferences,
  recordRecentAssetKey,
  toggleFavoriteAssetKey,
  type AssetBrowserPreferences,
  type AssetBrowserPreferencesStorage
} from "./assetBrowserPreferences";

const deferred = <T,>() => {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
};

describe("asset browser preferences", () => {
  it("toggles favorites without duplicates", () => {
    const favorite = toggleFavoriteAssetKey(createDefaultAssetBrowserPreferences(), "library::asset");
    expect(favorite.favoriteAssetKeys).toEqual(["library::asset"]);
    expect(toggleFavoriteAssetKey(favorite, "library::asset").favoriteAssetKeys).toEqual([]);
  });

  it("orders recent keys uniquely and retains at most twelve", () => {
    let preferences = createDefaultAssetBrowserPreferences();
    for (let index = 0; index < 14; index += 1) {
      preferences = recordRecentAssetKey(preferences, `library::asset-${index}`);
    }
    preferences = recordRecentAssetKey(preferences, "library::asset-5");

    expect(preferences.recentAssetKeys).toHaveLength(MAX_RECENT_ASSETS);
    expect(preferences.recentAssetKeys[0]).toBe("library::asset-5");
    expect(new Set(preferences.recentAssetKeys).size).toBe(MAX_RECENT_ASSETS);
  });

  it("normalizes stale persisted keys without assigning them to another asset", () => {
    expect(normalizeAssetBrowserPreferences({
      schemaVersion: 1,
      favoriteAssetKeys: ["missing::asset", "missing::asset"],
      recentAssetKeys: ["missing::asset"]
    })).toEqual({
      schemaVersion: 1,
      favoriteAssetKeys: ["missing::asset"],
      recentAssetKeys: ["missing::asset"]
    });
  });

  it("hydrates, saves, and replays updates accepted during hydration", async () => {
    const read = deferred<unknown>();
    const writes: AssetBrowserPreferences[] = [];
    const storage: AssetBrowserPreferencesStorage = {
      read: () => read.promise,
      write: vi.fn(async (preferences) => {
        writes.push(preferences);
      })
    };
    const runtime = createAssetBrowserPreferencesRuntime(storage);
    const hydration = runtime.hydrate();
    const favoritePersisted = runtime.toggleFavorite("library::new");
    read.resolve({
      schemaVersion: 1,
      favoriteAssetKeys: ["library::stored"],
      recentAssetKeys: []
    });

    await hydration;
    await expect(favoritePersisted).resolves.toBe(true);
    expect(runtime.getSnapshot().preferences.favoriteAssetKeys).toEqual([
      "library::stored", "library::new"
    ]);
    expect(writes[writes.length - 1]?.favoriteAssetKeys).toEqual(["library::stored", "library::new"]);
  });

  it("keeps the browser usable in memory when storage fails", async () => {
    const runtime = createAssetBrowserPreferencesRuntime({
      read: async () => {
        throw new Error("read unavailable");
      },
      write: async () => {
        throw new Error("write unavailable");
      }
    });

    await runtime.hydrate();
    await expect(runtime.toggleFavorite("library::asset")).resolves.toBe(false);
    expect(runtime.getSnapshot()).toMatchObject({
      status: "degraded",
      warning: "Favorites and recent assets will remain available for this session."
    });
    expect(runtime.getSnapshot().preferences.favoriteAssetKeys).toEqual(["library::asset"]);
  });

  it("preserves pending favorites when hydration fails after accepting mutations", async () => {
    const read = deferred<unknown>();
    const runtime = createAssetBrowserPreferencesRuntime({
      read: () => read.promise,
      write: vi.fn(async () => undefined)
    });

    const hydration = runtime.hydrate();
    const firstFavoritePersisted = runtime.toggleFavorite("library::first");
    const secondFavoritePersisted = runtime.toggleFavorite("library::second");
    read.reject(new Error("read unavailable"));

    await hydration;
    await expect(firstFavoritePersisted).resolves.toBe(false);
    await expect(secondFavoritePersisted).resolves.toBe(false);
    expect(runtime.getSnapshot()).toMatchObject({
      status: "degraded",
      warning: "Favorites and recent assets will remain available for this session."
    });
    expect(runtime.getSnapshot().preferences.favoriteAssetKeys).toEqual([
      "library::first",
      "library::second"
    ]);
  });
});
