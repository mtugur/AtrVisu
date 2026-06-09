import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AtrVisuLayout } from "../types/machine";
import {
  PROJECTS_STORAGE_KEY,
  createProject,
  createRevision,
  deleteLayout,
  deleteProject,
  duplicateProject,
  exportProject,
  importProject,
  listProjects,
  nextRevisionCode
} from "./projectStorage";

const snapshot: AtrVisuLayout = {
  appName: "AtrVisu",
  version: 1,
  unitSystem: { canonicalUnit: "mm", renderUnit: "m", version: "1.0" },
  exportedAt: "2026-06-05T00:00:00.000Z",
  objects: []
};

describe("project storage", () => {
  const storage = new Map<string, string>();

  beforeEach(() => {
    storage.clear();
    vi.restoreAllMocks();
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

  it("creates a project with a default layout and revision", () => {
    const project = createProject({ projectName: "Paketleme Hatti", customerName: "ABC Un" }, snapshot);

    expect(project.projectName).toBe("Paketleme Hatti");
    expect(project.layouts).toHaveLength(1);
    expect(project.layouts[0].layoutName).toBe("Layout-1");
    expect(project.layouts[0].revisions[0].revisionCode).toBe("R00");
    expect(listProjects()).toHaveLength(1);
  });

  it("creates a new revision with the next revision code", () => {
    const project = createProject({ projectName: "Project", customerName: "Customer" }, snapshot);
    const layout = project.layouts[0];
    const updated = createRevision(project.projectId, layout.layoutId, snapshot);

    expect(updated.layouts[0].revisions[0].revisionCode).toBe("R01");
    expect(nextRevisionCode(updated.layouts[0])).toBe("R02");
  });

  it("deletes a project from the list", () => {
    const project = createProject({ projectName: "Project", customerName: "Customer" }, snapshot);

    deleteProject(project.projectId);

    expect(listProjects()).toEqual([]);
  });

  it("keeps a project valid when deleting layouts", () => {
    const project = createProject({ projectName: "Project", customerName: "Customer" }, snapshot);

    expect(() => deleteLayout(project.projectId, project.layouts[0].layoutId)).toThrow("at least one layout");
  });

  it("exports and imports project metadata", () => {
    const project = createProject(
      {
        projectName: "Paketleme Hatti",
        customerName: "ABC Un",
        customerLocation: "Konya",
        description: "Line alternatives"
      },
      snapshot
    );
    const exported = exportProject(project.projectId);
    deleteProject(project.projectId);
    const imported = importProject(exported);

    expect(imported.projectName).toBe("Paketleme Hatti");
    expect(imported.customerName).toBe("ABC Un");
    expect(imported.customerLocation).toBe("Konya");
  });

  it("does not crash on corrupted localStorage data", () => {
    window.localStorage.setItem(PROJECTS_STORAGE_KEY, "{not-json");

    expect(listProjects()).toEqual([]);
  });

  it("duplicates a project with a new id", () => {
    const project = createProject({ projectName: "Project", customerName: "Customer" }, snapshot);
    const duplicated = duplicateProject(project.projectId);

    expect(duplicated.projectId).not.toBe(project.projectId);
    expect(duplicated.projectName).toBe("Project Copy");
    expect(listProjects()).toHaveLength(2);
  });
});
