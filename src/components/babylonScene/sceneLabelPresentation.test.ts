import { describe, expect, it, vi } from "vitest";
import {
  drawSceneLabelText,
  getSceneLabelPresentation
} from "./sceneLabelPresentation";

const createTexture = () => {
  const calls: string[] = [];
  const context = {
    beginPath: vi.fn(() => calls.push("beginPath")),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    quadraticCurveTo: vi.fn(),
    closePath: vi.fn(),
    fill: vi.fn(() => calls.push("fill")),
    stroke: vi.fn(() => calls.push("stroke")),
    fillText: vi.fn(() => calls.push("text")),
    measureText: vi.fn(() => ({ width: 220 })),
    save: vi.fn(() => calls.push("save")),
    restore: vi.fn(() => calls.push("restore")),
    font: "",
    textAlign: "start",
    textBaseline: "alphabetic",
    fillStyle: "",
    strokeStyle: "",
    lineWidth: 0
  };
  const texture = {
    clear: vi.fn(() => calls.push("clear")),
    getContext: vi.fn(() => context),
    getSize: vi.fn(() => ({ width: 512, height: 128 })),
    update: vi.fn(() => calls.push("update"))
  };
  return { calls, context, texture };
};

describe("scene label presentation", () => {
  it("uses immutable neutral contrast treatments for dark and light viewports", () => {
    const dark = getSceneLabelPresentation("dark");
    const light = getSceneLabelPresentation("light");

    expect(dark.textColor).toBe("#f8fbf6");
    expect(light.textColor).toBe("#f8fbf6");
    expect(dark.backgroundColor).toMatch(/^rgba\(/);
    expect(light.backgroundColor).toMatch(/^rgba\(/);
    expect(light.backgroundColor).not.toBe(dark.backgroundColor);
    expect(Object.isFrozen(dark)).toBe(true);
    expect(Object.isFrozen(light)).toBe(true);
  });

  it.each(["dark", "light"] as const)(
    "draws a tight neutral backplate before %s-theme label text",
    (theme) => {
      const { calls, context, texture } = createTexture();

      drawSceneLabelText(texture as never, "Flow Pack Machine", theme);

      expect(calls).toEqual([
        "clear",
        "save",
        "beginPath",
        "fill",
        "stroke",
        "text",
        "restore",
        "update"
      ]);
      expect(context.fillText).toHaveBeenCalledWith("Flow Pack Machine", 256, 65, 440);
      expect(context.fillStyle).toBe(getSceneLabelPresentation(theme).textColor);
      expect(context.strokeStyle).toBe(getSceneLabelPresentation(theme).borderColor);
    }
  );

  it("uses the same shared authority for compact connection-point labels", () => {
    const { context, texture } = createTexture();

    drawSceneLabelText(texture as never, "Product Out", "light", "connection-point");

    expect(context.fillText).toHaveBeenCalledWith("Product Out", 256, 65, 432);
  });
});
