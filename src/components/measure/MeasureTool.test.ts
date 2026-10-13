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
