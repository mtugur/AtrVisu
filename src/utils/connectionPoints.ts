import type {
  AtaraConnectionDirection,
  AtaraConnectionPointType,
  MachineConnectionPoint
} from "../types/ataraMachineData";
import type { ConnectionPoint, PlacedMachine } from "../types/machine";
import { getMachineDimensionsMm } from "./machineDimensions";
import { normalizeAtaraMachineData } from "./ataraMachineData";
import { getMachinePlanPositionMm } from "./placement";

export const CONNECTION_POINT_TYPES: AtaraConnectionPointType[] = [
  "product-in",
  "product-out",
  "electrical",
  "pneumatic",
  "network",
  "aspiration",
  "dust-collection",
  "compressed-air",
  "other"
];

export const CONNECTION_POINT_DIRECTIONS: AtaraConnectionDirection[] = ["x+", "x-", "y+", "y-", "z+", "z-"];

export type ConnectionPointWorldPosition = {
  xMm: number;
  yMm: number;
  zMm: number;
};

export type ConnectionPointDiagnostics = {
  warnings: string[];
  errors: string[];
};

const directionShortLabels: Record<AtaraConnectionPointType, string> = {
  "product-in": "IN",
  "product-out": "OUT",
  electrical: "EL",
  pneumatic: "AIR",
  network: "NET",
  aspiration: "ASP",
  "dust-collection": "DUST",
  "compressed-air": "CA",
  other: "CP"
};

const typeDisplayLabels: Record<AtaraConnectionPointType, string> = {
  "product-in": "Product In",
  "product-out": "Product Out",
  electrical: "Electrical",
  pneumatic: "Pneumatic",
  network: "Network",
  aspiration: "Aspiration",
  "dust-collection": "Dust Collection",
  "compressed-air": "Compressed Air",
  other: "Connection Point"
};

const directionDisplayLabels: Record<AtaraConnectionDirection, string> = {
  "x+": "X+ facing",
  "x-": "X- facing",
  "y+": "Y+ facing",
  "y-": "Y- facing",
  "z+": "Z+ upward facing",
  "z-": "Z- downward facing"
};

const degToRad = (valueDeg: number) => (valueDeg * Math.PI) / 180;

const rotatePlan = (xMm: number, yMm: number, rotationDeg: number) => {
  const radians = degToRad(rotationDeg);
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);

  return {
    xMm: xMm * cos - yMm * sin,
    yMm: xMm * sin + yMm * cos
  };
};

const legacyDirectionToAtara = (direction: ConnectionPoint["direction"]): AtaraConnectionDirection => {
  switch (direction) {
    case "east":
      return "x+";
    case "west":
      return "x-";
    case "north":
      return "y+";
    case "south":
      return "y-";
    case "up":
      return "z+";
    case "down":
      return "z-";
    default:
      return "x+";
  }
};

const inferLegacyConnectionPointType = (point: ConnectionPoint): AtaraConnectionPointType => {
  const text = `${point.id} ${point.label}`.toLowerCase();
  if (text.includes("in") || text.includes("start")) {
    return "product-in";
  }
  if (text.includes("out") || text.includes("end")) {
    return "product-out";
  }
  return "other";
};

const legacyConnectionPointToAtara = (point: ConnectionPoint): MachineConnectionPoint => ({
  id: point.id,
  name: point.label,
  type: inferLegacyConnectionPointType(point),
  positionMm: {
    xMm: point.x * 1000,
    yMm: point.z * 1000,
    zMm: Math.max(0, point.y * 1000)
  },
  direction: legacyDirectionToAtara(point.direction)
});

export const getConnectionPointsForObject = (machine: PlacedMachine): MachineConnectionPoint[] => {
  const dimensions = getMachineDimensionsMm(machine.definitionSnapshot ?? machine.definition);
  const ataraPoints = normalizeAtaraMachineData(machine.definitionSnapshot.ataraMachineData, dimensions)?.connectionPoints;
  if (ataraPoints?.length) {
    return ataraPoints;
  }

  return (machine.definitionSnapshot.connectionPoints ?? machine.definition.connectionPoints ?? []).map(legacyConnectionPointToAtara);
};

export const getConnectionPointsByType = (
  machine: PlacedMachine,
  type: AtaraConnectionPointType
): MachineConnectionPoint[] => getConnectionPointsForObject(machine).filter((point) => point.type === type);

export const getConnectionPointLocalPosition = (point: MachineConnectionPoint): ConnectionPointWorldPosition => ({
  xMm: point.positionMm.xMm,
  yMm: point.positionMm.yMm,
  zMm: point.positionMm.zMm
});

export const getConnectionPointWorldPosition = (
  machine: PlacedMachine,
  point: MachineConnectionPoint
): ConnectionPointWorldPosition => {
  const machinePosition = getMachinePlanPositionMm(machine);
  const rotated = rotatePlan(point.positionMm.xMm, point.positionMm.yMm, machine.rotationDeg ?? machine.rotationY ?? 0);

  return {
    xMm: machinePosition.xMm + rotated.xMm,
    yMm: machinePosition.yMm + rotated.yMm,
    zMm: (machine.elevationMm ?? 0) + point.positionMm.zMm
  };
};

export const getConnectionPointWorldDirection = (
  machine: PlacedMachine,
  point: MachineConnectionPoint
): AtaraConnectionDirection => {
  if (point.direction === "z+" || point.direction === "z-") {
    return point.direction;
  }

  const vector = {
    "x+": { xMm: 1, yMm: 0 },
    "x-": { xMm: -1, yMm: 0 },
    "y+": { xMm: 0, yMm: 1 },
    "y-": { xMm: 0, yMm: -1 }
  }[point.direction];
  const rotated = rotatePlan(vector.xMm, vector.yMm, machine.rotationDeg ?? machine.rotationY ?? 0);

  if (Math.abs(rotated.xMm) >= Math.abs(rotated.yMm)) {
    return rotated.xMm >= 0 ? "x+" : "x-";
  }

  return rotated.yMm >= 0 ? "y+" : "y-";
};

