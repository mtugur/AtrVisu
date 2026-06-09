import { describe, expect, it } from "vitest";
import {
  applyPositionSnap,
  applyRotationSnap,
  commitRotationAngle,
  distanceBetweenPlanPositionsMm,
  getRotationNudgeStepDeg,
  normalizeRotationDeg,
  snapDeg,
  snapMm
} from "./placement";
import { DEFAULT_PLACEMENT_SETTINGS, normalizePlacementSettings } from "./placementSettings";

describe("placement helpers", () => {
  it("snaps millimeter values to the nearest grid step", () => {
    expect(snapMm(2876, 100)).toBe(2900);
  });

  it("preserves millimeter precision when the step is 1 mm", () => {
    expect(snapMm(2876, 1)).toBe(2876);
  });

  it("returns original position when grid snap is disabled", () => {
    const position = { xMm: 2876, yMm: -1224 };

    expect(applyPositionSnap(position, { ...DEFAULT_PLACEMENT_SETTINGS, gridSnapEnabled: false })).toEqual(position);
  });

  it("snaps rotation to degree steps", () => {
    expect(snapDeg(92, 15)).toBe(90);
    expect(applyRotationSnap(88, DEFAULT_PLACEMENT_SETTINGS)).toBe(90);
  });

  it("snaps rotation to 45 degree steps", () => {
    expect(snapDeg(50, 45)).toBe(45);
    expect(snapDeg(70, 45)).toBe(90);
    expect(snapDeg(135, 45)).toBe(135);
  });

  it("uses rotation snap step for plus/minus nudges when enabled", () => {
    expect(getRotationNudgeStepDeg({ ...DEFAULT_PLACEMENT_SETTINGS, rotationSnapStepDeg: 45 })).toBe(45);
    expect(applyRotationSnap(90 + getRotationNudgeStepDeg({ ...DEFAULT_PLACEMENT_SETTINGS, rotationSnapStepDeg: 45 }), {
      ...DEFAULT_PLACEMENT_SETTINGS,
      rotationSnapStepDeg: 45
    })).toBe(135);
  });

  it("uses one degree plus/minus nudges when rotation snap is disabled", () => {
    expect(getRotationNudgeStepDeg({ ...DEFAULT_PLACEMENT_SETTINGS, rotationSnapEnabled: false })).toBe(1);
  });

  it("commits manual rotation with snap enabled or disabled", () => {
    expect(commitRotationAngle(50, { ...DEFAULT_PLACEMENT_SETTINGS, rotationSnapStepDeg: 45 })).toBe(45);
    expect(commitRotationAngle(50, { ...DEFAULT_PLACEMENT_SETTINGS, rotationSnapEnabled: false })).toBe(50);
  });

  it("normalizes rotation degrees into 0..359", () => {
    expect(normalizeRotationDeg(450)).toBe(90);
    expect(normalizeRotationDeg(-90)).toBe(270);
  });

  it("calculates plan distance in millimeters", () => {
    expect(distanceBetweenPlanPositionsMm({ xMm: 0, yMm: 0 }, { xMm: 3000, yMm: 4000 })).toBe(5000);
  });

  it("normalizes invalid placement settings safely", () => {
    expect(
      normalizePlacementSettings({
        gridSnapEnabled: "yes",
        gridSnapStepMm: -10,
        rotationSnapEnabled: false,
        rotationSnapStepDeg: 720,
        showMeasurementHelpers: "no"
      })
    ).toEqual({
      gridSnapEnabled: true,
      gridSnapStepMm: 100,
      rotationSnapEnabled: false,
      rotationSnapStepDeg: 15,
      showMeasurementHelpers: true
    });
  });
});
