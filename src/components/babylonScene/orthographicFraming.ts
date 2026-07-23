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

const positiveFinite = (value: number, fallback: number) =>
  Number.isFinite(value) && value > 0 ? value : fallback;

const finiteOr = (value: number | null | undefined, fallback: number) =>
  typeof value === "number" && Number.isFinite(value) ? value : fallback;

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
  const verticalWorldSpan = positiveFinite(framing.verticalWorldSpan, height);
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
