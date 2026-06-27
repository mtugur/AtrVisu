import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import {
  AbstractMesh,
  ArcRotateCamera,
  Camera,
  Color3,
  DynamicTexture,
  LinesMesh,
  Matrix,
  Mesh,
  MeshBuilder,
  Nullable,
  Observer,
  PointerEventTypes,
  PointerInfo,
  Scene,
  SceneLoader,
  StandardMaterial,
  Texture,
  Vector3
} from "@babylonjs/core";
import "@babylonjs/loaders/glTF";
import type { CollisionCheckResult } from "../types/collision";
import type { CivilReferenceItem } from "../types/civil";
import type { PlacedMachine } from "../types/machine";
import type { OverlaySettings, VisualModelDiagnostics } from "../types/overlays";
import type { ScenePerformanceMetrics } from "../types/performance";
import type { AnnotationObject } from "../types/annotations";
import type { ViewpointCameraState } from "../types/viewpoints";
import { getCollisionEnvelopeForMachine } from "../utils/collision";
import { getCivilReferenceRenderCenterMm, getMachineRenderCenterMm } from "../utils/coordinateReference";
import { getMachineDimensionsMeters } from "../utils/machineDimensions";
import { collectScenePerformanceMetrics } from "../utils/performanceBenchmark";
import { metersToMm, mmToMeters } from "../utils/units";
import { DEFAULT_OVERLAY_SETTINGS } from "../utils/overlaySettings";
import { createBaseVisualDiagnostics } from "../utils/visualDiagnostics";
import { calculateMetadataBoxScale, DEFAULT_VISUAL_MODEL, normalizeVisualModel } from "../utils/visualModel";
import {
  getConnectionPointBoxLocalPositionMeters,
  getConnectionPointDisplayLabel,
  getConnectionPointMarkerLabel,
  getConnectionPointsForObject
} from "../utils/connectionPoints";
import {
  calculateAnnotationDragPosition,
  getAnnotationPickMetadata,
  getAnnotationReadableScale,
  getAnnotationVisualStyle,
  getRayPlanePlanPointMm
} from "../utils/annotations";
import { createBabylonSceneLifecycle } from "./babylonScene/sceneLifecycle";
import { createSceneVisualContext } from "./babylonScene/visualContext";

const CONNECTION_POINT_MARKER_OFFSET_MM = 40;
const CONNECTION_POINT_LABEL_OFFSET_METERS = 0.72;
const ANNOTATION_LABEL_OFFSET_METERS = new Vector3(0.78, 0.42, 0);

type BabylonSceneProps = {
  placedMachines: PlacedMachine[];
  civilReferences: CivilReferenceItem[];
  annotations: AnnotationObject[];
  selectedMachineIds: string[];
  primarySelectedMachineId: string | null;
  selectedCivilReferenceId: string | null;
  selectedCivilReferenceIds: string[];
  selectedAnnotationId: string | null;
  lockedMachineIds?: string[];
  lockedCivilReferenceIds?: string[];
  lockedAnnotationIds?: string[];
  onSelectMachine: (instanceId: string | null, mode?: "replace" | "toggle" | "clear") => void;
  onSelectCivilReference: (id: string | null, mode?: "replace" | "toggle" | "clear") => void;
  onSelectAnnotation: (annotationId: string | null) => void;
  onUpdateMachine: (
    instanceId: string,
    updates: Partial<Pick<PlacedMachine, "position" | "positionMm" | "elevationMm" | "rotationDeg" | "rotationY" | "flowDirection">>
  ) => void;
  onSetMachinePositions: (
    updates: Array<{ instanceId: string; xMm: number; yMm: number }>,
    options?: { recordHistory?: boolean }
  ) => void;
  onSetAnnotationPosition: (
    annotationId: string,
    positionMm: { xMm: number; yMm: number },
    options?: { recordHistory?: boolean }
  ) => void;
  onSetCivilReferencePosition: (
    id: string,
    positionMm: { xMm: number; yMm: number },
    options?: { recordHistory?: boolean }
  ) => void;
  onBeginObjectDrag: () => void;
  isSimulationRunning: boolean;
  simulationSpeed: number;
  overlaySettings: OverlaySettings;
  collisionResult: CollisionCheckResult;
  onVisualDiagnosticsChange: (diagnostics: VisualModelDiagnostics) => void;
  onPerformanceMetricsChange?: (metrics: ScenePerformanceMetrics) => void;
};

export type BabylonSceneHandle = {
  getCameraState: () => ViewpointCameraState | null;
  applyCameraState: (camera: ViewpointCameraState) => void;
};

type PlacedMachineNode = {
  box: Mesh;
  label: Mesh;
  labelTexture: DynamicTexture;
  material: StandardMaterial;
  selectionFrame: LinesMesh;
  flowArrow?: LinesMesh;
  metadataFrame: LinesMesh;
  collisionFrame: LinesMesh;
  clearanceFrame?: LinesMesh;
  connectionPointMarkers: Array<{
    marker: Mesh;
    label: Mesh;
    texture: DynamicTexture;
    material: StandardMaterial;
    labelMaterial: StandardMaterial;
  }>;
  products: Mesh[];
  placeholderMeshes: Mesh[];
  visualRoot?: Mesh;
  loadedVisualMeshes: AbstractMesh[];
};

type AnnotationNode = {
  plane: Mesh;
  hitTarget: Mesh;
  anchor: Mesh;
  texture: DynamicTexture;
  material: StandardMaterial;
  hitMaterial: StandardMaterial;
  anchorMaterial: StandardMaterial;
  handleStem: LinesMesh;
  leader?: LinesMesh;
  sizeScale: number;
};

type CivilReferenceNode = {
  mesh: Mesh;
  material: StandardMaterial;
  selectionFrame: LinesMesh;
  label: Mesh;
  labelTexture: DynamicTexture;
  signature: string;
};

const hexToColor3 = (hex: string) => {
  return Color3.FromHexString(hex);
};

const getCivilColor = (item: CivilReferenceItem) => {
  const colorToken = item.style?.colorToken;
  if (typeof colorToken === "string" && colorToken.startsWith("#")) {
    return Color3.FromHexString(colorToken);
  }

  switch (item.type) {
    case "wall":
      return Color3.FromHexString("#8d98a5");
    case "column":
      return Color3.FromHexString("#b6bdc8");
    case "restricted-area":
      return Color3.FromHexString("#d77957");
    case "walkway":
      return Color3.FromHexString("#d5c25d");
    case "door-opening":
      return Color3.FromHexString("#7ec8de");
    case "floor-area":
      return Color3.FromHexString("#3f6f91");
    case "reference-zone":
    default:
      return Color3.FromHexString("#75b99d");
  }
};

const createLabel = (scene: Scene, textureKey: string, text: string, y: number) => {
  const texture = new DynamicTexture(`label-texture-${textureKey}`, { width: 512, height: 128 }, scene);
  texture.hasAlpha = true;
  texture.drawText(text, null, 78, "bold 42px Arial", "#f8fbf6", "transparent", true, true);

  const material = new StandardMaterial(`label-material-${textureKey}`, scene);
  material.diffuseTexture = texture;
  material.emissiveColor = new Color3(1, 1, 1);
  material.opacityTexture = texture;
  material.disableLighting = true;
  material.backFaceCulling = false;
  if (material.diffuseTexture) {
    material.diffuseTexture.wrapU = Texture.CLAMP_ADDRESSMODE;
    material.diffuseTexture.wrapV = Texture.CLAMP_ADDRESSMODE;
  }

  const label = MeshBuilder.CreatePlane(`label-${textureKey}`, { width: 3.8, height: 0.95 }, scene);
  label.billboardMode = Mesh.BILLBOARDMODE_ALL;
  label.position.y = y;
  label.material = material;
  label.isPickable = false;

  return { label, texture };
};

const normalizeAnnotationText = (text: string) => {
  const normalized = text.trim().replace(/\s+/g, " ") || "Annotation";
  return normalized.length > 44 ? `${normalized.slice(0, 41)}...` : normalized;
};

const wrapAnnotationText = (text: string, maxCharsPerLine: number) => {
  const words = normalizeAnnotationText(text).split(" ");
  const lines: string[] = [];
  let currentLine = "";

  words.forEach((word) => {
    const nextLine = currentLine ? `${currentLine} ${word}` : word;
    if (nextLine.length <= maxCharsPerLine) {
      currentLine = nextLine;
      return;
    }

    if (currentLine) {
      lines.push(currentLine);
    }
    currentLine = word.length > maxCharsPerLine ? `${word.slice(0, maxCharsPerLine - 1)}...` : word;
  });

  if (currentLine) {
    lines.push(currentLine);
  }

  return lines.slice(0, 3);
};

const fillRoundedRect = (
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) => {
  context.beginPath();
  context.moveTo(x + radius, y);
  context.lineTo(x + width - radius, y);
  context.quadraticCurveTo(x + width, y, x + width, y + radius);
  context.lineTo(x + width, y + height - radius);
  context.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  context.lineTo(x + radius, y + height);
  context.quadraticCurveTo(x, y + height, x, y + height - radius);
  context.lineTo(x, y + radius);
  context.quadraticCurveTo(x, y, x + radius, y);
  context.closePath();
};

