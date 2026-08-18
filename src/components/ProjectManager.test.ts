// @vitest-environment jsdom

import { createElement } from "react";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { AtrVisuLayout } from "../types/machine";
import type { AtrVisuProject } from "../types/project";
import type { RuntimeFeatureCommandOperationResult } from "../platform/runtimeCommands/runtimeFeatureCommands";
import { ProjectManager, executeProjectManagerRuntimeOperation } from "./ProjectManager";

const actEnvironment = globalThis as typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean;
};
actEnvironment.IS_REACT_ACT_ENVIRONMENT = true;

const roots: ReturnType<typeof createRoot>[] = [];

afterEach(async () => {
  await act(async () => {
    roots.splice(0).forEach((root) => root.unmount());
  });
  document.body.replaceChildren();
});

const snapshot: AtrVisuLayout = {
  appName: "AtrVisu",
  version: 1,
  unitSystem: { canonicalUnit: "mm", renderUnit: "m", version: "1.0" },
  exportedAt: "2026-08-04T00:00:00.000Z",
  objects: []
};

const project: AtrVisuProject = {
  projectId: "project-active",
  projectName: "Active Project",
  customerName: "Customer",
  createdAt: "2026-08-04T00:00:00.000Z",
  updatedAt: "2026-08-04T00:00:00.000Z",
  activeLayoutId: "layout-active",
  layouts: [{
    layoutId: "layout-active",
    layoutName: "Layout-1",
    createdAt: "2026-08-04T00:00:00.000Z",
    updatedAt: "2026-08-04T00:00:00.000Z",
    activeRevisionId: "revision-active",
    revisions: [{
      revisionId: "revision-active",
      revisionCode: "R00",
      createdAt: "2026-08-04T00:00:00.000Z",
      updatedAt: "2026-08-04T00:00:00.000Z",
      layoutSnapshot: snapshot
    }]
  }]
};

type ExecuteRuntimeCommand = (
  commandId: "project.save" | "project.exportJson" | "project.importJson",
  payload?: unknown
) => Promise<RuntimeFeatureCommandOperationResult>;

type RequestProjectImport = (
  onResult: (result: RuntimeFeatureCommandOperationResult) => void
) => void;

const renderManager = async (options: {
  entryIntent?: "create" | "open" | null;
  projects?: AtrVisuProject[];
  onClose?: () => void;
  onExecuteRuntimeCommand?: ExecuteRuntimeCommand;
  onRequestProjectImport?: RequestProjectImport;
} = {}) => {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  roots.push(root);
  const onExecuteRuntimeCommand = options.onExecuteRuntimeCommand ?? vi.fn<ExecuteRuntimeCommand>(async () => ({
    handled: true,
    status: "executed" as const
  }));
  const onRequestProjectImport = options.onRequestProjectImport ?? vi.fn<RequestProjectImport>();
  const onProjectsChanged = vi.fn();
  const onCurrentSelectionChange = vi.fn();
  const onLoadRevision = vi.fn();
  const onSavedRevision = vi.fn();

  await act(async () => {
    root.render(createElement(ProjectManager, {
      entryIntent: options.entryIntent ?? null,
      projects: options.projects ?? [project],
      currentProjectId: project.projectId,
      currentLayoutId: project.activeLayoutId,
      currentRevisionId: project.layouts[0].activeRevisionId,
      currentSnapshot: snapshot,
      hasSceneObjects: false,
      isDirty: false,
      onClose: options.onClose ?? vi.fn(),
      onProjectsChanged,
      onCurrentSelectionChange,
      onLoadRevision,
      onSavedRevision,
      onExecuteRuntimeCommand,
      onRequestProjectImport
    }));
  });

  return {
    onExecuteRuntimeCommand,
    onRequestProjectImport,
    onProjectsChanged,
    onCurrentSelectionChange,
    onLoadRevision,
    onSavedRevision
  };
};

const clickButton = async (label: string) => {
  const button = [...document.querySelectorAll("button")].find(
    (candidate) => candidate.textContent?.trim() === label
  );
  expect(button).toBeDefined();
  await act(async () => {
    button?.click();
    await Promise.resolve();
  });
};

