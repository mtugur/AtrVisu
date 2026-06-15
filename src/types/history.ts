import type { PlacedMachine } from "./machine";
import type { AnnotationObject } from "./annotations";
import type { ObjectGroup } from "./groups";
import type { LayoutLayer } from "./layers";
import type { LayoutViewpoint } from "./viewpoints";

export type LayoutHistorySnapshot = {
  machines: PlacedMachine[];
  annotations: AnnotationObject[];
  layers: LayoutLayer[];
  groups: ObjectGroup[];
  viewpoints: LayoutViewpoint[];
};

export type LayoutHistoryState = {
  undoStack: LayoutHistorySnapshot[];
  redoStack: LayoutHistorySnapshot[];
  limit: number;
};
