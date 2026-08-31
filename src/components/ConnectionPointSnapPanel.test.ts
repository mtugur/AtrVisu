import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { MachineConnectionPoint } from "../types/ataraMachineData";
import type { MachineDefinition, PlacedMachine } from "../types/machine";
import { ConnectionPointSnapPanel } from "./ConnectionPointSnapPanel";

const definition: MachineDefinition = {
  id: "flow-pack",
  name: "Flow Pack Machine",
  category: "Packaging",
  width: 1,
  depth: 1,
  height: 1,
  defaultColor: "#ffffff",
  connectionPoints: []
};

const machine = (instanceId: string, displayName?: string): PlacedMachine => ({
  instanceId,
  displayName,
  machineDefinitionId: definition.id,
  definition,
  definitionSnapshot: definition,
  position: { x: 0, z: 0 },
  rotationY: 0,
  flowDirection: "forward"
});

const machineWithPoint = (
  instanceId: string,
  name: string,
  connectionPoint: MachineConnectionPoint
): PlacedMachine => {
  const productDefinition: MachineDefinition = {
    ...definition,
    id: `${instanceId}-definition`,
    name,
    ataraMachineData: { connectionPoints: [connectionPoint] }
  };
  return {
    ...machine(instanceId),
    machineDefinitionId: productDefinition.id,
    definition: productDefinition,
    definitionSnapshot: productDefinition
  };
};

describe("ConnectionPointSnapPanel", () => {
  it("uses placed-instance names and customer-facing product language", () => {
    const renamed = machine("machine-1", "Line 1 Packer");
    const fallback = machine("machine-2");
    const markup = renderToStaticMarkup(createElement(ConnectionPointSnapPanel, {
      selectedMachines: [renamed, fallback],
      primarySelectedMachine: renamed,
      onSnap: vi.fn()
    }));

    expect(markup).toContain("Line 1 Packer");
    expect(markup).toContain("Flow Pack Machine");
    expect(markup).toContain("Connect &amp; Snap moves the selected machine without changing its rotation.");
    expect(markup).not.toContain("v0.1");
    expect(definition.name).toBe("Flow Pack Machine");
  });

  it("auto-selects the valid product-flow orientation for the premium contextual surface", () => {
    const productIn: MachineConnectionPoint = {
      id: "IN",
      name: "Product In",
      type: "product-in",
      positionMm: { xMm: 0, yMm: 0, zMm: 0 },
      direction: "x-"
    };
    const productOut: MachineConnectionPoint = {
      id: "OUT",
      name: "Product Out",
      type: "product-out",
      positionMm: { xMm: 1000, yMm: 0, zMm: 0 },
      direction: "x+"
    };
    const conveyor = machineWithPoint("conveyor", "Belt Conveyor", productIn);
    const flowPack = machineWithPoint("flow-pack", "Flow Pack Machine", productOut);
    const markup = renderToStaticMarkup(createElement(ConnectionPointSnapPanel, {
      selectedMachines: [conveyor, flowPack],
      primarySelectedMachine: conveyor,
      productFlowOnly: true,
      onSnap: vi.fn()
    }));

    expect(markup).toContain('data-snap-mode="product-flow"');
    expect(markup).toContain("Moving Object</span><strong>Flow Pack Machine");
    expect(markup).toContain("Fixed Object</span><strong>Belt Conveyor");
    expect(markup).toContain('value="OUT" selected=""');
    expect(markup).toContain('value="IN" selected=""');
    expect(markup).not.toContain('data-testid="connection-point-snap-button" disabled');
    expect(markup).toContain('data-testid="connection-point-snap-body"');
    expect(markup).toContain('data-testid="connection-point-snap-actions"');
    expect(markup.indexOf('data-testid="connection-point-snap-actions"'))
      .toBeLessThan(markup.indexOf('data-testid="connection-point-snap-button"'));
  });

  it("does not enable premium snapping for utility-only points", () => {
    const first = machineWithPoint("first", "First", {
      id: "POWER",
      name: "Power",
      type: "electrical",
      positionMm: { xMm: 0, yMm: 0, zMm: 0 },
      direction: "x+"
    });
    const second = machineWithPoint("second", "Second", {
      id: "AIR",
      name: "Air",
      type: "pneumatic",
      positionMm: { xMm: 0, yMm: 0, zMm: 0 },
      direction: "x-"
    });
    const markup = renderToStaticMarkup(createElement(ConnectionPointSnapPanel, {
      selectedMachines: [first, second],
      productFlowOnly: true,
      onSnap: vi.fn()
    }));

    expect(markup).toContain("Selected objects do not have compatible connection points.");
    expect(markup).not.toContain('data-testid="connection-point-snap-button"');
  });
});