export const getNearestConnectionPoint = (
  machine: PlacedMachine,
  positionMm: { xMm: number; yMm: number; zMm?: number },
  type?: AtaraConnectionPointType
): { point: MachineConnectionPoint; distanceMm: number } | null => {
  const points = type ? getConnectionPointsByType(machine, type) : getConnectionPointsForObject(machine);
  let nearest: { point: MachineConnectionPoint; distanceMm: number } | null = null;

  points.forEach((point) => {
    const world = getConnectionPointWorldPosition(machine, point);
    const distanceMm = Math.hypot(
      world.xMm - positionMm.xMm,
      world.yMm - positionMm.yMm,
      world.zMm - (positionMm.zMm ?? world.zMm)
    );

    if (!nearest || distanceMm < nearest.distanceMm) {
      nearest = { point, distanceMm };
    }
  });

  return nearest;
};

export const getConnectionPointMarkerLabel = (point: MachineConnectionPoint) =>
  point.name.trim()
    ? `${point.name.trim()} (${directionShortLabels[point.type] ?? "CP"})`
    : directionShortLabels[point.type] ?? "CP";

export const getConnectionPointShortLabel = (point: MachineConnectionPoint) =>
  directionShortLabels[point.type] ?? "CP";

export const getConnectionPointTypeLabel = (type: AtaraConnectionPointType) =>
  typeDisplayLabels[type] ?? typeDisplayLabels.other;

export const getConnectionPointDirectionLabel = (direction: AtaraConnectionDirection) =>
  directionDisplayLabels[direction] ?? direction;

export const getConnectionPointDisplayLabel = (point: MachineConnectionPoint) =>
  `${point.name} (${point.type}, ${point.direction})`;

export const getConnectionPointAnchorPosition = (
  anchor:
    | "center"
    | "leftCenter"
    | "rightCenter"
    | "frontCenter"
    | "backCenter"
    | "frontLeft"
    | "frontRight"
    | "backLeft"
    | "backRight",
  dimensionsMm: { widthMm: number; depthMm: number }
) => {
  const left = -dimensionsMm.widthMm / 2;
  const right = dimensionsMm.widthMm / 2;
  const front = -dimensionsMm.depthMm / 2;
  const back = dimensionsMm.depthMm / 2;

  switch (anchor) {
    case "leftCenter":
      return { xMm: left, yMm: 0 };
    case "rightCenter":
      return { xMm: right, yMm: 0 };
    case "frontCenter":
      return { xMm: 0, yMm: front };
    case "backCenter":
      return { xMm: 0, yMm: back };
    case "frontLeft":
      return { xMm: left, yMm: front };
    case "frontRight":
      return { xMm: right, yMm: front };
    case "backLeft":
      return { xMm: left, yMm: back };
    case "backRight":
      return { xMm: right, yMm: back };
    case "center":
    default:
      return { xMm: 0, yMm: 0 };
  }
};

export const validateConnectionPointsForObject = (machine: PlacedMachine): ConnectionPointDiagnostics => {
  const warnings: string[] = [];
  const errors: string[] = [];
  const points = getConnectionPointsForObject(machine);
  const ids = new Set<string>();
  const dimensions = getMachineDimensionsMm(machine.definitionSnapshot ?? machine.definition);
  const halfWidth = dimensions.widthMm / 2;
  const halfDepth = dimensions.depthMm / 2;

  points.forEach((point, index) => {
    if (!point.id.trim()) {
      errors.push(`Connection point ${index + 1} is missing an id.`);
    }
    if (ids.has(point.id)) {
      warnings.push(`Duplicate connection point id "${point.id}".`);
    }
    ids.add(point.id);
    if (!point.name.trim()) {
      errors.push(`Connection point "${point.id}" is missing a name.`);
    }
    if (!CONNECTION_POINT_TYPES.includes(point.type)) {
      errors.push(`Connection point "${point.id}" has an invalid type.`);
    }
    if (!CONNECTION_POINT_DIRECTIONS.includes(point.direction)) {
      errors.push(`Connection point "${point.id}" has an invalid direction.`);
    }
    if (
      !Number.isFinite(point.positionMm.xMm) ||
      !Number.isFinite(point.positionMm.yMm) ||
      !Number.isFinite(point.positionMm.zMm)
    ) {
      errors.push(`Connection point "${point.id}" has an invalid position.`);
    }
    if (Math.abs(point.positionMm.xMm) > halfWidth || Math.abs(point.positionMm.yMm) > halfDepth) {
      warnings.push(`Connection point "${point.id}" is outside machine footprint.`);
    }
    if (point.positionMm.zMm < 0 || point.positionMm.zMm > dimensions.heightMm) {
      warnings.push(`Connection point "${point.id}" elevation is outside machine height.`);
    }
  });

  const isConveyorLike =
    machine.definition.capabilities?.canConvey ||
    machine.definition.capabilities?.hasFlowDirection ||
    machine.definition.category.toLowerCase().includes("conveyor");
  if (isConveyorLike && points.length > 0) {
    if (!points.some((point) => point.type === "product-in")) {
      warnings.push("Conveyor-like machine has no product-in connection point.");
    }
    if (!points.some((point) => point.type === "product-out")) {
      warnings.push("Conveyor-like machine has no product-out connection point.");
    }
  }

  return { warnings, errors };
};
