// @vitest-environment jsdom

import { act, createElement } from "react";
import type { ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { CommandSurfaceItem } from "../../workbench/commandSurfaces";
import { CommandPalette } from "./CommandPalette";
import { ViewportArrangeBar } from "./ViewportArrangeBar";
import { WorkbenchDockCollapseButton } from "./WorkbenchDockCollapseButton";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const roots: Root[] = [];
const mount = async (element: ReactNode) => {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  roots.push(root);
  await act(async () => root.render(element));
  return container;
};

afterEach(async () => {
  await act(async () => roots.splice(0).forEach((root) => root.unmount()));
  document.body.replaceChildren();
});

const command = (commandId: string, label: string, disabled = false): CommandSurfaceItem => ({
  commandId,
  placement: "command-palette",
  label,
  tooltip: label,
  disabled,
  ...(disabled ? { disabledReason: "Not available for the current selection." } : {}),
  pending: false
});

describe("CommandPalette", () => {
  it("filters registry projections, navigates, executes enabled commands, and keeps disabled commands truthful", async () => {
    const onExecute = vi.fn();
    const onClose = vi.fn();
    const container = await mount(createElement(CommandPalette, {
      items: [command("project.save", "Save Project"), command("edit.deleteSelected", "Delete Selected", true)],
      onExecute,
      onClose
    }));
    const dialog = container.querySelector('[role="dialog"]') as HTMLElement;
    const input = container.querySelector("input") as HTMLInputElement;

    expect(dialog.getAttribute("aria-label")).toBe("Command Palette");
    expect(container.querySelector('[data-testid="command-palette"]')).not.toBeNull();
    expect(container.querySelectorAll('[role="option"]')).toHaveLength(2);
    expect((container.querySelector('[role="option"]:disabled') as HTMLButtonElement).title).toContain("Not available");

    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set?.call(input, "save");
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });
    expect(container.querySelectorAll('[role="option"]')).toHaveLength(1);
    await act(async () => dialog.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true })));
    expect(onExecute).toHaveBeenCalledWith("project.save");
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("closes with Escape without executing a command", async () => {
    const onExecute = vi.fn();
    const onClose = vi.fn();
    const container = await mount(createElement(CommandPalette, {
      items: [command("project.save", "Save Project")],
      onExecute,
      onClose
    }));
    await act(async () => container.querySelector('[role="dialog"]')?.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true })));
    expect(onExecute).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("keeps disabled registry commands inert and closes when the backdrop is clicked", async () => {
    const onExecute = vi.fn();
    const onClose = vi.fn();
    const container = await mount(createElement(CommandPalette, {
      items: [command("project.save", "Save Project"), command("edit.deleteSelected", "Delete Selected", true)],
      onExecute,
      onClose
    }));
    const dialog = container.querySelector('[role="dialog"]') as HTMLElement;
    await act(async () => dialog.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true })));
    expect(container.querySelector('[role="option"][aria-selected="true"]')?.textContent).toContain("Delete Selected");
    await act(async () => dialog.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true })));
    expect(onExecute).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
    const backdrop = container.querySelector(".command-palette-backdrop") as HTMLElement;
    await act(async () => backdrop.dispatchEvent(new MouseEvent("mousedown", { bubbles: true })));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

