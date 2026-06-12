import type { LayoutHistorySnapshot, LayoutHistoryState } from "../types/history";
import type { AnnotationObject } from "../types/annotations";
import type { PlacedMachine } from "../types/machine";

export const DEFAULT_HISTORY_LIMIT = 50;

export const clonePlacedMachines = (machines: PlacedMachine[]): PlacedMachine[] => {
  if (typeof structuredClone === "function") {
    return structuredClone(machines) as PlacedMachine[];
  }

  return JSON.parse(JSON.stringify(machines)) as PlacedMachine[];
};

export const cloneAnnotations = (annotations: AnnotationObject[]): AnnotationObject[] => {
  if (typeof structuredClone === "function") {
    return structuredClone(annotations) as AnnotationObject[];
  }

  return JSON.parse(JSON.stringify(annotations)) as AnnotationObject[];
};

const toHistorySnapshot = (
  snapshot: PlacedMachine[] | LayoutHistorySnapshot,
  annotations: AnnotationObject[] = []
): LayoutHistorySnapshot =>
  Array.isArray(snapshot)
    ? { machines: clonePlacedMachines(snapshot), annotations: cloneAnnotations(annotations) }
    : {
        machines: clonePlacedMachines(snapshot.machines),
        annotations: cloneAnnotations(snapshot.annotations)
      };

export const createLayoutHistory = (limit = DEFAULT_HISTORY_LIMIT): LayoutHistoryState => ({
  undoStack: [],
  redoStack: [],
  limit
});

export const pushHistorySnapshot = (
  history: LayoutHistoryState,
  snapshot: PlacedMachine[] | LayoutHistorySnapshot,
  annotations: AnnotationObject[] = []
): LayoutHistoryState => ({
  ...history,
  undoStack: [...history.undoStack, toHistorySnapshot(snapshot, annotations)].slice(-history.limit),
  redoStack: []
});

export const undoHistory = (
  history: LayoutHistoryState,
  current: PlacedMachine[] | LayoutHistorySnapshot,
  annotations: AnnotationObject[] = []
): { history: LayoutHistoryState; machines: PlacedMachine[]; annotations: AnnotationObject[] } | null => {
  const previous = history.undoStack[history.undoStack.length - 1];
  if (!previous) {
    return null;
  }

  return {
    history: {
      ...history,
      undoStack: history.undoStack.slice(0, -1),
      redoStack: [...history.redoStack, toHistorySnapshot(current, annotations)].slice(-history.limit)
    },
    machines: clonePlacedMachines(previous.machines),
    annotations: cloneAnnotations(previous.annotations)
  };
};

export const redoHistory = (
  history: LayoutHistoryState,
  current: PlacedMachine[] | LayoutHistorySnapshot,
  annotations: AnnotationObject[] = []
): { history: LayoutHistoryState; machines: PlacedMachine[]; annotations: AnnotationObject[] } | null => {
  const next = history.redoStack[history.redoStack.length - 1];
  if (!next) {
    return null;
  }

  return {
    history: {
      ...history,
      undoStack: [...history.undoStack, toHistorySnapshot(current, annotations)].slice(-history.limit),
      redoStack: history.redoStack.slice(0, -1)
    },
    machines: clonePlacedMachines(next.machines),
    annotations: cloneAnnotations(next.annotations)
  };
};
