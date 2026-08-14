import { describe, expect, it } from "vitest";
import { createCommercialOutputSnapshot, getCommercialOutputProperty } from "./commercialOutputSnapshot";
import { createCommercialOutputFileName, sanitizeCommercialOutputFilePart } from "./fileNames";
import { createLayoutPlanModel } from "./layoutPlan";
import { commercialOutputFixtureInput } from "./testFixtures";

describe("commercial output snapshot", () => {
  it("derives one immutable deterministic snapshot from canonical layout and P1-E mappings", () => {
    const snapshot = createCommercialOutputSnapshot(commercialOutputFixtureInput());

    expect(snapshot.metadata).toMatchObject({
      projectName: "ATARA Line / 01",
      layoutName: "Production: West",
      revision: "R1",
      generatedAt: "2026-08-14T10:20:30.000Z",
      canonicalUnit: "mm"
    });
    expect(snapshot.equipmentCount).toBe(4);
    expect(snapshot.bomGroupCount).toBe(3);
    expect(snapshot.bomGroups.find((group) => group.machineDefinitionId === "conveyor-belt-01")?.quantity).toBe(2);
    expect(snapshot.equipment.map((instance) => instance.instanceId)).toEqual([
      "conveyor-1", "conveyor-2", "flow-1", "palletizer-1"
    ]);
    expect(snapshot.bomGroups[0].properties.map((property) => property.key)).toEqual(
      snapshot.equipment.find((instance) => instance.machineDefinitionId === "conveyor-belt-01")?.bomProperties.map((property) => property.key)
    );
    expect(getCommercialOutputProperty(snapshot.bomGroups[0].properties, "machineCode")?.rawValue).toBe("BC-01");
    expect(snapshot.dataGapCount).toBeGreaterThan(0);
    expect(snapshot.warnings[0]).toMatch(/commercial fields are unknown/);
    expect(Object.isFrozen(snapshot)).toBe(true);
    expect(Object.isFrozen(snapshot.equipment[0].bomProperties)).toBe(true);
    expect(() => {
      (snapshot.equipment[0].groups as string[]).push("Bypass");
    }).toThrow();
  });

  it("uses explicit professional metadata fallbacks without blocking exports", () => {
    const fixture = commercialOutputFixtureInput();
    const snapshot = createCommercialOutputSnapshot({
      ...fixture,
      metadata: {},
      machines: fixture.machines.slice(0, 1)
    });
    expect(snapshot.metadata).toMatchObject({ projectName: "Untitled", layoutName: "Untitled", revision: "No revision" });
    expect(snapshot.equipmentCount).toBe(1);
  });

  it("uses stable definition identity rather than display name for BOM grouping", () => {
    const fixture = commercialOutputFixtureInput();
    const first = fixture.machines[0];
    const snapshot = createCommercialOutputSnapshot({
      ...fixture,
      machines: [
        first,
        {
          ...first,
          instanceId: "flow-other-definition",
          machineDefinitionId: "packaging-flowpack-02",
          definition: { ...first.definition, id: "packaging-flowpack-02", name: first.definition.name },
          definitionSnapshot: { ...first.definitionSnapshot, id: "packaging-flowpack-02", name: first.definition.name }
        }
      ]
    });
    expect(snapshot.bomGroupCount).toBe(2);
  });

  it("computes canonical rotated extents for zero, right-angle, arbitrary and negative footprints", () => {
    const snapshot = createCommercialOutputSnapshot(commercialOutputFixtureInput());
    expect(snapshot.extents).not.toBeNull();
    expect(snapshot.extents?.minXMm).toBeLessThan(0);
    expect(snapshot.extents?.minYMm).toBeLessThan(0);
    expect(snapshot.extents?.widthMm).toBeGreaterThan(17000);
    const conveyor90 = snapshot.equipment.find((instance) => instance.instanceId === "conveyor-1");
    const xs = conveyor90?.footprint.cornersMm.map((point) => Math.round(point.xMm));
    const ys = conveyor90?.footprint.cornersMm.map((point) => Math.round(point.yMm));
    expect(Math.max(...(xs ?? [])) - Math.min(...(xs ?? []))).toBe(900);
    expect(Math.max(...(ys ?? [])) - Math.min(...(ys ?? []))).toBe(5200);
  });

  it("creates one report-mapped equipment schedule without PDF-specific property interpretation", () => {
    const snapshot = createCommercialOutputSnapshot(commercialOutputFixtureInput());
    const plan = createLayoutPlanModel(snapshot);
    expect(plan.schedule).toHaveLength(4);
    expect(plan.schedule.find((row) => row.instanceId === "flow-1")).toMatchObject({
      machineCode: "FP-01",
      manufacturer: "Atara Makine",
      electricalPower: "12.5 kW"
    });
    expect(plan.schedule.find((row) => row.instanceId === "palletizer-1")?.electricalPower).toBe("Unknown");
    expect(plan.xDimensionLabel).toMatch(/mm$/);
    expect(plan.yDimensionLabel).toMatch(/mm$/);
  });

  it("sanitizes all three deterministic filenames from shared metadata", () => {
    const metadata = createCommercialOutputSnapshot(commercialOutputFixtureInput()).metadata;
    expect(sanitizeCommercialOutputFilePart("  A/B:* C  ")).toBe("A_B_C");
    expect(createCommercialOutputFileName(metadata, "bom")).toBe("ATARA_Line_01_Production_West_R1_BOM.xlsx");
    expect(createCommercialOutputFileName(metadata, "plan")).toBe("ATARA_Line_01_Production_West_R1_Plan.pdf");
    expect(createCommercialOutputFileName(metadata, "snapshot")).toBe("ATARA_Line_01_Production_West_R1_3D.png");
  });
});
