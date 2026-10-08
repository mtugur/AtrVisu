import type { PlatformEntity } from "../platform/contracts";
import type { PlacedMachine } from "../types/machine";
import { getFootprintCornersFromReferenceMm } from "../utils/coordinateReference";
import { calculateReferencePointMeasurementBetweenMachines } from "../utils/placement";
export type MeasurePoint = {
    xMm: number;
    yMm: number;
    zMm: number;
    entityId?: string;
};
export type MeasureKind = "distance" | "angle" | "area" | "dimensions" | "pair";
export type MeasureValue = {
    label: string;
    value: number;
    unit: "mm" | "mm2" | "m2" | "deg";
};
export type MeasureResult = {
    values: readonly MeasureValue[];
    reason?: string;
};
export type MeasureLine = {
    points: readonly MeasurePoint[];
    label?: string;
    preview?: boolean;
};
export const MEASURE_LENGTH_EPSILON_MM = .001;
export const isFiniteMeasurePoint = (p: MeasurePoint) => [p.xMm, p.yMm, p.zMm].every(Number.isFinite);
const value = (label: string, n: number, unit: MeasureValue["unit"] = "mm"): MeasureValue => ({ label, value: n, unit });
export const formatMeasureValue = ({ value: n, unit }: MeasureValue) => {
    const text = n.toFixed(unit === "m2" ? 6 : 3);
    return `${Number(text) === 0 ? Math.abs(Number(text)).toFixed(unit === "m2" ? 6 : 3) : text} ${unit}`;
};
export const distanceResult = (a: MeasurePoint, b: MeasurePoint): MeasureResult => {
    if (![a, b].every(isFiniteMeasurePoint))
        return { values: [], reason: "Non-finite point." };
    const x = b.xMm - a.xMm, y = b.yMm - a.yMm, z = b.zMm - a.zMm;
    if (![x, y, z, Math.hypot(x, y, z)].every(Number.isFinite))
        return { values: [], reason: "Non-finite distance result." };
    return { values: [value("Delta X", x), value("Delta Y", y), value("Delta Z", z), value("3D Distance", Math.hypot(x, y, z)), value("Plan Distance", Math.hypot(x, y))] };
};
export const angleResult = (a: MeasurePoint, b: MeasurePoint, c: MeasurePoint): MeasureResult => {
    if (![a, b, c].every(isFiniteMeasurePoint))
        return { values: [], reason: "Non-finite point." };
    const u = [a.xMm - b.xMm, a.yMm - b.yMm, a.zMm - b.zMm], v = [c.xMm - b.xMm, c.yMm - b.yMm, c.zMm - b.zMm];
    const ul = Math.hypot(...u), vl = Math.hypot(...v);
    if (![ul, vl].every(Number.isFinite))
        return { values: [], reason: "Non-finite angle result." };
    if (Math.min(ul, vl) <= MEASURE_LENGTH_EPSILON_MM)
        return { values: [], reason: "Angle arm has zero length." };
    return { values: [value("Angle A-B-C (B vertex)", Math.acos(Math.max(-1, Math.min(1, u.reduce((sum, n, i) => sum + (n / ul) * (v[i] / vl), 0)))) * 180 / Math.PI, "deg")] };
};
const planDistance = (a: MeasurePoint, b: MeasurePoint) => Math.hypot(a.xMm - b.xMm, a.yMm - b.yMm);
const cross = (a: MeasurePoint, b: MeasurePoint, c: MeasurePoint) => (b.xMm - a.xMm) * (c.yMm - a.yMm) - (b.yMm - a.yMm) * (c.xMm - a.xMm);
const onSegment = (a: MeasurePoint, b: MeasurePoint, p: MeasurePoint) => {
    const length = planDistance(a, b);
    return Math.abs(cross(a, b, p)) <= MEASURE_LENGTH_EPSILON_MM * length
        && p.xMm >= Math.min(a.xMm, b.xMm) - MEASURE_LENGTH_EPSILON_MM && p.xMm <= Math.max(a.xMm, b.xMm) + MEASURE_LENGTH_EPSILON_MM
        && p.yMm >= Math.min(a.yMm, b.yMm) - MEASURE_LENGTH_EPSILON_MM && p.yMm <= Math.max(a.yMm, b.yMm) + MEASURE_LENGTH_EPSILON_MM;
};
export const areaResult = (points: readonly MeasurePoint[]): MeasureResult => {
    if (points.length < 3)
        return { values: [], reason: "At least three distinct Plan points are required." };
    if (!points.every(isFiniteMeasurePoint))
        return { values: [], reason: "Non-finite point." };
    for (let i = 0; i < points.length; i++) {
        for (let j = i + 1; j < points.length; j++)
            if (planDistance(points[i], points[j]) <= MEASURE_LENGTH_EPSILON_MM)
                return { values: [], reason: "Repeated Plan vertex." };
        const a = points[i], b = points[(i + 1) % points.length];
        for (let j = i + 1; j < points.length; j++) {
            if (j === i + 1 || (i === 0 && j === points.length - 1))
                continue;
            const c = points[j], d = points[(j + 1) % points.length];
            if ((cross(a, b, c) * cross(a, b, d) < 0 && cross(c, d, a) * cross(c, d, b) < 0) || onSegment(a, b, c) || onSegment(a, b, d) || onSegment(c, d, a) || onSegment(c, d, b))
                return { values: [], reason: "Plan edges cross or touch." };
        }
        const previous = points[(i + points.length - 1) % points.length];
        if (onSegment(previous, a, b) || onSegment(a, b, previous))
            return { values: [], reason: "Adjacent Plan edges overlap." };
    }
    // Translate to the first point to avoid cancellation for far-from-origin layouts.
    const origin = points[0];
    const area = Math.abs(points.reduce((sum, p, i) => { const q = points[(i + 1) % points.length]; return sum + (p.xMm - origin.xMm) * (q.yMm - origin.yMm) - (q.xMm - origin.xMm) * (p.yMm - origin.yMm); }, 0)) / 2;
    const perimeter = points.reduce((sum, p, i) => sum + planDistance(p, points[(i + 1) % points.length]), 0);
    if (![area, perimeter].every(Number.isFinite))
        return { values: [], reason: "Non-finite Plan result." };
    if (area <= .001)
        return { values: [], reason: "Plan polygon has zero area." };
    return { values: [value("Plan Area", area, "mm2"), value("Plan Area", area / 1e6, "m2"), value("Plan Perimeter", perimeter)] };
};
export const entityReferencePoint = (e: PlatformEntity): MeasurePoint => ({ xMm: e.transform.planX, yMm: e.transform.planY, zMm: e.transform.elevation, entityId: e.id });
export const dimensionsForEntity = (e: PlatformEntity | undefined): MeasureResult => {
    if (!e || !["machine", "civil"].includes(e.type))
        return { values: [], reason: "Select exactly one Machine or Civil entity before entering Measure." };
    const dimensions = ["widthMm", "depthMm", "heightMm"].map(key => e.properties.find(p => p.key === key)?.value);
    if (!dimensions.every(n => typeof n === "number" && Number.isFinite(n) && n > 0))
        return { values: [], reason: "Canonical local dimensions are unavailable." };
    const floor = e.properties.some(p => p.key === "sourceSubtype" && p.value === "floor-area");
    return { values: dimensions.map((n, i) => value((floor ? ["Local Width", "Plan Depth", "Floor Thickness"] : ["Local Width", "Local Depth", "Local Height"])[i], n as number)) };
};
export const dimensionLines = (e: PlatformEntity): MeasureLine[] => {
    const dimensions = dimensionsForEntity(e);
    if (dimensions.reason)
        return [];
    const [widthMm, depthMm, heightMm] = dimensions.values.map(v => v.value);
    const corners = getFootprintCornersFromReferenceMm({ xMm: e.transform.planX, yMm: e.transform.planY }, { widthMm, depthMm }, e.transform.rotationDeg);
    const p = corners.map(p => ({ ...p, zMm: e.transform.elevation }));
    return [{ points: [p[0], p[1]], label: dimensions.values[0].label }, { points: [p[0], p[3]], label: dimensions.values[1].label }, { points: [p[0], { ...p[0], zMm: p[0].zMm + heightMm }], label: dimensions.values[2].label }];
};
export const pairResult = (entities: readonly PlatformEntity[], machines: readonly PlacedMachine[]): MeasureResult => {
    if (entities.length !== 2 || entities.some(e => !["machine", "civil"].includes(e.type)))
        return { values: [], reason: "Select exactly two Machine/Civil entities before entering Measure. Reference Point, not surface clearance." };
    const result = distanceResult(entityReferencePoint(entities[0]), entityReferencePoint(entities[1]));
    if (entities.every(e => e.type === "machine")) {
        const pair = entities.map(e => machines.find(m => `machine:${m.instanceId}` === e.id));
        if (!pair[0] || !pair[1])
            return { values: [], reason: "Selected machine reference is unavailable." };
        const canonical = calculateReferencePointMeasurementBetweenMachines(pair[0], pair[1]);
        return { values: result.values.map(v => v.label === "Delta X" ? { ...v, value: canonical.deltaXMm } : v.label === "Delta Y" ? { ...v, value: canonical.deltaYMm } : v.label === "Plan Distance" ? { ...v, value: canonical.referencePointDistanceMm } : v) };
    }
    return result;
};
export const angleArc = (a: MeasurePoint, b: MeasurePoint, c: MeasurePoint): readonly MeasurePoint[] => {
    const result = angleResult(a, b, c);
    if (result.reason)
        return [];
    const u = [a.xMm - b.xMm, a.yMm - b.yMm, a.zMm - b.zMm], v = [c.xMm - b.xMm, c.yMm - b.yMm, c.zMm - b.zMm];
    const ul = Math.hypot(...u), vl = Math.hypot(...v), unit = u.map(n => n / ul), cos = unit.reduce((s, n, i) => s + n * v[i] / vl, 0);
    let normal = v.map((n, i) => n / vl - cos * unit[i]);
    let length = Math.hypot(...normal);
    if (length < 1e-12) {
        const axis = Math.abs(unit[0]) < .9 ? [1, 0, 0] : [0, 1, 0];
        const dot = axis.reduce((s, n, i) => s + n * unit[i], 0);
        normal = axis.map((n, i) => n - dot * unit[i]);
        length = Math.hypot(...normal);
    }
    normal = normal.map(n => n / length);
    const theta = result.values[0].value * Math.PI / 180, radius = Math.min(ul, vl) / 4;
    return Array.from({ length: 25 }, (_, i) => { const t = theta * i / 24; const p = unit.map((n, j) => radius * (n * Math.cos(t) + normal[j] * Math.sin(t))); return { xMm: b.xMm + p[0], yMm: b.yMm + p[1], zMm: b.zMm + p[2] }; });
};
