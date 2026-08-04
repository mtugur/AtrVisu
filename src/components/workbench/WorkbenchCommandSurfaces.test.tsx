// @vitest-environment jsdom

import { act } from "react";
import type { ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { CommandSurfaceItem, CommandSurfaceMenu } from "../../workbench/commandSurfaces";
import { WorkbenchApplicationBar } from "./WorkbenchApplicationBar";
import { WorkbenchCommandBar } from "./WorkbenchCommandBar";
import { WorkbenchMenuBar } from "./WorkbenchMenuBar";

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
      <WorkbenchApplicationBar
        saveItem={item("project.save", "application-bar", { label: "Save Project" })}
        hasUnsavedChanges
        projectContext={{ project: "Factory", layout: "Line 1", revision: "R03" }}
        onExecute={onExecute}
      />
    );

    expect(container.textContent).toContain("AtrVisu");
    expect(container.textContent).toContain("Unsaved");
    expect(container.textContent).toContain("Factory");
    await act(async () => (container.querySelector("button") as HTMLButtonElement).click());
    expect(onExecute).toHaveBeenCalledWith("project.save");
    expect(container.textContent).not.toContain("Theme");
  });

  it("does not execute disabled Save and exposes its reason", async () => {
    const onExecute = vi.fn();
    const container = await mount(
      <WorkbenchApplicationBar
        saveItem={item("project.save", "application-bar", {
          label: "Save Project",
          disabled: true,
          disabledReason: "No active project."
        })}
        hasUnsavedChanges={false}
        projectContext={{ project: "No project", layout: "No layout", revision: "No revision" }}
        onExecute={onExecute}
      />
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
    { id: "file", label: "File", items: [item("project.save", "menu-bar", { label: "Save Project" })] },
    { id: "edit", label: "Edit", items: [item("edit.undo", "menu-bar", { label: "Undo", shortcut: "Ctrl/Cmd+Z" })] },
    { id: "view", label: "View", items: [item("view.toggleLabels", "menu-bar", { label: "Toggle Labels", pressed: true })] },
    { id: "tools", label: "Tools", items: [item("collision.check", "menu-bar", { label: "Collision Check", disabled: true, disabledReason: "Unavailable." })] }
  ];

  it("supports keyboard opening, switching, Escape restoration, Tab, and outside closure", async () => {
    const container = await mount(<WorkbenchMenuBar menus={menus} onExecute={() => undefined} />);
    const triggers = [...container.querySelectorAll<HTMLButtonElement>(".workbench-menu-trigger")];
    triggers[0].focus();

    await press(triggers[0], "Enter");
    expect(container.querySelector('[role="menu"]')?.getAttribute("aria-label")).toBe("File menu");
    await press(container.querySelector('[role="menuitem"]') as Element, "Escape");
    await act(async () => Promise.resolve());
    expect(document.activeElement).toBe(triggers[0]);

    await press(triggers[0], "Enter");
    await press(container.querySelector('[role="menuitem"]') as Element, "ArrowRight");
    expect(container.querySelector('[role="menu"]')?.getAttribute("aria-label")).toBe("Edit menu");
    await press(container.querySelector('[role="menuitem"]') as Element, "Tab");
    expect(container.querySelector('[role="menu"]')).toBeNull();

    await act(async () => triggers[2].click());
    expect(container.querySelector('[role="menu"]')).not.toBeNull();
    await act(async () => document.body.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true })));
    expect(container.querySelector('[role="menu"]')).toBeNull();
  });

  it("executes enabled metadata command and not disabled items", async () => {
    const onExecute = vi.fn();
    const container = await mount(<WorkbenchMenuBar menus={menus} onExecute={onExecute} />);
    const triggers = [...container.querySelectorAll<HTMLButtonElement>(".workbench-menu-trigger")];

    await act(async () => triggers[1].click());
    await act(async () => (container.querySelector('[role="menuitem"]') as HTMLButtonElement).click());
    expect(onExecute).toHaveBeenCalledWith("edit.undo");

    await act(async () => triggers[3].click());
    const disabled = container.querySelector('[role="menuitem"]') as HTMLButtonElement;
    expect(disabled.disabled).toBe(true);
    await act(async () => disabled.click());
    expect(onExecute).toHaveBeenCalledTimes(1);
  });
});

describe("WorkbenchCommandBar", () => {
  it("renders toolbar semantics, pressed state, and roving keyboard focus", async () => {
    const items = [
      item("edit.undo", "command-bar", { label: "Undo" }),
      item("edit.redo", "command-bar", { label: "Redo", disabled: true }),
      item("view.toggleLabels", "command-bar", { label: "Toggle Labels", pressed: true })
    ];
    const container = await mount(<WorkbenchCommandBar items={items} onExecute={() => undefined} />);
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
      <WorkbenchCommandBar
        items={[
          item("edit.undo", "command-bar", { disabled: true }),
          item("edit.redo", "command-bar")
        ]}
        onExecute={onExecute}
      />
    );
    const buttons = [...container.querySelectorAll<HTMLButtonElement>("button")];

    await act(async () => buttons[0].click());
    await act(async () => buttons[1].click());
    expect(onExecute).toHaveBeenCalledTimes(1);
    expect(onExecute).toHaveBeenCalledWith("edit.redo");
  });
});
