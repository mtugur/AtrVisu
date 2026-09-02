import {
  openDB,
  type DBSchema,
  type IDBPDatabase,
  type OpenDBCallbacks
} from "idb";
import type { WorkbenchUiPreferences } from "../../platform/contracts";
import type { AtrVisuProject } from "../../types/project";

export const ATRVISU_DB_NAME = "atrvisu-db";
export const ATRVISU_DB_VERSION = 4;
export const IMPORTED_MODELS_STORE_NAME = "importedModels";
export const PROJECTS_STORE_NAME = "projects";
export const UI_PREFERENCES_STORE_NAME = "uiPreferences";
export const UI_PREFERENCES_RECORD_KEY = "workbench";
export const ASSET_BROWSER_PREFERENCES_STORE_NAME = "assetBrowserPreferences";
export const ASSET_BROWSER_PREFERENCES_RECORD_KEY = "browser";

export interface AtrVisuDatabaseSchema extends DBSchema {
  importedModels: {
    key: string;
    value: { bytes: ArrayBuffer; fileName: string };
  };
  projects: {
    key: string;
    value: AtrVisuProject;
    indexes: {
      customerName: string;
      projectName: string;
      updatedAt: string;
    };
  };
  uiPreferences: {
    key: string;
    value: WorkbenchUiPreferences;
  };
  assetBrowserPreferences: {
    key: string;
    value: {
      schemaVersion: 1;
      favoriteAssetKeys: readonly string[];
      recentAssetKeys: readonly string[];
    };
  };
}

let databasePromise: Promise<IDBPDatabase<AtrVisuDatabaseSchema>> | null = null;
let databaseInstance: IDBPDatabase<AtrVisuDatabaseSchema> | null = null;

export type AtrVisuDatabaseOpener = (
  name: string,
  version: number,
  callbacks: OpenDBCallbacks<AtrVisuDatabaseSchema>
) => Promise<IDBPDatabase<AtrVisuDatabaseSchema>>;

const openAtrVisuDatabaseWith = (openDatabase: AtrVisuDatabaseOpener) => {
  if (!databasePromise) {
    let openingPromise!: Promise<IDBPDatabase<AtrVisuDatabaseSchema>>;
    openingPromise = openDatabase(ATRVISU_DB_NAME, ATRVISU_DB_VERSION, {
      upgrade(database) {
        if (!database.objectStoreNames.contains(IMPORTED_MODELS_STORE_NAME)) {
          database.createObjectStore(IMPORTED_MODELS_STORE_NAME);
        }
        if (!database.objectStoreNames.contains(PROJECTS_STORE_NAME)) {
          const projectsStore = database.createObjectStore(PROJECTS_STORE_NAME, {
            keyPath: "projectId"
          });
          projectsStore.createIndex("updatedAt", "updatedAt");
          projectsStore.createIndex("customerName", "customerName");
          projectsStore.createIndex("projectName", "projectName");
        }
        if (!database.objectStoreNames.contains(UI_PREFERENCES_STORE_NAME)) {
          database.createObjectStore(UI_PREFERENCES_STORE_NAME);
        }
        if (!database.objectStoreNames.contains(ASSET_BROWSER_PREFERENCES_STORE_NAME)) {
          database.createObjectStore(ASSET_BROWSER_PREFERENCES_STORE_NAME);
        }
      }
    })
      .then((database) => {
        if (databasePromise === openingPromise) {
          databaseInstance = database;
        } else {
          database.close();
        }
        return database;
      })
      .catch((error: unknown) => {
        if (databasePromise === openingPromise) {
          databasePromise = null;
          databaseInstance = null;
        }
        throw error;
      });
    databasePromise = openingPromise;
  }

  return databasePromise;
};

export const openAtrVisuDatabase = () => openAtrVisuDatabaseWith(
  (name, version, callbacks) => openDB<AtrVisuDatabaseSchema>(name, version, callbacks)
);

export const openAtrVisuDatabaseWithOpenerForTests = (openDatabase: AtrVisuDatabaseOpener) =>
  openAtrVisuDatabaseWith(openDatabase);

export const resetAtrVisuDatabaseConnectionForTests = () => {
  databaseInstance?.close();
  databaseInstance = null;
  databasePromise = null;
};
