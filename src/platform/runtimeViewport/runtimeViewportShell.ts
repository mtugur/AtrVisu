import type { ViewportResizeReason } from "../contracts";

export type RuntimeViewportShellState = {
  isPanelCollapsed: boolean;
  panelWidth: number;
};

export const getRuntimeViewportShellResizeReason = (
  previous: RuntimeViewportShellState,
  next: RuntimeViewportShellState
): ViewportResizeReason | null => {
  if (previous.isPanelCollapsed !== next.isPanelCollapsed) {
    return "dock-collapse";
  }
  if (previous.panelWidth !== next.panelWidth) {
    return "dock-resize";
  }
  return null;
};
