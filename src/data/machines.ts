import type { MachineDefinition } from "../types/machine";

export const machineLibrary: MachineDefinition[] = [
  {
    id: "packaging-flowpack-01",
    name: "Flow Pack Machine",
    category: "Packaging Machine",
    width: 3.6,
    depth: 1.4,
    height: 1.8,
    defaultColor: "#4fb3d8",
    connectionPoints: [
      { id: "infeed", label: "Infeed", x: -1.8, y: 0.9, z: 0, direction: "west" },
      { id: "outfeed", label: "Outfeed", x: 1.8, y: 0.9, z: 0, direction: "east" }
    ]
  },
  {
    id: "conveyor-belt-01",
    name: "Belt Conveyor",
    category: "Conveyor",
    width: 5.2,
    depth: 0.9,
    height: 0.8,
    defaultColor: "#91c95f",
    connectionPoints: [
      { id: "start", label: "Start", x: -2.6, y: 0.4, z: 0, direction: "west" },
      { id: "end", label: "End", x: 2.6, y: 0.4, z: 0, direction: "east" }
    ]
  },
  {
    id: "robot-palletizer-01",
    name: "Robot Palletizer",
    category: "Robot Palletizer",
    width: 3.2,
    depth: 3.2,
    height: 2.7,
    defaultColor: "#f0a23a",
    connectionPoints: [
      { id: "product-in", label: "Product In", x: -1.6, y: 0.9, z: 0, direction: "west" },
      { id: "pallet-out", label: "Pallet Out", x: 1.6, y: 0.4, z: 0, direction: "east" }
    ]
  },
  {
    id: "high-level-palletizer-01",
    name: "High Level Palletizer",
    category: "High Level Palletizer",
    width: 4.6,
    depth: 3.8,
    height: 5.2,
    defaultColor: "#c985f2",
    connectionPoints: [
      { id: "case-infeed", label: "Case Infeed", x: -2.3, y: 3.6, z: 0, direction: "west" },
      { id: "pallet-exit", label: "Pallet Exit", x: 2.3, y: 0.5, z: 0, direction: "east" }
    ]
  },
  {
    id: "stretch-wrapper-01",
    name: "Rotary Stretch Wrapper",
    category: "Stretch Wrapper",
    width: 2.4,
    depth: 2.4,
    height: 2.5,
    defaultColor: "#78d6b5",
    connectionPoints: [
      { id: "wrapper-in", label: "In", x: -1.2, y: 0.5, z: 0, direction: "west" },
      { id: "wrapper-out", label: "Out", x: 1.2, y: 0.5, z: 0, direction: "east" }
    ]
  },
  {
    id: "euro-pallet-01",
    name: "Euro Pallet",
    category: "Pallet",
    width: 1.2,
    depth: 0.8,
    height: 0.14,
    defaultColor: "#b78b5f",
    connectionPoints: [{ id: "top-load", label: "Load", x: 0, y: 0.14, z: 0, direction: "up" }]
  },
  {
    id: "safety-fence-01",
    name: "Safety Fence Section",
    category: "Safety Fence",
    width: 3.0,
    depth: 0.12,
    height: 2.0,
    defaultColor: "#e4c849",
    connectionPoints: [
      { id: "left-post", label: "Left Post", x: -1.5, y: 1, z: 0, direction: "west" },
      { id: "right-post", label: "Right Post", x: 1.5, y: 1, z: 0, direction: "east" }
    ]
  }
];
