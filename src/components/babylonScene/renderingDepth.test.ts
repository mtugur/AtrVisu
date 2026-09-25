import { describe, expect, it, vi } from "vitest";
import {
  getCivilRenderingGroupId,
  PHYSICAL_WORLD_RENDERING_GROUP_ID,
  PLANNING_REFERENCE_RENDERING_GROUP_ID,
  preserveWorldGeometryDepthAcrossRenderingGroups,
} from "./renderingDepth";

describe("Babylon rendering-group world depth", () => {
  it("keeps physical Civil geometry in group zero and planning references in group one", () => {
    expect(PHYSICAL_WORLD_RENDERING_GROUP_ID).toBe(0);
    expect(PLANNING_REFERENCE_RENDERING_GROUP_ID).toBe(1);
    expect(([
      "floor-area",
      "wall",
      "column",
      "beam"
    ] as const).map(getCivilRenderingGroupId)).toEqual([0, 0, 0, 0]);
    expect(([
      "door-opening",
      "restricted-area",
      "walkway",
      "reference-zone"
    ] as const).map(getCivilRenderingGroupId)).toEqual([1, 1, 1, 1]);
  });

  it("preserves physical-world depth before planning geometry renders", () => {
    const setRenderingAutoClearDepthStencil = vi.fn();

    preserveWorldGeometryDepthAcrossRenderingGroups({ setRenderingAutoClearDepthStencil });

    expect(setRenderingAutoClearDepthStencil).toHaveBeenCalledOnce();
    expect(setRenderingAutoClearDepthStencil).toHaveBeenCalledWith(
      PLANNING_REFERENCE_RENDERING_GROUP_ID,
      false
    );
  });
});
