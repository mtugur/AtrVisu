import { useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { AtrVisuLayout } from "../types/machine";
import type { AtrVisuProject } from "../types/project";
import {
  createLayout,
  createProject,
  createRevision,
  deleteLayout,
  deleteProject,
  deleteRevision,
  duplicateProject,
  duplicateRevision,
  exportProject,
  importProject,
  listProjects,
  nextRevisionCode,
  renameLayout,
  setActiveRevision,
  updateProjectMetadata
} from "../utils/projectStorage";

type ProjectManagerProps = {
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
};

const formatDate = (value: string) => {
  try {
    return new Intl.DateTimeFormat(undefined, { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
  } catch {
    return value;
  }
};

export function ProjectManager({
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
  onSavedRevision
}: ProjectManagerProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
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

  const nextCode = useMemo(() => (selectedLayout ? nextRevisionCode(selectedLayout) : "R00"), [selectedLayout]);

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

  const runAction = async (action: () => void | Promise<void>, message?: string) => {
    try {
      await action();
      if (message) {
        setStatus(message);
      }
      setError("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Project action failed.");
    }
  };

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

  const saveCurrentRevision = () => {
    if (!selectedProject || !selectedLayout) {
      setError("Select a project and layout first.");
      return;
    }

    const revisionCode = window.prompt("Revision code", nextCode)?.trim() || nextCode;
    const notes = window.prompt("Revision notes", "") ?? "";

    void runAction(async () => {
      const updated = await createRevision(selectedProject.projectId, selectedLayout.layoutId, currentSnapshot, revisionCode, notes);
      const layout = updated.layouts.find((item) => item.layoutId === selectedLayout.layoutId);
      const revision = layout?.revisions[0];
      await refreshProjects();
      setSelectedProjectId(updated.projectId);
      setSelectedLayoutId(layout?.layoutId ?? "");
      setSelectedRevisionId(revision?.revisionId ?? "");
      if (layout && revision) {
        onSavedRevision(updated.projectId, layout.layoutId, revision.revisionId);
      }
    }, "Current scene saved as a new revision.");
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

  const exportSelectedProject = () => {
    if (!selectedProject) {
      return;
    }
    void runAction(async () => {
      const project = await exportProject(selectedProject.projectId);
      const blob = new Blob([JSON.stringify(project, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${project.projectName.replace(/[^a-z0-9]+/gi, "-").replace(/^-+|-+$/g, "") || "atrvisu-project"}.project.json`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    }, "Project exported.");
  };

  const importProjectFile = async (file?: File) => {
    if (!file) {
      return;
    }
    try {
      const parsed = JSON.parse(await file.text()) as unknown;
      const imported = await importProject(parsed);
      const nextProjects = await refreshProjects();
      selectProject(nextProjects.find((project) => project.projectId === imported.projectId) ?? imported);
      setStatus("Project imported.");
      setError("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not import project JSON.");
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const modal = (
    <div className="manager-backdrop" role="presentation">
      <section className="manager-dialog project-dialog" data-testid="project-manager-modal" role="dialog" aria-modal="true" aria-label="Project Manager">
        <header className="manager-header">
          <div>
            <span className="panel-kicker">AtrVisu</span>
            <h2>Project Manager</h2>
          </div>
          <div className="manager-context">
            <strong>{selectedProject?.projectName ?? "No project"}</strong>
            <span className={`manager-mode-badge${isDirty ? "" : " is-editable"}`}>{isDirty ? "Unsaved changes" : "Saved"}</span>
          </div>
          <button data-testid="close-project-manager" type="button" onClick={onClose}>
            Close
          </button>
        </header>

        <div className="project-manager-layout" data-testid="project-manager-ready">
          <aside className="project-column" aria-label="Projects">
            <div className="manager-column-header">
              <span>Projects</span>
              <strong>{projects.length}</strong>
            </div>
            <div className="project-create-card">
              <label>
                <span>Project Name</span>
                <input
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
                  className={project.projectId === selectedProject?.projectId ? "is-selected" : ""}
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

          <section className="project-column" aria-label="Project details">
            <div className="manager-column-header">
              <span>Layouts</span>
              <strong>{selectedProject?.layouts.length ?? 0}</strong>
            </div>
            {status ? <p className="manager-status">{status}</p> : null}
            {error ? <p className="manager-validation">{error}</p> : null}
            <div className="project-action-grid">
              <button type="button" onClick={() => fileInputRef.current?.click()}>
                Import Project JSON
              </button>
              <input
                ref={fileInputRef}
                className="file-input"
                data-testid="import-project-file"
                type="file"
                accept="application/json,.json"
                onChange={(event) => void importProjectFile(event.target.files?.[0])}
              />
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
                <button type="button" onClick={exportSelectedProject}>
                  Export Project JSON
                </button>
              </div>
            ) : (
              <p className="empty-selection" data-testid="project-manager-empty-state">
                Create or import a project to begin.
              </p>
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
                <button className="primary-action" data-testid="save-scene-revision" type="button" onClick={saveCurrentRevision}>
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
