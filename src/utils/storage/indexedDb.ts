import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import type { AtrVisuProject } from "../../types/project";

export const ATRVISU_DB_NAME = "atrvisu-db";
export const ATRVISU_DB_VERSION = 1;
export const PROJECTS_STORE_NAME = "projects";

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
