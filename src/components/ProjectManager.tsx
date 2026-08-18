import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { AtrVisuLayout } from "../types/machine";
import type { AtrVisuProject } from "../types/project";
import type { RuntimeFeatureCommandOperationResult } from "../platform/runtimeCommands/runtimeFeatureCommands";
import type { ProjectExportCommandPayload } from "../platform/runtimeCommands/projectRuntimeCommandAuthority";
import type { ProjectManagerEntryIntent } from "../platform/runtimeCommands/projectManagerEntryIntent";
import { useModalFocus } from "./common/useModalFocus";
import {
  createLayout,
  createProject,
  deleteLayout,
  deleteProject,
  deleteRevision,
  duplicateProject,
  duplicateRevision,
  listProjects,
  renameLayout,
  setActiveRevision,
  updateProjectMetadata
} from "../utils/projectStorage";

type ProjectManagerProps = {
  entryIntent: ProjectManagerEntryIntent | null;
  projects: AtrVisuProject[];
  currentProjectId: string | null;
  currentLayoutId: string | null;
  currentRevisionId: string | null;
  currentSnapshot: AtrVisuLayout;
  hasSceneObjects: boolean;
  isDirty: boolean;
  onClose: () => void;
  onProjectsChanged: (projects: AtrVisuProject[]) => void;
  onCurrentSelectionChange: (projectId: string | null, layoutId: string | null, revisionId: string | null) => void;
  onLoadRevision: (projectId: string, layoutId: string, revisionId: string, snapshot: AtrVisuLayout) => void;
  onSavedRevision: (projectId: string, layoutId: string, revisionId: string) => void;
  onExecuteRuntimeCommand: (
    commandId: "project.save" | "project.exportJson" | "project.importJson",
    payload?: unknown
  ) => Promise<RuntimeFeatureCommandOperationResult>;
  onRequestProjectImport: (
    onResult: (result: RuntimeFeatureCommandOperationResult) => void
  ) => void;
};

