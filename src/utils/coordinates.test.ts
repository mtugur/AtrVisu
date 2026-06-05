import { describe, expect, it } from "vitest";
import {
  planToScenePosition,
  rotationDegToRadians,
  rotationRadiansToDeg,
  sceneToPlanPosition
} from "./coordinates";

describe("coordinate conversion utilities", () => {
  it("maps plan millimeters to Babylon scene meters", () => {
    expect(planToScenePosition({ xMm: 2876, yMm: -1500 }, 800)).toEqual({
      x: 2.876,
      y: 0.8,
      z: -1.5
    });
  });

  it("maps scene meters back to plan millimeters", () => {
    expect(sceneToPlanPosition({ x: 2.876, y: 0.8, z: -1.5 })).toEqual({
      xMm: 2876,
      yMm: -1500
    });
  });

  it("round-trips rotation degrees and radians", () => {
    expect(rotationDegToRadians(180)).toBeCloseTo(Math.PI, 10);
    expect(rotationRadiansToDeg(rotationDegToRadians(37))).toBeCloseTo(37, 10);
  });
});
