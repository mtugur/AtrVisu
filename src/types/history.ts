import type { PlacedMachine } from "./machine";

export type LayoutHistoryState = {
  undoStack: PlacedMachine[][];
  redoStack: PlacedMachine[][];
  limit: number;
};
