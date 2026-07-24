import { describe, expect, it, vi } from "vitest";
import {
  createRuntimeViewportInvariantSnapshot,
  refreshRuntimeViewportInvariantSnapshot,
  type RuntimeViewportInvariantSnapshotInput
} from "./runtimeViewportDiagnostics";

const createInput = (): RuntimeViewportInvariantSnapshotInput => ({
  selectionIds: ["machine:machine-one"],
  primarySelectionId: "machine:machine-one",
  activeGroupEditId: "group-one",
  machines: [{
    id: "machine-one",
    xMm: 100,
    yMm: 200,
    rotationDeg: 90,
    layerId: "default"
  }],
  civilReferences: [{
    id: "column-one",
    xMm: 300,
    yMm: 400,
    zMm: 0,
    rotationDeg: 0,
    layerId: "civil"
  }],
  annotations: [{
    id: "note-one",
    xMm: -100,
    yMm: 50,
    zMm: 1600,
    rotationDeg: 0,
    layerId: "notes"
  }],
  groups: [{
    id: "group-one",
    objectIds: ["machine:machine-one", "civil:column-one"],
    annotationIds: ["annotation:note-one"],
    layerId: "default"
  }],
  layers: [
    { id: "default", visible: true, locked: false },
    { id: "civil", visible: true, locked: true }
  ],
  undoStack: [{ machines: [{ id: "old-machine" }] }],
  redoStack: [{ machines: [{ id: "future-machine" }] }],
  projectDirty: true,
  simulationRunning: false,
  simulationSpeed: 2
});

describe("runtime viewport diagnostic snapshots", () => {
  it("does not invoke the snapshot builder when diagnostics are disabled", () => {
    const createSnapshot = vi.fn(() => createRuntimeViewportInvariantSnapshot(createInput()));
    const publishSnapshot = vi.fn();

    expect(refreshRuntimeViewportInvariantSnapshot(
      false,
      createSnapshot,
      publishSnapshot
    )).toBe(false);
    expect(createSnapshot).not.toHaveBeenCalled();
    expect(publishSnapshot).not.toHaveBeenCalled();
  });

  it("generates the complete snapshot when diagnostics are enabled", () => {
    const snapshot = createRuntimeViewportInvariantSnapshot(createInput());

    expect(snapshot).toEqual({
      selectionIds: ["machine:machine-one"],
      primarySelectionId: "machine:machine-one",
      activeGroupEditId: "group-one",
      machineTransforms: ["machine-one:100:200:90:default"],
      civilTransforms: ["column-one:300:400:0:0:civil"],
      annotationTransforms: ["note-one:-100:50:1600:0:notes"],
      groupMembership: [
        "group-one:civil:column-one,machine:machine-one:annotation:note-one:default"
      ],
      layerState: ["civil:true:true", "default:true:false"],
      undoDepth: 1,
      redoDepth: 1,
      undoStack: [JSON.stringify(createInput().undoStack[0])],
      redoStack: [JSON.stringify(createInput().redoStack[0])],
      projectDirty: true,
      simulationRunning: false,
      simulationSpeed: 2
    });
  });

  it("updates machine movement and same-length history replacements", () => {
    const initial = createInput();
    const moved = {
      ...initial,
      machines: [{ ...initial.machines[0], xMm: 650 }]
    };
    const replacedHistory = {
      ...moved,
      undoStack: [{ machines: [{ id: "replacement-machine" }] }]
    };

    const before = createRuntimeViewportInvariantSnapshot(initial);
    const afterMove = createRuntimeViewportInvariantSnapshot(moved);
    const afterReplacement = createRuntimeViewportInvariantSnapshot(replacedHistory);

    expect(afterMove.machineTransforms).toEqual(["machine-one:650:200:90:default"]);
    expect(afterMove.machineTransforms).not.toEqual(before.machineTransforms);
    expect(afterReplacement.undoDepth).toBe(afterMove.undoDepth);
    expect(afterReplacement.undoStack).not.toEqual(afterMove.undoStack);
  });
});
