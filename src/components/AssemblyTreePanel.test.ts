import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { ObjectGroup } from "../types/groups";
import type { MachineDefinition, PlacedMachine } from "../types/machine";
import { AssemblyTreePanel } from "./AssemblyTreePanel";

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

const renamedMachine: PlacedMachine = {
  instanceId: "m1",
  displayName: "Line 1 Packer",
  machineDefinitionId: definition.id,
  definition,
  definitionSnapshot: definition,
  position: { x: 0, z: 0 },
  rotationY: 0,
  flowDirection: "forward"
};

const group: ObjectGroup = {
  id: "assembly-1",
  name: "Packaging module",
  objectIds: ["machine:m1", "civil:c1"],
  createdAt: "now",
  updatedAt: "now"
};

const props = {
  groups: [group],
  placedMachines: [],
  civilReferences: [],
  selectedGroupId: "assembly-1",
  activeGroupEditId: null,
  explicitSelectedEntityCount: 2,
  removableSelectedEntityCount: 0,
  onCreateGroupFromSelection: vi.fn(),
  onAddSelectionToGroup: vi.fn(),
  onRemoveSelectionFromGroup: vi.fn(),
  onRenameGroup: vi.fn(),
  onEnterGroupEdit: vi.fn(),
  onExitGroupEdit: vi.fn(),
  onUngroup: vi.fn(),
  onSelectGroup: vi.fn(),
  onToggleGroupCollapsed: vi.fn()
};

describe("AssemblyTreePanel", () => {
  it("communicates rigid assembly semantics and accessible actions", () => {
    const markup = renderToStaticMarkup(createElement(AssemblyTreePanel, props));

    expect(markup).toContain("Groups are rigid assemblies");
    expect(markup).toContain('aria-label="Edit Group Packaging module"');
    expect(markup).toContain('aria-label="Ungroup Packaging module"');
    expect(markup).not.toContain("Delete Group");
  });

  it("visibly identifies the active group edit mode", () => {
    const markup = renderToStaticMarkup(createElement(AssemblyTreePanel, {
      ...props,
      activeGroupEditId: "assembly-1"
    }));

    expect(markup).toContain("is-editing");
    expect(markup).toContain("Editing members");
    expect(markup).toContain('aria-label="Exit Group Edit Packaging module"');
  });

  it("keeps membership actions disabled when only a projected group root is selected", () => {
    const markup = renderToStaticMarkup(createElement(AssemblyTreePanel, {
      ...props,
      explicitSelectedEntityCount: 0,
      activeGroupEditId: "assembly-1"
    }));

    expect(markup).toMatch(/data-testid="create-group-from-selection" disabled=""/);
    expect(markup).toMatch(/data-testid="add-selection-to-group-assembly-1" disabled=""/);
    expect(markup).toMatch(/data-testid="remove-selection-from-group-assembly-1" disabled=""/);
  });

  it("enables removal for an explicitly selected child during group edit", () => {
    const markup = renderToStaticMarkup(createElement(AssemblyTreePanel, {
      ...props,
      explicitSelectedEntityCount: 1,
      removableSelectedEntityCount: 1,
      activeGroupEditId: "assembly-1"
    }));

    expect(markup).not.toMatch(/data-testid="remove-selection-from-group-assembly-1" disabled=""/);
  });

  it("keeps removal disabled for explicit objects outside the active group", () => {
    const markup = renderToStaticMarkup(createElement(AssemblyTreePanel, {
      ...props,
      explicitSelectedEntityCount: 1,
      removableSelectedEntityCount: 0,
      activeGroupEditId: "assembly-1"
    }));

    expect(markup).toMatch(/data-testid="remove-selection-from-group-assembly-1" disabled=""/);
  });

  it("uses the placed-instance name for machine members without changing definition identity", () => {
    const markup = renderToStaticMarkup(createElement(AssemblyTreePanel, {
      ...props,
      placedMachines: [renamedMachine]
    }));

    expect(markup).toContain("Line 1 Packer");
    expect(markup).not.toContain(">Flow Pack Machine<");
    expect(definition.name).toBe("Flow Pack Machine");
  });
});
