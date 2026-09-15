import {
  GizmoCoordinatesMode,
  Matrix,
  PositionGizmo,
  TransformNode,
  UtilityLayerRenderer,
  Vector3,
  type AbstractMesh,
  type ArcRotateCamera,
  type PointerDragBehavior,
  type Scene
} from "@babylonjs/core";
import type { PlanBounds } from "../../types/alignment";
import type { PlacementSettings } from "../../types/placement";
import { snapMm } from "../../utils/placement";
import type { SceneDragMutationResult } from "./dragPlacement";

export type PlanMoveMember = {
  readonly entityId: string;
  readonly kind: "machine" | "civil";
  readonly positionMm: { readonly xMm: number; readonly yMm: number };
  readonly bounds: PlanBounds;
  readonly verticalCenterMm: number;
  readonly elevationMm: number;
  readonly locked?: boolean;
  readonly hidden?: boolean;
};
export type PlanMoveSelectionSnapshot = {
  readonly selectionIds: readonly string[];
  readonly members: readonly PlanMoveMember[];
  readonly pivotMm: { readonly xMm: number; readonly yMm: number; readonly zMm: number };
};
export type PlanMoveAxis = "x" | "plan-y" | "plane";
export type PlanMovePositionUpdates = {
  readonly machines: readonly { instanceId: string; xMm: number; yMm: number }[];
  readonly civilReferences: readonly { id: string; xMm: number; yMm: number }[];
};

export const derivePlanMoveSelection = (
  selectionIds: readonly string[],
  members: readonly PlanMoveMember[]
): PlanMoveSelectionSnapshot | null => {
  if (selectionIds.length === 0) return null;
  const memberById = new Map(members.map((member) => [member.entityId, member]));
  const selected = selectionIds.map((id) => memberById.get(id));
  if (selected.some((member) => !member || member.locked || member.hidden)) return null;
  const resolved = selected as PlanMoveMember[];
  const minXMm = Math.min(...resolved.map((member) => member.bounds.minXMm));
  const maxXMm = Math.max(...resolved.map((member) => member.bounds.maxXMm));
  const minYMm = Math.min(...resolved.map((member) => member.bounds.minYMm));
  const maxYMm = Math.max(...resolved.map((member) => member.bounds.maxYMm));
  return {
    selectionIds: [...selectionIds],
    members: resolved.map((member) => ({ ...member, positionMm: { ...member.positionMm }, bounds: { ...member.bounds } })),
    pivotMm: {
      xMm: (minXMm + maxXMm) / 2,
      yMm: (minYMm + maxYMm) / 2,
      zMm: Math.max(...resolved.map((member) => member.verticalCenterMm))
    }
  };
};

export const resolvePlanMoveDeltaMm = ({ snapshot, proxyPosition, axis, settings }: {
  snapshot: PlanMoveSelectionSnapshot;
  proxyPosition: { x: number; z: number };
  axis: PlanMoveAxis;
  settings: Pick<PlacementSettings, "gridSnapEnabled" | "gridSnapStepMm">;
}) => {
  const rawXMm = axis === "plan-y" ? 0 : proxyPosition.x * 1000 - snapshot.pivotMm.xMm;
  const rawYMm = axis === "x" ? 0 : proxyPosition.z * 1000 - snapshot.pivotMm.yMm;
  if (!settings.gridSnapEnabled) return { deltaXMm: rawXMm, deltaYMm: rawYMm };
  const anchor = snapshot.members[0].positionMm;
  return {
    deltaXMm: axis === "plan-y" ? 0 : snapMm(anchor.xMm + rawXMm, settings.gridSnapStepMm) - anchor.xMm,
    deltaYMm: axis === "x" ? 0 : snapMm(anchor.yMm + rawYMm, settings.gridSnapStepMm) - anchor.yMm
  };
};

export const createPlanMovePositionUpdates = (
  snapshot: PlanMoveSelectionSnapshot,
  delta: { deltaXMm: number; deltaYMm: number }
): PlanMovePositionUpdates => ({
  machines: snapshot.members.flatMap((member) => member.kind === "machine" ? [{
    instanceId: member.entityId.slice("machine:".length),
    xMm: member.positionMm.xMm + delta.deltaXMm,
    yMm: member.positionMm.yMm + delta.deltaYMm
  }] : []),
  civilReferences: snapshot.members.flatMap((member) => member.kind === "civil" ? [{
    id: member.entityId.slice("civil:".length),
    xMm: member.positionMm.xMm + delta.deltaXMm,
    yMm: member.positionMm.yMm + delta.deltaYMm
  }] : [])
});

export const createPlanMoveGestureHistoryTracker = () => {
  let recorded = false;
  return {
    shouldRecord: () => !recorded,
    accept: (result: SceneDragMutationResult) => {
      if (result === "applied") recorded = true;
    }
  };
};

