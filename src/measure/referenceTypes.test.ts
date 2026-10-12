import { describe, expect, it } from "vitest";
import { cloneMeasureDimensionStyle, DEFAULT_MEASURE_DIMENSION_STYLE } from "./referenceTypes";
import { getSemanticAnchorPoints, resolveMeasureReference } from "./measureReferences";
import type { PlatformEntity } from "../platform/contracts";
import { measurePointToReference } from "./measureAuthority";
import { resolveDimensionReferences } from "./measureReferences";
import { createAnnotation, normalizeAnnotations } from "../utils/annotations";

const machine: PlatformEntity = {
  id: "machine:test",
  type: "machine",
  name: "Test Machine",
  transform: { planX: 1000, planY: 2000, elevation: 300, rotationDeg: 0 },
  properties: [
    { key: "widthMm", label: "Width", value: 4000, unit: "mm" },
    { key: "depthMm", label: "Depth", value: 2000, unit: "mm" },
    { key: "heightMm", label: "Height", value: 3000, unit: "mm" }
  ],
  connectors: [],
  childrenIds: [],
  visible: true,
  locked: false,
  selectable: true
};

describe("C03 V2 reference model", () => {
  it("M26/M27 preserves LevelPointRef through annotation serialization and follows its live FFL", () => {
    const reference = measurePointToReference({ xMm: 123.4567, yMm: -987.6543, zMm: 6000, levelId: "level-2" });
    expect(reference).toEqual({ type: "level-point", levelId: "level-2", xMm: 123.4567, yMm: -987.6543 });
    const dimension = { schemaVersion: 1 as const, dimensionKind: "distance" as const, name: "Level reference", visible: true, references: [reference, { type: "world-point" as const, xMm: 0, yMm: 0, zMm: 0 }], style: cloneMeasureDimensionStyle(), status: "healthy" as const };
    const annotation = { ...createAnnotation({ type: "dimension-note", positionMm: { xMm: 0, yMm: 0, zMm: 0 } }), dimension };
    const restored = normalizeAnnotations(JSON.parse(JSON.stringify([annotation])))[0].dimension!;
    expect(restored.references).toEqual(dimension.references);
    expect(resolveMeasureReference(restored.references[0], [], [{ id: "level-2", name: "Level 2", elevationMm: 6500, systemLevel: false, createdAt: "2026-01-01", updatedAt: "2026-01-01" }])?.zMm).toBe(6500);
    expect(resolveDimensionReferences(restored, [], []).orphaned).toBe(true);
  });
  it("M27 re-resolves anchors after translation, rotation and dimension changes without a stale fallback", () => {
    const ref = { type: "entity-anchor" as const, entityId: machine.id, anchor: "front-right-bottom" as const };
    const moved = { ...machine, transform: { ...machine.transform, planX: 2000, rotationDeg: 90 } };
    expect(resolveMeasureReference(ref, [moved], [])).not.toEqual(resolveMeasureReference(ref, [machine], []));
    const resized = { ...machine, properties: machine.properties.map(p => p.key === "widthMm" ? { ...p, value: 8000 } : p) };
    expect(resolveMeasureReference(ref, [resized], [])?.xMm).toBe(9000);
    expect(resolveMeasureReference(ref, [], [])).toBeNull();
  });
  it("derives semantic anchors from canonical entity dimensions", () => {
    const anchors = getSemanticAnchorPoints(machine);
    expect(anchors["front-left-bottom"]).toMatchObject({ xMm: 1000, yMm: 2000, zMm: 300 });
    expect(anchors["front-right-bottom"]).toMatchObject({ xMm: 5000, yMm: 2000, zMm: 300 });
    expect(anchors["top-face-center"]).toMatchObject({ xMm: 3000, yMm: 3000, zMm: 3300 });
  });

  it("resolves an entity anchor without using render geometry", () => {
    const point = resolveMeasureReference(
      { type: "entity-anchor", entityId: machine.id, anchor: "back-left-bottom" },
      [machine],
      []
    );
    expect(point).toMatchObject({ xMm: 1000, yMm: 4000, zMm: 300 });
  });

  it("keeps adaptive style bounds explicit and independent from measurement value", () => {
    const style = cloneMeasureDimensionStyle({ adaptiveMinTextPx: 9, adaptiveMaxTextPx: 21 });
    expect(style.adaptiveMinTextPx).toBe(9);
    expect(style.adaptiveMaxTextPx).toBe(21);
    expect(DEFAULT_MEASURE_DIMENSION_STYLE.precision).toBe(3);
    expect(style.displayMode).toBe("depth");
    expect(style.textSizeMode).toBe("adaptive");
    expect(style.adaptiveMaxTextPx).toBeGreaterThan(style.adaptiveMinTextPx);
  });
});
