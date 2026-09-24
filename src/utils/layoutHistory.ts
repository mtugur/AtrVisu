import type { LayoutHistorySnapshot, LayoutHistoryState } from "../types/history";
import type { AnnotationObject } from "../types/annotations";
import type { CivilReferenceItem } from "../types/civil";
import type { ObjectGroup } from "../types/groups";
import type { LayoutLayer } from "../types/layers";
import type { PlacedMachine } from "../types/machine";
import type { LayoutViewpoint } from "../types/viewpoints";
import type { LayoutLevel } from "../types/levels";
import { GROUND_LEVEL_ID, normalizeLevels } from "./levels";

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

export const cloneCivilReferences = (civilReferences: CivilReferenceItem[]): CivilReferenceItem[] => {
  if (typeof structuredClone === "function") {
    return structuredClone(civilReferences) as CivilReferenceItem[];
  }

  return JSON.parse(JSON.stringify(civilReferences)) as CivilReferenceItem[];
};

export const cloneViewpoints = (viewpoints: LayoutViewpoint[]): LayoutViewpoint[] => {
  if (typeof structuredClone === "function") {
    return structuredClone(viewpoints) as LayoutViewpoint[];
  }

  return JSON.parse(JSON.stringify(viewpoints)) as LayoutViewpoint[];
};

export const cloneLayers = (layers: LayoutLayer[]): LayoutLayer[] => {
  if (typeof structuredClone === "function") {
    return structuredClone(layers) as LayoutLayer[];
  }

  return JSON.parse(JSON.stringify(layers)) as LayoutLayer[];
};

export const cloneGroups = (groups: ObjectGroup[]): ObjectGroup[] => {
  if (typeof structuredClone === "function") {
    return structuredClone(groups) as ObjectGroup[];
  }

  return JSON.parse(JSON.stringify(groups)) as ObjectGroup[];
};

export const cloneLevels = (levels: LayoutLevel[]): LayoutLevel[] => {
  if (typeof structuredClone === "function") return structuredClone(levels) as LayoutLevel[];
  return JSON.parse(JSON.stringify(levels)) as LayoutLevel[];
};

const toHistorySnapshot = (
  snapshot: PlacedMachine[] | LayoutHistorySnapshot,
  annotations: AnnotationObject[] = [],
  civilReferences: CivilReferenceItem[] = [],
  viewpoints: LayoutViewpoint[] = [],
  layers: LayoutLayer[] = [],
  groups: ObjectGroup[] = [],
  levels: LayoutLevel[] = [],
  activeLevelId = GROUND_LEVEL_ID
): LayoutHistorySnapshot =>
  Array.isArray(snapshot)
    ? {
        machines: clonePlacedMachines(snapshot),
        annotations: cloneAnnotations(annotations),
        civilReferences: cloneCivilReferences(civilReferences),
        layers: cloneLayers(layers),
        groups: cloneGroups(groups),
        viewpoints: cloneViewpoints(viewpoints),
        levels: cloneLevels(normalizeLevels(levels)),
        activeLevelId
      }
    : {
        machines: clonePlacedMachines(snapshot.machines),
        annotations: cloneAnnotations(snapshot.annotations),
        civilReferences: cloneCivilReferences(snapshot.civilReferences ?? []),
        layers: cloneLayers(snapshot.layers ?? []),
        groups: cloneGroups(snapshot.groups ?? []),
        viewpoints: cloneViewpoints(snapshot.viewpoints ?? []),
        levels: cloneLevels(normalizeLevels(snapshot.levels)),
        activeLevelId: snapshot.activeLevelId ?? GROUND_LEVEL_ID
      };

export const createLayoutHistory = (limit = DEFAULT_HISTORY_LIMIT): LayoutHistoryState => ({
  undoStack: [],
  redoStack: [],
  limit
});

