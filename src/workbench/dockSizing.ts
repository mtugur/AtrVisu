export const PRIMARY_DOCK_RAIL_WIDTH = 78;
export const DEFAULT_PRIMARY_DOCK_WIDTH = 304;
export const MIN_PRIMARY_DOCK_WIDTH = 260;
export const MAX_PRIMARY_DOCK_WIDTH = 480;

export const DEFAULT_BOTTOM_DOCK_HEIGHT = 136;
export const MIN_BOTTOM_DOCK_HEIGHT = 120;
export const MAX_BOTTOM_DOCK_HEIGHT = 420;

export const DOCK_RESIZE_BREAKPOINT = 720;
export const MIN_DOMINANT_VIEWPORT_WIDTH = 320;

export type DockSizeBounds = Readonly<{
  min: number;
  max: number;
}>;

export const clampDockSize = (value: number, bounds: DockSizeBounds) =>
  Math.min(bounds.max, Math.max(bounds.min, Math.round(value)));

export const getPrimaryDockWidthBounds = (
  viewportWidth: number,
  rightInset: number
): DockSizeBounds => {
  const availableMaximum = Math.floor(
    viewportWidth - Math.max(0, rightInset) - MIN_DOMINANT_VIEWPORT_WIDTH
  );
  return {
    min: MIN_PRIMARY_DOCK_WIDTH,
    max: Math.max(
      MIN_PRIMARY_DOCK_WIDTH,
      Math.min(MAX_PRIMARY_DOCK_WIDTH, availableMaximum)
    )
  };
};

export const getBottomDockHeightBounds = (viewportHeight: number): DockSizeBounds => ({
  min: MIN_BOTTOM_DOCK_HEIGHT,
  max: Math.max(
    MIN_BOTTOM_DOCK_HEIGHT,
    Math.min(MAX_BOTTOM_DOCK_HEIGHT, Math.floor(viewportHeight * 0.48))
  )
});
