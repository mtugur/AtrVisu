// @vitest-environment jsdom

import { act, createElement } from "react";
import type { ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { CommandSurfaceItem, CommandSurfaceMenu } from "../../workbench/commandSurfaces";
import { WorkbenchApplicationBar } from "./WorkbenchApplicationBar";
import { WorkbenchCommandBar } from "./WorkbenchCommandBar";
import { WorkbenchMenuBar } from "./WorkbenchMenuBar";
import { RightPanelUtilityStrip } from "./RightPanelUtilityStrip";

const actEnvironment = globalThis as typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean;
};
actEnvironment.IS_REACT_ACT_ENVIRONMENT = true;

const roots: Root[] = [];

afterEach(async () => {
  await act(async () => roots.splice(0).forEach((root) => root.unmount()));
  document.body.replaceChildren();
});

const item = (
  commandId: string,
  placement: CommandSurfaceItem["placement"],
  options: Partial<CommandSurfaceItem> = {}
): CommandSurfaceItem => ({
  commandId,
  placement,
  label: commandId,
  tooltip: `${commandId} tooltip`,
  disabled: false,
  pending: false,
  ...options
});

const mount = async (element: ReactNode) => {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  roots.push(root);
  await act(async () => root.render(element));
  return container;
};

const press = async (element: Element, key: string) => {
  await act(async () => {
    element.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true }));
  });
};

describe("WorkbenchApplicationBar", () => {
  it("shows identity, dirty state, read-only context, and invokes project.save", async () => {
    const onExecute = vi.fn();
    const container = await mount(
      createElement(WorkbenchApplicationBar, {
        saveItem: item("project.save", "application-bar", { label: "Save Project" }),
        hasUnsavedChanges: true,
        projectContext: { project: "Factory", layout: "Line 1", revision: "R03" },
        onExecute
      })
    );

    expect(container.textContent).toContain("AtrVisu");
    expect(container.textContent).toContain("Unsaved");
    expect(container.textContent).toContain("Factory");
    const projectSession = container.querySelector(".workbench-project-session") as HTMLElement;
    const saveCluster = projectSession.querySelector(".workbench-save-cluster") as HTMLElement;
    const saveButton = saveCluster.querySelector('[data-command-id="project.save"]') as HTMLButtonElement;
    expect(projectSession.getAttribute("aria-label")).toBe("Project session");
    expect(saveCluster.querySelector(".workbench-save-state")?.textContent).toBe("Unsaved");
    expect(container.querySelectorAll('[data-command-id="project.save"]')).toHaveLength(1);
    expect(projectSession.querySelector(".workbench-project-context")?.textContent)
      .toContain("Factory");
    await act(async () => saveButton.click());
    expect(onExecute).toHaveBeenCalledWith("project.save");
    expect(container.textContent).not.toContain("Theme");
  });

  it("does not execute disabled Save and exposes its reason", async () => {
    const onExecute = vi.fn();
    const container = await mount(
      createElement(WorkbenchApplicationBar, {
        saveItem: item("project.save", "application-bar", {
          label: "Save Project",
          disabled: true,
          disabledReason: "No active project."
        }),
        hasUnsavedChanges: false,
        projectContext: { project: "No project", layout: "No layout", revision: "No revision" },
        onExecute
      })
    );
    const button = container.querySelector("button") as HTMLButtonElement;

    expect(button.disabled).toBe(true);
    expect(button.getAttribute("aria-label")).toContain("No active project.");
    await act(async () => button.click());
    expect(onExecute).not.toHaveBeenCalled();
  });
});

