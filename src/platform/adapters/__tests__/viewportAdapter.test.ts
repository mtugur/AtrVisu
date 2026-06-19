import { describe, expect, it } from "vitest";
import {
  createSafeViewportResizeRequest,
  normalizeViewportSize,
  validateViewportSize
} from "../viewportAdapter";

describe("viewport adapter", () => {
  it("creates preserve-only safe resize requests", () => {
    expect(createSafeViewportResizeRequest("dock-resize", { width: 1200, height: 800 })).toEqual({
      reason: "dock-resize",
      nextSize: { width: 1200, height: 800 },
      preserveCamera: true,
      preserveSelection: true,
      preserveEntityTransforms: true
    });
  });

  it("supports dock-collapse reason", () => {
    expect(createSafeViewportResizeRequest("dock-collapse", { width: 1440, height: 900 }).reason).toBe("dock-collapse");
  });

  it("normalizes invalid size values", () => {
    expect(normalizeViewportSize({ width: 0, height: Number.NaN })).toEqual({ width: 1, height: 1 });
    expect(normalizeViewportSize({ width: -5, height: 600 })).toEqual({ width: 1, height: 600 });
  });

  it("validates positive width and height", () => {
    expect(validateViewportSize({ width: 1, height: 1 })).toBe(true);
    expect(validateViewportSize({ width: 0, height: 1 })).toBe(false);
    expect(validateViewportSize({ width: 1, height: -1 })).toBe(false);
    expect(validateViewportSize({ width: Number.NaN, height: 1 })).toBe(false);
  });
});

