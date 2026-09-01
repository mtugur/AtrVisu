// @vitest-environment jsdom

import { act, Children, createElement, isValidElement, type ReactElement, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { PlatformEntity, SelectionState } from "../../platform/contracts";
import { LayoutExplorer } from "./LayoutExplorer";
import { WorkbenchBottomDock } from "./WorkbenchBottomDock";
import { WorkbenchContextContribution } from "./WorkbenchContextContribution";
import { WorkbenchPrimaryDock } from "./WorkbenchPrimaryDock";
import { WorkbenchStatusBar } from "./WorkbenchStatusBar";

type ButtonProps = {
  children?: ReactNode;
  "data-testid"?: string;
  onClick?: (event: { ctrlKey: boolean; metaKey: boolean; shiftKey: boolean }) => void;
};

const findButton = (node: ReactNode, testId: string): ReactElement<ButtonProps> => {
  let match: ReactElement<ButtonProps> | undefined;
  const visit = (candidate: ReactNode) => {
    if (!isValidElement<ButtonProps>(candidate) || match) return;
    if (candidate.type === "button" && candidate.props["data-testid"] === testId) {
      match = candidate;
      return;
    }
    Children.forEach(candidate.props.children, visit);
  };
  visit(node);
  expect(match).toBeDefined();
  return match!;
};

const entity = (id: string, name: string, overrides: Partial<PlatformEntity> = {}): PlatformEntity => ({
  id,
  type: "machine",
  name,
  transform: { planX: 0, planY: 0, elevation: 0, rotationDeg: 0 },
  properties: [],
  connectors: [],
  childrenIds: [],
  layerId: "default",
  visible: true,
  locked: false,
  selectable: true,
  ...overrides
});

describe("final workbench composition contracts", () => {
  it("renders one active Primary Dock contribution and activates registry panel ids", () => {
    const onActivate = vi.fn();
    const items = [
      { panelId: "panel.machineLibrary" as const, label: "Library", content: "library-content" },
      { panelId: "panel.layoutExplorer" as const, label: "Explorer", content: "explorer-content" },
      { panelId: "panel.layers" as const, label: "Layers", content: "layers-content" },
      { panelId: "panel.groups" as const, label: "Groups", content: "groups-content" },
      { panelId: "panel.viewpoints" as const, label: "Viewpoints", content: "viewpoints-content" }
    ];
    const markup = renderToStaticMarkup(createElement(WorkbenchPrimaryDock, {
      items,
      activePanelId: "panel.groups",
      collapsed: false,
      width: 304,
      minWidth: 260,
      maxWidth: 480,
      resizeEnabled: true,
      bottomInset: 62,
      onActivate,
      onToggleCollapsed: vi.fn(),
      onResize: vi.fn()
    }));

    expect(markup).toContain('data-testid="primary-dock"');
    expect(markup).toContain('class="workbench-primary-dock-tabs"');
    expect(markup).not.toContain("workbench-activity-rail");
    expect(markup).toContain('data-panel-id="panel.machineLibrary" hidden=""');
    expect(markup).toContain('data-panel-id="panel.groups" aria-label="Groups"');
    expect(markup).toMatch(/data-testid="primary-dock-tab-panel\.groups"[^>]*aria-pressed="true"/);
    expect(markup).toMatch(/data-testid="primary-dock-tab-panel\.viewpoints"[^>]*aria-pressed="false"/);
    const tabOrder = items.map(({ panelId }) => markup.indexOf(`primary-dock-tab-${panelId}`));
    expect(tabOrder).toEqual([...tabOrder].sort((left, right) => left - right));
    expect(markup.match(/data-panel-id=/g)).toHaveLength(items.length);
    expect(markup).not.toContain("<strong>Groups</strong>");
    expect(markup).toContain('aria-label="Resize Primary Dock"');
    expect(markup).toContain('aria-valuenow="304"');
    expect(markup).toContain('aria-label="Collapse Primary Dock"');
    expect(markup).not.toContain("&lt;");

    const tree = WorkbenchPrimaryDock({
      items,
      activePanelId: "panel.machineLibrary",
      collapsed: false,
      width: 304,
      minWidth: 260,
      maxWidth: 480,
      resizeEnabled: true,
      bottomInset: 62,
      onActivate,
      onToggleCollapsed: vi.fn(),
      onResize: vi.fn()
    });
    findButton(tree, "primary-dock-tab-panel.layoutExplorer").props.onClick?.({
      ctrlKey: false,
      metaKey: false,
      shiftKey: false
    });
    expect(onActivate).toHaveBeenCalledWith("panel.layoutExplorer");

    const collapsedTree = WorkbenchPrimaryDock({
      items,
      activePanelId: "panel.groups",
      collapsed: true,
      width: 304,
      minWidth: 260,
      maxWidth: 480,
      resizeEnabled: true,
      bottomInset: 62,
      onActivate,
      onToggleCollapsed: vi.fn(),
      onResize: vi.fn()
    });
    const collapsedMarkup = renderToStaticMarkup(collapsedTree);
    expect(collapsedMarkup).toContain('class="workbench-primary-dock-header" hidden=""');
    expect(collapsedMarkup).toContain('class="workbench-primary-dock-content" hidden=""');
    expect(collapsedMarkup).toContain('aria-label="Open Groups"');
    expect(collapsedMarkup).not.toContain('aria-label="Expand Primary Dock"');
    expect(collapsedMarkup.match(/data-testid="primary-dock-collapse-toggle"/g)).toHaveLength(1);
  });

  it("projects real entities and forwards replace or toggle selection without local authority", async () => {
    const onSelectEntity = vi.fn();
    const selection: SelectionState = {
      ids: ["machine:packer", "machine:conveyor"],
      primaryId: "machine:conveyor",
      source: "scene"
    };
    const props = {
      entities: [entity("machine:packer", "Flow Pack Machine"), entity("machine:conveyor", "Belt Conveyor")],
      selection,
      layerNames: new Map([["default", "Default"]]),
      onSelectEntity
    } as const;
    const markup = renderToStaticMarkup(createElement(LayoutExplorer, props));

    expect(markup).toContain("Flow Pack Machine");
    expect(markup).toContain("Belt Conveyor");
    expect(markup).toContain("Default | Primary");
    expect(markup).toContain('<nav class="layout-explorer-tree" aria-label="Scene entities">');
    expect(markup).toContain('<ul class="layout-explorer-list">');
    expect(markup).toContain("<li>");
    expect(markup).not.toContain('role="tree"');
    expect(markup).not.toContain('role="treeitem"');

    const container = document.createElement("div");
    const root = createRoot(container);
    await act(async () => {
      root.render(createElement(LayoutExplorer, props));
    });
    const packer = container.querySelector<HTMLButtonElement>('[data-testid="layout-explorer-entity-machine:packer"]');
    const conveyor = container.querySelector<HTMLButtonElement>('[data-testid="layout-explorer-entity-machine:conveyor"]');
    await act(async () => {
      packer?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      conveyor?.dispatchEvent(new MouseEvent("click", { bubbles: true, ctrlKey: true }));
    });
    expect(onSelectEntity).toHaveBeenNthCalledWith(1, "machine:packer", "replace");
    expect(onSelectEntity).toHaveBeenNthCalledWith(2, "machine:conveyor", "toggle");
    await act(async () => root.unmount());
  });

  it("renders contextual contributions only when visible and exposes controlled collapse", () => {
    const onExpandedChange = vi.fn();
    const visibleMarkup = renderToStaticMarkup(createElement(WorkbenchContextContribution, {
      panelId: "panel.precisionPlacement",
      title: "Placement Settings",
      expanded: true,
      visible: true,
      onExpandedChange,
      children: "placement-controls"
    }));
    const collapsedMarkup = renderToStaticMarkup(createElement(WorkbenchContextContribution, {
      panelId: "panel.precisionPlacement",
      title: "Placement Settings",
      expanded: false,
      visible: true,
      onExpandedChange,
      children: "placement-controls"
    }));
    const hiddenMarkup = renderToStaticMarkup(createElement(WorkbenchContextContribution, {
      panelId: "panel.precisionPlacement",
      title: "Placement Settings",
      expanded: true,
      visible: false,
      onExpandedChange,
      children: "placement-controls"
    }));

    expect(visibleMarkup).toContain('data-panel-id="panel.precisionPlacement"');
    expect(visibleMarkup).toContain('aria-expanded="true"');
    expect(visibleMarkup).toContain("placement-controls");
    expect(collapsedMarkup).toContain('aria-expanded="false"');
    expect(collapsedMarkup).not.toContain("placement-controls");
    expect(hiddenMarkup).toBe("");

    const tree = WorkbenchContextContribution({
      panelId: "panel.precisionPlacement",
      title: "Placement Settings",
      expanded: true,
      visible: true,
      onExpandedChange,
      children: "placement-controls"
    });
    findButton(tree, "contextual-panel-toggle-panel.precisionPlacement").props.onClick?.({
      ctrlKey: false,
      metaKey: false,
      shiftKey: false
    });
    expect(onExpandedChange).toHaveBeenCalledWith(false);
  });

  it("retains the generic Bottom Dock seam for future contributions and the persistent status projection", () => {
    const onActivate = vi.fn();
    const bottomMarkup = renderToStaticMarkup(createElement(WorkbenchBottomDock, {
      contributions: [{ panelId: "panel.futureTimeline", label: "Timeline", content: "timeline-content" }],
      activePanelId: "panel.futureTimeline",
      collapsed: false,
      expandedHeight: 136,
      minHeight: 120,
      maxHeight: 420,
      resizeEnabled: true,
      leftInset: 304,
      rightInset: 360,
      onActivate,
      onToggleCollapsed: vi.fn(),
      onResize: vi.fn()
    }));
    const statusMarkup = renderToStaticMarkup(createElement(WorkbenchStatusBar, {
      selectionCount: 3,
      primarySelection: { name: "Robot Palletizer", type: "machine" },
      snapLabel: "100 mm / 15 deg",
      dirty: true
    }));

    expect(bottomMarkup).toContain('data-panel-id="panel.futureTimeline"');
    expect(bottomMarkup).toContain("timeline-content");
    expect(bottomMarkup).toContain('aria-label="Resize Bottom Dock"');
    expect(bottomMarkup).toContain('aria-valuenow="136"');
    expect(statusMarkup).toContain("Selected: 3");
    expect(statusMarkup).toContain("Robot Palletizer (machine)");
    expect(statusMarkup).toContain("Unit: mm");
    expect(statusMarkup).toContain("Snap: 100 mm / 15 deg");
    expect(statusMarkup).toContain('data-dirty="true"');
  });
});
