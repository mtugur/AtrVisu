import { describe, expect, it, vi } from "vitest";
import {
  captureWithoutEditorAffordances,
  compositeRgbaOverBackground
} from "./presentationCapture";

describe("presentation capture", () => {
  it("temporarily hides editor affordances and restores every visibility state", async () => {
    const visible = { isVisible: true };
    const hidden = { isVisible: false };
    const capture = vi.fn(async () => {
      expect(visible.isVisible).toBe(false);
      expect(hidden.isVisible).toBe(false);
      return "image";
    });
    await expect(captureWithoutEditorAffordances([visible, hidden], capture)).resolves.toBe("image");
    expect(capture).toHaveBeenCalledOnce();
    expect(visible.isVisible).toBe(true);
    expect(hidden.isVisible).toBe(false);
  });

  it("restores affordances when capture fails", async () => {
    const target = { isVisible: true };
    await expect(captureWithoutEditorAffordances([target], async () => {
      throw new Error("capture failed");
    })).rejects.toThrow("capture failed");
    expect(target.isVisible).toBe(true);
  });

  it("composites transparent presentation pixels over the active viewport background", () => {
    const source = new Uint8Array([
      0, 0, 0, 0,
      10, 20, 30, 255,
      200, 100, 0, 128
    ]);

    expect([...compositeRgbaOverBackground(source, [100, 200, 250])]).toEqual([
      100, 200, 250, 255,
      10, 20, 30, 255,
      150, 150, 125, 255
    ]);
    expect([...source]).toEqual([
      0, 0, 0, 0,
      10, 20, 30, 255,
      200, 100, 0, 128
    ]);
  });
});
