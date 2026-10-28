import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { PlatformEntity } from "../platform/contracts";
import { MeasureTool, type MeasureToolProps } from "../components/measure/MeasureTool";
import { createMeasureAuthority, getMeasureDimensionGroups, getMeasureLines, getMeasureResult, isMeasureAction, measureSessionMatchesDimension, type MeasureContext } from "./measureAuthority";
import { cloneMeasureDimensionStyle } from "./referenceTypes";

const entity = (id: string, name: string, size: number[], planX = 0): PlatformEntity => ({
  id, name, type: id.startsWith("civil:") ? "civil" : "machine", visible: true, locked: false, selectable: true,
  transform: { planX, planY: 1200, elevation: 600, rotationDeg: 0 }, childrenIds: [], connectors: [],
  properties: ["widthMm", "depthMm", "heightMm"].map((key, i) => ({ key, label: key, value: size[i], unit: "mm" }))
});
const a = entity("machine:a", "Flow Pack", [2000, 1000, 1500]);
const b = entity("machine:b", "Conveyor", [3000, 1200, 2300], 4500);
const context: MeasureContext = { selectionIds: [a.id, b.id], primaryId: b.id, entities: [a, b], machines: [] };
const open = (ctx = context) => { const authority = createMeasureAuthority(); authority.dispatch({ type: "toggle" }, ctx); return authority; };
const markup = (authority: ReturnType<typeof open>) => {
  const noop = () => undefined;
  const props: MeasureToolProps = { authority, entities: [a, b], levels: [], annotations: [], onAction: noop, onKeep: noop, isDimensionEditable: () => true,
    onRenameDimension: noop, onSetDimensionVisibility: noop, onSetAllDimensionVisibility: noop, onDeleteDimension: noop,
    onUpdateDimensionStyle: noop, onUpdateDimensionReference: noop };
  return renderToStaticMarkup(createElement(MeasureTool, props));
};

describe("Renewed C03 A - reviewable real-world references", () => {
  it("presents an unlocked semantic identity and full-precision-backed coordinates before confirming A", () => {
    const authority = open();
    authority.preview({ xMm: 1.23456789, yMm: -2500.125, zMm: 2100, entityId: a.id, anchorKind: "front-left-top" });
    const html = markup(authority);
    expect(html).toContain('aria-label="Reference A preview"');
    expect(html).toContain(a.name); expect(html).toContain(a.id); expect(html).toContain("Front Left Top");
    expect(html).toContain('value="1.23456789"');
    for (const axis of ["X", "Y", "Z"]) expect(html).toContain(`World ${axis}`);
    expect(authority.getSnapshot()!.points).toEqual([]);
  });
  it("keeps confirmed A visible while B previews and distinguishes 3D, Plan and signed Delta Z", () => {
    const authority = open();
    const pointA = { xMm: 0, yMm: 0, zMm: 1500, entityId: a.id, anchorKind: "front-left-top" as const };
    const pointB = { xMm: 3000, yMm: 4000, zMm: 2700, entityId: b.id };
    authority.beginPress(1, 0, 0); authority.endPress(1, 0, 0, true, pointA); authority.preview(pointB);
    const html = markup(authority);
    for (const text of ["Reference A confirmed", "Reference B preview", "3D Distance", "Plan Distance", "Delta Z", "Free Geometry Hit"]) expect(html).toContain(text);
    const result = getMeasureResult(authority.getSnapshot()!);
    expect(result.values.find(v => v.label === "3D Distance")?.value).toBe(Math.hypot(3000, 4000, 1200));
    expect(result.values.find(v => v.label === "Plan Distance")?.value).toBe(5000);
    expect(result.values.find(v => v.label === "Delta Z")?.value).toBe(1200);
    authority.beginPress(2, 0, 0); authority.endPress(2, 0, 0, true, pointB);
    authority.dispatch({ type: "mode", mode: "navigate" }, context);
    expect(authority.getSnapshot()!.points).toEqual([pointA, pointB]);
    expect(getMeasureResult(authority.getSnapshot()!)).toEqual(result);
  });
});

