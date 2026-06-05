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
import type { PlacedMachine } from "../types/machine";
import { getMachineDimensionsMeters } from "../utils/machineDimensions";
import { mmToMeters } from "../utils/units";
import { DEFAULT_VISUAL_MODEL, normalizeVisualModel } from "../utils/visualModel";

const GRID_SIZE = 42;
const GRID_MAJOR_STEP = 6;
const GRID_MINOR_STEP = 1;

type BabylonSceneProps = {
  placedMachines: PlacedMachine[];
  selectedMachineId: string | null;
  onSelectMachine: (instanceId: string | null) => void;
  onUpdateMachine: (
    instanceId: string,
    updates: Partial<Pick<PlacedMachine, "position" | "positionMm" | "elevationMm" | "rotationDeg" | "rotationY" | "flowDirection">>
  ) => void;
  isSimulationRunning: boolean;
  simulationSpeed: number;
};

type PlacedMachineNode = {
  box: Mesh;
  label: Mesh;
  labelTexture: DynamicTexture;
  material: StandardMaterial;
  selectionFrame: LinesMesh;
  flowArrow?: LinesMesh;
  products: Mesh[];
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

const getSafeScale = (target: number, source: number) => {
  return source > 0.0001 ? target / source : 1;
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

    // metadata-box intentionally uses non-uniform visual scaling so engineering metadata remains authoritative.
    // This is a visual fit, not a collision or machine envelope calculation.
    if (visualModel.scaleMode === "metadata-box") {
      visualRoot.scaling = new Vector3(
        getSafeScale(dimensions.width, size.x),
        getSafeScale(dimensions.height, size.y),
        getSafeScale(dimensions.depth, size.z)
      );
    } else if (visualModel.unit === "mm") {
      const unitScale = mmToMeters(1);
      visualRoot.scaling = new Vector3(unitScale, unitScale, unitScale);
    }

    visualRoot.parent = rootBox;
    visualRoot.position = new Vector3(
      -center.x * visualRoot.scaling.x + mmToMeters(visualModel.positionOffsetMm.xMm),
      -dimensions.height / 2 - bounds.min.y * visualRoot.scaling.y + mmToMeters(visualModel.positionOffsetMm.yMm),
      -center.z * visualRoot.scaling.z + mmToMeters(visualModel.positionOffsetMm.zMm)
    );
    visualRoot.rotation = new Vector3(
      radiansFromDegrees(visualModel.rotationOffsetDeg.x),
      radiansFromDegrees(visualModel.rotationOffsetDeg.y),
      radiansFromDegrees(visualModel.rotationOffsetDeg.z)
    );

    placeholderMaterial.alpha = 0.08;
    rootBox.visibility = 0.16;

    return {
      visualRoot,
      loadedVisualMeshes: result.meshes
    };
  } catch (error) {
    console.warn(
      `[AtrVisu visual model] Could not load "${modelPath}" for "${machine.definition.name}". Placeholder box was used.`,
      error
    );
    return null;
  }
};