const createAnnotationNode = (scene: Scene, annotation: AnnotationObject, selected: boolean): AnnotationNode => {
  const visualStyle = getAnnotationVisualStyle(annotation);
  const lines = wrapAnnotationText(annotation.text, visualStyle.maxCharsPerLine);
  const texture = new DynamicTexture(`annotation-texture-${annotation.id}`, { width: 1024, height: 256 }, scene);
  texture.hasAlpha = true;
  const context = texture.getContext() as unknown as CanvasRenderingContext2D;
  context.clearRect(0, 0, 1024, 256);
  context.font = `${visualStyle.fontWeight} ${visualStyle.fontSizePx}px Arial`;
  context.textBaseline = "top";

  const badgeFont = `800 ${Math.max(18, visualStyle.fontSizePx - 12)}px Arial`;
  context.font = badgeFont;
  const badgeWidth = Math.ceil(context.measureText(visualStyle.indicator).width) + 28;
  context.font = `${visualStyle.fontWeight} ${visualStyle.fontSizePx}px Arial`;
  const textWidth = Math.max(...lines.map((line) => context.measureText(line).width), 1);
  const contentWidth = Math.min(900, Math.ceil(visualStyle.paddingPx * 3 + badgeWidth + textWidth));
  const contentHeight = Math.ceil(visualStyle.paddingPx * 2 + lines.length * visualStyle.lineHeightPx);
  const originX = 24;
  const originY = 24;
  const borderColor = selected ? "#ffe58a" : visualStyle.borderColor;
  const textColor = selected ? "#fff2a8" : visualStyle.textColor;
  const backgroundColor = selected ? "rgba(48, 43, 20, 0.94)" : visualStyle.backgroundColor;

  if (visualStyle.filledBackground) {
    fillRoundedRect(context, originX, originY, contentWidth, contentHeight, 22);
    context.fillStyle = backgroundColor;
    context.fill();
  }

  fillRoundedRect(context, originX, originY, contentWidth, contentHeight, 22);
  context.lineWidth = visualStyle.borderWidthPx;
  context.strokeStyle = borderColor;
  context.stroke();

  context.fillStyle = selected ? "#ffe58a" : visualStyle.accentColor;
  context.fillRect(originX, originY + 10, Math.max(6, visualStyle.borderWidthPx + 1), contentHeight - 20);

  context.font = badgeFont;
  context.fillStyle = selected ? "#ffe58a" : visualStyle.accentColor;
  context.fillText(visualStyle.indicator, originX + visualStyle.paddingPx, originY + visualStyle.paddingPx + 3);

  context.font = `${visualStyle.fontWeight} ${visualStyle.fontSizePx}px Arial`;
  context.fillStyle = textColor;
  lines.forEach((line, index) => {
    context.fillText(
      line,
      originX + visualStyle.paddingPx * 2 + badgeWidth,
      originY + visualStyle.paddingPx + index * visualStyle.lineHeightPx
    );
  });
  texture.update();

  const material = new StandardMaterial(`annotation-material-${annotation.id}`, scene);
  material.diffuseTexture = texture;
  material.opacityTexture = texture;
  material.emissiveColor = new Color3(1, 1, 1);
  material.disableLighting = true;
  material.backFaceCulling = false;

  const hitMaterial = new StandardMaterial(`annotation-hit-material-${annotation.id}`, scene);
  hitMaterial.alpha = 0;
  hitMaterial.disableLighting = true;
  hitMaterial.backFaceCulling = false;

  const anchorMaterial = new StandardMaterial(`annotation-anchor-material-${annotation.id}`, scene);
  anchorMaterial.diffuseColor = selected ? new Color3(1, 0.86, 0.28) : visualStyle.accentColor ? Color3.FromHexString(visualStyle.accentColor) : new Color3(0.7, 0.85, 0.76);
  anchorMaterial.emissiveColor = anchorMaterial.diffuseColor.scale(selected ? 0.75 : 0.45);
  anchorMaterial.specularColor = new Color3(0.08, 0.08, 0.08);

  const planeSize = {
    width: Math.max(2.15, contentWidth / 155),
    height: Math.max(0.68, contentHeight / 155)
  };
  const plane = MeshBuilder.CreatePlane(
    `annotation-${annotation.id}`,
    planeSize,
    scene
  );
  plane.billboardMode = Mesh.BILLBOARDMODE_ALL;
  plane.material = material;
  plane.isPickable = true;
  plane.renderingGroupId = 2;
  plane.metadata = getAnnotationPickMetadata(annotation.id, "label");

  const hitTarget = MeshBuilder.CreatePlane(
    `annotation-hit-${annotation.id}`,
    { width: planeSize.width * 1.08, height: planeSize.height * 1.18 },
    scene
  );
  hitTarget.billboardMode = Mesh.BILLBOARDMODE_ALL;
  hitTarget.material = hitMaterial;
  hitTarget.isPickable = true;
  hitTarget.renderingGroupId = 3;
  hitTarget.metadata = getAnnotationPickMetadata(annotation.id, "hit-target");

  const anchor = MeshBuilder.CreateBox(
    `annotation-anchor-${annotation.id}`,
    {
      width: selected ? 0.58 : 0.46,
      height: 0.08,
      depth: selected ? 0.58 : 0.46
    },
    scene
  );
  anchor.material = anchorMaterial;
  anchor.isPickable = true;
  anchor.renderingGroupId = 2;
  anchor.rotation.y = Math.PI / 4;
  anchor.metadata = getAnnotationPickMetadata(annotation.id, "handle");

  const handleStem = MeshBuilder.CreateLines(
    `annotation-handle-stem-${annotation.id}`,
    { points: [Vector3.Zero(), Vector3.Zero()] },
    scene
  );
  handleStem.color = selected ? new Color3(1, 0.86, 0.28) : Color3.FromHexString(visualStyle.accentColor);
  handleStem.isPickable = false;
  handleStem.renderingGroupId = 2;

  return { plane, hitTarget, anchor, texture, material, hitMaterial, anchorMaterial, handleStem, sizeScale: visualStyle.sizeScale };
};

const disposeAnnotationNode = (node: AnnotationNode) => {
  node.leader?.dispose();
  node.handleStem.dispose();
  node.texture.dispose();
  node.material.dispose();
  node.hitMaterial.dispose();
  node.anchorMaterial.dispose();
  node.plane.dispose();
  node.hitTarget.dispose();
  node.anchor.dispose();
};

const connectionPointColor = (type: string) => {
  switch (type) {
    case "product-in":
      return new Color3(0.45, 0.82, 1);
    case "product-out":
      return new Color3(0.7, 1, 0.48);
    case "electrical":
      return new Color3(1, 0.82, 0.2);
    case "pneumatic":
    case "compressed-air":
      return new Color3(0.55, 0.72, 1);
    case "network":
      return new Color3(0.75, 0.55, 1);
    case "aspiration":
    case "dust-collection":
      return new Color3(0.95, 0.62, 0.42);
    default:
      return new Color3(0.92, 0.92, 0.92);
  }
};

const createConnectionPointMarker = (
  scene: Scene,
  machine: PlacedMachine,
  pointIndex: number
) => {
  const point = getConnectionPointsForObject(machine)[pointIndex];
  const markerMaterial = new StandardMaterial(`connection-point-material-${machine.instanceId}-${point.id}`, scene);
  markerMaterial.diffuseColor = connectionPointColor(point.type);
  markerMaterial.emissiveColor = markerMaterial.diffuseColor.scale(0.48);
  markerMaterial.specularColor = new Color3(0.08, 0.1, 0.1);

  const marker = MeshBuilder.CreateSphere(
    `connection-point-${machine.instanceId}-${point.id}`,
    { diameter: 0.18, segments: 12 },
    scene
  );
  marker.material = markerMaterial;
  marker.isPickable = false;
  marker.renderingGroupId = 2;
  marker.metadata = {
    instanceId: machine.instanceId,
    connectionPointId: point.id,
    connectionPointLabel: getConnectionPointDisplayLabel(point)
  };

  const texture = new DynamicTexture(
    `connection-point-texture-${machine.instanceId}-${point.id}`,
    { width: 768, height: 144 },
    scene
  );
  texture.hasAlpha = true;
  const markerText = getConnectionPointMarkerLabel(point);
  const trimmedText = markerText.length > 28 ? `${markerText.slice(0, 25)}...` : markerText;
  texture.drawText(trimmedText, null, 86, "bold 42px Arial", "#f8fbf6", "transparent", true, true);
  const labelMaterial = new StandardMaterial(`connection-point-label-material-${machine.instanceId}-${point.id}`, scene);
  labelMaterial.diffuseTexture = texture;
  labelMaterial.opacityTexture = texture;
  labelMaterial.emissiveColor = new Color3(1, 1, 1);
  labelMaterial.disableLighting = true;
  labelMaterial.backFaceCulling = false;
  const label = MeshBuilder.CreatePlane(
    `connection-point-label-${machine.instanceId}-${point.id}`,
    { width: 2.4, height: 0.45 },
    scene
  );
  label.billboardMode = Mesh.BILLBOARDMODE_ALL;
  label.material = labelMaterial;
  label.isPickable = false;
  label.renderingGroupId = 2;

  return { marker, label, texture, material: markerMaterial, labelMaterial };
};

const positionConnectionPointMarker = (
  markerSet: ReturnType<typeof createConnectionPointMarker>,
  machine: PlacedMachine,
  pointIndex: number
) => {
  const point = getConnectionPointsForObject(machine)[pointIndex];
  if (!point) {
    return;
  }

  const localPosition = getConnectionPointBoxLocalPositionMeters(machine, point, CONNECTION_POINT_MARKER_OFFSET_MM);
  markerSet.marker.position.x = localPosition.x;
  markerSet.marker.position.y = localPosition.y;
  markerSet.marker.position.z = localPosition.z;
  markerSet.label.position.x = markerSet.marker.position.x + 0.14;
  markerSet.label.position.y = markerSet.marker.position.y + CONNECTION_POINT_LABEL_OFFSET_METERS;
  markerSet.label.position.z = markerSet.marker.position.z + 0.14;
};

const shouldShowConnectionPointMarker = (
  isSelected: boolean,
  overlaySettings: OverlaySettings
) => overlaySettings.showConnectionPoints && (isSelected || overlaySettings.connectionPointDisplayMode === "all");

const shouldShowConnectionPointLabel = (
  isSelected: boolean,
  overlaySettings: OverlaySettings
) => overlaySettings.showConnectionPoints && (isSelected || (overlaySettings.connectionPointDisplayMode === "all" && overlaySettings.showLabels));

