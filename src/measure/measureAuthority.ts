import type { PlatformEntity } from "../platform/contracts";
import type { PlacedMachine } from "../types/machine";
import { angleArc, angleResult, areaResult, dimensionLines, dimensionsForEntity, entityReferencePoint, isFiniteMeasurePoint, pairResult, type MeasureKind, type MeasureLine, type MeasurePoint, type MeasureResult } from "./measureGeometry";
import type { MeasureAnchorKind, MeasureDimensionMetadata, MeasureReference } from "./referenceTypes";
import { resolveMeasureReference } from "./measureReferences";
import { isMeasureProjectionMode, MEASURE_PROJECTION_LABELS, projectMeasureB, projectedDistanceResult, type MeasureProjectionMode } from "./measureProjection";
export const MEASURE_PICK_CLICK_TOLERANCE_CSS_PX = 4;
export const MEASURE_ACTIVE_REASON = "Exit Measure before changing layout, selection or history.";
export type MeasureSource = "geometry" | "level-plane";
export type MeasureWorkflow = "point-to-point" | "fan-out" | "chain" | "selected-pair";
export type MeasureRelationship = { id: number; points: readonly MeasurePoint[]; projectionMode: MeasureProjectionMode; savedAnnotationId?: string };
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
    type: "toggle" | "exit" | "restart" | "finish" | "confirmLockedAnchor" | "pauseForEdit" | "resume" | "nextRelationship";
} | {
    type: "projectionMode"; projectionMode: MeasureProjectionMode;
} | {
    type: "workflow"; workflow: MeasureWorkflow;
} | {
    type: "changePoint"; index: number;
} | {
    type: "selectRelationship"; id: number;
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
    type: "activeDimensionEntity";
    entityId: string;
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
} | {
    type: "textPlacement";
    annotationId: string;
    point: MeasurePoint;
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
    paused?: boolean;
    workflow?: MeasureWorkflow;
    projectionMode?: MeasureProjectionMode;
    relationships?: readonly MeasureRelationship[];
    activeRelationshipId?: number;
    replacePointIndex?: number;
    activeDimensionEntityId?: string;
    lockedReference?: Extract<MeasureReference, { type: "entity-anchor" }>;
    referenceEdit?: { annotationId: string; index: number };
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
    lockedAnchor?: {
        reference: Extract<MeasureReference, { type: "entity-anchor" }>;
        entityName: string;
        point: MeasurePoint | null;
        visible: boolean;
        confirmable: boolean;
        reason: string;
    };
    candidateObservations?: readonly { entityId: string; anchorKind: MeasureAnchorKind; x: number; y: number; visible: boolean; reason: string; worldPoint?: MeasurePoint }[];
    representedByDimensionId?: string;
    labels?: readonly { lines: readonly string[]; x: number; y: number; width: number; height: number; textPx: number; fontFamily: string; textBackground: boolean }[];
    candidates?: readonly { x: number; y: number; label: string; selected: boolean; locked: boolean }[];
    width: number;
    height: number;
    lines: readonly {
        points: readonly {
            x: number;
            y: number;
        }[];
        preview?: boolean;
    }[];
    markers: readonly {
        x: number;
        y: number;
        label: string;
        preview: boolean;
        offscreen?: boolean;
        occluded?: boolean;
        labelOffset?: { x: number; y: number };
    }[];
};
export const getMeasureDimensionGroups = (s: MeasureSession) => s.entry.selectionIds.map(id => {
    const entity = s.entityCatalog.find(item => item.id === id);
    const result = !entity ? { values: [], reason: "Selected entity is unavailable. Exit Measure to reselect." }
        : !["machine", "civil"].includes(entity.type) ? { values: [], reason: "Local dimensions are unavailable for this entity type." }
        : dimensionsForEntity(entity);
    return { id, name: entity?.name ?? s.entry.entities.find(item => item.id === id)?.name ?? id, entity, result, eligible: !result.reason };
});
export const getActiveMeasureDimensionGroup = (s: MeasureSession) => getMeasureDimensionGroups(s).find(group => group.id === s.activeDimensionEntityId);
export const getMeasureOperands = (s: MeasureSession) => s.completed || !s.hover ? s.points
    : s.replacePointIndex !== undefined ? s.points.map((point, index) => index === s.replacePointIndex ? s.hover! : point) : [...s.points, s.hover];
