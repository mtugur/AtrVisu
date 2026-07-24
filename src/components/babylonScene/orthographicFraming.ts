export type OrthographicBounds = {
  left: number | null | undefined;
  right: number | null | undefined;
  top: number | null | undefined;
  bottom: number | null | undefined;
};

export type OrthographicViewportSize = {
  width: number;
  height: number;
};

export type OrthographicFraming = {
  centerX: number;
  centerY: number;
  horizontalWorldSpan: number;
  verticalWorldSpan: number;
};

export type OrthographicFramingIntent = OrthographicFraming & {
  viewportAspectRatio: number;
  horizontalWorldUnitsPerPixel: number;
  verticalWorldUnitsPerPixel: number;
};

export type OrthographicFramingTarget = {
  mode: "perspective" | "orthographic";
  bounds: OrthographicBounds;
  setBounds: (bounds: { left: number; right: number; top: number; bottom: number }) => void;
};

export const ORTHOGRAPHIC_MIN_VERTICAL_SPAN = 0.5;
export const ORTHOGRAPHIC_MAX_VERTICAL_SPAN = 500;
export const ORTHOGRAPHIC_WHEEL_ZOOM_BASE = 1.0015;
export const ORTHOGRAPHIC_MAX_WHEEL_DELTA = 500;

const positiveFinite = (value: number, fallback: number) =>
  Number.isFinite(value) && value > 0 ? value : fallback;

const finiteOr = (value: number | null | undefined, fallback: number) =>
  typeof value === "number" && Number.isFinite(value) ? value : fallback;

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);

export const isValidOrthographicViewportSize = (
  viewportSize: OrthographicViewportSize
) =>
  Number.isFinite(viewportSize.width)
  && viewportSize.width > 0
  && Number.isFinite(viewportSize.height)
  && viewportSize.height > 0;

export const clampOrthographicVerticalSpan = (verticalWorldSpan: number) =>
  Math.min(
    ORTHOGRAPHIC_MAX_VERTICAL_SPAN,
    Math.max(ORTHOGRAPHIC_MIN_VERTICAL_SPAN, verticalWorldSpan)
  );

export const normalizeOrthographicFraming = (
  framing: Pick<OrthographicFraming, "centerX" | "centerY" | "verticalWorldSpan">
): Pick<OrthographicFraming, "centerX" | "centerY" | "verticalWorldSpan"> | null => {
  if (
    !isFiniteNumber(framing.centerX)
    || !isFiniteNumber(framing.centerY)
    || !isFiniteNumber(framing.verticalWorldSpan)
    || framing.verticalWorldSpan <= 0
  ) {
    return null;
  }

  return {
    centerX: framing.centerX,
    centerY: framing.centerY,
    verticalWorldSpan: clampOrthographicVerticalSpan(framing.verticalWorldSpan)
  };
};

export const deriveOrthographicVerticalSpanFromPerspective = (
  targetDistance: number,
  verticalFov: number
) => {
  if (
    !Number.isFinite(targetDistance)
    || targetDistance <= 0
    || !Number.isFinite(verticalFov)
    || verticalFov <= 0
    || verticalFov >= Math.PI
  ) {
    return null;
  }

  const verticalWorldSpan = 2 * targetDistance * Math.tan(verticalFov / 2);
  return Number.isFinite(verticalWorldSpan) && verticalWorldSpan > 0
    ? clampOrthographicVerticalSpan(verticalWorldSpan)
    : null;
};

export const captureOrthographicFraming = (
  bounds: OrthographicBounds
): Pick<OrthographicFraming, "centerX" | "centerY" | "verticalWorldSpan"> | null => {
  if (
    !isFiniteNumber(bounds.left)
    || !isFiniteNumber(bounds.right)
    || !isFiniteNumber(bounds.top)
    || !isFiniteNumber(bounds.bottom)
    || bounds.right <= bounds.left
    || bounds.top <= bounds.bottom
  ) {
    return null;
  }

  const verticalWorldSpan = bounds.top - bounds.bottom;
  if (
    verticalWorldSpan < ORTHOGRAPHIC_MIN_VERTICAL_SPAN
    || verticalWorldSpan > ORTHOGRAPHIC_MAX_VERTICAL_SPAN
  ) {
    return null;
  }

  return {
    centerX: (bounds.left + bounds.right) / 2,
    centerY: (bounds.top + bounds.bottom) / 2,
    verticalWorldSpan
  };
};

