import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { MachineDefinition, PlacedMachine } from "../types/machine";
import { MultiSelectionProperties } from "./MultiSelectionProperties";

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
    canConvey: false,
    canPalletize: false,
    canWrap: false,
    hasFlowDirection: false
  }
};

const machine = (instanceId: string, name: string): PlacedMachine => ({
  instanceId,
  machineDefinitionId: definition.id,
  definition: { ...definition, name },
  definitionSnapshot: { ...definition, name },
  position: { x: 0, z: 0 },
  positionMm: { xMm: 0, yMm: 0 },
  rotationY: 0,
  rotationDeg: 0,
  flowDirection: "forward"
});

const renderPanel = (selectedMachines: PlacedMachine[]) =>
  renderToStaticMarkup(
    createElement(MultiSelectionProperties, {
      selectedMachines,
      primarySelectedMachine: selectedMachines[0],
      selectionBounds: {
        centerXMm: 0,
        centerYMm: 0,
        minXMm: -500,
        maxXMm: 2500,
        minYMm: -500,
        maxYMm: 500,
        widthMm: 3000,
        depthMm: 1000
      },
      onAlign: () => undefined,
      onDistribute: () => undefined,
      onEqualGap: () => undefined,
      onClearSelection: () => undefined,
      onDeleteSelected: () => undefined
    })
  );

describe("MultiSelectionProperties", () => {
  it("renders alignment action controls for a machine multi-selection", () => {
    const markup = renderPanel([machine("a", "Packer"), machine("b", "Conveyor")]);

    expect(markup).toContain('data-testid="multi-selection-alignment-actions"');
    expect(markup).toContain("Align Left");
    expect(markup).toContain("Align Center X");
    expect(markup).toContain("Align Right");
    expect(markup).toContain("Align Top");
    expect(markup).toContain("Align Center Y");
    expect(markup).toContain("Align Bottom");
  });

  it("disables distribution and equal gap actions until at least three machines are selected", () => {
    const twoMachineMarkup = renderPanel([machine("a", "Packer"), machine("b", "Conveyor")]);
    const threeMachineMarkup = renderPanel([
      machine("a", "Packer"),
      machine("b", "Conveyor"),
      machine("c", "Wrapper")
    ]);

    expect(twoMachineMarkup).toContain("Distribute Horizontal Center");
    expect(twoMachineMarkup.match(/disabled=""/g)?.length).toBe(4);
    expect(threeMachineMarkup).not.toContain('disabled=""');
  });
});
