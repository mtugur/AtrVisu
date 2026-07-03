import { describe, expect, it } from "vitest";
import {
  applyPositionSnap,
  applyRotationSnap,
  commitRotationAngle,
  createMachineInstanceId,
  duplicatePlacedMachine,
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
