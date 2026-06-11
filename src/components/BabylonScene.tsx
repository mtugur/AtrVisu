import { useEffect, useRef } from "react";
import {
  AbstractMesh,
  ArcRotateCamera,
  Color3,
  Color4,
  DynamicTexture,
  Engine,
  HemisphericLight,
  LinesMesh,
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
import type { PlacedMachine } from "../types/machine";
import type { OverlaySettings, VisualModelDiagnostics } from "../types/overlays";
import type { ScenePerformanceMetrics } from "../types/performance";
import { getCollisionEnvelopeForMachine } from "../utils/collision";
import { getMachineDimensionsMeters } from "../utils/machineDimensions";
import { collectScenePerformanceMetrics } from "../utils/performanceBenchmark";
import { metersToMm, mmToMeters } from "../utils/units";
import { DEFAULT_OVERLAY_SETTINGS } from "../utils/overlaySettings";
import { createBaseVisualDiagnostics } from "../utils/visualDiagnostics";
import { calculateMetadataBoxScale, DEFAULT_VISUAL_MODEL, normalizeVisualModel } from "../utils/visualModel";
import {
  getConnectionPointDisplayLabel,
  getConnectionPointMarkerLabel,
  getConnectionPointsForObject
} from "../utils/connectionPoints";

const GRID_SIZE = 42;
const GRID_MAJOR_STEP = 6;
const GRID_MINOR_STEP = 1;

type BabylonSceneProps = {
  placedMachines: PlacedMachine[];
  selectedMachineIds: string[];
  primarySelectedMachineId: string | null;
  onSelectMachine: (instanceId: string | null, mode?: "replace" | "toggle" | "clear") => void;
  onUpdateMachine: (
    instanceId: string,
    updates: Partial<Pick<PlacedMachine, "position" | "positionMm" | "elevationMm" | "rotationDeg" | "rotationY" | "flowDirection">>
  ) => void;
  onSetMachinePositions: (
    updates: Array<{ instanceId: string; xMm: number; yMm: number }>,
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

const hexToColor3 = (hex: string) => {
  return Color3.FromHexString(hex);
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

  markerSet.marker.position.x = point.positionMm.xMm / 1000;
  markerSet.marker.position.y = point.positionMm.zMm / 1000 + 0.04;
  markerSet.marker.position.z = point.positionMm.yMm / 1000;
  markerSet.label.position.x = markerSet.marker.position.x + 0.14;
  markerSet.label.position.y = markerSet.marker.position.y + 0.72;
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

export function BabylonScene({
  placedMachines,
  selectedMachineIds,
  primarySelectedMachineId,
  onSelectMachine,
  onUpdateMachine,
  onSetMachinePositions,
  onBeginObjectDrag,
  isSimulationRunning,
  simulationSpeed,
  overlaySettings,
  collisionResult,
  onVisualDiagnosticsChange,
  onPerformanceMetricsChange
}: BabylonSceneProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const sceneRef = useRef<Scene | null>(null);
  const cameraRef = useRef<ArcRotateCamera | null>(null);
  const floorRef = useRef<Mesh | null>(null);
  const machineNodesRef = useRef<Map<string, PlacedMachineNode>>(new Map());
  const placedMachinesRef = useRef<PlacedMachine[]>(placedMachines);
  const selectedMachineIdsRef = useRef<string[]>(selectedMachineIds);
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
  const panStateRef = useRef<{
    lastFloorPoint: Vector3;
  } | null>(null);

  useEffect(() => {
    placedMachinesRef.current = placedMachines;
  }, [placedMachines]);

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
  }, [overlaySettings]);

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

    const engine = new Engine(canvas, true, {
      adaptToDeviceRatio: true,
      antialias: true,
      preserveDrawingBuffer: true,
      stencil: true
    });

    const scene = new Scene(engine);
    sceneRef.current = scene;
    scene.clearColor = new Color4(0.035, 0.045, 0.055, 1);
    scene.ambientColor = new Color3(0.18, 0.22, 0.25);

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
    camera.lowerRadiusLimit = 12;
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

    const keyLight = new HemisphericLight("key-light", new Vector3(0.2, 1, 0.35), scene);
    keyLight.intensity = 0.88;
    keyLight.groundColor = new Color3(0.08, 0.09, 0.1);

    const gridMaterial = new StandardMaterial("grid-material", scene);
    gridMaterial.diffuseColor = new Color3(0.18, 0.68, 0.74);
    gridMaterial.emissiveColor = new Color3(0.04, 0.17, 0.18);
    gridMaterial.alpha = 0.88;

    const majorMaterial = new StandardMaterial("major-grid-material", scene);
    majorMaterial.diffuseColor = new Color3(0.7, 0.86, 0.56);
    majorMaterial.emissiveColor = new Color3(0.12, 0.16, 0.08);
    majorMaterial.alpha = 0.95;

    for (let i = -GRID_SIZE; i <= GRID_SIZE; i += GRID_MINOR_STEP) {
      const isMajor = i % GRID_MAJOR_STEP === 0;
      const material = isMajor ? majorMaterial : gridMaterial;
      const thickness = isMajor ? 0.045 : 0.018;

      const xLine = MeshBuilder.CreateBox(
        `grid-x-${i}`,
        { width: GRID_SIZE * 2, height: thickness, depth: thickness },
        scene
      );
      xLine.position.z = i;
      xLine.material = material;
      xLine.isPickable = false;

      const zLine = MeshBuilder.CreateBox(
        `grid-z-${i}`,
        { width: thickness, height: thickness, depth: GRID_SIZE * 2 },
        scene
      );
      zLine.position.x = i;
      zLine.material = material;
      zLine.isPickable = false;
    }

    const floor = MeshBuilder.CreateGround(
      "floor-pick-plane",
      { width: GRID_SIZE * 2, height: GRID_SIZE * 2 },
      scene
    );
    const floorMaterial = new StandardMaterial("floor-pick-material", scene);
    floorMaterial.alpha = 0;
    floor.material = floorMaterial;
    floor.visibility = 0;
    floor.isPickable = true;
    floorRef.current = floor;

    const pickFloorPoint = () => {
      const floorMesh = floorRef.current;
      const activeScene = sceneRef.current;
      if (!floorMesh || !activeScene) {
        return null;
      }

      const pick = activeScene.pick(activeScene.pointerX, activeScene.pointerY, (mesh) => mesh === floorMesh);
      return pick?.hit ? pick.pickedPoint : null;
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

        currentCamera.target.addInPlace(beforePoint.subtract(afterPoint));
      });
    };

    canvas.addEventListener("contextmenu", handleContextMenu);
    canvas.addEventListener("wheel", handleWheel, { passive: true });

    const pointerObserver: Nullable<Observer<PointerInfo>> = scene.onPointerObservable.add((pointerInfo) => {
      if (pointerInfo.type === PointerEventTypes.POINTERDOWN) {
        const pick = pointerInfo.pickInfo;
        const instanceId = pick?.pickedMesh?.metadata?.instanceId as string | undefined;
        const sourceEvent = pointerInfo.event as PointerEvent | undefined;
        const isToggleSelection = Boolean(sourceEvent?.ctrlKey || sourceEvent?.shiftKey);
        const panPoint = pickFloorPoint();

        if (isPanPointer(sourceEvent) && panPoint) {
          sourceEvent?.preventDefault();
          panStateRef.current = { lastFloorPoint: panPoint.clone() };
          dragStateRef.current = null;
          cameraRef.current?.detachControl();
          return;
        }

        if (instanceId) {
          const machine = placedMachinesRef.current.find((item) => item.instanceId === instanceId);
          const floorPoint = pickFloorPoint();
          if (machine && floorPoint) {
            onBeginObjectDrag();
            const currentSelection = selectedMachineIdsRef.current;
            const draggedIds = currentSelection.includes(instanceId) && !isToggleSelection ? currentSelection : [instanceId];
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
          onSelectMachine(instanceId, isToggleSelection ? "toggle" : "replace");
          return;
        }

        if (pick?.pickedMesh === floorRef.current) {
          dragStateRef.current = null;
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
            activeCamera.target.addInPlace(delta);
          }
          return;
        }

        const dragState = dragStateRef.current;
        if (!dragState) {
          return;
        }

        const floorPoint = pickFloorPoint();
        if (!floorPoint) {
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
        if (dragStateRef.current || panStateRef.current) {
          dragStateRef.current = null;
          panStateRef.current = null;
          cameraRef.current?.attachControl(canvasRef.current, true);
        }
      }
    });

    engine.runRenderLoop(() => {
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
      scene.render();
      if (onPerformanceMetricsChangeRef.current) {
        onPerformanceMetricsChangeRef.current(collectScenePerformanceMetrics(scene, engine));
      }
    });

    const handleResize = () => {
      engine.resize();
    };
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
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
      cameraRef.current = null;
      floorRef.current = null;
      sceneRef.current = null;
      scene.dispose();
      engine.dispose();
    };
  }, [onBeginObjectDrag, onSelectMachine, onSetMachinePositions, onUpdateMachine]);

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

      const { definition, instanceId, position } = machine;
      const dimensions = getMachineDimensionsMeters(definition);
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
      box.position = new Vector3(position.x, dimensions.height / 2, position.z);
      box.rotation.y = (machine.rotationY * Math.PI) / 180;
      box.material = material;
      box.metadata = { instanceId };
      box.visibility = 0;

      const { label, texture } = createLabel(scene, instanceId, definition.name, dimensions.height + 0.85);
      label.position.x = position.x;
      label.position.z = position.z;
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
      node.box.position.x = machine.position.x;
      node.box.position.y = dimensions.height / 2;
      node.box.position.z = machine.position.z;
      node.box.rotation.y = (machine.rotationY * Math.PI) / 180;
      if (node.flowArrow) {
        node.flowArrow.rotation.y = machine.flowDirection === "reverse" ? Math.PI : 0;
      }
      node.label.position.x = machine.position.x;
      node.label.position.y = dimensions.height + 0.85;
      node.label.position.z = machine.position.z;
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
}
