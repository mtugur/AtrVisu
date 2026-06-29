import { describe, expect, it } from "vitest";
import { DEFAULT_PLACEMENT_SETTINGS } from "../../utils/placementSettings";
import {
  applyPlanRotationY,
  calculateSceneRotationNudgeDeg,
  commitSceneRotationInputDeg,
  getPlanRotationRadians,
  getRotationVectorRadians,
  getSceneRotationNudgeStepDeg
} from "./rotationGizmo";

describe("rotation gizmo helpers", () => {
  it("converts plan rotation degrees to Babylon radians", () => {
    expect(getPlanRotationRadians(0)).toBe(0);
    expect(getPlanRotationRadians(90)).toBeCloseTo(Math.PI / 2);
    expect(getPlanRotationRadians(180)).toBeCloseTo(Math.PI);
  });

  it("applies Y-axis plan rotation to a rotatable scene target", () => {
    const target = { rotation: { y: 0 } };

    expect(applyPlanRotationY(target, 45)).toBe(target);
    expect(target.rotation.y).toBeCloseTo(Math.PI / 4);
  });

  it("converts visual model rotation offsets to radians", () => {
    expect(getRotationVectorRadians({ x: 90, y: 180, z: 270 })).toEqual({
      x: Math.PI / 2,
      y: Math.PI,
      z: (Math.PI * 3) / 2
    });
  });

  it("commits manual rotation input with active snap settings", () => {
    expect(commitSceneRotationInputDeg(50, {
      ...DEFAULT_PLACEMENT_SETTINGS,
      rotationSnapEnabled: true,
      rotationSnapStepDeg: 45
    })).toBe(45);
    expect(commitSceneRotationInputDeg(50, {
      ...DEFAULT_PLACEMENT_SETTINGS,
      rotationSnapEnabled: false,
      rotationSnapStepDeg: 45
    })).toBe(50);
  });

  it("uses rotation snap step for nudge controls when snap is enabled", () => {
    const settings = {
      ...DEFAULT_PLACEMENT_SETTINGS,
      rotationSnapEnabled: true,
      rotationSnapStepDeg: 45
    };

    expect(getSceneRotationNudgeStepDeg(settings)).toBe(45);
    expect(calculateSceneRotationNudgeDeg(45, 1, settings)).toBe(90);
    expect(calculateSceneRotationNudgeDeg(45, -1, settings)).toBe(0);
  });

  it("uses one degree nudge controls and normalizes when snap is disabled", () => {
    const settings = {
      ...DEFAULT_PLACEMENT_SETTINGS,
      rotationSnapEnabled: false,
      rotationSnapStepDeg: 45
    };

    expect(getSceneRotationNudgeStepDeg(settings)).toBe(1);
    expect(calculateSceneRotationNudgeDeg(359, 1, settings)).toBe(0);
    expect(calculateSceneRotationNudgeDeg(0, -1, settings)).toBe(359);
  });
});
