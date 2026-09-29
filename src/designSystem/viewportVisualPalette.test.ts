import { describe, expect, it } from "vitest";
import { getViewportVisualPalette, VIEWPORT_VISUAL_PALETTES } from "./viewportVisualPalette";

describe("viewport visual palette", () => {
  it("exposes the exact frozen dark palette", () => {
    expect(getViewportVisualPalette("dark")).toEqual({
      background: "#202326",
      workplaneFill: "#2B2F33",
      gridMinor: "#454C52",
      gridMajor: "#707981",
      neutralLight: "#F4F5F6"
    });
  });

  it("exposes the exact frozen light palette", () => {
    expect(getViewportVisualPalette("light")).toEqual({
      background: "#E7EAEC",
      workplaneFill: "#D9DEE1",
      gridMinor: "#BBC2C7",
      gridMajor: "#858F97",
      neutralLight: "#FFFFFF"
    });
  });

  it("does not expose mutable palette records", () => {
    expect(Object.isFrozen(VIEWPORT_VISUAL_PALETTES)).toBe(true);
    expect(Object.isFrozen(VIEWPORT_VISUAL_PALETTES.dark)).toBe(true);
    expect(() => {
      (VIEWPORT_VISUAL_PALETTES.dark as { background: string }).background = "changed";
    }).toThrow(TypeError);
  });
});
