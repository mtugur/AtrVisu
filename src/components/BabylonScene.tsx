import { useEffect, useRef } from "react";
import {
  ArcRotateCamera,
  Color3,
  Color4,
  DynamicTexture,
  Engine,
  HemisphericLight,
  Mesh,
  MeshBuilder,
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
};

type PlacedMachineNode = {
  box: Mesh;
  label: Mesh;
  labelTexture: DynamicTexture;
};

const hexToColor3 = (hex: string) => {
  return Color3.FromHexString(hex);
};

const createLabel = (scene: Scene, text: string, y: number) => {
  const texture = new DynamicTexture(`label-texture-${text}`, { width: 512, height: 128 }, scene);
  texture.hasAlpha = true;
  texture.drawText(text, null, 78, "bold 42px Arial", "#f8fbf6", "transparent", true, true);

  const material = new StandardMaterial(`label-material-${text}`, scene);
  material.diffuseTexture = texture;
  material.emissiveColor = new Color3(1, 1, 1);
  material.opacityTexture = texture;
  material.disableLighting = true;
  material.backFaceCulling = false;
  if (material.diffuseTexture) {
    material.diffuseTexture.wrapU = Texture.CLAMP_ADDRESSMODE;
    material.diffuseTexture.wrapV = Texture.CLAMP_ADDRESSMODE;
  }

  const label = MeshBuilder.CreatePlane(`label-${text}`, { width: 3.8, height: 0.95 }, scene);
  label.billboardMode = Mesh.BILLBOARDMODE_ALL;
  label.position.y = y;
  label.material = material;

  return { label, texture };
};

export function BabylonScene({ placedMachines }: BabylonSceneProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const sceneRef = useRef<Scene | null>(null);
  const machineNodesRef = useRef<Map<string, PlacedMachineNode>>(new Map());

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
    camera.attachControl(canvas, true);
    camera.lowerRadiusLimit = 12;
    camera.upperRadiusLimit = 78;
    camera.wheelPrecision = 35;
    camera.panningSensibility = 75;
    camera.useAutoRotationBehavior = true;
    camera.autoRotationBehavior!.idleRotationSpeed = 0.08;
    camera.autoRotationBehavior!.idleRotationWaitTime = 2500;

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

      const zLine = MeshBuilder.CreateBox(
        `grid-z-${i}`,
        { width: thickness, height: thickness, depth: GRID_SIZE * 2 },
        scene
      );
      zLine.position.x = i;
      zLine.material = material;
    }

    engine.runRenderLoop(() => {
      scene.render();
    });

    const handleResize = () => {
      engine.resize();
    };
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      machineNodesRef.current.forEach((node) => {
        node.labelTexture.dispose();
        node.label.dispose();
        node.box.dispose();
      });
      machineNodesRef.current.clear();
      sceneRef.current = null;
      scene.dispose();
      engine.dispose();
    };
  }, []);

  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) {
      return;
    }

    const activeIds = new Set(placedMachines.map((machine) => machine.instanceId));
    machineNodesRef.current.forEach((node, instanceId) => {
      if (!activeIds.has(instanceId)) {
        node.labelTexture.dispose();
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
      box.material = material;

      const { label, texture } = createLabel(scene, definition.name, definition.height + 0.85);
      label.position.x = position.x;
      label.position.z = position.z;

      machineNodesRef.current.set(instanceId, { box, label, labelTexture: texture });
    });
  }, [placedMachines]);

  return <canvas className="scene-canvas" ref={canvasRef} aria-label="AtrVisu 3D workspace" />;
}