export const pushHistorySnapshot = (
  history: LayoutHistoryState,
  snapshot: PlacedMachine[] | LayoutHistorySnapshot,
  annotations: AnnotationObject[] = [],
  civilReferences: CivilReferenceItem[] = [],
  viewpoints: LayoutViewpoint[] = [],
  layers: LayoutLayer[] = [],
  groups: ObjectGroup[] = [],
  levels: LayoutLevel[] = [],
  activeLevelId = GROUND_LEVEL_ID
): LayoutHistoryState => ({
  ...history,
  undoStack: [...history.undoStack, toHistorySnapshot(snapshot, annotations, civilReferences, viewpoints, layers, groups, levels, activeLevelId)].slice(-history.limit),
  redoStack: []
});

export const undoHistory = (
  history: LayoutHistoryState,
  current: PlacedMachine[] | LayoutHistorySnapshot,
  annotations: AnnotationObject[] = [],
  civilReferences: CivilReferenceItem[] = [],
  viewpoints: LayoutViewpoint[] = [],
  layers: LayoutLayer[] = [],
  groups: ObjectGroup[] = [],
  levels: LayoutLevel[] = [],
  activeLevelId = GROUND_LEVEL_ID
): {
  history: LayoutHistoryState;
  machines: PlacedMachine[];
  annotations: AnnotationObject[];
  civilReferences: CivilReferenceItem[];
  layers: LayoutLayer[];
  groups: ObjectGroup[];
  viewpoints: LayoutViewpoint[];
  levels: LayoutLevel[];
  activeLevelId: string;
} | null => {
  const previous = history.undoStack[history.undoStack.length - 1];
  if (!previous) {
    return null;
  }

  return {
    history: {
      ...history,
      undoStack: history.undoStack.slice(0, -1),
      redoStack: [...history.redoStack, toHistorySnapshot(current, annotations, civilReferences, viewpoints, layers, groups, levels, activeLevelId)].slice(-history.limit)
    },
    machines: clonePlacedMachines(previous.machines),
    annotations: cloneAnnotations(previous.annotations),
    civilReferences: cloneCivilReferences(previous.civilReferences ?? []),
    layers: cloneLayers(previous.layers ?? []),
    groups: cloneGroups(previous.groups ?? []),
    viewpoints: cloneViewpoints(previous.viewpoints ?? []),
    levels: cloneLevels(normalizeLevels(previous.levels)),
    activeLevelId: previous.activeLevelId ?? GROUND_LEVEL_ID
  };
};

export const redoHistory = (
  history: LayoutHistoryState,
  current: PlacedMachine[] | LayoutHistorySnapshot,
  annotations: AnnotationObject[] = [],
  civilReferences: CivilReferenceItem[] = [],
  viewpoints: LayoutViewpoint[] = [],
  layers: LayoutLayer[] = [],
  groups: ObjectGroup[] = [],
  levels: LayoutLevel[] = [],
  activeLevelId = GROUND_LEVEL_ID
): {
  history: LayoutHistoryState;
  machines: PlacedMachine[];
  annotations: AnnotationObject[];
  civilReferences: CivilReferenceItem[];
  layers: LayoutLayer[];
  groups: ObjectGroup[];
  viewpoints: LayoutViewpoint[];
  levels: LayoutLevel[];
  activeLevelId: string;
} | null => {
  const next = history.redoStack[history.redoStack.length - 1];
  if (!next) {
    return null;
  }

  return {
    history: {
      ...history,
      undoStack: [...history.undoStack, toHistorySnapshot(current, annotations, civilReferences, viewpoints, layers, groups, levels, activeLevelId)].slice(-history.limit),
      redoStack: history.redoStack.slice(0, -1)
    },
    machines: clonePlacedMachines(next.machines),
    annotations: cloneAnnotations(next.annotations),
    civilReferences: cloneCivilReferences(next.civilReferences ?? []),
    layers: cloneLayers(next.layers ?? []),
    groups: cloneGroups(next.groups ?? []),
    viewpoints: cloneViewpoints(next.viewpoints ?? []),
    levels: cloneLevels(normalizeLevels(next.levels)),
    activeLevelId: next.activeLevelId ?? GROUND_LEVEL_ID
  };
};
