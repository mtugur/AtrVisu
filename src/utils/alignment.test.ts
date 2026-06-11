import { describe, expect, it } from "vitest";
import type { MachineDefinition, PlacedMachine } from "../types/machine";
import {
  alignObjectsToAnchor,
  applyPairAlignment,
  distributeObjectsByCenter,
  equalizeGaps,
  getFootprintAnchorPoint,
  moveObjectsByDelta,
  snapPrimaryAnchorToSecondaryAnchor
} from "./alignment";
import { getObjectPlanBounds, getSelectionPlanBounds } from "./selectionBounds";

const definition = (id: string, widthMm: number, depthMm: number): MachineDefinition => ({
  id,
  name: id,
  category: "Test",
  widthMm,
  depthMm,
  heightMm: 1000,
  width: widthMm / 1000,
  depth: depthMm / 1000,
  height: 1,
  defaultColor: "#88aa44",
  connectionPoints: [],
  capabilities: {
    canConvey: false,
    canPalletize: false,
    canWrap: false,
    hasFlowDirection: false
  }
});

const machine = (
  instanceId: string,
  xMm: number,
  yMm: number,
  widthMm = 1000,
  depthMm = 1000,
  rotationDeg = 0
): PlacedMachine => {
  const itemDefinition = definition(`${instanceId}-definition`, widthMm, depthMm);

  return {
    instanceId,
    machineDefinitionId: itemDefinition.id,
    definitionSnapshot: itemDefinition,
    definition: itemDefinition,
    position: { x: xMm / 1000, z: yMm / 1000 },
    positionMm: { xMm, yMm },
    elevationMm: 0,
    rotationDeg,
    rotationY: rotationDeg,
    flowDirection: "forward"
  };
};

describe("selection bounds", () => {
  it("calculates object bounds in millimeters", () => {
    expect(getObjectPlanBounds(machine("a", 1000, 2000, 2000, 1000))).toMatchObject({
      minXMm: 0,
      maxXMm: 2000,
      minYMm: 1500,
      maxYMm: 2500,
      widthMm: 2000,
      depthMm: 1000
    });
  });

  it("uses an axis-aligned bounding box for rotated objects", () => {
    const bounds = getObjectPlanBounds(machine("a", 0, 0, 2000, 1000, 90));
    expect(bounds.widthMm).toBeCloseTo(1000);
    expect(bounds.depthMm).toBeCloseTo(2000);
  });

  it("calculates aggregate selection bounds", () => {
    expect(getSelectionPlanBounds([machine("a", 0, 0, 1000, 1000), machine("b", 3000, 0, 1000, 1000)])).toMatchObject({
      minXMm: -500,
      maxXMm: 3500,
      widthMm: 4000
    });
  });
});

describe("alignment helpers", () => {
  it("moves selected objects by the same delta", () => {
    const result = moveObjectsByDelta([machine("a", 0, 0), machine("b", 1000, 0)], ["a", "b"], 250, -100);
    expect(result.map((item) => item.positionMm)).toEqual([
      { xMm: 250, yMm: -100 },
      { xMm: 1250, yMm: -100 }
    ]);
  });

  it("aligns selected objects to the primary anchor and keeps the primary fixed", () => {
    const result = alignObjectsToAnchor(
      [machine("a", 0, 0, 1000, 1000), machine("b", 3000, 1500, 1000, 1000)],
      ["a", "b"],
      "a",
      "left"
    );
    expect(result.find((item) => item.instanceId === "a")?.positionMm?.xMm).toBe(0);
    expect(result.find((item) => item.instanceId === "b")?.positionMm?.xMm).toBe(0);
  });

  it("distributes selected objects by center", () => {
    const result = distributeObjectsByCenter(
      [machine("a", 0, 0), machine("b", 1000, 0), machine("c", 5000, 0)],
      ["a", "b", "c"],
      "horizontal"
    );
    expect(result.map((item) => item.positionMm?.xMm)).toEqual([0, 2500, 5000]);
  });

  it("equalizes gaps between selected objects", () => {
    const result = equalizeGaps(
      [machine("a", 0, 0, 1000, 1000), machine("b", 1500, 0, 1000, 1000), machine("c", 5000, 0, 1000, 1000)],
      ["a", "b", "c"],
      "gapX"
    );
    expect(result.map((item) => item.positionMm?.xMm)).toEqual([0, 2500, 5000]);
  });

  it("moves the primary object relative to the secondary in pair alignment", () => {
    const result = applyPairAlignment(
      [machine("primary", 0, 0, 1000, 1000), machine("secondary", 3000, 0, 1000, 1000)],
      ["primary", "secondary"],
      "primary",
      "leftToRight",
      500
    );
    expect(result.find((item) => item.instanceId === "primary")?.positionMm?.xMm).toBe(4500);
  });

  it("calculates footprint anchor points from metadata bounds", () => {
    expect(getFootprintAnchorPoint(machine("a", 1000, 2000, 2000, 1000), "frontRight")).toEqual({
      xMm: 2000,
      yMm: 1500
    });
  });

  it("snaps the primary center to the secondary center", () => {
    const result = snapPrimaryAnchorToSecondaryAnchor(
      [machine("primary", 0, 0), machine("secondary", 3000, 2000)],
      ["primary", "secondary"],
      "primary",
      "center",
      "center"
    );
    expect(result.find((item) => item.instanceId === "primary")?.positionMm).toEqual({ xMm: 3000, yMm: 2000 });
  });

  it("snaps primary edge and corner anchors to secondary anchors", () => {
    const result = snapPrimaryAnchorToSecondaryAnchor(
      [machine("primary", 0, 0, 1000, 1000), machine("secondary", 3000, 0, 1000, 1000)],
      ["primary", "secondary"],
      "primary",
      "rightCenter",
      "frontLeft"
    );
    expect(result.find((item) => item.instanceId === "primary")?.positionMm).toEqual({ xMm: 2000, yMm: -500 });
  });

  it("supports zero gap pair positioning", () => {
    const result = applyPairAlignment(
      [machine("primary", 0, 0, 1000, 1000), machine("secondary", 3000, 0, 1000, 1000)],
      ["primary", "secondary"],
      "primary",
      "leftToRight",
      0
    );
    expect(result.find((item) => item.instanceId === "primary")?.positionMm?.xMm).toBe(4000);
  });
});