describe("WorkbenchMenuBar", () => {
  const menus: readonly CommandSurfaceMenu[] = [
    { id: "file", labelKey: "menu.file", fallbackLabel: "File", items: [item("project.save", "menu-bar", { label: "Save Project" })] },
    {
      id: "edit",
      labelKey: "menu.edit",
      fallbackLabel: "Edit",
      items: [
        item("edit.undo", "menu-bar", { label: "Undo", shortcut: "Ctrl/Cmd+Z" }),
        item("edit.redo", "menu-bar", {
          label: "Redo",
          shortcut: "Ctrl/Cmd+Y or Ctrl/Cmd+Shift+Z"
        })
      ]
    },
    { id: "view", labelKey: "menu.view", fallbackLabel: "View", items: [item("view.toggleLabels", "menu-bar", { label: "Toggle Labels", pressed: true })] },
    { id: "tools", labelKey: "menu.tools", fallbackLabel: "Tools", items: [item("collision.check", "menu-bar", { label: "Collision Check", disabled: true, disabledReason: "Unavailable." })] }
  ];

  it("supports keyboard opening, switching, Escape restoration, Tab, and outside closure", async () => {
    const container = await mount(createElement(WorkbenchMenuBar, {
      menus,
      onExecute: () => undefined
    }));
    const triggers = [...container.querySelectorAll<HTMLButtonElement>(".workbench-menu-trigger")];
    const menubar = container.querySelector('[role="menubar"]');
    expect(menubar?.getAttribute("aria-label")).toBe("Application menus");
    expect(triggers[0]).toHaveProperty("id", "workbench-menu-trigger-file");
    expect(triggers[0].getAttribute("role")).toBe("menuitem");
    expect(triggers[0].getAttribute("aria-controls")).toBe("workbench-menu-popup-file");
    triggers[0].focus();

    await press(triggers[0], "Enter");
    const fileMenu = container.querySelector('[role="menu"]') as HTMLElement;
    expect(fileMenu.id).toBe("workbench-menu-popup-file");
    expect(fileMenu.getAttribute("aria-labelledby")).toBe("workbench-menu-trigger-file");
    await press(fileMenu.querySelector('[role="menuitem"]') as Element, "Escape");
    await act(async () => Promise.resolve());
    expect(document.activeElement).toBe(triggers[0]);

    await press(triggers[0], "Enter");
    await press(container.querySelector('[role="menu"] [role="menuitem"]') as Element, "ArrowRight");
    expect(container.querySelector('[role="menu"]')?.getAttribute("aria-labelledby"))
      .toBe("workbench-menu-trigger-edit");
    await press(container.querySelector('[role="menu"] [role="menuitem"]') as Element, "Tab");
    expect(container.querySelector('[role="menu"]')).toBeNull();

    await act(async () => triggers[2].click());
    expect(container.querySelector('[role="menu"]')).not.toBeNull();
    await act(async () => document.body.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true })));
    expect(container.querySelector('[role="menu"]')).toBeNull();
  });

  it("executes enabled metadata command and not disabled items", async () => {
    const onExecute = vi.fn();
    const container = await mount(createElement(WorkbenchMenuBar, { menus, onExecute }));
    const triggers = [...container.querySelectorAll<HTMLButtonElement>(".workbench-menu-trigger")];

    await act(async () => triggers[1].click());
    await act(async () => (container.querySelector('[role="menu"] [role="menuitem"]') as HTMLButtonElement).click());
    expect(onExecute).toHaveBeenCalledWith("edit.undo");

    await act(async () => triggers[3].click());
    const disabled = container.querySelector('[role="menu"] [role="menuitem"]') as HTMLButtonElement;
    expect(disabled.disabled).toBe(false);
    expect(disabled.getAttribute("aria-disabled")).toBe("true");
    await act(async () => disabled.click());
    expect(onExecute).toHaveBeenCalledTimes(1);
  });

  it("keeps the full Redo shortcut in a dedicated multiline-safe layout region", async () => {
    const container = await mount(createElement(WorkbenchMenuBar, { menus, onExecute: vi.fn() }));
    const editTrigger = container.querySelectorAll<HTMLButtonElement>(".workbench-menu-trigger")[1];
    await act(async () => editTrigger.click());
    const redo = container.querySelector('[data-command-id="edit.redo"]') as HTMLButtonElement;
    const label = redo.querySelector(".workbench-menu-item-label") as HTMLElement;
    const shortcut = redo.querySelector(".workbench-menu-item-shortcut") as HTMLElement;

    expect(label.textContent).toBe("Redo");
    expect(shortcut.textContent).toBe("Ctrl/Cmd+Y or Ctrl/Cmd+Shift+Z");
    expect(shortcut.getAttribute("data-multiline")).toBe("true");
    expect([...redo.children]).toEqual([label, shortcut]);
  });

  it("keeps an all-disabled Edit menu discoverable without permitting activation", async () => {
    const disabledReason = "No selected object is available.";
    const allDisabledMenus: readonly CommandSurfaceMenu[] = [{
      id: "edit",
      labelKey: "menu.edit",
      fallbackLabel: "Edit",
      items: ["edit.undo", "edit.redo", "edit.duplicateSelected", "edit.deleteSelected"]
        .map((commandId) => item(commandId, "menu-bar", {
          disabled: true,
          disabledReason
        }))
    }];
    const onExecute = vi.fn();
    const container = await mount(createElement(WorkbenchMenuBar, {
      menus: allDisabledMenus,
      onExecute
    }));
    const trigger = container.querySelector(".workbench-menu-trigger") as HTMLButtonElement;

    trigger.focus();
    await press(trigger, "Enter");
    await act(async () => Promise.resolve());
    const commands = [...container.querySelectorAll<HTMLButtonElement>('[role="menu"] [role="menuitem"]')];
    expect(commands).toHaveLength(4);
    expect(document.activeElement).toBe(commands[0]);
    expect(commands[0].getAttribute("aria-disabled")).toBe("true");
    expect(commands[0].getAttribute("aria-label")).toContain(disabledReason);
    expect(commands[0].title).toBe(disabledReason);

    await press(commands[0], "ArrowDown");
    expect(document.activeElement).toBe(commands[1]);
    await press(commands[1], "Enter");
    await press(commands[1], " ");
    await act(async () => commands[1].click());
    expect(onExecute).not.toHaveBeenCalled();

    await press(commands[1], "Escape");
    await act(async () => Promise.resolve());
    expect(document.activeElement).toBe(trigger);
  });

  it("uses menu checkbox semantics for projected toggle state", async () => {
    const container = await mount(createElement(WorkbenchMenuBar, { menus, onExecute: vi.fn() }));
    const viewTrigger = container.querySelectorAll<HTMLButtonElement>(".workbench-menu-trigger")[2];
    await act(async () => viewTrigger.click());
    const toggle = container.querySelector('[role="menuitemcheckbox"]') as HTMLButtonElement;

    expect(toggle.getAttribute("aria-checked")).toBe("true");
    expect(toggle.hasAttribute("aria-pressed")).toBe(false);
  });
});

