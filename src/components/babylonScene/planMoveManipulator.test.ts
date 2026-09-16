import { describe, expect, it } from "vitest";
import type { PlanBounds } from "../../types/alignment";
import {
  createPlanMoveGestureHistoryTracker,
  createPlanMovePositionUpdates,
  derivePlanMoveSelection,
  resolvePlanMoveDeltaMm,
  type PlanMoveMember
} from "./planMoveManipulator";

const bounds = (centerXMm: number, centerYMm: number, widthMm = 1000, depthMm = 1000): PlanBounds => ({
  centerXMm,
  centerYMm,
  minXMm: centerXMm - widthMm / 2,
  maxXMm: centerXMm + widthMm / 2,
  minYMm: centerYMm - depthMm / 2,
  maxYMm: centerYMm + depthMm / 2,
  widthMm,
  depthMm
});
const member = (
  entityId: string,
  xMm: number,
  yMm: number,
  elevationMm = 0,
  options: Partial<PlanMoveMember> = {}
): PlanMoveMember => ({
  entityId,
  kind: entityId.startsWith("civil:") ? "civil" : "machine",
  positionMm: { xMm, yMm },
  bounds: bounds(xMm, yMm),
  verticalCenterMm: elevationMm + 500,
  elevationMm,
  ...options
});

