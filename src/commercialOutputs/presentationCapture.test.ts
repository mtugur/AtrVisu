import { describe, expect, it, vi } from "vitest";
import { captureWithoutEditorAffordances } from "./presentationCapture";

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
});