describe("RightPanelUtilityStrip", () => {
  it("separates its title and actions while preserving one wired control of each kind", async () => {
    const onUndo = vi.fn();
    const onRedo = vi.fn();
    const onCollapse = vi.fn();
    const container = await mount(createElement(RightPanelUtilityStrip, {
      canUndo: true,
      canRedo: false,
      onUndo,
      onRedo,
      onCollapse
    }));
    const strip = container.querySelector('[data-testid="right-panel-utility-strip"]') as HTMLElement;
    const title = strip.querySelector(".panel-toolbar-title") as HTMLElement;
    const actions = strip.querySelector('[data-testid="right-panel-utility-actions"]') as HTMLElement;
    const buttons = [...actions.querySelectorAll<HTMLButtonElement>("button")];

    expect(title.textContent).toBe("AtrVisu Tools");
    expect(actions.getAttribute("aria-label")).toBe("Panel actions");
    expect(buttons.map((button) => button.textContent?.trim())).toEqual(["Undo", "Redo", "Collapse"]);
    expect(buttons[0].disabled).toBe(false);
    expect(buttons[1].disabled).toBe(true);
    await act(async () => buttons[0].click());
    await act(async () => buttons[1].click());
    await act(async () => buttons[2].click());
    expect(onUndo).toHaveBeenCalledTimes(1);
    expect(onRedo).not.toHaveBeenCalled();
    expect(onCollapse).toHaveBeenCalledTimes(1);
  });
});

