import { describe, expect, it, vi } from "vitest";
import {
  areOrthographicFramingsEquivalent,
  applyOrthographicFramingPolicy,
  captureOrthographicFraming,
  createOrthographicFramingIntent,
  deriveOrthographicVerticalSpanFromPerspective,
  getOrthographicBoundsForViewport,
  getOrthographicWheelDelta,
  ORTHOGRAPHIC_MAX_VERTICAL_SPAN,
  ORTHOGRAPHIC_MIN_VERTICAL_SPAN,
  reconcileOrthographicFraming,
  resolveEffectiveOrthographicFraming,
  resolveOrthographicFramingForApplication,
  translateOrthographicFramingCenter,
  zoomOrthographicFraming
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

  it("derives a world-scale span from perspective radius and vertical FOV", () => {
    const span = deriveOrthographicVerticalSpanFromPerspective(34, 0.8);

    expect(span).toBeCloseTo(2 * 34 * Math.tan(0.8 / 2));
    expect(span).toBeGreaterThan(20);
    expect(span).toBeLessThan(40);
    expect(span).not.toBe(900);
  });

  it("rejects invalid perspective fallback inputs", () => {
    expect(deriveOrthographicVerticalSpanFromPerspective(0, 0.8)).toBeNull();
    expect(deriveOrthographicVerticalSpanFromPerspective(34, Number.NaN)).toBeNull();
    expect(deriveOrthographicVerticalSpanFromPerspective(34, Math.PI)).toBeNull();
  });

  it("uses explicit framing instead of the perspective fallback", () => {
    expect(resolveOrthographicFramingForApplication({
      requestedFraming: {
        centerX: 3,
        centerY: -2,
        verticalWorldSpan: 12
      },
      previousMode: "perspective",
      currentBounds: { left: null, right: null, top: null, bottom: null },
      perspectiveTargetDistance: 34,
      verticalFov: 0.8
    })).toEqual({
      centerX: 3,
      centerY: -2,
      verticalWorldSpan: 12
    });
  });

  it("preserves valid current framing for an already-orthographic legacy state", () => {
    expect(resolveOrthographicFramingForApplication({
      previousMode: "orthographic",
      currentBounds: { left: -9, right: 11, top: 7, bottom: -5 },
      perspectiveTargetDistance: 34,
      verticalFov: 0.8
    })).toEqual({
      centerX: 1,
      centerY: 1,
      verticalWorldSpan: 12
    });
  });

  it("rejects invalid explicit framing without falling back", () => {
    expect(resolveOrthographicFramingForApplication({
      requestedFraming: {
        centerX: 0,
        centerY: 0,
        verticalWorldSpan: Number.NaN
      },
      previousMode: "perspective",
      currentBounds: { left: null, right: null, top: null, bottom: null },
      perspectiveTargetDistance: 34,
      verticalFov: 0.8
    })).toBeNull();
  });

  it("creates uniform bounds from serializable framing and viewport aspect", () => {
    const resolved = getOrthographicBoundsForViewport({
      centerX: 2,
      centerY: -1,
      verticalWorldSpan: 20
    }, {
      width: 1200,
      height: 800
    });

    expect(resolved?.bounds).toEqual({
      left: -13,
      right: 17,
      top: 9,
      bottom: -11
    });
    expect(resolved?.intent.horizontalWorldUnitsPerPixel)
      .toBeCloseTo(resolved?.intent.verticalWorldUnitsPerPixel ?? Number.NaN);
  });

  it("captures serializable framing only from complete valid bounds", () => {
    expect(captureOrthographicFraming({
      left: -12,
      right: 18,
      top: 11,
      bottom: -9
    })).toEqual({
      centerX: 3,
      centerY: 1,
      verticalWorldSpan: 20
    });
    expect(captureOrthographicFraming({
      left: null,
      right: 18,
      top: 11,
      bottom: -9
    })).toBeNull();
  });

  it("zooms in and out while preserving center", () => {
    const framing = { centerX: 3, centerY: -2, verticalWorldSpan: 20 };
    const zoomedIn = zoomOrthographicFraming(framing, -120);
    const zoomedOut = zoomOrthographicFraming(framing, 120);

    expect(zoomedIn?.verticalWorldSpan).toBeLessThan(20);
    expect(zoomedOut?.verticalWorldSpan).toBeGreaterThan(20);
    expect(zoomedIn).toMatchObject({ centerX: 3, centerY: -2 });
    expect(zoomedOut).toMatchObject({ centerX: 3, centerY: -2 });
  });

  it("clamps repeated wheel zoom to finite limits", () => {
    let zoomedIn = { centerX: 0, centerY: 0, verticalWorldSpan: 20 };
    let zoomedOut = { centerX: 0, centerY: 0, verticalWorldSpan: 20 };
    for (let index = 0; index < 100; index += 1) {
      zoomedIn = zoomOrthographicFraming(zoomedIn, -500) ?? zoomedIn;
      zoomedOut = zoomOrthographicFraming(zoomedOut, 500) ?? zoomedOut;
    }

    expect(zoomedIn.verticalWorldSpan).toBe(ORTHOGRAPHIC_MIN_VERTICAL_SPAN);
    expect(zoomedOut.verticalWorldSpan).toBe(ORTHOGRAPHIC_MAX_VERTICAL_SPAN);
    expect(Number.isFinite(zoomedIn.verticalWorldSpan)).toBe(true);
    expect(Number.isFinite(zoomedOut.verticalWorldSpan)).toBe(true);
  });

  it("normalizes line and page wheel deltas deterministically", () => {
    expect(getOrthographicWheelDelta(2, 0, 800)).toBe(2);
    expect(getOrthographicWheelDelta(2, 1, 800)).toBe(32);
    expect(getOrthographicWheelDelta(2, 2, 800)).toBe(1600);
  });

  it("adjusts zoom-to-pointer center without changing span", () => {
    expect(translateOrthographicFramingCenter({
      centerX: 2,
      centerY: 3,
      verticalWorldSpan: 15
    }, -1.5, 0.75)).toEqual({
      centerX: 0.5,
      centerY: 3.75,
      verticalWorldSpan: 15
    });
  });

  it("compares serializable framing with tolerance", () => {
    expect(areOrthographicFramingsEquivalent(
      { centerX: 1, centerY: 2, verticalWorldSpan: 20 },
      { centerX: 1.0000001, centerY: 2, verticalWorldSpan: 20.0000001 }
    )).toBe(true);
    expect(areOrthographicFramingsEquivalent(
      { centerX: 1, centerY: 2, verticalWorldSpan: 20 },
      { centerX: 1.1, centerY: 2, verticalWorldSpan: 20 }
    )).toBe(false);
  });
});
