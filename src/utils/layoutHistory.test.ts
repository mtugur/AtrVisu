import { describe, expect, it } from "vitest";
import type { AnnotationObject } from "../types/annotations";
import type { CivilReferenceItem } from "../types/civil";
import type { MachineDefinition, PlacedMachine } from "../types/machine";
import type { LayoutViewpoint } from "../types/viewpoints";
import { createLayoutHistory, pushHistorySnapshot, redoHistory, undoHistory } from "./layoutHistory";
import { createCivilReference, updateCivilReference } from "./civil";
import { createLayoutLevel, normalizeLevels } from "./levels";

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

const civil = (id: string, xMm: number, yMm: number): CivilReferenceItem => ({
  id,
  type: "column",
  name: id,
  positionMm: { xMm, yMm, zMm: 0 },
  referencePoint: "front-left-bottom",
  coordinateReferenceVersion: "front-left-bottom-v1",
  sizeMm: { widthMm: 500, depthMm: 500, heightMm: 3000 },
  rotationDeg: 0,
  createdAt: "now",
  updatedAt: "now"
});

const annotation = (text: string): AnnotationObject => ({
  id: "annotation-1",
  type: "note",
  text,
  positionMm: { xMm: 0, yMm: 0, zMm: 1600 }
});

const viewpoint = (id: string, name: string): LayoutViewpoint => ({
  id,
  name,
  camera: {
    alpha: 0.5,
    beta: 1,
    radius: 30,
    targetX: 0,
    targetY: 0,
    targetZ: 0,
    mode: "perspective"
  },
  createdAt: "2026-06-13T10:00:00.000Z",
  updatedAt: "2026-06-13T10:00:00.000Z"
});

