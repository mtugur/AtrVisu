import type { AtrVisuLayout } from "../../types/machine";
import type { AtrVisuProject } from "../../types/project";
import {
  createRevision,
  exportProject,
  importProject,
  nextRevisionCode
} from "../../utils/projectStorage";
import {
  createExecutedRuntimeCommandResult,
  createFailedRuntimeCommandResult,
  createUnavailableRuntimeCommandResult
} from "./runtimeCommandOperation";
import {
  RUNTIME_FEATURE_COMMAND_IDS,
  type RuntimeFeatureCommandBindings,
  type RuntimeFeatureCommandOperationResult
} from "./runtimeFeatureCommands";

export const PROJECT_RUNTIME_COMMAND_IDS = [
  RUNTIME_FEATURE_COMMAND_IDS.projectSave,
  RUNTIME_FEATURE_COMMAND_IDS.projectExportJson,
  RUNTIME_FEATURE_COMMAND_IDS.projectImportJson
] as const;

export type ProjectRuntimeCommandId = typeof PROJECT_RUNTIME_COMMAND_IDS[number];

export type ProjectRuntimeCommandE2EBridge = {
  execute: (
    commandId: ProjectRuntimeCommandId,
    payload?: unknown
  ) => Promise<RuntimeFeatureCommandOperationResult>;
};

export type ProjectExportCommandPayload = {
  projectId: string;
};

export type ProjectImportCommandPayload = {
  file: File;
};

export const executeProjectImportFileSelection = async (
  file: File | undefined,
  execute: (
    payload: ProjectImportCommandPayload
  ) => Promise<RuntimeFeatureCommandOperationResult>
) => file ? execute({ file }) : null;

type ProjectRuntimeCommandStorage = {
  createRevision: typeof createRevision;
  exportProject: typeof exportProject;
  importProject: typeof importProject;
};

type ProjectRuntimeCommandAuthorityOptions = {
  projects: readonly AtrVisuProject[];
  currentProjectId: string | null;
  currentLayoutId: string | null;
  currentSnapshot: AtrVisuLayout;
  refreshProjects: () => Promise<readonly AtrVisuProject[]>;
  onRevisionSaved: (projectId: string, layoutId: string, revisionId: string) => void;
  onProjectImported?: (projectId: string) => void;
  prompt: (message: string, defaultValue: string) => string | null;
  storage?: ProjectRuntimeCommandStorage;
  downloadProject?: (project: AtrVisuProject) => void;
};

