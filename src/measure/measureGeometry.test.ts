import { describe, expect, it } from "vitest";
import type { PlatformEntity } from "../platform/contracts";
import type { PlacedMachine } from "../types/machine";
import { dimensionsForEntity, dimensionLines, pairResult } from "./measureGeometry";
import { createMeasureAuthority, getMeasureResult } from "./measureAuthority";
import { calculateReferencePointMeasurementBetweenMachines } from "../utils/placement";
const entity = (id: string, type: PlatformEntity["type"] = "civil"): PlatformEntity => ({
    id, type, name: id, transform: { planX: 3000, planY: -4000, elevation: -350, rotationDeg: 90 },
    properties: ["widthMm", "depthMm", "heightMm"].map((key, i) => ({ key, label: key, value: [4000, 3000, 350][i], unit: "mm" })),
    connectors: [], childrenIds: [], visible: true, locked: true, selectable: true
});
const machine = (id: string, xMm: number, yMm: number, elevationMm: number): PlacedMachine => {
    const definition = { id: "definition", name: id, category: "test", width: 4, depth: 3, height: .35, defaultColor: "#888888", connectionPoints: [] };
    return { instanceId: id, machineDefinitionId: definition.id, definition, definitionSnapshot: definition,
        position: { x: xMm / 1000, z: yMm / 1000 }, positionMm: { xMm, yMm }, elevationMm,
        rotationY: 0, rotationDeg: 0, flowDirection: "forward" };
};
describe("M06 canonical selected dimensions and ordered references", () => {
    it("reads rotated LOCAL dimensions, not World AABB; locked visible remains readable", () => {
        const e = entity("civil:floor");
        expect(dimensionsForEntity(e).values.map(v => v.value)).toEqual([4000, 3000, 350]);
        const lines = dimensionLines(e);
        expect(lines.map(line => Math.hypot(line.points[1].xMm - line.points[0].xMm, line.points[1].yMm - line.points[0].yMm, line.points[1].zMm - line.points[0].zMm))).toEqual([4000, 3000, 350]);
        expect(dimensionsForEntity(entity("group:g", "group")).reason).toBeTruthy();
        expect(dimensionsForEntity({ ...e, properties: [] }).reason).toBeTruthy();
    });
    it("Floor uses Plan Depth and Floor Thickness without changing canonical values", () => {
        const floor = entity("civil:floor");
        floor.properties = [...floor.properties, { key: "sourceSubtype", label: "Source subtype", value: "floor-area", unit: "unknown" }];
        expect(dimensionsForEntity(floor).values.map(v => [v.label, v.value])).toEqual([["Local Width", 4000], ["Plan Depth", 3000], ["Floor Thickness", 350]]);
        expect(dimensionLines(floor).map(l => l.label)).toEqual(["Local Width", "Plan Depth", "Floor Thickness"]);
    });
    it("keeps entry order and Floor BOTTOM reference, not FFL or minimum clearance", () => {
        const floor = entity("civil:floor");
        const wall = { ...entity("civil:wall"), transform: { planX: 0, planY: 0, elevation: 6000, rotationDeg: 0 } };
        expect(pairResult([floor, wall], []).values.map(v => v.value).slice(0, 3)).toEqual([-3000, 4000, 6350]);
        expect(pairResult([wall, floor], []).values.map(v => v.value).slice(0, 3)).toEqual([3000, -4000, -6350]);
        const authority = createMeasureAuthority();
        const context = { selectionIds: [wall.id, floor.id], primaryId: wall.id, entities: [floor, wall], machines: [] };
        authority.dispatch({ type: "toggle" }, context);
        authority.dispatch({ type: "kind", kind: "pair" }, context);
        expect(authority.getSnapshot()!.entry.entities.map(e => e.id)).toEqual([wall.id, floor.id]);
        floor.transform.elevation = 99999;
        expect(getMeasureResult(authority.getSnapshot()!).values[2].value).toBe(-6350);
    });
    it("uses the existing Machine/Machine Plan reference authority exactly", () => {
        const a = machine("a", -3000, 4000, 12000), b = machine("b", 0, 0, 0);
        const entities = [a, b].map(m => ({ ...entity(`machine:${m.instanceId}`, "machine"), transform: {
                planX: m.positionMm!.xMm, planY: m.positionMm!.yMm, elevation: m.elevationMm!, rotationDeg: 0
            } }));
        const canonical = calculateReferencePointMeasurementBetweenMachines(a, b);
        const values = pairResult(entities, [a, b]).values;
        expect(values[0].value).toBe(canonical.deltaXMm);
        expect(values[1].value).toBe(canonical.deltaYMm);
        expect(values[4].value).toBe(canonical.referencePointDistanceMm);
    });
    it("unresolved/unsupported entry selection cannot become a supported filtered subset", () => {
        const e = entity("civil:a");
        const context = { selectionIds: [e.id, "civil:missing"], entities: [e], machines: [] };
        const authority = createMeasureAuthority();
        authority.dispatch({ type: "toggle" }, context);
        for (const kind of ["dimensions", "pair"] as const) {
            authority.dispatch({ type: "kind", kind }, context);
            expect(getMeasureResult(authority.getSnapshot()!).reason).toBeTruthy();
        }
    });
});
