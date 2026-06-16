import { describe, expect, it } from "vitest";
import {
  getBoundsFromReferenceMm,
  getCivilReferenceFootprintBoundsMm,
  getCenterFromReferenceMm,
  getReferenceFromCenterMm
} from "./coordinateReference";

describe("coordinate reference helpers", () => {
  it("converts front-left-bottom reference to render center without rotation", () => {
    expect(getCenterFromReferenceMm({ xMm: 1000, yMm: 2000 }, { widthMm: 4000, depthMm: 2000 }, 0)).toEqual({
      xMm: 3000,
      yMm: 3000
    });
  });

  it("converts legacy render center back to front-left-bottom reference", () => {
    expect(getReferenceFromCenterMm({ xMm: 3000, yMm: 3000 }, { widthMm: 4000, depthMm: 2000 }, 0)).toEqual({
      xMm: 1000,
      yMm: 2000
    });
  });

  it("keeps the reference point stable while bounds rotate around it", () => {
    const center = getCenterFromReferenceMm({ xMm: 0, yMm: 0 }, { widthMm: 2000, depthMm: 1000 }, 90);
    expect(Math.round(center.xMm)).toBe(-500);
    expect(Math.round(center.yMm)).toBe(1000);

    const bounds = getBoundsFromReferenceMm({ xMm: 0, yMm: 0 }, { widthMm: 2000, depthMm: 1000 }, 90);
    expect(Math.round(bounds.minXMm)).toBe(-1000);
    expect(Math.round(bounds.maxXMm)).toBe(0);
    expect(Math.round(bounds.minYMm)).toBe(0);
    expect(Math.round(bounds.maxYMm)).toBe(2000);
  });

  it("calculates civil reference bounds from front-left-bottom reference", () => {
    const bounds = getCivilReferenceFootprintBoundsMm({
      id: "column-1",
      type: "column",
      name: "Column 1",
      positionMm: { xMm: 1000, yMm: -2000, zMm: 0 },
      referencePoint: "front-left-bottom",
      coordinateReferenceVersion: "front-left-bottom-v1",
      sizeMm: { widthMm: 600, depthMm: 800, heightMm: 3000 },
      rotationDeg: 0,
      createdAt: "now",
      updatedAt: "now"
    });

    expect(bounds).toMatchObject({
      minXMm: 1000,
      maxXMm: 1600,
      minYMm: -2000,
      maxYMm: -1200,
      widthMm: 600,
      depthMm: 800
    });
  });
});
