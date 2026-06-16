import { describe, expect, it } from "vitest";
import type { AtrVisuLayout, PlacedMachine } from "../types/machine";
import { getMachineRenderCenterMm } from "./coordinateReference";
import { annotationsFromLayout, civilReferencesFromLayout, createLayoutSnapshotFromMachines, groupsFromLayout, layersFromLayout, placedMachinesFromLayout, viewpointsFromLayout } from "./layoutSerialization";

const createMachine = (): PlacedMachine => ({
  instanceId: "machine-1",
  libraryId: "project-custom",
  machineDefinitionId: "forklift-test",
  definitionSnapshot: {
    id: "forklift-test",
    name: "Forklift Test",
    category: "Material Handling",
    machineType: "Forklift",
    placeholderVisualType: "forklift-proxy",
    widthMm: 2876,
    depthMm: 1200,
    heightMm: 2100,
    width: 2.876,
    depth: 1.2,
    height: 2.1,
    defaultColor: "#f0a23a",
    connectionPoints: [],
      ataraMachineData: {
        identity: {
          atrId: "ATR-LAYOUT",
          machineCode: "FORKLIFT-TEST"
        },
      physical: {
        widthMm: 2876,
        depthMm: 1200,
          heightMm: 2100,
          weightKg: 1500
        },
        connectionPoints: [
          {
            id: "electrical-1",
            name: "Electrical",
            type: "electrical",
            positionMm: { xMm: 100, yMm: -200, zMm: 900 },
            direction: "x+"
          }
        ]
      }
  },
  definition: {
    id: "forklift-test",
    name: "Forklift Test",
    category: "Material Handling",
    machineType: "Forklift",
    placeholderVisualType: "forklift-proxy",
    widthMm: 2876,
    depthMm: 1200,
    heightMm: 2100,
    width: 2.876,
    depth: 1.2,
    height: 2.1,
    defaultColor: "#f0a23a",
    connectionPoints: []
  },
  position: { x: 1.25, z: -2.5 },
  positionMm: { xMm: 1250, yMm: -2500 },
  elevationMm: 0,
  rotationDeg: 45,
  rotationY: 45,
  flowDirection: "forward"
});