const createSelectionFrame = (scene: Scene, machine: PlacedMachine) => {
  const { width, depth, height } = getMachineDimensionsMeters(machine.definition);
  const yMin = -height / 2 - 0.02;
  const yMax = height / 2 + 0.02;
  const xMin = -width / 2;
  const xMax = width / 2;
  const zMin = -depth / 2;
  const zMax = depth / 2;
  const corners = {
    topA: new Vector3(xMin, yMax, zMin),
    topB: new Vector3(xMax, yMax, zMin),
    topC: new Vector3(xMax, yMax, zMax),
    topD: new Vector3(xMin, yMax, zMax),
    bottomA: new Vector3(xMin, yMin, zMin),
    bottomB: new Vector3(xMax, yMin, zMin),
    bottomC: new Vector3(xMax, yMin, zMax),
    bottomD: new Vector3(xMin, yMin, zMax)
  };

  const frame = MeshBuilder.CreateLineSystem(
    `selection-frame-${machine.instanceId}`,
    {
      lines: [
        [corners.topA, corners.topB, corners.topC, corners.topD, corners.topA],
        [corners.bottomA, corners.bottomB, corners.bottomC, corners.bottomD, corners.bottomA],
        [corners.topA, corners.bottomA],
        [corners.topB, corners.bottomB],
        [corners.topC, corners.bottomC],
        [corners.topD, corners.bottomD]
      ]
    },
    scene
  );
  frame.color = new Color3(1, 0.93, 0.38);
  frame.isPickable = false;
  frame.isVisible = false;

  return frame;
};

const createWireBoxFrame = (
  scene: Scene,
  name: string,
  size: { width: number; depth: number; height: number },
  color: Color3
) => {
  const yMin = -size.height / 2;
  const yMax = size.height / 2;
  const xMin = -size.width / 2;
  const xMax = size.width / 2;
  const zMin = -size.depth / 2;
  const zMax = size.depth / 2;
  const corners = {
    topA: new Vector3(xMin, yMax, zMin),
    topB: new Vector3(xMax, yMax, zMin),
    topC: new Vector3(xMax, yMax, zMax),
    topD: new Vector3(xMin, yMax, zMax),
    bottomA: new Vector3(xMin, yMin, zMin),
    bottomB: new Vector3(xMax, yMin, zMin),
    bottomC: new Vector3(xMax, yMin, zMax),
    bottomD: new Vector3(xMin, yMin, zMax)
  };
  const frame = MeshBuilder.CreateLineSystem(
    name,
    {
      lines: [
        [corners.topA, corners.topB, corners.topC, corners.topD, corners.topA],
        [corners.bottomA, corners.bottomB, corners.bottomC, corners.bottomD, corners.bottomA],
        [corners.topA, corners.bottomA],
        [corners.topB, corners.bottomB],
        [corners.topC, corners.bottomC],
        [corners.topD, corners.bottomD]
      ]
    },
    scene
  );
  frame.color = color;
  frame.isPickable = false;
  frame.isVisible = false;
  return frame;
};

const createMetadataFrame = (scene: Scene, machine: PlacedMachine) => {
  return createWireBoxFrame(
    scene,
    `metadata-frame-${machine.instanceId}`,
    getMachineDimensionsMeters(machine.definition),
    new Color3(0.25, 0.78, 1)
  );
};

const createCivilReferenceNode = (scene: Scene, item: CivilReferenceItem): CivilReferenceNode => {
  const width = mmToMeters(item.sizeMm.widthMm);
  const depth = mmToMeters(item.sizeMm.depthMm);
  const height = mmToMeters(item.sizeMm.heightMm ?? 20);
  const material = new StandardMaterial(`civil-reference-material-${item.id}`, scene);
  const color = getCivilColor(item);
  material.diffuseColor = color;
  material.emissiveColor = color.scale(0.18);
  material.specularColor = new Color3(0.08, 0.09, 0.1);
  material.alpha = item.style?.opacity ?? 0.45;

  const mesh = MeshBuilder.CreateBox(
    `civil-reference-${item.id}`,
    { width, depth, height },
    scene
  );
  mesh.material = material;
  mesh.metadata = { civilReferenceId: item.id };
  mesh.isPickable = true;
  mesh.renderingGroupId = item.type === "wall" || item.type === "column" ? 0 : 1;

  const selectionFrame = createWireBoxFrame(
    scene,
    `civil-selection-frame-${item.id}`,
    { width, depth, height: Math.max(height, 0.08) },
    new Color3(1, 0.86, 0.28)
  );
  selectionFrame.parent = mesh;
  selectionFrame.isVisible = false;

  const { label, texture } = createLabel(scene, `civil-${item.id}`, item.name, height + 0.35);
  label.isPickable = false;
  label.renderingGroupId = 2;

  return { mesh, material, selectionFrame, label, labelTexture: texture, signature: getCivilReferenceNodeSignature(item) };
};

const getCivilReferenceNodeSignature = (item: CivilReferenceItem) =>
  `${item.type}|${item.sizeMm.widthMm}|${item.sizeMm.depthMm}|${item.sizeMm.heightMm ?? 20}`;

const disposeCivilReferenceNode = (node: CivilReferenceNode) => {
  node.labelTexture.dispose();
  node.material.dispose();
  node.selectionFrame.dispose();
  node.label.dispose();
  node.mesh.dispose();
};

const positionCivilReferenceNode = (
  node: CivilReferenceNode,
  item: CivilReferenceItem,
  selectedCivilReferenceId: string | null,
  showLabels: boolean
) => {
  const height = mmToMeters(item.sizeMm.heightMm ?? 20);
  const center = getCivilReferenceRenderCenterMm(item);
  node.mesh.position = new Vector3(
    mmToMeters(center.xMm),
    mmToMeters(item.positionMm.zMm ?? 0) + height / 2,
    mmToMeters(center.yMm)
  );
  node.mesh.rotation.y = radiansFromDegrees(item.rotationDeg);
  node.selectionFrame.isVisible = selectedCivilReferenceId === item.id;
  node.label.position = new Vector3(
    node.mesh.position.x,
    mmToMeters(item.positionMm.zMm ?? 0) + height + 0.35,
    node.mesh.position.z
  );
  node.label.isVisible = showLabels;
};

const createClearanceFrame = (scene: Scene, machine: PlacedMachine) => {
  const clearance = machine.definition.clearance;
  if (!clearance) {
    return undefined;
  }

  const dimensions = getMachineDimensionsMeters(machine.definition);
  const width = dimensions.width + Math.max(0, clearance.left) + Math.max(0, clearance.right);
  const depth = dimensions.depth + Math.max(0, clearance.front) + Math.max(0, clearance.back);
  if (width <= dimensions.width && depth <= dimensions.depth) {
    return undefined;
  }

  return createWireBoxFrame(
    scene,
    `clearance-frame-${machine.instanceId}`,
    { width, depth, height: dimensions.height },
    new Color3(1, 0.56, 0.22)
  );
};

const createCollisionFrame = (scene: Scene, machine: PlacedMachine) => {
  const dimensions = getMachineDimensionsMeters(machine.definition);
  const envelope = getCollisionEnvelopeForMachine(machine);
  const offset = envelope.offsetMm ?? { xMm: 0, yMm: 0, zMm: 0 };
  const frame = createWireBoxFrame(
    scene,
    `collision-frame-${machine.instanceId}`,
    {
      width: mmToMeters(envelope.widthMm),
      depth: mmToMeters(envelope.depthMm),
      height: mmToMeters(envelope.heightMm)
    },
    new Color3(0.35, 0.72, 1)
  );
  frame.position.x = mmToMeters(offset.xMm);
  frame.position.y = mmToMeters(offset.yMm) + mmToMeters(envelope.heightMm) / 2 - dimensions.height / 2;
  frame.position.z = mmToMeters(offset.zMm);
  return frame;
};

const hasFlowDirection = (machine: PlacedMachine) => {
  return machine.definition.capabilities?.hasFlowDirection || machine.definition.category === "Conveyor";
};

const createFlowArrow = (scene: Scene, machine: PlacedMachine) => {
  const { width, depth, height } = getMachineDimensionsMeters(machine.definition);
  const arrowY = height / 2 + 0.12;
  const startX = -width * 0.34;
  const endX = width * 0.34;
  const headX = width * 0.2;
  const headZ = Math.min(0.28, depth * 0.28);

  const arrow = MeshBuilder.CreateLineSystem(
    `flow-arrow-${machine.instanceId}`,
    {
      lines: [
        [new Vector3(startX, arrowY, 0), new Vector3(endX, arrowY, 0)],
        [new Vector3(endX, arrowY, 0), new Vector3(headX, arrowY, headZ)],
        [new Vector3(endX, arrowY, 0), new Vector3(headX, arrowY, -headZ)]
      ]
    },
    scene
  );
  arrow.color = new Color3(0.98, 0.98, 0.72);
  arrow.isPickable = false;

  return arrow;
};

const createProductMeshes = (scene: Scene, machine: PlacedMachine) => {
  const material = new StandardMaterial(`product-material-${machine.instanceId}`, scene);
  material.diffuseColor = new Color3(0.96, 0.82, 0.38);
  material.emissiveColor = new Color3(0.08, 0.05, 0.01);
  material.specularColor = new Color3(0.12, 0.1, 0.05);

  return Array.from({ length: 3 }, (_, index) => {
    const product = MeshBuilder.CreateBox(
      `product-${machine.instanceId}-${index}`,
      { width: 0.38, height: 0.24, depth: 0.32 },
      scene
    );
    product.material = material;
    product.isPickable = false;
    product.isVisible = false;
    return product;
  });
};

const setMachinePickMetadata = (mesh: Mesh, instanceId: string) => {
  mesh.metadata = { ...(mesh.metadata ?? {}), instanceId };
  mesh.isPickable = true;
};

const addBoxPart = (
  scene: Scene,
  parent: Mesh,
  name: string,
  size: { width: number; depth: number; height: number },
  position: Vector3,
  material: StandardMaterial
) => {
  const mesh = MeshBuilder.CreateBox(name, size, scene);
  mesh.parent = parent;
  mesh.position = position;
  mesh.material = material;
  setMachinePickMetadata(mesh, parent.metadata.instanceId);
  return mesh;
};

const addCylinderPart = (
  scene: Scene,
  parent: Mesh,
  name: string,
  size: { diameter: number; height: number },
  position: Vector3,
  material: StandardMaterial,
  rotation = Vector3.Zero()
) => {
  const mesh = MeshBuilder.CreateCylinder(name, { diameter: size.diameter, height: size.height, tessellation: 24 }, scene);
  mesh.parent = parent;
  mesh.position = position;
  mesh.rotation = rotation;
  mesh.material = material;
  setMachinePickMetadata(mesh, parent.metadata.instanceId);
  return mesh;
};

