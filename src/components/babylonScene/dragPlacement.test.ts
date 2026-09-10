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
  type DraggableMachine,
  type PlanDragFrame,
  type PlanDragProjection,
  type RayPointMeters,
  type ScreenPointCss
} from "./dragPlacement";

type Vector3Like = RayPointMeters;

type TestCamera = {
  mode: "perspective" | "orthographic";
  position: Vector3Like;
  target: Vector3Like;
  verticalFovRadians?: number;
  orthographicVerticalSpan?: number;
  width?: number;
  height?: number;
};

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

const subtract = (left: Vector3Like, right: Vector3Like): Vector3Like => ({
  x: left.x - right.x,
  y: left.y - right.y,
  z: left.z - right.z
});

const add = (left: Vector3Like, right: Vector3Like): Vector3Like => ({
  x: left.x + right.x,
  y: left.y + right.y,
  z: left.z + right.z
});

const scale = (point: Vector3Like, amount: number): Vector3Like => ({
  x: point.x * amount,
  y: point.y * amount,
  z: point.z * amount
});

const dot = (left: Vector3Like, right: Vector3Like) =>
  left.x * right.x + left.y * right.y + left.z * right.z;

const cross = (left: Vector3Like, right: Vector3Like): Vector3Like => ({
  x: left.y * right.z - left.z * right.y,
  y: left.z * right.x - left.x * right.z,
  z: left.x * right.y - left.y * right.x
});

const normalize = (point: Vector3Like): Vector3Like => {
  const length = Math.hypot(point.x, point.y, point.z);
  return length > 0
    ? scale(point, 1 / length)
    : { x: 0, y: 0, z: 0 };
};

const getCameraAxes = (camera: TestCamera) => {
  const forward = normalize(subtract(camera.target, camera.position));
  const rawRight = cross(forward, { x: 0, y: 1, z: 0 });
  const right = Math.hypot(rawRight.x, rawRight.y, rawRight.z) > 0.000001
    ? normalize(rawRight)
    : { x: 1, y: 0, z: 0 };
  const up = normalize(cross(right, forward));
  return { forward, right, up };
};

const projectToScreen = (camera: TestCamera, point: Vector3Like): ScreenPointCss | null => {
  const width = camera.width ?? 1000;
  const height = camera.height ?? 800;
  const { forward, right, up } = getCameraAxes(camera);
  const relative = subtract(point, camera.position);
  const cameraX = dot(relative, right);
  const cameraY = dot(relative, up);
  const cameraZ = dot(relative, forward);
  if (!Number.isFinite(cameraZ) || cameraZ <= 0.000001) {
    return null;
  }
  if (camera.mode === "orthographic") {
    const verticalSpan = camera.orthographicVerticalSpan ?? 20;
    return {
      x: width / 2 + cameraX * height / verticalSpan,
      y: height / 2 - cameraY * height / verticalSpan
    };
  }
  const tangent = Math.tan((camera.verticalFovRadians ?? Math.PI / 3) / 2);
  return {
    x: width / 2 + cameraX / (cameraZ * tangent) * height / 2,
    y: height / 2 - cameraY / (cameraZ * tangent) * height / 2
  };
};

const createPointerRay = (camera: TestCamera, pointer: ScreenPointCss) => {
  const width = camera.width ?? 1000;
  const height = camera.height ?? 800;
  const { forward, right, up } = getCameraAxes(camera);
  const normalizedX = (pointer.x - width / 2) / (height / 2);
  const normalizedY = -(pointer.y - height / 2) / (height / 2);
  if (camera.mode === "orthographic") {
    const verticalSpan = camera.orthographicVerticalSpan ?? 20;
    return {
      origin: add(camera.position, add(
        scale(right, normalizedX * verticalSpan / 2),
        scale(up, normalizedY * verticalSpan / 2)
      )),
      direction: forward
    };
  }
  const tangent = Math.tan((camera.verticalFovRadians ?? Math.PI / 3) / 2);
  return {
    origin: camera.position,
    direction: normalize(add(forward, add(
      scale(right, normalizedX * tangent),
      scale(up, normalizedY * tangent)
    )))
  };
};

