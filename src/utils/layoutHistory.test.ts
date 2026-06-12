import { describe, expect, it } from "vitest";
import type { AnnotationObject } from "../types/annotations";
import type { MachineDefinition, PlacedMachine } from "../types/machine";
import { createLayoutHistory, pushHistorySnapshot, redoHistory, undoHistory } from "./layoutHistory";

const definition: MachineDefinition = {
  id: "machine",
  name: "Machine",
  category: "Test",
  width: 1,
  depth: 1,
  height: 1,
  widthMm: 1000,
  depthMm: 1000,
  heightMm: 1000,
  defaultColor: "#aaaaaa",
  connectionPoints: [],
  capabilities: {
    canConvey: false,
    canPalletize: false,
    canWrap: false,
    hasFlowDirection: false
  }
};

const machine = (instanceId: string, xMm: number): PlacedMachine => ({
  instanceId,
  machineDefinitionId: definition.id,
  definition,
  definitionSnapshot: definition,
  position: { x: xMm / 1000, z: 0 },
  positionMm: { xMm, yMm: 0 },
  rotationY: 0,
  rotationDeg: 0,
  flowDirection: "forward"
});

const annotation = (text: string): AnnotationObject => ({
  id: "annotation-1",
  type: "note",
  text,
  positionMm: { xMm: 0, yMm: 0, zMm: 1600 }
});

describe("layout history", () => {
  it("pushes, undoes, and redoes layout snapshots", () => {
    const initial = [machine("a", 0)];
    const moved = [machine("a", 1000)];
    const history = pushHistorySnapshot(createLayoutHistory(), initial, [annotation("before")]);

    const undone = undoHistory(history, moved, [annotation("after")]);
    expect(undone?.machines[0].positionMm?.xMm).toBe(0);
    expect(undone?.annotations[0].text).toBe("before");

    const redone = undone ? redoHistory(undone.history, undone.machines, undone.annotations) : null;
    expect(redone?.machines[0].positionMm?.xMm).toBe(1000);
    expect(redone?.annotations[0].text).toBe("after");
  });

  it("enforces the history limit", () => {
    let history = createLayoutHistory(2);
    history = pushHistorySnapshot(history, [machine("a", 0)]);
    history = pushHistorySnapshot(history, [machine("a", 1000)]);
    history = pushHistorySnapshot(history, [machine("a", 2000)]);
    expect(history.undoStack.map((snapshot) => snapshot.machines[0].positionMm?.xMm)).toEqual([1000, 2000]);
  });

  it("returns null when undo or redo stacks are empty", () => {
    const history = createLayoutHistory();
    expect(undoHistory(history, [])).toBeNull();
    expect(redoHistory(history, [])).toBeNull();
  });
});
