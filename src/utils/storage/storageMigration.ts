import type { AtrVisuProject } from "../../types/project";
import {
  PROJECTS_INDEXEDDB_MIGRATION_KEY,
  PROJECTS_STORAGE_KEY,
  listProjects,
  normalizeProject,
  saveProject
} from "../projectStorage";

export type ProjectStorageMigrationResult = {
  migratedCount: number;
  skippedCount: number;
  warnings: string[];
};

const emptyResult = (): ProjectStorageMigrationResult => ({
  migratedCount: 0,
  skippedCount: 0,
  warnings: []
});

const readLegacyProjectRecords = () => {
  const raw = window.localStorage.getItem(PROJECTS_STORAGE_KEY);
  if (!raw) {
    return [];
  }

  const parsed = JSON.parse(raw) as unknown;
  if (Array.isArray(parsed)) {
    return parsed;
  }
  if (typeof parsed === "object" && parsed !== null && Array.isArray((parsed as { projects?: unknown[] }).projects)) {
    return (parsed as { projects: unknown[] }).projects;
  }
  return [];
};

export const readLegacyProjectsFromLocalStorage = (): AtrVisuProject[] => {
  return readLegacyProjectRecords().flatMap((record) => {
    const project = normalizeProject(record);
    return project ? [project] : [];
  });
};

export const migrateLocalStorageProjectsToIndexedDb = async (): Promise<ProjectStorageMigrationResult> => {
  const result = emptyResult();

  let legacyProjects: AtrVisuProject[] = [];
  try {
    legacyProjects = readLegacyProjectsFromLocalStorage();
  } catch (caught) {
    result.warnings.push("Could not read legacy localStorage project data.");
    console.warn("AtrVisu project migration skipped corrupted localStorage data.", caught);
    return result;
  }

  if (legacyProjects.length === 0) {
    return result;
  }

  const indexedProjects = await listProjects();
  const existingIds = new Set(indexedProjects.map((project) => project.projectId));

  for (const project of legacyProjects) {
    if (existingIds.has(project.projectId)) {
      result.skippedCount += 1;
      result.warnings.push(`Skipped legacy project "${project.projectName}" because it already exists in IndexedDB.`);
      continue;
    }

    await saveProject(project);
    existingIds.add(project.projectId);
    result.migratedCount += 1;
  }

  return result;
};

export const initializeProjectStorage = async (): Promise<ProjectStorageMigrationResult> => {
  const result = emptyResult();

  try {
    const migrationFlag = window.localStorage.getItem(PROJECTS_INDEXEDDB_MIGRATION_KEY);
    const indexedProjects = await listProjects();
    if (migrationFlag === "done" && indexedProjects.length > 0) {
      return result;
    }

    const migrationResult = await migrateLocalStorageProjectsToIndexedDb();
    window.localStorage.setItem(PROJECTS_INDEXEDDB_MIGRATION_KEY, "done");
    return migrationResult;
  } catch (caught) {
    result.warnings.push("Project storage initialization failed.");
    console.warn("AtrVisu project storage initialization failed.", caught);
    return result;
  }
};