const DEFAULT_STORAGE: ProjectRuntimeCommandStorage = {
  createRevision,
  exportProject,
  importProject
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

export const isProjectExportCommandPayload = (
  value: unknown
): value is ProjectExportCommandPayload =>
  isRecord(value)
  && typeof value.projectId === "string"
  && value.projectId.trim().length > 0;

export const isProjectImportCommandPayload = (
  value: unknown
): value is ProjectImportCommandPayload =>
  isRecord(value)
  && typeof File !== "undefined"
  && value.file instanceof File;

export const downloadProjectJson = (project: AtrVisuProject) => {
  const blob = new Blob([JSON.stringify(project, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${project.projectName.replace(/[^a-z0-9]+/gi, "-").replace(/^-+|-+$/g, "") || "atrvisu-project"}.project.json`;

  try {
    document.body.appendChild(link);
    link.click();
  } finally {
    link.remove();
    URL.revokeObjectURL(url);
  }
};

const resolveActiveProjectLayout = (
  projects: readonly AtrVisuProject[],
  projectId: string | null,
  layoutId: string | null
) => {
  const project = projectId
    ? projects.find((candidate) => candidate.projectId === projectId)
    : undefined;
  const layout = project && layoutId
    ? project.layouts.find((candidate) => candidate.layoutId === layoutId)
    : undefined;
  return { project, layout };
};

const resolveExportProject = (
  projects: readonly AtrVisuProject[],
  currentProjectId: string | null,
  payload: unknown
) => {
  if (payload !== undefined && !isProjectExportCommandPayload(payload)) {
    return { project: undefined, invalidPayload: true };
  }

  const projectId = isProjectExportCommandPayload(payload)
    ? payload.projectId.trim()
    : currentProjectId;
  return {
    project: projectId
      ? projects.find((candidate) => candidate.projectId === projectId)
      : undefined,
    invalidPayload: false
  };
};

export const createProjectRuntimeCommandBindings = ({
  projects,
  currentProjectId,
  currentLayoutId,
  currentSnapshot,
  refreshProjects,
  onRevisionSaved,
  onProjectImported,
  prompt,
  storage = DEFAULT_STORAGE,
  downloadProject = downloadProjectJson
}: ProjectRuntimeCommandAuthorityOptions): RuntimeFeatureCommandBindings => ({
  [RUNTIME_FEATURE_COMMAND_IDS.projectSave]: {
    getEnableState: () => {
      const { project, layout } = resolveActiveProjectLayout(
        projects,
        currentProjectId,
        currentLayoutId
      );
      return project && layout
        ? { enabled: true }
        : {
            enabled: false,
            reason: !project
              ? "No active project is available."
              : "The active project layout is unavailable."
          };
    },
    execute: async () => {
      const { project, layout } = resolveActiveProjectLayout(
        projects,
        currentProjectId,
        currentLayoutId
      );
      if (!project || !layout) {
        return createUnavailableRuntimeCommandResult(
          !project
            ? "No active project is available."
            : "The active project layout is unavailable."
        );
      }

      const suggestedRevisionCode = nextRevisionCode(layout);
      const revisionCode = prompt("Revision code", suggestedRevisionCode)?.trim()
        || suggestedRevisionCode;
      const notes = prompt("Revision notes", "") ?? "";

      try {
        const updatedProject = await storage.createRevision(
          project.projectId,
          layout.layoutId,
          currentSnapshot,
          revisionCode,
          notes
        );
        const updatedLayout = updatedProject.layouts.find(
          (candidate) => candidate.layoutId === layout.layoutId
        );
        const revision = updatedLayout?.revisions[0];
        if (!updatedLayout || !revision) {
          return createFailedRuntimeCommandResult(
            new Error("Saved revision could not be resolved.")
          );
        }

        await refreshProjects();
        onRevisionSaved(updatedProject.projectId, updatedLayout.layoutId, revision.revisionId);
        return createExecutedRuntimeCommandResult("Current scene saved as a new revision.");
      } catch (error) {
        return createFailedRuntimeCommandResult(error);
      }
    }
  },
  [RUNTIME_FEATURE_COMMAND_IDS.projectExportJson]: {
    getEnableState: (context) => {
      const { project, invalidPayload } = resolveExportProject(
        projects,
        currentProjectId,
        context.payload
      );
      return project
        ? { enabled: true }
        : {
            enabled: false,
            reason: invalidPayload
              ? "Project export requires a non-empty project ID."
              : "No project is available to export."
          };
    },
    execute: async (context) => {
      const { project, invalidPayload } = resolveExportProject(
        projects,
        currentProjectId,
        context.payload
      );
      if (!project) {
        return createUnavailableRuntimeCommandResult(
          invalidPayload
            ? "Project export requires a non-empty project ID."
            : "No project is available to export."
        );
      }

      try {
        const exportedProject = await storage.exportProject(project.projectId);
        downloadProject(exportedProject);
        return createExecutedRuntimeCommandResult("Project exported.");
      } catch (error) {
        return createFailedRuntimeCommandResult(error);
      }
    }
  },
  [RUNTIME_FEATURE_COMMAND_IDS.projectImportJson]: {
    getEnableState: (context) => isProjectImportCommandPayload(context.payload)
      ? { enabled: true }
      : { enabled: false, reason: "Choose a project JSON file." },
    execute: async (context) => {
      if (!isProjectImportCommandPayload(context.payload)) {
        return createUnavailableRuntimeCommandResult("Choose a project JSON file.");
      }

      try {
        const parsed = JSON.parse(await context.payload.file.text()) as unknown;
        const importedProject = await storage.importProject(parsed);
        await refreshProjects();
        onProjectImported?.(importedProject.projectId);
        return createExecutedRuntimeCommandResult("Project imported.");
      } catch (error) {
        return createFailedRuntimeCommandResult(error);
      }
    }
  }
});

declare global {
  interface Window {
    __atrvisuProjectCommands?: ProjectRuntimeCommandE2EBridge;
  }
}
