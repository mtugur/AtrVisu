import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { MeasureTool, type MeasureToolProps } from "./MeasureTool";
import { createMeasureAuthority } from "../../measure/measureAuthority";
import { createAnnotation } from "../../utils/annotations";
import { cloneMeasureDimensionStyle } from "../../measure/referenceTypes";

const props = (): MeasureToolProps => ({
  authority: createMeasureAuthority(), annotations: [], entities: [], levels: [], onAction: vi.fn(),
  onKeep: vi.fn(), onRenameDimension: vi.fn(), onSetDimensionVisibility: vi.fn(), onSetAllDimensionVisibility: vi.fn(),
  onDeleteDimension: vi.fn(), onUpdateDimensionStyle: vi.fn(), onUpdateDimensionReference: vi.fn()
});
describe("M20/M23/M26 Measure workspace presentation", () => {
  it("Issue 139 offers explicit interpretations and deliberate workflows, while unsupported clearance remains NOT READY", () => {
    const p = props(); p.authority.dispatch({ type: "toggle" }, { selectionIds: [], entities: [], machines: [] });
    const markup = renderToStaticMarkup(createElement(MeasureTool, p));
    for (const value of ["true-3d", "plan-xy", "vertical-xz", "vertical-yz", "axis-x", "axis-y", "axis-z", "fan-out", "chain", "selected-pair"])
      expect(markup).toContain(`value="${value}"`);
    expect(markup).toContain("Reference Point Diagnostic");
    expect(markup).toContain("Shortest surface distance: NOT READY");
    expect(markup).toContain("Accumulate: NOT READY");
  });
  it("Issue 139 displays actual A/B and projected B separately without discarding XYZ or signed deltas", () => {
    const p = props(); const context = { selectionIds: [], entities: [], machines: [] };
    p.authority.dispatch({ type: "toggle" }, context);
    for (const point of [{ xMm: 0, yMm: 0, zMm: 1000 }, { xMm: 3000, yMm: 4000, zMm: 2200 }]) {
      p.authority.beginPress(1, 0, 0); p.authority.endPress(1, 0, 0, true, point);
    }
    p.authority.dispatch({ type: "projectionMode", projectionMode: "plan-xy" }, context);
    const markup = renderToStaticMarkup(createElement(MeasureTool, p));
    for (const label of ["Reference A confirmed", "Reference B confirmed", "Projected B"]) expect(markup).toContain(`aria-label="${label}"`);
    for (const label of ["Plan XY Distance", "3D Distance", "Plan Distance", "Delta X", "Delta Y", "Delta Z"]) expect(markup).toContain(label);
    expect(markup).toContain('value="2200"'); expect(markup).toContain('value="1000"');
    p.authority.markKept("saved");
    const kept = renderToStaticMarkup(createElement(MeasureTool, p));
    expect(kept.match(/<button[^>]*>Keep \/ Save<\/button>/)?.[0]).toContain('disabled=""');
    expect(kept).toContain("Saved");
  });
  it("Issue 139 paused session exposes resume and disables picking controls without deleting saved annotations", () => {
    const p = props(); const context = { selectionIds: [], entities: [], machines: [] };
    p.authority.dispatch({ type: "toggle" }, context); p.authority.dispatch({ type: "pauseForEdit" }, context);
    const markup = renderToStaticMarkup(createElement(MeasureTool, p));
    expect(markup).toContain("Resume Measure"); expect(markup).toContain("saved dimensions are retained");
    expect(markup).toMatch(/<fieldset[^>]*disabled=""/);
    expect(p.authority.getActive()).toBe(false);
  });
  for (const confirmable of [true, false]) it(`T03 exposes a truthful locked reference and confirmable=${confirmable} state`, () => {
    const p = props();
    const entity = { id: "civil:column", type: "civil" as const, name: "Column", visible: true, locked: false, selectable: true,
      transform: { planX: 1000, planY: 2000, elevation: 0, rotationDeg: 0 }, childrenIds: [], connectors: [],
      properties: ["widthMm", "depthMm", "heightMm"].map(key => ({ key, label: key, value: 1000, unit: "mm" as const })) };
    p.authority.dispatch({ type: "toggle" }, { entities: [entity], machines: [], selectionIds: [] });
    const point = { xMm: 1000, yMm: 2000, zMm: 1000, entityId: entity.id, anchorKind: "front-left-top" as const };
    p.authority.lockAnchor(point);
    p.authority.project({ width: 640, height: 800, lines: [], markers: [], lockedAnchor: {
      reference: p.authority.getSnapshot()!.lockedReference!, entityName: entity.name, point: confirmable ? point : null,
      visible: false, confirmable, reason: confirmable ? "Covered by chrome" : "Reference unavailable"
    } });
    const markup = renderToStaticMarkup(createElement(MeasureTool, p));
    expect(markup).toContain('aria-label="Locked Anchor"');
    expect(markup).toContain("Front Left Top"); expect(markup).toContain("Confirm Locked Anchor");
    expect(markup).toContain(confirmable ? "Covered by chrome" : "Reference unavailable");
    expect(markup.match(/<button[^>]*>Confirm Locked Anchor<\/button>/)?.[0].includes('disabled=""')).toBe(!confirmable);
  });
  it("has an intentional empty list and no implicit selected saved dimension", () => {
    const markup = renderToStaticMarkup(createElement(MeasureTool, props()));
    expect(markup).toContain("No saved dimensions.");
    expect(markup).not.toContain('aria-label="Reference Dimension Editor"');
  });
  it("exposes all style controls and keeps broken entity references explicitly repairable", () => {
    const p = props(); const annotation = { ...createAnnotation({ type: "dimension-note" }), dimension: {
      schemaVersion: 1 as const, dimensionKind: "distance" as const, name: "Broken reference", visible: true,
      references: [{ type: "entity-anchor" as const, entityId: "machine:deleted", anchor: "front-left-bottom" as const }, { type: "world-point" as const, xMm: 0, yMm: 0, zMm: 0 }],
      style: cloneMeasureDimensionStyle(), status: "healthy" as const
    } };
    p.annotations = [annotation]; p.authority.selectDimension(annotation.id);
    const markup = renderToStaticMarkup(createElement(MeasureTool, p));
    expect(markup).toContain("Orphaned"); expect(markup).toContain("Unavailable: machine:deleted");
    for (const label of ["Text Mode", "Display", "Units", "Reference A entity", "Reference A anchor", "Reference A type"]) expect(markup).toContain(`aria-label="${label}"`);
    for (const label of ["Font", "Min px", "Max px", "Fixed text px", "Line px", "Arrow px", "Text offset px", "Witness lines", "Leaders", "Halo"]) expect(markup).toContain(label);
  });
  it("M22/M23 presents saved Plan Area, perimeter and its captured Geometry plane", () => {
    const p = props();
    const annotation = { ...createAnnotation({ type: "area-note" }), dimension: {
      schemaVersion: 1 as const, dimensionKind: "area" as const, name: "Raised area", visible: true,
      references: [
        { type: "world-point" as const, xMm: 0, yMm: 0, zMm: 1500 },
        { type: "world-point" as const, xMm: 2000, yMm: 0, zMm: 1600 },
        { type: "world-point" as const, xMm: 0, yMm: 1000, zMm: 1700 }
      ],
      presentationElevationMm: 1500, style: cloneMeasureDimensionStyle(), status: "healthy" as const
    } };
    p.annotations = [annotation]; p.authority.selectDimension(annotation.id);
    const markup = renderToStaticMarkup(createElement(MeasureTool, p));
    expect(markup).toContain("Plan Area");
    expect(markup).toContain("Plan Perimeter");
    expect(markup).toContain("Captured Plane");
    expect(markup).toContain("Geometry");
    expect(markup).toContain("1500");
  });
});
