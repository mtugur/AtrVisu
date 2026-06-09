import type { AtrVisuLayout } from "../types/machine";
import type { AtrVisuProject, AtrVisuProjectLayout, AtrVisuRevision, LayoutSnapshot, ProjectMetadata } from "../types/project";
import { ATRVISU_UNIT_SYSTEM } from "./machineDimensions";
import { openAtrVisuDatabase } from "./storage/indexedDb";

export const PROJECTS_STORAGE_KEY = "atrvisu.projects.v1";
export const PROJECTS_INDEXEDDB_MIGRATION_KEY = "atrvisu.projects.indexeddb.migrated.v1";

const EMPTY_LAYOUT_SNAPSHOT: LayoutSnapshot = {
  appName: "AtrVisu",
  version: 1,
  projectAppVersion: "0.1.0",
  unitSystem: ATRVISU_UNIT_SYSTEM,
  exportedAt: new Date(0).toISOString(),
  objects: []
};

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === "object" && value !== null && !Array.isArray(value);
};

const isNonEmptyString = (value: unknown): value is string => {
  return typeof value === "string" && value.trim().length > 0;
};

const nowIso = () => new Date().toISOString();

export const createProjectId = (prefix: string) => {
  return `${prefix}-${Date.now()}-${Math.round(Math.random() * 100000)}`;
};

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

const normalizeSnapshot = (value: unknown): LayoutSnapshot => {
  if (!isRecord(value) || value.appName !== "AtrVisu" || value.version !== 1 || !Array.isArray(value.objects)) {
    return { ...EMPTY_LAYOUT_SNAPSHOT, exportedAt: nowIso() };
  }

  return {
    ...(value as AtrVisuLayout),
    projectAppVersion: isNonEmptyString(value.projectAppVersion) ? value.projectAppVersion : "0.1.0",
    unitSystem: (value as AtrVisuLayout).unitSystem ?? ATRVISU_UNIT_SYSTEM,
    objects: (value as AtrVisuLayout).objects
  };
};

const normalizeRevision = (value: unknown, index: number): AtrVisuRevision => {
  const timestamp = nowIso();
  if (!isRecord(value)) {
    return {
      revisionId: createProjectId("revision"),
      revisionCode: `R${String(index).padStart(2, "0")}`,
      createdAt: timestamp,
      updatedAt: timestamp,
      layoutSnapshot: { ...EMPTY_LAYOUT_SNAPSHOT, exportedAt: timestamp }
    };
  }

  return {
    revisionId: isNonEmptyString(value.revisionId) ? value.revisionId : createProjectId("revision"),
    revisionCode: isNonEmptyString(value.revisionCode) ? value.revisionCode : `R${String(index).padStart(2, "0")}`,
    revisionName: isNonEmptyString(value.revisionName) ? value.revisionName : undefined,
    notes: isNonEmptyString(value.notes) ? value.notes : undefined,
    createdAt: isNonEmptyString(value.createdAt) ? value.createdAt : timestamp,
    updatedAt: isNonEmptyString(value.updatedAt) ? value.updatedAt : timestamp,
    layoutSnapshot: normalizeSnapshot(value.layoutSnapshot)
  };
};

const normalizeLayout = (value: unknown, index: number): AtrVisuProjectLayout => {
  const timestamp = nowIso();
  const fallbackRevision = normalizeRevision(undefined, 0);
  if (!isRecord(value)) {
    return {
      layoutId: createProjectId("layout"),
      layoutName: `Layout-${index + 1}`,
      createdAt: timestamp,
      updatedAt: timestamp,
      revisions: [fallbackRevision],
      activeRevisionId: fallbackRevision.revisionId
    };
  }

  const revisions = Array.isArray(value.revisions)
    ? value.revisions.map(normalizeRevision)
    : [fallbackRevision];
  const safeRevisions = revisions.length > 0 ? revisions : [fallbackRevision];
  const activeRevisionId = isNonEmptyString(value.activeRevisionId) &&
    safeRevisions.some((revision) => revision.revisionId === value.activeRevisionId)
    ? value.activeRevisionId
    : safeRevisions[0].revisionId;

  return {
    layoutId: isNonEmptyString(value.layoutId) ? value.layoutId : createProjectId("layout"),
    layoutName: isNonEmptyString(value.layoutName) ? value.layoutName : `Layout-${index + 1}`,
    description: isNonEmptyString(value.description) ? value.description : undefined,
    createdAt: isNonEmptyString(value.createdAt) ? value.createdAt : timestamp,
    updatedAt: isNonEmptyString(value.updatedAt) ? value.updatedAt : timestamp,
    revisions: safeRevisions.sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    activeRevisionId
  };
};

