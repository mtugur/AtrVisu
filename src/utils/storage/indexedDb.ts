import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import type { WorkbenchUiPreferences } from "../../platform/contracts";
import type { AtrVisuProject } from "../../types/project";

export const ATRVISU_DB_NAME = "atrvisu-db";
export const ATRVISU_DB_VERSION = 2;
export const PROJECTS_STORE_NAME = "projects";
export const UI_PREFERENCES_STORE_NAME = "uiPreferences";
export const UI_PREFERENCES_RECORD_KEY = "workbench";

export interface AtrVisuDatabaseSchema extends DBSchema {
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
}

let databasePromise: Promise<IDBPDatabase<AtrVisuDatabaseSchema>> | null = null;
let databaseInstance: IDBPDatabase<AtrVisuDatabaseSchema> | null = null;

export const openAtrVisuDatabase = () => {
  if (!databasePromise) {
    databasePromise = openDB<AtrVisuDatabaseSchema>(ATRVISU_DB_NAME, ATRVISU_DB_VERSION, {
      upgrade(database) {
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
      }
    }).then((database) => {
      databaseInstance = database;
      return database;
    });
  }

  return databasePromise;
};

export const resetAtrVisuDatabaseConnectionForTests = () => {
  databaseInstance?.close();
  databaseInstance = null;
  databasePromise = null;
};
