import { DynamicTexture, LinesMesh, Matrix, Mesh, MeshBuilder, StandardMaterial, Vector3, type ArcRotateCamera, type Scene } from "@babylonjs/core";
import type { AnnotationObject } from "../../types/annotations";
import type { LayoutLevel } from "../../types/levels";
import type { PlatformEntity } from "../../platform/contracts";
import { getDimensionResult, resolveDimensionReferences } from "../../measure/measureReferences";
import { angleArc, dimensionLines } from "../../measure/measureGeometry";
import { formatMeasureValue } from "../../measure/measureGeometry";
import type { MeasureDimensionMetadata, MeasureReference } from "../../measure/referenceTypes";
import { createTechnicalColor3 } from "../../designSystem/technicalPaletteBabylon";
import { TECHNICAL_CSS_COLORS } from "../../designSystem/technicalPalette";

type ReferenceDimensionNode = {
  meshes: LinesMesh[];
  label: Mesh;
  texture: DynamicTexture;
  material: StandardMaterial;
  text: string;
  style: MeasureDimensionMetadata["style"];
};

const toWorld = (point: { xMm: number; yMm: number; zMm: number }) => new Vector3(point.xMm / 1000, point.zMm / 1000, point.yMm / 1000);
const safeDistance = (camera: ArcRotateCamera, point: Vector3) => Math.max(1, Vector3.Distance(camera.globalPosition, point));

const formatDimensionText = (annotation: AnnotationObject, entities: readonly PlatformEntity[], levels: readonly LayoutLevel[]) => {
  const result = getDimensionResult(annotation, entities, levels);
  if (result.reason || result.values.length === 0) return result.reason ?? "—";
  const precision = annotation.dimension?.style.precision ?? 3;
  return result.values.map((value) => {
    const number = value.value.toFixed(precision);
    const normalized = Number(number) === 0 ? Number(0).toFixed(precision) : number;
    return value.label + " " + normalized + " " + value.unit;
  }).join(" | ");
};

const createTextNode = (scene: Scene, id: string, text: string, style: MeasureDimensionMetadata["style"]) => {
  const texture = new DynamicTexture("measure-dimension-texture-" + id, { width: 1024, height: 256 }, scene);
  texture.hasAlpha = true;
  const context = texture.getContext() as unknown as CanvasRenderingContext2D;
  context.clearRect(0, 0, 1024, 256);
  context.font = "600 48px " + style.fontFamily;
  context.textBaseline = "middle";
  const measured = Math.min(960, Math.max(160, Math.ceil(context.measureText(text).width + 48)));
  if (style.textBackground) {
    context.fillStyle = TECHNICAL_CSS_COLORS.labelDarkBackground;
    context.fillRect(16, 32, measured, 160);
  }
  context.fillStyle = TECHNICAL_CSS_COLORS.labelText;
  context.fillText(text, 32, 112);
  const material = new StandardMaterial("measure-dimension-label-material-" + id, scene);
  material.diffuseTexture = texture;
  material.opacityTexture = texture;
  material.emissiveColor = createTechnicalColor3("white");
  material.disableLighting = true;
  material.backFaceCulling = false;
  const label = MeshBuilder.CreatePlane("measure-dimension-label-" + id, { width: 2.4, height: 0.6 }, scene);
  label.billboardMode = Mesh.BILLBOARDMODE_ALL;
  label.isPickable = false;
  label.material = material;
  return { label, texture, material };
};

const createLine = (scene: Scene, id: string, points: Vector3[], color: ReturnType<typeof createTechnicalColor3>, lineWidth: number) => {
  const mesh = MeshBuilder.CreateLines("measure-dimension-line-" + id + "-" + Math.random().toString(36).slice(2), { points }, scene);
  mesh.color = color;
  mesh.alpha = 1;
  mesh.isPickable = false;
  mesh.enableEdgesRendering();
  mesh.edgesWidth = lineWidth;
  return mesh;
};

const arrowPoints = (start: Vector3, end: Vector3, sizeMeters: number, camera: ArcRotateCamera) => {
  const direction = end.subtract(start).normalize();
  const view = camera.getForwardRay(1).direction.normalize();
  let side = Vector3.Cross(direction, view);
  if (side.lengthSquared() < 1e-8) side = Vector3.Cross(direction, Vector3.Up());
  side.normalize();
  const back = end.subtract(direction.scale(sizeMeters));
  return [end, back.add(side.scale(sizeMeters * 0.55)), back.subtract(side.scale(sizeMeters * 0.55)), end];
};

