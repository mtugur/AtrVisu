import { describe, expect, it, vi } from "vitest";
import { drawMachineLabelText } from "./machineLabelLifecycle";

describe("machine label lifecycle", () => {
  it("clears the existing texture before drawing a renamed instance label", () => {
    const calls: string[] = [];
    const texture = {
      clear: vi.fn(() => calls.push("clear")),
      drawText: vi.fn(() => calls.push("draw"))
    };

    drawMachineLabelText(texture, "Flow Pack Machine - Line 2", "#ffffff");

    expect(calls).toEqual(["clear", "draw"]);
    expect(texture.clear).toHaveBeenCalledOnce();
    expect(texture.drawText).toHaveBeenCalledWith(
      "Flow Pack Machine - Line 2",
      null,
      78,
      "bold 42px Arial",
      "#ffffff",
      null,
      true,
      true
    );
  });

  it("replaces each successive label render instead of compositing text", () => {
    let visibleText = "";
    const texture = {
      clear: vi.fn(() => { visibleText = ""; }),
      drawText: vi.fn((text: string) => { visibleText += text; })
    };

    drawMachineLabelText(texture, "Original", "#ffffff");
    drawMachineLabelText(texture, "Renamed", "#ffffff");

    expect(visibleText).toBe("Renamed");
    expect(texture.clear).toHaveBeenCalledTimes(2);
  });
});
