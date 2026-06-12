import type { PlacedMachine } from "./machine";
import type { AnnotationObject } from "./annotations";

export type LayoutHistorySnapshot = {
  machines: PlacedMachine[];
  annotations: AnnotationObject[];
};

export type LayoutHistoryState = {
  undoStack: LayoutHistorySnapshot[];
  redoStack: LayoutHistorySnapshot[];
  limit: number;
};
