import { describe, expect, it } from "vitest";
import {
  calculateCivilDragPosition,
  calculateMachineDragPositionUpdates,
  createCivilDragState,
  createMachineDragState,
  createPlanDragProjection,
  getMachineDragInstanceIds,
  getMachineStartPositionMm,
  getHeightPreservingPlanDragPoint,
  getPlanDragDeltaMm,
  intersectRayWithHorizontalDragPlane,
  projectRayToPlanDrag,
  didSceneDragApplyMutation,
  shouldKeepSceneDragActive,
  type DraggableMachine,
  type MachineDragState,
  type PlanDragProjection,
  type RayPointMeters
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

const normalize = (point: RayPointMeters): RayPointMeters => {
  const length = Math.hypot(point.x, point.y, point.z);
  return { x: point.x / length, y: point.y / length, z: point.z / length };
};

const subtract = (left: RayPointMeters, right: RayPointMeters): RayPointMeters => ({
  x: left.x - right.x,
  y: left.y - right.y,
  z: left.z - right.z
});

const cross = (left: RayPointMeters, right: RayPointMeters): RayPointMeters => ({
  x: left.y * right.z - left.z * right.y,
  y: left.z * right.x - left.x * right.z,
  z: left.x * right.y - left.y * right.x
});

const addScaled = (
  point: RayPointMeters,
  first: RayPointMeters,
  firstScale: number,
  second: RayPointMeters,
  secondScale: number
): RayPointMeters => normalize({
  x: point.x + first.x * firstScale + second.x * secondScale,
  y: point.y + first.y * firstScale + second.y * secondScale,
  z: point.z + first.z * firstScale + second.z * secondScale
});

const createTestProjection = (
  anchorPoint: RayPointMeters = { x: 1, y: 2.4, z: -2 },
  rayOrigin: RayPointMeters = { x: 0, y: 10, z: 10 }
) => {
  const projection = createPlanDragProjection({
    rayOrigin,
    rayDirection: subtract(anchorPoint, rayOrigin),
    pickedPoint: anchorPoint
  });
  if (!projection) {
    throw new Error("Expected a valid test plan-drag projection.");
  }
  return projection;
};

type TestCamera = {
  name: string;
  mode: "perspective" | "orthographic";
  position: RayPointMeters;
  target: RayPointMeters;
};

const getCameraRay = (
  camera: TestCamera,
  pickedPoint: RayPointMeters,
  screenX: number,
  screenY: number
) => {
  const cameraForward = normalize(subtract(camera.target, camera.position));
  const cameraRight = normalize(cross(cameraForward, { x: 0, y: 1, z: 0 }));
  const cameraUp = normalize(cross(cameraRight, cameraForward));
  if (camera.mode === "orthographic") {
    const distance = Math.hypot(
      pickedPoint.x - camera.position.x,
      pickedPoint.y - camera.position.y,
      pickedPoint.z - camera.position.z
    );
    return {
      origin: {
        x: pickedPoint.x - cameraForward.x * distance + cameraRight.x * screenX + cameraUp.x * screenY,
        y: pickedPoint.y - cameraForward.y * distance + cameraRight.y * screenX + cameraUp.y * screenY,
        z: pickedPoint.z - cameraForward.z * distance + cameraRight.z * screenX + cameraUp.z * screenY
      },
      direction: cameraForward
    };
  }

  return {
    origin: camera.position,
    direction: addScaled(
      normalize(subtract(pickedPoint, camera.position)),
      cameraRight,
      screenX * 0.04,
      cameraUp,
      screenY * 0.04
    )
  };
};

const getPlanDelta = (projection: PlanDragProjection, point: RayPointMeters) => ({
  x: point.x - projection.startPoint.x,
  z: point.z - projection.startPoint.z
});

const planLength = (delta: { x: number; z: number }) => Math.hypot(delta.x, delta.z);

const expectOppositeFinitePlanMovement = (
  projection: PlanDragProjection,
  first: RayPointMeters | null,
  opposite: RayPointMeters | null
) => {
  expect(first).not.toBeNull();
  expect(opposite).not.toBeNull();
  if (!first || !opposite) return;
  const firstDelta = getPlanDelta(projection, first);
  const oppositeDelta = getPlanDelta(projection, opposite);
  expect(Object.values(firstDelta).every(Number.isFinite)).toBe(true);
  expect(Object.values(oppositeDelta).every(Number.isFinite)).toBe(true);
  expect(planLength(firstDelta)).toBeGreaterThan(0.000001);
  expect(planLength(oppositeDelta)).toBeGreaterThan(0.000001);
  expect(planLength(firstDelta)).toBeLessThan(200);
  expect(planLength(oppositeDelta)).toBeLessThan(200);
  expect(firstDelta.x * oppositeDelta.x + firstDelta.z * oppositeDelta.z).toBeLessThan(0);
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

  it("creates machine drag state with selected unlocked start positions", () => {
    const projection = createTestProjection();
    const dragState = createMachineDragState({
      targetInstanceId: "m1",
      projection,
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
      projection,
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
        projection: createTestProjection({ x: 0, y: 0.5, z: 0 }),
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
        projection: createTestProjection({ x: 0, y: 0.5, z: 0 }),
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
    const dragState = createCivilDragState(
      "column-1",
      createTestProjection({ x: 2, y: 2.75, z: 1 }),
      { xMm: -200, yMm: 300 }
    );

    const position = calculateCivilDragPosition(dragState, { x: 1.5, z: 2.25 });
    expect(position.xMm).toBeCloseTo(-700);
    expect(position.yMm).toBeCloseTo(1550);
  });

  it("calculates machine drag updates from original positions plus floor delta", () => {
    const dragState: MachineDragState = {
      instanceIds: ["m1", "m2", "missing"],
      projection: createTestProjection({ x: 0, y: 1.5, z: 0 }),
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
      projection: createTestProjection({ x: 4, y: 3.2, z: -1 }),
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

  it("uses the actual finite grab point and a truthful object-center fallback otherwise", () => {
    const picked = createPlanDragProjection({
      rayOrigin: { x: 0, y: 10, z: 10 },
      rayDirection: { x: 1, y: -5.75, z: -12 },
      pickedPoint: { x: 1, y: 4.25, z: -2 },
      fallbackPoint: { x: 3, y: 1.5, z: 4 }
    });
    const fallback = createPlanDragProjection({
      rayOrigin: { x: 0, y: 10, z: 10 },
      rayDirection: { x: 3, y: -8.5, z: -6 },
      pickedPoint: { x: Number.NaN, y: 4, z: 2 },
      fallbackPoint: { x: 3, y: 1.5, z: 4 }
    });

    expect(picked?.anchorPoint).toEqual({ x: 1, y: 4.25, z: -2 });
    expect(fallback?.anchorPoint).toEqual({ x: 3, y: 1.5, z: 4 });
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

  it("selects one camera-conditioned projection mode for the complete gesture", () => {
    const horizontal = createPlanDragProjection({
      rayOrigin: { x: 0, y: 17, z: 30 },
      rayDirection: { x: 0, y: -17, z: -30 },
      pickedPoint: { x: 0, y: 0, z: 0 }
    });
    const aboveCamera = createPlanDragProjection({
      rayOrigin: { x: 0, y: 17, z: 30 },
      rayDirection: { x: 0, y: 3, z: -30 },
      pickedPoint: { x: 0, y: 20, z: 0 }
    });
    const shallow = createPlanDragProjection({
      rayOrigin: { x: 0, y: 20, z: 30 },
      rayDirection: { x: 0, y: -1, z: -30 },
      pickedPoint: { x: 0, y: 19, z: 0 }
    });

    expect(horizontal?.mode).toBe("horizontal");
    expect(aboveCamera?.mode).toBe("camera-facing");
    expect(shallow?.mode).toBe("camera-facing");
    expect(projectRayToPlanDrag(aboveCamera!, { x: 0, y: 17, z: 30 }, { x: 0.1, y: 3, z: -30 }))
      .not.toBeNull();
    expect(aboveCamera?.mode).toBe("camera-facing");
  });

  it("falls back when a downward horizontal-plane candidate lies behind the pointer ray", () => {
    const projection = createPlanDragProjection({
      rayOrigin: { x: 0, y: 10, z: 10 },
      rayDirection: { x: 0, y: -2, z: -10 },
      fallbackPoint: { x: 0, y: 15, z: 0 }
    });

    expect(projection?.mode).toBe("camera-facing");
    expect(projection?.anchorPoint).toEqual({ x: 0, y: 15, z: 0 });
    expect(projection?.planeNormal).toEqual(normalize({ x: 0, y: -2, z: -10 }));
    expect(projection?.startPoint).not.toEqual(projection?.anchorPoint);
    expect(projection?.startPoint.x).toBeCloseTo(0);
    expect(projection?.startPoint.y).toBeCloseTo(8.2692307692);
    expect(projection?.startPoint.z).toBeCloseTo(1.3461538462);
  });

  it("keeps plan projection directional and finite across height and camera matrices", () => {
    const cameras: TestCamera[] = [
      { name: "normal", mode: "perspective", position: { x: 22, y: 17, z: 28 }, target: { x: 0, y: 0, z: 0 } },
      { name: "near", mode: "perspective", position: { x: 8, y: 7, z: 10 }, target: { x: 0, y: 0, z: 0 } },
      { name: "far", mode: "perspective", position: { x: 52, y: 40, z: 68 }, target: { x: 0, y: 0, z: 0 } },
      { name: "shallow", mode: "perspective", position: { x: 24, y: 4, z: 36 }, target: { x: 0, y: 0, z: 0 } },
      { name: "elevated-target", mode: "perspective", position: { x: 22, y: 42, z: 28 }, target: { x: 0, y: 25, z: 0 } },
      { name: "orthographic", mode: "orthographic", position: { x: 22, y: 42, z: 28 }, target: { x: 0, y: 25, z: 0 } }
    ];
    const elevations = [0, 5, 15, 20, 25, 40, 50];
    const objectCases = ["tall-object", "elevated-ordinary-object"];

    for (const camera of cameras) {
      for (const elevation of elevations) {
        for (const objectCase of objectCases) {
          const pickedPoint = { x: 1.5, y: elevation, z: -2.25 };
          const startRay = getCameraRay(camera, pickedPoint, 0, 0);
          const projection = createPlanDragProjection({
            rayOrigin: startRay.origin,
            rayDirection: startRay.direction,
            pickedPoint
          });
          expect(projection, `${camera.name}/${objectCase}/${elevation}m`).not.toBeNull();
          if (!projection) continue;

          const project = (screenX: number, screenY: number) => {
            const ray = getCameraRay(camera, pickedPoint, screenX, screenY);
            return projectRayToPlanDrag(projection, ray.origin, ray.direction);
          };
          expectOppositeFinitePlanMovement(projection, project(1, 0), project(-1, 0));
          expectOppositeFinitePlanMovement(projection, project(0, 1), project(0, -1));
          expect(projection.anchorPoint.y).toBe(elevation);
          expect(["horizontal", "camera-facing"]).toContain(projection.mode);
        }
      }
    }
  });

  it("remains continuous when the picked elevation crosses the camera elevation", () => {
    const camera: TestCamera = {
      name: "camera-crossing",
      mode: "perspective",
      position: { x: 0, y: 20, z: 30 },
      target: { x: 0, y: 0, z: 0 }
    };

    for (const elevation of [19.99, 20, 20.01, 25, 40, 50]) {
      const pickedPoint = { x: 0, y: elevation, z: 0 };
      const startRay = getCameraRay(camera, pickedPoint, 0, 0);
      const projection = createPlanDragProjection({
        rayOrigin: startRay.origin,
        rayDirection: startRay.direction,
        pickedPoint
      });
      expect(projection?.mode).toBe("camera-facing");
      if (!projection) continue;
      const rightRay = getCameraRay(camera, pickedPoint, 0.5, 0);
      const right = projectRayToPlanDrag(projection, rightRay.origin, rightRay.direction);
      expect(right).not.toBeNull();
      if (!right) continue;
      expect(planLength(getPlanDelta(projection, right))).toBeLessThan(50);
      expect(getHeightPreservingPlanDragPoint(projection, right).y).toBe(elevation);
    }
  });
});
