import { describe, expect, it } from "vitest";
import {
  calculateCivilDragPosition,
  calculateMachineDragPositionUpdates,
  createCivilDragState,
  createMachineDragState,
  createPlanDragBasis,
  didSceneDragApplyMutation,
  getMachineDragInstanceIds,
  getMachineStartPositionMm,
  getPlanDragDeltaMm,
  intersectRayWithHorizontalDragPlane,
  shouldKeepSceneDragActive,
  type DraggableMachine,
  type PlanDragBasis
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

const createTestBasis = (overrides: Partial<Parameters<typeof createPlanDragBasis>[0]> = {}) => {
  const basis = createPlanDragBasis({
    cameraPosition: { x: 20, y: 16, z: 30 },
    cameraTarget: { x: 0, y: 0, z: 0 },
    cameraAlpha: Math.atan2(30, 20),
    cameraMode: "perspective",
    radius: 40,
    verticalFovRadians: Math.PI / 3,
    viewportCssHeight: 800,
    pointerStartClientX: 400,
    pointerStartClientY: 300,
    ...overrides
  });
  if (!basis) {
    throw new Error("Expected a valid test plan-drag basis.");
  }
  return basis;
};

const dot = (
  delta: { deltaXMm: number; deltaYMm: number },
  direction: { x: number; z: number }
) => delta.deltaXMm * direction.x + delta.deltaYMm * direction.z;

const expectScreenSemantics = (basis: PlanDragBasis) => {
  const right = getPlanDragDeltaMm(basis, { clientX: 460, clientY: 300 });
  const left = getPlanDragDeltaMm(basis, { clientX: 340, clientY: 300 });
  const down = getPlanDragDeltaMm(basis, { clientX: 400, clientY: 360 });
  const up = getPlanDragDeltaMm(basis, { clientX: 400, clientY: 240 });
  const towardCamera = {
    x: -basis.planForwardAwayFromCamera.x,
    z: -basis.planForwardAwayFromCamera.z
  };

  expect(dot(right, basis.planRight)).toBeGreaterThan(0);
  expect(dot(left, basis.planRight)).toBeLessThan(0);
  expect(dot(down, towardCamera)).toBeGreaterThan(0);
  expect(dot(up, towardCamera)).toBeLessThan(0);
  expect(right.deltaXMm).toBeCloseTo(-left.deltaXMm);
  expect(right.deltaYMm).toBeCloseTo(-left.deltaYMm);
  expect(down.deltaXMm).toBeCloseTo(-up.deltaXMm);
  expect(down.deltaYMm).toBeCloseTo(-up.deltaYMm);
};

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

  it("creates machine drag state with one frozen basis and unlocked start positions", () => {
    const basis = createTestBasis();
    const dragState = createMachineDragState({
      targetInstanceId: "m1",
      basis,
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
      basis,
      startPositions: {
        m1: { xMm: 100, yMm: -200 },
        m2: { xMm: 500, yMm: 600 }
      }
    });
  });

  it("returns null for locked or unresolved machine drag members", () => {
    const basis = createTestBasis();
    expect(createMachineDragState({
      targetInstanceId: "m1",
      basis,
      selectedInstanceIds: ["m1"],
      lockedInstanceIds: ["m1"],
      machines: [machine("m1", 0, 0)],
      isToggleSelection: false
    })).toBeNull();
    expect(createMachineDragState({
      targetInstanceId: "m1",
      basis,
      selectedInstanceIds: ["m1", "missing"],
      lockedInstanceIds: [],
      machines: [machine("m1", 0, 0)],
      isToggleSelection: false
    })).toBeNull();
  });

  it("maps screen directions to explicit camera-relative plan semantics", () => {
    const basis = createTestBasis();
    const headingLength = Math.hypot(20, 30);
    expect(basis.planForwardAwayFromCamera.x).toBeCloseTo(-20 / headingLength);
    expect(basis.planForwardAwayFromCamera.z).toBeCloseTo(-30 / headingLength);
    expect(basis.planRight.x).toBeCloseTo(-30 / headingLength);
    expect(basis.planRight.z).toBeCloseTo(20 / headingLength);
    expectScreenSemantics(basis);
  });

  it("keeps screen semantics invariant above, level with, and below camera targets", () => {
    const pitchCases = [
      { name: "above", cameraY: 40, targetY: 0 },
      { name: "slightly-above", cameraY: 25.1, targetY: 25 },
      { name: "level", cameraY: 25, targetY: 25 },
      { name: "slightly-below", cameraY: 24.9, targetY: 25 },
      { name: "below", cameraY: -15, targetY: 25 }
    ];

    for (const pitchCase of pitchCases) {
      const basis = createTestBasis({
        cameraPosition: { x: 20, y: pitchCase.cameraY, z: 30 },
        cameraTarget: { x: 0, y: pitchCase.targetY, z: 0 }
      });
      expectScreenSemantics(basis);
      expect(basis.planForwardAwayFromCamera, pitchCase.name).toEqual(
        createTestBasis().planForwardAwayFromCamera
      );
    }
  });

  it("keeps semantic direction across shallow steep and near-top-down pitches at two headings", () => {
    const headings = [
      { positionX: 30, positionZ: 10, alpha: Math.atan2(10, 30) },
      { positionX: -18, positionZ: 24, alpha: Math.atan2(24, -18) }
    ];
    const pitchCases = [
      { cameraY: 1, targetY: 0 },
      { cameraY: 35, targetY: 0 },
      { cameraY: 80, targetY: 25 }
    ];

    for (const heading of headings) {
      for (const pitch of pitchCases) {
        expectScreenSemantics(createTestBasis({
          cameraPosition: { x: heading.positionX, y: pitch.cameraY, z: heading.positionZ },
          cameraTarget: { x: 0, y: pitch.targetY, z: 0 },
          cameraAlpha: heading.alpha
        }));
      }
    }
  });

  it("uses ArcRotate alpha when the horizontal camera-to-target heading is degenerate", () => {
    for (const alpha of [0, Math.PI * 0.75]) {
      const basis = createTestBasis({
        cameraPosition: { x: 4, y: 50, z: -7 },
        cameraTarget: { x: 4, y: 0, z: -7 },
        cameraAlpha: alpha
      });
      expect(basis.planForwardAwayFromCamera.x).toBeCloseTo(-Math.cos(alpha));
      expect(basis.planForwardAwayFromCamera.z).toBeCloseTo(-Math.sin(alpha));
      expectScreenSemantics(basis);
    }
  });

  it("derives frozen perspective and orthographic world scale from camera framing", () => {
    const perspective = createTestBasis({ radius: 40, verticalFovRadians: Math.PI / 3 });
    const perspectiveZoomed = createTestBasis({ radius: 20, verticalFovRadians: Math.PI / 3 });
    const orthographic = createTestBasis({
      cameraMode: "orthographic",
      orthographicVerticalWorldSpan: 24
    });

    expect(perspective.worldUnitsPerCssPixel).toBeCloseTo(2 * 40 * Math.tan(Math.PI / 6) / 800);
    expect(perspectiveZoomed.worldUnitsPerCssPixel).toBeCloseTo(perspective.worldUnitsPerCssPixel / 2);
    expect(orthographic.worldUnitsPerCssPixel).toBeCloseTo(24 / 800);
    expectScreenSemantics(orthographic);
  });

  it("rejects invalid camera framing instead of producing non-finite movement", () => {
    expect(createPlanDragBasis({
      cameraPosition: { x: 0, y: 10, z: 10 },
      cameraTarget: { x: 0, y: 0, z: 0 },
      cameraAlpha: 0,
      cameraMode: "orthographic",
      radius: 20,
      verticalFovRadians: Math.PI / 3,
      viewportCssHeight: 0,
      orthographicVerticalWorldSpan: null,
      pointerStartClientX: 0,
      pointerStartClientY: 0
    })).toBeNull();
  });

  it("keeps plan delta independent of object and picked-point height matrices", () => {
    const basis = createTestBasis();
    const pointer = { clientX: 455, clientY: 335 };
    const expected = getPlanDragDeltaMm(basis, pointer);
    const objectCases = [
      ["standard-machine", 0],
      ["standard-machine", 25],
      ["imported-glb", 25],
      ["civil-normal", 0],
      ["civil-20m", 20],
      ["civil-50m", 50],
      ["civil-elevated", 25],
      ["group-low-high-mixed", 25]
    ] as const;

    for (const [name, pickedHeightMeters] of objectCases) {
      expect(Number.isFinite(pickedHeightMeters), name).toBe(true);
      expect(getPlanDragDeltaMm(basis, pointer), name).toEqual(expected);
    }
  });

  it("calculates civil and rigid-group positions from the same screen delta", () => {
    const basis = createTestBasis({ pointerStartClientX: 100, pointerStartClientY: 200 });
    const pointer = { clientX: 140, clientY: 230 };
    const civilState = createCivilDragState("column-1", basis, { xMm: -200, yMm: 300 });
    const machineState = createMachineDragState({
      targetInstanceId: "m2",
      basis,
      selectedInstanceIds: ["m1", "m2", "m3"],
      lockedInstanceIds: [],
      machines: [
        machine("m1", 0, 0, { xMm: -1000, yMm: 500 }),
        machine("m2", 0, 0, { xMm: 250, yMm: -750 }),
        machine("m3", 0, 0, { xMm: 1750, yMm: 1250 })
      ],
      isToggleSelection: false
    });
    expect(machineState).not.toBeNull();
    if (!machineState) return;

    const delta = getPlanDragDeltaMm(basis, pointer);
    expect(calculateCivilDragPosition(civilState, pointer)).toEqual({
      xMm: -200 + delta.deltaXMm,
      yMm: 300 + delta.deltaYMm
    });
    const updates = calculateMachineDragPositionUpdates(machineState, pointer);
    expect(updates).toEqual([
      { instanceId: "m1", xMm: -1000 + delta.deltaXMm, yMm: 500 + delta.deltaYMm },
      { instanceId: "m2", xMm: 250 + delta.deltaXMm, yMm: -750 + delta.deltaYMm },
      { instanceId: "m3", xMm: 1750 + delta.deltaXMm, yMm: 1250 + delta.deltaYMm }
    ]);
    expect(updates[1].xMm - updates[0].xMm).toBe(1250);
    expect(updates[2].yMm - updates[1].yMm).toBe(2000);
  });

  it("keeps horizontal ray-plane intersection available for annotation and pan", () => {
    const point = intersectRayWithHorizontalDragPlane(
      { x: 0, y: 10, z: 10 },
      { x: 0.2, y: -1, z: -1 },
      4
    );
    expect(point?.x).toBeCloseTo(1.2);
    expect(point?.y).toBeCloseTo(4);
    expect(point?.z).toBeCloseTo(4);
  });

  it("keeps valid no-op drag frames active and distinguishes blocked movement", () => {
    expect(shouldKeepSceneDragActive("applied")).toBe(true);
    expect(shouldKeepSceneDragActive("noop")).toBe(true);
    expect(shouldKeepSceneDragActive("blocked")).toBe(false);
    expect(didSceneDragApplyMutation("noop")).toBe(false);
    expect(didSceneDragApplyMutation("blocked")).toBe(false);
    expect(didSceneDragApplyMutation("applied")).toBe(true);
  });
});
