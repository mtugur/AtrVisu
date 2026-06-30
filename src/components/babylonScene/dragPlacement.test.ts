import { describe, expect, it } from "vitest";
import {
  calculateCivilDragPosition,
  calculateMachineDragPositionUpdates,
  createCivilDragState,
  createMachineDragState,
  getMachineDragInstanceIds,
  getMachineStartPositionMm,
  getPlanDragDeltaMm,
  type DraggableMachine,
  type MachineDragState
} from "./dragPlacement";

const machine = (
  instanceId: string,
  x: number,
  z: number,
  positionMm?: { xMm: number; yMm: number }
): DraggableMachine => ({
  instanceId,
  position: { x, z },
  ...(positionMm ? { positionMm } : {})
});

describe("drag placement helpers", () => {
  it("drags all selected machines when the picked machine is already selected", () => {
    expect(getMachineDragInstanceIds("m1", ["m1", "m2"], [], false)).toEqual(["m1", "m2"]);
  });

  it("drags only the picked machine when replacing a selection from an unselected machine", () => {
    expect(getMachineDragInstanceIds("m3", ["m1", "m2"], [], false)).toEqual(["m3"]);
  });

  it("drags only the picked machine during toggle selection", () => {
    expect(getMachineDragInstanceIds("m1", ["m1", "m2"], [], true)).toEqual(["m1"]);
  });

  it("filters locked machines out of the drag set", () => {
    expect(getMachineDragInstanceIds("m1", ["m1", "m2"], ["m2"], false)).toEqual(["m1"]);
    expect(getMachineDragInstanceIds("m1", ["m1"], ["m1"], false)).toEqual([]);
  });

  it("uses millimeter position when present and falls back to scene meters", () => {
    expect(getMachineStartPositionMm(machine("m1", 2.5, -1.25, { xMm: 2510, yMm: -1260 }))).toEqual({
      xMm: 2510,
      yMm: -1260
    });
    expect(getMachineStartPositionMm(machine("m2", 2.5, -1.25))).toEqual({
      xMm: 2500,
      yMm: -1250
    });
  });

  it("creates machine drag state with selected unlocked start positions", () => {
    const dragState = createMachineDragState({
      targetInstanceId: "m1",
      floorPoint: { x: 1, z: -2 },
      selectedInstanceIds: ["m1", "m2"],
      lockedInstanceIds: [],
      machines: [
        machine("m1", 0, 0, { xMm: 100, yMm: -200 }),
        machine("m2", 0, 0, { xMm: 500, yMm: 600 })
      ],
      isToggleSelection: false
    });

    expect(dragState).toEqual({
      instanceIds: ["m1", "m2"],
      startFloorX: 1,
      startFloorZ: -2,
      startPositions: {
        m1: { xMm: 100, yMm: -200 },
        m2: { xMm: 500, yMm: 600 }
      }
    });
  });

  it("returns null when every candidate machine is locked", () => {
    expect(
      createMachineDragState({
        targetInstanceId: "m1",
        floorPoint: { x: 0, z: 0 },
        selectedInstanceIds: ["m1"],
        lockedInstanceIds: ["m1"],
        machines: [machine("m1", 0, 0)],
        isToggleSelection: false
      })
    ).toBeNull();
  });

  it("calculates plan drag delta in millimeters including negative coordinates", () => {
    const delta = getPlanDragDeltaMm({ startFloorX: 1.2, startFloorZ: -2.4 }, { x: -0.3, z: -3.1 });

    expect(delta.deltaXMm).toBeCloseTo(-1500);
    expect(delta.deltaYMm).toBeCloseTo(-700);
  });

  it("calculates civil drag position from original position plus floor delta", () => {
    const dragState = createCivilDragState("column-1", { x: 2, z: 1 }, { xMm: -200, yMm: 300 });

    expect(calculateCivilDragPosition(dragState, { x: 1.5, z: 2.25 })).toEqual({
      xMm: -700,
      yMm: 1550
    });
  });

  it("calculates machine drag updates from original positions plus floor delta", () => {
    const dragState: MachineDragState = {
      instanceIds: ["m1", "m2", "missing"],
      startFloorX: 0,
      startFloorZ: 0,
      startPositions: {
        m1: { xMm: 100, yMm: 200 },
        m2: { xMm: -500, yMm: -800 }
      }
    };

    expect(calculateMachineDragPositionUpdates(dragState, { x: 1.25, z: -0.5 })).toEqual([
      { instanceId: "m1", xMm: 1350, yMm: -300 },
      { instanceId: "m2", xMm: 750, yMm: -1300 }
    ]);
  });

  it("preserves relative offsets when multiple selected machines move together", () => {
    const dragState = createMachineDragState({
      targetInstanceId: "m2",
      floorPoint: { x: 4, z: -1 },
      selectedInstanceIds: ["m1", "m2", "m3"],
      lockedInstanceIds: [],
      machines: [
        machine("m1", 0, 0, { xMm: -1000, yMm: 500 }),
        machine("m2", 0, 0, { xMm: 250, yMm: -750 }),
        machine("m3", 0, 0, { xMm: 1750, yMm: 1250 })
      ],
      isToggleSelection: false
    });

    expect(dragState).not.toBeNull();

    const updates = calculateMachineDragPositionUpdates(dragState as MachineDragState, { x: 4.5, z: -2.25 });
    const byId = new Map(updates.map((update) => [update.instanceId, update]));

    expect(byId.get("m1")).toMatchObject({ xMm: -500, yMm: -750 });
    expect(byId.get("m2")).toMatchObject({ xMm: 750, yMm: -2000 });
    expect(byId.get("m3")).toMatchObject({ xMm: 2250, yMm: 0 });
    expect((byId.get("m2")?.xMm ?? 0) - (byId.get("m1")?.xMm ?? 0)).toBe(1250);
    expect((byId.get("m3")?.yMm ?? 0) - (byId.get("m2")?.yMm ?? 0)).toBe(2000);
  });
});
