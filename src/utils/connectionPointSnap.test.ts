import { describe, expect, it } from "vitest";
import type { MachineConnectionPoint } from "../types/ataraMachineData";
import type { MachineDefinition, PlacedMachine } from "../types/machine";
import {
  applyConnectionPointSnap,
  evaluateConnectionPointSnapCandidate,
  formatConnectionPointSelectorLabel,
  getConnectionPointCompatibility,
  getConnectionPointSnapDelta
} from "./connectionPointSnap";

const point = (
  id: string,
  type: MachineConnectionPoint["type"],
  xMm: number,
  yMm: number,
  direction: MachineConnectionPoint["direction"],
  name = id
): MachineConnectionPoint => ({
  id,
  name,
  type,
  positionMm: { xMm, yMm, zMm: 500 },
  direction
});

const definition = (id: string, connectionPoints: MachineConnectionPoint[]): MachineDefinition => ({
  id,
  name: id,
  category: "Conveyor",
  widthMm: 2000,
  depthMm: 1000,
  heightMm: 1000,
  width: 2,
  depth: 1,
  height: 1,
  defaultColor: "#cccccc",
  connectionPoints: [],
  capabilities: {
    canConvey: true,
    canPalletize: false,
    canWrap: false,
    hasFlowDirection: true
  },
  ataraMachineData: {
    connectionPoints
  }
});

const machine = (
  instanceId: string,
  xMm: number,
  yMm: number,
  rotationDeg: number,
  connectionPoints: MachineConnectionPoint[]
): PlacedMachine => {
  const itemDefinition = definition(instanceId, connectionPoints);
  return {
    instanceId,
    machineDefinitionId: itemDefinition.id,
    definition: itemDefinition,
    definitionSnapshot: itemDefinition,
    position: { x: xMm / 1000, z: yMm / 1000 },
    positionMm: { xMm, yMm },
    elevationMm: 0,
    rotationDeg,
    rotationY: rotationDeg,
    flowDirection: "forward"
  };
};

