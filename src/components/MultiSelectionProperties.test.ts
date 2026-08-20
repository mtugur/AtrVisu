import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { MachineDefinition, PlacedMachine } from "../types/machine";
import { MultiSelectionProperties } from "./MultiSelectionProperties";

const definition: MachineDefinition = {
  id: "machine", name: "Machine", category: "Test",
  width: 1, depth: 1, height: 1,
  widthMm: 1000, depthMm: 1000, heightMm: 1000,
  defaultColor: "#aaaaaa", connectionPoints: [],
  capabilities: { canConvey: false, canPalletize: false, canWrap: false, hasFlowDirection: false }
};

const machine = (instanceId: string, name: string, xMm = 0, yMm = 0): PlacedMachine => ({
  instanceId, machineDefinitionId: definition.id,
  definition: { ...definition, name }, definitionSnapshot: { ...definition, name },
  position: { x: xMm / 1000, z: yMm / 1000 }, positionMm: { xMm, yMm },
  rotationY: 0, rotationDeg: 0, flowDirection: "forward"
});

const renderPanel = (machines: PlacedMachine[]) => renderToStaticMarkup(createElement(
  MultiSelectionProperties,
  {
    selectedMachines: machines,
    primarySelectedMachine: machines[0],
    selectionBounds: {
      centerXMm: 500, centerYMm: 0,
      minXMm: -500, maxXMm: 1500, minYMm: -500, maxYMm: 500,
      widthMm: 2000, depthMm: 1000
    }
  }
));

describe("MultiSelectionProperties", () => {
  it("keeps Inspector focused on selected-object identity and shared geometry", () => {
    const markup = renderPanel([
      machine("a", "Packer", -1000, 2000),
      machine("b", "Conveyor", 2000, -2000)
    ]);

    expect(markup).toContain('aria-label="Multi-selection properties"');
    expect(markup).toContain("2 objects");
    expect(markup).toContain("Primary");
    expect(markup).toContain("Packer");
    expect(markup).toContain("Selection Width");
    expect(markup).toContain("Reference Point Distance");
  });

  it("does not render operational alignment, distribution, snap, duplicate, or delete stacks", () => {
    const markup = renderPanel([machine("a", "Packer"), machine("b", "Conveyor")]);

    expect(markup).not.toContain("Align Selection");
    expect(markup).not.toContain("Distribute Selection");
    expect(markup).not.toContain("Equal Gap");
    expect(markup).not.toContain("Connection Point Snap");
    expect(markup).not.toContain("Duplicate Selected");
    expect(markup).not.toContain("Delete Selected Objects");
  });

  it("shows assembly identity without introducing action controls", () => {
    const markup = renderToStaticMarkup(createElement(MultiSelectionProperties, {
      selectedMachines: [machine("a", "Packer"), machine("b", "Conveyor")],
      assemblyName: "Packaging module",
      primarySelectedMachine: undefined,
      selectionBounds: null
    }));

    expect(markup).toContain("Packaging module");
    expect(markup).not.toContain("button");
  });
});
