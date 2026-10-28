import { Matrix, Ray, Vector3, type ArcRotateCamera, type Scene } from "@babylonjs/core";
import type { MeasureAuthority, MeasureAction, MeasureProjection } from "../../measure/measureAuthority";
import { getMeasureLines, getMeasureOperands, getMeasureResult } from "../../measure/measureAuthority";
import { entityReferencePoint, type MeasurePoint } from "../../measure/measureGeometry";
import { getSelectionPickTarget } from "../babylonScene/selectionPicking";
import { getSemanticAnchorPoints } from "../../measure/measureReferences";
import type { MeasureAnchorKind, MeasureDimensionStyle } from "../../measure/referenceTypes";
import { measurePointToReference } from "../../measure/measureAuthority";
import { MEASURE_ANCHOR_LABELS } from "../../measure/measureReferences";
import type { createReferenceDimensionSceneManager, DimensionHit } from "./referenceDimensionScene";
import { intersectRayWithHorizontalDragPlane } from "../babylonScene/dragPlacement";
import { MEASURE_ANCHOR_MARKER_RADIUS_CSS_PX } from "../../measure/measurePresentation";
import { dimensionLabelBounds, dimensionLabelLines, dimensionMarkerBounds, dimensionTextPx, fitDimensionLabel, layoutLinearDimension, measureDimensionLabel } from "../../measure/dimensionPresentation";
import { createMeasureTextMeasurer, readMeasureLabelViewport } from "./measureLabelContext";
import { getCandidateVisibility } from "../../measure/candidateVisibility";
import { insideCandidateContext, projectedVolumeEnvelope } from "../../measure/candidateContext";
import { projectMeasureB } from "../../measure/measureProjection";
export const installMeasureViewportAdapter = ({ scene, camera, canvas, authority, onAction, diagnostics, getDimensionManager, getStyle }: {
    scene: Scene;
    camera: ArcRotateCamera;
    canvas: HTMLCanvasElement;
    authority: MeasureAuthority;
    onAction: (action: MeasureAction) => void;
    diagnostics: () => boolean;
    getDimensionManager: () => ReturnType<typeof createReferenceDimensionSceneManager> | null;
    getStyle: () => MeasureDimensionStyle;
}) => {
    const textMeasurer = createMeasureTextMeasurer(canvas);
    let anchors: { point: MeasurePoint; x: number; y: number; distance: number }[] = [];
    let highlighted: MeasurePoint | null = null, chosen: MeasurePoint | null = null;
    let observations: NonNullable<MeasureProjection["candidateObservations"]> = [];
    let cycleIndex: number | null = null;
    let activeEntityId: string | undefined;
    const originalCursor = canvas.style.cursor;
    let edit: { hit: DimensionHit; startX: number; startY: number; offsetX: number; offsetY: number; depth: number; point: MeasurePoint | null; moved: boolean } | null = null;
    let captured: number | null = null;
    let lastClient: {
        x: number;
        y: number;
    } | null = null;
    const pointFromVector = (p: Vector3, entityId?: string): MeasurePoint => ({ xMm: p.x * 1000, yMm: p.z * 1000, zMm: p.y * 1000, ...(entityId ? { entityId } : {}) });
    const eligibleMesh = (mesh: import("@babylonjs/core").AbstractMesh) => {
        const target = getSelectionPickTarget({ pickedMesh: mesh });
        return mesh.isPickable && mesh.isEnabled() && mesh.isVisible && mesh.visibility > 0
            && Boolean(target.instanceId || target.civilReferenceId) && !target.annotationId;
    };
    const screenPoint = (point: MeasurePoint) => {
        const rect = canvas.getBoundingClientRect(), rw = scene.getEngine().getRenderWidth(), rh = scene.getEngine().getRenderHeight();
        const world = new Vector3(point.xMm / 1000, point.zMm / 1000, point.yMm / 1000);
        const projected = Vector3.Project(world, Matrix.Identity(), scene.getTransformMatrix(), camera.viewport.toGlobal(rw, rh));
        return { x: projected.x * rect.width / rw, y: projected.y * rect.height / rh, z: projected.z };
    };
    const project = (point: MeasurePoint) => {
        const rect = canvas.getBoundingClientRect(), p = screenPoint(point);
        if (getCandidateVisibility({ ...p, width: rect.width, height: rect.height, covered: false, occluded: false }) === "Not in viewport")
            return { ...p, offscreen: true, occluded: false, visible: false, reason: "Not in viewport" };
        const target = canvas.ownerDocument.elementFromPoint(rect.left + p.x, rect.top + p.y);
        const covered = target !== null && target !== canvas;
        const ray = scene.createPickingRay(p.x, p.y, Matrix.Identity(), camera);
        const world = new Vector3(point.xMm / 1000, point.zMm / 1000, point.yMm / 1000);
        const distance = Vector3.Distance(ray.origin, world);
        const hit = Number.isFinite(distance) && distance > 0
            ? scene.pickWithRay(new Ray(ray.origin, ray.direction, distance), eligibleMesh) : null;
        const occluded = Boolean(hit?.hit && hit.distance < distance - .001);
        const reason = getCandidateVisibility({ ...p, width: rect.width, height: rect.height, covered, occluded });
        return { ...p, offscreen: reason === "Not in viewport", occluded, visible: reason === "Visible", reason };
    };
    const sameAnchor = (a: MeasurePoint | null, b: MeasurePoint | null) => a?.entityId === b?.entityId && a?.anchorKind === b?.anchorKind;
    const candidate = (clientX: number, clientY: number): MeasurePoint | null => {
        const state = authority.getSnapshot();
        if (!state || state.paused)
            return null;
        const rect = canvas.getBoundingClientRect(), x = clientX - rect.left, y = clientY - rect.top;
        anchors = [];
        observations = [];
        highlighted = null;
        if (x < 0 || y < 0 || x >= rect.width || y >= rect.height)
            return null;
        if (canvas.ownerDocument.elementFromPoint(clientX, clientY) !== canvas) return null;
        if (state.source === "level-plane") {
            if (!state.level || !Number.isFinite(state.level.elevationMm))
                return null;
            const ray = scene.createPickingRay(x, y, Matrix.Identity(), camera);
            const hit = intersectRayWithHorizontalDragPlane(ray.origin, ray.direction, state.level.elevationMm / 1000);
            return hit ? { ...pointFromVector(new Vector3(hit.x, hit.y, hit.z)), levelId: state.level.id } : null;
        }
        const hit = scene.pick(x, y, eligibleMesh, false, camera);
        const target = getSelectionPickTarget(hit);
        let entityId = target.instanceId ? `machine:${target.instanceId}` : target.civilReferenceId ? `civil:${target.civilReferenceId}` : undefined;
        const allowed = (id?: string) => state.workflow !== "selected-pair" || Boolean(id && state.entry.selectionIds.length === 2 && state.entry.selectionIds.includes(id));
        const actual = hit?.hit && hit.pickedPoint && allowed(entityId) ? pointFromVector(hit.pickedPoint, entityId) : null;
        if (!allowed(entityId)) entityId = undefined;
        if (state.snapMode !== "semantic") return actual;
        const active = state.entityCatalog.find(entity => entity.id === activeEntityId && entity.visible && allowed(entity.id));
        if (active && !state.lockedReference) {
            const canonical = Object.entries(getSemanticAnchorPoints(active));
            const corners = canonical.filter(([kind]) => kind.endsWith("-top") || kind.endsWith("-bottom")).map(([, point]) => screenPoint(point));
            const envelope = corners.length === 8 && corners.every(point => point.z >= 0 && point.z <= 1) ? projectedVolumeEnvelope(corners) : [];
            const visibleMarkers = canonical.map(([, point]) => project(point)).filter(point => point.visible);
            if (insideCandidateContext({ x, y }, envelope, visibleMarkers)) entityId = active.id;
        }
        // A visible marker remains reachable at a silhouette even without an interior mesh hit.
        if (!entityId) {
            const nearby = state.entityCatalog.filter(entity => entity.visible && allowed(entity.id) && ["machine", "civil"].includes(entity.type)).flatMap(entity =>
                Object.values(getSemanticAnchorPoints(entity)).flatMap(point => {
                    const p = screenPoint(point);
                    const distance = Math.hypot(p.x - x, p.y - y);
                    return distance <= MEASURE_ANCHOR_MARKER_RADIUS_CSS_PX && project(point).visible ? [{ entityId: entity.id, distance }] : [];
                }));
            nearby.sort((a, b) => a.distance - b.distance || a.entityId.localeCompare(b.entityId, "en"));
            entityId = nearby[0]?.entityId;
        }
        if (state.lockedReference) entityId = state.lockedReference.entityId;
        const entity = state.entityCatalog.find((item) => item.id === entityId);
        if (!entity || !entity.visible) { activeEntityId = undefined; chosen = null; cycleIndex = null; return state.lockedReference ? null : actual; }
        if (activeEntityId !== entity.id) { chosen = null; cycleIndex = null; }
        activeEntityId = entity.id;
        const candidates = Object.entries(getSemanticAnchorPoints(entity)) as Array<[MeasureAnchorKind, MeasurePoint]>;
        anchors = [];
        const observed: NonNullable<MeasureProjection["candidateObservations"]>[number][] = [];
        for (const [anchorKind, point] of candidates) {
            const p = project(point), px = p.x, py = p.y;
            observed.push({ entityId: entity.id, anchorKind, x: px, y: py, visible: p.visible, reason: p.reason, worldPoint: { ...point, anchorKind } });
            if (!p.visible) continue;
            const distance = Math.hypot(px - x, py - y);
            anchors.push({ distance, point: { ...point, anchorKind }, x: px, y: py });
        }
        observations = observed;
        anchors.sort((a, b) => a.distance - b.distance || String(a.point.anchorKind).localeCompare(String(b.point.anchorKind), "en"));
        // The visible 7px candidate marker is its hit target. Outside it, preserve the actual surface hit.
        const locked = authority.resolveLockedAnchor();
        if (state.lockedReference) {
            highlighted = locked;
            return locked && project(locked).visible ? locked : null;
        }
        if (chosen) chosen = anchors.find(a => sameAnchor(a.point, chosen))?.point ?? null;
        highlighted = chosen ?? (cycleIndex !== null ? anchors[cycleIndex % anchors.length]?.point ?? null : anchors[0]?.point ?? null);
        return cycleIndex !== null || anchors[0]?.distance <= MEASURE_ANCHOR_MARKER_RADIUS_CSS_PX ? highlighted ?? actual : actual;
    };
    const release = () => { const id = captured; captured = null; if (id !== null && canvas.hasPointerCapture(id))
        canvas.releasePointerCapture(id); };
    const clearChoice = () => { chosen = null; cycleIndex = null; };
    const cancel = (reason: string) => { authority.cancelPress(reason); if (edit && !authority.getSnapshot()?.lockedReference) authority.completeReferenceEdit(); edit = null; clearChoice(); getDimensionManager()?.previewText("", null); release(); };
    const observePreview = (x: number, y: number) => {
        lastClient = { x, y };
        const p = candidate(x, y);
        canvas.style.cursor = authority.getSnapshot()?.mode === "pick" ? "crosshair" : originalCursor;
        authority.preview(p, p ? undefined : authority.getSnapshot()?.source === "level-plane" ? "Level Plane intersection unavailable." : "No eligible geometry surface.");
        return p;
    };
    const block = (e: PointerEvent) => { e.preventDefault(); e.stopImmediatePropagation(); };
    const down = (e: PointerEvent) => {
        const s = authority.getSnapshot();
        if (!s || s.paused || e.button !== 0)
            return;
        if (s.mode !== "pick")
            return;
        block(e);
        canvas.focus({ preventScroll: true });
        const operand = observePreview(e.clientX, e.clientY);
        const pickingOperand = !s.completed && !s.referenceEdit && !["dimensions", "pair"].includes(s.kind);
        const dimensionHit = pickingOperand && operand ? null : getDimensionManager()?.hitTest(e.clientX, e.clientY);
        if (dimensionHit && e.isPrimary) {
            authority.selectDimension(dimensionHit.annotationId);
            if (dimensionHit.index !== undefined) authority.beginReferenceEdit(dimensionHit.annotationId, dimensionHit.index);
            const projected = Vector3.Project(new Vector3(dimensionHit.point.xMm / 1000, dimensionHit.point.zMm / 1000, dimensionHit.point.yMm / 1000), Matrix.Identity(), scene.getTransformMatrix(), camera.viewport.toGlobal(scene.getEngine().getRenderWidth(), scene.getEngine().getRenderHeight()));
            const rect = canvas.getBoundingClientRect();
            edit = { hit: dimensionHit, startX: e.clientX, startY: e.clientY,
                offsetX: rect.left + projected.x * rect.width / scene.getEngine().getRenderWidth() - e.clientX,
                offsetY: rect.top + projected.y * rect.height / scene.getEngine().getRenderHeight() - e.clientY,
                depth: projected.z, point: null, moved: false };
            captured = e.pointerId; canvas.setPointerCapture(e.pointerId); return;
        }
        if (e.isPrimary) {
            authority.beginPress(e.pointerId, e.clientX, e.clientY);
            if (authority.getPress()) {
                captured = e.pointerId;
                canvas.setPointerCapture(e.pointerId);
            }
        }
    };
    const move = (e: PointerEvent) => {
        const s = authority.getSnapshot();
        if (!s || s.paused || s.mode !== "pick" || (e.buttons !== 0 && (e.buttons & 1) === 0))
            return;
        block(e);
        if (edit) {
            edit.moved ||= Math.hypot(e.clientX - edit.startX, e.clientY - edit.startY) > 0;
            if (edit.hit.index !== undefined) edit.point = candidate(e.clientX, e.clientY);
            else {
                const rect = canvas.getBoundingClientRect(), rw = scene.getEngine().getRenderWidth(), rh = scene.getEngine().getRenderHeight();
                const p = Vector3.Unproject(new Vector3((e.clientX + edit.offsetX - rect.left) * rw / rect.width, (e.clientY + edit.offsetY - rect.top) * rh / rect.height, edit.depth), rw, rh, Matrix.Identity(), scene.getViewMatrix(), scene.getProjectionMatrix());
                edit.point = pointFromVector(p); getDimensionManager()?.previewText(edit.hit.annotationId, edit.point);
            }
            return;
        }
        authority.movePress(e.pointerId, e.clientX, e.clientY);
        observePreview(e.clientX, e.clientY);
    };
    const up = (e: PointerEvent) => {
        const s = authority.getSnapshot();
        if (!s || s.paused || s.mode !== "pick" || e.button !== 0)
            return;
        block(e);
        if (edit) {
            const current = edit; edit = null;
            getDimensionManager()?.previewText("", null);
            const rect = canvas.getBoundingClientRect();
            if (current.moved && current.point && canvas.hasPointerCapture(e.pointerId) && e.clientX >= rect.left && e.clientX < rect.right && e.clientY >= rect.top && e.clientY < rect.bottom) {
                onAction(current.hit.index === undefined
                    ? { type: "textPlacement", annotationId: current.hit.annotationId, point: current.point }
                    : { type: "reference", annotationId: current.hit.annotationId, index: current.hit.index, reference: measurePointToReference(current.point) });
                authority.completeReferenceEdit();
            }
            if (!authority.getSnapshot()?.lockedReference) authority.completeReferenceEdit();
            clearChoice(); release(); return;
        }
        // A pending native capture release can precede its lostpointercapture event.
        if (authority.getPress() && !canvas.hasPointerCapture(e.pointerId))
            cancel("pre-up capture loss");
        const p = observePreview(e.clientX, e.clientY);
        const rect = canvas.getBoundingClientRect();
        authority.endPress(e.pointerId, e.clientX, e.clientY, e.clientX >= rect.left && e.clientX < rect.right && e.clientY >= rect.top && e.clientY < rect.bottom, p);
        clearChoice();
        release();
    };
    const pointerCancel = (e: PointerEvent) => { if (captured === e.pointerId)
        cancel(e.type); };
    const blur = () => cancel("focus loss");
    const leave = () => {
        if (captured !== null || edit) return;
        lastClient = null; activeEntityId = undefined; anchors = []; observations = []; highlighted = null; clearChoice(); authority.preview(null);
    };
    const key = (e: KeyboardEvent) => {
        if (authority.getActive() && e.target === canvas && (e.key === "Shift" || e.key === "Tab")) {
            e.preventDefault(); e.stopImmediatePropagation();
            if (e.key === "Shift") { authority.lockAnchor(chosen ?? highlighted); chosen = null; }
            else if (anchors.length) { cycleIndex = ((cycleIndex ?? -1) + 1) % anchors.length; chosen = anchors[cycleIndex].point; highlighted = chosen; }
            if (lastClient) observePreview(lastClient.x, lastClient.y);
            return;
        }
        if (!authority.getActive() || (e.key !== "Escape" && e.key !== "Enter"))
            return;
        const target = e.target as HTMLElement | null;
        if (target?.closest("input,textarea,select,[contenteditable='true']") || document.querySelector('[role="dialog"][aria-modal="true"],dialog[open]'))
            return;
        if (target !== canvas && !target?.closest('[data-testid="measure-tool"]'))
            return;
        if (e.key === "Enter" && target !== canvas && target?.tagName !== "SECTION")
            return;
        e.preventDefault();
        e.stopImmediatePropagation();
        onAction({ type: e.key === "Escape" ? "exit" : "finish" });
    };
    canvas.addEventListener("pointerdown", down, true);
    canvas.addEventListener("pointermove", move, true);
    canvas.addEventListener("pointerup", up, true);
    canvas.addEventListener("pointercancel", pointerCancel, true);
    canvas.addEventListener("pointerleave", leave);
    canvas.addEventListener("lostpointercapture", pointerCancel, true);
    canvas.addEventListener("blur", blur);
    window.addEventListener("blur", blur);
    window.addEventListener("keydown", key, true);
    let previousState = authority.getSnapshot();
    const unsubscribe = authority.subscribe(() => {
        const state = authority.getSnapshot();
        const reset = !state || state.paused !== previousState?.paused || state.mode !== previousState?.mode || state.source !== previousState?.source
            || state.kind !== previousState?.kind || state.snapMode !== previousState?.snapMode
            || state.points !== previousState?.points;
        previousState = state;
        if (reset) {
            edit = null; clearChoice(); highlighted = null; anchors = []; observations = []; activeEntityId = undefined;
            getDimensionManager()?.previewText("", null);
        }
        if (!state || state.paused || state.mode !== "pick" || (!authority.getPress() && !edit))
            release();
    });
    const observer = scene.onAfterRenderObservable.add(() => {
        const state = authority.getSnapshot();
        const { viewport: rect, insets, maximumLabelWidth } = readMeasureLabelViewport(canvas);
        if (!state || state.paused) {
            authority.project({ width: rect.width, height: rect.height, lines: [], markers: [] });
            if (diagnostics())
                delete canvas.dataset.measureSession;
            return;
        }
        if (lastClient && state.mode === "pick" && !state.completed && !edit)
            observePreview(lastClient.x, lastClient.y);
        const current = authority.getSnapshot()!;
        observations = observations.map(observation => {
            const entity = current.entityCatalog.find(item => item.id === observation.entityId);
            const point = entity && getSemanticAnchorPoints(entity)[observation.anchorKind];
            const p = point ? project(point) : null;
            return { ...observation, worldPoint: point ? { ...point, anchorKind: observation.anchorKind } : undefined, x: p?.x ?? observation.x, y: p?.y ?? observation.y,
                visible: Boolean(entity?.visible && p?.visible), reason: !point ? "Reference unavailable" : !entity?.visible ? "Not currently visible" : p!.reason };
        });
        anchors = anchors.flatMap(anchor => {
            const entity = current.entityCatalog.find(item => item.id === anchor.point.entityId && item.visible);
            const point = entity ? getSemanticAnchorPoints(entity)[anchor.point.anchorKind!] : null;
            if (!point) return [];
            const p = project(point);
            return p.visible ? [{ ...anchor, point: { ...point, anchorKind: anchor.point.anchorKind }, x: p.x, y: p.y }] : [];
        });
        const markers = current.kind === "pair" ? current.entry.entities.map(entityReferencePoint) : current.kind === "dimensions" ? getMeasureLines(current).flatMap(line => line.points) : getMeasureOperands(current);
        const projectedMarkers: MeasureProjection["markers"][number][] = markers.map((p, i) => ({ ...project(p), label: String.fromCharCode(65 + i), preview: (i === current.replacePointIndex || i >= current.points.length) && !["pair", "dimensions"].includes(current.kind) }));
        if (current.kind === "distance" && current.projectionMode && current.projectionMode !== "true-3d" && markers.length >= 2)
            projectedMarkers.push({ ...project(projectMeasureB(markers[0], markers[1], current.projectionMode)), label: "B'", preview: true, labelOffset: { x: 8, y: 18 } });
        const result = getMeasureResult(current);
        const manager = getDimensionManager(), representedByDimensionId = manager?.getSessionRepresentationId();
        const style = getStyle();
        const reference = markers[0], zoom = reference ? Vector3.Distance(camera.globalPosition, new Vector3(reference.xMm / 1000, reference.zMm / 1000, reference.yMm / 1000)) : 12;
        const textPx = dimensionTextPx(style, 12 * Math.sqrt(12 / Math.max(1, zoom)));
        const measureText = textMeasurer(style.fontFamily, textPx);
        const obstacles = [...projectedMarkers.filter(point => !point.offscreen).map(point => {
            const bounds = dimensionMarkerBounds(point, point.label.length * 9);
            return point.labelOffset ? { ...bounds, height: Math.max(bounds.height, point.y + point.labelOffset.y + 4 - bounds.y) } : bounds;
        }),
            ...(manager?.getLabelBounds() ?? [])];
        const labels: NonNullable<MeasureProjection["labels"]>[number][] = [];
        const lines = representedByDimensionId ? [] : getMeasureLines(current).flatMap<MeasureProjection["lines"][number]>(line => {
            const points = line.points.map(project);
            if (!line.label || line.label === "XYZ" || !result.values.length) return [{ points, preview: line.preview }];
            const values = current.kind === "dimensions" ? result.values.filter(value => value.label === line.label) : result.values;
            const label = measureDimensionLabel(dimensionLabelLines(current.kind, values, style), textPx, measureText, maximumLabelWidth);
            const linear = ["distance", "pair", "dimensions"].includes(current.kind) && points.length >= 2
                ? layoutLinearDimension(points[0], points[points.length - 1], style, label.width, label.height) : null;
            const centerPoints = current.kind === "area" && current.completed ? points.slice(0, -1) : points;
            const preferred = linear?.text ?? centerPoints.reduce((sum, point) => ({ x: sum.x + point.x / centerPoints.length, y: sum.y + point.y / centerPoints.length }), { x: 0, y: 0 });
            const position = fitDimensionLabel(preferred, label, rect, insets, obstacles);
            labels.push({ ...label, x: position.x, y: position.y, textPx, fontFamily: style.fontFamily, textBackground: style.textBackground });
            obstacles.push(dimensionLabelBounds(position, label.width, label.height));
            const projectedLines: MeasureProjection["lines"][number][] = linear ? linear.segments.map(segment => ({ points: segment, preview: line.preview })) : [{ points, preview: line.preview }];
            if (style.showLeaders && position.displaced) projectedLines.push({ points: [{ ...points[0], ...preferred }, { ...points[0], ...position }], preview: line.preview });
            return projectedLines;
        });
        const locked = authority.resolveLockedAnchor();
        const lockedScreen = locked ? project(locked) : null;
        const lockedReference = current.lockedReference;
        const lockedEntity = current.entityCatalog.find(entity => entity.id === lockedReference?.entityId);
        const lockedAnchor: MeasureProjection["lockedAnchor"] = lockedReference ? {
            reference: lockedReference, entityName: current.entityCatalog.find(entity => entity.id === lockedReference.entityId)?.name ?? lockedReference.entityId,
            point: locked, visible: Boolean(lockedScreen?.visible && lockedEntity?.visible), confirmable: Boolean(locked),
            reason: locked && lockedEntity?.visible === false ? "Not currently visible" : lockedScreen?.reason ?? "Reference unavailable: entity, semantic anchor or canonical dimensions cannot resolve."
        } : undefined;
        if (locked && lockedAnchor?.visible && current.mode === "pick" && !anchors.some(anchor => sameAnchor(anchor.point, locked)))
            anchors.push({ point: locked, x: lockedScreen!.x, y: lockedScreen!.y, distance: 0 });
        authority.project({ width: rect.width, height: rect.height, lines, labels, representedByDimensionId, lockedAnchor, candidateObservations: observations,
            candidates: anchors.map(a => ({ x: a.x, y: a.y, label: MEASURE_ANCHOR_LABELS[a.point.anchorKind!], selected: sameAnchor(a.point, locked ?? highlighted), locked: sameAnchor(a.point, locked) })),
            markers: projectedMarkers });
        if (diagnostics())
            canvas.dataset.measureSession = JSON.stringify({ ...current, entry: { selectionIds: current.entry.selectionIds, primaryId: current.entry.primaryId }, result: getMeasureResult(current), lines: getMeasureLines(current), press: authority.getPress(), lockedAnchor, candidateObservations: observations, activeCandidateEntityId: activeEntityId, highlightedAnchor: highlighted });
    });
    return { candidate, dispose: () => {
            canvas.style.cursor = originalCursor;
            cancel("viewport disposed");
            unsubscribe();
            scene.onAfterRenderObservable.remove(observer);
            canvas.removeEventListener("pointerdown", down, true);
            canvas.removeEventListener("pointermove", move, true);
            canvas.removeEventListener("pointerup", up, true);
            canvas.removeEventListener("pointercancel", pointerCancel, true);
            canvas.removeEventListener("pointerleave", leave);
            canvas.removeEventListener("lostpointercapture", pointerCancel, true);
            canvas.removeEventListener("blur", blur);
            window.removeEventListener("blur", blur);
            window.removeEventListener("keydown", key, true);
        } };
};
