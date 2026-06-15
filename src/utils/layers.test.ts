import { describe, expect, it } from "vitest";
import type { AnnotationObject } from "../types/annotations";
import type { MachineDefinition, PlacedMachine } from "../types/machine";
import {
  createDefaultLayer,
  deleteLayerAndReassignItems,
  getLayerId,
  isLayerLocked,
  isLayerVisible,
  isolateLayer,
  normalizeLayers,
  showAllLayers
} from "./layers";

const definition: MachineDefinition = {
  id: "machine",
  name: "Machine",
  category: "Packaging",
  width: 1,
  depth: 1,
  height: 1,
  widthMm: 1000,
  depthMm: 1000,
  heightMm: 1000,
  defaultColor: "#ffffff",
  connectionPoints: []
};

const machine = (layerId?: string): PlacedMachine => ({
  instanceId: "machine-1",
  machineDefinitionId: definition.id,
  definition,
  definitionSnapshot: definition,
  layerId,
  position: { x: 0, z: 0 },
  positionMm: { xMm: 0, yMm: 0 },
  rotationY: 0,
  rotationDeg: 0,
  flowDirection: "forward"
});

const annotation = (layerId?: string): AnnotationObject => ({
  id: "annotation-1",
  type: "note",
  text: "Note",
  layerId,
  positionMm: { xMm: 0, yMm: 0, zMm: 1600 }
});

describe("layers", () => {
  it("creates a default system layer for missing or invalid input", () => {
    const layers = normalizeLayers(undefined);
    expect(layers[0]).toMatchObject({
      id: "default",
      name: "Default",
      visible: true,
      locked: false,
      systemLayer: true
    });
  });

  it("forces Default to remain visible, unlocked, and system-owned", () => {
    const layers = normalizeLayers([
      { id: "default", name: "Hidden Default", visible: false, locked: true, systemLayer: false },
      { id: "process", name: "Process", visible: true, locked: false }
    ]);

    expect(layers[0]).toMatchObject({
      id: "default",
      name: "Default",
      visible: true,
      locked: false,
      systemLayer: true
    });
  });

  it("resolves missing or orphan layer ids to Default", () => {
    const layers = normalizeLayers([{ id: "process", name: "Process", visible: false, locked: true }]);

    expect(getLayerId(undefined, layers)).toBe("default");
    expect(getLayerId("missing", layers)).toBe("default");
    expect(isLayerVisible("process", layers)).toBe(false);
    expect(isLayerLocked("process", layers)).toBe(true);
  });

  it("deletes a non-system layer and reassigns items to Default", () => {
    const layers = normalizeLayers([{ id: "process", name: "Process", visible: true, locked: false }]);
    const result = deleteLayerAndReassignItems(layers, [machine("process")], [annotation("process")], "process");

    expect(result.layers.map((layer) => layer.id)).toEqual(["default"]);
    expect(result.machines[0].layerId).toBe("default");
    expect(result.annotations[0].layerId).toBe("default");
  });

  it("does not delete Default through layer reassignment", () => {
    const layers = normalizeLayers([{ id: "process", name: "Process", visible: true, locked: false }]);
    const result = deleteLayerAndReassignItems(layers, [machine()], [annotation()], "default");

    expect(result.layers.map((layer) => layer.id)).toEqual(["default", "process"]);
    expect(result.machines[0].layerId).toBeUndefined();
    expect(result.annotations[0].layerId).toBeUndefined();
  });

  it("isolates one layer and can show all layers again", () => {
    const layers = normalizeLayers([
      { id: "process", name: "Process", visible: true, locked: false },
      { id: "civil", name: "Civil", visible: true, locked: false }
    ]);

    const isolated = isolateLayer(layers, "process");
    expect(isLayerVisible("default", isolated)).toBe(true);
    expect(isLayerVisible("process", isolated)).toBe(true);
    expect(isLayerVisible("civil", isolated)).toBe(false);

    const restored = showAllLayers(isolated);
    expect(restored.every((layer) => layer.visible)).toBe(true);
  });
});
