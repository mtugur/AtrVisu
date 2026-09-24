import { describe, expect, it } from "vitest";
import type { CivilReferenceItem } from "../types/civil";
import type { LayoutLayer } from "../types/layers";
import type { PlacedMachine } from "../types/machine";
import {
  GROUND_LEVEL_ID,
  changeLevelDatum,
  createLayoutLevel,
  getRelativeElevationMm,
  normalizeLevels,
  reassignEntityLevel
} from "./levels";

const level2 = createLayoutLevel("level-2", "Level 2", 6000, "2026-09-23T00:00:00.000Z");
const machine = (levelId = GROUND_LEVEL_ID, elevationMm = 3000): PlacedMachine => ({
  instanceId: "m1", machineDefinitionId: "machine", definition: { id: "machine", name: "Machine", category: "Test", width: 1, depth: 1, height: 1, defaultColor: "#fff", connectionPoints: [] },
  definitionSnapshot: { id: "machine", name: "Machine", category: "Test", width: 1, depth: 1, height: 1, defaultColor: "#fff", connectionPoints: [] },
  levelId, elevationMm, position: { x: 0, z: 0 }, rotationY: 0, flowDirection: "forward"
});
const civil = (levelId = GROUND_LEVEL_ID, elevationMm = 1000): CivilReferenceItem => ({
  id: "c1", type: "column", name: "Column", levelId, positionMm: { xMm: 0, yMm: 0, zMm: elevationMm }, sizeMm: { widthMm: 400, depthMm: 400, heightMm: 3000 }, rotationDeg: 0, createdAt: "now", updatedAt: "now"
});
const layers: LayoutLayer[] = [{ id: "default", name: "Default", visible: true, locked: false, createdAt: "now", updatedAt: "now" }];

describe("Level datum authority", () => {
  it("migrates missing data to a stable zero Ground datum", () => {
    expect(normalizeLevels(undefined)).toEqual([expect.objectContaining({ id: "ground", name: "Ground", elevationMm: 0, systemLevel: true })]);
  });

  it("reassigns machines and civil items while preserving relative elevation", () => {
    const levels = normalizeLevels([level2]);
    const movedMachine = reassignEntityLevel("machine:m1", level2.id, levels, [machine()], [civil()], layers);
    expect(movedMachine.machines[0]).toMatchObject({ levelId: "level-2", elevationMm: 9000 });
    expect(getRelativeElevationMm(movedMachine.machines[0].elevationMm ?? 0, level2)).toBe(3000);
    const movedCivil = reassignEntityLevel("civil:c1", level2.id, levels, movedMachine.machines, [civil()], layers);
    expect(movedCivil.civilReferences[0]).toMatchObject({ levelId: "level-2", positionMm: { zMm: 7000 } });
  });

  it("changes a datum atomically and preserves every assigned relative elevation", () => {
    const levels = normalizeLevels([level2]);
    const result = changeLevelDatum("level-2", 7500, levels, [machine("level-2", 9000)], [civil("level-2", 7000)], layers);
    expect(result.ok).toBe(true);
    expect(result.machines[0].elevationMm).toBe(10500);
    expect(result.civilReferences[0].positionMm.zMm).toBe(8500);
    expect(result.levels.find((item) => item.id === "level-2")?.elevationMm).toBe(7500);
  });

  it("blocks the whole datum change when any assigned entity is locked", () => {
    const levels = normalizeLevels([level2]);
    const result = changeLevelDatum("level-2", 7500, levels, [machine("level-2", 9000)], [{ ...civil("level-2", 7000), locked: true }], layers);
    expect(result.ok).toBe(false);
    expect(result.machines[0].elevationMm).toBe(9000);
    expect(result.levels.find((item) => item.id === "level-2")?.elevationMm).toBe(6000);
    expect(result.reason).toContain("locked");
  });
});