const createPlaceholderMeshes = (scene: Scene, machine: PlacedMachine, rootBox: Mesh, material: StandardMaterial) => {
  const { width, depth, height } = getMachineDimensionsMeters(machine.definition);
  const type = machine.definition.placeholderVisualType ?? "box-generic";
  const id = machine.instanceId;
  const parts: Mesh[] = [];
  const box = (suffix: string, w: number, d: number, h: number, x = 0, y = 0, z = 0) => {
    parts.push(addBoxPart(scene, rootBox, `placeholder-${suffix}-${id}`, { width: w, depth: d, height: h }, new Vector3(x, y, z), material));
  };
  const cylinder = (suffix: string, diameter: number, h: number, x = 0, y = 0, z = 0, rotation = Vector3.Zero()) => {
    parts.push(addCylinderPart(scene, rootBox, `placeholder-${suffix}-${id}`, { diameter, height: h }, new Vector3(x, y, z), material, rotation));
  };

  switch (type) {
    case "conveyor-belt":
      box("conveyor-body", width, depth, Math.max(0.16, height * 0.35), 0, 0, 0);
      box("conveyor-belt", width * 0.92, depth * 0.72, 0.035, 0, height * 0.2, 0);
      break;
    case "conveyor-roller":
      box("roller-frame", width, depth, Math.max(0.14, height * 0.28), 0, 0, 0);
      for (let i = -2; i <= 2; i += 1) {
        cylinder("roller", Math.max(0.08, depth * 0.08), depth * 0.82, (i * width) / 6, height * 0.2, 0, new Vector3(Math.PI / 2, 0, 0));
      }
      break;
    case "elevator-vertical":
      box("elevator-tower", width * 0.45, depth * 0.55, height, 0, 0, 0);
      box("elevator-head", width * 0.75, depth * 0.75, height * 0.12, 0, height * 0.44, 0);
      break;
    case "elevator-inclined":
      box("inclined-base", width, depth * 0.55, height * 0.18, 0, -height * 0.3, 0);
      box("inclined-run", width * 0.92, depth * 0.42, height * 0.18, 0, 0, 0);
      parts[parts.length - 1].rotation.z = -Math.PI / 10;
      break;
    case "silo-cylinder":
      cylinder("silo", Math.min(width, depth), height * 0.88, 0, 0, 0);
      cylinder("silo-cone", Math.min(width, depth) * 0.82, height * 0.18, 0, -height * 0.46, 0);
      break;
    case "tank-cylinder":
      cylinder("tank", Math.min(depth, height), width * 0.88, 0, 0, 0, new Vector3(0, 0, Math.PI / 2));
      break;
    case "hopper":
      box("hopper-top", width, depth, height * 0.42, 0, height * 0.12, 0);
      box("hopper-bottom", width * 0.5, depth * 0.5, height * 0.36, 0, -height * 0.28, 0);
      break;
    case "forklift-proxy":
      box("forklift-body", width * 0.62, depth * 0.72, height * 0.42, -width * 0.08, -height * 0.12, 0);
      box("forklift-mast", width * 0.08, depth * 0.72, height * 0.85, width * 0.28, height * 0.08, 0);
      box("forklift-fork-a", width * 0.42, depth * 0.08, height * 0.04, width * 0.38, -height * 0.34, -depth * 0.18);
      box("forklift-fork-b", width * 0.42, depth * 0.08, height * 0.04, width * 0.38, -height * 0.34, depth * 0.18);
      break;
    case "pallet-proxy":
      box("pallet-deck", width, depth, height * 0.35, 0, height * 0.12, 0);
      box("pallet-runner-a", width, depth * 0.12, height * 0.28, 0, -height * 0.22, -depth * 0.32);
      box("pallet-runner-b", width, depth * 0.12, height * 0.28, 0, -height * 0.22, depth * 0.32);
      break;
    case "robot-cell":
      cylinder("robot-base", Math.min(width, depth) * 0.28, height * 0.18, 0, -height * 0.35, 0);
      box("robot-column", width * 0.16, depth * 0.16, height * 0.55, 0, -height * 0.02, 0);
      box("robot-arm", width * 0.62, depth * 0.14, height * 0.12, width * 0.16, height * 0.24, 0);
      break;
    case "wrapper-proxy":
      cylinder("wrapper-table", Math.min(width, depth) * 0.65, height * 0.16, 0, -height * 0.36, 0);
      box("wrapper-post", width * 0.12, depth * 0.12, height, width * 0.32, 0, 0);
      break;
    case "safety-fence":
      box("fence-panel", width, Math.max(0.04, depth * 0.25), height * 0.72, 0, 0, 0);
      box("fence-post-a", width * 0.04, depth, height, -width * 0.48, 0, 0);
      box("fence-post-b", width * 0.04, depth, height, width * 0.48, 0, 0);
      break;
    case "building-column":
      box("column", width, depth, height, 0, 0, 0);
      break;
    case "building-wall":
      box("wall", width, Math.max(0.06, depth), height, 0, 0, 0);
      break;
    case "platform":
      box("platform-deck", width, depth, height * 0.16, 0, height * 0.36, 0);
      box("platform-base", width * 0.12, depth * 0.12, height * 0.72, -width * 0.4, 0, -depth * 0.4);
      box("platform-base", width * 0.12, depth * 0.12, height * 0.72, width * 0.4, 0, depth * 0.4);
      break;
    case "electrical-panel":
      box("panel", width, Math.max(0.08, depth * 0.35), height, 0, 0, 0);
      box("panel-door", width * 0.78, Math.max(0.02, depth * 0.08), height * 0.72, 0, 0, -depth * 0.22);
      break;
    case "box-generic":
    default:
      box("generic", width, depth, height, 0, 0, 0);
      break;
  }

  return parts;
};

const radiansFromDegrees = (degrees: number) => (degrees * Math.PI) / 180;

const splitModelPath = (modelPath: string) => {
  const slashIndex = modelPath.lastIndexOf("/");
  if (slashIndex < 0) {
    return { rootUrl: "", fileName: modelPath };
  }

  return {
    rootUrl: `${modelPath.slice(0, slashIndex + 1)}`,
    fileName: modelPath.slice(slashIndex + 1)
  };
};

const applyMetadataToHierarchy = (mesh: AbstractMesh, instanceId: string) => {
  mesh.metadata = { ...(mesh.metadata ?? {}), instanceId };
  mesh.isPickable = true;
  mesh.getChildMeshes(false).forEach((child) => {
    child.metadata = { ...(child.metadata ?? {}), instanceId };
    child.isPickable = true;
  });
};

const loadVisualModel = async (
  scene: Scene,
  machine: PlacedMachine,
  rootBox: Mesh,
  placeholderMaterial: StandardMaterial
) => {
  const visualModel = normalizeVisualModel(machine.definition.visualModel, machine.definition.modelPath);
  const modelPath = visualModel.modelPath?.trim();
  if (!modelPath) {
    return null;
  }

  try {
    const { rootUrl, fileName } = splitModelPath(modelPath);
    const result = await SceneLoader.ImportMeshAsync("", rootUrl, fileName, scene);
    const visualRoot = new Mesh(`visual-root-${machine.instanceId}`, scene);
    visualRoot.metadata = { instanceId: machine.instanceId };
    visualRoot.isPickable = false;

    result.meshes.forEach((mesh) => {
      if (mesh !== visualRoot) {
        mesh.parent = visualRoot;
        applyMetadataToHierarchy(mesh, machine.instanceId);
      }
    });

    const dimensions = getMachineDimensionsMeters(machine.definition);
    const bounds = visualRoot.getHierarchyBoundingVectors(true);
    const size = bounds.max.subtract(bounds.min);
    const center = bounds.min.add(size.scale(0.5));
    const calibration = visualModel.calibration;
    let appliedScale = { x: 1, y: 1, z: 1 };

    // metadata-box intentionally uses non-uniform visual scaling so engineering metadata remains authoritative.
    // When preserveAspectRatio is true, uniform scaling uses the limiting dimension to keep the model inside metadata bounds.
    if (visualModel.scaleMode === "metadata-box") {
      appliedScale = calculateMetadataBoxScale(
        dimensions,
        { width: size.x, depth: size.z, height: size.y },
        calibration.preserveAspectRatio
      );
      visualRoot.scaling = new Vector3(appliedScale.x, appliedScale.y, appliedScale.z);
    } else if (visualModel.unit === "mm") {
      const unitScale = mmToMeters(1);
      appliedScale = { x: unitScale, y: unitScale, z: unitScale };
      visualRoot.scaling = new Vector3(unitScale, unitScale, unitScale);
    } else {
      appliedScale = { x: visualRoot.scaling.x, y: visualRoot.scaling.y, z: visualRoot.scaling.z };
    }

    visualRoot.parent = rootBox;
    const calibratedX = calibration.centerOnFootprint ? -center.x * visualRoot.scaling.x : 0;
    const calibratedZ = calibration.centerOnFootprint ? -center.z * visualRoot.scaling.z : 0;
    const calibratedY = calibration.bottomOnFloor
      ? -dimensions.height / 2 - bounds.min.y * visualRoot.scaling.y
      : 0;
    visualRoot.position = new Vector3(
      calibratedX + mmToMeters(visualModel.positionOffsetMm.xMm),
      calibratedY + mmToMeters(visualModel.positionOffsetMm.yMm),
      calibratedZ + mmToMeters(visualModel.positionOffsetMm.zMm)
    );
    visualRoot.rotation = new Vector3(
      radiansFromDegrees(visualModel.rotationOffsetDeg.x),
      radiansFromDegrees(visualModel.rotationOffsetDeg.y),
      radiansFromDegrees(visualModel.rotationOffsetDeg.z)
    );

    placeholderMaterial.alpha = 0.98;

    const scaledBoundsMm = {
      widthMm: metersToMm(size.x * visualRoot.scaling.x),
      heightMm: metersToMm(size.y * visualRoot.scaling.y),
      depthMm: metersToMm(size.z * visualRoot.scaling.z)
    };
    const bottomLocal = bounds.min.y * visualRoot.scaling.y + visualRoot.position.y;
    const floorLocal = -dimensions.height / 2;
    const bottomDeltaMm = metersToMm(bottomLocal - floorLocal);
    const calibrationWarnings: string[] = [];
    if (calibration.bottomOnFloor && bottomDeltaMm < -1) {
      calibrationWarnings.push("Visual model appears below the floor after calibration.");
    }
    if (calibration.bottomOnFloor && bottomDeltaMm > 20) {
      calibrationWarnings.push("Visual model appears above the floor after calibration.");
    }

    return {
      visualRoot,
      loadedVisualMeshes: result.meshes,
      visualBoundsMm: scaledBoundsMm,
      appliedScale,
      calibrationWarnings
    };
  } catch (error) {
    console.warn(
      `[AtrVisu visual model] Could not load "${modelPath}" for "${machine.definition.name}". Placeholder box was used.`,
      error
    );
    return {
      failed: true,
      fallbackReason: error instanceof Error ? error.message : "Visual model failed to load."
    };
  }
};

