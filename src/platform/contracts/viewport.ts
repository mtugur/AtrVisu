export type ViewportResizeReason = "window" | "dock-resize" | "dock-collapse" | "splitter" | "manual";

export type ViewportSize = {
  width: number;
  height: number;
};

export type ViewportCameraState = {
  targetX: number;
  targetY: number;
  targetZ: number;
  alpha: number;
  beta: number;
  radius: number;
};

export type ViewportState = {
  size: ViewportSize;
  camera: ViewportCameraState;
};

export type ViewportResizeRequest = {
  reason: ViewportResizeReason;
  nextSize: ViewportSize;
  preserveCamera: boolean;
  preserveSelection: boolean;
  preserveEntityTransforms: boolean;
};

export const validateViewportSize = (size: ViewportSize) => {
  if (!Number.isFinite(size.width) || size.width <= 0) {
    throw new Error("Viewport width must be a positive number.");
  }
  if (!Number.isFinite(size.height) || size.height <= 0) {
    throw new Error("Viewport height must be a positive number.");
  }
};

export const createViewportResizeRequest = (
  reason: ViewportResizeReason,
  nextSize: ViewportSize,
  options: Partial<Pick<ViewportResizeRequest, "preserveCamera" | "preserveSelection" | "preserveEntityTransforms">> = {}
): ViewportResizeRequest => {
  validateViewportSize(nextSize);

  return {
    reason,
    nextSize,
    preserveCamera: options.preserveCamera ?? true,
    preserveSelection: options.preserveSelection ?? true,
    preserveEntityTransforms: options.preserveEntityTransforms ?? true
  };
};