export const resolveOrthographicFramingForApplication = ({
  requestedFraming,
  previousMode,
  currentBounds,
  perspectiveTargetDistance,
  verticalFov
}: {
  requestedFraming?: Pick<OrthographicFraming, "centerX" | "centerY" | "verticalWorldSpan">;
  previousMode: "perspective" | "orthographic";
  currentBounds: OrthographicBounds;
  perspectiveTargetDistance: number;
  verticalFov: number;
}) => {
  if (requestedFraming !== undefined) {
    return normalizeOrthographicFraming(requestedFraming);
  }

  if (previousMode === "orthographic") {
    const currentFraming = captureOrthographicFraming(currentBounds);
    if (currentFraming) {
      return currentFraming;
    }
  }

  const verticalWorldSpan = deriveOrthographicVerticalSpanFromPerspective(
    perspectiveTargetDistance,
    verticalFov
  );
  return verticalWorldSpan === null
    ? null
    : {
        centerX: 0,
        centerY: 0,
        verticalWorldSpan
      };
};

export const getOrthographicBoundsForViewport = (
  framing: Pick<OrthographicFraming, "centerX" | "centerY" | "verticalWorldSpan">,
  viewportSize: OrthographicViewportSize
) => {
  const normalized = normalizeOrthographicFraming(framing);
  if (!normalized || !isValidOrthographicViewportSize(viewportSize)) {
    return null;
  }

  return reconcileOrthographicFraming({
    ...normalized,
    horizontalWorldSpan: normalized.verticalWorldSpan * viewportSize.width / viewportSize.height
  }, viewportSize);
};

export const getOrthographicWheelZoomFactor = (wheelDeltaY: number) => {
  if (!Number.isFinite(wheelDeltaY)) {
    return null;
  }
  const boundedDelta = Math.min(
    ORTHOGRAPHIC_MAX_WHEEL_DELTA,
    Math.max(-ORTHOGRAPHIC_MAX_WHEEL_DELTA, wheelDeltaY)
  );
  return ORTHOGRAPHIC_WHEEL_ZOOM_BASE ** boundedDelta;
};

export const getOrthographicWheelDelta = (
  wheelDeltaY: number,
  deltaMode: number,
  viewportHeight: number
) => {
  if (
    !Number.isFinite(wheelDeltaY)
    || !Number.isFinite(deltaMode)
    || !Number.isFinite(viewportHeight)
    || viewportHeight <= 0
  ) {
    return Number.NaN;
  }
  if (deltaMode === 1) {
    return wheelDeltaY * 16;
  }
  if (deltaMode === 2) {
    return wheelDeltaY * viewportHeight;
  }
  return wheelDeltaY;
};

export const zoomOrthographicFraming = (
  framing: Pick<OrthographicFraming, "centerX" | "centerY" | "verticalWorldSpan">,
  wheelDeltaY: number
) => {
  const normalized = normalizeOrthographicFraming(framing);
  const zoomFactor = getOrthographicWheelZoomFactor(wheelDeltaY);
  if (!normalized || zoomFactor === null) {
    return null;
  }

  return {
    ...normalized,
    verticalWorldSpan: clampOrthographicVerticalSpan(
      normalized.verticalWorldSpan * zoomFactor
    )
  };
};

export const translateOrthographicFramingCenter = (
  framing: Pick<OrthographicFraming, "centerX" | "centerY" | "verticalWorldSpan">,
  deltaX: number,
  deltaY: number
) => {
  const normalized = normalizeOrthographicFraming(framing);
  if (!normalized || !Number.isFinite(deltaX) || !Number.isFinite(deltaY)) {
    return null;
  }
  return {
    ...normalized,
    centerX: normalized.centerX + deltaX,
    centerY: normalized.centerY + deltaY
  };
};

