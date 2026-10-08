import { Matrix, Ray, Vector3, type ArcRotateCamera, type Scene } from "@babylonjs/core";
import type { MeasureAuthority, MeasureAction } from "../../measure/measureAuthority";
import { getMeasureLines, getMeasureResult } from "../../measure/measureAuthority";
import { entityReferencePoint, formatMeasureValue, type MeasurePoint } from "../../measure/measureGeometry";
import { getSelectionPickTarget } from "../babylonScene/selectionPicking";
import { getSemanticAnchorPoints } from "../../measure/measureReferences";
import type { MeasureAnchorKind } from "../../measure/referenceTypes";
import { intersectRayWithHorizontalDragPlane } from "../babylonScene/dragPlacement";
export const installMeasureViewportAdapter = ({ scene, camera, canvas, authority, onAction, diagnostics }: {
    scene: Scene;
    camera: ArcRotateCamera;
    canvas: HTMLCanvasElement;
    authority: MeasureAuthority;
    onAction: (action: MeasureAction) => void;
    diagnostics: () => boolean;
}) => {
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
        if (state.source === "level-plane") {
            if (!state.level || !Number.isFinite(state.level.elevationMm))
                return null;
            const ray = scene.createPickingRay(x, y, Matrix.Identity(), camera);
            const hit = intersectRayWithHorizontalDragPlane(ray.origin, ray.direction, state.level.elevationMm / 1000);
            return hit ? pointFromVector(new Vector3(hit.x, hit.y, hit.z)) : null;
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
        let best: { distance: number; point: MeasurePoint } | null = null;
        const renderWidth = scene.getEngine().getRenderWidth();
        const renderHeight = scene.getEngine().getRenderHeight();
        const viewport = camera.viewport.toGlobal(renderWidth, renderHeight);
        for (const [anchorKind, point] of candidates) {
            const world = new Vector3(point.xMm / 1000, point.zMm / 1000, point.yMm / 1000);
            const projected = Vector3.Project(world, Matrix.Identity(), scene.getTransformMatrix(), viewport);
            const px = projected.x * rect.width / renderWidth;
            const py = projected.y * rect.height / renderHeight;
            const distance = Math.hypot(px - x, py - y);
            if (!best || distance < best.distance) best = { distance, point: { ...point, anchorKind } };
        }
        return best?.point ?? actual;
    };
    const release = () => { const id = captured; captured = null; if (id !== null && canvas.hasPointerCapture(id))
        canvas.releasePointerCapture(id); };
    const cancel = (reason: string) => { authority.cancelPress(reason); release(); };
    const observePreview = (x: number, y: number) => {
        lastClient = { x, y };
        const p = candidate(x, y);
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
        authority.movePress(e.pointerId, e.clientX, e.clientY);
        observePreview(e.clientX, e.clientY);
    };
    const up = (e: PointerEvent) => {
        const s = authority.getSnapshot();
        if (!s || s.mode !== "pick" || e.button !== 0)
            return;
        block(e);
        // A pending native capture release can precede its lostpointercapture event.
        if (authority.getPress() && !canvas.hasPointerCapture(e.pointerId))
            cancel("pre-up capture loss");
        const p = observePreview(e.clientX, e.clientY);
        const rect = canvas.getBoundingClientRect();
        authority.endPress(e.pointerId, e.clientX, e.clientY, e.clientX >= rect.left && e.clientX < rect.right && e.clientY >= rect.top && e.clientY < rect.bottom, p);
        release();
    };
    const pointerCancel = (e: PointerEvent) => { if (captured === e.pointerId)
        cancel(e.type); };
    const blur = () => cancel("focus loss");
    const key = (e: KeyboardEvent) => {
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
    canvas.addEventListener("lostpointercapture", pointerCancel, true);
    canvas.addEventListener("blur", blur);
    window.addEventListener("blur", blur);
    window.addEventListener("keydown", key, true);
    const unsubscribe = authority.subscribe(() => {
        const state = authority.getSnapshot();
        if (!state || state.mode !== "pick" || !authority.getPress())
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
        if (lastClient && state.mode === "pick" && !state.completed)
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
            return { ...line, points: line.points.map(project), label: line.label ? `${line.label}${quantity ? ` ${formatMeasureValue(quantity)}` : ""}` : undefined };
        });
        authority.project({ width: rect.width, height: rect.height, lines, markers: markers.map((p, i) => ({ ...project(p), label: String.fromCharCode(65 + i), preview: i >= current.points.length && !["pair", "dimensions"].includes(current.kind) })) });
        if (diagnostics())
            canvas.dataset.measureSession = JSON.stringify({ ...current, entry: { selectionIds: current.entry.selectionIds, primaryId: current.entry.primaryId }, result: getMeasureResult(current), lines: getMeasureLines(current), press: authority.getPress() });
    });
    return { candidate, dispose: () => {
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
        } };
};
