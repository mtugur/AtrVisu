import type { RuntimeViewportInvariantSnapshot } from "./runtimeViewportBridge";

export type RuntimeViewportInvariantSnapshotInput = {
  selectionIds: readonly string[];
  primarySelectionId: string | null;
  activeGroupEditId: string | null;
  machines: readonly {
    id: string;
    xMm: number;
    yMm: number;
    rotationDeg: number;
    layerId: string;
  }[];
  civilReferences: readonly {
    id: string;
    xMm: number;
    yMm: number;
    zMm: number;
    rotationDeg: number;
    layerId: string;
  }[];
  annotations: readonly {
    id: string;
    xMm: number;
    yMm: number;
    zMm: number;
    rotationDeg: number;
    layerId: string;
  }[];
  groups: readonly {
    id: string;
    objectIds: readonly string[];
    annotationIds: readonly string[];
    layerId: string;
  }[];
  layers: readonly {
    id: string;
    visible: boolean;
    locked: boolean;
  }[];
  undoStack: readonly unknown[];
  redoStack: readonly unknown[];
  projectDirty: boolean;
  simulationRunning: boolean;
  simulationSpeed: number;
};

export const createRuntimeViewportInvariantSnapshot = ({
  selectionIds,
  primarySelectionId,
  activeGroupEditId,
  machines,
  civilReferences,
  annotations,
  groups,
  layers,
  undoStack,
  redoStack,
  projectDirty,
  simulationRunning,
  simulationSpeed
}: RuntimeViewportInvariantSnapshotInput): RuntimeViewportInvariantSnapshot => ({
  selectionIds: [...selectionIds],
  primarySelectionId,
  activeGroupEditId,
  machineTransforms: machines
    .map((machine) =>
      `${machine.id}:${machine.xMm}:${machine.yMm}:${machine.rotationDeg}:${machine.layerId}`
    )
    .sort(),
  civilTransforms: civilReferences
    .map((item) =>
      `${item.id}:${item.xMm}:${item.yMm}:${item.zMm}:${item.rotationDeg}:${item.layerId}`
    )
    .sort(),
  annotationTransforms: annotations
    .map((annotation) =>
      `${annotation.id}:${annotation.xMm}:${annotation.yMm}:${annotation.zMm}:${annotation.rotationDeg}:${annotation.layerId}`
    )
    .sort(),
  groupMembership: groups
    .map((group) =>
      `${group.id}:${[...group.objectIds].sort().join(",")}:${[...group.annotationIds].sort().join(",")}:${group.layerId}`
    )
    .sort(),
  layerState: layers
    .map((layer) => `${layer.id}:${layer.visible}:${layer.locked}`)
    .sort(),
  undoDepth: undoStack.length,
  redoDepth: redoStack.length,
  undoStack: undoStack.map((snapshot) => JSON.stringify(snapshot)),
  redoStack: redoStack.map((snapshot) => JSON.stringify(snapshot)),
  projectDirty,
  simulationRunning,
  simulationSpeed
});

export const refreshRuntimeViewportInvariantSnapshot = (
  enabled: boolean,
  createSnapshot: () => RuntimeViewportInvariantSnapshot,
  publishSnapshot: (snapshot: RuntimeViewportInvariantSnapshot) => void
) => {
  if (!enabled) {
    return false;
  }

  publishSnapshot(createSnapshot());
  return true;
};