describe("WorkbenchCommandBar", () => {
  it("renders toolbar semantics, pressed state, and roving keyboard focus", async () => {
    const items = [
      item("edit.undo", "command-bar", { label: "Undo" }),
      item("edit.redo", "command-bar", { label: "Redo", disabled: true }),
      item("view.toggleLabels", "command-bar", { label: "Toggle Labels", pressed: true })
    ];
    const container = await mount(createElement(WorkbenchCommandBar, {
      items,
      onExecute: () => undefined
    }));
    const toolbar = container.querySelector('[role="toolbar"]') as HTMLElement;
    const buttons = [...toolbar.querySelectorAll<HTMLButtonElement>("button")];

    expect(buttons.map((button) => button.dataset.commandId)).toEqual([
      "edit.undo",
      "edit.redo",
      "view.toggleLabels"
    ]);
    expect(buttons[2].getAttribute("aria-pressed")).toBe("true");
    buttons[0].focus();
    await press(toolbar, "ArrowRight");
    expect(document.activeElement).toBe(buttons[2]);
    await press(toolbar, "Home");
    expect(document.activeElement).toBe(buttons[0]);
    await press(toolbar, "End");
    expect(document.activeElement).toBe(buttons[2]);
  });

  it("executes only enabled adapter commands", async () => {
    const onExecute = vi.fn();
    const container = await mount(
      createElement(WorkbenchCommandBar, {
        items: [
          item("edit.undo", "command-bar", { disabled: true }),
          item("edit.redo", "command-bar")
        ],
        onExecute
      })
    );
    const buttons = [...container.querySelectorAll<HTMLButtonElement>("button")];

    await act(async () => buttons[0].click());
    buttons[1].focus();
    await act(async () => buttons[1].click());
    expect(onExecute).toHaveBeenCalledTimes(1);
    expect(onExecute).toHaveBeenCalledWith("edit.redo");
    expect(document.activeElement).toBe(buttons[1]);
  });

  it("reconciles the roving tab stop as command availability changes", async () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);
    roots.push(root);
    const renderItems = async (items: readonly CommandSurfaceItem[]) => {
      await act(async () => root.render(createElement(WorkbenchCommandBar, {
        items,
        onExecute: vi.fn()
      })));
      return [...container.querySelectorAll<HTMLButtonElement>("button")];
    };
    const enabled = [
      item("edit.undo", "command-bar"),
      item("edit.redo", "command-bar"),
      item("edit.deleteSelected", "command-bar")
    ];

    let buttons = await renderItems(enabled);
    await act(async () => buttons[1].focus());
    buttons = await renderItems([
      enabled[0],
      item("edit.redo", "command-bar", { disabled: true }),
      enabled[2]
    ]);
    expect(buttons.map((button) => button.tabIndex)).toEqual([-1, -1, 0]);

    await act(async () => buttons[2].focus());
    buttons = await renderItems([enabled[0], enabled[1]]);
    expect(buttons.map((button) => button.tabIndex)).toEqual([0, -1]);

    buttons = await renderItems([
      item("edit.undo", "command-bar", { disabled: true }),
      item("edit.redo", "command-bar", { disabled: true })
    ]);
    expect(buttons.map((button) => button.tabIndex)).toEqual([-1, -1]);

    buttons = await renderItems([
      item("edit.undo", "command-bar", { disabled: true }),
      enabled[1]
    ]);
    expect(buttons.map((button) => button.tabIndex)).toEqual([-1, 0]);
    await act(async () => buttons[1].focus());
    const toolbar = container.querySelector('[role="toolbar"]') as HTMLElement;
    await press(toolbar, "Home");
    expect(document.activeElement).toBe(buttons[1]);
    await press(toolbar, "ArrowLeft");
    expect(document.activeElement).toBe(buttons[1]);
    await press(toolbar, "End");
    expect(document.activeElement).toBe(buttons[1]);
  });

  it("stops handled toolbar navigation before it reaches an editor shortcut parent", async () => {
    const editorShortcut = vi.fn();
    const container = await mount(createElement("div", { onKeyDown: editorShortcut },
      createElement(WorkbenchCommandBar, {
        items: [item("edit.undo", "command-bar"), item("edit.redo", "command-bar")],
        onExecute: vi.fn()
      })
    ));
    const toolbar = container.querySelector('[role="toolbar"]') as HTMLElement;
    const button = toolbar.querySelector("button") as HTMLButtonElement;
    button.focus();

    for (const key of ["ArrowLeft", "ArrowRight", "Home", "End"]) {
      await press(button, key);
    }
    expect(editorShortcut).not.toHaveBeenCalled();
  });
});
