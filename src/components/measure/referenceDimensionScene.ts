import { Constants, DynamicTexture, Matrix, Mesh, StandardMaterial, Vector3, VertexData, type ArcRotateCamera, type Scene } from "@babylonjs/core";
import type { AnnotationObject } from "../../types/annotations";
import type { LayoutLevel } from "../../types/levels";
import type { PlatformEntity } from "../../platform/contracts";
import type { MeasureAuthority } from "../../measure/measureAuthority";
import { getDimensionResult, resolveDimensionReferences } from "../../measure/measureReferences";
import { angleArc, dimensionLines, type MeasurePoint } from "../../measure/measureGeometry";
import { dimensionTextPx, formatDimensionValue, layoutLinearDimension, type DimensionScreenPoint as ScreenPoint, type DimensionSegment } from "../../measure/dimensionPresentation";
import { createTechnicalColor3 } from "../../designSystem/technicalPaletteBabylon";
import { TECHNICAL_CSS_COLORS } from "../../designSystem/technicalPalette";
import { placeMeasureCallout } from "../../measure/measurePresentation";

type Node = { strokes: Mesh; grips: Mesh; label: Mesh; material: StandardMaterial; labelMaterial: StandardMaterial; texture: DynamicTexture; key: string; textAspect: number };
export type DimensionHit = { annotationId: string; index?: number; point: MeasurePoint };
const world = (p: MeasurePoint) => new Vector3(p.xMm / 1000, p.zMm / 1000, p.yMm / 1000);

