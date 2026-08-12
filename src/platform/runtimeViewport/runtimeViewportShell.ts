import type { ViewportResizeReason } from "../contracts";

export type RuntimeViewportShellState = {
  isPanelCollapsed: boolean;
  panelWidth: number;
  isPrimaryDockCollapsed: boolean;
  primaryDockWidth: number;
  isBottomDockCollapsed: boolean;
  bottomDockHeight: number;
};

export const getRuntimeViewportShellResizeReason = (
  previous: RuntimeViewportShellState,
  next: RuntimeViewportShellState
): ViewportResizeReason | null => {
  if (
    previous.isPanelCollapsed !== next.isPanelCollapsed
    || previous.isPrimaryDockCollapsed !== next.isPrimaryDockCollapsed
    || previous.isBottomDockCollapsed !== next.isBottomDockCollapsed
  ) {
    return "dock-collapse";
  }
  if (
    previous.panelWidth !== next.panelWidth
    || previous.primaryDockWidth !== next.primaryDockWidth
    || previous.bottomDockHeight !== next.bottomDockHeight
  ) {
    return "dock-resize";
  }
  return null;
};
