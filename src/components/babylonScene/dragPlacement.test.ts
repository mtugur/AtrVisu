import { describe, expect, it } from "vitest";
import {
  calculateCivilDragPosition,
  calculateMachineDragPositionUpdates,
  createCivilDragState,
  createMachineDragState,
  didSceneDragApplyMutation,
  getMachineDragInstanceIds,
  getMachineStartPositionMm,
  getPlanDragDeltaMm,
  intersectRayWithHorizontalDragPlane,
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
): DraggableMachine => ({ instanceId, position: { x, z }, ...(positionMm ? { positionMm } : {}) });

describe("fixed-plane body drag helpers", () => {
  it("drags the selected rigid set only when the picked machine is already selected", () => {
    expect(getMachineDragInstanceIds("m1", ["m1", "m2"], [], false)).toEqual(["m1", "m2"]);
    expect(getMachineDragInstanceIds("m3", ["m1", "m2"], [], false)).toEqual(["m3"]);
    expect(getMachineDragInstanceIds("m1", ["m1", "m2"], [], true)).toEqual(["m1"]);
  });

  it("blocks the complete drag set when any selected machine is locked", () => {
    expect(getMachineDragInstanceIds("m1", ["m1", "m2"], ["m2"], false)).toEqual([]);
    expect(getMachineDragInstanceIds("m1", ["m1"], ["m1"], false)).toEqual([]);
  });

  it("uses canonical millimeter positions and falls back to rendering meters", () => {
    expect(getMachineStartPositionMm(machine("m1", 2.5, -1.25, { xMm: 2510, yMm: -1260 })))
      .toEqual({ xMm: 2510, yMm: -1260 });
    expect(getMachineStartPositionMm(machine("m2", 2.5, -1.25)))
      .toEqual({ xMm: 2500, yMm: -1250 });
  });

  it("captures immutable selected-machine starts on the picked elevation plane", () => {
    expect(createMachineDragState({
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
    })).toEqual({
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

  it("refuses locked or partially unresolved machine sets", () => {
    const base = {
      targetInstanceId: "m1",
      floorPoint: { x: 0, z: 0 },
      planeElevationMeters: 0.5,
      machines: [machine("m1", 0, 0)],
      isToggleSelection: false
    };
    expect(createMachineDragState({ ...base, selectedInstanceIds: ["m1"], lockedInstanceIds: ["m1"] }))
      .toBeNull();
    expect(createMachineDragState({ ...base, selectedInstanceIds: ["m1", "missing"], lockedInstanceIds: [] }))
      .toBeNull();
  });

  it("calculates negative Plan deltas and civil positions from immutable starts", () => {
    const delta = getPlanDragDeltaMm({ startFloorX: 1.2, startFloorZ: -2.4 }, { x: -0.3, z: -3.1 });
    expect(delta.deltaXMm).toBeCloseTo(-1500);
    expect(delta.deltaYMm).toBeCloseTo(-700);
    const state = createCivilDragState("column-1", { x: 2, z: 1 }, { xMm: -200, yMm: 300 }, 2.75);
    expect(calculateCivilDragPosition(state, { x: 1.5, z: 2.25 }))
      .toEqual({ xMm: -700, yMm: 1550 });
  });

  it("moves a multi-selection with one rigid Plan delta", () => {
    const state: MachineDragState = {
      instanceIds: ["m1", "m2", "missing"],
      planeElevationMeters: 1.5,
      startFloorX: 0,
      startFloorZ: 0,
      startPositions: {
        m1: { xMm: 100, yMm: 200 },
        m2: { xMm: -500, yMm: -800 }
      }
    };
    const updates = calculateMachineDragPositionUpdates(state, { x: 1.25, z: -0.5 });
    expect(updates).toEqual([
      { instanceId: "m1", xMm: 1350, yMm: -300 },
      { instanceId: "m2", xMm: 750, yMm: -1300 }
    ]);
    expect(updates[0].xMm - updates[1].xMm).toBe(600);
    expect(updates[0].yMm - updates[1].yMm).toBe(1000);
  });

  it("keeps snapped no-op frames active and records only applied movement", () => {
    expect(shouldKeepSceneDragActive("applied")).toBe(true);
    expect(shouldKeepSceneDragActive("noop")).toBe(true);
    expect(shouldKeepSceneDragActive("blocked")).toBe(false);
    expect(didSceneDragApplyMutation("noop")).toBe(false);
    expect(didSceneDragApplyMutation("blocked")).toBe(false);
    expect(didSceneDragApplyMutation("applied")).toBe(true);
  });

  it("captures the real finite picked height and uses fallback only for invalid picks", () => {
    expect(resolveDragPlaneElevationMeters(4.25, 1.5)).toBe(4.25);
    expect(resolveDragPlaneElevationMeters(Number.NaN, 1.5)).toBe(1.5);
    expect(resolveDragPlaneElevationMeters(undefined, 2.75)).toBe(2.75);
  });

  it("uses one fixed horizontal plane for every frame in the gesture", () => {
    const origin = { x: 0, y: 10, z: 10 };
    const start = intersectRayWithHorizontalDragPlane(origin, { x: 0.1, y: -1, z: -1 }, 4);
    const current = intersectRayWithHorizontalDragPlane(origin, { x: 0.2, y: -1, z: -1 }, 4);
    const wrongPlane = intersectRayWithHorizontalDragPlane(origin, { x: 0.2, y: -1, z: -1 }, 0);
    expect(start).not.toBeNull();
    expect(current).not.toBeNull();
    const delta = getPlanDragDeltaMm(
      { startFloorX: start?.x ?? 0, startFloorZ: start?.z ?? 0 },
      { x: current?.x ?? 0, z: current?.z ?? 0 }
    );
    expect(delta.deltaXMm).toBeCloseTo(600);
    expect(delta.deltaYMm).toBeCloseTo(0);
    expect(wrongPlane).not.toEqual(current);
  });

  it("reports the accepted near-plane limitation without hidden remapping", () => {
    expect(intersectRayWithHorizontalDragPlane(
      { x: 0, y: 20, z: 0 },
      { x: 1, y: 0, z: 0 },
      20
    )).toBeNull();
    expect(intersectRayWithHorizontalDragPlane(
      { x: 0, y: 20, z: 0 },
      { x: 1, y: 0.0002, z: 0 },
      19
    )).toBeNull();
  });
});
