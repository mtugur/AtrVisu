import { describe, expect, it } from "vitest";
import { createViewportResizeRequest, validateViewportSize } from "../contracts";

describe("viewport contract", () => {
  it("represents dock-collapse resize as preserve-only viewport state", () => {
    const request = createViewportResizeRequest("dock-collapse", { width: 1440, height: 900 });

    expect(request).toEqual({
      reason: "dock-collapse",
      nextSize: { width: 1440, height: 900 },
      preserveCamera: true,
      preserveSelection: true,
      preserveEntityTransforms: true
    });
  });

  it("does not carry data mutation fields in resize requests", () => {
    const request = createViewportResizeRequest("dock-resize", { width: 1200, height: 800 });

    expect(Object.keys(request).sort()).toEqual([
      "nextSize",
      "preserveCamera",
      "preserveEntityTransforms",
      "preserveSelection",
      "reason"
    ]);
  });

  it("requires positive viewport width and height", () => {
    expect(() => validateViewportSize({ width: 0, height: 800 })).toThrow(/width/);
    expect(() => validateViewportSize({ width: 1200, height: -1 })).toThrow(/height/);
    expect(() => validateViewportSize({ width: 1200, height: 800 })).not.toThrow();
  });
});