describe("Renewed C03 C/D - entry-selected per-entity dimensions", () => {
  it("retains single-entity and rotated Civil local dimensions rather than aggregate world bounds", () => {
    const floor = { ...entity("civil:floor", "Floor Area", [12000, 7000, 350]), transform: { ...a.transform, elevation: -350, rotationDeg: 37 },
      properties: [...entity("civil:floor", "Floor Area", [12000, 7000, 350]).properties, { key: "sourceSubtype", label: "Type", value: "floor-area", unit: "unknown" as const }] };
    const authority = open({ ...context, selectionIds: [floor.id], primaryId: floor.id, entities: [floor] });
    authority.dispatch({ type: "kind", kind: "dimensions" }, context);
    expect(getMeasureResult(authority.getSnapshot()!).values.map(value => [value.label, value.value])).toEqual([["Local Width", 12000], ["Plan Depth", 7000], ["Floor Thickness", 350]]);
    expect(getMeasureLines(authority.getSnapshot()!)).toHaveLength(3);
    expect(markup(authority)).toContain("Floor Area");
  });
  it("names unsupported/missing entries and never silently substitutes a different active entity", () => {
    const unsupported = { ...a, id: "annotation:text", name: "Text note", type: "annotation" as const };
    const authority = open({ ...context, selectionIds: [a.id, unsupported.id, "civil:missing"], primaryId: unsupported.id, entities: [a, unsupported] });
    authority.dispatch({ type: "kind", kind: "dimensions" }, context);
    expect(authority.getSnapshot()!.activeDimensionEntityId).toBe(a.id);
    expect(getMeasureDimensionGroups(authority.getSnapshot()!).map(group => [group.id, group.eligible])).toEqual([[a.id, true], [unsupported.id, false], ["civil:missing", false]]);
    authority.updateEntities([]);
    expect(authority.getSnapshot()!.activeDimensionEntityId).toBe(a.id);
    expect(getMeasureResult(authority.getSnapshot()!).reason).toBeTruthy();
    authority.dispatch({ type: "activeDimensionEntity", entityId: b.id }, context);
    expect(authority.getSnapshot()!.activeDimensionEntityId).toBe(a.id);
  });
  it("defaults to the eligible primary, not the first entry, without resnapshotting on Kind/Restart", () => {
    const authority = open();
    const other = { ...context, selectionIds: [a.id], primaryId: a.id };
    authority.dispatch({ type: "kind", kind: "dimensions" }, other);
    expect(getMeasureResult(authority.getSnapshot()!).values.map(v => v.value)).toEqual([3000, 1200, 2300]);
    expect(getMeasureLines(authority.getSnapshot()!)).toHaveLength(3);
    expect(getMeasureLines(authority.getSnapshot()!)[0].points[0].xMm).toBe(b.transform.planX);
    authority.dispatch({ type: "restart" }, other);
    expect(getMeasureResult(authority.getSnapshot()!).values[0].value).toBe(3000);
    expect(authority.getSnapshot()!.entry.selectionIds).toEqual([a.id, b.id]);
    const html = markup(authority); expect(html).toContain(a.name); expect(html).toContain(b.name);
  });
  it("changes only the active Measure result and matches a saved Annotation for that entity", () => {
    const authority = open(); authority.dispatch({ type: "kind", kind: "dimensions" }, context);
    const action = { type: "activeDimensionEntity", entityId: a.id } as const;
    expect(isMeasureAction(action)).toBe(true);
    if (isMeasureAction(action)) authority.dispatch(action, context);
    expect(getMeasureResult(authority.getSnapshot()!).values.map(v => v.value)).toEqual([2000, 1000, 1500]);
    const dimension = { schemaVersion: 1 as const, dimensionKind: "dimensions" as const, name: "Named dimensions", visible: true,
      references: [{ type: "entity-anchor" as const, entityId: a.id, anchor: "front-left-bottom" as const }],
      style: cloneMeasureDimensionStyle(), status: "healthy" as const };
    expect(measureSessionMatchesDimension(authority.getSnapshot(), dimension)).toBe(true);
    expect(measureSessionMatchesDimension(authority.getSnapshot(), { ...dimension, references: [{ ...dimension.references[0], entityId: b.id }] })).toBe(false);
    expect(authority.getSnapshot()!.entry.selectionIds).toEqual(context.selectionIds);
    expect(isMeasureAction({ type: "activeDimensionEntity", entityId: 42 })).toBe(false);
  });
  it("uses canonical live geometry for the frozen entry identities and explains invalid/empty results", () => {
    const authority = open(); authority.dispatch({ type: "kind", kind: "dimensions" }, context);
    authority.updateEntities([a, entity(b.id, b.name, [3100, 1300, 2400], 4500)]);
    expect(getMeasureResult(authority.getSnapshot()!).values.map(v => v.value)).toEqual([3100, 1300, 2400]);
    const empty = open({ ...context, selectionIds: [], primaryId: null });
    empty.dispatch({ type: "kind", kind: "dimensions" }, context);
    expect(markup(empty)).toContain("before entering Measure");
    expect(getMeasureResult(empty.getSnapshot()!).reason).toBeTruthy();
    const invalid = entity("civil:invalid", "Invalid Civil", [100, 200, Number.NaN]);
    const mixed = open({ ...context, selectionIds: [invalid.id, a.id], primaryId: invalid.id, entities: [invalid, a] });
    mixed.dispatch({ type: "kind", kind: "dimensions" }, context);
    expect(getMeasureResult(mixed.getSnapshot()!).values.map(v => v.value)).toEqual([2000, 1000, 1500]);
    expect(markup(mixed)).toContain("Canonical local dimensions are unavailable");
    mixed.dispatch({ type: "kind", kind: "pair" }, context);
    expect(getMeasureResult(mixed.getSnapshot()!).values.some(v => v.label === "3D Distance")).toBe(true);
  });
});
