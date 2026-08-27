import { describe, expect, it } from "vitest";
import {
  DEFAULT_BOTTOM_DOCK_HEIGHT,
  DEFAULT_PRIMARY_DOCK_WIDTH,
  MAX_BOTTOM_DOCK_HEIGHT,
  MAX_PRIMARY_DOCK_WIDTH,
  MIN_BOTTOM_DOCK_HEIGHT,
  MIN_PRIMARY_DOCK_WIDTH,
  clampDockSize,
  getBottomDockHeightBounds,
  getPrimaryDockWidthBounds
} from "./dockSizing";

describe("workbench dock sizing", () => {
  it("keeps Primary Dock widths within static and viewport-dominance bounds", () => {
    const desktop = getPrimaryDockWidthBounds(1440, 360);
    const medium = getPrimaryDockWidthBounds(1024, 360);

    expect(desktop).toEqual({ min: MIN_PRIMARY_DOCK_WIDTH, max: MAX_PRIMARY_DOCK_WIDTH });
    expect(medium).toEqual({ min: MIN_PRIMARY_DOCK_WIDTH, max: 344 });
    expect(clampDockSize(100, desktop)).toBe(MIN_PRIMARY_DOCK_WIDTH);
    expect(clampDockSize(900, desktop)).toBe(MAX_PRIMARY_DOCK_WIDTH);
    expect(clampDockSize(DEFAULT_PRIMARY_DOCK_WIDTH, medium)).toBe(DEFAULT_PRIMARY_DOCK_WIDTH);
  });

  it("keeps Bottom Dock heights compact by default and bounded by viewport height", () => {
    const desktop = getBottomDockHeightBounds(900);
    const medium = getBottomDockHeightBounds(600);

    expect(DEFAULT_BOTTOM_DOCK_HEIGHT).toBeGreaterThanOrEqual(120);
    expect(DEFAULT_BOTTOM_DOCK_HEIGHT).toBeLessThanOrEqual(140);
    expect(desktop).toEqual({ min: MIN_BOTTOM_DOCK_HEIGHT, max: MAX_BOTTOM_DOCK_HEIGHT });
    expect(medium).toEqual({ min: MIN_BOTTOM_DOCK_HEIGHT, max: 288 });
    expect(clampDockSize(40, desktop)).toBe(MIN_BOTTOM_DOCK_HEIGHT);
    expect(clampDockSize(900, desktop)).toBe(MAX_BOTTOM_DOCK_HEIGHT);
  });
});