describe("layout serialization", () => {
  it("exports unit metadata and preserves millimeter dimensions", () => {
    const layout = createLayoutSnapshotFromMachines(
      [createMachine()],
      "2026-06-05T00:00:00.000Z",
      [{
        id: "annotation-1",
        type: "warning",
        text: "Leave 800 mm maintenance space",
        positionMm: { xMm: -200, yMm: 350, zMm: 1600 },
        targetObjectId: "machine-1",
        style: { sizeScale: 8, emphasis: "critical", background: true }
      }],
      [{
        id: "viewpoint-1",
        name: "Overview",
        camera: {
          alpha: 0.8,
          beta: 1.1,
          radius: 32,
          targetX: 1,
          targetY: 0,
          targetZ: -2,
          mode: "perspective"
        },
        displayState: {
          showAnnotations: true,
          selectedObjectIds: ["machine-1"]
        },
        createdAt: "2026-06-05T00:00:00.000Z",
        updatedAt: "2026-06-05T00:00:00.000Z"
      }],
      [
        { id: "process", name: "Process", visible: true, locked: false, createdAt: "2026-06-05T00:00:00.000Z", updatedAt: "2026-06-05T00:00:00.000Z" }
      ],
      [
        { id: "group-1", name: "Packaging Line", objectIds: ["machine-1"], createdAt: "2026-06-05T00:00:00.000Z", updatedAt: "2026-06-05T00:00:00.000Z" }
      ],
      [
        {
          id: "civil-column-1",
          type: "column",
          name: "Grid Column A1",
          positionMm: { xMm: -1000, yMm: 2000, zMm: 0 },
          sizeMm: { widthMm: 600, depthMm: 600, heightMm: 3200 },
          rotationDeg: 0,
          layerId: "process",
          locked: false,
          createdAt: "2026-06-05T00:00:00.000Z",
          updatedAt: "2026-06-05T00:00:00.000Z"
        }
      ]
    );
    const object = layout.objects[0];

    expect(layout.unitSystem).toEqual({ canonicalUnit: "mm", renderUnit: "m", version: "1.0" });
    expect(object.widthMm).toBe(2876);
    expect(object.width).toBe(2.876);
    expect(object.positionMm).toEqual({ xMm: 1250, yMm: -2500 });
    expect(object.collisionEnvelope).toEqual({
      widthMm: 2876,
      depthMm: 1200,
      heightMm: 2100,
      offsetMm: { xMm: 0, yMm: 0, zMm: 0 },
      enabled: true
    });
    expect(object.definitionSnapshot?.ataraMachineData?.identity?.atrId).toBe("ATR-LAYOUT");
    expect(object.definitionSnapshot?.ataraMachineData?.physical?.weightKg).toBe(1500);
    expect(object.definitionSnapshot?.ataraMachineData?.connectionPoints?.[0].id).toBe("electrical-1");
    expect(layout.annotations?.[0]).toMatchObject({
      id: "annotation-1",
      text: "Leave 800 mm maintenance space",
      targetObjectId: "machine-1",
      layerId: "default"
    });
    expect(layout.layers?.map((layer) => layer.id)).toEqual(["default", "process"]);
    expect(layout.groups?.[0]).toMatchObject({ id: "group-1", name: "Packaging Line", objectIds: ["machine-1"] });
    expect(layout.civilReferences?.[0]).toMatchObject({
      id: "civil-column-1",
      layerId: "process",
      positionMm: { xMm: -1000, yMm: 2000, zMm: 0 }
    });
    expect(annotationsFromLayout(layout)[0]).toMatchObject({
      positionMm: { xMm: -200, yMm: 350, zMm: 1600 },
      targetObjectId: "machine-1",
      style: { sizeScale: 8 }
    });
    expect(viewpointsFromLayout(layout)[0]).toMatchObject({
      id: "viewpoint-1",
      name: "Overview",
      camera: {
        alpha: 0.8,
        beta: 1.1,
        radius: 32,
        targetX: 1,
        targetY: 0,
        targetZ: -2
      },
      displayState: {
        showAnnotations: true,
        selectedObjectIds: ["machine-1"]
      }
    });
    expect(groupsFromLayout(layout, placedMachinesFromLayout(layout), layersFromLayout(layout))[0]).toMatchObject({
      name: "Packaging Line",
      objectIds: ["machine-1"]
    });
    expect(civilReferencesFromLayout(layout, layersFromLayout(layout))[0]).toMatchObject({
      name: "Grid Column A1",
      sizeMm: { widthMm: 600, depthMm: 600, heightMm: 3200 }
    });
  });

  it("normalizes legacy layouts without unit metadata", () => {
    const legacyLayout: AtrVisuLayout = {
      appName: "AtrVisu",
      version: 1,
      exportedAt: "2026-06-05T00:00:00.000Z",
      objects: [
        {
          id: "legacy-1",
          machineDefinitionId: "legacy-machine",
          name: "Legacy Machine",
          category: "Conveyor",
          width: 2.876,
          depth: 0.76,
          height: 0.5,
          positionX: 1.25,
          positionZ: -2.5,
          rotationY: 90,
          defaultColor: "#ffffff"
        }
      ]
    };

    const [machine] = placedMachinesFromLayout(legacyLayout);

    expect(machine.definition.widthMm).toBe(2876);
    expect(machine.definition.depthMm).toBe(760);
    expect(machine.definition.collisionEnvelope).toEqual({
      widthMm: 2876,
      depthMm: 760,
      heightMm: 500,
      offsetMm: { xMm: 0, yMm: 0, zMm: 0 },
      enabled: true
    });
    expect(machine.positionMm).toEqual({ xMm: 1630, yMm: -3938 });
    expect(getMachineRenderCenterMm(machine).xMm).toBeCloseTo(1250);
    expect(getMachineRenderCenterMm(machine).yMm).toBeCloseTo(-2500);
    expect(machine.rotationDeg).toBe(90);
    expect(machine.layerId).toBe("default");
    expect(layersFromLayout(legacyLayout)[0].id).toBe("default");
    expect(groupsFromLayout(legacyLayout, [machine], layersFromLayout(legacyLayout))).toEqual([]);
    expect(viewpointsFromLayout(legacyLayout)).toEqual([]);
    expect(civilReferencesFromLayout(legacyLayout, layersFromLayout(legacyLayout))).toEqual([]);
  });

  it("normalizes imported Default layer as visible and unlocked", () => {
    const layout: AtrVisuLayout = {
      appName: "AtrVisu",
      version: 1,
      exportedAt: "2026-06-05T00:00:00.000Z",
      layers: [
        { id: "default", name: "Default", visible: false, locked: true, createdAt: "now", updatedAt: "now" },
        { id: "process", name: "Process", visible: false, locked: true, createdAt: "now", updatedAt: "now" }
      ],
      objects: [],
      annotations: [
        {
          id: "annotation-1",
          type: "note",
          text: "Legacy annotation",
          positionMm: { xMm: 0, yMm: 0, zMm: 1600 }
        }
      ]
    };

    expect(layersFromLayout(layout)[0]).toMatchObject({
      id: "default",
      visible: true,
      locked: false,
      systemLayer: true
    });
    expect(annotationsFromLayout(layout)[0].layerId).toBe("default");
  });
});
