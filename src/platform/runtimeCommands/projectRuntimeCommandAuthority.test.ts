// @vitest-environment jsdom

import { describe, expect, it, vi } from "vitest";
import type { AtrVisuLayout } from "../../types/machine";
import type { AtrVisuProject } from "../../types/project";
import {
  RUNTIME_FEATURE_COMMAND_IDS,
  createRuntimeFeatureCommandBridge
} from "./runtimeFeatureCommands";
import {
  createProjectRuntimeCommandBindings,
  downloadProjectJson,
  executeProjectImportFileSelection,
  type ProjectExportCommandPayload
} from "./projectRuntimeCommandAuthority";

const snapshot: AtrVisuLayout = {
  appName: "AtrVisu",
  version: 1,
  unitSystem: { canonicalUnit: "mm", renderUnit: "m", version: "1.0" },
  exportedAt: "2026-08-04T00:00:00.000Z",
  objects: []
};

const project = (projectId: string, layoutId = `${projectId}-layout`): AtrVisuProject => ({
  projectId,
  projectName: `Project ${projectId}`,
  customerName: "Customer",
  createdAt: "2026-08-04T00:00:00.000Z",
  updatedAt: "2026-08-04T00:00:00.000Z",
  activeLayoutId: layoutId,
  layouts: [{
    layoutId,
    layoutName: "Layout-1",
    createdAt: "2026-08-04T00:00:00.000Z",
    updatedAt: "2026-08-04T00:00:00.000Z",
    activeRevisionId: `${projectId}-revision-0`,
    revisions: [{
      revisionId: `${projectId}-revision-0`,
      revisionCode: "R00",
      createdAt: "2026-08-04T00:00:00.000Z",
      updatedAt: "2026-08-04T00:00:00.000Z",
      layoutSnapshot: snapshot
    }]
  }]
});

const context = (payload?: unknown) => ({
  selectionIds: [],
  hasUnsavedChanges: false,
  payload
});

const createHarness = (overrides: Partial<Parameters<typeof createProjectRuntimeCommandBindings>[0]> = {}) => {
  const activeProject = project("active");
  const refreshedProjects = [activeProject];
  const savedProject: AtrVisuProject = {
    ...activeProject,
    layouts: [{
      ...activeProject.layouts[0],
      activeRevisionId: "active-revision-1",
      revisions: [{
        revisionId: "active-revision-1",
        revisionCode: "R01",
        createdAt: "2026-08-04T01:00:00.000Z",
        updatedAt: "2026-08-04T01:00:00.000Z",
        layoutSnapshot: snapshot
      }, ...activeProject.layouts[0].revisions]
    }]
  };
  const createRevision = vi.fn(async () => savedProject);
  const exportProject = vi.fn(async (projectId: string) =>
    refreshedProjects.find((candidate) => candidate.projectId === projectId) ?? activeProject
  );
  const importProject = vi.fn(async () => project("imported"));
  const refreshProjects = vi.fn(async () => refreshedProjects);
  const onRevisionSaved = vi.fn();
  const onProjectImported = vi.fn();
  const prompt = vi.fn((message: string, defaultValue: string) =>
    message === "Revision code" ? defaultValue : "Revision notes"
  );
  const downloadProject = vi.fn();
  const bindings = createProjectRuntimeCommandBindings({
    projects: refreshedProjects,
    currentProjectId: activeProject.projectId,
    currentLayoutId: activeProject.layouts[0].layoutId,
    currentSnapshot: snapshot,
    refreshProjects,
    onRevisionSaved,
    onProjectImported,
    prompt,
    downloadProject,
    storage: { createRevision, exportProject, importProject },
    ...overrides
  });

  return {
    activeProject,
    bindings,
    createRevision,
    exportProject,
    importProject,
    refreshProjects,
    onRevisionSaved,
    onProjectImported,
    prompt,
    downloadProject
  };
};

