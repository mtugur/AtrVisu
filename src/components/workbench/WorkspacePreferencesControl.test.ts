// @vitest-environment jsdom

import { act, createElement, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { WorkspacePreferencesControl } from "./WorkspacePreferencesControl";

const roots: Root[] = [];
const actEnvironment = globalThis as typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean;
};
actEnvironment.IS_REACT_ACT_ENVIRONMENT = true;

afterEach(async () => {
  await act(async () => roots.splice(0).forEach((root) => root.unmount()));
  document.body.replaceChildren();
});

const mount = async (element: ReactNode) => {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  roots.push(root);
  await act(async () => root.render(element));
  return container;
};

const createProps = () => ({
  activeWorkspaceId: undefined,
  activeWorkspaceLabel: "Current arrangement",
  workspaceOptions: [
    { id: "workspace.sales-layout" as const, label: "Sales Layout" },
    { id: "workspace.layout-engineering" as const, label: "Layout Engineering" }
  ],
  theme: "system" as const,
  density: "comfortable" as const,
  panelOptions: [
    { id: "panel.machineLibrary", label: "Machine Library", visible: true, available: true },
    { id: "panel.layers", label: "Layers", visible: false, available: true }
  ],
  onSelectCurrentArrangement: vi.fn(),
  onSelectWorkspace: vi.fn(),
  onSelectTheme: vi.fn(),
  onSelectDensity: vi.fn(),
  onTogglePanel: vi.fn()
});

describe("WorkspacePreferencesControl", () => {
  it("exposes an accessible current-arrangement trigger and labelled native groups", async () => {
    const container = await mount(createElement(WorkspacePreferencesControl, createProps()));
    const trigger = container.querySelector("button") as HTMLButtonElement;
    expect(trigger.getAttribute("aria-label")).toContain("Current arrangement");
    expect(trigger.getAttribute("aria-expanded")).toBe("false");

    await act(async () => trigger.click());
    expect(trigger.getAttribute("aria-expanded")).toBe("true");
    expect(container.querySelector('[role="dialog"]')?.getAttribute("aria-labelledby"))
      .toBe("workspace-preferences-title");
    expect([...container.querySelectorAll("legend")].map((legend) => legend.textContent))
      .toEqual(["Workspace", "Theme", "Density", "Visible Panels"]);
    expect(container.querySelectorAll('input[type="radio"]')).toHaveLength(8);
    expect(container.querySelectorAll('input[type="checkbox"]')).toHaveLength(2);
    expect(container.textContent).not.toContain("Diagnostics");
    expect(container.textContent).not.toContain("Right Panel Shell");
  });

  it("routes workspace, theme, density, and panel choices through its callbacks", async () => {
    const props = createProps();
    const container = await mount(createElement(WorkspacePreferencesControl, props));
    await act(async () => (container.querySelector("button") as HTMLButtonElement).click());
    const inputs = [...container.querySelectorAll<HTMLInputElement>("input")];

    await act(async () => inputs.find(({ value }) => value === "workspace.sales-layout")?.click());
    await act(async () => inputs.find(({ value }) => value === "dark")?.click());
    await act(async () => inputs.find(({ value }) => value === "compact")?.click());
    const layers = inputs.find((input) => input.type === "checkbox" && input.parentElement?.textContent === "Layers")!;
    await act(async () => layers.click());

    expect(props.onSelectWorkspace).toHaveBeenCalledWith("workspace.sales-layout");
    expect(props.onSelectTheme).toHaveBeenCalledWith("dark");
    expect(props.onSelectDensity).toHaveBeenCalledWith("compact");
    expect(props.onTogglePanel).toHaveBeenCalledWith("panel.layers", true);
  });

  it("closes on Escape and outside pointer while restoring focus only for Escape", async () => {
    const container = await mount(createElement(WorkspacePreferencesControl, createProps()));
    const trigger = container.querySelector("button") as HTMLButtonElement;
    await act(async () => trigger.click());
    const dialog = container.querySelector('[role="dialog"]') as HTMLElement;
    const workspaceRadio = dialog.querySelector("input") as HTMLInputElement;
    workspaceRadio.focus();

    await act(async () => workspaceRadio.dispatchEvent(new KeyboardEvent("keydown", {
      key: "Escape",
      bubbles: true
    })));
    expect(container.querySelector('[role="dialog"]')).toBeNull();
    expect(document.activeElement).toBe(trigger);

    await act(async () => trigger.click());
    await act(async () => document.body.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true })));
    expect(container.querySelector('[role="dialog"]')).toBeNull();
  });

  it("prevents editor shortcut propagation while controls retain normal keyboard input", async () => {
    const editorShortcut = vi.fn();
    const props = createProps();
    const container = await mount(createElement("div", { onKeyDown: editorShortcut },
      createElement(WorkspacePreferencesControl, props)
    ));
    await act(async () => (container.querySelector("button") as HTMLButtonElement).click());
    const themeRadio = container.querySelector('input[value="dark"]') as HTMLInputElement;

    await act(async () => themeRadio.dispatchEvent(new KeyboardEvent("keydown", {
      key: "ArrowRight",
      bubbles: true
    })));
    expect(editorShortcut).not.toHaveBeenCalled();
  });
});
