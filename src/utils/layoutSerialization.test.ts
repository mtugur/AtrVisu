import { describe, expect, it } from "vitest";
import type { AtrVisuLayout, PlacedMachine } from "../types/machine";
import { createLayoutSnapshotFromMachines, placedMachinesFromLayout } from "./layoutSerialization";

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
    connectionPoints: []
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
    const layout = createLayoutSnapshotFromMachines([createMachine()], "2026-06-05T00:00:00.000Z");
    const object = layout.objects[0];

    expect(layout.unitSystem).toEqual({ canonicalUnit: "mm", renderUnit: "m", version: "1.0" });
    expect(object.widthMm).toBe(2876);
    expect(object.width).toBe(2.876);
    expect(object.positionMm).toEqual({ xMm: 1250, yMm: -2500 });
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
    expect(machine.positionMm).toEqual({ xMm: 1250, yMm: -2500 });
    expect(machine.rotationDeg).toBe(90);
  });
});