describe("Plan Move Manipulator contract", () => {
  it("derives selection-bounds pivots for Machine, Civil, rigid Group members, and independent multi-selection", () => {
    expect(derivePlanMoveSelection(["machine:a"], [member("machine:a", 1000, 2000)])?.pivotMm)
      .toEqual({ xMm: 1000, yMm: 2000, zMm: 0 });
    expect(derivePlanMoveSelection(["civil:c"], [member("civil:c", -500, 800, 20_000)])?.pivotMm)
      .toEqual({ xMm: -500, yMm: 800, zMm: 20_000 });
    const groupMembers = [member("machine:a", 0, 0), member("civil:c", 4000, 2000, 50_000)];
    expect(derivePlanMoveSelection(groupMembers.map((item) => item.entityId), groupMembers)?.pivotMm)
      .toEqual({ xMm: 2000, yMm: 1000, zMm: 0 });
    expect(derivePlanMoveSelection(["machine:a", "civil:c"], groupMembers)?.members).toHaveLength(2);
  });

  it("anchors presentation at the stable working elevation for tall and mixed selections", () => {
    const tallColumn = member("civil:column", 0, 0, 0, { verticalCenterMm: 25_000 });
    expect(derivePlanMoveSelection([tallColumn.entityId], [tallColumn])?.pivotMm.zMm).toBe(0);

    const elevatedMachine = member("machine:elevated", 0, 0, 25_000, { verticalCenterMm: 25_500 });
    expect(derivePlanMoveSelection([elevatedMachine.entityId], [elevatedMachine])?.pivotMm.zMm).toBe(25_000);

    expect(derivePlanMoveSelection(
      [tallColumn.entityId, elevatedMachine.entityId],
      [tallColumn, elevatedMachine]
    )?.pivotMm.zMm).toBe(0);

    const rigidTallColumnGroup = [
      member("machine:base", -1000, 0, 0),
      member("civil:tall-column", 1000, 0, 0, { verticalCenterMm: 25_000 })
    ];
    expect(derivePlanMoveSelection(
      rigidTallColumnGroup.map((item) => item.entityId),
      rigidTallColumnGroup
    )?.pivotMm.zMm).toBe(0);
  });

  it("maps world X, Babylon Z, and XZ plane handles to canonical domain Plan axes", () => {
    const snapshot = derivePlanMoveSelection(["machine:a"], [member("machine:a", 1000, 2000)])!;
    const settings = { gridSnapEnabled: false, gridSnapStepMm: 100 };
    expect(resolvePlanMoveDeltaMm({ snapshot, proxyPosition: { x: 2.5, z: 5 }, axis: "x", settings }))
      .toEqual({ deltaXMm: 1500, deltaYMm: 0 });
    expect(resolvePlanMoveDeltaMm({ snapshot, proxyPosition: { x: 2.5, z: 5 }, axis: "plan-y", settings }))
      .toEqual({ deltaXMm: 0, deltaYMm: 3000 });
    expect(resolvePlanMoveDeltaMm({ snapshot, proxyPosition: { x: 2.5, z: 5 }, axis: "plane", settings }))
      .toEqual({ deltaXMm: 1500, deltaYMm: 3000 });
  });

  it("uses absolute-from-start targets so repeated frames cannot accumulate drift", () => {
    const snapshot = derivePlanMoveSelection(
      ["machine:a", "civil:c"],
      [member("machine:a", 100, 200), member("civil:c", 900, -300)]
    )!;
    const frame = resolvePlanMoveDeltaMm({
      snapshot,
      proxyPosition: { x: 1.75, z: 0.95 },
      axis: "plane",
      settings: { gridSnapEnabled: false, gridSnapStepMm: 100 }
    });
    expect(createPlanMovePositionUpdates(snapshot, frame)).toEqual(createPlanMovePositionUpdates(snapshot, frame));
    expect(createPlanMovePositionUpdates(snapshot, frame)).toEqual({
      machines: [{ instanceId: "a", xMm: 1350, yMm: 1200 }],
      civilReferences: [{ id: "c", xMm: 2150, yMm: 700 }]
    });
  });

  it("applies AtrVisu snap from an off-grid start without changing member offsets", () => {
    const snapshot = derivePlanMoveSelection(
      ["machine:a", "machine:b"],
      [member("machine:a", 125, 275), member("machine:b", 1125, 2275)]
    )!;
    const free = resolvePlanMoveDeltaMm({
      snapshot,
      proxyPosition: { x: 1.225, z: 2.775 },
      axis: "plane",
      settings: { gridSnapEnabled: false, gridSnapStepMm: 100 }
    });
    const snapped = resolvePlanMoveDeltaMm({
      snapshot,
      proxyPosition: { x: 1.225, z: 2.775 },
      axis: "plane",
      settings: { gridSnapEnabled: true, gridSnapStepMm: 100 }
    });
    expect(free).toEqual({ deltaXMm: 600, deltaYMm: 1500 });
    expect(snapped).toEqual({ deltaXMm: 575, deltaYMm: 1525 });
    const updates = createPlanMovePositionUpdates(snapshot, snapped).machines;
    expect(updates[1].xMm - updates[0].xMm).toBe(1000);
    expect(updates[1].yMm - updates[0].yMm).toBe(2000);
  });

  it("blocks locked, hidden, and unresolved selections before any partial movement", () => {
    expect(derivePlanMoveSelection(["machine:a"], [member("machine:a", 0, 0, 0, { locked: true })])).toBeNull();
    expect(derivePlanMoveSelection(["civil:c"], [member("civil:c", 0, 0, 0, { hidden: true })])).toBeNull();
    expect(derivePlanMoveSelection(["machine:missing"], [member("machine:a", 0, 0)])).toBeNull();
  });

  it("keeps elevations invariant for standard/imported machines and 20m/50m mixed groups", () => {
    const members = [
      member("machine:standard", 0, 0, 0),
      member("machine:imported", 1000, 0, 2500),
      member("civil:20m", 2000, 0, 20_000),
      member("civil:50m", 3000, 0, 50_000)
    ];
    const snapshot = derivePlanMoveSelection(members.map((item) => item.entityId), members)!;
    const before = snapshot.members.map((item) => item.elevationMm);
    createPlanMovePositionUpdates(snapshot, { deltaXMm: 800, deltaYMm: -400 });
    expect(snapshot.members.map((item) => item.elevationMm)).toEqual(before);
  });

  it("records at most one history transaction for one accepted gesture", () => {
    const history = createPlanMoveGestureHistoryTracker();
    expect(history.shouldRecord()).toBe(true);
    history.accept("noop");
    expect(history.shouldRecord()).toBe(true);
    history.accept("applied");
    expect(history.shouldRecord()).toBe(false);
    history.accept("applied");
    expect(history.shouldRecord()).toBe(false);
  });
});
