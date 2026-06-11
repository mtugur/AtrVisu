import type { LayoutHistoryState } from "../types/history";
import type { PlacedMachine } from "../types/machine";

export const DEFAULT_HISTORY_LIMIT = 50;

export const clonePlacedMachines = (machines: PlacedMachine[]): PlacedMachine[] => {
  if (typeof structuredClone === "function") {
    return structuredClone(machines) as PlacedMachine[];
  }

  return JSON.parse(JSON.stringify(machines)) as PlacedMachine[];
};

export const createLayoutHistory = (limit = DEFAULT_HISTORY_LIMIT): LayoutHistoryState => ({
  undoStack: [],
  redoStack: [],
  limit
});

export const pushHistorySnapshot = (
  history: LayoutHistoryState,
  snapshot: PlacedMachine[]
): LayoutHistoryState => ({
  ...history,
  undoStack: [...history.undoStack, clonePlacedMachines(snapshot)].slice(-history.limit),
  redoStack: []
});

export const undoHistory = (
  history: LayoutHistoryState,
  current: PlacedMachine[]
): { history: LayoutHistoryState; machines: PlacedMachine[] } | null => {
  const previous = history.undoStack[history.undoStack.length - 1];
  if (!previous) {
    return null;
  }

  return {
    history: {
      ...history,
      undoStack: history.undoStack.slice(0, -1),
      redoStack: [...history.redoStack, clonePlacedMachines(current)].slice(-history.limit)
    },
    machines: clonePlacedMachines(previous)
  };
};

export const redoHistory = (
  history: LayoutHistoryState,
  current: PlacedMachine[]
): { history: LayoutHistoryState; machines: PlacedMachine[] } | null => {
  const next = history.redoStack[history.redoStack.length - 1];
  if (!next) {
    return null;
  }

  return {
    history: {
      ...history,
      undoStack: [...history.undoStack, clonePlacedMachines(current)].slice(-history.limit),
      redoStack: history.redoStack.slice(0, -1)
    },
    machines: clonePlacedMachines(next)
  };
};