describe("project runtime command authority", () => {
  it("enables save only for an existing active project and layout", () => {
    const valid = createHarness();
    expect(valid.bindings[RUNTIME_FEATURE_COMMAND_IDS.projectSave]?.getEnableState(context()))
      .toEqual({ enabled: true });

    const missingProject = createHarness({ currentProjectId: null });
    expect(missingProject.bindings[RUNTIME_FEATURE_COMMAND_IDS.projectSave]?.getEnableState(context()))
      .toEqual({ enabled: false, reason: "No active project is available." });

    const staleProject = createHarness({ currentProjectId: "missing" });
    expect(staleProject.bindings[RUNTIME_FEATURE_COMMAND_IDS.projectSave]?.getEnableState(context()))
      .toEqual({ enabled: false, reason: "No active project is available." });

    const staleLayout = createHarness({ currentLayoutId: "missing" });
    expect(staleLayout.bindings[RUNTIME_FEATURE_COMMAND_IDS.projectSave]?.getEnableState(context()))
      .toEqual({ enabled: false, reason: "The active project layout is unavailable." });
  });

  it("saves the active scene layout, refreshes projects, and reports the new revision", async () => {
    const harness = createHarness();
    const binding = harness.bindings[RUNTIME_FEATURE_COMMAND_IDS.projectSave];

    await expect(binding?.execute(context())).resolves.toEqual({
      handled: true,
      status: "executed",
      reason: "Current scene saved as a new revision."
    });
    expect(harness.createRevision).toHaveBeenCalledWith(
      "active",
      "active-layout",
      snapshot,
      "R01",
      "Revision notes"
    );
    expect(harness.refreshProjects).toHaveBeenCalledOnce();
    expect(harness.onRevisionSaved).toHaveBeenCalledWith(
      "active",
      "active-layout",
      "active-revision-1"
    );
  });

  it("returns failed save evidence instead of rejecting on storage errors", async () => {
    const harness = createHarness({
      storage: {
        createRevision: vi.fn(async () => { throw new Error("save failed"); }),
        exportProject: vi.fn(),
        importProject: vi.fn()
      }
    });

    await expect(harness.bindings[RUNTIME_FEATURE_COMMAND_IDS.projectSave]?.execute(context()))
      .resolves.toEqual({ handled: false, status: "failed", reason: "save failed" });
  });

  it("uses an explicit export project ID before the active project ID without mutating payload", async () => {
    const selectedProject = project("selected");
    const harness = createHarness({ projects: [project("active"), selectedProject] });
    const payload: ProjectExportCommandPayload = { projectId: selectedProject.projectId };
    const originalPayload = { ...payload };

    await expect(harness.bindings[RUNTIME_FEATURE_COMMAND_IDS.projectExportJson]?.execute(context(payload)))
      .resolves.toMatchObject({ handled: true, status: "executed" });
    expect(harness.exportProject).toHaveBeenCalledWith("selected");
    expect(payload).toEqual(originalPayload);
  });

  it("uses the active project for export when no payload is supplied", async () => {
    const harness = createHarness();

    await harness.bindings[RUNTIME_FEATURE_COMMAND_IDS.projectExportJson]?.execute(context());

    expect(harness.exportProject).toHaveBeenCalledWith("active");
    expect(harness.downloadProject).toHaveBeenCalledOnce();
  });

  it("rejects invalid or unknown export targets before storage execution", () => {
    const harness = createHarness();
    const binding = harness.bindings[RUNTIME_FEATURE_COMMAND_IDS.projectExportJson];

    expect(binding?.getEnableState(context({ projectId: "" }))).toEqual({
      enabled: false,
      reason: "Project export requires a non-empty project ID."
    });
    expect(binding?.getEnableState(context({ projectId: "missing" }))).toEqual({
      enabled: false,
      reason: "No project is available to export."
    });
    expect(harness.exportProject).not.toHaveBeenCalled();
  });

  it("revokes the object URL after browser download", () => {
    const createObjectURL = vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:project");
    const revokeObjectURL = vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => undefined);
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => undefined);

    downloadProjectJson(project("download"));

    expect(createObjectURL).toHaveBeenCalledOnce();
    expect(click).toHaveBeenCalledOnce();
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:project");
  });

  it("imports a valid File payload, refreshes projects, and does not mutate caller state", async () => {
    const harness = createHarness();
    const file = new File(["{}"], "project.json", { type: "application/json" });
    Object.defineProperty(file, "text", { value: vi.fn(async () => JSON.stringify(project("source"))) });
    const selection = ["machine:one"];
    const history = { undoDepth: 2, redoDepth: 1 };
    const activeIds = { projectId: "active", layoutId: "active-layout", revisionId: "active-revision-0" };

    await expect(harness.bindings[RUNTIME_FEATURE_COMMAND_IDS.projectImportJson]?.execute(context({ file })))
      .resolves.toMatchObject({ handled: true, status: "executed" });
    expect(harness.importProject).toHaveBeenCalledWith(project("source"));
    expect(harness.refreshProjects).toHaveBeenCalledOnce();
    expect(harness.onProjectImported).toHaveBeenCalledWith("imported");
    expect(selection).toEqual(["machine:one"]);
    expect(history).toEqual({ undoDepth: 2, redoDepth: 1 });
    expect(activeIds).toEqual({ projectId: "active", layoutId: "active-layout", revisionId: "active-revision-0" });
  });

  it("rejects missing files and returns failed evidence for malformed or invalid project JSON", async () => {
    const harness = createHarness();
    const binding = harness.bindings[RUNTIME_FEATURE_COMMAND_IDS.projectImportJson];

    expect(binding?.getEnableState(context())).toEqual({
      enabled: false,
      reason: "Choose a project JSON file."
    });

    const malformed = new File(["{"], "malformed.json");
    Object.defineProperty(malformed, "text", { value: vi.fn(async () => "{") });
    await expect(binding?.execute(context({ file: malformed }))).resolves.toMatchObject({
      handled: false,
      status: "failed"
    });

    const invalid = new File(["{}"], "invalid.json");
    Object.defineProperty(invalid, "text", { value: vi.fn(async () => "{}") });
    harness.importProject.mockRejectedValueOnce(new Error("Selected file is not an AtrVisu project."));
    await expect(binding?.execute(context({ file: invalid }))).resolves.toEqual({
      handled: false,
      status: "failed",
      reason: "Selected file is not an AtrVisu project."
    });
  });

  it("executes no runtime command when file acquisition is cancelled", async () => {
    const execute = vi.fn(async () => ({ handled: true, status: "executed" as const }));

    await expect(executeProjectImportFileSelection(undefined, execute)).resolves.toBeNull();

    expect(execute).not.toHaveBeenCalled();
  });

  it("executes live project bindings without invoking seed no-ops or requiring ProjectManager", async () => {
    const harness = createHarness();
    const bridge = createRuntimeFeatureCommandBridge(() => harness.bindings);

    await expect(bridge.executeCommand(RUNTIME_FEATURE_COMMAND_IDS.projectExportJson, context()))
      .resolves.toMatchObject({ handled: true, status: "executed" });
    expect(harness.exportProject).toHaveBeenCalledOnce();
    expect(harness.downloadProject).toHaveBeenCalledOnce();
  });
});
