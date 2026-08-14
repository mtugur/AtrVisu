import { describe, expect, it } from "vitest";
import { getRuntimeViewportShellResizeReason } from "./runtimeViewportShell";

const createShellState = (overrides: Partial<Parameters<typeof getRuntimeViewportShellResizeReason>[0]> = {}) => ({
  isPanelCollapsed: false,
  panelWidth: 360,
  isPrimaryDockCollapsed: false,
  primaryDockWidth: 304,
  isBottomDockCollapsed: true,
  bottomDockHeight: 136,
  ...overrides
});

describe("runtime viewport shell resize intent", () => {
  it("classifies right-panel close and reopen as committed collapse resize", () => {
    expect(getRuntimeViewportShellResizeReason(
      createShellState(),
      createShellState({ isPanelCollapsed: true })
    )).toBe("dock-collapse");
    expect(getRuntimeViewportShellResizeReason(
      createShellState({ isPanelCollapsed: true }),
      createShellState()
    )).toBe("dock-collapse");
  });

  it("classifies Primary and Bottom Dock collapse changes as committed viewport resizes", () => {
    expect(getRuntimeViewportShellResizeReason(
      createShellState(),
      createShellState({ isPrimaryDockCollapsed: true })
    )).toBe("dock-collapse");
    expect(getRuntimeViewportShellResizeReason(
      createShellState(),
      createShellState({ isBottomDockCollapsed: false })
    )).toBe("dock-collapse");
  });

  it("classifies a committed panel-width change as dock resize", () => {
    expect(getRuntimeViewportShellResizeReason(
      createShellState(),
      createShellState({ panelWidth: 424 })
    )).toBe("dock-resize");
  });

  it("classifies Primary width and Bottom height changes as dock resizes", () => {
    expect(getRuntimeViewportShellResizeReason(
      createShellState(),
      createShellState({ primaryDockWidth: 404 })
    )).toBe("dock-resize");
    expect(getRuntimeViewportShellResizeReason(
      createShellState(),
      createShellState({ bottomDockHeight: 196 })
    )).toBe("dock-resize");
  });

  it("does not request resize for cancelled close or section-only changes", () => {
    const unchanged = createShellState();

    expect(getRuntimeViewportShellResizeReason(unchanged, unchanged)).toBeNull();
    expect(getRuntimeViewportShellResizeReason(
      unchanged,
      { ...unchanged }
    )).toBeNull();
  });

  it("preserves panel width across close and reopen state transitions", () => {
    const open = createShellState({ panelWidth: 418 });
    const collapsed = { ...open, isPanelCollapsed: true };
    const reopened = { ...collapsed, isPanelCollapsed: false };

    expect(collapsed.panelWidth).toBe(open.panelWidth);
    expect(reopened.panelWidth).toBe(open.panelWidth);
  });

  it("preserves expanded dock sizes across collapse and reopen transitions", () => {
    const open = createShellState({ primaryDockWidth: 392, bottomDockHeight: 188 });
    const collapsed = {
      ...open,
      isPrimaryDockCollapsed: true,
      isBottomDockCollapsed: true
    };
    const reopened = {
      ...collapsed,
      isPrimaryDockCollapsed: false,
      isBottomDockCollapsed: false
    };

    expect(reopened.primaryDockWidth).toBe(open.primaryDockWidth);
    expect(reopened.bottomDockHeight).toBe(open.bottomDockHeight);
  });
});
