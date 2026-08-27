import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { MachineDefinition, PlacedMachine } from "../types/machine";
import { SelectionToolsPanel } from "./SelectionToolsPanel";

const definition: MachineDefinition = {
  id: "machine",
  name: "Machine",
  category: "Test",
  width: 1,
  depth: 1,
  height: 1,
  defaultColor: "#ffffff",
  connectionPoints: []
};

const selectedMachines: PlacedMachine[] = ["machine-1", "machine-2"].map((instanceId) => ({
  instanceId,
  machineDefinitionId: definition.id,
  definition,
  definitionSnapshot: definition,
  position: { x: 0, z: 0 },
  rotationY: 0,
  flowDirection: "forward"
}));

const props = {
  selectedEntityCount: 2,
  selectedMachines: [],
  connectionPointSnapAvailable: false,
  movementAllowed: true,
  connectionPointSnapVisible: true,
  connectionPointSnapExpanded: true,
  onConnectionPointSnapExpandedChange: vi.fn(),
  onAlign: vi.fn(),
  onDistribute: vi.fn(),
  onEqualGap: vi.fn(),
  onPairAlign: vi.fn(),
  onPairAnchorSnap: vi.fn(),
  onConnectionPointSnap: vi.fn(),
  onClearSelection: vi.fn()
};

const renderPanel = (selectedEntityCount: number) => renderToStaticMarkup(createElement(SelectionToolsPanel, {
  ...props,
  selectedEntityCount
}));

describe("SelectionToolsPanel", () => {
  it.each([0, 1])("renders a compact context state for %i selected objects", (selectedEntityCount) => {
    const markup = renderPanel(selectedEntityCount);

    expect(markup).toContain("Selection Tools");
    expect(markup).toContain("Select two or more objects to align or snap.");
    expect(markup).not.toContain("Alignment tools");
    expect(markup).not.toContain("Connection Point Snap");
    expect(markup).not.toContain("Keyboard Nudge");
  });

  it("shows common tools for two objects and keeps unavailable connection snap absent", () => {
    const markup = renderPanel(2);

    expect(markup).toContain(">Align<");
    expect(markup).toContain(">Distribute<");
    expect(markup).toContain("Select three or more objects to distribute.");
    expect(markup).toContain('data-testid="selection-tools-advanced"');
    expect(markup).not.toContain('data-testid="selection-tools-advanced" open');
    expect(markup).not.toContain("Connection Point Snap");
    expect(markup).not.toContain("Keyboard Nudge");
  });

  it("shows connection snap only for an eligible exact-two-machine context", () => {
    const markup = renderToStaticMarkup(createElement(SelectionToolsPanel, {
      ...props,
      selectedMachines,
      primarySelectedMachine: selectedMachines[0],
      connectionPointSnapAvailable: true
    }));

    expect(markup).toContain("Connection Point Snap");
    expect(markup).toContain("Connect &amp; Snap moves the selected machine without changing its rotation.");
    expect(markup).not.toContain("v0.1");
  });

  it("enables distribution for three selected objects", () => {
    const markup = renderPanel(3);
    const horizontalIndex = markup.indexOf(">Horizontal<");
    const horizontalButton = markup.slice(markup.lastIndexOf("<button", horizontalIndex), horizontalIndex);

    expect(horizontalButton).not.toContain("disabled");
    expect(markup).not.toContain("Select three or more objects to distribute.");
    expect(markup).not.toContain('data-testid="selection-tools-advanced"');
    expect(markup).not.toContain("Connection Point Snap");
  });

  it("honors the canonical connection-snap panel visibility preference", () => {
    const markup = renderToStaticMarkup(createElement(SelectionToolsPanel, {
      ...props,
      connectionPointSnapVisible: false
    }));
    expect(markup).not.toContain("Connection Point Snap");
  });
});
