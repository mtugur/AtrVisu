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

const openRoot = async (container: HTMLElement) => {
  const trigger = container.querySelector('[data-testid="workspace-preferences-trigger"]') as HTMLButtonElement;
  await act(async () => trigger.click());
  return trigger;
};

const openVisiblePanels = async (container: HTMLElement) => {
  const branchTrigger = container.querySelector('[data-testid="workspace-visible-panels-trigger"]') as HTMLButtonElement;
  await act(async () => branchTrigger.click());
  const child = container.querySelector('#workspace-visible-panels-surface') as HTMLElement;
  return { branchTrigger, child };
};

describe("WorkspacePreferencesControl", () => {
  it("renders only root groups until the counted Visible Panels branch opens", async () => {
    const container = await mount(createElement(WorkspacePreferencesControl, createProps()));
    const trigger = await openRoot(container);

    expect(trigger.getAttribute("aria-label")).toContain("Current arrangement");
    expect(trigger.getAttribute("aria-expanded")).toBe("true");
    expect(container.querySelector('[role="dialog"]')?.getAttribute("aria-labelledby"))
      .toBe("workspace-preferences-title");
    expect([...container.querySelectorAll("legend")].map((legend) => legend.textContent))
      .toEqual(["Workspace", "Theme", "Density"]);
    expect(container.querySelectorAll('input[type="radio"]')).toHaveLength(8);
    expect(container.querySelectorAll('input[type="checkbox"]')).toHaveLength(0);
    const branchTrigger = container.querySelector('[data-testid="workspace-visible-panels-trigger"]') as HTMLButtonElement;
    expect(branchTrigger.textContent).toContain("Visible Panels");
    expect(branchTrigger.textContent).toContain("1/2");
    expect(branchTrigger.getAttribute("aria-expanded")).toBe("false");
    expect(container.textContent).not.toContain("Diagnostics");
    expect(container.textContent).not.toContain("Right Panel Shell");

    const { child } = await openVisiblePanels(container);
    expect(child).not.toBeNull();
    expect(branchTrigger.getAttribute("aria-expanded")).toBe("true");
    expect(container.querySelectorAll('input[type="checkbox"]')).toHaveLength(2);
  });

  it("routes choices through callbacks while panel changes keep the child open", async () => {
    const props = createProps();
    const container = await mount(createElement(WorkspacePreferencesControl, props));
    await openRoot(container);

    await act(async () => (container.querySelector('input[value="workspace.sales-layout"]') as HTMLInputElement).click());
    await act(async () => (container.querySelector('input[value="dark"]') as HTMLInputElement).click());
    await act(async () => (container.querySelector('input[value="compact"]') as HTMLInputElement).click());
    const { child } = await openVisiblePanels(container);
    const layers = [...child.querySelectorAll<HTMLInputElement>('input[type="checkbox"]')]
      .find((input) => input.parentElement?.textContent === "Layers")!;
    await act(async () => layers.click());

    expect(props.onSelectWorkspace).toHaveBeenCalledWith("workspace.sales-layout");
    expect(props.onSelectTheme).toHaveBeenCalledWith("dark");
    expect(props.onSelectDensity).toHaveBeenCalledWith("compact");
    expect(props.onTogglePanel).toHaveBeenCalledWith("panel.layers", true);
    expect(container.querySelector('#workspace-visible-panels-surface')).toBe(child);
  });

  it("closes child before root on Escape and restores each branch focus", async () => {
    const container = await mount(createElement(WorkspacePreferencesControl, createProps()));
    const rootTrigger = await openRoot(container);
    const branchTrigger = container.querySelector('[data-testid="workspace-visible-panels-trigger"]') as HTMLButtonElement;

    await act(async () => branchTrigger.dispatchEvent(new KeyboardEvent("keydown", {
      key: "ArrowRight",
      bubbles: true
    })));
    const child = container.querySelector('#workspace-visible-panels-surface') as HTMLElement;
    expect(child).not.toBeNull();
    expect(document.activeElement?.tagName).toBe("INPUT");

    await act(async () => document.activeElement?.dispatchEvent(new KeyboardEvent("keydown", {
      key: "Escape",
      bubbles: true
    })));
    expect(container.querySelector('#workspace-visible-panels-surface')).toBeNull();
    expect(document.activeElement).toBe(branchTrigger);

    await act(async () => branchTrigger.dispatchEvent(new KeyboardEvent("keydown", {
      key: "Escape",
      bubbles: true
    })));
    expect(container.querySelector('[role="dialog"]')).toBeNull();
    expect(document.activeElement).toBe(rootTrigger);
  });

  it("outside pointer closes the whole cascade without orphaning the child", async () => {
    const container = await mount(createElement(WorkspacePreferencesControl, createProps()));
    await openRoot(container);
    await openVisiblePanels(container);

    await act(async () => document.body.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true })));
    expect(container.querySelector('[role="dialog"]')).toBeNull();
    expect(container.querySelector('#workspace-visible-panels-surface')).toBeNull();
  });

  it("prevents editor shortcut propagation while controls retain normal keyboard input", async () => {
    const editorShortcut = vi.fn();
    const container = await mount(createElement("div", { onKeyDown: editorShortcut },
      createElement(WorkspacePreferencesControl, createProps())
    ));
    await openRoot(container);
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
    await openRoot(container);
    await openVisiblePanels(container);
    let checkboxes = [...container.querySelectorAll<HTMLInputElement>('input[type="checkbox"]')];
    const snap = checkboxes[0];
    expect(snap.disabled).toBe(true);
    expect(snap.checked).toBe(true);
    expect(container.querySelector(`#${snap.getAttribute("aria-describedby")}`)?.textContent)
      .toBe(unavailableReason);
    await act(async () => snap.click());
    expect(props.onTogglePanel).not.toHaveBeenCalled();

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
    expect(container.querySelector('#workspace-visible-panels-surface')).not.toBeNull();
    expect(checkboxes[0].disabled).toBe(false);
    expect(checkboxes[1].disabled).toBe(true);
    await act(async () => checkboxes[0].click());
    await act(async () => checkboxes[1].click());
    expect(props.onTogglePanel).toHaveBeenCalledOnce();
    expect(props.onTogglePanel).toHaveBeenCalledWith("panel.connectionPointSnap", false);
  });

  it("keeps future-readonly panel controls inspectable and immutable", async () => {
    const props = createProps();
    const reason = "UI preferences use unsupported schema version 3; defaults are active in read-only mode.";
    const container = await mount(createElement(WorkspacePreferencesControl, {
      ...props,
      readOnly: true,
      readOnlyReason: reason
    }));
    const rootTrigger = await openRoot(container);
    expect(rootTrigger.disabled).toBe(false);
    const dialog = container.querySelector('[role="dialog"]') as HTMLElement;
    const messageId = dialog.getAttribute("aria-describedby");
    expect(container.querySelector(`#${messageId}`)?.textContent).toBe(reason);
    expect(container.querySelectorAll('input[type="radio"]')).toHaveLength(8);

    const branchTrigger = container.querySelector('[data-testid="workspace-visible-panels-trigger"]') as HTMLButtonElement;
    await act(async () => branchTrigger.dispatchEvent(new KeyboardEvent("keydown", {
      key: "ArrowRight",
      bubbles: true
    })));
    const child = container.querySelector('#workspace-visible-panels-surface') as HTMLElement;
    expect(child).not.toBeNull();
    expect(document.activeElement).toBe(child);
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
