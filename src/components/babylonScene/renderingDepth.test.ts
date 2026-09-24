import { describe, expect, it, vi } from "vitest";
import {
  preserveWorldGeometryDepthAcrossRenderingGroups,
  WORLD_GEOMETRY_RENDERING_GROUP_ID
} from "./renderingDepth";

describe("Babylon rendering-group world depth", () => {
  it("preserves group-zero depth before floor and planning geometry renders", () => {
    const setRenderingAutoClearDepthStencil = vi.fn();

    preserveWorldGeometryDepthAcrossRenderingGroups({ setRenderingAutoClearDepthStencil });

    expect(WORLD_GEOMETRY_RENDERING_GROUP_ID).toBe(1);
    expect(setRenderingAutoClearDepthStencil).toHaveBeenCalledOnce();
    expect(setRenderingAutoClearDepthStencil).toHaveBeenCalledWith(1, false);
  });
});