describe("connection point snap helpers", () => {
  const movingOut = point("CP-OUT", "product-out", 1000, 0, "x+", "Product Out");
  const fixedIn = point("CP-IN", "product-in", -1000, 0, "x-", "Product In");

  it("formats useful selector labels", () => {
    expect(formatConnectionPointSelectorLabel(movingOut)).toBe("Product Out - CP-OUT - Product Out");
  });

  it("reports product-out to product-in compatibility", () => {
    const moving = machine("moving", 0, 0, 0, [movingOut]);
    const fixed = machine("fixed", 5000, 0, 0, [fixedIn]);
    expect(getConnectionPointCompatibility(moving, fixed, movingOut, fixedIn)).toMatchObject({
      level: "good"
    });
  });

  it("warns for same product connection type", () => {
    const moving = machine("moving", 0, 0, 0, [movingOut]);
    const fixed = machine("fixed", 5000, 0, 0, [movingOut]);
    const compatibility = getConnectionPointCompatibility(moving, fixed, movingOut, movingOut);
    expect(compatibility.level).toBe("warning");
    expect(compatibility.messages.join(" ")).toContain("Same connection type selected");
  });

  it("handles missing point selection safely", () => {
    expect(getConnectionPointCompatibility(undefined, undefined, undefined, undefined)).toMatchObject({
      level: "invalid"
    });
  });

  it("marks snap candidate missing when one or both machines have no connection points", () => {
    const moving = machine("moving", 0, 0, 0, []);
    const fixed = machine("fixed", 5000, 0, 0, [fixedIn]);

    expect(evaluateConnectionPointSnapCandidate(moving, fixed, undefined, fixedIn)).toMatchObject({
      status: "missing-points",
      canSnap: false
    });
    expect(evaluateConnectionPointSnapCandidate(moving, machine("empty-fixed", 5000, 0, 0, []), undefined, undefined)).toMatchObject({
      status: "missing-points",
      canSnap: false
    });
  });

  it("does not allow snap candidate when snap is disabled", () => {
    const moving = machine("moving", 0, 0, 0, [movingOut]);
    const fixed = machine("fixed", 5000, 0, 0, [fixedIn]);

    expect(evaluateConnectionPointSnapCandidate(moving, fixed, movingOut, fixedIn, { enabled: false })).toEqual({
      status: "disabled",
      canSnap: false
    });
  });

  it("rejects snap candidate outside the configured distance threshold", () => {
    const moving = machine("moving", 0, 0, 0, [movingOut]);
    const fixed = machine("fixed", 5000, 0, 0, [fixedIn]);
    const evaluation = evaluateConnectionPointSnapCandidate(moving, fixed, movingOut, fixedIn, {
      maxSnapDistanceMm: 2500
    });

    expect(evaluation.status).toBe("out-of-threshold");
    expect(evaluation.canSnap).toBe(false);
    expect(evaluation.distanceMm).toBe(3000);
  });

  it("accepts snap candidate inside the configured distance threshold", () => {
    const moving = machine("moving", 0, 0, 0, [movingOut]);
    const fixed = machine("fixed", 5000, 0, 0, [fixedIn]);
    const evaluation = evaluateConnectionPointSnapCandidate(moving, fixed, movingOut, fixedIn, {
      maxSnapDistanceMm: 3500
    });

    expect(evaluation.status).toBe("ready");
    expect(evaluation.canSnap).toBe(true);
    expect(evaluation.distanceMm).toBe(3000);
    expect(evaluation.delta).toMatchObject({ deltaXMm: 3000, deltaYMm: 0 });
  });

  it("calculates zero-gap delta without rotation", () => {
    const moving = machine("moving", 0, 0, 0, [movingOut]);
    const fixed = machine("fixed", 5000, 0, 0, [fixedIn]);
    expect(getConnectionPointSnapDelta(moving, fixed, movingOut, fixedIn, 0)).toMatchObject({
      deltaXMm: 3000,
      deltaYMm: 0
    });
  });

  it("calculates delta with 90 degree object rotation", () => {
    const moving = machine("moving", 0, 0, 90, [movingOut]);
    const fixed = machine("fixed", 5000, 0, 0, [fixedIn]);
    expect(getConnectionPointSnapDelta(moving, fixed, movingOut, fixedIn, 0)).toMatchObject({
      deltaXMm: 4000,
      deltaYMm: -1000
    });
  });

  it("applies snap with zero gap and keeps fixed object unchanged", () => {
    const moving = machine("moving", 0, 0, 0, [movingOut]);
    const fixed = machine("fixed", 5000, 0, 0, [fixedIn]);
    const result = applyConnectionPointSnap(
      [moving, fixed],
      { movingMachineId: "moving", fixedMachineId: "fixed", movingPointId: "CP-OUT", fixedPointId: "CP-IN", gapMm: 0 },
      movingOut,
      fixedIn
    );
    expect(result.find((item) => item.instanceId === "moving")?.positionMm).toEqual({ xMm: 3000, yMm: 0 });
    expect(result.find((item) => item.instanceId === "fixed")?.positionMm).toEqual({ xMm: 5000, yMm: 0 });
  });

  it("applies snap with 500 mm gap along fixed point world direction", () => {
    const moving = machine("moving", 0, 0, 0, [movingOut]);
    const fixed = machine("fixed", 5000, 0, 0, [fixedIn]);
    const result = applyConnectionPointSnap(
      [moving, fixed],
      { movingMachineId: "moving", fixedMachineId: "fixed", movingPointId: "CP-OUT", fixedPointId: "CP-IN", gapMm: 500 },
      movingOut,
      fixedIn
    );
    expect(result.find((item) => item.instanceId === "moving")?.positionMm).toEqual({ xMm: 2500, yMm: 0 });
  });
});

