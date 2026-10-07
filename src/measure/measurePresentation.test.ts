import { describe, expect, it } from "vitest";
import { placeMeasureCallout } from "./measurePresentation";
describe("Measure presentation never relocates an engineering operand", () => {
    it("places honest offscreen indicators inside the existing HUD safe area", () => {
        const point = Object.freeze({ x: 1200, y: 950 });
        expect(placeMeasureCallout(point, 640, 800, { left: 100, right: 80, bottom: 350 })).toEqual({ x: 388, y: 430, displaced: true });
        expect(point).toEqual({ x: 1200, y: 950 });
        expect(placeMeasureCallout({ x: NaN, y: Infinity }, 640, 800)).toEqual({ x: 12, y: 20, displaced: true });
    });
});
