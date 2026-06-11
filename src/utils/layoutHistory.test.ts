import { describe, expect, it } from "vitest";
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

describe("layout history", () => {
  it("pushes, undoes, and redoes layout snapshots", () => {
    const initial = [machine("a", 0)];
    const moved = [machine("a", 1000)];
    const history = pushHistorySnapshot(createLayoutHistory(), initial);

    const undone = undoHistory(history, moved);
    expect(undone?.machines[0].positionMm?.xMm).toBe(0);

    const redone = undone ? redoHistory(undone.history, undone.machines) : null;
    expect(redone?.machines[0].positionMm?.xMm).toBe(1000);
  });

  it("enforces the history limit", () => {
    let history = createLayoutHistory(2);
    history = pushHistorySnapshot(history, [machine("a", 0)]);
    history = pushHistorySnapshot(history, [machine("a", 1000)]);
    history = pushHistorySnapshot(history, [machine("a", 2000)]);
    expect(history.undoStack.map((snapshot) => snapshot[0].positionMm?.xMm)).toEqual([1000, 2000]);
  });

  it("returns null when undo or redo stacks are empty", () => {
    const history = createLayoutHistory();
    expect(undoHistory(history, [])).toBeNull();
    expect(redoHistory(history, [])).toBeNull();
  });
});