export const normalizeProject = (value: unknown): AtrVisuProject | null => {
  const timestamp = nowIso();
  if (!isRecord(value) || !isNonEmptyString(value.projectName) || !isNonEmptyString(value.customerName)) {
    return null;
  }

  const layouts = Array.isArray(value.layouts) ? value.layouts.map(normalizeLayout) : [normalizeLayout(undefined, 0)];
  const safeLayouts = layouts.length > 0 ? layouts : [normalizeLayout(undefined, 0)];
  const activeLayoutId = isNonEmptyString(value.activeLayoutId) &&
    safeLayouts.some((layout) => layout.layoutId === value.activeLayoutId)
    ? value.activeLayoutId
    : safeLayouts[0].layoutId;

  return {
    projectId: isNonEmptyString(value.projectId) ? value.projectId : createProjectId("project"),
    projectName: value.projectName.trim(),
    customerName: value.customerName.trim(),
    customerLocation: isNonEmptyString(value.customerLocation) ? value.customerLocation.trim() : undefined,
    description: isNonEmptyString(value.description) ? value.description.trim() : undefined,
    createdAt: isNonEmptyString(value.createdAt) ? value.createdAt : timestamp,
    updatedAt: isNonEmptyString(value.updatedAt) ? value.updatedAt : timestamp,
    layouts: safeLayouts.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
    activeLayoutId
  };
};

const sortProjects = (projects: AtrVisuProject[]) => projects.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

export const listProjects = async () => {
  const database = await openAtrVisuDatabase();
  const records = await database.getAll("projects");
  const projects = records.flatMap((record) => {
    const project = normalizeProject(record);
    if (!project) {
      console.warn("AtrVisu skipped a corrupted IndexedDB project record.", record);
      return [];
    }
    return [project];
  });
  return sortProjects(projects);
};

export const getProject = async (projectId: string) => {
  const database = await openAtrVisuDatabase();
  const record = await database.get("projects", projectId);
  return record ? normalizeProject(record) : null;
};

export const saveProject = async (project: AtrVisuProject) => {
  const normalized = normalizeProject(project);
  if (!normalized) {
    throw new Error("Project is missing required metadata.");
  }
  const database = await openAtrVisuDatabase();
  await database.put("projects", normalized);
  return normalized;
};

export const deleteProject = async (projectId: string) => {
  const database = await openAtrVisuDatabase();
  await database.delete("projects", projectId);
};

export const nextRevisionCode = (layout: AtrVisuProjectLayout) => {
  const maxRevisionNumber = layout.revisions.reduce((max, revision) => {
    const match = /^R(\d+)$/i.exec(revision.revisionCode.trim());
    return match ? Math.max(max, Number(match[1])) : max;
  }, -1);
  return `R${String(maxRevisionNumber + 1).padStart(2, "0")}`;
};

export const createRevisionObject = (
  snapshot: AtrVisuLayout,
  revisionCode: string,
  notes = "",
  revisionName = "",
  timestamp = nowIso()
): AtrVisuRevision => ({
  revisionId: createProjectId("revision"),
  revisionCode,
  revisionName: revisionName.trim() || undefined,
  notes: notes.trim() || undefined,
  createdAt: timestamp,
  updatedAt: timestamp,
  layoutSnapshot: {
    ...normalizeSnapshot(snapshot),
    exportedAt: snapshot.exportedAt || timestamp
  }
});

