export type MachineCategory =
  | "Packaging Machine"
  | "Conveyor"
  | "Robot Palletizer"
  | "High Level Palletizer"
  | "Stretch Wrapper"
  | "Pallet"
  | "Safety Fence";

export type ConnectionPoint = {
  id: string;
  label: string;
  x: number;
  y: number;
  z: number;
  direction: "north" | "south" | "east" | "west" | "up" | "down";
};

export type MachineDefinition = {
  id: string;
  name: string;
  category: MachineCategory;
  width: number;
  depth: number;
  height: number;
  defaultColor: string;
  connectionPoints: ConnectionPoint[];
};

export type PlacedMachine = {
  instanceId: string;
  definition: MachineDefinition;
  position: {
    x: number;
    z: number;
  };
  rotationY: number;
  flowDirection: "forward" | "reverse";
};

export type LayoutObject = {
  id: string;
  machineDefinitionId: string;
  name: string;
  category: MachineCategory;
  width: number;
  depth: number;
  height: number;
  positionX: number;
  positionZ: number;
  rotationY: number;
  defaultColor: string;
  flowDirection?: "forward" | "reverse";
};

export type AtrVisuLayout = {
  appName: "AtrVisu";
  version: 1;
  exportedAt: string;
  objects: LayoutObject[];
};
