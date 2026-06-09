import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AtrVisuLayout } from "../types/machine";
import {
  PROJECTS_INDEXEDDB_MIGRATION_KEY,
  PROJECTS_STORAGE_KEY,
  createProject,
  createRevision,
  deleteLayout,
  deleteProject,
  duplicateProject,
  exportProject,
  getProject,
  importProject,
  listProjects,
  nextRevisionCode,
  saveProject
} from "./projectStorage";
import { ATRVISU_DB_NAME, resetAtrVisuDatabaseConnectionForTests } from "./storage/indexedDb";
import { initializeProjectStorage } from "./storage/storageMigration";

const snapshot: AtrVisuLayout = {
  appName: "AtrVisu",
  version: 1,
  unitSystem: { canonicalUnit: "mm", renderUnit: "m", version: "1.0" },
  exportedAt: "2026-06-05T00:00:00.000Z",
  objects: []
};

const snapshotWithObject: AtrVisuLayout = {
  ...snapshot,
  objects: [
    {
      id: "placed-packaging-1",
      machineDefinitionId: "packaging-machine",
      name: "Packaging Machine",
      category: "Packaging Machine",
      width: 2,
      depth: 1.5,
      height: 1.8,
      defaultColor: "#4f8ef7",
      positionX: 1.25,
      positionZ: -2.5,
      rotationY: 90,
      flowDirection: "forward"
    }
  ]
};

const deleteIndexedDb = () =>
  new Promise<void>((resolve, reject) => {
    const request = indexedDB.deleteDatabase(ATRVISU_DB_NAME);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
    request.onblocked = () => resolve();
  });