export const createProject = async (
  metadata: ProjectMetadata,
  snapshot: AtrVisuLayout = { ...EMPTY_LAYOUT_SNAPSHOT, exportedAt: nowIso() },
  timestamp = nowIso()
) => {
  if (!metadata.projectName.trim() || !metadata.customerName.trim()) {
    throw new Error("Project name and customer name are required.");
  }
  const revision = createRevisionObject(snapshot, "R00", "Initial revision", "", timestamp);
  const layout: AtrVisuProjectLayout = {
    layoutId: createProjectId("layout"),
    layoutName: "Layout-1",
    createdAt: timestamp,
    updatedAt: timestamp,
    revisions: [revision],
    activeRevisionId: revision.revisionId
  };
  const project: AtrVisuProject = {
    projectId: createProjectId("project"),
    projectName: metadata.projectName.trim(),
    customerName: metadata.customerName.trim(),
    customerLocation: metadata.customerLocation?.trim() || undefined,
    description: metadata.description?.trim() || undefined,
    createdAt: timestamp,
    updatedAt: timestamp,
    layouts: [layout],
    activeLayoutId: layout.layoutId
  };
  return saveProject(project);
};

export const updateProjectMetadata = async (projectId: string, metadata: ProjectMetadata) => {
  const project = await getProject(projectId);
  if (!project) {
    throw new Error("Project not found.");
  }
  return saveProject({
    ...project,
    ...metadata,
    projectName: metadata.projectName.trim(),
    customerName: metadata.customerName.trim(),
    customerLocation: metadata.customerLocation?.trim() || undefined,
    description: metadata.description?.trim() || undefined,
    updatedAt: nowIso()
  });
};

const remapProjectIds = (project: AtrVisuProject, projectName = `${project.projectName} Copy`): AtrVisuProject => {
  const timestamp = nowIso();
  const layouts = project.layouts.map((layout) => {
    const revisions = layout.revisions.map((revision) => ({
      ...clone(revision),
      revisionId: createProjectId("revision"),
      createdAt: timestamp,
      updatedAt: timestamp
    }));
    return {
      ...clone(layout),
      layoutId: createProjectId("layout"),
      createdAt: timestamp,
      updatedAt: timestamp,
      revisions,
      activeRevisionId: revisions[0]?.revisionId ?? ""
    };
  });
  return {
    ...clone(project),
    projectId: createProjectId("project"),
    projectName,
    createdAt: timestamp,
    updatedAt: timestamp,
    layouts,
    activeLayoutId: layouts[0]?.layoutId ?? ""
  };
};

const remapImportedProjectId = (project: AtrVisuProject, projectName = `${project.projectName} Imported`): AtrVisuProject => {
  const timestamp = nowIso();
  return {
    ...clone(project),
    projectId: createProjectId("project"),
    projectName,
    createdAt: timestamp,
    updatedAt: timestamp
  };
};

export const duplicateProject = async (projectId: string) => {
  const project = await getProject(projectId);
  if (!project) {
    throw new Error("Project not found.");
  }
  return saveProject(remapProjectIds(project));
};

export const createLayout = async (projectId: string, layoutName = "New Layout", snapshot?: AtrVisuLayout) => {
  const project = await getProject(projectId);
  if (!project) {
    throw new Error("Project not found.");
  }
  const timestamp = nowIso();
  const revision = createRevisionObject(snapshot ?? { ...EMPTY_LAYOUT_SNAPSHOT, exportedAt: timestamp }, "R00", "Initial revision", "", timestamp);
  const layout: AtrVisuProjectLayout = {
    layoutId: createProjectId("layout"),
    layoutName: layoutName.trim() || "New Layout",
    createdAt: timestamp,
    updatedAt: timestamp,
    revisions: [revision],
    activeRevisionId: revision.revisionId
  };
  return saveProject({
    ...project,
    layouts: [layout, ...project.layouts],
    activeLayoutId: layout.layoutId,
    updatedAt: timestamp
  });
};

export const renameLayout = async (projectId: string, layoutId: string, layoutName: string, description = "") => {
  const project = await getProject(projectId);
  if (!project) {
    throw new Error("Project not found.");
  }
  const timestamp = nowIso();
  return saveProject({
    ...project,
    updatedAt: timestamp,
    layouts: project.layouts.map((layout) =>
      layout.layoutId === layoutId
        ? { ...layout, layoutName: layoutName.trim() || layout.layoutName, description: description.trim() || undefined, updatedAt: timestamp }
        : layout
    )
  });
};

