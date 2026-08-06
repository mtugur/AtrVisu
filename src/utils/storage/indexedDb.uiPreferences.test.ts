import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import {
  ATRVISU_DB_NAME,
  ATRVISU_DB_VERSION,
  PROJECTS_STORE_NAME,
  UI_PREFERENCES_STORE_NAME,
  openAtrVisuDatabase,
  resetAtrVisuDatabaseConnectionForTests
} from "./indexedDb";

const deleteDatabase = () => new Promise<void>((resolve, reject) => {
  const request = indexedDB.deleteDatabase(ATRVISU_DB_NAME);
  request.onsuccess = () => resolve();
  request.onerror = () => reject(request.error);
});

const createVersionOneDatabase = (project?: Record<string, unknown>) => new Promise<void>((resolve, reject) => {
  const request = indexedDB.open(ATRVISU_DB_NAME, 1);
  request.onupgradeneeded = () => {
    const store = request.result.createObjectStore(PROJECTS_STORE_NAME, { keyPath: "projectId" });
    store.createIndex("updatedAt", "updatedAt");
    store.createIndex("customerName", "customerName");
    store.createIndex("projectName", "projectName");
    if (project) {
      store.put(project);
    }
  };
  request.onsuccess = () => {
    request.result.close();
    resolve();
  };
  request.onerror = () => reject(request.error);
});

describe("AtrVisu IndexedDB version 2", () => {
  beforeEach(async () => {
    resetAtrVisuDatabaseConnectionForTests();
    await deleteDatabase();
  });

  it("creates both stores and preserves the project indexes on a fresh install", async () => {
    const database = await openAtrVisuDatabase();

    expect(database.version).toBe(ATRVISU_DB_VERSION);
    expect([...database.objectStoreNames]).toEqual([PROJECTS_STORE_NAME, UI_PREFERENCES_STORE_NAME]);
    const projectStore = database.transaction(PROJECTS_STORE_NAME).objectStore(PROJECTS_STORE_NAME);
    expect([...projectStore.indexNames]).toEqual(["customerName", "projectName", "updatedAt"]);

    const reopened = await openAtrVisuDatabase();
    expect(reopened).toBe(database);
  });

  it("upgrades a real version-1 database without rewriting project records", async () => {
    const project = {
      projectId: "project-upgrade-proof",
      projectName: "Upgrade Proof",
      customerName: "Atara",
      updatedAt: "2026-08-06T00:00:00.000Z",
      untouched: { nested: true }
    };
    await createVersionOneDatabase(project);

    const database = await openAtrVisuDatabase();
    const persisted = await database.get(PROJECTS_STORE_NAME, project.projectId);

    expect(database.version).toBe(2);
    expect(database.objectStoreNames.contains(UI_PREFERENCES_STORE_NAME)).toBe(true);
    expect(persisted).toEqual(project);
  });

  it("recovers after an aborted versionchange transaction and retries normally", async () => {
    await createVersionOneDatabase({
      projectId: "project-abort-proof",
      projectName: "Abort Proof",
      customerName: "Atara",
      updatedAt: "2026-08-06T00:00:00.000Z"
    });

    await expect(new Promise<void>((resolve, reject) => {
      const request = indexedDB.open(ATRVISU_DB_NAME, 2);
      request.onupgradeneeded = () => {
        request.result.createObjectStore(UI_PREFERENCES_STORE_NAME);
        request.transaction?.abort();
      };
      request.onsuccess = () => {
        request.result.close();
        resolve();
      };
      request.onerror = () => reject(request.error);
    })).rejects.toBeTruthy();

    const versionOne = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(ATRVISU_DB_NAME, 1);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    expect(versionOne.objectStoreNames.contains(PROJECTS_STORE_NAME)).toBe(true);
    expect(versionOne.objectStoreNames.contains(UI_PREFERENCES_STORE_NAME)).toBe(false);
    versionOne.close();

    const recovered = await openAtrVisuDatabase();
    expect(recovered.version).toBe(2);
    expect(recovered.objectStoreNames.contains(UI_PREFERENCES_STORE_NAME)).toBe(true);
    expect(await recovered.get(PROJECTS_STORE_NAME, "project-abort-proof")).toBeTruthy();
  });
});