const createProjection = (
  camera: TestCamera,
  anchorPoint: RayPointMeters,
  maxIncrementMeters = 8
) => {
  const pointer = projectToScreen(camera, anchorPoint);
  if (!pointer) {
    throw new Error("Expected anchor to project in front of the test camera.");
  }
  const ray = createPointerRay(camera, pointer);
  const projection = createPlanDragProjection({
    rayOrigin: ray.origin,
    rayDirection: ray.direction,
    pickedPoint: anchorPoint,
    maxIncrementMeters
  });
  if (!projection) {
    throw new Error("Expected a valid plan-drag projection.");
  }
  return { pointer, projection };
};

const resolveFrame = (
  camera: TestCamera,
  projection: PlanDragProjection,
  pointer: ScreenPointCss
) => {
  const ray = createPointerRay(camera, pointer);
  const frame = resolvePlanDragFrame({
    projection,
    rayOrigin: ray.origin,
    rayDirection: ray.direction,
    pointerScreen: pointer,
    projectToScreen: (point) => projectToScreen(camera, point)
  });
  if (!frame) {
    throw new Error("Expected a finite plan-drag frame.");
  }
  return frame;
};

const expectGrabLock = (
  camera: TestCamera,
  anchorPoint: RayPointMeters,
  deltaX: number,
  deltaY: number,
  label = "drag case"
) => {
  const { pointer, projection } = createProjection(camera, anchorPoint);
  const target = { x: pointer.x + deltaX, y: pointer.y + deltaY };
  const frame = resolveFrame(camera, projection, target);
  expect(frame.pointerErrorPx, label).toBeLessThanOrEqual(2);
  expect(projectToScreen(camera, frame.anchorPoint)).toEqual(expect.objectContaining({
    x: expect.closeTo(target.x, 5),
    y: expect.closeTo(target.y, 5)
  }));
  expect(frame.anchorPoint.y).toBe(anchorPoint.y);
  expect([frame.deltaMeters.x, frame.deltaMeters.z].every(Number.isFinite)).toBe(true);
  return frame;
};