describe("project storage", () => {
  const storage = new Map<string, string>();

  beforeEach(async () => {
    storage.clear();
    vi.restoreAllMocks();
    resetAtrVisuDatabaseConnectionForTests();
    await deleteIndexedDb();
    resetAtrVisuDatabaseConnectionForTests();
    vi.stubGlobal("window", {
      localStorage: {
        getItem: (key: string) => storage.get(key) ?? null,
        setItem: (key: string, value: string) => storage.set(key, value),
        removeItem: (key: string) => storage.delete(key),
        clear: () => storage.clear()
      }
    });
    window.localStorage.clear();
  });

  it("creates a project with a default layout and revision", async () => {
    const project = await createProject({ projectName: "Paketleme Hatti", customerName: "ABC Un" }, snapshot);

    expect(project.projectName).toBe("Paketleme Hatti");
    expect(project.layouts).toHaveLength(1);
    expect(project.layouts[0].layoutName).toBe("Layout-1");
    expect(project.layouts[0].revisions[0].revisionCode).toBe("R00");
    expect(await listProjects()).toHaveLength(1);
  });

  it("saves and returns a project by id", async () => {
    const project = await createProject({ projectName: "Project", customerName: "Customer" }, snapshot);
    const saved = await getProject(project.projectId);

    expect(saved?.projectId).toBe(project.projectId);
    expect(saved?.projectName).toBe("Project");
  });

  it("creates a new revision with the next revision code", async () => {
    const project = await createProject({ projectName: "Project", customerName: "Customer" }, snapshot);
    const layout = project.layouts[0];
    const updated = await createRevision(project.projectId, layout.layoutId, snapshot);

    expect(updated.layouts[0].revisions[0].revisionCode).toBe("R01");
    expect(nextRevisionCode(updated.layouts[0])).toBe("R02");
  });

  it("deletes a project from the list", async () => {
    const project = await createProject({ projectName: "Project", customerName: "Customer" }, snapshot);

    await deleteProject(project.projectId);

    expect(await listProjects()).toEqual([]);
  });

  it("keeps a project valid when deleting layouts", async () => {
    const project = await createProject({ projectName: "Project", customerName: "Customer" }, snapshot);

    await expect(deleteLayout(project.projectId, project.layouts[0].layoutId)).rejects.toThrow("at least one layout");
  });

  it("exports and imports project metadata", async () => {
    const project = await createProject(
      {
        projectName: "Paketleme Hatti",
        customerName: "ABC Un",
        customerLocation: "Konya",
        description: "Line alternatives"
      },
      snapshot
    );
    const exported = await exportProject(project.projectId);
    await deleteProject(project.projectId);
    const imported = await importProject(exported);

    expect(imported.projectName).toBe("Paketleme Hatti");
    expect(imported.customerName).toBe("ABC Un");
    expect(imported.customerLocation).toBe("Konya");
  });

  it("imports an exported project into IndexedDB after deletion", async () => {
    const project = await createProject(
      {
        projectName: "Import Roundtrip",
        customerName: "Customer",
        customerLocation: "Izmir",
        description: "Saved engineering layout"
      },
      snapshotWithObject
    );
    const layout = project.layouts[0];
    const updated = await createRevision(project.projectId, layout.layoutId, snapshotWithObject, "R01", "Imported revision notes");
    const exported = await exportProject(updated.projectId);

    await deleteProject(updated.projectId);
    expect(await listProjects()).toEqual([]);

    const imported = await importProject(exported);
    const projects = await listProjects();
    const saved = await getProject(imported.projectId);
    const importedLayout = saved?.layouts.find((item) => item.layoutId === imported.activeLayoutId);
    const importedRevision = importedLayout?.revisions.find((item) => item.revisionId === importedLayout.activeRevisionId);

    expect(projects.map((item) => item.projectId)).toEqual([imported.projectId]);
    expect(saved?.projectName).toBe("Import Roundtrip");
    expect(saved?.customerName).toBe("Customer");
    expect(saved?.customerLocation).toBe("Izmir");
    expect(saved?.description).toBe("Saved engineering layout");
    expect(importedLayout?.revisions.map((revision) => revision.revisionCode)).toContain("R01");
    expect(importedRevision?.notes).toBe("Imported revision notes");
    expect(importedRevision?.layoutSnapshot.unitSystem).toEqual(snapshotWithObject.unitSystem);
    expect(importedRevision?.layoutSnapshot.objects).toEqual(snapshotWithObject.objects);
  });

  it("keeps imported projects persisted across repository reloads", async () => {
    const project = await createProject({ projectName: "Persistent Import", customerName: "Customer" }, snapshotWithObject);
    const exported = await exportProject(project.projectId);
    await deleteProject(project.projectId);

    const imported = await importProject(exported);
    resetAtrVisuDatabaseConnectionForTests();

    expect((await getProject(imported.projectId))?.projectName).toBe("Persistent Import");
    expect((await listProjects()).map((item) => item.projectId)).toEqual([imported.projectId]);
  });

  it("imports an ID collision as a safe copy while preserving nested revision data", async () => {
    const project = await createProject({ projectName: "Collision Project", customerName: "Customer" }, snapshotWithObject);
    const exported = await exportProject(project.projectId);

    const imported = await importProject(exported);

    expect(imported.projectId).not.toBe(project.projectId);
    expect(imported.projectName).toBe("Collision Project Imported");
    expect(imported.layouts[0].layoutId).toBe(project.layouts[0].layoutId);
    expect(imported.layouts[0].activeRevisionId).toBe(project.layouts[0].activeRevisionId);
    expect(imported.layouts[0].revisions[0].revisionId).toBe(project.layouts[0].revisions[0].revisionId);
    expect(imported.layouts[0].revisions[0].layoutSnapshot.objects).toEqual(snapshotWithObject.objects);
    expect(await listProjects()).toHaveLength(2);
  });

  it("rejects invalid imported projects without crashing", async () => {
    await expect(importProject({ projectName: "", layouts: [] })).rejects.toThrow("not an AtrVisu project");
    expect(await listProjects()).toEqual([]);
  });

  it("duplicates a project with a new id", async () => {
    const project = await createProject({ projectName: "Project", customerName: "Customer" }, snapshot);
    const duplicated = await duplicateProject(project.projectId);

    expect(duplicated.projectId).not.toBe(project.projectId);
    expect(duplicated.projectName).toBe("Project Copy");
    expect(await listProjects()).toHaveLength(2);
  });

  it("migrates legacy localStorage projects into IndexedDB", async () => {
    const legacyProject = await createProject({ projectName: "Legacy", customerName: "Customer" }, snapshot);
    await deleteProject(legacyProject.projectId);
    window.localStorage.setItem(PROJECTS_STORAGE_KEY, JSON.stringify([legacyProject]));

    const result = await initializeProjectStorage();

    expect(result.migratedCount).toBe(1);
    expect(window.localStorage.getItem(PROJECTS_INDEXEDDB_MIGRATION_KEY)).toBe("done");
    expect(await listProjects()).toHaveLength(1);
    expect((await getProject(legacyProject.projectId))?.projectName).toBe("Legacy");
  });

  it("does not overwrite existing IndexedDB projects during migration", async () => {
    const project = await createProject({ projectName: "Current", customerName: "Customer" }, snapshot);
    window.localStorage.setItem(PROJECTS_STORAGE_KEY, JSON.stringify([{ ...project, projectName: "Older Copy" }]));

    const result = await initializeProjectStorage();

    expect(result.skippedCount).toBe(1);
    expect((await getProject(project.projectId))?.projectName).toBe("Current");
  });

  it("does not crash on corrupted localStorage migration data", async () => {
    window.localStorage.setItem(PROJECTS_STORAGE_KEY, "{not-json");

    const result = await initializeProjectStorage();

    expect(result.warnings.length).toBeGreaterThan(0);
    expect(await listProjects()).toEqual([]);
  });

  it("skips corrupted IndexedDB project records", async () => {
    await saveProject({
      projectId: "project-valid",
      projectName: "Valid",
      customerName: "Customer",
      createdAt: "2026-06-05T00:00:00.000Z",
      updatedAt: "2026-06-05T00:00:00.000Z",
      layouts: [],
      activeLayoutId: ""
    });
    const database = await indexedDB.open(ATRVISU_DB_NAME);
    await new Promise<void>((resolve, reject) => {
      database.onsuccess = () => {
        const db = database.result;
        const transaction = db.transaction("projects", "readwrite");
        transaction.objectStore("projects").put({ projectId: "bad-record", updatedAt: "2026", projectName: "", customerName: "" });
        transaction.oncomplete = () => {
          db.close();
          resolve();
        };
        transaction.onerror = () => reject(transaction.error);
      };
      database.onerror = () => reject(database.error);
    });

    const projects = await listProjects();

    expect(projects.map((project) => project.projectId)).toEqual(["project-valid"]);
  });
});
