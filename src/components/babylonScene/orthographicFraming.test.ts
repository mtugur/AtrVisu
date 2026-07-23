import { describe, expect, it, vi } from "vitest";
import {
  applyOrthographicFramingPolicy,
  createOrthographicFramingIntent,
  reconcileOrthographicFraming,
  resolveEffectiveOrthographicFraming
} from "./orthographicFraming";

describe("orthographic framing", () => {
  it("preserves center and vertical span while adapting horizontal span to aspect", () => {
    const framing = resolveEffectiveOrthographicFraming({
      left: -10,
      right: 30,
      top: 14,
      bottom: -6
    }, {
      width: 1000,
      height: 500
    });
    const reconciled = reconcileOrthographicFraming(framing, {
      width: 600,
      height: 600
    });

    expect(framing).toEqual({
      centerX: 10,
      centerY: 4,
      horizontalWorldSpan: 40,
      verticalWorldSpan: 20
    });
    expect(reconciled.bounds).toEqual({
      left: 0,
      right: 20,
      top: 14,
      bottom: -6
    });
    expect(reconciled.intent.centerX).toBe(10);
    expect(reconciled.intent.centerY).toBe(4);
    expect(reconciled.intent.verticalWorldSpan).toBe(20);
    expect(reconciled.intent.horizontalWorldSpan).toBe(20);
    expect(reconciled.intent.horizontalWorldUnitsPerPixel)
      .toBeCloseTo(reconciled.intent.verticalWorldUnitsPerPixel);
  });

  it("resolves Babylon null bounds from the current render dimensions", () => {
    const framing = resolveEffectiveOrthographicFraming({
      left: null,
      right: null,
      top: null,
      bottom: null
    }, {
      width: 1600,
      height: 900
    });

    expect(framing).toEqual({
      centerX: 0,
      centerY: 0,
      horizontalWorldSpan: 1600,
      verticalWorldSpan: 900
    });
  });

  it("makes non-uniform world-to-pixel scaling visible in camera intent", () => {
    const intent = createOrthographicFramingIntent({
      left: -20,
      right: 20,
      top: 10,
      bottom: -10
    }, {
      width: 1000,
      height: 500
    }, {
      width: 800,
      height: 800
    });

    expect(intent.viewportAspectRatio).toBe(1);
    expect(intent.horizontalWorldUnitsPerPixel).toBe(0.05);
    expect(intent.verticalWorldUnitsPerPixel).toBe(0.025);
  });

  it("does not write orthographic bounds for a perspective camera", () => {
    const setBounds = vi.fn();

    expect(applyOrthographicFramingPolicy({
      mode: "perspective",
      bounds: {
        left: null,
        right: null,
        top: null,
        bottom: null
      },
      setBounds
    }, {
      width: 1000,
      height: 500
    }, {
      width: 600,
      height: 600
    })).toBeNull();
    expect(setBounds).not.toHaveBeenCalled();
  });
});
