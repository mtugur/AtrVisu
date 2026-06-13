import type { PlacedMachine } from "./machine";
import type { AnnotationObject } from "./annotations";
import type { LayoutViewpoint } from "./viewpoints";

export type LayoutHistorySnapshot = {
  machines: PlacedMachine[];
  annotations: AnnotationObject[];
  viewpoints: LayoutViewpoint[];
};

export type LayoutHistoryState = {
  undoStack: LayoutHistorySnapshot[];
  redoStack: LayoutHistorySnapshot[];
  limit: number;
};
