import type { AtrVisuLayout } from "./machine";

export type LayoutSnapshot = AtrVisuLayout & {
  projectAppVersion?: string;
};

export type ProjectMetadata = {
  projectName: string;
  customerName: string;
  customerLocation?: string;
  description?: string;
};

export type AtrVisuRevision = {
  revisionId: string;
  revisionCode: string;
  revisionName?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  layoutSnapshot: LayoutSnapshot;
};

export type AtrVisuProjectLayout = {
  layoutId: string;
  layoutName: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  revisions: AtrVisuRevision[];
  activeRevisionId: string;
};

export type AtrVisuProject = ProjectMetadata & {
  projectId: string;
  createdAt: string;
  updatedAt: string;
  layouts: AtrVisuProjectLayout[];
  activeLayoutId: string;
};