export const getMeasureResult = (s: MeasureSession): MeasureResult => {
    if (s.kind === "dimensions")
        return getActiveMeasureDimensionGroup(s)?.result ?? { values: [], reason: "Select eligible Machine/Civil entities before entering Measure. Exit Measure to reselect." };
    if (s.kind === "pair")
        return pairResult(s.entry.selectionIds.length === 2 ? s.entry.entities : [], s.entry.machines);
    if (s.workflow === "selected-pair" && (s.entry.selectionIds.length !== 2 || s.entry.entities.some(entity => !["machine", "civil"].includes(entity.type))))
        return { values: [], reason: "Select exactly two eligible Machine/Civil entities before entering Selected Pair A/B." };
    const p = getMeasureOperands(s);
    if (s.kind === "distance" && p.length >= 2)
        return projectedDistanceResult(p[0], p[1], s.projectionMode);
    if (s.kind === "angle" && p.length >= 3)
        return angleResult(p[0], p[1], p[2]);
    if (s.kind === "area")
        return areaResult(p);
    return { values: [], reason: s.reason ?? "Pick the next point." };
};
export const getMeasureLines = (s: MeasureSession): MeasureLine[] => {
    if (s.kind === "dimensions")
        return !getMeasureResult(s).reason ? dimensionLines(getActiveMeasureDimensionGroup(s)!.entity!) : [];
    if (s.kind === "pair")
        return getMeasureResult(s).reason ? [] : [{ points: s.entry.entities.map(entityReferencePoint), label: "Reference Point" }];
    const p = getMeasureOperands(s);
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
    if (s.projectionMode && s.projectionMode !== "true-3d") {
        const projected = projectMeasureB(a, b, s.projectionMode);
        return [{ points: [a, projected], label: MEASURE_PROJECTION_LABELS[s.projectionMode], preview: !s.completed },
            { points: [projected, b], preview: true }];
    }
    const x = { ...a, xMm: b.xMm }, y = { ...x, yMm: b.yMm };
    return [{ points: [a, b], label: "3D Distance", preview: !s.completed }, { points: [a, x, y, b], label: "XYZ", preview: true }];
};
const emptyProjection: MeasureProjection = { width: 0, height: 0, lines: [], markers: [] };
export const createMeasureAuthority = () => {
    let selectedDimensionId: string | null = null;
    let session: MeasureSession | null = null, press: PickPress | null = null, projection = emptyProjection, projectionKey = "";
    const listeners = new Set<() => void>(), projectionListeners = new Set<() => void>();
    const publish = (next: MeasureSession | null) => { session = next; listeners.forEach(fn => fn()); };
    const reset = (s: MeasureSession, context: MeasureContext): MeasureSession => ({ ...s, points: [], hover: null, completed: false, reason: undefined, lastPress: undefined, lockedReference: undefined, referenceEdit: undefined,
        relationships: [], activeRelationshipId: undefined, replacePointIndex: undefined,
        level: s.source === "level-plane" && context.level ? { ...context.level } : undefined,
        presentationElevationMm: s.source === "level-plane" ? context.level?.elevationMm : undefined });
    const cancelPress = (reason = "Pointer cancelled") => { if (!press)
        return; const previous = press; press = null; if (session)
        publish({ ...session, lastPress: { maximum: previous.maximum, confirmed: false, reason } }); };
    const advanceRelationship = (s: MeasureSession): MeasureSession => ({ ...s,
        points: s.points.length === 2 ? [{ ...(s.workflow === "chain" ? s.points[1] : s.points[0]) }] : [],
        completed: false, activeRelationshipId: undefined, replacePointIndex: undefined, hover: null, lockedReference: undefined, reason: undefined });
    const captureRelationship = (s: MeasureSession): MeasureSession => {
        if (s.kind !== "distance" || !s.completed) return s;
        const relationships = s.relationships ?? [];
        const id = s.activeRelationshipId ?? (relationships[relationships.length - 1]?.id ?? 0) + 1;
        const previous = relationships.find(item => item.id === id);
        const relationship = { id, points: s.points.map(point => ({ ...point })), projectionMode: s.projectionMode ?? "true-3d", savedAnnotationId: previous?.savedAnnotationId };
        return { ...s, activeRelationshipId: id, relationships: previous ? relationships.map(item => item.id === id ? relationship : item) : [...relationships, relationship] };
    };
    const dispatch = (action: MeasureAction, context: MeasureContext) => {
        cancelPress("Tool ownership changed");
        if (action.type === "exit" || (action.type === "toggle" && session)) {
            publish(null);
            return;
        }
        if (action.type === "toggle") {
            const entry = structuredClone({ ...context, entities: context.selectionIds.map(id => context.entities.find(e => e.id === id)).filter((e): e is PlatformEntity => Boolean(e)) });
            const initial = reset({ kind: "distance", source: "geometry", mode: "pick", snapMode: "semantic", points: [], hover: null, completed: false, entry, entityCatalog: context.entities }, context);
            const eligible = getMeasureDimensionGroups(initial).filter(group => group.eligible);
            initial.activeDimensionEntityId = (eligible.find(group => group.id === entry.primaryId) ?? eligible[0])?.id;
            publish(initial);
            return;
        }
        if (!session)
            return;
        if (action.type === "pauseForEdit" || action.type === "resume") {
            const next = reset({ ...session, paused: action.type === "pauseForEdit" }, context);
            if (!next.paused && ["dimensions", "pair"].includes(next.kind)) next.completed = !getMeasureResult(next).reason;
            publish(next);
            return;
        }
        if (session.paused) return;
        if (action.type === "workflow") {
            publish(reset({ ...session, kind: "distance", workflow: action.workflow, ...(action.workflow === "selected-pair" ? { source: "geometry" as const } : {}) }, context));
            return;
        }
        if (action.type === "projectionMode") {
            const current = session.relationships?.find(item => item.id === session!.activeRelationshipId);
            if (current?.savedAnnotationId) return;
            publish(captureRelationship({ ...session, projectionMode: action.projectionMode }));
            return;
        }
        if (action.type === "changePoint") {
            const current = session.relationships?.find(item => item.id === session!.activeRelationshipId);
            if (!current?.savedAnnotationId && session.points[action.index]) publish({ ...session, completed: false, replacePointIndex: action.index, hover: null });
            return;
        }
        if (action.type === "selectRelationship") {
            const item = session.relationships?.find(item => item.id === action.id);
            if (item) publish({ ...session, points: item.points, projectionMode: item.projectionMode, activeRelationshipId: item.id, completed: true, replacePointIndex: undefined, hover: null });
            return;
        }
        if (action.type === "nextRelationship") {
            if (session.completed && ["fan-out", "chain"].includes(session.workflow ?? "")) publish(advanceRelationship(session));
            return;
        }
        if (action.type === "activeDimensionEntity") {
            const group = getMeasureDimensionGroups(session).find(item => item.id === action.entityId && item.eligible);
            if (group) publish({ ...session, activeDimensionEntityId: group.id, completed: session.kind === "dimensions" || session.completed });
            return;
        }
        if (action.type === "confirmLockedAnchor") {
            const point = resolveLockedAnchor(context.entities);
            return Boolean(point && !session.referenceEdit && confirmPoint(point, true));
        }
        if (action.type === "mode") {
            publish({ ...session, mode: action.mode, hover: null });
            return;
        }
        if (action.type === "snapMode") {
            publish({ ...session, snapMode: action.snapMode, hover: null, lockedReference: undefined, referenceEdit: undefined });
            return;
        }
        if (["keep", "rename", "setVisibility", "setAllVisibility", "deleteDimension", "style", "reference", "textPlacement"].includes(action.type)) {
            return;
        }
        if (action.type === "finish") {
            if (session.lockedReference && !projection.lockedAnchor?.visible) return;
            const result = areaResult(session.points);
            if (session.kind === "area")
                publish({ ...session, completed: !result.reason, hover: null, reason: result.reason });
            return;
        }
        const next = { ...session };
        if (action.type === "kind")
            { next.kind = action.kind; next.workflow = "point-to-point"; }
        if (action.type === "source")
            next.source = action.source;
        const restarted = reset(next, context);
        if (["dimensions", "pair"].includes(restarted.kind))
            restarted.completed = !getMeasureResult(restarted).reason;
        publish(restarted);
    };
    const preview = (point: MeasurePoint | null, reason?: string) => {
        if (!session || session.paused || session.completed || session.mode !== "pick")
            return;
        // A rejected up remains observable until a genuinely different preview
        // or explicit operation reset, rather than disappearing next frame.
        if (session.reason && session.reason === session.lastPress?.reason && JSON.stringify(point) === JSON.stringify(session.hover))
            return;
        if (JSON.stringify([session.hover, session.reason]) === JSON.stringify([point, reason]))
            return;
        publish({ ...session, hover: point && isFiniteMeasurePoint(point) ? { ...point } : null, reason });
    };
    const beginPress = (pointerId: number, x: number, y: number) => { if (!press && session?.mode === "pick" && !session.paused && !session.completed && !session.referenceEdit)
        press = { pointerId, x, y, maximum: 0, cancelled: false }; };
    const movePress = (pointerId: number, x: number, y: number) => { if (press?.pointerId === pointerId)
        press = updatePickPress(press, x, y); };
    const resolveLockedAnchor = (entities: readonly PlatformEntity[] = session?.entityCatalog ?? []) => {
        const reference = session?.lockedReference;
        const point = reference ? resolveMeasureReference(reference, entities, []) : null;
        return point && isFiniteMeasurePoint(point) ? { ...point, anchorKind: reference!.anchor } : null;
    };
    const confirmPoint = (point: MeasurePoint, explicit = false) => {
        if (!session || session.paused || session.completed || (!explicit && session.mode !== "pick") || !isFiniteMeasurePoint(point)
            || ["dimensions", "pair"].includes(session.kind)) return false;
        if (session.workflow === "selected-pair" && (session.entry.selectionIds.length !== 2 || !point.entityId || !session.entry.selectionIds.includes(point.entityId))) return false;
        if (session.kind === "area" && session.points.some(p => Math.hypot(p.xMm - point.xMm, p.yMm - point.yMm) <= .001)) return false;
        const points = session.replacePointIndex !== undefined ? session.points.map((previous, index) => index === session!.replacePointIndex ? { ...point } : previous) : [...session.points, { ...point }];
        if (session.kind === "angle" && points.length === 3 && angleResult(points[0], points[1], points[2]).reason) return false;
        publish(captureRelationship({ ...session, points, hover: null, lockedReference: undefined, replacePointIndex: undefined,
            presentationElevationMm: session.kind === "area" && session.source === "geometry" ? session.presentationElevationMm ?? point.zMm : session.presentationElevationMm,
            completed: (session.kind === "distance" && points.length === 2) || (session.kind === "angle" && points.length === 3) }));
        return true;
    };
    const endPress = (pointerId: number, x: number, y: number, inside: boolean, point: MeasurePoint | null) => {
        if (!press || press.pointerId !== pointerId || !session)
            return false;
        const ended = updatePickPress(press, x, y);
        press = null;
        let accepted = !ended.cancelled && inside && session.mode === "pick" && !session.completed && point !== null && isFiniteMeasurePoint(point)
            && (!session.lockedReference || projection.lockedAnchor?.visible === true);
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
            if (accepted) accepted = confirmPoint(point);
        }
        publish({ ...session, reason, lastPress: { maximum: ended.maximum, confirmed: accepted, reason } });
        return accepted;
    };
    return { getSnapshot: () => session, getActive: () => session !== null && !session.paused,
        markKept: (annotationId: string) => {
            if (!session) return;
            const next = { ...session, relationships: session.relationships?.map(item => item.id === session!.activeRelationshipId ? { ...item, savedAnnotationId: annotationId } : item) };
            publish(["fan-out", "chain"].includes(next.workflow ?? "") ? advanceRelationship(next) : next);
        },
        resolveLockedAnchor,
        lockAnchor: (point: MeasurePoint | null) => {
            if (!session || !point?.entityId || !point.anchorKind || (session.completed && !session.referenceEdit)) return;
            const reference = { type: "entity-anchor" as const, entityId: point.entityId, anchor: point.anchorKind };
            const resolved = resolveMeasureReference(reference, session.entityCatalog, []);
            if (resolved && isFiniteMeasurePoint(resolved)) publish({ ...session, lockedReference: reference });
        },
        updateEntities: (entities: readonly PlatformEntity[]) => {
            if (session && session.entityCatalog !== entities) publish({ ...session, entityCatalog: entities });
        },
        beginReferenceEdit: (annotationId: string, index: number) => {
            if (session) publish({ ...session, referenceEdit: { annotationId, index } });
        },
        completeReferenceEdit: () => {
            if (session) publish({ ...session, referenceEdit: undefined, lockedReference: undefined });
        },
        getSelectedDimensionId: () => selectedDimensionId,
        selectDimension: (id: string | null) => { if (id !== selectedDimensionId) { selectedDimensionId = id; listeners.forEach(fn => fn()); } },
        subscribe: (fn: () => void) => { listeners.add(fn); return () => listeners.delete(fn); }, dispatch, preview, beginPress, movePress, endPress, cancelPress,
        getPress: () => press, getProjection: () => projection, subscribeProjection: (fn: () => void) => { projectionListeners.add(fn); return () => projectionListeners.delete(fn); },
        project: (next: MeasureProjection) => { const key = JSON.stringify(next); if (key === projectionKey)
            return; projectionKey = key; projection = next; projectionListeners.forEach(fn => fn()); } };
};
export type MeasureAuthority = ReturnType<typeof createMeasureAuthority>;
export const isMeasureAction = (value: unknown): value is MeasureAction => {
    if (!value || typeof value !== "object")
        return false;
    const p = value as Record<string, unknown>;
    return ["toggle", "exit", "restart", "finish", "confirmLockedAnchor", "keep", "rename", "setVisibility", "setAllVisibility", "deleteDimension", "style", "reference", "textPlacement", "pauseForEdit", "resume", "nextRelationship"].includes(String(p.type))
        || (p.type === "projectionMode" && isMeasureProjectionMode(p.projectionMode))
        || (p.type === "workflow" && ["point-to-point", "fan-out", "chain", "selected-pair"].includes(String(p.workflow)))
        || (p.type === "changePoint" && Number.isInteger(p.index) && Number(p.index) >= 0 && Number(p.index) <= 1)
        || (p.type === "selectRelationship" && Number.isInteger(p.id) && Number(p.id) > 0)
        || (p.type === "activeDimensionEntity" && typeof p.entityId === "string" && p.entityId.length > 0) || (p.type === "kind" && ["distance", "angle", "area", "dimensions", "pair"].includes(String(p.kind))) || (p.type === "source" && ["geometry", "level-plane"].includes(String(p.source))) || (p.type === "mode" && ["pick", "navigate"].includes(String(p.mode))) || (p.type === "snapMode" && ["semantic", "free"].includes(String(p.snapMode)));
};

