import { useEffect, useRef } from "react";
import {
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
  StandardMaterial,
  Texture,
  Vector3
} from "@babylonjs/core";
import type { PlacedMachine } from "../types/machine";

const GRID_SIZE = 42;
const GRID_MAJOR_STEP = 6;
const GRID_MINOR_STEP = 1;

type BabylonSceneProps = {
  placedMachines: PlacedMachine[];
  selectedMachineId: string | null;
  onSelectMachine: (instanceId: string | null) => void;
  onUpdateMachine: (
    instanceId: string,
    updates: Partial<Pick<PlacedMachine, "position" | "rotationY">>
  ) => void;
};

type PlacedMachineNode = {
  box: Mesh;
  label: Mesh;
  labelTexture: DynamicTexture;
  material: StandardMaterial;
  selectionFrame: LinesMesh;
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
  const { width, depth, height } = machine.definition;
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

export function BabylonScene({
  placedMachines,
  selectedMachineId,
  onSelectMachine,
  onUpdateMachine
}: BabylonSceneProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const sceneRef = useRef<Scene | null>(null);
  const cameraRef = useRef<ArcRotateCamera | null>(null);
  const floorRef = useRef<Mesh | null>(null);
  const machineNodesRef = useRef<Map<string, PlacedMachineNode>>(new Map());
  const placedMachinesRef = useRef<PlacedMachine[]>(placedMachines);
  const selectedMachineIdRef = useRef<string | null>(selectedMachineId);
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
      const material = new StandardMaterial(`machine-material-${instanceId}`, scene);
      material.diffuseColor = hexToColor3(definition.defaultColor);
      material.specularColor = new Color3(0.14, 0.16, 0.18);

      const box = MeshBuilder.CreateBox(
        `machine-${instanceId}`,
        {
          width: definition.width,
          depth: definition.depth,
          height: definition.height
        },
        scene
      );
      box.position = new Vector3(position.x, definition.height / 2, position.z);
      box.rotation.y = (machine.rotationY * Math.PI) / 180;
      box.material = material;
      box.metadata = { instanceId };

      const { label, texture } = createLabel(scene, instanceId, definition.name, definition.height + 0.85);
      label.position.x = position.x;
      label.position.z = position.z;

      const selectionFrame = createSelectionFrame(scene, machine);
      selectionFrame.parent = box;
      selectionFrame.isVisible = selectedMachineIdRef.current === instanceId;

      machineNodesRef.current.set(instanceId, { box, label, labelTexture: texture, material, selectionFrame });
    });

    placedMachines.forEach((machine) => {
      const node = machineNodesRef.current.get(machine.instanceId);
      if (!node) {
        return;
      }

      node.box.position.x = machine.position.x;
      node.box.position.y = machine.definition.height / 2;
      node.box.position.z = machine.position.z;
      node.box.rotation.y = (machine.rotationY * Math.PI) / 180;
      node.label.position.x = machine.position.x;
      node.label.position.y = machine.definition.height + 0.85;
      node.label.position.z = machine.position.z;
      node.selectionFrame.isVisible = machine.instanceId === selectedMachineIdRef.current;
      node.material.emissiveColor =
        machine.instanceId === selectedMachineIdRef.current ? new Color3(0.24, 0.2, 0.05) : Color3.Black();
    });
  }, [placedMachines]);

  return <canvas className="scene-canvas" ref={canvasRef} aria-label="AtrVisu 3D workspace" />;
}
