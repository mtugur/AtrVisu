import { describe, expect, it } from "vitest";
import {
  calculateCivilDragPosition,
  calculateMachineDragPositionUpdates,
  createCivilDragState,
  createMachineDragState,
  createPlanDragProjection,
  didSceneDragApplyMutation,
  getMachineDragInstanceIds,
  getMachineStartPositionMm,
  intersectRayWithHorizontalDragPlane,
  resolvePlanDragFrame,
  shouldKeepSceneDragActive,
  type DraggableMachine
} from "./dragPlacement";

const machine = (instanceId: string, xMm: number, yMm: number): DraggableMachine => ({
  instanceId,
  position: { x: xMm / 1000, z: yMm / 1000 },
  positionMm: { xMm, yMm }
});

describe("simple fixed-plane body drag", () => {
  it("intersects a fixed picked-Y plane from above and below", () => {
    const fromAbove = intersectRayWithHorizontalDragPlane(
      { x: 0, y: 10, z: 10 },
      { x: 0.2, y: -1, z: -1 },
      4
    );
    expect(fromAbove?.x).toBeCloseTo(1.2);
    expect(fromAbove?.y).toBe(4);
    expect(fromAbove?.z).toBe(4);
    const fromBelow = intersectRayWithHorizontalDragPlane(
      { x: 0, y: -10, z: 10 },
      { x: 0.2, y: 1, z: -1 },
      4
    );
    expect(fromBelow?.x).toBeCloseTo(2.8);
    expect(fromBelow?.y).toBe(4);
    expect(fromBelow?.z).toBe(-4);
  });

  it("returns unavailable for invalid, behind-camera, and near-parallel geometry", () => {
    expect(intersectRayWithHorizontalDragPlane(
      { x: 0, y: 10, z: 0 },
      { x: 1, y: 0.0000001, z: 0 },
      4
    )).toBeNull();
    expect(intersectRayWithHorizontalDragPlane(
      { x: 0, y: 10, z: 0 },
      { x: 1, y: -0.1, z: 0 },
      4
    )).toBeNull();
    expect(intersectRayWithHorizontalDragPlane(
      { x: 0, y: 10, z: 0 },
      { x: 0, y: 1, z: 0 },
      4
    )).toBeNull();
    expect(createPlanDragProjection({
      rayOrigin: { x: 0, y: 10, z: 0 },
      rayDirection: { x: 1, y: 0, z: 0 },
      pickedPoint: { x: 1, y: 4, z: 2 }
    })).toBeNull();
    expect(createPlanDragProjection({
      rayOrigin: { x: 0, y: 10, z: 0 },
      rayDirection: { x: 0, y: -1, z: -1 },
      pickedPoint: { x: 1, y: 4, z: 2 },
      viewPlaneDot: 0.05
    })).toBeNull();
  });

  it("derives every frame from the immutable pointer-down intersection", () => {
    const projection = createPlanDragProjection({
      rayOrigin: { x: 0, y: 10, z: 10 },
      rayDirection: { x: 0, y: -1, z: -1 },
      pickedPoint: { x: 0, y: 4, z: 4 }
    });
    expect(projection).not.toBeNull();
    const first = resolvePlanDragFrame({
      projection: projection!,
      rayOrigin: { x: 2, y: 10, z: 12 },
      rayDirection: { x: 0, y: -1, z: -1 }
    });
    const repeated = resolvePlanDragFrame({
      projection: projection!,
      rayOrigin: { x: 2, y: 10, z: 12 },
      rayDirection: { x: 0, y: -1, z: -1 }
    });
    expect(first).toEqual(repeated);
    expect(first?.deltaMeters).toEqual({ x: 2, z: 2 });
    expect(first?.anchorPoint.y).toBe(4);
  });

  it("preserves machine selection, lock, and canonical millimeter starts", () => {
    expect(getMachineDragInstanceIds("a", ["a", "b"], [], false)).toEqual(["a", "b"]);
    expect(getMachineDragInstanceIds("a", ["a", "b"], ["b"], false)).toEqual([]);
    expect(getMachineStartPositionMm(machine("a", 1250, -750))).toEqual({ xMm: 1250, yMm: -750 });
  });

  it("applies one absolute Plan delta to machine and civil start snapshots", () => {
    const projection = { anchorPoint: { x: 0, y: 3, z: 0 }, startPoint: { x: 0, y: 3, z: 0 } };
    const machineState = createMachineDragState({
      targetInstanceId: "a",
      projection,
      selectedInstanceIds: ["a", "b"],
      lockedInstanceIds: [],
      machines: [machine("a", 100, 200), machine("b", 700, -300)],
      isToggleSelection: false
    });
    expect(calculateMachineDragPositionUpdates(machineState!, { x: 1.25, z: -0.5 })).toEqual([
      { instanceId: "a", xMm: 1350, yMm: -300 },
      { instanceId: "b", xMm: 1950, yMm: -800 }
    ]);
    expect(calculateCivilDragPosition(
      createCivilDragState("c", projection, { xMm: -400, yMm: 900 }),
      { x: 1.25, z: -0.5 }
    )).toEqual({ xMm: 850, yMm: 400 });
  });

  it("retains blocked/noop/applied gesture semantics without a fallback mode", () => {
    expect(shouldKeepSceneDragActive("applied")).toBe(true);
    expect(shouldKeepSceneDragActive("noop")).toBe(true);
    expect(shouldKeepSceneDragActive("blocked")).toBe(false);
    expect(didSceneDragApplyMutation("applied")).toBe(true);
    expect(didSceneDragApplyMutation("noop")).toBe(false);
  });
});
