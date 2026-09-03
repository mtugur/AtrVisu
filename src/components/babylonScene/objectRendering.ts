import type { MachineDefinition, PlacedMachine } from "../../types/machine";
import { getMachineDimensionsMeters } from "../../utils/machineDimensions";
import { mmToMeters } from "../../utils/units";

export const getMachineVerticalRenderPositions = (
  machine: Pick<PlacedMachine, "definition" | "elevationMm">
) => {
  const { height } = getMachineDimensionsMeters(machine.definition);
  const elevation = mmToMeters(machine.elevationMm ?? 0);
  return { centerY: elevation + height / 2, labelY: elevation + height + 0.85 };
};

export type PlaceholderVisualPart =
  | {
      kind: "box";
      suffix: string;
      size: {
        width: number;
        depth: number;
        height: number;
      };
      position: {
        x: number;
        y: number;
        z: number;
      };
      rotation?: {
        x: number;
        y: number;
        z: number;
      };
    }
  | {
      kind: "cylinder";
      suffix: string;
      size: {
        diameter: number;
        height: number;
      };
      position: {
        x: number;
        y: number;
        z: number;
      };
      rotation?: {
        x: number;
        y: number;
        z: number;
      };
    };

const box = (
  suffix: string,
  width: number,
  depth: number,
  height: number,
  x = 0,
  y = 0,
  z = 0,
  rotation?: { x: number; y: number; z: number }
): PlaceholderVisualPart => ({
  kind: "box",
  suffix,
  size: { width, depth, height },
  position: { x, y, z },
  ...(rotation ? { rotation } : {})
});

const cylinder = (
  suffix: string,
  diameter: number,
  height: number,
  x = 0,
  y = 0,
  z = 0,
  rotation?: { x: number; y: number; z: number }
): PlaceholderVisualPart => ({
  kind: "cylinder",
  suffix,
  size: { diameter, height },
  position: { x, y, z },
  ...(rotation ? { rotation } : {})
});

export const getMachinePlaceholderVisualParts = (
  definition: MachineDefinition
): readonly PlaceholderVisualPart[] => {
  const { width, depth, height } = getMachineDimensionsMeters(definition);
  const type = definition.placeholderVisualType ?? "box-generic";

  switch (type) {
    case "conveyor-belt":
      return [
        box("conveyor-body", width, depth, Math.max(0.16, height * 0.35), 0, 0, 0),
        box("conveyor-belt", width * 0.92, depth * 0.72, 0.035, 0, height * 0.2, 0)
      ];
    case "conveyor-roller":
      return [
        box("roller-frame", width, depth, Math.max(0.14, height * 0.28), 0, 0, 0),
        ...Array.from({ length: 5 }, (_, index) =>
          cylinder(
            "roller",
            Math.max(0.08, depth * 0.08),
            depth * 0.82,
            ((index - 2) * width) / 6,
            height * 0.2,
            0,
            { x: Math.PI / 2, y: 0, z: 0 }
          )
        )
      ];
    case "elevator-vertical":
      return [
        box("elevator-tower", width * 0.45, depth * 0.55, height, 0, 0, 0),
        box("elevator-head", width * 0.75, depth * 0.75, height * 0.12, 0, height * 0.44, 0)
      ];
    case "elevator-inclined":
      return [
        box("inclined-base", width, depth * 0.55, height * 0.18, 0, -height * 0.3, 0),
        box("inclined-run", width * 0.92, depth * 0.42, height * 0.18, 0, 0, 0, {
          x: 0,
          y: 0,
          z: -Math.PI / 10
        })
      ];
    case "silo-cylinder":
      return [
        cylinder("silo", Math.min(width, depth), height * 0.88, 0, 0, 0),
        cylinder("silo-cone", Math.min(width, depth) * 0.82, height * 0.18, 0, -height * 0.46, 0)
      ];
    case "tank-cylinder":
      return [
        cylinder("tank", Math.min(depth, height), width * 0.88, 0, 0, 0, {
          x: 0,
          y: 0,
          z: Math.PI / 2
        })
      ];
    case "hopper":
      return [
        box("hopper-top", width, depth, height * 0.42, 0, height * 0.12, 0),
        box("hopper-bottom", width * 0.5, depth * 0.5, height * 0.36, 0, -height * 0.28, 0)
      ];
    case "forklift-proxy":
      return [
        box("forklift-body", width * 0.62, depth * 0.72, height * 0.42, -width * 0.08, -height * 0.12, 0),
        box("forklift-mast", width * 0.08, depth * 0.72, height * 0.85, width * 0.28, height * 0.08, 0),
        box("forklift-fork-a", width * 0.42, depth * 0.08, height * 0.04, width * 0.38, -height * 0.34, -depth * 0.18),
        box("forklift-fork-b", width * 0.42, depth * 0.08, height * 0.04, width * 0.38, -height * 0.34, depth * 0.18)
      ];
    case "pallet-proxy":
      return [
        box("pallet-deck", width, depth, height * 0.35, 0, height * 0.12, 0),
        box("pallet-runner-a", width, depth * 0.12, height * 0.28, 0, -height * 0.22, -depth * 0.32),
        box("pallet-runner-b", width, depth * 0.12, height * 0.28, 0, -height * 0.22, depth * 0.32)
      ];
    case "robot-cell":
      return [
        cylinder("robot-base", Math.min(width, depth) * 0.28, height * 0.18, 0, -height * 0.35, 0),
        box("robot-column", width * 0.16, depth * 0.16, height * 0.55, 0, -height * 0.02, 0),
        box("robot-arm", width * 0.62, depth * 0.14, height * 0.12, width * 0.16, height * 0.24, 0)
      ];
    case "wrapper-proxy":
      return [
        cylinder("wrapper-table", Math.min(width, depth) * 0.65, height * 0.16, 0, -height * 0.36, 0),
        box("wrapper-post", width * 0.12, depth * 0.12, height, width * 0.32, 0, 0)
      ];
    case "safety-fence":
      return [
        box("fence-panel", width, Math.max(0.04, depth * 0.25), height * 0.72, 0, 0, 0),
        box("fence-post-a", width * 0.04, depth, height, -width * 0.48, 0, 0),
        box("fence-post-b", width * 0.04, depth, height, width * 0.48, 0, 0)
      ];
    case "building-column":
      return [box("column", width, depth, height, 0, 0, 0)];
    case "building-wall":
      return [box("wall", width, Math.max(0.06, depth), height, 0, 0, 0)];
    case "platform":
      return [
        box("platform-deck", width, depth, height * 0.16, 0, height * 0.36, 0),
        box("platform-base", width * 0.12, depth * 0.12, height * 0.72, -width * 0.4, 0, -depth * 0.4),
        box("platform-base", width * 0.12, depth * 0.12, height * 0.72, width * 0.4, 0, depth * 0.4)
      ];
    case "electrical-panel":
      return [
        box("panel", width, Math.max(0.08, depth * 0.35), height, 0, 0, 0),
        box("panel-door", width * 0.78, Math.max(0.02, depth * 0.08), height * 0.72, 0, 0, -depth * 0.22)
      ];
    case "box-generic":
    default:
      return [box("generic", width, depth, height, 0, 0, 0)];
  }
};
