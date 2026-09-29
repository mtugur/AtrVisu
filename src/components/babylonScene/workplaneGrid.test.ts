import { describe, expect, it } from "vitest";
import type { CivilReferenceItem } from "../../types/civil";
import type { PlacedMachine } from "../../types/machine";
import { getBoundsFromReferenceMm } from "../../utils/coordinateReference";
import {
  calculateSceneWorkplaneBounds,
  calculateWorkplaneBoundsFromPlanBounds,
  EMPTY_WORKPLANE_BOUNDS_MM,
  getWorldGridPhaseMm,
  WORKPLANE_CONTENT_MARGIN_MM,
  WORKPLANE_GRID_MAJOR_SPACING_MM,
  WORKPLANE_GRID_MINOR_SPACING_MM
} from "./workplaneGrid";

const machine = (xMm: number, yMm: number, widthMm: number, depthMm: number, rotationDeg = 0) => ({
  instanceId: `machine-${xMm}-${yMm}`,
  position: { x: xMm / 1000, y: 0, z: yMm / 1000 },
  positionMm: { xMm, yMm },
  rotationY: rotationDeg,
  rotationDeg,
  coordinateReferenceVersion: "front-left-bottom-v1",
  definition: {
    widthMm,
    depthMm,
    heightMm: 1000,
    width: widthMm / 1000,
    depth: depthMm / 1000,
    height: 1
  }
} as unknown as PlacedMachine);

const civil = (xMm: number, yMm: number, widthMm: number, depthMm: number, rotationDeg = 0) => ({
  id: `civil-${xMm}-${yMm}`,
  type: "wall",
  name: "Wall",
  positionMm: { xMm, yMm, zMm: 0 },
  sizeMm: { widthMm, depthMm, heightMm: 1000 },
  rotationDeg,
  coordinateReferenceVersion: "front-left-bottom-v1",
  createdAt: "",
  updatedAt: ""
} as CivilReferenceItem);

describe("workplane grid bounds", () => {
  it("uses the exact empty 40000 x 40000 world-origin bounds", () => {
    expect(calculateWorkplaneBoundsFromPlanBounds([])).toEqual(EMPTY_WORKPLANE_BOUNDS_MM);
  });

  it("contains one Machine, one Civil, and their mixed union", () => {
    const oneMachine = calculateSceneWorkplaneBounds({
      machines: [machine(1_000, 2_000, 4_000, 2_000)],
      civilReferences: []
    });
    const oneCivil = calculateSceneWorkplaneBounds({
      machines: [],
      civilReferences: [civil(-8_000, 3_000, 6_000, 800)]
    });
    const mixed = calculateSceneWorkplaneBounds({
      machines: [machine(1_000, 2_000, 4_000, 2_000)],
      civilReferences: [civil(-8_000, 3_000, 6_000, 800)]
    });

    expect(oneMachine.widthMm).toBeGreaterThanOrEqual(40_000);
    expect(oneCivil.depthMm).toBeGreaterThanOrEqual(40_000);
    expect(mixed.minXMm).toBeLessThanOrEqual(-8_000 - WORKPLANE_CONTENT_MARGIN_MM);
    expect(mixed.maxXMm).toBeGreaterThanOrEqual(5_000 + WORKPLANE_CONTENT_MARGIN_MM);
  });

  it.each([
    ["Wall", getBoundsFromReferenceMm({ xMm: 17_000, yMm: -6_000 }, { widthMm: 28_000, depthMm: 600 }, 45)],
    ["Beam", getBoundsFromReferenceMm({ xMm: -31_000, yMm: 12_000 }, { widthMm: 18_000, depthMm: 500 }, 28)],
    ["Machine", getBoundsFromReferenceMm({ xMm: 22_000, yMm: 19_000 }, { widthMm: 9_000, depthMm: 2_500 }, 63)]
  ])("contains a rotated %s world AABB with margin before outward rounding", (_label, rotatedBounds) => {
    const bounds = calculateWorkplaneBoundsFromPlanBounds([rotatedBounds]);
    expect(bounds.minXMm).toBeLessThanOrEqual(rotatedBounds.minXMm - WORKPLANE_CONTENT_MARGIN_MM);
    expect(bounds.maxXMm).toBeGreaterThanOrEqual(rotatedBounds.maxXMm + WORKPLANE_CONTENT_MARGIN_MM);
    expect(bounds.minYMm).toBeLessThanOrEqual(rotatedBounds.minYMm - WORKPLANE_CONTENT_MARGIN_MM);
    expect(bounds.maxYMm).toBeGreaterThanOrEqual(rotatedBounds.maxYMm + WORKPLANE_CONTENT_MARGIN_MM);
    expect(Math.abs(bounds.minXMm % WORKPLANE_GRID_MAJOR_SPACING_MM)).toBe(0);
    expect(Math.abs(bounds.maxYMm % WORKPLANE_GRID_MAJOR_SPACING_MM)).toBe(0);
  });

  it("keeps world-origin grid phase stable when content moves", () => {
    const before = calculateSceneWorkplaneBounds({
      machines: [machine(0, 0, 2_000, 2_000)],
      civilReferences: []
    });
    const after = calculateSceneWorkplaneBounds({
      machines: [machine(37_250, -12_750, 2_000, 2_000)],
      civilReferences: []
    });

    expect(getWorldGridPhaseMm(before.minXMm, WORKPLANE_GRID_MINOR_SPACING_MM)).toBe(0);
    expect(getWorldGridPhaseMm(after.minXMm, WORKPLANE_GRID_MINOR_SPACING_MM)).toBe(0);
    expect(getWorldGridPhaseMm(before.minXMm, WORKPLANE_GRID_MAJOR_SPACING_MM)).toBe(0);
    expect(getWorldGridPhaseMm(after.minXMm, WORKPLANE_GRID_MAJOR_SPACING_MM)).toBe(0);
  });

  it("keeps huge finite world coordinates finite", () => {
    const bounds = calculateWorkplaneBoundsFromPlanBounds([
      getBoundsFromReferenceMm(
        { xMm: 1_000_000_000_000, yMm: -1_000_000_000_000 },
        { widthMm: 20_000, depthMm: 8_000 },
        37
      )
    ]);
    expect(Object.values(bounds).every(Number.isFinite)).toBe(true);
  });
});
