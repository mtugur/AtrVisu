import { describe, expect, it } from "vitest";
import {
  resolveCascadingFlyoutGeometry,
  type CascadingFlyoutRect
} from "./cascadingFlyoutGeometry";

const rect = (
  left: number,
  top: number,
  width: number,
  height: number
): CascadingFlyoutRect => ({
  left,
  top,
  right: left + width,
  bottom: top + height,
  width,
  height
});

const resolve = (
  anchorRect: CascadingFlyoutRect,
  overrides: Partial<Parameters<typeof resolveCascadingFlyoutGeometry>[0]> = {}
) => resolveCascadingFlyoutGeometry({
  anchorRect,
  requestedWidth: 280,
  requestedHeight: 420,
  viewportWidth: 1200,
  viewportHeight: 800,
  viewportMargin: 12,
  gap: 8,
  ...overrides
});

describe("cascading flyout geometry", () => {
  it("places a child on the preferred right side when space exists", () => {
    expect(resolve(rect(100, 80, 320, 40))).toMatchObject({
      side: "right",
      left: 428,
      top: 80,
      sideBySideViable: true
    });
  });

  it("falls back to the left when the right side cannot fit", () => {
    expect(resolve(rect(860, 120, 300, 40))).toMatchObject({
      side: "left",
      left: 572,
      sideBySideViable: true
    });
  });

  it("clamps top and bottom placement to viewport margins", () => {
    expect(resolve(rect(100, -40, 320, 40)).top).toBe(12);
    expect(resolve(rect(100, 760, 320, 40)).top).toBe(368);
  });

  it("keeps horizontal placement inside the viewport margin", () => {
    const geometry = resolve(rect(220, 80, 60, 40), {
      requestedWidth: 480,
      viewportWidth: 500
    });
    expect(geometry.left).toBe(12);
    expect(geometry.left + geometry.width).toBe(488);
  });

  it("reports drill-in when neither side can support the requested child", () => {
    expect(resolve(rect(220, 80, 60, 40), {
      requestedWidth: 360,
      viewportWidth: 640
    }).sideBySideViable).toBe(false);
  });

  it("uses the same resolver for a hypothetical depth-two anchor", () => {
    const depthOne = resolve(rect(100, 80, 320, 40));
    const depthTwoAnchor = rect(depthOne.left, depthOne.top + 48, depthOne.width, 36);
    expect(resolve(depthTwoAnchor, { requestedWidth: 240 })).toMatchObject({
      side: "right",
      sideBySideViable: true
    });
  });
});
