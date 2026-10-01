import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { createCameraTelemetry } from "./cameraTelemetry";
import { getViewportHudSafeInsets } from "./hudSafeArea";
import { ViewportNavigationHud, getCubeZoneVertices } from "./ViewportNavigationHud";
import { VIEW_PRESETS } from "./navigationGeometry";

describe("navigation presentation boundary", () => {
  it("exposes only read-only snapshots/subscriptions and removes listeners on cleanup", () => {
    const telemetry = createCameraTelemetry();
    expect(Object.keys(telemetry.source)).toEqual(["getSnapshot", "subscribe"]);
    const listener = vi.fn();
    const unsubscribe = telemetry.source.subscribe(listener);
    const camera = { mode: "perspective" as const, alpha: .7, beta: 1, radius: 34, fov: .8, targetX: 0, targetY: 0, targetZ: 0, positionX: 1, positionY: 2, positionZ: 3 };
    telemetry.publish(camera);
    camera.alpha = 4;
    expect(telemetry.source.getSnapshot()?.alpha).toBe(.7);
    expect(Object.isFrozen(telemetry.source.getSnapshot())).toBe(true);
    expect(listener).toHaveBeenCalledTimes(1);
    telemetry.publish({ ...camera, alpha: .7 });
    expect(listener).toHaveBeenCalledTimes(1);
    unsubscribe();
    telemetry.publish(null);
    expect(listener).toHaveBeenCalledTimes(1);
  });
  it("renders a single lightweight cube with labelled polygon hit zones and a passive canonical triad", () => {
    const markup = renderToStaticMarkup(createElement(ViewportNavigationHud, { source: createCameraTelemetry().source, onPreset: vi.fn() }));
    expect(markup).toContain('aria-label="ViewCube"');
    expect(markup).toContain('aria-label="Right view (+X)"');
    expect(markup).toContain('aria-label="World orientation: X Right, Y Back, Z Top"');
    expect(markup).toContain('data-editor-only="true"');
    expect(markup).not.toContain("<canvas");
    expect(markup).not.toContain("<button");
    const triad = markup.slice(markup.indexOf('class="viewport-axis-triad"'));
    expect(triad).not.toContain('role="button"');
    expect(triad).not.toContain("tabindex");
    for (const p of VIEW_PRESETS) {
      expect(getCubeZoneVertices(p)).toHaveLength(p.kind === "corner" ? 3 : 4);
      expect(getCubeZoneVertices(p).flatMap(Object.values).every(Number.isFinite)).toBe(true);
    }
  });
  it.each([
    [292, 0, 1440, { left: 292, right: 0 }],
    [0, 360, 1440, { left: 0, right: 360 }],
    [292, 360, 1440, { left: 292, right: 360 }],
    [0, 0, 640, { left: 0, right: 0 }],
    [400, 420, 1440, { left: 400, right: 420 }]
  ])("resolves left/right/collapsed/resized HUD safe insets %s/%s", (left, right, width, expected) => {
    expect(getViewportHudSafeInsets(left, right, width)).toEqual(expected);
  });
  it("keeps responsive safe insets finite and leaves room for both compact controls", () => {
    const insets = getViewportHudSafeInsets(292, 360, 640);
    expect(insets.left + insets.right).toBeCloseTo(480);
    expect(getViewportHudSafeInsets(NaN, -4, 80)).toEqual({ left: 0, right: 0 });
  });
});
