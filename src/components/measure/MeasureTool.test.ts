import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { MeasureTool } from "./MeasureTool";
import { createMeasureAuthority } from "../../measure/measureAuthority";
describe("Measure viewport surface", () => {
    it("has no inactive graphics, one active surface and registered-action callbacks", () => {
        const authority = createMeasureAuthority();
        const render = () => renderToStaticMarkup(createElement(MeasureTool, { authority, onAction: vi.fn() }));
        expect(render()).toBe("");
        authority.dispatch({ type: "toggle" }, { selectionIds: [], entities: [], machines: [] });
        const html = render();
        for (const label of ["Measurement kind", "Measure input mode", "Measurement point source", "Restart Measure", "Exit Measure", "Measure viewport graphics"])
            expect(html).toContain(label);
        expect(html).not.toContain('role="dialog"');
        expect(html).toContain('data-editor-only="true"');
        authority.dispatch({ type: "exit" }, { selectionIds: [], entities: [], machines: [] });
        expect(render()).toBe("");
    });
    it("renders signed canonical values and source context, not a persisted dimension", () => {
        const authority = createMeasureAuthority();
        const context = { selectionIds: [], entities: [], machines: [], level: { id: "ground", name: "Ground", elevationMm: 0 } };
        authority.dispatch({ type: "toggle" }, context);
        authority.dispatch({ type: "source", source: "level-plane" }, context);
        for (const p of [{ xMm: 3000, yMm: 4000, zMm: 12000 }, { xMm: 0, yMm: 0, zMm: 0 }]) {
            authority.beginPress(1, 0, 0);
            authority.endPress(1, 0, 0, true, p);
        }
        const html = renderToStaticMarkup(createElement(MeasureTool, { authority, onAction: vi.fn() }));
        expect(html).toContain("Ground | FFL 0.000 mm");
        for (const text of ["-3000.000 mm", "-4000.000 mm", "-12000.000 mm", "13000.000 mm", "5000.000 mm"])
            expect(html).toContain(text);
        authority.project({ width: 640, height: 80, markers: [], lines: [{ points: [{ x: 0, y: 0 }, { x: 20, y: 20 }], label: "3D Distance" }] });
        const compact = renderToStaticMarkup(createElement(MeasureTool, { authority, onAction: vi.fn() }));
        expect(compact).not.toContain("foreignObject");
        expect(compact).toContain("13000.000 mm");
    });
});
