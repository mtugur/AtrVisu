// @vitest-environment jsdom

import { createElement } from "react";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { LayoutViewpoint } from "../types/viewpoints";
import { ViewpointsPanel } from "./ViewpointsPanel";

const actEnvironment = globalThis as typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean;
};
actEnvironment.IS_REACT_ACT_ENVIRONMENT = true;

const roots: Root[] = [];

afterEach(async () => {
  vi.restoreAllMocks();
  await act(async () => roots.splice(0).forEach((root) => root.unmount()));
});

const createViewpoint = (id: string, name: string): LayoutViewpoint => ({
  id,
  name,
  camera: {
    alpha: 0.75,
    beta: 1.1,
    radius: 28,
    targetX: 1,
    targetY: 0,
    targetZ: -2
  },
  createdAt: "2026-08-13T10:00:00.000Z",
  updatedAt: "2026-08-13T10:05:00.000Z"
});

const callbacks = () => ({
  onSelectViewpoint: vi.fn(),
  onCaptureViewpoint: vi.fn(),
  onApplyViewpoint: vi.fn(),
  onUpdateViewpoint: vi.fn(),
  onRenameViewpoint: vi.fn(),
  onDeleteViewpoint: vi.fn(),
  onStepViewpoint: vi.fn()
});

const renderPanel = async (
  viewpoints: LayoutViewpoint[],
  selectedViewpointId: string | null
) => {
  const handlers = callbacks();
  const container = document.createElement("div");
  const root = createRoot(container);
  roots.push(root);
  await act(async () => {
    root.render(createElement(ViewpointsPanel, {
      viewpoints,
      selectedViewpointId,
      ...handlers
    }));
  });
  return { container, handlers };
};

describe("ViewpointsPanel", () => {
  it("renders an intentional compact empty state in two stable layout regions", async () => {
    const { container } = await renderPanel([], null);
    const panel = container.querySelector('[data-testid="viewpoints-panel"]') as HTMLElement;

    expect(Array.from(panel.children).map((child) => child.className)).toEqual([
      "viewpoints-toolbar",
      "viewpoints-results"
    ]);
    expect(container.querySelector(".viewpoint-list")?.textContent).toContain("No viewpoints saved yet.");
    expect(container.querySelector('[data-testid="viewpoint-context-actions"]')).toBeNull();
    expect(container.querySelector<HTMLButtonElement>('[aria-label="Previous Viewpoint"]')?.disabled).toBe(true);
    expect(container.querySelector<HTMLButtonElement>('[aria-label="Next Viewpoint"]')?.disabled).toBe(true);
  });

  it("renders one saved viewpoint without creating contextual actions before selection", async () => {
    const viewpoint = createViewpoint("overview", "Overview");
    const { container, handlers } = await renderPanel([viewpoint], null);
    const item = container.querySelector<HTMLButtonElement>('[data-testid="viewpoint-item-overview"]');

    expect(item?.textContent).toContain("Overview");
    expect(item?.getAttribute("aria-pressed")).toBe("false");
    expect(container.querySelector('[data-testid="viewpoint-context-actions"]')).toBeNull();
    await act(async () => item?.click());
    expect(handlers.onSelectViewpoint).toHaveBeenCalledWith("overview");
  });

  it("keeps selected actions bounded inside the saved-viewpoint strip", async () => {
    const viewpoints = [
      createViewpoint("overview", "Overview"),
      createViewpoint("detail", "Detail"),
      createViewpoint("service", "Service")
    ];
    const { container } = await renderPanel(viewpoints, "detail");
    const panel = container.querySelector('[data-testid="viewpoints-panel"]') as HTMLElement;
    const strip = container.querySelector('[data-testid="viewpoint-strip"]');
    const contextActions = container.querySelector('[data-testid="viewpoint-context-actions"]');

    expect(container.querySelectorAll(".viewpoint-list-item")).toHaveLength(3);
    expect(container.querySelector('[data-testid="viewpoint-item-detail"]')?.getAttribute("aria-pressed")).toBe("true");
    expect(contextActions?.parentElement).toBe(strip);
    expect(Array.from(panel.children).map((child) => child.className)).toEqual([
      "viewpoints-toolbar",
      "viewpoints-results"
    ]);
    expect(Array.from(contextActions?.querySelectorAll("button") ?? []).map((button) => button.textContent?.trim()))
      .toEqual(["Apply", "Update", "Rename", "Delete"]);
  });

  it("keeps every existing viewpoint command reachable from the stable composition", async () => {
    const viewpoint = createViewpoint("overview", "Overview");
    const { container, handlers } = await renderPanel([viewpoint], "overview");
    const input = container.querySelector<HTMLInputElement>('[data-testid="viewpoint-name-input"]') as HTMLInputElement;
    const item = container.querySelector<HTMLButtonElement>('[data-testid="viewpoint-item-overview"]') as HTMLButtonElement;
    vi.spyOn(window, "prompt").mockReturnValue("Renamed Overview");

    await act(async () => {
      const valueSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
      valueSetter?.call(input, "Captured Overview");
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });
    await act(async () => container.querySelector<HTMLButtonElement>('[data-testid="capture-viewpoint"]')?.click());
    await act(async () => container.querySelector<HTMLButtonElement>('[aria-label="Previous Viewpoint"]')?.click());
    await act(async () => container.querySelector<HTMLButtonElement>('[aria-label="Next Viewpoint"]')?.click());
    await act(async () => item.click());
    await act(async () => item.dispatchEvent(new MouseEvent("dblclick", { bubbles: true })));
    await act(async () => container.querySelector<HTMLButtonElement>('[aria-label="Apply / Go To"]')?.click());
    await act(async () => container.querySelector<HTMLButtonElement>('[aria-label="Update From Current View"]')?.click());
    await act(async () => Array.from(container.querySelectorAll<HTMLButtonElement>('[data-testid="viewpoint-context-actions"] button'))
      .find((button) => button.textContent === "Rename")?.click());
    await act(async () => Array.from(container.querySelectorAll<HTMLButtonElement>('[data-testid="viewpoint-context-actions"] button'))
      .find((button) => button.textContent === "Delete")?.click());

    expect(handlers.onCaptureViewpoint).toHaveBeenCalledWith("Captured Overview");
    expect(handlers.onStepViewpoint).toHaveBeenNthCalledWith(1, "previous");
    expect(handlers.onStepViewpoint).toHaveBeenNthCalledWith(2, "next");
    expect(handlers.onSelectViewpoint).toHaveBeenCalledWith("overview");
    expect(handlers.onApplyViewpoint).toHaveBeenCalledTimes(2);
    expect(handlers.onApplyViewpoint).toHaveBeenLastCalledWith("overview");
    expect(handlers.onUpdateViewpoint).toHaveBeenCalledWith("overview");
    expect(handlers.onRenameViewpoint).toHaveBeenCalledWith("overview", "Renamed Overview");
    expect(handlers.onDeleteViewpoint).toHaveBeenCalledWith("overview");
  });
});