export const createReferenceDimensionSceneManager = ({ scene, camera, getAnnotations, getEntities, getLevels }: { scene: Scene; camera: ArcRotateCamera; getAnnotations: () => readonly AnnotationObject[]; getEntities: () => readonly PlatformEntity[]; getLevels: () => readonly LayoutLevel[]; }) => {
  const nodes = new Map<string, ReferenceDimensionNode>();
  const color = createTechnicalColor3("selectionPrimary");
  const disposeNode = (node: ReferenceDimensionNode) => { node.meshes.forEach((mesh) => mesh.dispose()); node.texture.dispose(); node.material.dispose(); node.label.dispose(); };
  const clear = () => { nodes.forEach(disposeNode); nodes.clear(); };
  const build = () => {
    clear();
    const annotations = getAnnotations();
    const entities = getEntities();
    const levels = getLevels();
    annotations.filter((annotation) => annotation.dimension?.visible !== false).forEach((annotation) => {
      const dimension = annotation.dimension;
      if (!dimension || dimension.style.displayMode === "overlay") return;
      const resolved = resolveDimensionReferences(dimension, entities, levels);
      if (resolved.orphaned || resolved.points.length === 0) return;
      const result = getDimensionResult(annotation, entities, levels);
      const text = formatDimensionText(annotation, entities, levels);
      const labelParts: Vector3[] = [];
      const meshes: LinesMesh[] = [];
      if (dimension.dimensionKind === "angle" && resolved.points.length >= 3) {
        const arc = angleArc(resolved.points[0], resolved.points[1], resolved.points[2]).map(toWorld);
        meshes.push(createLine(scene, annotation.id + "-angle", [toWorld(resolved.points[0]), toWorld(resolved.points[1]), toWorld(resolved.points[2])], color, dimension.style.lineWeightPx));
        meshes.push(createLine(scene, annotation.id + "-arc", arc, color, dimension.style.lineWeightPx));
        labelParts.push(toWorld(resolved.points[1]));
      } else if (dimension.dimensionKind === "area") {
        const polygon = resolved.points.map(toWorld);
        if (polygon.length > 2) meshes.push(createLine(scene, annotation.id + "-area", polygon.concat([polygon[0]]), color, dimension.style.lineWeightPx));
        labelParts.push(polygon.reduce((sum, point) => sum.add(point), Vector3.Zero()).scale(1 / polygon.length));
      } else if (dimension.dimensionKind === "dimensions") {
        const entityRef = dimension.references[0];
        const entity = entityRef && entityRef.type === "entity-anchor" ? entities.find((item) => item.id === entityRef.entityId) : undefined;
        if (entity) dimensionLines(entity).forEach((line, index) => { const points = line.points.map(toWorld); if (points.length > 1) { meshes.push(createLine(scene, annotation.id + "-dim-" + index, points, color, dimension.style.lineWeightPx)); labelParts.push(points[0].add(points[points.length - 1]).scale(0.5)); } });
      } else if (resolved.points.length >= 2) {
        const a = toWorld(resolved.points[0]);
        const b = toWorld(resolved.points[1]);
        const direction = b.subtract(a).normalize();
        let side = Vector3.Cross(direction, camera.getForwardRay(1).direction);
        if (side.lengthSquared() < 1e-8) side = Vector3.Cross(direction, Vector3.Up());
        side.normalize();
        const offset = side.scale(Math.max(0.12, Vector3.Distance(a, b) * 0.08));
        const da = a.add(offset);
        const db = b.add(offset);
        if (dimension.style.showWitnessLines) meshes.push(createLine(scene, annotation.id + "-witness", [a, da, b, db], color, dimension.style.lineWeightPx));
        meshes.push(createLine(scene, annotation.id + "-distance", [da, db], color, dimension.style.lineWeightPx));
        const arrowSize = Math.max(0.03, dimension.style.arrowSizePx * 0.001);
        if (dimension.style.arrowStyle === "arrow") meshes.push(createLine(scene, annotation.id + "-arrow-a", arrowPoints(da, db, arrowSize, camera), color, dimension.style.lineWeightPx), createLine(scene, annotation.id + "-arrow-b", arrowPoints(db, da, arrowSize, camera), color, dimension.style.lineWeightPx));
        else meshes.push(createLine(scene, annotation.id + "-ticks", [da.subtract(side.scale(arrowSize)), da.add(side.scale(arrowSize)), db.subtract(side.scale(arrowSize)), db.add(side.scale(arrowSize))], color, dimension.style.lineWeightPx));
        labelParts.push(da.add(db).scale(0.5));
      }
      const labelPosition = dimension.textPlacementMm ? toWorld(dimension.textPlacementMm) : (labelParts[0] ?? toWorld(resolved.points[0]));
      const labelNode = createTextNode(scene, annotation.id, text, dimension.style);
      nodes.set(annotation.id, { meshes, label: labelNode.label, texture: labelNode.texture, material: labelNode.material, text, style: dimension.style });
      labelNode.label.position.copyFrom(labelPosition);
    });
  };
  const update = () => {
    const entities = getEntities();
    const levels = getLevels();
    nodes.forEach((node, id) => {
      const annotation = getAnnotations().find((item) => item.id === id);
      if (!annotation?.dimension) return;
      const dimension = annotation.dimension;
      const points = resolveDimensionReferences(dimension, entities, levels).points;
      const anchor = dimension.textPlacementMm ? toWorld(dimension.textPlacementMm) : points[0] ? toWorld(points[0]) : Vector3.Zero();
      node.label.position.copyFrom(anchor);
      const distance = safeDistance(camera, anchor);
      const textPx = dimension.style.textSizeMode === "fixed" ? dimension.style.fixedTextPx : Math.min(dimension.style.adaptiveMaxTextPx, Math.max(dimension.style.adaptiveMinTextPx, 12 * Math.sqrt(distance / 12)));
      const worldPerPixel = distance * 0.0012;
      node.label.scaling.x = Math.max(0.12, textPx * worldPerPixel);
      node.label.scaling.y = Math.max(0.04, textPx * worldPerPixel * 0.25);
    });
  };
  return { build, update, dispose: clear };
};
