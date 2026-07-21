import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { ObjectGroup } from "../types/groups";
import { AssemblyTreePanel } from "./AssemblyTreePanel";

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
  selectedEntityCount: 2,
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
});
