import { NullEngine, Scene } from "@babylonjs/core";
import { describe, expect, it } from "vitest";
import { getViewportVisualPalette } from "../../designSystem";
import { createWorkplaneGridMaterial, applyWorkplaneGridPalette, GRID_FRAGMENT_SOURCE, GRID_VERTEX_SOURCE, GRID_SAMPLING } from "./workplaneGridMaterial";

describe("world-phase analytical grid presentation", () => {
  it.each(["light", "dark"] as const)("uses the %s palette without textures, lighting or world-spacing changes", theme => {
    const engine = new NullEngine(); const scene = new Scene(engine);
    const material = createWorkplaneGridMaterial(scene, getViewportVisualPalette(theme));
    const serialized = material.serialize();
    expect(serialized.floats).toMatchObject({ minorSpacing: 1, majorSpacing: 5, halfWidth: 0.6, fadeStart: 4, fadeEnd: 2 });
    expect(serialized.colors3.fillColor).toHaveLength(3);
    const initialFloats = serialized.floats;
    applyWorkplaneGridPalette(material, getViewportVisualPalette(theme === "light" ? "dark" : "light"));
    expect(material.serialize().floats).toEqual(initialFloats);
    expect(scene.textures).toHaveLength(0);
    expect(material.disableDepthWrite).toBe(true);
    expect(material.needAlphaBlending()).toBe(false);
    scene.dispose(); engine.dispose();
  });
  it("derives line phase from actual world position, not changing bounds, UV tiles or a camera offset", () => {
    expect(GRID_VERTEX_SOURCE).toContain("world * vec4(position, 1.0)");
    expect(GRID_FRAGMENT_SOURCE).toContain("coordinate = worldPlan / spacing");
    expect(GRID_FRAGMENT_SOURCE).toContain("fwidth(worldPlan)");
    expect(GRID_FRAGMENT_SOURCE).toContain("lineIntegral(coordinate + footprint * 0.5, width)");
    expect(GRID_FRAGMENT_SOURCE).toContain("minor *= smoothstep(fadeEnd, fadeStart");
    expect(GRID_FRAGMENT_SOURCE).toContain("major = gridCoverage(majorSpacing)");
    expect(GRID_FRAGMENT_SOURCE).not.toContain("major *=");
    expect(GRID_SAMPLING.phaseOriginMeters).toBe(0);
    expect(GRID_SAMPLING.fadeEndPeriodPixels).toBeLessThan(GRID_SAMPLING.fadeStartPeriodPixels);
  });
});
