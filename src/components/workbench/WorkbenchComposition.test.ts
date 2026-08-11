import { Children, createElement, isValidElement, type ReactElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { PlatformEntity, SelectionState } from "../../platform/contracts";
import { LayoutExplorer } from "./LayoutExplorer";
import { WorkbenchBottomDock } from "./WorkbenchBottomDock";
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
    const markup = renderToStaticMarkup(createElement(WorkbenchPrimaryDock, {
      items: [
        { panelId: "panel.machineLibrary", label: "Library", content: "library-content" },
        { panelId: "panel.layoutExplorer", label: "Explorer", content: "explorer-content" }
      ],
      activePanelId: "panel.layoutExplorer",
      collapsed: false,
      width: 304,
      bottomInset: 62,
      onActivate,
      onToggleCollapsed: vi.fn()
    }));

    expect(markup).toContain('data-testid="primary-dock"');
    expect(markup).toContain('data-panel-id="panel.layoutExplorer"');
    expect(markup).toContain('data-panel-id="panel.machineLibrary" hidden=""');

    const tree = WorkbenchPrimaryDock({
      items: [
        { panelId: "panel.machineLibrary", label: "Library", content: "library-content" },
        { panelId: "panel.layoutExplorer", label: "Explorer", content: "explorer-content" }
      ],
      activePanelId: "panel.machineLibrary",
      collapsed: false,
      width: 304,
      bottomInset: 62,
      onActivate,
      onToggleCollapsed: vi.fn()
    });
    findButton(tree, "primary-dock-tab-panel.layoutExplorer").props.onClick?.({
      ctrlKey: false,
      metaKey: false,
      shiftKey: false
    });
    expect(onActivate).toHaveBeenCalledWith("panel.layoutExplorer");
  });

  it("projects real entities and forwards replace or toggle selection without local authority", () => {
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

    const tree = LayoutExplorer(props);
    findButton(tree, "layout-explorer-entity-machine:packer").props.onClick?.({
      ctrlKey: false,
      metaKey: false,
      shiftKey: false
    });
    findButton(tree, "layout-explorer-entity-machine:conveyor").props.onClick?.({
      ctrlKey: true,
      metaKey: false,
      shiftKey: false
    });
    expect(onSelectEntity).toHaveBeenNthCalledWith(1, "machine:packer", "replace");
    expect(onSelectEntity).toHaveBeenNthCalledWith(2, "machine:conveyor", "toggle");
  });

  it("renders the generic Bottom Dock contribution and persistent status projection", () => {
    const onActivate = vi.fn();
    const bottomMarkup = renderToStaticMarkup(createElement(WorkbenchBottomDock, {
      contributions: [{ panelId: "panel.viewpoints", label: "Viewpoints", content: "viewpoint-content" }],
      activePanelId: "panel.viewpoints",
      collapsed: false,
      expandedHeight: 210,
      leftInset: 304,
      rightInset: 360,
      onActivate,
      onToggleCollapsed: vi.fn()
    }));
    const statusMarkup = renderToStaticMarkup(createElement(WorkbenchStatusBar, {
      selectionCount: 3,
      primarySelection: { name: "Robot Palletizer", type: "machine" },
      snapLabel: "100 mm / 15 deg",
      dirty: true
    }));

    expect(bottomMarkup).toContain('data-panel-id="panel.viewpoints"');
    expect(bottomMarkup).toContain("viewpoint-content");
    expect(statusMarkup).toContain("Selected: 3");
    expect(statusMarkup).toContain("Robot Palletizer (machine)");
    expect(statusMarkup).toContain("Unit: mm");
    expect(statusMarkup).toContain("Snap: 100 mm / 15 deg");
    expect(statusMarkup).toContain('data-dirty="true"');
  });
});
