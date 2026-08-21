import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
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
    expect(markup).toContain("Connection snap moves the selected machine without changing its rotation.");
    expect(markup).not.toContain("v0.1");
    expect(definition.name).toBe("Flow Pack Machine");
  });
});
