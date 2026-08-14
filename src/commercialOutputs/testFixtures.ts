import type { MachineDefinition, PlacedMachine } from "../types/machine";
import { TECHNICAL_CSS_COLORS } from "../designSystem";

const machineDefinition = (
  id: string,
  name: string,
  dimensions: { widthMm: number; depthMm: number; heightMm: number },
  machineCode?: string
): MachineDefinition => ({
  id,
  name,
  category: "ATARA",
  widthMm: dimensions.widthMm,
  depthMm: dimensions.depthMm,
  heightMm: dimensions.heightMm,
  width: dimensions.widthMm / 1000,
  depth: dimensions.depthMm / 1000,
  height: dimensions.heightMm / 1000,
  defaultColor: TECHNICAL_CSS_COLORS.libraryDefault,
  connectionPoints: [],
  ataraMachineData: {
    identity: {
      manufacturer: "Atara Makine",
      isAtaraProduct: true,
      ...(machineCode ? { machineCode } : {}),
      productFamilyCode: id.split("-")[0],
      revision: "A"
    },
    physical: {
      widthMm: dimensions.widthMm,
      depthMm: dimensions.depthMm,
      heightMm: dimensions.heightMm,
      weightKg: machineCode ? 1200 : undefined
    },
    utilityRequirements: machineCode ? {
      electrical: { powerKw: 12.5, voltage: 400, phase: "3", frequencyHz: 50 },
      pneumatic: { pressureBar: 6, airConsumptionNlMin: 250, connectionSize: "G1/2" },
      network: { protocols: ["Profinet"] }
    } : undefined,
    maintenanceClearance: machineCode ? {
      frontMm: 800,
      backMm: 600,
      leftMm: 500,
      rightMm: 500,
      topMm: 400
    } : undefined
  }
});

export const FLOW_PACK_DEFINITION = machineDefinition(
  "packaging-flowpack-01",
  "Flow Pack Machine",
  { widthMm: 3600, depthMm: 1400, heightMm: 1800 },
  "FP-01"
);

export const CONVEYOR_DEFINITION = machineDefinition(
  "conveyor-belt-01",
  "Belt Conveyor",
  { widthMm: 5200, depthMm: 900, heightMm: 800 },
  "BC-01"
);

export const PALLETIZER_DEFINITION = machineDefinition(
  "robot-palletizer-01",
  "Robot Palletizer",
  { widthMm: 3200, depthMm: 3200, heightMm: 2700 }
);

export const placedMachine = (
  instanceId: string,
  definition: MachineDefinition,
  xMm: number,
  yMm: number,
  rotationDeg = 0
): PlacedMachine => ({
  instanceId,
  libraryId: "atara-standard",
  machineDefinitionId: definition.id,
  definition,
  definitionSnapshot: definition,
  position: { x: xMm / 1000, z: yMm / 1000 },
  positionMm: { xMm, yMm },
  referencePoint: "front-left-bottom",
  coordinateReferenceVersion: "front-left-bottom-v1",
  elevationMm: 0,
  rotationDeg,
  rotationY: rotationDeg,
  flowDirection: "forward"
});

export const commercialOutputFixtureInput = () => ({
  metadata: {
    projectId: "project-1",
    projectName: "ATARA Line / 01",
    layoutId: "layout-1",
    layoutName: "Production: West",
    revisionId: "revision-1",
    revision: "R1"
  },
  machines: [
    placedMachine("flow-1", FLOW_PACK_DEFINITION, -2000, -1000, 0),
    placedMachine("conveyor-1", CONVEYOR_DEFINITION, 2000, 0, 90),
    placedMachine("conveyor-2", CONVEYOR_DEFINITION, 6000, 2000, 27),
    placedMachine("palletizer-1", PALLETIZER_DEFINITION, 12000, -1500, 0)
  ],
  civilReferences: [{
    id: "walkway-1",
    type: "walkway" as const,
    name: "Operator Walkway",
    positionMm: { xMm: -3000, yMm: -2500 },
    referencePoint: "front-left-bottom" as const,
    coordinateReferenceVersion: "front-left-bottom-v1" as const,
    sizeMm: { widthMm: 18000, depthMm: 800 },
    rotationDeg: 0,
    visible: true,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z"
  }],
  layers: [{
    id: "default",
    name: "Default",
    visible: true,
    locked: false,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z"
  }],
  groups: [{
    id: "group-1",
    name: "Packaging Cell",
    objectIds: ["machine:flow-1", "conveyor-1"],
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z"
  }],
  now: () => new Date("2026-08-14T10:20:30.000Z")
});
