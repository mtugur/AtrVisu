import { describe, expect, it } from "vitest";
import {
  applyPositionSnap,
  applyRotationSnap,
  calculateReferencePointMeasurementBetweenMachines,
  calculateMeasurementBetweenMachines,
  commitRotationAngle,
  createMachineInstanceId,
  duplicatePlacedMachine,
  duplicatePlacedMachines,
  distanceBetweenPlanPositionsMm,
  getRotationNudgeStepDeg,
  normalizeRotationDeg,
  snapDeg,
  snapMm
} from "./placement";
import { DEFAULT_PLACEMENT_SETTINGS, normalizePlacementSettings } from "./placementSettings";
import type { MachineDefinition, PlacedMachine } from "../types/machine";

const definition: MachineDefinition = {
  id: "machine",
  name: "Machine",
  category: "Test",
  width: 1,
  depth: 1,
  height: 1,
  widthMm: 1000,
  depthMm: 1000,
  heightMm: 1000,
  defaultColor: "#aaaaaa",
  connectionPoints: [],
  capabilities: {
    canConvey: true,
    canPalletize: false,
    canWrap: false,
    hasFlowDirection: true
  }
};

const placedMachine = (overrides: Partial<PlacedMachine> = {}): PlacedMachine => ({
  instanceId: "machine-1",
  libraryId: "project-custom",
  machineDefinitionId: definition.id,
  definition,
  definitionSnapshot: {
    ...definition,
    ataraMachineData: {
      identity: { atrId: "ATR-01" }
    }
  },
  layerId: "layer-1",
  position: { x: 1, z: -2 },
  positionMm: { xMm: 1000, yMm: -2000 },
  referencePoint: "front-left-bottom",
  coordinateReferenceVersion: "front-left-bottom-v1",
  elevationMm: 120,
  rotationY: 90,
  rotationDeg: 90,
  flowDirection: "reverse",
  ...overrides
});