describe("Project Manager runtime operations", () => {
  it("focuses the create workflow without mutating project data", async () => {
    const callbacks = await renderManager({ entryIntent: "create", projects: [] });

    expect(document.querySelector('[data-testid="project-manager-modal"]')?.getAttribute("data-entry-intent"))
      .toBe("create");
    expect(document.activeElement).toBe(document.querySelector('[data-testid="new-project-name"]'));
    expect(document.querySelectorAll('[data-testid="project-manager-project-option"]')).toHaveLength(0);
    expect(callbacks.onProjectsChanged).not.toHaveBeenCalled();
    expect(callbacks.onCurrentSelectionChange).not.toHaveBeenCalled();
    expect(callbacks.onLoadRevision).not.toHaveBeenCalled();
    expect(callbacks.onSavedRevision).not.toHaveBeenCalled();
    expect(callbacks.onExecuteRuntimeCommand).not.toHaveBeenCalled();
  });

  it("focuses the existing-project workflow for open intent", async () => {
    const callbacks = await renderManager({ entryIntent: "open" });

    expect(document.querySelector('[data-testid="project-manager-modal"]')?.getAttribute("data-entry-intent"))
      .toBe("open");
    expect(document.activeElement).toBe(document.querySelector('[data-testid="project-manager-project-option"]'));
    expect(callbacks.onProjectsChanged).not.toHaveBeenCalled();
    expect(callbacks.onCurrentSelectionChange).not.toHaveBeenCalled();
    expect(callbacks.onLoadRevision).not.toHaveBeenCalled();
    expect(callbacks.onSavedRevision).not.toHaveBeenCalled();
    expect(callbacks.onExecuteRuntimeCommand).not.toHaveBeenCalled();
  });

  it("provides a focused creation route when open intent has no existing projects", async () => {
    await renderManager({ entryIntent: "open", projects: [] });

    const route = [...document.querySelectorAll("button")].find(
      (button) => button.textContent?.trim() === "Start a New Project"
    );
    expect(document.body.textContent).toContain("No existing projects are available.");
    expect(document.activeElement).toBe(route);
    await act(async () => route?.click());
    expect(document.activeElement).toBe(document.querySelector('[data-testid="new-project-name"]'));
  });

  it("keeps generic entry neutral and restores opener focus after Escape", async () => {
    const opener = document.createElement("button");
    opener.textContent = "Project Manager";
    document.body.appendChild(opener);
    opener.focus();
    const onClose = vi.fn();
    await renderManager({ entryIntent: null, onClose });

    expect(document.querySelector('[data-testid="project-manager-modal"]')?.getAttribute("data-entry-intent"))
      .toBe("neutral");
    expect(document.activeElement).toBe(document.querySelector('[data-testid="close-project-manager"]'));
    await act(async () => document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true })));
    expect(onClose).toHaveBeenCalledOnce();
    await act(async () => roots.pop()?.unmount());
    expect(document.activeElement).toBe(opener);
  });

  it("keeps save completion awaitable", async () => {
    let release: (() => void) | undefined;
    let completed = false;
    const pendingAction = new Promise<void>((resolve) => {
      release = resolve;
    });

    const resultPromise = executeProjectManagerRuntimeOperation(async () => {
      await pendingAction;
      completed = true;
    });

    expect(completed).toBe(false);
    release?.();
    await expect(resultPromise).resolves.toEqual({
      handled: true,
      status: "executed"
    });
    expect(completed).toBe(true);
  });

  it("keeps export completion awaitable", async () => {
    let release: (() => void) | undefined;
    const pendingExport = new Promise<void>((resolve) => {
      release = resolve;
    });
    const resultPromise = executeProjectManagerRuntimeOperation(async () => {
      await pendingExport;
    });

    let settled = false;
    void resultPromise.then(() => {
      settled = true;
    });
    await Promise.resolve();
    expect(settled).toBe(false);

    release?.();
    await expect(resultPromise).resolves.toEqual({
      handled: true,
      status: "executed"
    });
  });

  it("makes import failures observable without rejecting the UI caller", async () => {
    await expect(executeProjectManagerRuntimeOperation(async () => {
      throw new Error("Invalid project JSON.");
    })).resolves.toEqual({
      handled: false,
      status: "failed",
      reason: "Invalid project JSON."
    });
  });

  it("routes Save through project.save and reports success", async () => {
    const { onExecuteRuntimeCommand } = await renderManager();

    await clickButton("Save Current Scene as New Revision");

    expect(onExecuteRuntimeCommand).toHaveBeenCalledWith("project.save", undefined);
    expect(document.body.textContent).toContain("Current scene saved as a new revision.");
  });

  it("routes Export with the transient selected project ID", async () => {
    const { onExecuteRuntimeCommand } = await renderManager();

    await clickButton("Export Project JSON");

    expect(onExecuteRuntimeCommand).toHaveBeenCalledWith("project.exportJson", {
      projectId: project.projectId
    });
    expect(document.body.textContent).toContain("Project exported.");
  });

  it("requests the persistent import provider and reports its returned result", async () => {
    let reportResult: ((result: {
      handled: boolean;
      status: "executed" | "failed";
      reason?: string;
    }) => void) | undefined;
    const onRequestProjectImport = vi.fn((listener) => {
      reportResult = listener;
    });
    await renderManager({ onRequestProjectImport });

    await clickButton("Import Project JSON");
    expect(onRequestProjectImport).toHaveBeenCalledOnce();

    await act(async () => {
      reportResult?.({ handled: true, status: "executed" });
    });
    expect(document.body.textContent).toContain("Project imported.");
  });

  it("shows a persistent import provider failure", async () => {
    let reportResult: ((result: RuntimeFeatureCommandOperationResult) => void) | undefined;
    await renderManager({
      onRequestProjectImport: (listener) => {
        reportResult = listener;
      }
    });

    await clickButton("Import Project JSON");
    await act(async () => {
      reportResult?.({ handled: false, status: "failed", reason: "Invalid project JSON." });
    });

    expect(document.body.textContent).toContain("Invalid project JSON.");
  });

  it("shows runtime command failures without local fallback execution", async () => {
    const onExecuteRuntimeCommand = vi.fn(async () => ({
      handled: false,
      status: "failed" as const,
      reason: "Storage unavailable."
    }));
    await renderManager({ onExecuteRuntimeCommand });

    await clickButton("Save Current Scene as New Revision");

    expect(onExecuteRuntimeCommand).toHaveBeenCalledOnce();
    expect(document.body.textContent).toContain("Storage unavailable.");
  });
});
