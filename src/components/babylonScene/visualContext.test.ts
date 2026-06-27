import { describe, expect, it } from "vitest";
import {
  getSceneVisualContextGridLines,
  SCENE_VISUAL_CONTEXT_GRID_MAJOR_STEP,
  SCENE_VISUAL_CONTEXT_GRID_MINOR_STEP,
  SCENE_VISUAL_CONTEXT_GRID_SIZE
} from "./visualContext";

describe("scene visual context", () => {
  it("keeps the current grid constants", () => {
    expect(SCENE_VISUAL_CONTEXT_GRID_SIZE).toBe(42);
    expect(SCENE_VISUAL_CONTEXT_GRID_MAJOR_STEP).toBe(6);
    expect(SCENE_VISUAL_CONTEXT_GRID_MINOR_STEP).toBe(1);
  });

  it("creates the same x and z grid line descriptors", () => {
    const lines = getSceneVisualContextGridLines();
    const expectedIndexCount =
      (SCENE_VISUAL_CONTEXT_GRID_SIZE * 2) / SCENE_VISUAL_CONTEXT_GRID_MINOR_STEP + 1;

    expect(lines).toHaveLength(expectedIndexCount * 2);
    expect(lines[0]).toEqual({ axis: "x", index: -42, isMajor: true, thickness: 0.045 });
    expect(lines[1]).toEqual({ axis: "z", index: -42, isMajor: true, thickness: 0.045 });
    expect(lines[lines.length - 2]).toEqual({ axis: "x", index: 42, isMajor: true, thickness: 0.045 });
    expect(lines[lines.length - 1]).toEqual({ axis: "z", index: 42, isMajor: true, thickness: 0.045 });
  });

  it("marks non-major grid lines with the minor thickness", () => {
    const lines = getSceneVisualContextGridLines();

    expect(lines.find((line) => line.index === 5 && line.axis === "x")).toEqual({
      axis: "x",
      index: 5,
      isMajor: false,
      thickness: 0.018
    });
  });
});