export const measurePointToReference = (point: MeasurePoint): MeasureReference =>
  point.levelId
    ? { type: "level-point", levelId: point.levelId, xMm: point.xMm, yMm: point.yMm }
    : point.entityId && point.anchorKind
    ? { type: "entity-anchor", entityId: point.entityId, anchor: point.anchorKind as MeasureAnchorKind }
    : { type: "world-point", xMm: point.xMm, yMm: point.yMm, zMm: point.zMm };

export const measureSessionMatchesDimension = (session: MeasureSession | null, dimension: MeasureDimensionMetadata) => {
    if (!session?.completed || !dimension.visible || dimension.status === "orphaned" || dimension.dimensionKind !== session.kind) return false;
    if (["distance", "pair"].includes(session.kind) && (session.projectionMode ?? "true-3d") !== (dimension.projectionMode ?? "true-3d")) return false;
    const entities = session.kind === "dimensions" ? [getActiveMeasureDimensionGroup(session)?.entity].filter((entity): entity is PlatformEntity => Boolean(entity)) : session.entry.entities.slice(0, 2);
    const references: MeasureReference[] = session.kind === "dimensions" || session.kind === "pair"
        ? entities.map(entity => ({ type: "entity-anchor", entityId: entity.id, anchor: "front-left-bottom" }))
        : session.points.map(measurePointToReference);
    if (!references.length || references.length !== dimension.references.length) return false;
    return (session.kind !== "area" || dimension.presentationElevationMm === session.presentationElevationMm)
        && references.every((reference, index) => {
            const saved = dimension.references[index];
            if (reference.type === "entity-anchor") return saved.type === reference.type && saved.entityId === reference.entityId && saved.anchor === reference.anchor;
            if (reference.type === "level-point") return saved.type === reference.type && saved.levelId === reference.levelId && saved.xMm === reference.xMm && saved.yMm === reference.yMm;
            return saved.type === reference.type && saved.xMm === reference.xMm && saved.yMm === reference.yMm && saved.zMm === reference.zMm;
        });
};