describe("drag placement helpers", () => {
  it("preserves machine selection, lock, and millimeter start-position contracts", () => {
    expect(getMachineDragInstanceIds("m1", ["m1", "m2"], [], false)).toEqual(["m1", "m2"]);
    expect(getMachineDragInstanceIds("m3", ["m1", "m2"], [], false)).toEqual(["m3"]);
    expect(getMachineDragInstanceIds("m1", ["m1", "m2"], [], true)).toEqual(["m1"]);
    expect(getMachineDragInstanceIds("m1", ["m1", "m2"], ["m2"], false)).toEqual([]);
    expect(getMachineStartPositionMm(machine("m1", 2.5, -1.25, { xMm: 2510, yMm: -1260 })))
      .toEqual({ xMm: 2510, yMm: -1260 });
    expect(getMachineStartPositionMm(machine("m2", 2.5, -1.25)))
      .toEqual({ xMm: 2500, yMm: -1250 });
  });

  it("captures the real picked surface and leaves caller-owned input untouched", () => {
    const camera: TestCamera = {
      mode: "perspective",
      position: { x: 20, y: 16, z: 30 },
      target: { x: 0, y: 0, z: 0 }
    };
    const pickedPoint = { x: 1, y: 4.25, z: -2 };
    const { projection } = createProjection(camera, pickedPoint);
    expect(projection.anchorPoint).toEqual(pickedPoint);
    expect(projection.anchorPoint).not.toBe(pickedPoint);
    expect(projection.startPoint.y).toBe(4.25);
    expect(projection.lastDeltaMeters).toEqual({ x: 0, z: 0 });
    expect(projection.usedFallback).toBe(false);
  });

  it("snapshots getter-backed Babylon-style picked coordinates", () => {
    const values = { x: 1.5, y: 2.75, z: -3.25 };
    const pickedPoint = Object.create({}, {
      x: { get: () => values.x },
      y: { get: () => values.y },
      z: { get: () => values.z }
    }) as RayPointMeters;
    const camera: TestCamera = {
      mode: "perspective",
      position: { x: 20, y: 16, z: 30 },
      target: { x: 0, y: 0, z: 0 }
    };
    const { projection } = createProjection(camera, pickedPoint);
    values.x = 99;
    expect(projection.anchorPoint).toEqual({ x: 1.5, y: 2.75, z: -3.25 });
  });

  it("does not start direct manipulation without a finite real picked point", () => {
    expect(createPlanDragProjection({
      rayOrigin: { x: 0, y: 10, z: 10 },
      rayDirection: { x: 0, y: -1, z: -1 },
      pickedPoint: { x: Number.NaN, y: 0, z: 0 },
      maxIncrementMeters: 4
    })).toBeNull();
  });

  it("accepts forward horizontal-plane intersections above and below the working plane", () => {
    expect(intersectRayWithHorizontalDragPlane(
      { x: 0, y: 10, z: 10 },
      { x: 0.2, y: -1, z: -1 },
      4
    )).toEqual(expect.objectContaining({ y: 4 }));
    const upward = intersectRayWithHorizontalDragPlane(
      { x: 0, y: -10, z: 10 },
      { x: 0.2, y: 1, z: -1 },
      4
    );
    expect(upward).toEqual(expect.objectContaining({ y: 4 }));
    expect(upward?.z).toBeLessThan(10);
  });

  it("keeps perspective grab lock above and below the plane at target Y 0 and 25", () => {
    const cases = [
      { cameraY: 24, targetY: 0, anchorY: 4 },
      { cameraY: -12, targetY: 0, anchorY: 4 },
      { cameraY: 44, targetY: 25, anchorY: 29 },
      { cameraY: 12, targetY: 25, anchorY: 29 }
    ];
    for (const item of cases) {
      const camera: TestCamera = {
        mode: "perspective",
        position: { x: 20, y: item.cameraY, z: 30 },
        target: { x: 0, y: item.targetY, z: 0 }
      };
      expectGrabLock(camera, { x: 1.5, y: item.anchorY, z: -2 }, 55, 32);
    }
  });

  it("keeps perspective grab lock across alpha, zoom, steep, and top-down framing", () => {
    const cameras: Array<{ name: string; camera: TestCamera }> = [
      { name: "alpha-a", camera: { mode: "perspective", position: { x: 30, y: 18, z: 10 }, target: { x: 0, y: 0, z: 0 } } },
      { name: "alpha-b", camera: { mode: "perspective", position: { x: -18, y: 18, z: 24 }, target: { x: 0, y: 0, z: 0 } } },
      { name: "near", camera: { mode: "perspective", position: { x: 8, y: 7, z: 10 }, target: { x: 0, y: 0, z: 0 } } },
      { name: "far", camera: { mode: "perspective", position: { x: 52, y: 40, z: 68 }, target: { x: 0, y: 0, z: 0 } } },
      { name: "top-down", camera: { mode: "perspective", position: { x: 8, y: 70, z: 10 }, target: { x: 0, y: 0, z: 0 } } }
    ];
    for (const { name, camera } of cameras) {
      expectGrabLock(camera, { x: 1.25, y: 0, z: -1.5 }, 42, -28, name);
    }
  });

  it("keeps orthographic grab lock above and below the plane", () => {
    for (const cameraY of [30, -15]) {
      expectGrabLock({
        mode: "orthographic",
        position: { x: 20, y: cameraY, z: 30 },
        target: { x: 0, y: 4, z: 0 },
        orthographicVerticalSpan: 24
      }, { x: 1.25, y: 4, z: -2 }, 60, 35);
    }
  });

  it("uses bounded Jacobian continuation in shallow, level, and near-horizon neighborhoods", () => {
    for (const cameraY of [25, 25.2]) {
      const camera: TestCamera = {
        mode: "perspective",
        position: { x: 0, y: cameraY, z: 35 },
        target: { x: 0, y: 25, z: 0 }
      };
      const anchor = { x: 0, y: 25, z: 0 };
      const created = createProjection(camera, anchor, 1.5);
      let projection = created.projection;
      let previous: PlanDragFrame | null = null;
      for (const deltaY of [1, 3, 6, 12, 24, 40]) {
        const frame = resolveFrame(camera, projection, {
          x: created.pointer.x + 35,
          y: created.pointer.y + deltaY
        });
        expect(frame.mode).toBe("screen-jacobian");
        expect([frame.deltaMeters.x, frame.deltaMeters.z, frame.pointerErrorPx].every(Number.isFinite)).toBe(true);
        if (previous) {
          expect(Math.hypot(
            frame.deltaMeters.x - previous.deltaMeters.x,
            frame.deltaMeters.z - previous.deltaMeters.z
          )).toBeLessThanOrEqual(1.500001);
        }
        expect(Math.hypot(frame.deltaMeters.x, frame.deltaMeters.z)).toBeLessThanOrEqual(9.000001);
        projection = frame.projection;
        previous = frame;
      }
    }
  });

  it("does not teleport when the pointer leaves the singular neighborhood", () => {
    const camera: TestCamera = {
      mode: "perspective",
      position: { x: 0, y: 25.001, z: 35 },
      target: { x: 0, y: 25, z: 0 }
    };
    const anchor = { x: 0, y: 25, z: 0 };
    const created = createProjection(camera, anchor, 2);
    const near = resolveFrame(camera, created.projection, {
      x: created.pointer.x + 20,
      y: created.pointer.y + 2
    });
    const leaving = resolveFrame(camera, near.projection, {
      x: created.pointer.x + 30,
      y: created.pointer.y + 24
    });
    expect([near.pointerErrorPx, leaving.pointerErrorPx].every(Number.isFinite)).toBe(true);
    expect(Math.hypot(
      leaving.deltaMeters.x - near.deltaMeters.x,
      leaving.deltaMeters.z - near.deltaMeters.z
    )).toBeLessThanOrEqual(2.000001);
  });

  it("covers machine imported GLB civil and mixed-elevation anchor matrices", () => {
    const objectCases = [
      ["standard-machine", 1.2],
      ["standard-machine-25m", 26.2],
      ["imported-glb-25m", 27],
      ["civil-normal", 1],
      ["civil-20m", 18],
      ["civil-50m", 45],
      ["civil-elevated-25m", 27],
      ["group-low-member", 1],
      ["group-high-member", 27],
      ["group-mixed-elevation", 18]
    ] as const;
    for (const [name, anchorY] of objectCases) {
      const camera: TestCamera = {
        mode: "perspective",
        position: { x: 24, y: anchorY + 18, z: 34 },
        target: { x: 0, y: anchorY, z: 0 }
      };
      expectGrabLock(camera, { x: 1, y: anchorY, z: -2 }, 36, 24);
      expect(Number.isFinite(anchorY), name).toBe(true);
    }
  });

  it("applies one exact Plan delta to civil and all rigid group members", () => {
    const camera: TestCamera = {
      mode: "perspective",
      position: { x: 20, y: 18, z: 30 },
      target: { x: 0, y: 0, z: 0 }
    };
    const created = createProjection(camera, { x: 0, y: 2, z: 0 });
    const frame = resolveFrame(camera, created.projection, {
      x: created.pointer.x + 40,
      y: created.pointer.y + 25
    });
    const civilState = createCivilDragState("column-1", created.projection, { xMm: -200, yMm: 300 });
    const machineState = createMachineDragState({
      targetInstanceId: "m2",
      projection: created.projection,
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

    const civil = calculateCivilDragPosition(civilState, frame.deltaMeters);
    const updates = calculateMachineDragPositionUpdates(machineState, frame.deltaMeters);
    expect(updates[0].xMm + 800).toBeCloseTo(civil.xMm);
    expect(updates[0].yMm - 200).toBeCloseTo(civil.yMm);
    expect(updates[1].xMm - updates[0].xMm).toBe(1250);
    expect(updates[2].yMm - updates[1].yMm).toBeCloseTo(2000);
  });

  it("returns null for locked or unresolved machine drag members", () => {
    const camera: TestCamera = {
      mode: "perspective",
      position: { x: 20, y: 16, z: 30 },
      target: { x: 0, y: 0, z: 0 }
    };
    const { projection } = createProjection(camera, { x: 0, y: 0, z: 0 });
    expect(createMachineDragState({
      targetInstanceId: "m1",
      projection,
      selectedInstanceIds: ["m1"],
      lockedInstanceIds: ["m1"],
      machines: [machine("m1", 0, 0)],
      isToggleSelection: false
    })).toBeNull();
    expect(createMachineDragState({
      targetInstanceId: "m1",
      projection,
      selectedInstanceIds: ["m1", "missing"],
      lockedInstanceIds: [],
      machines: [machine("m1", 0, 0)],
      isToggleSelection: false
    })).toBeNull();
  });

  it("keeps valid snapped no-op frames active and distinguishes blocked movement", () => {
    expect(shouldKeepSceneDragActive("applied")).toBe(true);
    expect(shouldKeepSceneDragActive("noop")).toBe(true);
    expect(shouldKeepSceneDragActive("blocked")).toBe(false);
    expect(didSceneDragApplyMutation("noop")).toBe(false);
    expect(didSceneDragApplyMutation("blocked")).toBe(false);
    expect(didSceneDragApplyMutation("applied")).toBe(true);
  });
});