describe("placement helpers", () => {
  it("snaps millimeter values to the nearest grid step", () => {
    expect(snapMm(2876, 100)).toBe(2900);
  });

  it("preserves millimeter precision when the step is 1 mm", () => {
    expect(snapMm(2876, 1)).toBe(2876);
  });

  it("returns original position when grid snap is disabled", () => {
    const position = { xMm: 2876, yMm: -1224 };

    expect(applyPositionSnap(position, { ...DEFAULT_PLACEMENT_SETTINGS, gridSnapEnabled: false })).toEqual(position);
  });

  it("snaps rotation to degree steps", () => {
    expect(snapDeg(92, 15)).toBe(90);
    expect(applyRotationSnap(88, DEFAULT_PLACEMENT_SETTINGS)).toBe(90);
  });

  it("snaps rotation to 45 degree steps", () => {
    expect(snapDeg(50, 45)).toBe(45);
    expect(snapDeg(70, 45)).toBe(90);
    expect(snapDeg(135, 45)).toBe(135);
  });

  it("uses rotation snap step for plus/minus nudges when enabled", () => {
    expect(getRotationNudgeStepDeg({ ...DEFAULT_PLACEMENT_SETTINGS, rotationSnapStepDeg: 45 })).toBe(45);
    expect(applyRotationSnap(90 + getRotationNudgeStepDeg({ ...DEFAULT_PLACEMENT_SETTINGS, rotationSnapStepDeg: 45 }), {
      ...DEFAULT_PLACEMENT_SETTINGS,
      rotationSnapStepDeg: 45
    })).toBe(135);
  });

  it("uses one degree plus/minus nudges when rotation snap is disabled", () => {
    expect(getRotationNudgeStepDeg({ ...DEFAULT_PLACEMENT_SETTINGS, rotationSnapEnabled: false })).toBe(1);
  });

  it("commits manual rotation with snap enabled or disabled", () => {
    expect(commitRotationAngle(50, { ...DEFAULT_PLACEMENT_SETTINGS, rotationSnapStepDeg: 45 })).toBe(45);
    expect(commitRotationAngle(50, { ...DEFAULT_PLACEMENT_SETTINGS, rotationSnapEnabled: false })).toBe(50);
  });

  it("normalizes rotation degrees into 0..359", () => {
    expect(normalizeRotationDeg(450)).toBe(90);
    expect(normalizeRotationDeg(-90)).toBe(270);
  });

  it("calculates plan distance in millimeters", () => {
    expect(distanceBetweenPlanPositionsMm({ xMm: 0, yMm: 0 }, { xMm: 3000, yMm: 4000 })).toBe(5000);
  });

  it("calculates deterministic reference-point measurement between placed machines", () => {
    expect(calculateReferencePointMeasurementBetweenMachines(
      placedMachine({ instanceId: "a", position: { x: -1.25, z: 2 }, positionMm: { xMm: -1250, yMm: 2000 } }),
      placedMachine({ instanceId: "b", position: { x: 2.75, z: -1 }, positionMm: { xMm: 2750, yMm: -1000 } })
    )).toEqual({
      objectAId: "a",
      objectBId: "b",
      deltaXMm: 4000,
      deltaYMm: -3000,
      referencePointDistanceMm: 5000,
      referencePointDistanceMeters: 5
    });
  });

  it("falls back to meter position when reference-point positionMm is missing", () => {
    expect(calculateReferencePointMeasurementBetweenMachines(
      placedMachine({ instanceId: "a", position: { x: -1.5, z: -2.25 }, positionMm: undefined }),
      placedMachine({ instanceId: "b", position: { x: 1.5, z: 1.75 }, positionMm: undefined })
    )).toMatchObject({
      deltaXMm: 3000,
      deltaYMm: 4000,
      referencePointDistanceMm: 5000,
      referencePointDistanceMeters: 5
    });
  });

  it("keeps existing machine measurement output consistent between millimeters and meters", () => {
    const measurement = calculateMeasurementBetweenMachines(
      placedMachine({ instanceId: "a", position: { x: -1.5, z: -2.25 }, positionMm: undefined }),
      placedMachine({ instanceId: "b", position: { x: 1.5, z: 1.75 }, positionMm: undefined })
    );

    expect(measurement.deltaXMm).toBe(3000);
    expect(measurement.deltaYMm).toBe(4000);
    expect(measurement.distanceMm).toBe(5000);
    expect(measurement.distanceMeters).toBe(5);
  });

  it("creates a unique machine instance id from the existing project ids", () => {
    expect(createMachineInstanceId("machine", ["machine-seed", "machine-seed-1"], "seed")).toBe("machine-seed-2");
  });

  it("duplicates a placed machine with a new id and deterministic plan offset", () => {
    const source = placedMachine();
    const duplicate = duplicatePlacedMachine(source, {
      instanceId: "machine-copy",
      offsetMm: 250
    });

    expect(duplicate.instanceId).toBe("machine-copy");
    expect(duplicate.positionMm).toEqual({ xMm: 1250, yMm: -1750 });
    expect(duplicate.position).toEqual({ x: 1.25, z: -1.75 });
    expect(duplicate.libraryId).toBe(source.libraryId);
    expect(duplicate.machineDefinitionId).toBe(source.machineDefinitionId);
    expect(duplicate.definitionSnapshot).toEqual(source.definitionSnapshot);
    expect(duplicate.rotationDeg).toBe(90);
    expect(duplicate.rotationY).toBe(90);
    expect(duplicate.layerId).toBe("layer-1");
    expect(duplicate.flowDirection).toBe("reverse");
    expect(duplicate.elevationMm).toBe(120);
  });

  it("duplicates a selected machine pack with unique ids and preserved relative offsets", () => {
    const sourceA = placedMachine({
      instanceId: "a",
      position: { x: -1, z: -2 },
      positionMm: { xMm: -1000, yMm: -2000 }
    });
    const sourceB = placedMachine({
      instanceId: "b",
      position: { x: 0.5, z: 0.75 },
      positionMm: { xMm: 500, yMm: 750 },
      rotationDeg: 180,
      rotationY: 180,
      flowDirection: "forward"
    });

    const duplicates = duplicatePlacedMachines([sourceA, sourceB], {
      existingInstanceIds: ["machine-copy", "machine-copy-1"],
      offsetMm: 250,
      createSeed: () => "copy"
    });

    expect(duplicates.map((machine) => machine.instanceId)).toEqual(["machine-copy-2", "machine-copy-3"]);
    expect(duplicates.map((machine) => machine.positionMm)).toEqual([
      { xMm: -750, yMm: -1750 },
      { xMm: 750, yMm: 1000 }
    ]);
    expect(duplicates[1].positionMm!.xMm - duplicates[0].positionMm!.xMm).toBe(
      sourceB.positionMm!.xMm - sourceA.positionMm!.xMm
    );
    expect(duplicates[1].positionMm!.yMm - duplicates[0].positionMm!.yMm).toBe(
      sourceB.positionMm!.yMm - sourceA.positionMm!.yMm
    );
    expect(duplicates[0]).toMatchObject({
      libraryId: sourceA.libraryId,
      machineDefinitionId: sourceA.machineDefinitionId,
      definitionSnapshot: sourceA.definitionSnapshot,
      layerId: sourceA.layerId,
      referencePoint: sourceA.referencePoint,
      coordinateReferenceVersion: sourceA.coordinateReferenceVersion,
      elevationMm: sourceA.elevationMm,
      rotationDeg: sourceA.rotationDeg,
      rotationY: sourceA.rotationY,
      flowDirection: sourceA.flowDirection
    });
    expect(duplicates[1].rotationDeg).toBe(180);
    expect(duplicates[1].flowDirection).toBe("forward");
    expect(sourceA.positionMm).toEqual({ xMm: -1000, yMm: -2000 });
    expect(sourceB.positionMm).toEqual({ xMm: 500, yMm: 750 });
  });

  it("normalizes invalid placement settings safely", () => {
    expect(
      normalizePlacementSettings({
        gridSnapEnabled: "yes",
        gridSnapStepMm: -10,
        rotationSnapEnabled: false,
        rotationSnapStepDeg: 720,
        showMeasurementHelpers: "no"
      })
    ).toEqual({
      gridSnapEnabled: true,
      gridSnapStepMm: 100,
      rotationSnapEnabled: false,
      rotationSnapStepDeg: 15,
      showMeasurementHelpers: true
    });
  });
});
