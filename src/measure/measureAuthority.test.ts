import { describe, expect, it } from "vitest";
import { createMeasureAuthority, getMeasureLines, getMeasureResult, MEASURE_PICK_CLICK_TOLERANCE_CSS_PX } from "./measureAuthority";
import { angleResult, areaResult, distanceResult, formatMeasureValue } from "./measureGeometry";
const context = { selectionIds: [], entities: [], machines: [], level: { id: "level-2", name: "Level 2", elevationMm: 6000 } };
const point = (xMm = 0, yMm = 0, zMm = 0) => ({ xMm, yMm, zMm });
const start = () => { const a = createMeasureAuthority(); a.dispatch({ type: "toggle" }, context); return a; };
const pick = (a: ReturnType<typeof start>, p: ReturnType<typeof point>) => { a.beginPress(1, 100, 100); return a.endPress(1, 100, 100, true, p); };
describe("frozen Measure-only confirmation", () => {
    it("uses four inclusive CSS pixels without DPR or elapsed-time scaling", () => {
        expect(MEASURE_PICK_CLICK_TOLERANCE_CSS_PX).toBe(4);
        for (const delta of [0, 3, 4, 5]) {
            const a = start();
            a.beginPress(7, 100, 100);
            a.movePress(7, 100 + delta, 100);
            expect(a.endPress(7, 100 + delta, 100, true, point())).toBe(delta <= 4);
            expect(a.getSnapshot()?.points.length).toBe(delta <= 4 ? 1 : 0);
            expect(a.endPress(7, 100, 100, true, point())).toBe(false);
        }
    });
    it("latches a beyond-boundary excursion despite returning, not accumulated jitter distance", () => {
        const a = start();
        a.beginPress(1, 0, 0);
        a.movePress(1, 5, 0);
        a.movePress(1, 0, 0);
        expect(a.endPress(1, 0, 0, true, point())).toBe(false);
        a.beginPress(1, 0, 0);
        for (const x of [3, -3, 3, -3, 0])
            a.movePress(1, x, 0);
        expect(a.endPress(1, 0, 0, true, point())).toBe(true);
    });
    it.each(["pointercancel", "lostpointercapture", "blur"])("%s cancels pre-up and cannot revive on late up", reason => {
        const a = start();
        a.beginPress(1, 0, 0);
        a.cancelPress(reason);
        expect(a.endPress(1, 0, 0, true, point())).toBe(false);
        expect(a.getSnapshot()?.points).toEqual([]);
    });
    it("rejects other pointers, outside release and unavailable candidates", () => {
        const a = start();
        a.beginPress(1, 0, 0);
        expect(a.endPress(2, 0, 0, true, point())).toBe(false);
        expect(a.endPress(1, 0, 0, false, point())).toBe(false);
        a.beginPress(1, 0, 0);
        expect(a.endPress(1, 0, 0, true, null)).toBe(false);
    });
    it("reset/exit/Navigate aborts pending confirmation; normal post-up release preserves it", () => {
        for (const action of [{ type: "restart" }, { type: "exit" }, { type: "mode", mode: "navigate" }] as const) {
            const a = start();
            a.beginPress(1, 0, 0);
            a.dispatch(action, context);
            expect(a.endPress(1, 0, 0, true, point())).toBe(false);
        }
        const a = start();
        pick(a, point());
        a.cancelPress("normal release");
        expect(a.getSnapshot()?.points).toHaveLength(1);
    });
});
describe("C03 calculation and source/presentation contract", () => {
    it("M03 retains signed XYZ, 3D, Plan, zero and reverse", () => {
        expect(distanceResult(point(), point(3000, 4000, 12000)).values.map(v => v.value)).toEqual([3000, 4000, 12000, 13000, 5000]);
        expect(distanceResult(point(3000, 4000, 12000), point()).values.map(v => v.value)).toEqual([-3000, -4000, -12000, 13000, 5000]);
        expect(distanceResult(point(), point()).values.every(v => v.value === 0)).toBe(true);
        expect(distanceResult(point(), point(NaN)).reason).toBeTruthy();
        expect(formatMeasureValue({ label: "Delta", value: -.00001, unit: "mm" })).toBe("0.000 mm");
    });
    it("M04 A-B-C vertex handles 0/60/90/180 and rejects zero arms", () => {
        const a = point(1000), b = point();
        for (const deg of [0, 60, 90, 180]) {
            const rad = deg * Math.PI / 180;
            expect(angleResult(a, b, point(1000 * Math.cos(rad), 1000 * Math.sin(rad))).values[0].value).toBeCloseTo(deg, 8);
        }
        expect(angleResult(b, b, a).reason).toBeTruthy();
    });
    it("M05 keeps differing original Z while Geometry polygon stays at first A", () => {
        const a = start();
        a.dispatch({ type: "kind", kind: "area" }, context);
        const points = [point(0, 0, 1200), point(4000, 0, 6000), point(4000, 3000, -350), point(0, 3000, 2500)];
        points.forEach(p => pick(a, p));
        a.dispatch({ type: "finish" }, context);
        const s = a.getSnapshot()!;
        expect(s.points).toEqual(points);
        expect(s.presentationElevationMm).toBe(1200);
        expect(getMeasureLines(s)[0].points.every(p => p.zMm === 1200)).toBe(true);
        expect(getMeasureResult(s).values.map(v => v.value)).toEqual([12000000, 12, 14000]);
        a.dispatch({ type: "mode", mode: "navigate" }, { ...context, level: { ...context.level, elevationMm: 9000 } });
        expect(a.getSnapshot()?.presentationElevationMm).toBe(1200);
    });
    it("M05 Level Plane captures once at operation start, resets only explicitly", () => {
        const a = start();
        a.dispatch({ type: "kind", kind: "area" }, context);
        a.dispatch({ type: "source", source: "level-plane" }, context);
        pick(a, point(0, 0, 6000));
        expect(a.getSnapshot()?.presentationElevationMm).toBe(6000);
        a.dispatch({ type: "mode", mode: "navigate" }, { ...context, level: { ...context.level, elevationMm: 9000 } });
        expect(a.getSnapshot()?.level?.elevationMm).toBe(6000);
        a.dispatch({ type: "restart" }, { ...context, level: { ...context.level, elevationMm: 9000 } });
        expect(a.getSnapshot()?.presentationElevationMm).toBe(9000);
    });
    it("M05 concavity/winding are valid; duplicate, crossing, touching and degenerate polygons fail", () => {
        const concave = [point(), point(4000), point(2000, 1000), point(4000, 3000), point(0, 3000)];
        expect(areaResult(concave).reason).toBeUndefined();
        expect(areaResult([...concave].reverse()).values).toEqual(areaResult(concave).values);
        for (const invalid of [[point(), point(), point(1, 1)], [point(), point(3), point(6)], [point(), point(3, 3), point(0, 3), point(3)], [point(), point(4), point(2), point(2, 2)]])
            expect(areaResult(invalid).reason).toBeTruthy();
    });
    it("completed results are not overwritten; source/kind/reset clear operands; exit clears transient state", () => {
        const a = start();
        pick(a, point());
        pick(a, point(3, 4));
        pick(a, point(90));
        expect(a.getSnapshot()?.points).toHaveLength(2);
        a.dispatch({ type: "source", source: "level-plane" }, context);
        expect(a.getSnapshot()?.points).toEqual([]);
        a.dispatch({ type: "exit" }, context);
        expect(a.getSnapshot()).toBeNull();
    });
    it("hover previews are genuine calculations without committing operands", () => {
        const a = start();
        pick(a, point());
        a.preview(point(3000, 4000, 12000));
        expect(a.getSnapshot()?.points).toHaveLength(1);
        expect(a.getSnapshot()?.completed).toBe(false);
        expect(getMeasureResult(a.getSnapshot()!).values.map(v => v.value)).toEqual([3000, 4000, 12000, 13000, 5000]);
        a.dispatch({ type: "kind", kind: "angle" }, context);
        pick(a, point(1000));
        pick(a, point());
        a.preview(point(0, 1000));
        expect(getMeasureResult(a.getSnapshot()!).values[0].value).toBe(90);
        expect(a.getSnapshot()?.points).toHaveLength(2);
    });
    it("keeps a rejected duplicate explanation until the hover candidate changes", () => {
        const a = start();
        a.dispatch({ type: "kind", kind: "area" }, context);
        pick(a, point());
        a.preview(point());
        expect(pick(a, point())).toBe(false);
        const reason = a.getSnapshot()?.reason;
        expect(reason).toBeTruthy();
        a.preview(point());
        expect(a.getSnapshot()?.reason).toBe(reason);
        a.preview(point(1000));
        expect(a.getSnapshot()?.reason).toBeUndefined();
        expect(a.getSnapshot()?.points).toEqual([point()]);
    });
});