export const createReferenceDimensionSceneManager = ({ scene, camera, canvas, authority, getAnnotations, getEntities, getLevels }: {
  scene: Scene; camera: ArcRotateCamera; canvas: HTMLCanvasElement; authority: MeasureAuthority;
  getAnnotations: () => readonly AnnotationObject[]; getEntities: () => readonly PlatformEntity[]; getLevels: () => readonly LayoutLevel[];
}) => {
  const nodes = new Map<string, Node>();
  let previewText: { id: string; point: MeasurePoint } | null = null;
  let hitTargets: { hit: DimensionHit; screen: ScreenPoint; width: number; height: number }[] = [];
  const disposeNode = (node: Node) => {
    node.strokes.dispose(); node.grips.dispose(); node.label.dispose(); node.material.dispose(); node.labelMaterial.dispose(); node.texture.dispose();
  };
  const clear = () => { nodes.forEach(disposeNode); nodes.clear(); hitTargets = []; };
  scene.setRenderingAutoClearDepthStencil(3, false, false, false);
  const material = (id: string, overlay: boolean) => {
    const m = new StandardMaterial(id, scene);
    m.disableLighting = true; m.emissiveColor = createTechnicalColor3("selectionPrimary"); m.backFaceCulling = false;
    m.depthFunction = overlay ? Constants.ALWAYS : Constants.LEQUAL; m.disableDepthWrite = overlay;
    return m;
  };
  const update = () => {
    const rect = canvas.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;
    const rw = scene.getEngine().getRenderWidth(), rh = scene.getEngine().getRenderHeight();
    const project = (p: MeasurePoint): ScreenPoint => {
      const v = Vector3.Project(world(p), Matrix.Identity(), scene.getTransformMatrix(), camera.viewport.toGlobal(rw, rh));
      return { x: v.x * rect.width / rw, y: v.y * rect.height / rh, z: v.z };
    };
    const unproject = (p: ScreenPoint) => Vector3.Unproject(new Vector3(p.x * rw / rect.width, p.y * rh / rect.height, p.z), rw, rh, Matrix.Identity(), scene.getViewMatrix(), scene.getProjectionMatrix());
    const setQuads = (mesh: Mesh, quads: ScreenPoint[][], textured = false) => {
      const positions: number[] = [], indices: number[] = [], uvs: number[] = [];
      quads.forEach((quad, i) => {
        quad.forEach(p => { const v = unproject(p); positions.push(v.x, v.y, v.z); });
        const n = i * 4; indices.push(n, n + 1, n + 2, n, n + 2, n + 3);
        if (textured) uvs.push(0, 1, 1, 1, 1, 0, 0, 0);
      });
      const data = new VertexData(); data.positions = positions; data.indices = indices;
      if (textured) data.uvs = uvs;
      data.applyToMesh(mesh, true);
    };
    const box = (p: ScreenPoint, w: number, h: number) => [
      { ...p, x: p.x - w / 2, y: p.y - h / 2 }, { ...p, x: p.x + w / 2, y: p.y - h / 2 },
      { ...p, x: p.x + w / 2, y: p.y + h / 2 }, { ...p, x: p.x - w / 2, y: p.y + h / 2 }
    ];
    const entities = getEntities(), levels = getLevels(), active = new Set<string>();
    hitTargets = [];
    getAnnotations().flatMap(annotation => annotation.dimension?.dimensionKind === "dimensions" && !annotation.dimension.dimensionAxis
      ? (["width", "depth", "height"] as const).map(dimensionAxis => ({ ...annotation, dimension: { ...annotation.dimension!, dimensionAxis } }))
      : [annotation]).forEach(annotation => {
      const dimension = annotation.dimension;
      if (!dimension || !dimension.visible) return;
      const resolved = resolveDimensionReferences(dimension, entities, levels), result = getDimensionResult(annotation, entities, levels);
      if (resolved.orphaned || result.reason || !resolved.points.length) return;
      const style = dimension.style;
      const renderId = dimension.dimensionAxis ? `${annotation.id}:${dimension.dimensionAxis}` : annotation.id;
      const values = dimension.dimensionKind === "distance" || dimension.dimensionKind === "pair" ? result.values.filter(v => v.label === "3D Distance") : result.values;
      const text = values.map(v => formatDimensionValue(v, style)).join(" | ");
      const key = JSON.stringify([text, style.fontFamily, style.textBackground, style.displayMode]);
      let node = nodes.get(renderId);
      if (node?.key !== key) { if (node) disposeNode(node); nodes.delete(renderId); node = undefined; }
      if (!node) {
        const texture = new DynamicTexture(`dimension-text-${annotation.id}`, { width: 1, height: 1 }, scene); texture.hasAlpha = true;
        let ctx = texture.getContext() as unknown as CanvasRenderingContext2D;
        ctx.font = `600 48px ${style.fontFamily}`;
        const width = Math.ceil(ctx.measureText(text).width) + 24, height = 72;
        texture.scaleTo(width, height); ctx = texture.getContext() as unknown as CanvasRenderingContext2D;
        ctx.font = `600 48px ${style.fontFamily}`; ctx.textBaseline = "middle"; ctx.clearRect(0, 0, width, height);
        if (style.textBackground) { ctx.fillStyle = TECHNICAL_CSS_COLORS.labelDarkBackground; ctx.fillRect(0, 0, width, height); }
        ctx.fillStyle = TECHNICAL_CSS_COLORS.labelText; ctx.fillText(text, 12, 36); texture.update();
        const overlay = style.displayMode === "overlay", m = material(`dimension-stroke-${annotation.id}`, overlay), lm = material(`dimension-label-${annotation.id}`, overlay);
        lm.emissiveColor = createTechnicalColor3("white"); lm.diffuseTexture = texture; lm.opacityTexture = texture; lm.transparencyMode = StandardMaterial.MATERIAL_ALPHATEST;
        const strokes = new Mesh(`reference-dimension-${renderId}`, scene), label = new Mesh(`reference-dimension-label-${renderId}`, scene);
        const grips = new Mesh(`reference-dimension-grips-${renderId}`, scene);
        strokes.material = grips.material = m; label.material = lm; strokes.isPickable = grips.isPickable = label.isPickable = false;
        strokes.renderingGroupId = grips.renderingGroupId = label.renderingGroupId = overlay ? 3 : 0;
        node = { strokes, grips, label, material: m, labelMaterial: lm, texture, key, textAspect: width / 48 }; nodes.set(renderId, node);
      }
      active.add(renderId);
      let points = resolved.points;
      if (dimension.dimensionKind === "dimensions") {
        const ref = dimension.references[0], entity = ref.type === "entity-anchor" ? entities.find(e => e.id === ref.entityId) : undefined;
        const axis = dimension.dimensionAxis === "depth" ? 1 : dimension.dimensionAxis === "height" ? 2 : 0;
        points = [...(entity ? dimensionLines(entity)[axis]?.points ?? points : points)];
      }
      if (dimension.dimensionKind === "area") points = points.map(p => ({ ...p, zMm: dimension.presentationElevationMm ?? points[0].zMm }));
      const projected = points.map(project);
      if (projected.some(p => ![p.x, p.y, p.z].every(Number.isFinite) || p.z < 0 || p.z > 1)) { node.strokes.setEnabled(false); node.grips.setEnabled(false); node.label.setEnabled(false); return; }
      node.strokes.setEnabled(true); node.label.setEnabled(true);
      const zoom = Math.max(1, Vector3.Distance(camera.globalPosition, world(points[0])));
      const textPx = dimensionTextPx(style, 12 * Math.sqrt(12 / zoom)), textWidth = node.textAspect * textPx, textHeight = 1.5 * textPx;
      const placement = previewText?.id === annotation.id ? previewText.point : dimension.textPlacementMm;
      let labelPosition = placement ? project(placement) : projected.reduce((a, b) => ({ x: a.x + b.x / projected.length, y: a.y + b.y / projected.length, z: a.z + b.z / projected.length }), { x: 0, y: 0, z: 0 });
      const segments: DimensionSegment[] = []; let fit = "inside";
      if (["distance", "pair", "dimensions"].includes(dimension.dimensionKind) && projected.length >= 2) {
        const layout = layoutLinearDimension(projected[0], projected[1], style, textWidth, textHeight, placement ? labelPosition : undefined);
        segments.push(...layout.segments); labelPosition = layout.text; fit = layout.outside ? "outside" : "inside";
      } else {
        for (let i = 1; i < projected.length; i++) segments.push([projected[i - 1], projected[i]]);
        if (dimension.dimensionKind === "area") segments.push([projected[projected.length - 1], projected[0]]);
        if (dimension.dimensionKind === "angle" && points.length >= 3) {
          const arc = angleArc(points[0], points[1], points[2]).map(project);
          for (let i = 1; i < arc.length; i++) segments.push([arc[i - 1], arc[i]]);
          if (!placement && arc.length) labelPosition = { ...arc[Math.floor(arc.length / 2)], y: arc[Math.floor(arc.length / 2)].y - textHeight };
        }
        if (placement && style.showLeaders) segments.push([projected[0], labelPosition]);
      }
      if (!placement) {
        const root = canvas.closest('[data-testid="app-root"]');
        const css = root ? getComputedStyle(root) : null;
        const inset = (name: string) => Number.parseFloat(css?.getPropertyValue(name) ?? "0") || 0;
        const safe = placeMeasureCallout({ x: labelPosition.x - textWidth / 2, y: labelPosition.y }, rect.width, rect.height,
          { left: inset("--av-viewport-hud-left-inset"), right: inset("--av-viewport-hud-right-inset"), bottom: inset("--av-viewport-hud-bottom-inset") }, textWidth);
        if (safe.displaced) {
          const previous = labelPosition;
          labelPosition = { ...labelPosition, x: safe.x + textWidth / 2, y: safe.y };
          const last = segments[segments.length - 1];
          if (last?.[1] === previous) segments[segments.length - 1] = [last[0], labelPosition];
          else if (style.showLeaders) segments.push([previous, labelPosition]);
        }
      }
      const quads = segments.map(([a, b]) => {
        const length = Math.hypot(b.x - a.x, b.y - a.y);
        const dx = length ? -(b.y - a.y) / length * style.lineWeightPx / 2 : style.lineWeightPx / 2, dy = length ? (b.x - a.x) / length * style.lineWeightPx / 2 : 0;
        return [{ ...a, x: a.x + dx, y: a.y + dy }, { ...b, x: b.x + dx, y: b.y + dy }, { ...b, x: b.x - dx, y: b.y - dy }, { ...a, x: a.x - dx, y: a.y - dy }];
      });
      const gripQuads: ScreenPoint[][] = [];
      if (authority.getActive() && authority.getSelectedDimensionId() === annotation.id) resolved.points.forEach((point, index) => {
        const screen = project(point); gripQuads.push(box(screen, 9, 9)); hitTargets.push({ hit: { annotationId: annotation.id, index, point }, screen, width: 14, height: 14 });
      });
      node.grips.setEnabled(gripQuads.length > 0);
      if (gripQuads.length) setQuads(node.grips, gripQuads);
      setQuads(node.strokes, quads); setQuads(node.label, [box(labelPosition, textWidth, textHeight)], true);
      const labelWorld = unproject(labelPosition);
      hitTargets.push({ hit: { annotationId: annotation.id, point: { xMm: labelWorld.x * 1000, yMm: labelWorld.z * 1000, zMm: labelWorld.y * 1000 } }, screen: labelPosition, width: textWidth, height: textHeight });
      node.strokes.metadata = { referenceDimensionId: annotation.id, references: dimension.references, style, displayMode: style.displayMode, fit, witnessCount: ["distance", "pair", "dimensions"].includes(dimension.dimensionKind) && style.showWitnessLines ? 2 : 0, lineWeightPx: style.lineWeightPx, textPx, text, labelPosition, endpoints: resolved.points, endpointScreens: resolved.points.map(project), segments };
    });
    nodes.forEach((node, id) => { if (!active.has(id)) { disposeNode(node); nodes.delete(id); } });
  };
  return { build: update, update, dispose: clear,
    getEditorAffordances: () => [...nodes.values()].map(node => node.grips),
    previewText: (id: string, point: MeasurePoint | null) => { previewText = point ? { id, point } : null; },
    hitTest: (x: number, y: number): DimensionHit | null => {
      const rect = canvas.getBoundingClientRect();
      return hitTargets.find(t => Math.abs(x - rect.left - t.screen.x) <= t.width / 2 && Math.abs(y - rect.top - t.screen.y) <= t.height / 2)?.hit ?? null;
    },
    getEvidence: () => [...nodes].map(([id, node]) => ({ id, ...node.strokes.metadata }))
  };
};