export const areOrthographicFramingsEquivalent = (
  left: Pick<OrthographicFraming, "centerX" | "centerY" | "verticalWorldSpan">,
  right: Pick<OrthographicFraming, "centerX" | "centerY" | "verticalWorldSpan">,
  tolerance = 1e-6
) =>
  Math.abs(left.centerX - right.centerX) <= tolerance
  && Math.abs(left.centerY - right.centerY) <= tolerance
  && Math.abs(left.verticalWorldSpan - right.verticalWorldSpan) <= tolerance;

export const resolveEffectiveOrthographicFraming = (
  bounds: OrthographicBounds,
  fallbackRenderSize: OrthographicViewportSize
): OrthographicFraming => {
  const fallbackWidth = positiveFinite(fallbackRenderSize.width, 1);
  const fallbackHeight = positiveFinite(fallbackRenderSize.height, 1);
  const left = finiteOr(bounds.left, -fallbackWidth / 2);
  const right = finiteOr(bounds.right, fallbackWidth / 2);
  const top = finiteOr(bounds.top, fallbackHeight / 2);
  const bottom = finiteOr(bounds.bottom, -fallbackHeight / 2);
  const centerX = (left + right) / 2;
  const centerY = (top + bottom) / 2;

  return {
    centerX,
    centerY,
    horizontalWorldSpan: positiveFinite(right - left, fallbackWidth),
    verticalWorldSpan: positiveFinite(top - bottom, fallbackHeight)
  };
};

export const reconcileOrthographicFraming = (
  framing: OrthographicFraming,
  viewportSize: OrthographicViewportSize
) => {
  const width = positiveFinite(viewportSize.width, 1);
  const height = positiveFinite(viewportSize.height, 1);
  const viewportAspectRatio = width / height;
  const verticalWorldSpan = clampOrthographicVerticalSpan(
    positiveFinite(framing.verticalWorldSpan, ORTHOGRAPHIC_MIN_VERTICAL_SPAN)
  );
  const horizontalWorldSpan = verticalWorldSpan * viewportAspectRatio;
  const halfWidth = horizontalWorldSpan / 2;
  const halfHeight = verticalWorldSpan / 2;

  return {
    bounds: {
      left: framing.centerX - halfWidth,
      right: framing.centerX + halfWidth,
      top: framing.centerY + halfHeight,
      bottom: framing.centerY - halfHeight
    },
    intent: {
      centerX: framing.centerX,
      centerY: framing.centerY,
      horizontalWorldSpan,
      verticalWorldSpan,
      viewportAspectRatio,
      horizontalWorldUnitsPerPixel: horizontalWorldSpan / width,
      verticalWorldUnitsPerPixel: verticalWorldSpan / height
    } satisfies OrthographicFramingIntent
  };
};

export const createOrthographicFramingIntent = (
  bounds: OrthographicBounds,
  fallbackRenderSize: OrthographicViewportSize,
  viewportSize: OrthographicViewportSize
): OrthographicFramingIntent => {
  const framing = resolveEffectiveOrthographicFraming(bounds, fallbackRenderSize);
  const width = positiveFinite(viewportSize.width, 1);
  const height = positiveFinite(viewportSize.height, 1);

  return {
    ...framing,
    viewportAspectRatio: width / height,
    horizontalWorldUnitsPerPixel: framing.horizontalWorldSpan / width,
    verticalWorldUnitsPerPixel: framing.verticalWorldSpan / height
  };
};

export const applyOrthographicFramingPolicy = (
  target: OrthographicFramingTarget,
  fallbackRenderSize: OrthographicViewportSize,
  viewportSize: OrthographicViewportSize
) => {
  if (target.mode !== "orthographic") {
    return null;
  }

  const reconciled = reconcileOrthographicFraming(
    resolveEffectiveOrthographicFraming(target.bounds, fallbackRenderSize),
    viewportSize
  );
  target.setBounds(reconciled.bounds);
  return reconciled.intent;
};