export type PlanMoveManipulator = {
  syncSelection: (selection: PlanMoveSelectionSnapshot | null) => void;
  updatePresentation: (bodyDragActive?: boolean) => void;
  dispose: () => void;
  getDiagnostics: () => {
    available: boolean;
    activeAxis: PlanMoveAxis | null;
    proxy: { x: number; y: number; z: number } | null;
    handles: Partial<Record<PlanMoveAxis, { x: number; y: number }>>;
  };
};

export const createPlanMoveManipulator = ({ scene, canvas, camera, settings, onApply }: {
  scene: Scene;
  canvas: HTMLCanvasElement;
  camera: ArcRotateCamera;
  settings: () => Pick<PlacementSettings, "gridSnapEnabled" | "gridSnapStepMm">;
  onApply: (updates: PlanMovePositionUpdates, options: { recordHistory: boolean }) => SceneDragMutationResult;
}): PlanMoveManipulator => {
  const utilityLayer = new UtilityLayerRenderer(scene);
  const proxy = new TransformNode("plan-move-selection-proxy", scene);
  const gizmo = new PositionGizmo(utilityLayer, 1);
  gizmo.coordinatesMode = GizmoCoordinatesMode.World;
  gizmo.updateGizmoRotationToMatchAttachedMesh = false;
  gizmo.scaleRatio = 0.9;
  gizmo.planarGizmoEnabled = true;
  gizmo.xGizmo.isEnabled = true;
  gizmo.yGizmo.isEnabled = false;
  gizmo.zGizmo.isEnabled = true;
  gizmo.xPlaneGizmo.isEnabled = false;
  gizmo.yPlaneGizmo.isEnabled = true;
  gizmo.zPlaneGizmo.isEnabled = false;
  gizmo.snapDistance = 0;
  utilityLayer.pickUtilitySceneFirst = true;

  let currentSelection: PlanMoveSelectionSnapshot | null = null;
  let gesture: {
    axis: PlanMoveAxis;
    snapshot: PlanMoveSelectionSnapshot;
    history: ReturnType<typeof createPlanMoveGestureHistoryTracker>;
  } | null = null;
  let cameraDetached = false;

  const endGesture = () => {
    gesture = null;
    if (cameraDetached) {
      camera.attachControl(canvas, true);
      cameraDetached = false;
    }
    canvas.style.cursor = gizmo.isHovered ? "grab" : "default";
  };
  const beginGesture = (axis: PlanMoveAxis) => {
    if (!currentSelection) return;
    gesture = { axis, snapshot: currentSelection, history: createPlanMoveGestureHistoryTracker() };
    if (!cameraDetached) {
      camera.detachControl();
      cameraDetached = true;
    }
    canvas.style.cursor = "grabbing";
  };
  const applyGestureFrame = () => {
    if (!gesture) return;
    const delta = resolvePlanMoveDeltaMm({
      snapshot: gesture.snapshot,
      proxyPosition: proxy.position,
      axis: gesture.axis,
      settings: settings()
    });
    const result = onApply(createPlanMovePositionUpdates(gesture.snapshot, delta), {
      recordHistory: gesture.history.shouldRecord()
    });
    gesture.history.accept(result);
    proxy.position.x = (gesture.snapshot.pivotMm.xMm + delta.deltaXMm) / 1000;
    proxy.position.y = gesture.snapshot.pivotMm.zMm / 1000;
    proxy.position.z = (gesture.snapshot.pivotMm.yMm + delta.deltaYMm) / 1000;
    if (result === "blocked") {
      gizmo.releaseDrag();
      endGesture();
    }
  };
  const bind = (axis: PlanMoveAxis, target: typeof gizmo.xGizmo) => {
    target.dragBehavior.detachCameraControls = false;
    target.dragBehavior.onDragStartObservable.add(() => beginGesture(axis));
    target.dragBehavior.onDragObservable.add(applyGestureFrame);
    target.dragBehavior.onDragEndObservable.add(endGesture);
  };
  bind("x", gizmo.xGizmo);
  bind("plan-y", gizmo.zGizmo);
  bind("plane", gizmo.yPlaneGizmo);

  const axisCache = (gizmo as unknown as {
    _gizmoAxisCache: Map<unknown, {
      colliderMeshes: readonly AbstractMesh[];
      dragBehavior: PointerDragBehavior;
    }>;
  })._gizmoAxisCache;
  const getHandlePresentationSignature = () => [...axisCache.values()]
    .flatMap((candidate) => candidate.colliderMeshes)
    .map((mesh) => {
      const bounds = mesh.getBoundingInfo().boundingBox;
      return [
        mesh.uniqueId,
        mesh.isEnabled(),
        mesh.getWorldMatrix().updateFlag,
        bounds.centerWorld.x,
        bounds.centerWorld.y,
        bounds.centerWorld.z,
        bounds.extendSizeWorld.x,
        bounds.extendSizeWorld.y,
        bounds.extendSizeWorld.z
      ].join(":");
    })
    .join("|");
  const projectWorldPoint = (world: Vector3) => {
    const engine = scene.getEngine();
    const viewport = camera.viewport.toGlobal(engine.getRenderWidth(), engine.getRenderHeight());
    const projected = Vector3.Project(
      world,
      Matrix.Identity(),
      utilityLayer.utilityLayerScene.getTransformMatrix(),
      viewport
    );
    return {
      x: projected.x * canvas.clientWidth / engine.getRenderWidth(),
      y: projected.y * canvas.clientHeight / engine.getRenderHeight()
    };
  };
  const projectHandle = (dragBehavior: PointerDragBehavior) => {
    const cache = [...axisCache.values()].find((candidate) => candidate.dragBehavior === dragBehavior);
    const colliderMeshes = (cache?.colliderMeshes ?? [])
      .filter((mesh) => mesh.isEnabled());
    const candidates = colliderMeshes
      .flatMap((mesh) => [mesh.getBoundingInfo().boundingBox.centerWorld, ...mesh.getBoundingInfo().boundingBox.vectorsWorld]);
    const world = candidates.reduce((farthest, candidate) =>
      Vector3.DistanceSquared(candidate, proxy.position) > Vector3.DistanceSquared(farthest, proxy.position)
        ? candidate
        : farthest,
    proxy.position);
    const engine = scene.getEngine();
    const projected = candidates.map(projectWorldPoint);
    const minX = Math.min(...projected.map((point) => point.x));
    const maxX = Math.max(...projected.map((point) => point.x));
    const minY = Math.min(...projected.map((point) => point.y));
    const maxY = Math.max(...projected.map((point) => point.y));
    const fractions = [0.2, 0.35, 0.5, 0.65, 0.8];
    for (const yFraction of fractions) {
      for (const xFraction of fractions) {
        const point = {
          x: minX + (maxX - minX) * xFraction,
          y: minY + (maxY - minY) * yFraction
        };
        const pick = utilityLayer.utilityLayerScene.pick(
          point.x * engine.getRenderWidth() / canvas.clientWidth,
          point.y * engine.getRenderHeight() / canvas.clientHeight
        );
        if (pick?.pickedMesh && colliderMeshes.includes(pick.pickedMesh)) return point;
      }
    }
    return projectWorldPoint(world);
  };
  let handleProjectionSignature = "";
  let handleSignatureCheckedAt = 0;
  let projectedHandles: Partial<Record<PlanMoveAxis, { x: number; y: number }>> = {};
  const getProjectedHandles = () => {
    if (gesture) return projectedHandles;
    const now = performance.now();
    if (now - handleSignatureCheckedAt < 100) return projectedHandles;
    handleSignatureCheckedAt = now;
    const engine = scene.getEngine();
    const signature = [
      proxy.position.x,
      proxy.position.y,
      proxy.position.z,
      camera.alpha,
      camera.beta,
      camera.radius,
      camera.target.x,
      camera.target.y,
      camera.target.z,
      engine.getRenderWidth(),
      engine.getRenderHeight(),
      getHandlePresentationSignature()
    ].join("|");
    if (signature !== handleProjectionSignature) {
      const nextHandles = {
        x: projectHandle(gizmo.xGizmo.dragBehavior),
        "plan-y": projectHandle(gizmo.zGizmo.dragBehavior),
        plane: projectHandle(gizmo.yPlaneGizmo.dragBehavior)
      };
      const points = Object.values(nextHandles);
      const spread = Math.max(...points.flatMap((point, index) =>
        points.slice(index + 1).map((other) => Math.hypot(point.x - other.x, point.y - other.y))
      ));
      const onCanvas = points.every((point) =>
        Number.isFinite(point.x)
        && Number.isFinite(point.y)
        && point.x >= 0
        && point.x <= canvas.clientWidth
        && point.y >= 0
        && point.y <= canvas.clientHeight
      );
      projectedHandles = nextHandles;
      handleProjectionSignature = onCanvas && spread >= 20 ? signature : "";
    }
    return projectedHandles;
  };

  return {
    syncSelection(selection) {
      currentSelection = selection;
      if (gesture) return;
      if (!selection) {
        gizmo.attachedNode = null;
        canvas.style.cursor = "default";
        return;
      }
      proxy.position = new Vector3(selection.pivotMm.xMm / 1000, selection.pivotMm.zMm / 1000, selection.pivotMm.yMm / 1000);
      gizmo.attachedNode = proxy;
      handleProjectionSignature = "";
      handleSignatureCheckedAt = 0;
    },
    updatePresentation(bodyDragActive = false) {
      canvas.style.cursor = gesture || bodyDragActive ? "grabbing" : gizmo.isHovered ? "grab" : "default";
    },
    getDiagnostics: () => {
      const available = Boolean(currentSelection && gizmo.attachedNode);
      return {
        available,
        activeAxis: gesture?.axis ?? null,
        proxy: currentSelection ? { x: proxy.position.x, y: proxy.position.y, z: proxy.position.z } : null,
        handles: available ? getProjectedHandles() : {}
      };
    },
    dispose() {
      endGesture();
      gizmo.attachedNode = null;
      gizmo.dispose();
      proxy.dispose();
      utilityLayer.dispose();
      canvas.style.cursor = "default";
    }
  };
};
