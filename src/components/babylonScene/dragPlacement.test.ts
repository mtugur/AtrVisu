import { describe, expect, it } from "vitest";
import {
  calculateCivilDragPosition,
  calculateMachineDragPositionUpdates,
  createCivilDragState,
  createMachineDragState,
  getMachineDragInstanceIds,
  getMachineStartPositionMm,
  getPlanDragDeltaMm,
  intersectRayWithHorizontalDragPlane,
  didSceneDragApplyMutation,
  resolveDragPlaneElevationMeters,
  shouldKeepSceneDragActive,
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

  it("blocks the complete drag set when any selected machine is locked", () => {
    expect(getMachineDragInstanceIds("m1", ["m1", "m2"], ["m2"], false)).toEqual([]);
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
      planeElevationMeters: 2.4,
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
      planeElevationMeters: 2.4,
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
        planeElevationMeters: 0.5,
        selectedInstanceIds: ["m1"],
        lockedInstanceIds: ["m1"],
        machines: [machine("m1", 0, 0)],
        isToggleSelection: false
      })
    ).toBeNull();
  });

  it("returns null without a partial drag state when any selected machine is unresolved", () => {
    expect(
      createMachineDragState({
        targetInstanceId: "m1",
        floorPoint: { x: 0, z: 0 },
        planeElevationMeters: 0.5,
        selectedInstanceIds: ["m1", "missing"],
        lockedInstanceIds: [],
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
    const dragState = createCivilDragState("column-1", { x: 2, z: 1 }, { xMm: -200, yMm: 300 }, 2.75);

    expect(calculateCivilDragPosition(dragState, { x: 1.5, z: 2.25 })).toEqual({
      xMm: -700,
      yMm: 1550
    });
  });

  it("calculates machine drag updates from original positions plus floor delta", () => {
    const dragState: MachineDragState = {
      instanceIds: ["m1", "m2", "missing"],
      planeElevationMeters: 1.5,
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
      planeElevationMeters: 3.2,
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

  it("keeps valid no-op drag frames active and distinguishes blocked movement", () => {
    expect(shouldKeepSceneDragActive("applied")).toBe(true);
    expect(shouldKeepSceneDragActive("noop")).toBe(true);
    expect(shouldKeepSceneDragActive("blocked")).toBe(false);
    expect(didSceneDragApplyMutation("noop")).toBe(false);
    expect(didSceneDragApplyMutation("blocked")).toBe(false);
    expect(didSceneDragApplyMutation("applied")).toBe(true);
  });

  it("uses the actual finite grab height and a truthful fallback otherwise", () => {
    expect(resolveDragPlaneElevationMeters(4.25, 1.5)).toBe(4.25);
    expect(resolveDragPlaneElevationMeters(Number.NaN, 1.5)).toBe(1.5);
    expect(resolveDragPlaneElevationMeters(undefined, 2.75)).toBe(2.75);
  });

  it("calculates drag delta from two intersections on the same captured plane", () => {
    const origin = { x: 0, y: 10, z: 10 };
    const start = intersectRayWithHorizontalDragPlane(origin, { x: 0.1, y: -1, z: -1 }, 4);
    const current = intersectRayWithHorizontalDragPlane(origin, { x: 0.2, y: -1, z: -1 }, 4);
    const incorrectFloorCurrent = intersectRayWithHorizontalDragPlane(origin, { x: 0.2, y: -1, z: -1 }, 0);

    expect(start).not.toBeNull();
    expect(current).not.toBeNull();
    expect(incorrectFloorCurrent).not.toBeNull();
    const samePlaneDelta = getPlanDragDeltaMm(
      { startFloorX: start?.x ?? 0, startFloorZ: start?.z ?? 0 },
      { x: current?.x ?? 0, z: current?.z ?? 0 }
    );
    const mixedPlaneDelta = getPlanDragDeltaMm(
      { startFloorX: start?.x ?? 0, startFloorZ: start?.z ?? 0 },
      { x: incorrectFloorCurrent?.x ?? 0, z: incorrectFloorCurrent?.z ?? 0 }
    );

    expect(samePlaneDelta.deltaXMm).toBeCloseTo(600);
    expect(samePlaneDelta.deltaYMm).toBeCloseTo(0);
    expect(mixedPlaneDelta).not.toEqual(samePlaneDelta);
  });
});
