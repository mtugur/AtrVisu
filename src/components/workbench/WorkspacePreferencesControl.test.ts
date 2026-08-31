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

const createContainerRoot = () => {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  roots.push(root);
  return { container, root };
};

const mount = async (element: ReactNode) => {
  const mounted = createContainerRoot();
  await act(async () => mounted.root.render(element));
  return mounted.container;
};

const createProps = () => ({
  activeWorkspaceId: undefined,
  activeWorkspaceLabel: "Custom Workspace",
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

const openBranch = async (container: HTMLElement, testId: string) => {
  const trigger = container.querySelector(`[data-testid="${testId}"]`) as HTMLButtonElement;
  const surfaceId = trigger.getAttribute("aria-controls")!;
  await act(async () => trigger.click());
  return {
    trigger,
    surface: container.querySelector<HTMLElement>(`#${surfaceId}`)!
  };
};

describe("WorkspacePreferencesControl", () => {
  it("renders one compact disclosure row per branch with current summaries and no root inputs", async () => {
    const container = await mount(createElement(WorkspacePreferencesControl, {
      ...createProps(),
      activeWorkspaceId: "workspace.layout-engineering",
      activeWorkspaceLabel: "Layout Engineering",
      theme: "dark",
      density: "compact"
    }));
    await openRoot(container);

    const dialog = container.querySelector('[role="dialog"]') as HTMLElement;
    const rows = [...dialog.querySelectorAll<HTMLButtonElement>(".workspace-preference-disclosure-row")];
    expect(rows).toHaveLength(4);
    expect(rows.map((row) => row.getAttribute("aria-label"))).toEqual([
      "Workspace: Layout Engineering",
      "Theme: Dark",
      "Density: Compact",
      "Visible Panels: 1/2"
    ]);
    expect(rows.every((row) => row.getAttribute("aria-expanded") === "false")).toBe(true);
    expect(dialog.querySelectorAll("input")).toHaveLength(0);
  });

  it("routes workspace choices through existing handlers, keeps the child open, and reflects updated summary props", async () => {
    const props = createProps();
    const { container, root } = createContainerRoot();
    await act(async () => root.render(createElement(WorkspacePreferencesControl, props)));
    await openRoot(container);
    const { surface } = await openBranch(container, "workspace-preferences-workspace-trigger");
    const radios = [...surface.querySelectorAll<HTMLInputElement>('input[type="radio"]')];
    expect(radios).toHaveLength(3);
    expect(radios.find(({ value }) => value === "current-arrangement")?.checked).toBe(true);

    await act(async () => radios.find(({ value }) => value === "workspace.sales-layout")?.click());
    expect(props.onSelectWorkspace).toHaveBeenCalledWith("workspace.sales-layout");
    expect(container.querySelector("#workspace-preferences-workspace-surface")).toBe(surface);

    await act(async () => root.render(createElement(WorkspacePreferencesControl, {
      ...props,
      activeWorkspaceId: "workspace.sales-layout",
      activeWorkspaceLabel: "Sales Layout"
    })));
    expect(container.querySelector('[data-testid="workspace-preferences-workspace-trigger"]')?.textContent)
      .toContain("Sales Layout");
    expect(container.querySelector<HTMLInputElement>('input[value="workspace.sales-layout"]')?.checked).toBe(true);
    await act(async () => (container.querySelector('input[value="current-arrangement"]') as HTMLInputElement).click());
    expect(props.onSelectCurrentArrangement).toHaveBeenCalledOnce();
  });

  it("routes theme and density choices while summaries update without closing their children", async () => {
    const props = createProps();
    const { container, root } = createContainerRoot();
    await act(async () => root.render(createElement(WorkspacePreferencesControl, {
      ...props,
      activeWorkspaceId: "workspace.layout-engineering",
      activeWorkspaceLabel: "Layout Engineering",
      density: "compact"
    })));
    await openRoot(container);

    let branch = await openBranch(container, "workspace-preferences-theme-trigger");
    expect(branch.surface.querySelector<HTMLInputElement>('input[value="system"]')?.checked).toBe(true);
    await act(async () => (branch.surface.querySelector('input[value="dark"]') as HTMLInputElement).click());
    expect(props.onSelectTheme).toHaveBeenCalledWith("dark");
    await act(async () => root.render(createElement(WorkspacePreferencesControl, {
      ...props,
      activeWorkspaceId: "workspace.layout-engineering",
      activeWorkspaceLabel: "Layout Engineering",
      theme: "dark",
      density: "compact"
    })));
    expect(container.querySelector('[data-testid="workspace-preferences-theme-trigger"]')?.textContent).toContain("Dark");
    expect(container.querySelector("#workspace-preferences-theme-surface")).not.toBeNull();

    branch = await openBranch(container, "workspace-preferences-density-trigger");
    expect(container.querySelector("#workspace-preferences-theme-surface")).toBeNull();
    await act(async () => (branch.surface.querySelector('input[value="comfortable"]') as HTMLInputElement).click());
    expect(props.onSelectDensity).toHaveBeenCalledWith("comfortable");
    await act(async () => root.render(createElement(WorkspacePreferencesControl, {
      ...props,
      activeWorkspaceLabel: "Custom Workspace",
      theme: "dark",
      density: "comfortable"
    })));
    expect(container.querySelector('[data-testid="workspace-preferences-workspace-trigger"]')?.textContent)
      .toContain("Custom Workspace");
    expect(container.querySelector('[data-testid="workspace-preferences-density-trigger"]')?.textContent)
      .toContain("Comfortable");
    expect(container.querySelector("#workspace-preferences-density-surface")).not.toBeNull();
  });

  it("replaces depth-one branches without closing the compact root or leaving stale children", async () => {
    const container = await mount(createElement(WorkspacePreferencesControl, createProps()));
    await openRoot(container);
    const sequence = [
      ["workspace-preferences-workspace-trigger", "workspace"],
      ["workspace-preferences-theme-trigger", "theme"],
      ["workspace-preferences-density-trigger", "density"],
      ["workspace-visible-panels-trigger", "visible-panels"]
    ] as const;

    for (const [testId, branchId] of sequence) {
      const { trigger, surface } = await openBranch(container, testId);
      expect(surface.dataset.preferenceBranch).toBe(branchId);
      expect(container.querySelectorAll('[data-cascading-depth="1"]')).toHaveLength(1);
      expect(container.querySelectorAll('.workspace-preference-disclosure-row[aria-expanded="true"]')).toHaveLength(1);
      expect(trigger.getAttribute("aria-expanded")).toBe("true");
      expect(container.querySelector('[role="dialog"]')).not.toBeNull();
    }
  });

  it("keeps Visible Panels open across updates and preserves live availability guards", async () => {
    const props = createProps();
    const unavailableReason = "Select exactly two explicit machines.";
    const { container, root } = createContainerRoot();
    await act(async () => root.render(createElement(WorkspacePreferencesControl, {
      ...props,
      panelOptions: [
        { id: "panel.connectionPointSnap", label: "Connection Point Snap", visible: true, available: false, unavailableReason },
        { id: "panel.layers", label: "Layers", visible: false, available: true }
      ]
    })));
    await openRoot(container);
    const { surface } = await openBranch(container, "workspace-visible-panels-trigger");
    let inputs = [...surface.querySelectorAll<HTMLInputElement>('input[type="checkbox"]')];
    expect(inputs[0].disabled).toBe(true);
    expect(container.querySelector(`#${inputs[0].getAttribute("aria-describedby")}`)?.textContent).toBe(unavailableReason);
    await act(async () => inputs[0].click());
    expect(props.onTogglePanel).not.toHaveBeenCalled();
    await act(async () => inputs[1].click());
    expect(props.onTogglePanel).toHaveBeenCalledWith("panel.layers", true);
    expect(container.querySelector("#workspace-visible-panels-surface")).toBe(surface);

    await act(async () => root.render(createElement(WorkspacePreferencesControl, {
      ...props,
      panelOptions: [
        { id: "panel.connectionPointSnap", label: "Connection Point Snap", visible: true, available: true },
        { id: "panel.layers", label: "Layers", visible: true, available: true }
      ]
    })));
    inputs = [...container.querySelectorAll<HTMLInputElement>('input[type="checkbox"]')];
    expect(inputs[0].disabled).toBe(false);
    expect(container.querySelector('[data-testid="workspace-visible-panels-trigger"]')?.textContent).toContain("2/2");
  });

  it("uses ArrowRight and ArrowLeft for every branch without leaking editor shortcuts", async () => {
    const editorShortcut = vi.fn();
    const container = await mount(createElement("div", { onKeyDown: editorShortcut },
      createElement(WorkspacePreferencesControl, createProps())
    ));
    const rootTrigger = await openRoot(container);
    const workspaceTrigger = container.querySelector('[data-testid="workspace-preferences-workspace-trigger"]') as HTMLButtonElement;
    workspaceTrigger.focus();
    await act(async () => workspaceTrigger.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true })));
    expect(document.activeElement?.tagName).toBe("INPUT");
    await act(async () => document.activeElement?.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowLeft", bubbles: true })));
    expect(document.activeElement).toBe(workspaceTrigger);
    await act(async () => workspaceTrigger.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true })));
    expect(container.querySelector('[role="dialog"]')).toBeNull();
    expect(document.activeElement).toBe(rootTrigger);
    expect(editorShortcut).not.toHaveBeenCalled();
  });

  it("keeps all navigation rows inspectable while every future-readonly child is immutable", async () => {
    const props = createProps();
    const reason = "UI preferences use unsupported schema version 3; defaults are active in read-only mode.";
    const container = await mount(createElement(WorkspacePreferencesControl, {
      ...props,
      readOnly: true,
      readOnlyReason: reason
    }));
    await openRoot(container);
    const branchIds = [
      "workspace-preferences-workspace-trigger",
      "workspace-preferences-theme-trigger",
      "workspace-preferences-density-trigger",
      "workspace-visible-panels-trigger"
    ];
    expect(container.querySelectorAll(".workspace-preference-disclosure-row")).toHaveLength(4);
    expect([...container.querySelectorAll<HTMLButtonElement>(".workspace-preference-disclosure-row")]
      .every((button) => !button.disabled)).toBe(true);

    for (const testId of branchIds) {
      const { surface } = await openBranch(container, testId);
      expect(container.querySelector('[data-testid="workspace-preferences-read-only-message"]')?.textContent).toBe(reason);
      const inputs = [...surface.querySelectorAll<HTMLInputElement>("input")];
      expect(inputs.length).toBeGreaterThan(0);
      expect(inputs.every((input) => input.disabled)).toBe(true);
      await act(async () => inputs.forEach((input) => input.click()));
    }
    expect(props.onSelectCurrentArrangement).not.toHaveBeenCalled();
    expect(props.onSelectWorkspace).not.toHaveBeenCalled();
    expect(props.onSelectTheme).not.toHaveBeenCalled();
    expect(props.onSelectDensity).not.toHaveBeenCalled();
    expect(props.onTogglePanel).not.toHaveBeenCalled();
  });

  it("outside pointer closes the root and its active branch", async () => {
    const container = await mount(createElement(WorkspacePreferencesControl, createProps()));
    await openRoot(container);
    await openBranch(container, "workspace-preferences-workspace-trigger");
    await act(async () => document.body.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true })));
    expect(container.querySelector('[role="dialog"]')).toBeNull();
    expect(container.querySelector('[data-cascading-depth="1"]')).toBeNull();
  });
});
