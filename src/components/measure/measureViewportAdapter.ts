import { Matrix, Ray, Vector3, type ArcRotateCamera, type Scene } from "@babylonjs/core";
import type { MeasureAuthority, MeasureAction } from "../../measure/measureAuthority";
import { getMeasureLines, getMeasureResult } from "../../measure/measureAuthority";
import { entityReferencePoint, formatMeasureValue, type MeasurePoint } from "../../measure/measureGeometry";
import { getSelectionPickTarget } from "../babylonScene/selectionPicking";
import { getSemanticAnchorPoints } from "../../measure/measureReferences";
import type { MeasureAnchorKind } from "../../measure/referenceTypes";
import { measurePointToReference } from "../../measure/measureAuthority";
import { MEASURE_ANCHOR_LABELS } from "../../measure/measureReferences";
import type { createReferenceDimensionSceneManager, DimensionHit } from "./referenceDimensionScene";
import { intersectRayWithHorizontalDragPlane } from "../babylonScene/dragPlacement";
import { MEASURE_ANCHOR_MARKER_RADIUS_CSS_PX } from "../../measure/measurePresentation";
export const installMeasureViewportAdapter = ({ scene, camera, canvas, authority, onAction, diagnostics, getDimensionManager }: {
    scene: Scene;
    camera: ArcRotateCamera;
    canvas: HTMLCanvasElement;
    authority: MeasureAuthority;
    onAction: (action: MeasureAction) => void;
    diagnostics: () => boolean;
    getDimensionManager: () => ReturnType<typeof createReferenceDimensionSceneManager> | null;
}) => {
    let anchors: { point: MeasurePoint; x: number; y: number; distance: number }[] = [];
    let highlighted: MeasurePoint | null = null, locked: MeasurePoint | null = null, chosen: MeasurePoint | null = null;
    let cycleIndex: number | null = null;
    const originalCursor = canvas.style.cursor;
    let edit: { hit: DimensionHit; startX: number; startY: number; offsetX: number; offsetY: number; depth: number; point: MeasurePoint | null; moved: boolean } | null = null;
    let captured: number | null = null;
    let lastClient: {
        x: number;
        y: number;
    } | null = null;
    const pointFromVector = (p: Vector3, entityId?: string): MeasurePoint => ({ xMm: p.x * 1000, yMm: p.z * 1000, zMm: p.y * 1000, ...(entityId ? { entityId } : {}) });
    const candidate = (clientX: number, clientY: number): MeasurePoint | null => {
        const state = authority.getSnapshot();
        if (!state)
            return null;
        const rect = canvas.getBoundingClientRect(), x = clientX - rect.left, y = clientY - rect.top;
        if (x < 0 || y < 0 || x >= rect.width || y >= rect.height)
            return null;
        if (locked || chosen) return locked ?? chosen;
        anchors = [];
        highlighted = null;
        if (state.source === "level-plane") {
            if (!state.level || !Number.isFinite(state.level.elevationMm))
                return null;
            const ray = scene.createPickingRay(x, y, Matrix.Identity(), camera);
            const hit = intersectRayWithHorizontalDragPlane(ray.origin, ray.direction, state.level.elevationMm / 1000);
            return hit ? { ...pointFromVector(new Vector3(hit.x, hit.y, hit.z)), levelId: state.level.id } : null;
        }
        const hit = scene.pick(x, y, mesh => {
            const target = getSelectionPickTarget({ pickedMesh: mesh });
            return mesh.isPickable && mesh.isEnabled() && mesh.isVisible && mesh.visibility > 0
                && Boolean(target.instanceId || target.civilReferenceId) && !target.annotationId;
        }, false, camera);
        if (!hit?.hit || !hit.pickedPoint)
            return null;
        const target = getSelectionPickTarget(hit);
        const entityId = target.instanceId ? `machine:${target.instanceId}` : `civil:${target.civilReferenceId}`;
        const actual = pointFromVector(hit.pickedPoint, entityId);
        if (state.snapMode !== "semantic") return actual;
        const entity = state.entityCatalog.find((item) => item.id === entityId);
        if (!entity) return actual;
        const candidates = Object.entries(getSemanticAnchorPoints(entity)) as Array<[MeasureAnchorKind, MeasurePoint]>;
        anchors = [];
        const renderWidth = scene.getEngine().getRenderWidth();
        const renderHeight = scene.getEngine().getRenderHeight();
        const viewport = camera.viewport.toGlobal(renderWidth, renderHeight);
        for (const [anchorKind, point] of candidates) {
            const world = new Vector3(point.xMm / 1000, point.zMm / 1000, point.yMm / 1000);
            const projected = Vector3.Project(world, Matrix.Identity(), scene.getTransformMatrix(), viewport);
            const px = projected.x * rect.width / renderWidth;
            const py = projected.y * rect.height / renderHeight;
            const distance = Math.hypot(px - x, py - y);
            anchors.push({ distance, point: { ...point, anchorKind }, x: px, y: py });
        }
        anchors.sort((a, b) => a.distance - b.distance || String(a.point.anchorKind).localeCompare(String(b.point.anchorKind), "en"));
        // The visible 7px candidate marker is its hit target. Outside it, preserve the actual surface hit.
        highlighted = cycleIndex !== null ? anchors[cycleIndex % anchors.length]?.point ?? null : anchors[0]?.point ?? null;
        return cycleIndex !== null || anchors[0]?.distance <= MEASURE_ANCHOR_MARKER_RADIUS_CSS_PX ? highlighted ?? actual : actual;
    };
    const release = () => { const id = captured; captured = null; if (id !== null && canvas.hasPointerCapture(id))
        canvas.releasePointerCapture(id); };
    const clearChoice = () => { locked = null; chosen = null; cycleIndex = null; };
    const cancel = (reason: string) => { authority.cancelPress(reason); edit = null; clearChoice(); getDimensionManager()?.previewText("", null); release(); };
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
        if (!s || e.button !== 0)
            return;
        if (s.mode !== "pick")
            return;
        block(e);
        canvas.focus({ preventScroll: true });
        const dimensionHit = getDimensionManager()?.hitTest(e.clientX, e.clientY);
        if (dimensionHit && e.isPrimary) {
            authority.selectDimension(dimensionHit.annotationId);
            const projected = Vector3.Project(new Vector3(dimensionHit.point.xMm / 1000, dimensionHit.point.zMm / 1000, dimensionHit.point.yMm / 1000), Matrix.Identity(), scene.getTransformMatrix(), camera.viewport.toGlobal(scene.getEngine().getRenderWidth(), scene.getEngine().getRenderHeight()));
            const rect = canvas.getBoundingClientRect();
            edit = { hit: dimensionHit, startX: e.clientX, startY: e.clientY,
                offsetX: rect.left + projected.x * rect.width / scene.getEngine().getRenderWidth() - e.clientX,
                offsetY: rect.top + projected.y * rect.height / scene.getEngine().getRenderHeight() - e.clientY,
                depth: projected.z, point: null, moved: false };
            captured = e.pointerId; canvas.setPointerCapture(e.pointerId); return;
        }
        observePreview(e.clientX, e.clientY);
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
        if (!s || s.mode !== "pick" || (e.buttons !== 0 && (e.buttons & 1) === 0))
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
        if (!s || s.mode !== "pick" || e.button !== 0)
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
            }
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
    const key = (e: KeyboardEvent) => {
        if (authority.getActive() && e.target === canvas && (e.key === "Shift" || e.key === "Tab")) {
            e.preventDefault(); e.stopImmediatePropagation();
            if (e.key === "Shift") { locked = chosen ?? highlighted; chosen = locked; }
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
    const keyUp = (e: KeyboardEvent) => { if (e.key === "Shift") { locked = null; if (lastClient) observePreview(lastClient.x, lastClient.y); } };
    canvas.addEventListener("pointerdown", down, true);
    canvas.addEventListener("pointermove", move, true);
    canvas.addEventListener("pointerup", up, true);
    canvas.addEventListener("pointercancel", pointerCancel, true);
    canvas.addEventListener("lostpointercapture", pointerCancel, true);
    canvas.addEventListener("blur", blur);
    window.addEventListener("blur", blur);
    window.addEventListener("keydown", key, true);
    window.addEventListener("keyup", keyUp, true);
    let previousState = authority.getSnapshot();
    const unsubscribe = authority.subscribe(() => {
        const state = authority.getSnapshot();
        const reset = !state || state.mode !== previousState?.mode || state.source !== previousState?.source
            || state.kind !== previousState?.kind || state.snapMode !== previousState?.snapMode
            || (state.points.length === 0 && state.points !== previousState?.points);
        previousState = state;
        if (reset) {
            edit = null; clearChoice(); highlighted = null; anchors = [];
            getDimensionManager()?.previewText("", null);
        }
        if (!state || state.mode !== "pick" || (!authority.getPress() && !edit))
            release();
    });
    const observer = scene.onAfterRenderObservable.add(() => {
        const state = authority.getSnapshot();
        const rect = canvas.getBoundingClientRect();
        if (!state) {
            authority.project({ width: rect.width, height: rect.height, lines: [], markers: [] });
            if (diagnostics())
                delete canvas.dataset.measureSession;
            return;
        }
        if (lastClient && state.mode === "pick" && !state.completed && !edit)
            observePreview(lastClient.x, lastClient.y);
        const current = authority.getSnapshot()!;
        const project = (p: MeasurePoint) => {
            const v = Vector3.Project(new Vector3(p.xMm / 1000, p.zMm / 1000, p.yMm / 1000), Matrix.Identity(), scene.getTransformMatrix(), camera.viewport.toGlobal(scene.getEngine().getRenderWidth(), scene.getEngine().getRenderHeight()));
            const x = v.x * rect.width / scene.getEngine().getRenderWidth(), y = v.y * rect.height / scene.getEngine().getRenderHeight();
            const world = new Vector3(p.xMm / 1000, p.zMm / 1000, p.yMm / 1000);
            const direction = world.subtract(camera.globalPosition), distance = direction.length();
            const hit = distance > 0 ? scene.pickWithRay(new Ray(camera.globalPosition, direction.normalize(), distance), mesh => {
                const target = getSelectionPickTarget({ pickedMesh: mesh });
                return mesh.isPickable && mesh.isEnabled() && mesh.isVisible && mesh.visibility > 0 && Boolean(target.instanceId || target.civilReferenceId);
            }) : null;
            return { x, y, offscreen: !Number.isFinite(x) || !Number.isFinite(y) || v.z < 0 || v.z > 1 || x < 0 || x > rect.width || y < 0 || y > rect.height,
                occluded: Boolean(hit?.hit && hit.distance < distance - .001) };
        };
        const markers = current.kind === "pair" ? current.entry.entities.map(entityReferencePoint) : current.kind === "dimensions" ? getMeasureLines(current).flatMap(line => line.points) : [...current.points, ...(current.hover && !current.completed ? [current.hover] : [])];
        const result = getMeasureResult(current);
        const lines = getMeasureLines(current).map(line => {
            const quantity = result.values.find(v => v.label === line.label || (line.label === "Angle" && v.unit === "deg") || (line.label === "Reference Point" && v.label === "3D Distance"));
            const firstArm = current.kind === "angle" && line.label === "Angle" && current.points.length === 3
                ? [project(current.points[0]), project(current.points[1])] : null;
            const labelPoint = firstArm ? { x: firstArm[0].x + (firstArm[1].x - firstArm[0].x) / 4,
                y: firstArm[0].y + (firstArm[1].y - firstArm[0].y) / 4 } : undefined;
            return { ...line, points: line.points.map(project), labelPoint, label: line.label ? `${line.label}${quantity ? ` ${formatMeasureValue(quantity)}` : ""}` : undefined };
        });
        authority.project({ width: rect.width, height: rect.height, lines,
            candidates: anchors.map(a => ({ x: a.x, y: a.y, label: MEASURE_ANCHOR_LABELS[a.point.anchorKind!], selected: a.point.anchorKind === (locked ?? highlighted)?.anchorKind, locked: a.point.anchorKind === locked?.anchorKind })),
            markers: markers.map((p, i) => ({ ...project(p), label: String.fromCharCode(65 + i), preview: i >= current.points.length && !["pair", "dimensions"].includes(current.kind) })) });
        if (diagnostics())
            canvas.dataset.measureSession = JSON.stringify({ ...current, entry: { selectionIds: current.entry.selectionIds, primaryId: current.entry.primaryId }, result: getMeasureResult(current), lines: getMeasureLines(current), press: authority.getPress() });
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
            canvas.removeEventListener("lostpointercapture", pointerCancel, true);
            canvas.removeEventListener("blur", blur);
            window.removeEventListener("blur", blur);
            window.removeEventListener("keydown", key, true);
            window.removeEventListener("keyup", keyUp, true);
        } };
};