export const deleteLayout = async (projectId: string, layoutId: string) => {
  const project = await getProject(projectId);
  if (!project) {
    throw new Error("Project not found.");
  }
  const remainingLayouts = project.layouts.filter((layout) => layout.layoutId !== layoutId);
  if (remainingLayouts.length === 0) {
    throw new Error("Project must keep at least one layout.");
  }
  const timestamp = nowIso();
  return saveProject({
    ...project,
    layouts: remainingLayouts,
    activeLayoutId: project.activeLayoutId === layoutId ? remainingLayouts[0].layoutId : project.activeLayoutId,
    updatedAt: timestamp
  });
};

export const createRevision = async (
  projectId: string,
  layoutId: string,
  snapshot: AtrVisuLayout,
  revisionCode?: string,
  notes = "",
  revisionName = ""
) => {
  const project = await getProject(projectId);
  if (!project) {
    throw new Error("Project not found.");
  }
  const layout = project.layouts.find((item) => item.layoutId === layoutId);
  if (!layout) {
    throw new Error("Layout not found.");
  }
  const timestamp = nowIso();
  const revision = createRevisionObject(snapshot, revisionCode?.trim() || nextRevisionCode(layout), notes, revisionName, timestamp);
  return saveProject({
    ...project,
    activeLayoutId: layoutId,
    updatedAt: timestamp,
    layouts: project.layouts.map((item) =>
      item.layoutId === layoutId
        ? {
            ...item,
            updatedAt: timestamp,
            revisions: [revision, ...item.revisions],
            activeRevisionId: revision.revisionId
          }
        : item
    )
  });
};

export const duplicateRevision = async (projectId: string, layoutId: string, revisionId: string) => {
  const project = await getProject(projectId);
  const layout = project?.layouts.find((item) => item.layoutId === layoutId);
  const revision = layout?.revisions.find((item) => item.revisionId === revisionId);
  if (!project || !layout || !revision) {
    throw new Error("Revision not found.");
  }
  return createRevision(projectId, layoutId, revision.layoutSnapshot, nextRevisionCode(layout), revision.notes ?? "", `${revision.revisionName ?? revision.revisionCode} Copy`);
};

export const deleteRevision = async (projectId: string, layoutId: string, revisionId: string) => {
  const project = await getProject(projectId);
  if (!project) {
    throw new Error("Project not found.");
  }
  const layout = project.layouts.find((item) => item.layoutId === layoutId);
  if (!layout) {
    throw new Error("Layout not found.");
  }
  const remainingRevisions = layout.revisions.filter((revision) => revision.revisionId !== revisionId);
  if (remainingRevisions.length === 0) {
    throw new Error("Layout must keep at least one revision.");
  }
  const timestamp = nowIso();
  return saveProject({
    ...project,
    updatedAt: timestamp,
    layouts: project.layouts.map((item) =>
      item.layoutId === layoutId
        ? {
            ...item,
            updatedAt: timestamp,
            revisions: remainingRevisions,
            activeRevisionId: item.activeRevisionId === revisionId ? remainingRevisions[0].revisionId : item.activeRevisionId
          }
        : item
    )
  });
};

export const getActiveRevision = async (projectId: string, layoutId: string) => {
  const project = await getProject(projectId);
  const layout = project?.layouts.find((item) => item.layoutId === layoutId);
  return layout?.revisions.find((revision) => revision.revisionId === layout.activeRevisionId) ?? null;
};

export const setActiveRevision = async (projectId: string, layoutId: string, revisionId: string) => {
  const project = await getProject(projectId);
  if (!project) {
    throw new Error("Project not found.");
  }
  const timestamp = nowIso();
  return saveProject({
    ...project,
    activeLayoutId: layoutId,
    updatedAt: timestamp,
    layouts: project.layouts.map((layout) =>
      layout.layoutId === layoutId && layout.revisions.some((revision) => revision.revisionId === revisionId)
        ? { ...layout, activeRevisionId: revisionId, updatedAt: timestamp }
        : layout
    )
  });
};

export const exportProject = async (projectId: string) => {
  const project = await getProject(projectId);
  if (!project) {
    throw new Error("Project not found.");
  }
  return clone(project);
};

export const importProject = async (data: unknown) => {
  const normalized = normalizeProject(data);
  if (!normalized) {
    throw new Error("Selected file is not an AtrVisu project.");
  }
  const existingIds = new Set((await listProjects()).map((project) => project.projectId));
  return saveProject(existingIds.has(normalized.projectId) ? remapImportedProjectId(normalized) : normalized);
};