const formatDate = (value: string) => {
  try {
    return new Intl.DateTimeFormat(undefined, { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
  } catch {
    return value;
  }
};

export const executeProjectManagerRuntimeOperation = async (
  action: () => void | Promise<void>
): Promise<RuntimeFeatureCommandOperationResult> => {
  try {
    await action();
    return { handled: true, status: "executed" };
  } catch (caught) {
    return {
      handled: false,
      status: "failed",
      reason: caught instanceof Error ? caught.message : "Project action failed."
    };
  }
};

export function ProjectManager({
  entryIntent,
  projects,
  currentProjectId,
  currentLayoutId,
  currentRevisionId,
  currentSnapshot,
  hasSceneObjects,
  isDirty,
  onClose,
  onProjectsChanged,
  onCurrentSelectionChange,
  onLoadRevision,
  onSavedRevision,
  onExecuteRuntimeCommand,
  onRequestProjectImport
}: ProjectManagerProps) {
  const dialogRef = useModalFocus<HTMLElement>(onClose);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const createProjectNameRef = useRef<HTMLInputElement>(null);
  const firstExistingProjectRef = useRef<HTMLButtonElement>(null);
  const emptyOpenRouteRef = useRef<HTMLButtonElement>(null);
  const [selectedProjectId, setSelectedProjectId] = useState(currentProjectId ?? projects[0]?.projectId ?? "");
  const selectedProject = projects.find((project) => project.projectId === selectedProjectId) ?? projects[0] ?? null;
  const [selectedLayoutId, setSelectedLayoutId] = useState(
    currentLayoutId ?? selectedProject?.activeLayoutId ?? selectedProject?.layouts[0]?.layoutId ?? ""
  );
  const selectedLayout = selectedProject?.layouts.find((layout) => layout.layoutId === selectedLayoutId) ??
    selectedProject?.layouts.find((layout) => layout.layoutId === selectedProject.activeLayoutId) ??
    selectedProject?.layouts[0] ??
    null;
  const [selectedRevisionId, setSelectedRevisionId] = useState(currentRevisionId ?? selectedLayout?.activeRevisionId ?? "");
  const selectedRevision = selectedLayout?.revisions.find((revision) => revision.revisionId === selectedRevisionId) ??
    selectedLayout?.revisions.find((revision) => revision.revisionId === selectedLayout.activeRevisionId) ??
    selectedLayout?.revisions[0] ??
    null;
  const [newProjectName, setNewProjectName] = useState("");
  const [newCustomerName, setNewCustomerName] = useState("");
  const [newCustomerLocation, setNewCustomerLocation] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

  const refreshProjects = async () => {
    const nextProjects = await listProjects();
    onProjectsChanged(nextProjects);
    return nextProjects;
  };

  const selectProject = (project?: AtrVisuProject) => {
    if (!project) {
      setSelectedProjectId("");
      setSelectedLayoutId("");
      setSelectedRevisionId("");
      return;
    }
    const layout = project.layouts.find((item) => item.layoutId === project.activeLayoutId) ?? project.layouts[0];
    const revision = layout?.revisions.find((item) => item.revisionId === layout.activeRevisionId) ?? layout?.revisions[0];
    setSelectedProjectId(project.projectId);
    setSelectedLayoutId(layout?.layoutId ?? "");
    setSelectedRevisionId(revision?.revisionId ?? "");
  };

  const runRuntimeAction = async (
    action: () => void | Promise<void>,
    message?: string
  ): Promise<RuntimeFeatureCommandOperationResult> => {
    const result = await executeProjectManagerRuntimeOperation(action);
    if (result.handled) {
      if (message) {
        setStatus(message);
      }
      setError("");
    } else {
      setError(result.reason ?? "Project action failed.");
    }
    return result;
  };

  const runAction = async (action: () => void | Promise<void>, message?: string) => {
    await runRuntimeAction(action, message);
  };

  const applyRuntimeCommandResult = (
    result: RuntimeFeatureCommandOperationResult,
    successMessage: string
  ) => {
    if (result.handled) {
      setStatus(successMessage);
      setError("");
    } else {
      setError(result.reason ?? "Project action failed.");
    }
    return result;
  };

  const executeRuntimeCommand = async (
    commandId: "project.save" | "project.exportJson",
    payload: ProjectExportCommandPayload | undefined,
    successMessage: string
  ) => {
    try {
      const result = await onExecuteRuntimeCommand(commandId, payload);
      return applyRuntimeCommandResult(result, successMessage);
    } catch (caught) {
      return applyRuntimeCommandResult({
        handled: false,
        status: "failed",
        reason: caught instanceof Error ? caught.message : "Project action failed."
      }, successMessage);
    }
  };

  useEffect(() => {
    if (currentProjectId) {
      setSelectedProjectId(currentProjectId);
    }
    if (currentLayoutId) {
      setSelectedLayoutId(currentLayoutId);
    }
    if (currentRevisionId) {
      setSelectedRevisionId(currentRevisionId);
    }
  }, [currentLayoutId, currentProjectId, currentRevisionId]);

  useEffect(() => {
    const focusEntryTarget = () => {
      const target = entryIntent === "create"
        ? createProjectNameRef.current
        : entryIntent === "open"
          ? firstExistingProjectRef.current ?? emptyOpenRouteRef.current
          : closeButtonRef.current;
      target?.focus();
      target?.scrollIntoView?.({ block: "nearest", inline: "nearest" });
    };
    focusEntryTarget();
    const frame = window.requestAnimationFrame(focusEntryTarget);
    return () => window.cancelAnimationFrame(frame);
  }, [entryIntent, projects.length]);

  const createNewProject = () => {
    void runAction(async () => {
      const project = await createProject(
        {
          projectName: newProjectName,
          customerName: newCustomerName,
          customerLocation: newCustomerLocation,
          description: newDescription
        },
        currentSnapshot
      );
      const nextProjects = await refreshProjects();
      selectProject(nextProjects.find((item) => item.projectId === project.projectId) ?? project);
      onCurrentSelectionChange(project.projectId, project.activeLayoutId, project.layouts[0]?.activeRevisionId ?? null);
      onSavedRevision(project.projectId, project.activeLayoutId, project.layouts[0]?.activeRevisionId ?? "");
      setNewProjectName("");
      setNewCustomerName("");
      setNewCustomerLocation("");
      setNewDescription("");
    }, "Project created.");
  };

  const loadSelectedRevision = () => {
    if (!selectedProject || !selectedLayout || !selectedRevision) {
      return;
    }
    if ((hasSceneObjects || isDirty) && !window.confirm("Load this revision and replace the current scene?")) {
      return;
    }

    void runAction(async () => {
      await setActiveRevision(selectedProject.projectId, selectedLayout.layoutId, selectedRevision.revisionId);
      await refreshProjects();
      onLoadRevision(
        selectedProject.projectId,
        selectedLayout.layoutId,
        selectedRevision.revisionId,
        selectedRevision.layoutSnapshot
      );
    }, "Revision loaded.");
  };

  const loadRevision = (project: AtrVisuProject, layoutId: string, revisionId: string, snapshot: AtrVisuLayout) => {
    if ((hasSceneObjects || isDirty) && !window.confirm("Load this revision and replace the current scene?")) {
      return;
    }
    void runAction(async () => {
      await setActiveRevision(project.projectId, layoutId, revisionId);
      await refreshProjects();
      onLoadRevision(project.projectId, layoutId, revisionId, snapshot);
    }, "Revision loaded.");
  };

  const modal = (
    <div className="manager-backdrop" role="presentation">
      <section
        ref={dialogRef}
        className="manager-dialog project-dialog"
        data-entry-intent={entryIntent ?? "neutral"}
        data-testid="project-manager-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Project Manager"
        tabIndex={-1}
      >
        <header className="manager-header">
          <div>
            <span className="panel-kicker">AtrVisu</span>
            <h2>Project Manager</h2>
          </div>
          <div className="manager-context">
            <strong>{selectedProject?.projectName ?? "No project"}</strong>
            <span className={`manager-mode-badge${isDirty ? "" : " is-editable"}`}>{isDirty ? "Unsaved changes" : "Saved"}</span>
          </div>
          <button ref={closeButtonRef} data-testid="close-project-manager" type="button" onClick={onClose}>
            Close
          </button>
        </header>

        <div className="project-manager-layout" data-testid="project-manager-ready">
          <aside className="project-column" aria-label="Projects">
            <div className="manager-column-header">
              <span>Projects</span>
              <strong>{projects.length}</strong>
            </div>
            <div className="project-create-card" data-testid="project-manager-create-workflow">
              <label>
                <span>Project Name</span>
                <input
                  ref={createProjectNameRef}
                  data-testid="new-project-name"
                  value={newProjectName}
                  onChange={(event) => setNewProjectName(event.target.value)}
                />
              </label>
              <label>
                <span>Customer Name</span>
                <input
                  data-testid="new-customer-name"
                  value={newCustomerName}
                  onChange={(event) => setNewCustomerName(event.target.value)}
                />
              </label>
              <label>
                <span>Customer Location</span>
                <input value={newCustomerLocation} onChange={(event) => setNewCustomerLocation(event.target.value)} />
              </label>
              <label>
                <span>Description</span>
                <textarea value={newDescription} onChange={(event) => setNewDescription(event.target.value)} />
              </label>
              <button className="primary-action" data-testid="create-project" type="button" onClick={createNewProject}>
                New Project
              </button>
            </div>
            <div className="project-list" data-testid="project-manager-project-list">
              {projects.map((project) => (
                <button
                  ref={project.projectId === projects[0]?.projectId ? firstExistingProjectRef : undefined}
                  className={project.projectId === selectedProject?.projectId ? "is-selected" : ""}
                  data-testid="project-manager-project-option"
                  key={project.projectId}
                  type="button"
                  onClick={() => selectProject(project)}
                >
                  <strong>{project.projectName}</strong>
                  <span>{project.customerName}</span>
                  <small>{formatDate(project.updatedAt)}</small>
                </button>
              ))}
            </div>
          </aside>

          <section className="project-column" aria-label="Project details" data-testid="project-manager-existing-workflow">
            <div className="manager-column-header">
              <span>Layouts</span>
              <strong>{selectedProject?.layouts.length ?? 0}</strong>
            </div>
            {status ? <p className="manager-status">{status}</p> : null}
            {error ? <p className="manager-validation">{error}</p> : null}
            <div className="project-action-grid">
              <button type="button" onClick={() => {
                onRequestProjectImport((result) => {
                  applyRuntimeCommandResult(result, "Project imported.");
                });
              }}>
                Import Project JSON
              </button>
            </div>
            {selectedProject ? (
              <div className="project-action-grid">
                <button type="button" onClick={() => {
                  const name = window.prompt("Project name", selectedProject.projectName);
                  const customer = window.prompt("Customer name", selectedProject.customerName);
                  if (!name || !customer) {
                    return;
                  }
                  void runAction(async () => {
                    const updated = await updateProjectMetadata(selectedProject.projectId, {
                      projectName: name,
                      customerName: customer,
                      customerLocation: selectedProject.customerLocation,
                      description: selectedProject.description
                    });
                    await refreshProjects();
                    setSelectedProjectId(updated.projectId);
                  }, "Project updated.");
                }}>
                  Edit Project
                </button>
                <button type="button" onClick={() => void runAction(async () => {
                  const duplicated = await duplicateProject(selectedProject.projectId);
                  const nextProjects = await refreshProjects();
                  selectProject(nextProjects.find((project) => project.projectId === duplicated.projectId) ?? duplicated);
                }, "Project duplicated.")}>
                  Duplicate Project
                </button>
                <button className="danger-action" type="button" onClick={() => {
                  if (!window.confirm(`Delete project "${selectedProject.projectName}"?`)) {
                    return;
                  }
                  void runAction(async () => {
                    await deleteProject(selectedProject.projectId);
                    const nextProjects = await refreshProjects();
                    selectProject(nextProjects[0]);
                    if (currentProjectId === selectedProject.projectId) {
                      onCurrentSelectionChange(null, null, null);
                    }
                  }, "Project deleted.");
                }}>
                  Delete Project
                </button>
                <button type="button" onClick={() => void runAction(async () => {
                  const name = window.prompt("Layout name", `Layout-${selectedProject.layouts.length + 1}`) ?? "";
                  const updated = await createLayout(selectedProject.projectId, name, currentSnapshot);
                  const layout = updated.layouts[0];
                  await refreshProjects();
                  setSelectedLayoutId(layout.layoutId);
                  setSelectedRevisionId(layout.activeRevisionId);
                }, "Layout created.")}>
                  New Layout
                </button>
                <button
                  type="button"
                  onClick={() => {
                    void executeRuntimeCommand(
                      "project.exportJson",
                      { projectId: selectedProject.projectId },
                      "Project exported."
                    );
                  }}
                >
                  Export Project JSON
                </button>
              </div>
            ) : (
              <div className="empty-selection" data-testid="project-manager-empty-state">
                <p>No existing projects are available. Create or import a project to begin.</p>
                <button
                  ref={emptyOpenRouteRef}
                  type="button"
                  onClick={() => createProjectNameRef.current?.focus()}
                >
                  Start a New Project
                </button>
              </div>
            )}

            <div className="project-list">
              {selectedProject?.layouts.map((layout) => (
                <button
                  className={layout.layoutId === selectedLayout?.layoutId ? "is-selected" : ""}
                  key={layout.layoutId}
                  type="button"
                  onClick={() => {
                    setSelectedLayoutId(layout.layoutId);
                    setSelectedRevisionId(layout.activeRevisionId);
                  }}
                >
                  <strong>{layout.layoutName}</strong>
                  <span>{layout.revisions.length} revision{layout.revisions.length === 1 ? "" : "s"}</span>
                  <small>{formatDate(layout.updatedAt)}</small>
                </button>
              ))}
            </div>
          </section>

          <section className="project-column" aria-label="Revisions">
            <div className="manager-column-header">
              <span>Revisions</span>
              <strong>{selectedLayout?.revisions.length ?? 0}</strong>
            </div>
            {selectedLayout ? (
              <div className="project-action-grid">
                <button
                  className="primary-action"
                  data-testid="save-scene-revision"
                  type="button"
                  onClick={() => {
                    void executeRuntimeCommand(
                      "project.save",
                      undefined,
                      "Current scene saved as a new revision."
                    );
                  }}
                >
                  Save Current Scene as New Revision
                </button>
                <button type="button" onClick={loadSelectedRevision} disabled={!selectedRevision}>
                  Load Revision
                </button>
                <button type="button" onClick={() => {
                  const name = window.prompt("Layout name", selectedLayout.layoutName);
                  if (!name) {
                    return;
                  }
                  void runAction(async () => {
                    await renameLayout(selectedProject?.projectId ?? "", selectedLayout.layoutId, name);
                    await refreshProjects();
                  }, "Layout renamed.");
                }}>
                  Rename Layout
                </button>
                <button className="danger-action" type="button" onClick={() => {
                  if (!selectedProject || !window.confirm(`Delete layout "${selectedLayout.layoutName}"?`)) {
                    return;
                  }
                  void runAction(async () => {
                    const updated = await deleteLayout(selectedProject.projectId, selectedLayout.layoutId);
                    await refreshProjects();
                    setSelectedLayoutId(updated.activeLayoutId);
                  }, "Layout deleted.");
                }}>
                  Delete Layout
                </button>
              </div>
            ) : null}
            <div className="project-list">
              {selectedLayout?.revisions.map((revision) => (
                <article
                  className={`revision-card${revision.revisionId === selectedRevision?.revisionId ? " is-selected" : ""}`}
                  key={revision.revisionId}
                >
                  <button type="button" onClick={() => setSelectedRevisionId(revision.revisionId)}>
                    <strong>{revision.revisionCode}</strong>
                    <span>{revision.revisionName ?? `${revision.layoutSnapshot.objects.length} objects`}</span>
                    <small>{formatDate(revision.updatedAt)}</small>
                  </button>
                  <div className="revision-actions">
                    <button type="button" onClick={() => {
                      if (selectedProject && selectedLayout) {
                        loadRevision(selectedProject, selectedLayout.layoutId, revision.revisionId, revision.layoutSnapshot);
                      }
                    }}>
                      Load
                    </button>
                    <button type="button" onClick={() => selectedProject && selectedLayout && void runAction(async () => {
                      await duplicateRevision(selectedProject.projectId, selectedLayout.layoutId, revision.revisionId);
                      await refreshProjects();
                    }, "Revision duplicated.")}>
                      Duplicate
                    </button>
                    <button className="danger-action" type="button" onClick={() => {
                      if (!selectedProject || !selectedLayout || !window.confirm(`Delete revision "${revision.revisionCode}"?`)) {
                        return;
                      }
                      void runAction(async () => {
                        const updated = await deleteRevision(selectedProject.projectId, selectedLayout.layoutId, revision.revisionId);
                        const layout = updated.layouts.find((item) => item.layoutId === selectedLayout.layoutId);
                        await refreshProjects();
                        setSelectedRevisionId(layout?.activeRevisionId ?? "");
                      }, "Revision deleted.");
                    }}>
                      Delete
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </section>
        </div>
      </section>
    </div>
  );

  return createPortal(modal, document.body);
}
