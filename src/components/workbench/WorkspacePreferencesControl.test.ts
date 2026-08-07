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
    expect([...container.querySelectorAll<HTMLInputElement>("input")]
      .every((input) => !input.disabled)).toBe(true);
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

  it("tracks live panel availability without allowing unavailable preference mutations", async () => {
    const props = createProps();
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);
    roots.push(root);
    const unavailableReason = "Select exactly two explicit machines.";

    await act(async () => root.render(createElement(WorkspacePreferencesControl, {
      ...props,
      activeWorkspaceId: "workspace.layout-engineering",
      activeWorkspaceLabel: "Layout Engineering",
      panelOptions: [
        {
          id: "panel.connectionPointSnap",
          label: "Connection Point Snap",
          visible: true,
          available: false,
          unavailableReason
        },
        { id: "panel.inspector", label: "Inspector", visible: true, available: true }
      ]
    })));
    await act(async () => (container.querySelector("button") as HTMLButtonElement).click());
    let checkboxes = [...container.querySelectorAll<HTMLInputElement>('input[type="checkbox"]')];
    const snap = checkboxes[0];
    expect(snap.disabled).toBe(true);
    expect(snap.checked).toBe(true);
    expect(container.querySelector(`#${snap.getAttribute("aria-describedby")}`)?.textContent)
      .toBe(unavailableReason);
    await act(async () => snap.click());
    expect(props.onTogglePanel).not.toHaveBeenCalled();
    expect(container.textContent).toContain("Layout Engineering");

    await act(async () => root.render(createElement(WorkspacePreferencesControl, {
      ...props,
      activeWorkspaceId: "workspace.layout-engineering",
      activeWorkspaceLabel: "Layout Engineering",
      panelOptions: [
        { id: "panel.connectionPointSnap", label: "Connection Point Snap", visible: true, available: true },
        {
          id: "panel.inspector",
          label: "Inspector",
          visible: true,
          available: false,
          unavailableReason: "Annotation properties are shown in the Annotations panel."
        }
      ]
    })));
    checkboxes = [...container.querySelectorAll<HTMLInputElement>('input[type="checkbox"]')];
    expect(checkboxes[0].disabled).toBe(false);
    expect(checkboxes[0].checked).toBe(true);
    expect(checkboxes[1].disabled).toBe(true);
    await act(async () => checkboxes[0].click());
    await act(async () => checkboxes[1].click());
    expect(props.onTogglePanel).toHaveBeenCalledOnce();
    expect(props.onTogglePanel).toHaveBeenCalledWith("panel.connectionPointSnap", false);
  });

  it("keeps the popover inspectable while future-readonly disables every mutation callback", async () => {
    const props = createProps();
    const reason = "UI preferences use unsupported schema version 3; defaults are active in read-only mode.";
    const container = await mount(createElement(WorkspacePreferencesControl, {
      ...props,
      readOnly: true,
      readOnlyReason: reason
    }));
    const trigger = container.querySelector("button") as HTMLButtonElement;
    expect(trigger.disabled).toBe(false);
    await act(async () => trigger.click());

    const dialog = container.querySelector('[role="dialog"]') as HTMLElement;
    const messageId = dialog.getAttribute("aria-describedby");
    expect(messageId).toBeTruthy();
    expect(container.querySelector(`#${messageId}`)?.textContent).toBe(reason);
    const inputs = [...container.querySelectorAll<HTMLInputElement>("input")];
    expect(inputs).toHaveLength(10);
    expect(inputs.every((input) => input.disabled)).toBe(true);
    await act(async () => inputs.forEach((input) => input.click()));
    expect(props.onSelectCurrentArrangement).not.toHaveBeenCalled();
    expect(props.onSelectWorkspace).not.toHaveBeenCalled();
    expect(props.onSelectTheme).not.toHaveBeenCalled();
    expect(props.onSelectDensity).not.toHaveBeenCalled();
    expect(props.onTogglePanel).not.toHaveBeenCalled();
  });
});