export function BabylonScene({
  placedMachines,
  selectedMachineId,
  onSelectMachine,
  onUpdateMachine,
  isSimulationRunning,
  simulationSpeed
}: BabylonSceneProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const sceneRef = useRef<Scene | null>(null);
  const cameraRef = useRef<ArcRotateCamera | null>(null);
  const floorRef = useRef<Mesh | null>(null);
  const machineNodesRef = useRef<Map<string, PlacedMachineNode>>(new Map());
  const placedMachinesRef = useRef<PlacedMachine[]>(placedMachines);
  const selectedMachineIdRef = useRef<string | null>(selectedMachineId);
  const isSimulationRunningRef = useRef(isSimulationRunning);
  const simulationSpeedRef = useRef(simulationSpeed);
  const productPhaseRef = useRef<Map<string, number>>(new Map());
  const dragStateRef = useRef<{
    instanceId: string;
    offsetX: number;
    offsetZ: number;
  } | null>(null);

  useEffect(() => {
    placedMachinesRef.current = placedMachines;
  }, [placedMachines]);

  useEffect(() => {
    selectedMachineIdRef.current = selectedMachineId;
    machineNodesRef.current.forEach((node, instanceId) => {
      const isSelected = instanceId === selectedMachineId;
      node.selectionFrame.isVisible = isSelected;
      node.material.emissiveColor = isSelected ? new Color3(0.24, 0.2, 0.05) : Color3.Black();
    });
  }, [selectedMachineId]);

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

    const pointerObserver: Nullable<Observer<PointerInfo>> = scene.onPointerObservable.add((pointerInfo) => {
      if (pointerInfo.type === PointerEventTypes.POINTERDOWN) {
        const pick = pointerInfo.pickInfo;
        const instanceId = pick?.pickedMesh?.metadata?.instanceId as string | undefined;

        if (instanceId) {
          const machine = placedMachinesRef.current.find((item) => item.instanceId === instanceId);
          const floorPoint = pickFloorPoint();
          if (machine && floorPoint) {
            dragStateRef.current = {
              instanceId,
              offsetX: machine.position.x - floorPoint.x,
              offsetZ: machine.position.z - floorPoint.z
            };
            cameraRef.current?.detachControl();
          }
          onSelectMachine(instanceId);
          return;
        }

        if (pick?.pickedMesh === floorRef.current) {
          dragStateRef.current = null;
          onSelectMachine(null);
        }
      }

      if (pointerInfo.type === PointerEventTypes.POINTERMOVE) {
        const dragState = dragStateRef.current;
        if (!dragState) {
          return;
        }

        const floorPoint = pickFloorPoint();
        if (!floorPoint) {
          return;
        }

        onUpdateMachine(dragState.instanceId, {
          position: {
            x: Number((floorPoint.x + dragState.offsetX).toFixed(2)),
            z: Number((floorPoint.z + dragState.offsetZ).toFixed(2))
          }
        });
      }

      if (pointerInfo.type === PointerEventTypes.POINTERUP) {
        if (dragStateRef.current) {
          dragStateRef.current = null;
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
    });

    const handleResize = () => {
      engine.resize();
    };
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      if (pointerObserver) {
        scene.onPointerObservable.remove(pointerObserver);
      }
      machineNodesRef.current.forEach((node) => {
        node.labelTexture.dispose();
        node.material.dispose();
        node.selectionFrame.dispose();
        node.flowArrow?.dispose();
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
  }, [onSelectMachine, onUpdateMachine]);

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

      const { label, texture } = createLabel(scene, instanceId, definition.name, dimensions.height + 0.85);
      label.position.x = position.x;
      label.position.z = position.z;

      const selectionFrame = createSelectionFrame(scene, machine);
      selectionFrame.parent = box;
      selectionFrame.isVisible = selectedMachineIdRef.current === instanceId;

      const flowArrow = hasFlowDirection(machine) ? createFlowArrow(scene, machine) : undefined;
      if (flowArrow) {
        flowArrow.parent = box;
      }

      const products = hasFlowDirection(machine) ? createProductMeshes(scene, machine) : [];
      products.forEach((product) => {
        product.parent = box;
      });

      machineNodesRef.current.set(instanceId, {
        box,
        label,
        labelTexture: texture,
        material,
        selectionFrame,
        flowArrow,
        products,
        loadedVisualMeshes: []
      });

      const visualModel = definition.visualModel ?? DEFAULT_VISUAL_MODEL;
      if (visualModel.modelPath || definition.modelPath) {
        void loadVisualModel(scene, machine, box, material).then((loadedModel) => {
          if (!loadedModel) {
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
        });
      }
    });

    placedMachines.forEach((machine) => {
      const node = machineNodesRef.current.get(machine.instanceId);
      if (!node) {
        return;
      }

      const dimensions = getMachineDimensionsMeters(machine.definition);
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
      node.selectionFrame.isVisible = machine.instanceId === selectedMachineIdRef.current;
      node.material.emissiveColor =
        machine.instanceId === selectedMachineIdRef.current ? new Color3(0.24, 0.2, 0.05) : Color3.Black();
    });
  }, [placedMachines]);

  return <canvas className="scene-canvas" ref={canvasRef} aria-label="AtrVisu 3D workspace" />;
}