export const BabylonScene = forwardRef<BabylonSceneHandle, BabylonSceneProps>(function BabylonScene({
  placedMachines,
  civilReferences,
  annotations,
  selectedMachineIds,
  primarySelectedMachineId,
  selectedCivilReferenceId,
  selectedCivilReferenceIds,
  selectedAnnotationId,
  lockedMachineIds = [],
  lockedCivilReferenceIds = [],
  lockedAnnotationIds = [],
  onSelectMachine,
  onSelectCivilReference,
  onSelectAnnotation,
  onUpdateMachine,
  onSetMachinePositions,
  onSetAnnotationPosition,
  onSetCivilReferencePosition,
  onBeginObjectDrag,
  isSimulationRunning,
  simulationSpeed,
  overlaySettings,
  collisionResult,
  onVisualDiagnosticsChange,
  onPerformanceMetricsChange
}: BabylonSceneProps, ref) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const sceneRef = useRef<Scene | null>(null);
  const cameraRef = useRef<ArcRotateCamera | null>(null);
  const floorRef = useRef<Mesh | null>(null);
  const machineNodesRef = useRef<Map<string, PlacedMachineNode>>(new Map());
  const civilReferenceNodesRef = useRef<Map<string, CivilReferenceNode>>(new Map());
  const annotationNodesRef = useRef<Map<string, AnnotationNode>>(new Map());
  const placedMachinesRef = useRef<PlacedMachine[]>(placedMachines);
  const civilReferencesRef = useRef<CivilReferenceItem[]>(civilReferences);
  const annotationsRef = useRef<AnnotationObject[]>(annotations);
  const selectedMachineIdsRef = useRef<string[]>(selectedMachineIds);
  const selectedCivilReferenceIdRef = useRef<string | null>(selectedCivilReferenceId);
  const selectedCivilReferenceIdsRef = useRef<string[]>(selectedCivilReferenceIds);
  const lockedMachineIdsRef = useRef<string[]>(lockedMachineIds);
  const lockedCivilReferenceIdsRef = useRef<string[]>(lockedCivilReferenceIds);
  const lockedAnnotationIdsRef = useRef<string[]>(lockedAnnotationIds);
  const primarySelectedMachineIdRef = useRef<string | null>(primarySelectedMachineId);
  const isSimulationRunningRef = useRef(isSimulationRunning);
  const simulationSpeedRef = useRef(simulationSpeed);
  const overlaySettingsRef = useRef<OverlaySettings>(overlaySettings);
  const collisionResultRef = useRef<CollisionCheckResult>(collisionResult);
  const onPerformanceMetricsChangeRef = useRef(onPerformanceMetricsChange);
  const productPhaseRef = useRef<Map<string, number>>(new Map());
  const dragStateRef = useRef<{
    instanceIds: string[];
    startFloorX: number;
    startFloorZ: number;
    startPositions: Record<string, { xMm: number; yMm: number }>;
  } | null>(null);
  const civilDragStateRef = useRef<{
    id: string;
    startFloorX: number;
    startFloorZ: number;
    startPosition: { xMm: number; yMm: number };
  } | null>(null);
  const annotationDragStateRef = useRef<{
    annotationId: string;
    planeElevationMeters: number;
    initialPointerPosition: { xMm: number; yMm: number };
    initialAnnotationPosition: { xMm: number; yMm: number };
  } | null>(null);
  const panStateRef = useRef<{
    lastFloorPoint: Vector3;
  } | null>(null);

  useEffect(() => {
    placedMachinesRef.current = placedMachines;
  }, [placedMachines]);

  useEffect(() => {
    civilReferencesRef.current = civilReferences;
  }, [civilReferences]);

  useEffect(() => {
    annotationsRef.current = annotations;
  }, [annotations]);

  useEffect(() => {
    selectedMachineIdsRef.current = selectedMachineIds;
    primarySelectedMachineIdRef.current = primarySelectedMachineId;
    machineNodesRef.current.forEach((node, instanceId) => {
      const isSelected = selectedMachineIds.includes(instanceId);
      const isPrimary = instanceId === primarySelectedMachineId;
      const isColliding = collisionResultRef.current.collidingObjectIds.includes(instanceId);
      node.selectionFrame.isVisible = isSelected && overlaySettingsRef.current.showSelectionBox;
      node.selectionFrame.color = isPrimary ? new Color3(1, 0.86, 0.28) : new Color3(0.37, 0.78, 1);
      node.metadataFrame.isVisible = isSelected && overlaySettingsRef.current.showMetadataBox;
      node.collisionFrame.isVisible = overlaySettingsRef.current.showCollisionEnvelope;
      node.collisionFrame.color = isColliding ? new Color3(1, 0.22, 0.16) : new Color3(0.35, 0.72, 1);
      if (node.clearanceFrame) {
        node.clearanceFrame.isVisible = isSelected && overlaySettingsRef.current.showClearanceEnvelope;
      }
      node.connectionPointMarkers.forEach((markerSet) => {
        markerSet.marker.isVisible = shouldShowConnectionPointMarker(isSelected, overlaySettingsRef.current);
        markerSet.label.isVisible = shouldShowConnectionPointLabel(isSelected, overlaySettingsRef.current);
      });
      node.material.emissiveColor = isSelected
        ? isColliding
          ? new Color3(0.42, 0.08, 0.04)
          : new Color3(0.24, 0.2, 0.05)
        : isColliding
          ? new Color3(0.18, 0.03, 0.02)
          : Color3.Black();
    });
  }, [primarySelectedMachineId, selectedMachineIds]);

  useEffect(() => {
    selectedCivilReferenceIdRef.current = selectedCivilReferenceId;
    selectedCivilReferenceIdsRef.current = selectedCivilReferenceIds;
    civilReferenceNodesRef.current.forEach((node, id) => {
      const isSelected = selectedCivilReferenceIds.includes(id);
      node.selectionFrame.isVisible = isSelected;
      node.material.emissiveColor = isSelected
        ? new Color3(0.28, 0.22, 0.06)
        : getCivilColor(civilReferencesRef.current.find((item) => item.id === id) ?? {
            id,
            type: "reference-zone",
            name: "",
            positionMm: { xMm: 0, yMm: 0 },
            sizeMm: { widthMm: 1, depthMm: 1 },
            rotationDeg: 0,
            createdAt: "",
            updatedAt: ""
          }).scale(0.18);
    });
  }, [selectedCivilReferenceId, selectedCivilReferenceIds]);

  useEffect(() => {
    lockedMachineIdsRef.current = lockedMachineIds;
  }, [lockedMachineIds]);

  useEffect(() => {
    lockedCivilReferenceIdsRef.current = lockedCivilReferenceIds;
  }, [lockedCivilReferenceIds]);

  useEffect(() => {
    lockedAnnotationIdsRef.current = lockedAnnotationIds;
  }, [lockedAnnotationIds]);

  useEffect(() => {
    overlaySettingsRef.current = overlaySettings;
    machineNodesRef.current.forEach((node, instanceId) => {
      const isSelected = selectedMachineIdsRef.current.includes(instanceId);
      node.label.isVisible = overlaySettings.showLabels;
      node.selectionFrame.isVisible = isSelected && overlaySettings.showSelectionBox;
      node.metadataFrame.isVisible = isSelected && overlaySettings.showMetadataBox;
      node.collisionFrame.isVisible = overlaySettings.showCollisionEnvelope;
      if (node.clearanceFrame) {
        node.clearanceFrame.isVisible = isSelected && overlaySettings.showClearanceEnvelope;
      }
      node.connectionPointMarkers.forEach((markerSet) => {
        markerSet.marker.isVisible = shouldShowConnectionPointMarker(isSelected, overlaySettings);
        markerSet.label.isVisible = shouldShowConnectionPointLabel(isSelected, overlaySettings);
      });
    });
    civilReferenceNodesRef.current.forEach((node) => {
      node.label.isVisible = overlaySettings.showLabels;
    });
  }, [overlaySettings]);

  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) {
      return;
    }

    const activeCivilIds = new Set(civilReferences.map((item) => item.id));
    civilReferenceNodesRef.current.forEach((node, id) => {
      if (!activeCivilIds.has(id)) {
        disposeCivilReferenceNode(node);
        civilReferenceNodesRef.current.delete(id);
      }
    });

    civilReferences.forEach((item) => {
      const existing = civilReferenceNodesRef.current.get(item.id);
      if (existing && existing.signature === getCivilReferenceNodeSignature(item)) {
        existing.material.diffuseColor = getCivilColor(item);
        existing.material.emissiveColor = getCivilColor(item).scale(0.18);
        existing.material.alpha = item.style?.opacity ?? 0.45;
        positionCivilReferenceNode(existing, item, selectedCivilReferenceIdRef.current, overlaySettingsRef.current.showLabels);
        return;
      }
      if (existing) {
        disposeCivilReferenceNode(existing);
      }
      const node = createCivilReferenceNode(scene, item);
      positionCivilReferenceNode(node, item, selectedCivilReferenceIdRef.current, overlaySettingsRef.current.showLabels);
      civilReferenceNodesRef.current.set(item.id, node);
    });
  }, [civilReferences]);

  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) {
      return;
    }

    const activeIds = new Set(annotations.map((annotation) => annotation.id));
    annotationNodesRef.current.forEach((node, annotationId) => {
      if (!activeIds.has(annotationId)) {
        disposeAnnotationNode(node);
        annotationNodesRef.current.delete(annotationId);
      }
    });

    annotations.forEach((annotation) => {
      const isSelected = annotation.id === selectedAnnotationId;
      const existing = annotationNodesRef.current.get(annotation.id);
      if (existing) {
        disposeAnnotationNode(existing);
      }

      const node = createAnnotationNode(scene, annotation, isSelected);
      const anchorPosition = new Vector3(
        annotation.positionMm.xMm / 1000,
        (annotation.positionMm.zMm ?? 1600) / 1000,
        annotation.positionMm.yMm / 1000
      );
      node.anchor.position = anchorPosition.clone();
      node.plane.position = anchorPosition.add(ANNOTATION_LABEL_OFFSET_METERS);
      node.hitTarget.position = node.plane.position.clone();
      node.handleStem = MeshBuilder.CreateLines(
        node.handleStem.name,
        {
          points: [
            node.anchor.position.clone(),
            node.plane.position.clone()
          ],
          instance: node.handleStem
        }
      );
      node.plane.isVisible = overlaySettings.showAnnotations;
      node.hitTarget.isVisible = overlaySettings.showAnnotations;
      node.anchor.isVisible = overlaySettings.showAnnotations;
      node.handleStem.isVisible = overlaySettings.showAnnotations;
      node.plane.actionManager = null;

      if (annotation.targetObjectId && overlaySettings.showAnnotationLeaderLines) {
        const targetNode = machineNodesRef.current.get(annotation.targetObjectId);
        if (targetNode) {
          node.leader = MeshBuilder.CreateLines(
            `annotation-leader-${annotation.id}`,
            {
              points: [
                node.anchor.position.clone(),
                targetNode.box.position.clone()
              ]
            },
            scene
          );
          node.leader.color = isSelected ? new Color3(1, 0.86, 0.28) : new Color3(0.74, 0.86, 0.78);
          node.leader.isPickable = false;
          node.leader.isVisible = overlaySettings.showAnnotations;
          node.leader.renderingGroupId = 2;
        }
      }

      annotationNodesRef.current.set(annotation.id, node);
    });
  }, [annotations, overlaySettings.showAnnotationLeaderLines, overlaySettings.showAnnotations, placedMachines, selectedAnnotationId]);

  useEffect(() => {
    collisionResultRef.current = collisionResult;
    machineNodesRef.current.forEach((node, instanceId) => {
      const isSelected = selectedMachineIdsRef.current.includes(instanceId);
      const isColliding = collisionResult.collidingObjectIds.includes(instanceId);
      node.collisionFrame.color = isColliding ? new Color3(1, 0.22, 0.16) : new Color3(0.35, 0.72, 1);
      node.collisionFrame.isVisible = overlaySettingsRef.current.showCollisionEnvelope;
      node.material.emissiveColor = isSelected
        ? isColliding
          ? new Color3(0.42, 0.08, 0.04)
          : new Color3(0.24, 0.2, 0.05)
        : isColliding
          ? new Color3(0.18, 0.03, 0.02)
          : Color3.Black();
    });
  }, [collisionResult]);

  useEffect(() => {
    onPerformanceMetricsChangeRef.current = onPerformanceMetricsChange;
  }, [onPerformanceMetricsChange]);

  useImperativeHandle(ref, () => ({
    getCameraState: () => {
      const camera = cameraRef.current;
      if (!camera) {
        return null;
      }

      return {
        alpha: camera.alpha,
        beta: camera.beta,
        radius: camera.radius,
        targetX: camera.target.x,
        targetY: camera.target.y,
        targetZ: camera.target.z,
        positionX: camera.position.x,
        positionY: camera.position.y,
        positionZ: camera.position.z,
        mode: camera.mode === Camera.ORTHOGRAPHIC_CAMERA ? "orthographic" : "perspective"
      };
    },
    applyCameraState: (cameraState) => {
      const camera = cameraRef.current;
      if (!camera) {
        return;
      }

      camera.mode = cameraState.mode === "orthographic" ? Camera.ORTHOGRAPHIC_CAMERA : Camera.PERSPECTIVE_CAMERA;
      camera.alpha = cameraState.alpha;
      camera.beta = cameraState.beta;
      camera.radius = cameraState.radius;
      camera.target = new Vector3(cameraState.targetX, cameraState.targetY, cameraState.targetZ);
    }
  }), []);

  useEffect(() => {
    isSimulationRunningRef.current = isSimulationRunning;
  }, [isSimulationRunning]);

  useEffect(() => {
    simulationSpeedRef.current = simulationSpeed;
  }, [simulationSpeed]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const lifecycle = createBabylonSceneLifecycle(canvas, window);
    const { engine, scene } = lifecycle;
    sceneRef.current = scene;

    const camera = new ArcRotateCamera(
      "orbit-camera",
      Math.PI / 4,
      Math.PI / 3,
      34,
      Vector3.Zero(),
      scene
    );
    cameraRef.current = camera;
    camera.attachControl(canvas, true);
    camera.lowerRadiusLimit = 8;
    camera.upperRadiusLimit = 78;
    camera.wheelPrecision = 35;
    camera.panningSensibility = 75;
    camera.panningInertia = 0.18;
    camera.inertia = 0.65;

    const pointerInput = camera.inputs.attached.pointers as unknown as {
      buttons?: number[];
      panningMouseButton?: number;
    };
    if (pointerInput) {
      pointerInput.buttons = [0];
      pointerInput.panningMouseButton = 1;
    }

    const { floor } = createSceneVisualContext(scene);
    floorRef.current = floor;

    const createPointerRay = () => {
      const activeScene = sceneRef.current;
      const activeCamera = cameraRef.current;
      if (!activeScene || !activeCamera) {
        return null;
      }

      return activeScene.createPickingRay(
        activeScene.pointerX,
        activeScene.pointerY,
        Matrix.Identity(),
        activeCamera
      );
    };

    const pickPlanePoint = (planeElevationMeters: number) => {
      const ray = createPointerRay();
      if (!ray) {
        return null;
      }

      if (Math.abs(ray.direction.y) < 0.0001) {
        return null;
      }

      const distance = (planeElevationMeters - ray.origin.y) / ray.direction.y;
      if (!Number.isFinite(distance) || distance < 0) {
        return null;
      }

      return ray.origin.add(ray.direction.scale(distance));
    };

    const pickFloorPoint = () => pickPlanePoint(0);

    const pickPlanPointMm = (planeElevationMeters: number) => {
      const ray = createPointerRay();
      return ray
        ? getRayPlanePlanPointMm({
            rayOrigin: ray.origin,
            rayDirection: ray.direction,
            planeElevationMeters
          })
        : null;
    };

    const isPanPointer = (event: PointerEvent | undefined) =>
      Boolean(event && (event.button === 1 || event.button === 2 || (event.button === 0 && event.shiftKey)));

    const handleContextMenu = (event: MouseEvent) => {
      event.preventDefault();
    };

    const handleWheel = () => {
      const beforePoint = pickFloorPoint();
      const activeCamera = cameraRef.current;
      if (!beforePoint || !activeCamera) {
        return;
      }

      window.requestAnimationFrame(() => {
        const afterPoint = pickFloorPoint();
        const currentCamera = cameraRef.current;
        if (!afterPoint || !currentCamera) {
          return;
        }

        const targetDelta = beforePoint.subtract(afterPoint);
        targetDelta.y = 0;
        if (targetDelta.length() <= 5) {
          currentCamera.target.addInPlace(targetDelta);
        }
      });
    };

    canvas.addEventListener("contextmenu", handleContextMenu);
    canvas.addEventListener("wheel", handleWheel, { passive: true });

    const pointerObserver: Nullable<Observer<PointerInfo>> = scene.onPointerObservable.add((pointerInfo) => {
      if (pointerInfo.type === PointerEventTypes.POINTERDOWN) {
        const pick = pointerInfo.pickInfo;
        const instanceId = pick?.pickedMesh?.metadata?.instanceId as string | undefined;
        const civilReferenceId = pick?.pickedMesh?.metadata?.civilReferenceId as string | undefined;
        const annotationId = pick?.pickedMesh?.metadata?.annotationId as string | undefined;
        const sourceEvent = pointerInfo.event as PointerEvent | undefined;
        const isToggleSelection = Boolean(sourceEvent?.ctrlKey || sourceEvent?.shiftKey);
        const panPoint = pickFloorPoint();

        if (isPanPointer(sourceEvent) && panPoint) {
          sourceEvent?.preventDefault();
          panStateRef.current = { lastFloorPoint: panPoint.clone() };
          dragStateRef.current = null;
          civilDragStateRef.current = null;
          annotationDragStateRef.current = null;
          cameraRef.current?.detachControl();
          return;
        }

        if (annotationId) {
          sourceEvent?.preventDefault();
          dragStateRef.current = null;
          panStateRef.current = null;
          const annotation = annotationsRef.current.find((item) => item.id === annotationId);
          if (annotation && !lockedAnnotationIdsRef.current.includes(annotationId)) {
            const planeElevationMeters = (annotation.positionMm.zMm ?? 1600) / 1000;
            const pointerPlanPoint = pickPlanPointMm(planeElevationMeters);
            if (!pointerPlanPoint) {
              onSelectAnnotation(annotationId);
              return;
            }
            onBeginObjectDrag();
            annotationDragStateRef.current = {
              annotationId,
              planeElevationMeters,
              initialPointerPosition: pointerPlanPoint,
              initialAnnotationPosition: {
                xMm: annotation.positionMm.xMm,
                yMm: annotation.positionMm.yMm
              }
            };
            cameraRef.current?.detachControl();
          }
          onSelectCivilReference(null);
          onSelectAnnotation(annotationId);
          return;
        }

        if (civilReferenceId) {
          const civilReference = civilReferencesRef.current.find((item) => item.id === civilReferenceId);
          const floorPoint = pickFloorPoint();
          sourceEvent?.preventDefault();
          dragStateRef.current = null;
          annotationDragStateRef.current = null;
          panStateRef.current = null;
          if (civilReference && floorPoint && !lockedCivilReferenceIdsRef.current.includes(civilReferenceId)) {
            onBeginObjectDrag();
            civilDragStateRef.current = {
              id: civilReferenceId,
              startFloorX: floorPoint.x,
              startFloorZ: floorPoint.z,
              startPosition: {
                xMm: civilReference.positionMm.xMm,
                yMm: civilReference.positionMm.yMm
              }
            };
            cameraRef.current?.detachControl();
          }
          onSelectAnnotation(null);
          if (!isToggleSelection) {
            onSelectMachine(null, "clear");
          }
          onSelectCivilReference(civilReferenceId, isToggleSelection ? "toggle" : "replace");
          return;
        }

        if (instanceId) {
          const machine = placedMachinesRef.current.find((item) => item.instanceId === instanceId);
          const floorPoint = pickFloorPoint();
          if (machine && floorPoint && !lockedMachineIdsRef.current.includes(instanceId)) {
            onBeginObjectDrag();
            const currentSelection = selectedMachineIdsRef.current;
            const draggedIds = (currentSelection.includes(instanceId) && !isToggleSelection ? currentSelection : [instanceId])
              .filter((id) => !lockedMachineIdsRef.current.includes(id));
            if (draggedIds.length === 0) {
              onSelectAnnotation(null);
              onSelectMachine(instanceId, isToggleSelection ? "toggle" : "replace");
              return;
            }
            const startPositions = draggedIds.reduce<Record<string, { xMm: number; yMm: number }>>((positions, id) => {
              const draggedMachine = placedMachinesRef.current.find((item) => item.instanceId === id);
              if (draggedMachine) {
                positions[id] = {
                  xMm: draggedMachine.positionMm?.xMm ?? metersToMm(draggedMachine.position.x),
                  yMm: draggedMachine.positionMm?.yMm ?? metersToMm(draggedMachine.position.z)
                };
              }
              return positions;
            }, {});
            dragStateRef.current = {
              instanceIds: draggedIds,
              startFloorX: floorPoint.x,
              startFloorZ: floorPoint.z,
              startPositions
            };
            cameraRef.current?.detachControl();
          }
          onSelectAnnotation(null);
          if (!isToggleSelection) {
            onSelectCivilReference(null);
          }
          onSelectMachine(instanceId, isToggleSelection ? "toggle" : "replace");
          return;
        }

        if (pick?.pickedMesh === floorRef.current) {
          dragStateRef.current = null;
          civilDragStateRef.current = null;
          annotationDragStateRef.current = null;
          onSelectAnnotation(null);
          onSelectCivilReference(null);
          onSelectMachine(null, "clear");
        }
      }

      if (pointerInfo.type === PointerEventTypes.POINTERMOVE) {
        const panState = panStateRef.current;
        if (panState) {
          const floorPoint = pickFloorPoint();
          const activeCamera = cameraRef.current;
          if (floorPoint && activeCamera) {
            const delta = panState.lastFloorPoint.subtract(floorPoint);
            delta.y = 0;
            activeCamera.target.addInPlace(delta);
            panStateRef.current = { lastFloorPoint: floorPoint.clone() };
          }
          return;
        }

        const dragState = dragStateRef.current;
        const civilDragState = civilDragStateRef.current;
        const annotationDragState = annotationDragStateRef.current;
        if (!dragState && !civilDragState && !annotationDragState) {
          return;
        }

        const floorPoint = pickFloorPoint();
        if (annotationDragState) {
          const pointerPlanPoint = pickPlanPointMm(annotationDragState.planeElevationMeters);
          if (!pointerPlanPoint) {
            return;
          }

          const nextPosition = calculateAnnotationDragPosition({
            initialAnnotationPosition: annotationDragState.initialAnnotationPosition,
            initialPointerPosition: annotationDragState.initialPointerPosition,
            currentPointerPosition: pointerPlanPoint
          });
          onSetAnnotationPosition(
            annotationDragState.annotationId,
            nextPosition,
            { recordHistory: false }
          );
          return;
        }

        if (!floorPoint) {
          return;
        }

        if (civilDragState) {
          const deltaXMm = metersToMm(floorPoint.x - civilDragState.startFloorX);
          const deltaYMm = metersToMm(floorPoint.z - civilDragState.startFloorZ);
          onSetCivilReferencePosition(
            civilDragState.id,
            {
              xMm: civilDragState.startPosition.xMm + deltaXMm,
              yMm: civilDragState.startPosition.yMm + deltaYMm
            },
            { recordHistory: false }
          );
          return;
        }

        if (!dragState) {
          return;
        }

        const deltaXMm = metersToMm(floorPoint.x - dragState.startFloorX);
        const deltaYMm = metersToMm(floorPoint.z - dragState.startFloorZ);
        onSetMachinePositions(
          dragState.instanceIds.flatMap((instanceId) => {
            const startPosition = dragState.startPositions[instanceId];
            return startPosition
              ? [{
                  instanceId,
                  xMm: startPosition.xMm + deltaXMm,
                  yMm: startPosition.yMm + deltaYMm
                }]
              : [];
          }),
          { recordHistory: false }
        );
      }

      if (pointerInfo.type === PointerEventTypes.POINTERUP) {
        if (dragStateRef.current || civilDragStateRef.current || annotationDragStateRef.current || panStateRef.current) {
          dragStateRef.current = null;
          civilDragStateRef.current = null;
          annotationDragStateRef.current = null;
          panStateRef.current = null;
          cameraRef.current?.attachControl(canvasRef.current, true);
        }
      }
    });

    lifecycle.startRenderLoop(() => {
      const deltaSeconds = engine.getDeltaTime() / 1000;
      machineNodesRef.current.forEach((node, instanceId) => {
        const machine = placedMachinesRef.current.find((item) => item.instanceId === instanceId);
        if (!machine || !hasFlowDirection(machine)) {
          return;
        }

        node.products.forEach((product) => {
          product.isVisible = isSimulationRunningRef.current;
        });

        if (!isSimulationRunningRef.current) {
          return;
        }

        const currentPhase = productPhaseRef.current.get(instanceId) ?? 0;
        const nextPhase = (currentPhase + (deltaSeconds * simulationSpeedRef.current) / 2.8) % 1;
        productPhaseRef.current.set(instanceId, nextPhase);

        node.products.forEach((product, index) => {
          const dimensions = getMachineDimensionsMeters(machine.definition);
          const progress = (nextPhase + index / node.products.length) % 1;
          const localProgress = machine.flowDirection === "reverse" ? 1 - progress : progress;
          product.position.x = -dimensions.width / 2 + localProgress * dimensions.width;
          product.position.y = dimensions.height / 2 + 0.22;
          product.position.z = 0;
        });
      });
      const activeCamera = cameraRef.current;
      if (activeCamera) {
        annotationNodesRef.current.forEach((node) => {
          const distance = Vector3.Distance(activeCamera.position, node.plane.position);
          const readableScale = getAnnotationReadableScale({
            cameraDistanceMeters: distance,
            sizeScale: node.sizeScale
          });
          node.plane.scaling.setAll(readableScale);
          node.hitTarget.scaling.setAll(readableScale);
        });
      }
      scene.render();
      if (onPerformanceMetricsChangeRef.current) {
        onPerformanceMetricsChangeRef.current(collectScenePerformanceMetrics(scene, engine));
      }
    });

    return () => {
      lifecycle.dispose(() => {
        canvas.removeEventListener("contextmenu", handleContextMenu);
        canvas.removeEventListener("wheel", handleWheel);
        if (pointerObserver) {
          scene.onPointerObservable.remove(pointerObserver);
        }
        machineNodesRef.current.forEach((node) => {
          node.labelTexture.dispose();
          node.material.dispose();
          node.selectionFrame.dispose();
          node.flowArrow?.dispose();
          node.metadataFrame.dispose();
          node.collisionFrame.dispose();
          node.clearanceFrame?.dispose();
          node.connectionPointMarkers.forEach((markerSet) => {
            markerSet.texture.dispose();
            markerSet.material.dispose();
            markerSet.labelMaterial.dispose();
            markerSet.label.dispose();
            markerSet.marker.dispose();
          });
          node.placeholderMeshes.forEach((mesh) => mesh.dispose(false, true));
          node.visualRoot?.dispose(false, true);
          node.loadedVisualMeshes.forEach((mesh) => {
            if (!mesh.isDisposed()) {
              mesh.dispose(false, true);
            }
          });
          node.products.forEach((product) => {
            product.material?.dispose();
            product.dispose();
          });
          node.label.dispose();
          node.box.dispose();
        });
        machineNodesRef.current.clear();
        civilReferenceNodesRef.current.forEach(disposeCivilReferenceNode);
        civilReferenceNodesRef.current.clear();
        annotationNodesRef.current.forEach(disposeAnnotationNode);
        annotationNodesRef.current.clear();
        cameraRef.current = null;
        floorRef.current = null;
        sceneRef.current = null;
      });
    };
  }, [
    onBeginObjectDrag,
    onSelectAnnotation,
    onSelectCivilReference,
    onSelectMachine,
    onSetAnnotationPosition,
    onSetCivilReferencePosition,
    onSetMachinePositions,
    onUpdateMachine
  ]);

  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) {
      return;
    }

    const activeIds = new Set(placedMachines.map((machine) => machine.instanceId));
    machineNodesRef.current.forEach((node, instanceId) => {
      if (!activeIds.has(instanceId)) {
        node.labelTexture.dispose();
        node.material.dispose();
        node.selectionFrame.dispose();
        node.flowArrow?.dispose();
        node.metadataFrame.dispose();
        node.collisionFrame.dispose();
        node.clearanceFrame?.dispose();
        node.connectionPointMarkers.forEach((markerSet) => {
          markerSet.texture.dispose();
          markerSet.material.dispose();
          markerSet.labelMaterial.dispose();
          markerSet.label.dispose();
          markerSet.marker.dispose();
        });
        node.placeholderMeshes.forEach((mesh) => mesh.dispose(false, true));
        node.visualRoot?.dispose(false, true);
        node.loadedVisualMeshes.forEach((mesh) => {
          if (!mesh.isDisposed()) {
            mesh.dispose(false, true);
          }
        });
        node.products.forEach((product) => {
          product.material?.dispose();
          product.dispose();
        });
        productPhaseRef.current.delete(instanceId);
        node.label.dispose();
        node.box.dispose();
        machineNodesRef.current.delete(instanceId);
      }
    });

    placedMachines.forEach((machine) => {
      if (machineNodesRef.current.has(machine.instanceId)) {
        return;
      }

      const { definition, instanceId } = machine;
      const dimensions = getMachineDimensionsMeters(definition);
      const renderCenterMm = getMachineRenderCenterMm(machine);
      const renderCenter = {
        x: mmToMeters(renderCenterMm.xMm),
        z: mmToMeters(renderCenterMm.yMm)
      };
      const material = new StandardMaterial(`machine-material-${instanceId}`, scene);
      material.diffuseColor = hexToColor3(definition.defaultColor);
      material.specularColor = new Color3(0.14, 0.16, 0.18);
      material.alpha = 1;

      const box = MeshBuilder.CreateBox(
        `machine-${instanceId}`,
        {
          width: dimensions.width,
          depth: dimensions.depth,
          height: dimensions.height
        },
        scene
      );
      box.position = new Vector3(renderCenter.x, dimensions.height / 2, renderCenter.z);
      box.rotation.y = (machine.rotationY * Math.PI) / 180;
      box.material = material;
      box.metadata = { instanceId };
      box.visibility = 0;

      const { label, texture } = createLabel(scene, instanceId, definition.name, dimensions.height + 0.85);
      label.position.x = renderCenter.x;
      label.position.z = renderCenter.z;
      label.isVisible = overlaySettingsRef.current.showLabels;

      const selectionFrame = createSelectionFrame(scene, machine);
      selectionFrame.parent = box;
      selectionFrame.isVisible =
        selectedMachineIdsRef.current.includes(instanceId) && overlaySettingsRef.current.showSelectionBox;
      selectionFrame.color =
        primarySelectedMachineIdRef.current === instanceId ? new Color3(1, 0.86, 0.28) : new Color3(0.37, 0.78, 1);

      const metadataFrame = createMetadataFrame(scene, machine);
      metadataFrame.parent = box;
      metadataFrame.isVisible =
        selectedMachineIdsRef.current.includes(instanceId) && overlaySettingsRef.current.showMetadataBox;

      const collisionFrame = createCollisionFrame(scene, machine);
      collisionFrame.parent = box;
      collisionFrame.isVisible = overlaySettingsRef.current.showCollisionEnvelope;
      collisionFrame.color = collisionResultRef.current.collidingObjectIds.includes(instanceId)
        ? new Color3(1, 0.22, 0.16)
        : new Color3(0.35, 0.72, 1);

      const clearanceFrame = createClearanceFrame(scene, machine);
      if (clearanceFrame) {
        clearanceFrame.parent = box;
        clearanceFrame.isVisible =
          selectedMachineIdsRef.current.includes(instanceId) && overlaySettingsRef.current.showClearanceEnvelope;
      }

      const flowArrow = hasFlowDirection(machine) ? createFlowArrow(scene, machine) : undefined;
      if (flowArrow) {
        flowArrow.parent = box;
      }

      const products = hasFlowDirection(machine) ? createProductMeshes(scene, machine) : [];
      products.forEach((product) => {
        product.parent = box;
      });
      const connectionPointMarkers = getConnectionPointsForObject(machine).map((_, pointIndex) => {
        const markerSet = createConnectionPointMarker(scene, machine, pointIndex);
        markerSet.marker.parent = box;
        markerSet.label.parent = box;
        positionConnectionPointMarker(markerSet, machine, pointIndex);
        const isSelected = selectedMachineIdsRef.current.includes(instanceId);
        markerSet.marker.isVisible = shouldShowConnectionPointMarker(isSelected, overlaySettingsRef.current);
        markerSet.label.isVisible = shouldShowConnectionPointLabel(isSelected, overlaySettingsRef.current);
        return markerSet;
      });
      const placeholderMeshes = createPlaceholderMeshes(scene, machine, box, material);
      const proxyStatus = definition.placeholderVisualType === "box-generic" ? "fallback" : "proxy";
      onVisualDiagnosticsChange(
        createBaseVisualDiagnostics(instanceId, definition, proxyStatus, undefined, {
          widthMm: metersToMm(dimensions.width),
          depthMm: metersToMm(dimensions.depth),
          heightMm: metersToMm(dimensions.height)
        })
      );

      machineNodesRef.current.set(instanceId, {
        box,
        label,
        labelTexture: texture,
        material,
        selectionFrame,
        flowArrow,
        metadataFrame,
        collisionFrame,
        clearanceFrame,
        connectionPointMarkers,
        products,
        placeholderMeshes,
        loadedVisualMeshes: []
      });

      const visualModel = definition.visualModel ?? DEFAULT_VISUAL_MODEL;
      if (visualModel.modelPath || definition.modelPath) {
        onVisualDiagnosticsChange(createBaseVisualDiagnostics(instanceId, definition, "loading"));
        void loadVisualModel(scene, machine, box, material).then((loadedModel) => {
          if (!loadedModel) {
            return;
          }

          if ("failed" in loadedModel) {
            onVisualDiagnosticsChange(
              createBaseVisualDiagnostics(
                instanceId,
                definition,
                "failed",
                loadedModel.fallbackReason,
                {
                  widthMm: metersToMm(dimensions.width),
                  depthMm: metersToMm(dimensions.depth),
                  heightMm: metersToMm(dimensions.height)
                }
              )
            );
            return;
          }

          const currentNode = machineNodesRef.current.get(instanceId);
          if (!currentNode) {
            loadedModel.visualRoot.dispose(false, true);
            loadedModel.loadedVisualMeshes.forEach((mesh) => {
              if (!mesh.isDisposed()) {
                mesh.dispose(false, true);
              }
            });
            return;
          }

          currentNode.visualRoot = loadedModel.visualRoot;
          currentNode.loadedVisualMeshes = loadedModel.loadedVisualMeshes;
          onVisualDiagnosticsChange(
            createBaseVisualDiagnostics(
              instanceId,
              definition,
              "loaded",
              undefined,
              loadedModel.visualBoundsMm,
              loadedModel.appliedScale,
              loadedModel.calibrationWarnings
            )
          );
          currentNode.placeholderMeshes.forEach((mesh) => {
            mesh.isVisible = false;
          });
        });
      }
    });

    placedMachines.forEach((machine) => {
      const node = machineNodesRef.current.get(machine.instanceId);
      if (!node) {
        return;
      }

      const dimensions = getMachineDimensionsMeters(machine.definition);
      const renderCenterMm = getMachineRenderCenterMm(machine);
      const renderCenter = {
        x: mmToMeters(renderCenterMm.xMm),
        z: mmToMeters(renderCenterMm.yMm)
      };
      const connectionPoints = getConnectionPointsForObject(machine);
      if (node.connectionPointMarkers.length !== connectionPoints.length) {
        node.connectionPointMarkers.forEach((markerSet) => {
          markerSet.texture.dispose();
          markerSet.material.dispose();
          markerSet.labelMaterial.dispose();
          markerSet.label.dispose();
          markerSet.marker.dispose();
        });
        node.connectionPointMarkers = connectionPoints.map((_, pointIndex) => {
          const markerSet = createConnectionPointMarker(scene, machine, pointIndex);
          markerSet.marker.parent = node.box;
          markerSet.label.parent = node.box;
          return markerSet;
        });
      }
      node.box.position.x = renderCenter.x;
      node.box.position.y = dimensions.height / 2;
      node.box.position.z = renderCenter.z;
      node.box.rotation.y = (machine.rotationY * Math.PI) / 180;
      if (node.flowArrow) {
        node.flowArrow.rotation.y = machine.flowDirection === "reverse" ? Math.PI : 0;
      }
      node.label.position.x = renderCenter.x;
      node.label.position.y = dimensions.height + 0.85;
      node.label.position.z = renderCenter.z;
      node.selectionFrame.isVisible =
        selectedMachineIdsRef.current.includes(machine.instanceId) && overlaySettingsRef.current.showSelectionBox;
      node.selectionFrame.color =
        machine.instanceId === primarySelectedMachineIdRef.current
          ? new Color3(1, 0.86, 0.28)
          : new Color3(0.37, 0.78, 1);
      node.metadataFrame.isVisible =
        selectedMachineIdsRef.current.includes(machine.instanceId) && overlaySettingsRef.current.showMetadataBox;
      node.collisionFrame.isVisible = overlaySettingsRef.current.showCollisionEnvelope;
      node.collisionFrame.color = collisionResultRef.current.collidingObjectIds.includes(machine.instanceId)
        ? new Color3(1, 0.22, 0.16)
        : new Color3(0.35, 0.72, 1);
      if (node.clearanceFrame) {
        node.clearanceFrame.isVisible =
          selectedMachineIdsRef.current.includes(machine.instanceId) && overlaySettingsRef.current.showClearanceEnvelope;
      }
      const isSelected = selectedMachineIdsRef.current.includes(machine.instanceId);
      node.connectionPointMarkers.forEach((markerSet, pointIndex) => {
        positionConnectionPointMarker(markerSet, machine, pointIndex);
        markerSet.marker.isVisible = shouldShowConnectionPointMarker(isSelected, overlaySettingsRef.current);
        markerSet.label.isVisible = shouldShowConnectionPointLabel(isSelected, overlaySettingsRef.current);
      });
      const isColliding = collisionResultRef.current.collidingObjectIds.includes(machine.instanceId);
      node.material.emissiveColor = isSelected
        ? isColliding
          ? new Color3(0.42, 0.08, 0.04)
          : new Color3(0.24, 0.2, 0.05)
        : isColliding
          ? new Color3(0.18, 0.03, 0.02)
          : Color3.Black();
    });
  }, [placedMachines]);

  return <canvas className="scene-canvas" ref={canvasRef} aria-label="AtrVisu 3D workspace" />;
});
