import type { ViewportResizeReason, ViewportSize } from "../contracts";
import { createViewportResizeRequest } from "../contracts";

const normalizeDimension = (value: unknown) =>
  typeof value === "number" && Number.isFinite(value) && value > 0 ? value : 1;

export const normalizeViewportSize = (size: ViewportSize): ViewportSize => ({
  width: normalizeDimension(size.width),
  height: normalizeDimension(size.height)
});

export const validateViewportSize = (size: ViewportSize) =>
  Number.isFinite(size.width) && size.width > 0 && Number.isFinite(size.height) && size.height > 0;

export const createSafeViewportResizeRequest = (
  reason: ViewportResizeReason,
  nextSize: ViewportSize
) =>
  createViewportResizeRequest(reason, normalizeViewportSize(nextSize), {
    preserveCamera: true,
    preserveSelection: true,
    preserveEntityTransforms: true
  });

