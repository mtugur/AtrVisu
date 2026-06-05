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

export type VisualModelDefinition = {
  modelPath: string | null;
  unit: "m" | "mm";
  scaleMode: "metadata-box" | "model-units";
  rotationOffsetDeg: {
    x: number;
    y: number;
    z: number;
  };
  positionOffsetMm: {
    xMm: number;
    yMm: number;
    zMm: number;
  };
};

export type MachineDefinition = {
  id: string;
  name: string;
  category: MachineCategory;
  widthMm?: number;
  depthMm?: number;
  heightMm?: number;
  /** Legacy meter dimensions kept for older layouts and Babylon render compatibility. */
  width: number;
  depth: number;
  height: number;
  defaultColor: string;
  modelPath?: string | null;
  visualModel?: VisualModelDefinition;
  thumbnailPath?: string | null;
  connectionPoints: ConnectionPoint[];
  clearance?: {
    front: number;
    back: number;
    left: number;
    right: number;
  };
  capabilities?: {
    canConvey: boolean;
    canPalletize: boolean;
    canWrap: boolean;
    hasFlowDirection: boolean;
  };
};

export type PlacedMachine = {
  instanceId: string;
  libraryId?: string;
  machineDefinitionId: string;
  definitionSnapshot: MachineDefinition;
  definition: MachineDefinition;
  position: {
    x: number;
    z: number;
  };
  positionMm?: {
    xMm: number;
    yMm: number;
  };
  elevationMm?: number;
  rotationDeg?: number;
  rotationY: number;
  flowDirection: "forward" | "reverse";
};

export type LayoutObject = {
  id: string;
  libraryId?: string;
  machineDefinitionId: string;
  definitionSnapshot?: MachineDefinition;
  name: string;
  category: MachineCategory;
  widthMm?: number;
  depthMm?: number;
  heightMm?: number;
  width: number;
  depth: number;
  height: number;
  positionMm?: {
    xMm: number;
    yMm: number;
  };
  elevationMm?: number;
  rotationDeg?: number;
  positionX: number;
  positionZ: number;
  rotationY: number;
  defaultColor: string;
  flowDirection?: "forward" | "reverse";
};

export type AtrVisuLayout = {
  appName: "AtrVisu";
  version: 1;
  unitSystem?: {
    canonicalUnit: "mm";
    renderUnit: "m";
    version: "1.0";
  };
  exportedAt: string;
  objects: LayoutObject[];
};

export type LibraryIndexEntry = {
  libraryId: string;
  libraryName: string;
  path: string;
  readonly: boolean;
  enabled: boolean;
};

export type LibraryMachineItem = Omit<MachineDefinition, "category"> & {
  type: MachineCategory;
};

export type LibraryGroup = {
  id: string;
  name: string;
  children: LibraryGroup[];
  items: LibraryMachineItem[];
};

export type MachineLibraryDocument = {
  libraryId: string;
  libraryName: string;
  readonly: boolean;
  root: LibraryGroup;
};

export type LoadedMachineLibrary = MachineLibraryDocument & {
  path: string;
  enabled: boolean;
  loadError?: string;
};

export type LibraryValidationWarning = {
  path: string;
  message: string;
};