describe("layout history", () => {
  it("restores one atomic Level datum transaction with all assigned elevations", () => {
    const levels = normalizeLevels([createLayoutLevel("level-2", "Level 2", 6000, "2026-09-23T00:00:00.000Z")]);
    const beforeMachine = { ...machine("a", 0), levelId: "level-2", elevationMm: 6500 };
    const beforeCivil = { ...civil("c1", 0, 0), levelId: "level-2", positionMm: { xMm: 0, yMm: 0, zMm: 7000 } };
    const history = pushHistorySnapshot(createLayoutHistory(), [beforeMachine], [], [beforeCivil], [], [], [], levels, "level-2");
    const afterLevels = levels.map((level) => level.id === "level-2" ? { ...level, elevationMm: 6500 } : level);
    const undone = undoHistory(history, [{ ...beforeMachine, elevationMm: 7000 }], [], [{ ...beforeCivil, positionMm: { ...beforeCivil.positionMm, zMm: 7500 } }], [], [], [], afterLevels, "level-2");
    expect(undone?.levels.find((level) => level.id === "level-2")?.elevationMm).toBe(6000);
    expect(undone?.machines[0].elevationMm).toBe(6500);
    expect(undone?.civilReferences[0].positionMm.zMm).toBe(7000);
    const redone = undone && redoHistory(undone.history, undone.machines, [], undone.civilReferences, [], [], [], undone.levels, undone.activeLevelId);
    expect(redone?.levels.find((level) => level.id === "level-2")?.elevationMm).toBe(6500);
    expect(redone?.machines[0].elevationMm).toBe(7000);
    expect(redone?.civilReferences[0].positionMm.zMm).toBe(7500);
  });
  it("undoes and redoes canonical Beam color and opacity edits", () => {
    const initial = [createCivilReference("beam", { xMm: 0, yMm: 0 }, "2026-09-21T00:00:00.000Z")];
    const history = pushHistorySnapshot(createLayoutHistory(), [], [], initial);
    const styled = updateCivilReference(initial, initial[0].id, {
      style: { colorToken: "#09aabb", opacity: 0.42 }
    }, "2026-09-21T01:00:00.000Z");
    const undone = undoHistory(history, [], [], styled);
    expect(undone?.civilReferences[0].style).toEqual(initial[0].style);
    const redone = undone && redoHistory(undone.history, [], [], undone.civilReferences);
    expect(redone?.civilReferences[0].style).toEqual({ colorToken: "#09aabb", opacity: 0.42 });
  });
  it("pushes, undoes, and redoes layout snapshots", () => {
    const initial = [machine("a", 0)];
    const moved = [machine("a", 1000)];
    const history = pushHistorySnapshot(createLayoutHistory(), initial, [annotation("before")], [], [viewpoint("viewpoint-1", "Before")]);

    const undone = undoHistory(history, moved, [annotation("after")], [], [viewpoint("viewpoint-2", "After")]);
    expect(undone?.machines[0].positionMm?.xMm).toBe(0);
    expect(undone?.annotations[0].text).toBe("before");
    expect(undone?.viewpoints[0].name).toBe("Before");

    const redone = undone ? redoHistory(undone.history, undone.machines, undone.annotations, undone.civilReferences, undone.viewpoints) : null;
    expect(redone?.machines[0].positionMm?.xMm).toBe(1000);
    expect(redone?.annotations[0].text).toBe("after");
    expect(redone?.viewpoints[0].name).toBe("After");
  });

  it("preserves multi-machine move snapshots through undo and redo", () => {
    const initial = [machine("a", -500), machine("b", 1250), machine("c", 3000)];
    const moved = [machine("a", 250), machine("b", 2000), machine("c", 3000)];
    const history = pushHistorySnapshot(createLayoutHistory(), initial);

    const undone = undoHistory(history, moved);
    expect(undone?.machines.map((item) => [item.instanceId, item.positionMm?.xMm])).toEqual([
      ["a", -500],
      ["b", 1250],
      ["c", 3000]
    ]);

    const redone = undone ? redoHistory(undone.history, undone.machines) : null;
    expect(redone?.machines.map((item) => [item.instanceId, item.positionMm?.xMm])).toEqual([
      ["a", 250],
      ["b", 2000],
      ["c", 3000]
    ]);
  });

  it("restores a complete mixed machine and civil nudge through undo and redo", () => {
    const initialMachines = [machine("a", 100)];
    const initialCivil = [civil("c1", 500, -200)];
    const movedMachines = [machine("a", 350)];
    const movedCivil = [civil("c1", 750, -100)];
    const history = pushHistorySnapshot(createLayoutHistory(), initialMachines, [], initialCivil);

    const undone = undoHistory(history, movedMachines, [], movedCivil);
    expect(undone?.machines[0].positionMm).toEqual({ xMm: 100, yMm: 0 });
    expect(undone?.civilReferences[0].positionMm).toMatchObject({ xMm: 500, yMm: -200 });

    const redone = undone
      ? redoHistory(undone.history, undone.machines, [], undone.civilReferences)
      : null;
    expect(redone?.machines[0].positionMm).toEqual({ xMm: 350, yMm: 0 });
    expect(redone?.civilReferences[0].positionMm).toMatchObject({ xMm: 750, yMm: -100 });
  });

  it("preserves multi-machine alignment snapshots through undo and redo", () => {
    const initial = [machine("primary", 0), machine("secondary", 2500), machine("third", 5000)];
    const aligned = [machine("primary", 0), machine("secondary", 0), machine("third", 0)];
    const history = pushHistorySnapshot(createLayoutHistory(), initial);

    const undone = undoHistory(history, aligned);
    expect(undone?.machines.map((item) => [item.instanceId, item.positionMm?.xMm])).toEqual([
      ["primary", 0],
      ["secondary", 2500],
      ["third", 5000]
    ]);

    const redone = undone ? redoHistory(undone.history, undone.machines) : null;
    expect(redone?.machines.map((item) => [item.instanceId, item.positionMm?.xMm])).toEqual([
      ["primary", 0],
      ["secondary", 0],
      ["third", 0]
    ]);
  });

  it("restores Floor Area thickness and top-anchor geometry through undo and redo", () => {
    const initialFloor = {
      id: "floor-1",
      type: "floor-area" as const,
      name: "Floor Area",
      levelId: "ground",
      positionMm: { xMm: 0, yMm: 0, zMm: -20 },
      sizeMm: { widthMm: 12000, depthMm: 8000, heightMm: 20 },
      rotationDeg: 0,
      createdAt: "now",
      updatedAt: "now"
    };
    const resizedFloor = {
      ...initialFloor,
      positionMm: { ...initialFloor.positionMm, zMm: -350 },
      sizeMm: { ...initialFloor.sizeMm, heightMm: 350 }
    };
    const history = pushHistorySnapshot(createLayoutHistory(), [], [], [initialFloor]);

    const undone = undoHistory(history, [], [], [resizedFloor]);
    expect(undone?.civilReferences[0]).toMatchObject({
      positionMm: { zMm: -20 },
      sizeMm: { heightMm: 20 }
    });
    const redone = undone ? redoHistory(undone.history, [], [], undone.civilReferences) : null;
    expect(redone?.civilReferences[0]).toMatchObject({
      positionMm: { zMm: -350 },
      sizeMm: { heightMm: 350 }
    });
  });

  it("records one machine instance rename transaction and restores it through undo and redo", () => {
    const initial = [machine("a", 0)];
    const renamed = [{ ...initial[0], displayName: "Machine - Line 2" }];
    const history = pushHistorySnapshot(createLayoutHistory(), initial);

    expect(history.undoStack).toHaveLength(1);
    const undone = undoHistory(history, renamed);
    expect(undone?.machines[0].displayName).toBeUndefined();
    const redone = undone ? redoHistory(undone.history, undone.machines) : null;
    expect(redone?.machines[0].displayName).toBe("Machine - Line 2");
  });

  it("restores a deleted selected machine through undo and redo", () => {
    const initial = [machine("a", 0), machine("b", 1000)];
    const afterDelete = [machine("b", 1000)];
    const history = pushHistorySnapshot(createLayoutHistory(), initial);

    const undone = undoHistory(history, afterDelete);
    expect(undone?.machines.map((item) => item.instanceId)).toEqual(["a", "b"]);

    const redone = undone ? redoHistory(undone.history, undone.machines) : null;
    expect(redone?.machines.map((item) => item.instanceId)).toEqual(["b"]);
  });

  it("restores multiple deleted selected machines through undo and redo", () => {
    const initial = [machine("a", 0), machine("b", 1000), machine("c", 2000)];
    const afterDelete = [machine("c", 2000)];
    const history = pushHistorySnapshot(createLayoutHistory(), initial);

    const undone = undoHistory(history, afterDelete);
    expect(undone?.machines.map((item) => item.instanceId)).toEqual(["a", "b", "c"]);

    const redone = undone ? redoHistory(undone.history, undone.machines) : null;
    expect(redone?.machines.map((item) => item.instanceId)).toEqual(["c"]);
  });

  it("restores duplicated selected machine snapshots through undo and redo", () => {
    const initial = [machine("a", 0)];
    const afterDuplicate = [machine("a", 0), machine("a-copy", 250)];
    const history = pushHistorySnapshot(createLayoutHistory(), initial);

    const undone = undoHistory(history, afterDuplicate);
    expect(undone?.machines.map((item) => item.instanceId)).toEqual(["a"]);

    const redone = undone ? redoHistory(undone.history, undone.machines) : null;
    expect(redone?.machines.map((item) => [item.instanceId, item.positionMm?.xMm])).toEqual([
      ["a", 0],
      ["a-copy", 250]
    ]);
  });

  it("restores batch duplicated selected machine snapshots through undo and redo", () => {
    const initial = [machine("a", -500), machine("b", 1250), machine("c", 3000)];
    const afterDuplicate = [
      machine("a", -500),
      machine("b", 1250),
      machine("c", 3000),
      machine("a-copy", -250),
      machine("b-copy", 1500)
    ];
    const history = pushHistorySnapshot(createLayoutHistory(), initial);

    const undone = undoHistory(history, afterDuplicate);
    expect(undone?.machines.map((item) => item.instanceId)).toEqual(["a", "b", "c"]);

    const redone = undone ? redoHistory(undone.history, undone.machines) : null;
    expect(redone?.machines.map((item) => [item.instanceId, item.positionMm?.xMm])).toEqual([
      ["a", -500],
      ["b", 1250],
      ["c", 3000],
      ["a-copy", -250],
      ["b-copy", 1500]
    ]);
  });

  it("keeps viewpoint-only layout changes undoable", () => {
    const machines = [machine("a", 0)];
    const annotations = [annotation("same")];
    const history = pushHistorySnapshot(createLayoutHistory(), machines, annotations, [], []);

    const undone = undoHistory(history, machines, annotations, [], [viewpoint("viewpoint-1", "Captured")]);
    expect(undone?.machines[0].instanceId).toBe("a");
    expect(undone?.annotations[0].text).toBe("same");
    expect(undone?.viewpoints).toEqual([]);

    const redone = undone ? redoHistory(undone.history, undone.machines, undone.annotations, undone.civilReferences, undone.viewpoints) : null;
    expect(redone?.viewpoints[0].name).toBe("Captured");
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
