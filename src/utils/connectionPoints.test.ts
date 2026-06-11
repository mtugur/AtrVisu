import { describe, expect, it } from "vitest";
import type { MachineConnectionPoint } from "../types/ataraMachineData";
import type { MachineDefinition, PlacedMachine } from "../types/machine";
import {
  getConnectionPointDisplayLabel,
  getConnectionPointDirectionLabel,
  getConnectionPointAnchorPosition,
  getConnectionPointBoxLocalPositionMeters,
  getConnectionPointMarkerLabel,
  getConnectionPointShortLabel,
  getConnectionPointsByType,
  getConnectionPointsForObject,
  getConnectionPointWorldDirection,
  getConnectionPointWorldPosition,
  getNearestConnectionPoint,
  validateConnectionPointsForObject
} from "./connectionPoints";

const definition = (connectionPoints: MachineConnectionPoint[] = []): MachineDefinition => ({
  id: "machine",
  name: "Machine",
  category: "Conveyor",
  widthMm: 2000,
  depthMm: 1000,
  heightMm: 1200,
  width: 2,
  depth: 1,
  height: 1.2,
  defaultColor: "#aaaaaa",
  connectionPoints: [],
  capabilities: {
    canConvey: true,
    canPalletize: false,
    canWrap: false,
    hasFlowDirection: true
  },
  ataraMachineData: {
    connectionPoints
  }
});

const machine = (
  connectionPoints: MachineConnectionPoint[] = [],
  rotationDeg = 0
): PlacedMachine => {
  const itemDefinition = definition(connectionPoints);

  return {
    instanceId: "machine-1",
    machineDefinitionId: itemDefinition.id,
    definition: itemDefinition,
    definitionSnapshot: itemDefinition,
    position: { x: 1, z: 2 },
    positionMm: { xMm: 1000, yMm: 2000 },
    elevationMm: 100,
    rotationDeg,
    rotationY: rotationDeg,
    flowDirection: "forward"
  };
};

const point = {
  id: "out",
  name: "Product Out",
  type: "product-out" as const,
  positionMm: { xMm: 500, yMm: 0, zMm: 300 },
  direction: "x+" as const
};

describe("connection point helpers", () => {
  it("returns an empty array safely when no connection points exist", () => {
    expect(getConnectionPointsForObject(machine(undefined))).toEqual([]);
  });

  it("filters connection points by type", () => {
    const points = getConnectionPointsByType(machine([point, { ...point, id: "el", type: "electrical" }]), "electrical");
    expect(points.map((item) => item.id)).toEqual(["el"]);
  });

  it("transforms local to world position without rotation", () => {
    expect(getConnectionPointWorldPosition(machine([point]), point)).toEqual({ xMm: 1500, yMm: 2000, zMm: 400 });
  });

  it("converts bottom-based elevation to box-centered Babylon local position", () => {
    expect(getConnectionPointBoxLocalPositionMeters(machine([point]), {
      ...point,
      positionMm: { xMm: 500, yMm: -250, zMm: 0 }
    })).toEqual({ x: 0.5, y: -0.6, z: -0.25 });
    expect(getConnectionPointBoxLocalPositionMeters(machine([point]), {
      ...point,
      positionMm: { xMm: 500, yMm: -250, zMm: 1200 }
    })).toEqual({ x: 0.5, y: 0.6, z: -0.25 });
    expect(getConnectionPointBoxLocalPositionMeters(machine([point]), {
      ...point,
      positionMm: { xMm: 500, yMm: -250, zMm: 0 }
    }, 40)).toEqual({ x: 0.5, y: -0.56, z: -0.25 });
  });

  it("transforms local to world position with 90 degree rotation", () => {
    const world = getConnectionPointWorldPosition(machine([point], 90), point);
    expect(world.xMm).toBeCloseTo(1000);
    expect(world.yMm).toBeCloseTo(2500);
    expect(world.zMm).toBe(400);
  });

  it("transforms plan direction with rotation", () => {
    expect(getConnectionPointWorldDirection(machine([point], 90), point)).toBe("y+");
  });

  it("finds the nearest connection point", () => {
    const nearest: { point: MachineConnectionPoint; distanceMm: number } | null =
      getNearestConnectionPoint(machine([point]), { xMm: 1510, yMm: 2000, zMm: 400 });
    expect(nearest?.point.id).toBe("out");
  });

  it("creates marker and display labels", () => {
    expect(getConnectionPointMarkerLabel(point)).toBe("Product Out (OUT)");
    expect(getConnectionPointMarkerLabel({ ...point, name: "" })).toBe("OUT");
    expect(getConnectionPointShortLabel(point)).toBe("OUT");
    expect(getConnectionPointDirectionLabel("x+")).toBe("X+ facing");
    expect(getConnectionPointDisplayLabel(point)).toBe("Product Out (product-out, x+)");
  });

  it("diagnoses duplicate ids, missing conveyor flow points, and boundary warnings", () => {
    const diagnostics = validateConnectionPointsForObject(machine([
      point,
      { ...point, name: "Second", positionMm: { xMm: 2000, yMm: 800, zMm: 2000 } }
    ]));
    expect(diagnostics.warnings.join(" ")).toContain("Duplicate connection point id");
    expect(diagnostics.warnings.join(" ")).toContain("product-in");
    expect(diagnostics.warnings.join(" ")).toContain("outside machine footprint");
    expect(diagnostics.warnings.join(" ")).toContain("elevation is outside machine height");
  });

  it("does not warn for points inside the footprint and height", () => {
    const diagnostics = validateConnectionPointsForObject(machine([
      point,
      { ...point, id: "in", name: "Product In", type: "product-in", positionMm: { xMm: -500, yMm: 0, zMm: 300 } }
    ]));
    expect(diagnostics.warnings).toEqual([]);
  });

  it("calculates quick anchor helper positions", () => {
    expect(getConnectionPointAnchorPosition("frontLeft", { widthMm: 2000, depthMm: 1000 })).toEqual({
      xMm: -1000,
      yMm: -500
    });
  });

  it("falls back to legacy definition connection points", () => {
    const itemDefinition = {
      ...definition([]),
      ataraMachineData: undefined,
      connectionPoints: [
        { id: "start", label: "Start", x: -1, y: 0.5, z: 0, direction: "west" as const }
      ]
    };
    expect(getConnectionPointsForObject({
      ...machine([], 0),
      definition: itemDefinition,
      definitionSnapshot: itemDefinition
    })[0]).toMatchObject({
      id: "start",
      type: "product-in",
      positionMm: { xMm: -1000, yMm: 0, zMm: 500 },
      direction: "x-"
    });
  });
});
