export type CascadingFlyoutSide = "right" | "left";

export type CascadingFlyoutRect = Readonly<{
  left: number;
  top: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
}>;

export type CascadingFlyoutGeometryRequest = Readonly<{
  anchorRect: CascadingFlyoutRect;
  requestedWidth: number;
  requestedHeight: number;
  viewportWidth: number;
  viewportHeight: number;
  viewportMargin: number;
  gap: number;
  preferredSide?: CascadingFlyoutSide;
}>;

export type CascadingFlyoutGeometry = Readonly<{
  side: CascadingFlyoutSide;
  left: number;
  top: number;
  width: number;
  maxHeight: number;
  sideBySideViable: boolean;
}>;

const clamp = (value: number, minimum: number, maximum: number) =>
  Math.min(Math.max(value, minimum), maximum);

const normalizeDimension = (value: number) => Math.max(0, value);

export const resolveCascadingFlyoutGeometry = ({
  anchorRect,
  requestedWidth,
  requestedHeight,
  viewportWidth,
  viewportHeight,
  viewportMargin,
  gap,
  preferredSide = "right"
}: CascadingFlyoutGeometryRequest): CascadingFlyoutGeometry => {
  const margin = normalizeDimension(viewportMargin);
  const surfaceGap = normalizeDimension(gap);
  const usableViewportWidth = Math.max(0, viewportWidth - (2 * margin));
  const usableViewportHeight = Math.max(0, viewportHeight - (2 * margin));
  const width = Math.min(normalizeDimension(requestedWidth), usableViewportWidth);
  const maxHeight = Math.min(normalizeDimension(requestedHeight), usableViewportHeight);
  const availableRight = viewportWidth - margin - anchorRect.right - surfaceGap;
  const availableLeft = anchorRect.left - surfaceGap - margin;
  const rightFits = availableRight >= width;
  const leftFits = availableLeft >= width;
  const sideBySideViable = rightFits || leftFits;

  const side = preferredSide === "right"
    ? rightFits || !leftFits && availableRight >= availableLeft ? "right" : "left"
    : leftFits || !rightFits && availableLeft >= availableRight ? "left" : "right";
  const requestedLeft = side === "right"
    ? anchorRect.right + surfaceGap
    : anchorRect.left - surfaceGap - width;
  const maximumLeft = Math.max(margin, viewportWidth - margin - width);
  const maximumTop = Math.max(margin, viewportHeight - margin - maxHeight);

  return Object.freeze({
    side,
    left: clamp(requestedLeft, margin, maximumLeft),
    top: clamp(anchorRect.top, margin, maximumTop),
    width,
    maxHeight,
    sideBySideViable
  });
};
