import { describe, expect, it } from "vitest";
import { getRuntimeViewportShellResizeReason } from "./runtimeViewportShell";

describe("runtime viewport shell resize intent", () => {
  it("classifies right-panel close and reopen as committed collapse resize", () => {
    expect(getRuntimeViewportShellResizeReason(
      { isPanelCollapsed: false, panelWidth: 360 },
      { isPanelCollapsed: true, panelWidth: 360 }
    )).toBe("dock-collapse");
    expect(getRuntimeViewportShellResizeReason(
      { isPanelCollapsed: true, panelWidth: 360 },
      { isPanelCollapsed: false, panelWidth: 360 }
    )).toBe("dock-collapse");
  });

  it("classifies a committed panel-width change as dock resize", () => {
    expect(getRuntimeViewportShellResizeReason(
      { isPanelCollapsed: false, panelWidth: 360 },
      { isPanelCollapsed: false, panelWidth: 424 }
    )).toBe("dock-resize");
  });

  it("does not request resize for cancelled close or section-only changes", () => {
    const unchanged = { isPanelCollapsed: false, panelWidth: 360 };

    expect(getRuntimeViewportShellResizeReason(unchanged, unchanged)).toBeNull();
    expect(getRuntimeViewportShellResizeReason(
      unchanged,
      { ...unchanged }
    )).toBeNull();
  });

  it("preserves panel width across close and reopen state transitions", () => {
    const open = { isPanelCollapsed: false, panelWidth: 418 };
    const collapsed = { ...open, isPanelCollapsed: true };
    const reopened = { ...collapsed, isPanelCollapsed: false };

    expect(collapsed.panelWidth).toBe(open.panelWidth);
    expect(reopened.panelWidth).toBe(open.panelWidth);
  });
});
