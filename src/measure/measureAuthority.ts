import type { PlatformEntity } from "../platform/contracts";
import type { PlacedMachine } from "../types/machine";
import { angleArc, angleResult, areaResult, dimensionLines, dimensionsForEntity, distanceResult, entityReferencePoint, isFiniteMeasurePoint, pairResult, type MeasureKind, type MeasureLine, type MeasurePoint, type MeasureResult } from "./measureGeometry";
import type { MeasureAnchorKind, MeasureReference } from "./referenceTypes";
export const MEASURE_PICK_CLICK_TOLERANCE_CSS_PX = 4;
export const MEASURE_ACTIVE_REASON = "Exit Measure before changing layout, selection or history.";
export type MeasureSource = "geometry" | "level-plane";
export type MeasureLevel = {
    id: string;
    name: string;
    elevationMm: number;
};
export type MeasureContext = {
    selectionIds: readonly string[];
    primaryId?: string | null;
    entities: readonly PlatformEntity[];
    machines: readonly PlacedMachine[];
    level?: MeasureLevel;
};
export type MeasureAction = {
    type: "toggle" | "exit" | "restart" | "finish";
} | {
    type: "kind";
    kind: MeasureKind;
} | {
    type: "source";
    source: MeasureSource;
} | {
    type: "mode";
    mode: "pick" | "navigate";
} | {
    type: "snapMode";
    snapMode: "semantic" | "free";
} | {
    type: "keep";
} | {
    type: "rename";
    annotationId: string;
    name: string;
} | {
    type: "setVisibility";
    annotationId: string;
    visible: boolean;
} | {
    type: "setAllVisibility";
    visible: boolean;
} | {
    type: "deleteDimension";
    annotationId: string;
} | {
    type: "style";
    annotationId: string;
    style: Record<string, unknown>;
} | {
    type: "reference";
    annotationId: string;
    index: number;
    reference: unknown;
};
export type PickPress = {
    pointerId: number;
    x: number;
    y: number;
    maximum: number;
    cancelled: boolean;
};
export const updatePickPress = (press: PickPress, x: number, y: number): PickPress => {
    const maximum = Math.max(press.maximum, Math.hypot(x - press.x, y - press.y));
    return { ...press, maximum, cancelled: press.cancelled || !Number.isFinite(maximum) || maximum > MEASURE_PICK_CLICK_TOLERANCE_CSS_PX };
};
export type MeasureSession = {
    kind: MeasureKind;
    source: MeasureSource;
    mode: "pick" | "navigate";
    snapMode: "semantic" | "free";
    points: readonly MeasurePoint[];
    hover: MeasurePoint | null;
    level?: MeasureLevel;
    presentationElevationMm?: number;
    completed: boolean;
    entry: MeasureContext;
    entityCatalog: readonly PlatformEntity[];
    reason?: string;
    lastPress?: {
        maximum: number;
        confirmed: boolean;
        reason?: string;
    };
};
export type MeasureProjection = {
    width: number;
    height: number;
    lines: readonly {
        points: readonly {
            x: number;
            y: number;
        }[];
        label?: string;
        preview?: boolean;
    }[];
    markers: readonly {
        x: number;
        y: number;
        label: string;
        preview: boolean;
        offscreen?: boolean;
        occluded?: boolean;
    }[];
};
export const getMeasureResult = (s: MeasureSession): MeasureResult => {
    if (s.kind === "dimensions")
        return dimensionsForEntity(s.entry.selectionIds.length === 1 && s.entry.entities.length === 1 ? s.entry.entities[0] : undefined);
    if (s.kind === "pair")
        return pairResult(s.entry.selectionIds.length === 2 ? s.entry.entities : [], s.entry.machines);
    const p = s.completed ? s.points : s.hover ? [...s.points, s.hover] : s.points;
    if (s.kind === "distance" && p.length >= 2)
        return distanceResult(p[0], p[1]);
    if (s.kind === "angle" && p.length >= 3)
        return angleResult(p[0], p[1], p[2]);
    if (s.kind === "area")
        return areaResult(p);
    return { values: [], reason: s.reason ?? "Pick the next point." };
};
export const getMeasureLines = (s: MeasureSession): MeasureLine[] => {
    if (s.kind === "dimensions")
        return !getMeasureResult(s).reason ? dimensionLines(s.entry.entities[0]) : [];
    if (s.kind === "pair")
        return getMeasureResult(s).reason ? [] : [{ points: s.entry.entities.map(entityReferencePoint), label: "Reference Point" }];
    const p = s.completed ? s.points : s.hover ? [...s.points, s.hover] : s.points;
    if (s.kind === "area") {
        if (s.presentationElevationMm === undefined || !p.length)
            return [];
        const projected = p.map(point => ({ ...point, zMm: s.presentationElevationMm! }));
        return [{ points: projected.length >= 3 ? [...projected, projected[0]] : projected, preview: !s.completed, label: "Plan Area" }, ...p.filter(point => point.zMm !== s.presentationElevationMm).map(point => ({ points: [point, { ...point, zMm: s.presentationElevationMm! }], preview: true }))];
    }
    if (s.kind === "angle")
        return [{ points: p, preview: !s.completed }, ...(p.length === 3 ? [{ points: angleArc(p[0], p[1], p[2]), label: "Angle" }] : [])];
    if (p.length < 2)
        return [];
    const [a, b] = p;
    const x = { ...a, xMm: b.xMm }, y = { ...x, yMm: b.yMm };
    return [{ points: [a, b], label: "3D Distance", preview: !s.completed }, { points: [a, x, y, b], label: "XYZ", preview: true }];
};
const emptyProjection: MeasureProjection = { width: 0, height: 0, lines: [], markers: [] };
export const createMeasureAuthority = () => {
    let session: MeasureSession | null = null, press: PickPress | null = null, projection = emptyProjection, projectionKey = "";
    const listeners = new Set<() => void>(), projectionListeners = new Set<() => void>();
    const publish = (next: MeasureSession | null) => { session = next; listeners.forEach(fn => fn()); };
    const reset = (s: MeasureSession, context: MeasureContext): MeasureSession => ({ ...s, points: [], hover: null, completed: false, reason: undefined, lastPress: undefined,
        level: s.source === "level-plane" && context.level ? { ...context.level } : undefined,
        presentationElevationMm: s.source === "level-plane" ? context.level?.elevationMm : undefined });
    const cancelPress = (reason = "Pointer cancelled") => { if (!press)
        return; const previous = press; press = null; if (session)
        publish({ ...session, lastPress: { maximum: previous.maximum, confirmed: false, reason } }); };
    const dispatch = (action: MeasureAction, context: MeasureContext) => {
        cancelPress("Tool ownership changed");
        if (action.type === "exit" || (action.type === "toggle" && session)) {
            publish(null);
            return;
        }
        if (action.type === "toggle") {
            const entry = structuredClone({ ...context, entities: context.selectionIds.map(id => context.entities.find(e => e.id === id)).filter((e): e is PlatformEntity => Boolean(e)) });
            publish(reset({ kind: "distance", source: "geometry", mode: "pick", snapMode: "semantic", points: [], hover: null, completed: false, entry, entityCatalog: context.entities }, context));
            return;
        }
        if (!session)
            return;
        if (action.type === "mode") {
            publish({ ...session, mode: action.mode, hover: null });
            return;
        }
        if (action.type === "snapMode") {
            publish({ ...session, snapMode: action.snapMode, hover: null });
            return;
        }
        if (["keep", "rename", "setVisibility", "setAllVisibility", "deleteDimension", "style", "reference"].includes(action.type)) {
            return;
        }
        if (action.type === "finish") {
            const result = areaResult(session.points);
            if (session.kind === "area")
                publish({ ...session, completed: !result.reason, hover: null, reason: result.reason });
            return;
        }
        const next = { ...session };
        if (action.type === "kind")
            next.kind = action.kind;
        if (action.type === "source")
            next.source = action.source;
        const restarted = reset(next, context);
        if (["dimensions", "pair"].includes(restarted.kind))
            restarted.completed = !getMeasureResult(restarted).reason;
        publish(restarted);
    };
    const preview = (point: MeasurePoint | null, reason?: string) => {
        if (!session || session.completed || session.mode !== "pick")
            return;
        // A rejected up remains observable until a genuinely different preview
        // or explicit operation reset, rather than disappearing next frame.
        if (session.reason && session.reason === session.lastPress?.reason && JSON.stringify(point) === JSON.stringify(session.hover))
            return;
        if (JSON.stringify([session.hover, session.reason]) === JSON.stringify([point, reason]))
            return;
        publish({ ...session, hover: point && isFiniteMeasurePoint(point) ? { ...point } : null, reason });
    };
    const beginPress = (pointerId: number, x: number, y: number) => { if (!press && session?.mode === "pick" && !session.completed)
        press = { pointerId, x, y, maximum: 0, cancelled: false }; };
    const movePress = (pointerId: number, x: number, y: number) => { if (press?.pointerId === pointerId)
        press = updatePickPress(press, x, y); };
    const endPress = (pointerId: number, x: number, y: number, inside: boolean, point: MeasurePoint | null) => {
        if (!press || press.pointerId !== pointerId || !session)
            return false;
        const ended = updatePickPress(press, x, y);
        press = null;
        let accepted = !ended.cancelled && inside && session.mode === "pick" && !session.completed && point !== null && isFiniteMeasurePoint(point);
        let reason = ended.cancelled ? "Pick drag cancelled" : !inside ? "Release outside viewport" : !point ? "No eligible point" : undefined;
        if (accepted && point) {
            if (["dimensions", "pair"].includes(session.kind))
                accepted = false;
            if (session.kind === "area" && session.points.some(p => Math.hypot(p.xMm - point.xMm, p.yMm - point.yMm) <= .001)) {
                accepted = false;
                reason = "Repeated Plan vertex. Use Finish to close.";
            }
            const points = [...session.points, { ...point }];
            if (session.kind === "angle" && points.length === 3 && angleResult(points[0], points[1], points[2]).reason) {
                accepted = false;
                reason = "Angle arm has zero length.";
            }
            if (accepted)
                session = { ...session, points, hover: null, presentationElevationMm: session.kind === "area" && session.source === "geometry" ? session.presentationElevationMm ?? point.zMm : session.presentationElevationMm, completed: (session.kind === "distance" && points.length === 2) || (session.kind === "angle" && points.length === 3) };
        }
        publish({ ...session, reason, lastPress: { maximum: ended.maximum, confirmed: accepted, reason } });
        return accepted;
    };
    return { getSnapshot: () => session, getActive: () => session !== null, subscribe: (fn: () => void) => { listeners.add(fn); return () => listeners.delete(fn); }, dispatch, preview, beginPress, movePress, endPress, cancelPress,
        getPress: () => press, getProjection: () => projection, subscribeProjection: (fn: () => void) => { projectionListeners.add(fn); return () => projectionListeners.delete(fn); },
        project: (next: MeasureProjection) => { const key = JSON.stringify(next); if (key === projectionKey)
            return; projectionKey = key; projection = next; projectionListeners.forEach(fn => fn()); } };
};
export type MeasureAuthority = ReturnType<typeof createMeasureAuthority>;
export const isMeasureAction = (value: unknown): value is MeasureAction => {
    if (!value || typeof value !== "object")
        return false;
    const p = value as Record<string, unknown>;
    return ["toggle", "exit", "restart", "finish", "keep", "rename", "setVisibility", "setAllVisibility", "deleteDimension", "style", "reference"].includes(String(p.type)) || (p.type === "kind" && ["distance", "angle", "area", "dimensions", "pair"].includes(String(p.kind))) || (p.type === "source" && ["geometry", "level-plane"].includes(String(p.source))) || (p.type === "mode" && ["pick", "navigate"].includes(String(p.mode))) || (p.type === "snapMode" && ["semantic", "free"].includes(String(p.snapMode)));
};

export const measurePointToReference = (point: MeasurePoint): MeasureReference =>
  point.entityId && point.anchorKind
    ? { type: "entity-anchor", entityId: point.entityId, anchor: point.anchorKind as MeasureAnchorKind }
    : { type: "world-point", xMm: point.xMm, yMm: point.yMm, zMm: point.zMm };