describe("ViewportArrangeBar", () => {
  const callbacks = () => ({
    onAlign: vi.fn(),
    onDistribute: vi.fn(),
    onEqualGap: vi.fn(),
    onGroup: vi.fn(),
    onUngroup: vi.fn(),
    onOpenAdvancedAlignment: vi.fn(),
    onToggleConnectAndSnap: vi.fn()
  });

  it("is absent below two eligible entities", async () => {
    const container = await mount(createElement(ViewportArrangeBar, {
      selectionCount: 1,
      movementAllowed: true,
      canDistribute: false,
      canGroup: false,
      canUngroup: false,
      canOpenAdvancedAlignment: false,
      connectAndSnapAvailable: false,
      connectAndSnapOpen: false,
      ...callbacks()
    }));
    expect(container.querySelector('[data-testid="viewport-arrange-bar"]')).toBeNull();
  });

  it("delegates contextual actions and exposes Connect & Snap only for a compatible pair", async () => {
    const handlers = callbacks();
    const container = await mount(createElement(ViewportArrangeBar, {
      selectionCount: 2,
      movementAllowed: true,
      canDistribute: false,
      canGroup: true,
      canUngroup: false,
      canOpenAdvancedAlignment: true,
      connectAndSnapAvailable: true,
      connectAndSnapOpen: false,
      ...handlers
    }));
    const align = [...container.querySelectorAll("button")].find((button) => button.textContent === "Left edges") as HTMLButtonElement;
    const group = [...container.querySelectorAll("button")].find((button) => button.textContent === "Group") as HTMLButtonElement;
    const advanced = [...container.querySelectorAll("button")].find((button) => button.textContent === "Advanced Alignment...") as HTMLButtonElement;
    const connect = [...container.querySelectorAll("button")].find((button) => button.textContent === "Connect & Snap") as HTMLButtonElement;
    await act(async () => align.click());
    await act(async () => group.click());
    await act(async () => advanced.click());
    await act(async () => connect.click());
    expect(handlers.onAlign).toHaveBeenCalledWith("left");
    expect(handlers.onGroup).toHaveBeenCalledTimes(1);
    expect(handlers.onOpenAdvancedAlignment).toHaveBeenCalledTimes(1);
    expect(handlers.onToggleConnectAndSnap).toHaveBeenCalledTimes(1);
    expect([...container.querySelectorAll("summary")].map((summary) => summary.textContent)).toEqual(["Align"]);
  });

  it("reveals distribution and equal-gap menus only for three or more eligible objects", async () => {
    const container = await mount(createElement(ViewportArrangeBar, {
      selectionCount: 3,
      movementAllowed: true,
      canDistribute: true,
      canGroup: true,
      canUngroup: false,
      canOpenAdvancedAlignment: true,
      connectAndSnapAvailable: false,
      connectAndSnapOpen: false,
      ...callbacks()
    }));

    expect([...container.querySelectorAll("summary")].map((summary) => summary.textContent))
      .toEqual(["Align", "Distribute", "Equal Gap"]);
  });

  it("keeps locked movement actions inert while Advanced Alignment remains discoverable", async () => {
    const handlers = callbacks();
    const container = await mount(createElement(ViewportArrangeBar, {
      selectionCount: 2,
      movementAllowed: false,
      canDistribute: false,
      canGroup: true,
      canUngroup: false,
      canOpenAdvancedAlignment: true,
      connectAndSnapAvailable: false,
      connectAndSnapOpen: false,
      ...handlers
    }));

    const leftEdges = [...container.querySelectorAll("button")]
      .find((button) => button.textContent === "Left edges") as HTMLButtonElement;
    const group = [...container.querySelectorAll("button")]
      .find((button) => button.textContent === "Group") as HTMLButtonElement;
    const advanced = [...container.querySelectorAll("button")]
      .find((button) => button.textContent === "Advanced Alignment...") as HTMLButtonElement;
    expect(leftEdges.disabled).toBe(true);
    expect(group.disabled).toBe(true);
    expect(advanced.disabled).toBe(false);
    await act(async () => advanced.click());
    expect(handlers.onAlign).not.toHaveBeenCalled();
    expect(handlers.onGroup).not.toHaveBeenCalled();
    expect(handlers.onOpenAdvancedAlignment).toHaveBeenCalledOnce();
  });

  it("exposes the existing Ungroup authority for an assembly without invalid alignment actions", async () => {
    const handlers = callbacks();
    const container = await mount(createElement(ViewportArrangeBar, {
      selectionCount: 1,
      movementAllowed: false,
      canDistribute: false,
      canGroup: false,
      canUngroup: true,
      canOpenAdvancedAlignment: false,
      connectAndSnapAvailable: false,
      connectAndSnapOpen: false,
      ...handlers
    }));

    expect(container.querySelector("summary")).toBeNull();
    const ungroup = [...container.querySelectorAll("button")]
      .find((button) => button.textContent === "Ungroup") as HTMLButtonElement;
    await act(async () => ungroup.click());
    expect(handlers.onUngroup).toHaveBeenCalledOnce();
    expect(handlers.onAlign).not.toHaveBeenCalled();
  });
});

describe("WorkbenchDockCollapseButton", () => {
  it("uses one governed control contract for left, right, and bottom directions", async () => {
    const onToggle = vi.fn();
    const container = await mount(createElement("div", null,
      createElement(WorkbenchDockCollapseButton, { side: "left", collapsed: false, onToggle }),
      createElement(WorkbenchDockCollapseButton, { side: "right", collapsed: true, onToggle }),
      createElement(WorkbenchDockCollapseButton, { side: "bottom", collapsed: false, onToggle })
    ));
    const buttons = [...container.querySelectorAll("button")];
    expect(buttons.every((button) => button.className === "workbench-dock-collapse-control")).toBe(true);
    expect(buttons.map((button) => button.getAttribute("aria-label"))).toEqual([
      "Collapse Primary Dock", "Expand Inspector", "Collapse Bottom Dock"
    ]);
    expect(buttons.every((button) => button.querySelector("svg") !== null)).toBe(true);
  });
});
