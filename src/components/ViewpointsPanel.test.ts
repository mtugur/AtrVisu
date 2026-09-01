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
  const rerender = async (nextViewpoints: LayoutViewpoint[], nextSelectedViewpointId: string | null) => {
    await act(async () => {
      root.render(createElement(ViewpointsPanel, {
        viewpoints: nextViewpoints,
        selectedViewpointId: nextSelectedViewpointId,
        ...handlers
      }));
    });
  };
  return { container, handlers, rerender };
};

const setStripGeometry = async (
  strip: HTMLDivElement,
  geometry: { clientWidth: number; scrollWidth: number; scrollLeft?: number }
) => {
  Object.defineProperty(strip, "clientWidth", { configurable: true, value: geometry.clientWidth });
  Object.defineProperty(strip, "scrollWidth", { configurable: true, value: geometry.scrollWidth });
  strip.scrollLeft = geometry.scrollLeft ?? 0;
  await act(async () => strip.dispatchEvent(new Event("scroll")));
};

describe("ViewpointsPanel", () => {
  it("renders an intentional compact zero-viewpoint state without navigation or actions", async () => {
    const { container } = await renderPanel([], null);
    const panel = container.querySelector('[data-testid="viewpoints-panel"]') as HTMLElement;

    expect(Array.from(panel.children).map((child) => child.className)).toEqual([
      "viewpoints-toolbar",
      "viewpoints-results"
    ]);
    expect(container.querySelector(".viewpoint-list")?.textContent).toContain("No viewpoints saved yet.");
    expect(container.querySelector('[data-testid="viewpoint-context-actions"]')).toBeNull();
    expect(container.querySelector('[data-testid="viewpoint-strip-scroll-backward"]')).toBeNull();
    expect(container.querySelector('[data-testid="viewpoint-strip-scroll-forward"]')).toBeNull();
    expect(container.querySelector<HTMLButtonElement>('[aria-label="Previous Viewpoint"]')?.disabled).toBe(true);
    expect(container.querySelector<HTMLButtonElement>('[aria-label="Next Viewpoint"]')?.disabled).toBe(true);
  });

  it("renders one saved viewpoint without overflow controls or contextual actions before selection", async () => {
    const viewpoint = createViewpoint("overview", "Overview");
    const { container, handlers } = await renderPanel([viewpoint], null);
    const item = container.querySelector<HTMLButtonElement>('[data-testid="viewpoint-item-overview"]');

    expect(item?.textContent).toContain("Overview");
    expect(item?.getAttribute("aria-pressed")).toBe("false");
    expect(container.querySelector('[data-testid="viewpoint-context-actions"]')).toBeNull();
    expect(container.querySelector('[data-testid^="viewpoint-strip-scroll-"]')).toBeNull();
    await act(async () => item?.click());
    expect(handlers.onSelectViewpoint).toHaveBeenCalledWith("overview");
  });

  it.each([4, 5, 8, 20])("keeps %i viewpoint cards inside the dedicated saved-list viewport", async (count) => {
    const viewpoints = Array.from({ length: count }, (_, index) => (
      createViewpoint(`viewpoint-${index + 1}`, `Viewpoint ${index + 1}`)
    ));
    const { container } = await renderPanel(viewpoints, "viewpoint-1");
    const panel = container.querySelector('[data-testid="viewpoints-panel"]') as HTMLElement;
    const navigation = container.querySelector('[data-testid="viewpoint-navigation"]') as HTMLElement;
    const strip = container.querySelector('[data-testid="viewpoint-strip"]') as HTMLElement;
    const list = container.querySelector(".viewpoint-list") as HTMLElement;
    const contextActions = container.querySelector('[data-testid="viewpoint-context-actions"]') as HTMLElement;

    expect(container.querySelectorAll(".viewpoint-list-item")).toHaveLength(count);
    expect(container.querySelector('[data-testid="viewpoint-item-viewpoint-1"]')?.getAttribute("aria-pressed"))
      .toBe("true");
    expect(strip.contains(list)).toBe(true);
    expect(navigation.contains(strip)).toBe(true);
    expect(strip.contains(contextActions)).toBe(false);
    expect(contextActions.parentElement).toBe(container.querySelector('[data-testid="viewpoints-results"]'));
    expect(Array.from(panel.children).map((child) => child.className)).toEqual([
      "viewpoints-toolbar",
      "viewpoints-results"
    ]);
    expect(Array.from(contextActions?.querySelectorAll("button") ?? []).map((button) => button.textContent?.trim()))
      .toEqual(["Apply", "Update", "Rename", "Delete"]);

    await setStripGeometry(strip as HTMLDivElement, {
      clientWidth: 720,
      scrollWidth: count * 176
    });
    expect(Boolean(container.querySelector('[data-testid="viewpoint-strip-scroll-backward"]')))
      .toBe(count > 4);
    expect(Boolean(container.querySelector('[data-testid="viewpoint-strip-scroll-forward"]')))
      .toBe(count > 4);
  });

  it("keeps long names as the only visual card line while retaining accessible timestamps", async () => {
    const viewpoint = createViewpoint(
      "turkish-line",
      "Uzun Atara Paketleme Hatti Genel Gorunumu"
    );
    const { container } = await renderPanel([viewpoint], "turkish-line");
    const item = container.querySelector<HTMLButtonElement>('[data-testid="viewpoint-item-turkish-line"]')!;

    expect(Array.from(item.children).map((child) => child.tagName)).toEqual(["STRONG"]);
    expect(item.textContent).toBe(viewpoint.name);
    expect(item.title).toContain(viewpoint.name);
    expect(item.title).toContain("Updated");
    expect(item.getAttribute("aria-label")).toContain("updated");
  });

  it("shows compact strip controls only for overflow and keeps actions fixed outside it", async () => {
    const viewpoints = Array.from({ length: 20 }, (_, index) => (
      createViewpoint(`viewpoint-${index + 1}`, `Viewpoint ${index + 1}`)
    ));
    const { container } = await renderPanel(viewpoints, "viewpoint-1");
    const strip = container.querySelector<HTMLDivElement>('[data-testid="viewpoint-strip"]') as HTMLDivElement;
    const scrollBy = vi.fn((optionsOrX?: ScrollToOptions | number) => {
      strip.scrollLeft += typeof optionsOrX === "number" ? optionsOrX : optionsOrX?.left ?? 0;
      strip.dispatchEvent(new Event("scroll"));
    });
    strip.scrollBy = scrollBy as typeof strip.scrollBy;

    await setStripGeometry(strip, { clientWidth: 320, scrollWidth: 3200 });
    const backward = container.querySelector<HTMLButtonElement>('[data-testid="viewpoint-strip-scroll-backward"]');
    const forward = container.querySelector<HTMLButtonElement>('[data-testid="viewpoint-strip-scroll-forward"]');
    const actions = container.querySelector('[data-testid="viewpoint-context-actions"]') as HTMLElement;

    expect(backward?.disabled).toBe(true);
    expect(forward?.disabled).toBe(false);
    expect(strip.contains(actions)).toBe(false);
    await act(async () => forward?.click());
    expect(scrollBy).toHaveBeenCalledWith({ left: 256, behavior: "smooth" });

    await setStripGeometry(strip, { clientWidth: 3200, scrollWidth: 3200 });
    expect(container.querySelector('[data-testid="viewpoint-strip-scroll-backward"]')).toBeNull();
    expect(container.querySelector('[data-testid="viewpoint-strip-scroll-forward"]')).toBeNull();
  });

  it("automatically reveals the selected card for programmatic selection changes", async () => {
    const viewpoints = Array.from({ length: 20 }, (_, index) => (
      createViewpoint(`viewpoint-${index + 1}`, `Viewpoint ${index + 1}`)
    ));
    const { container, rerender } = await renderPanel(viewpoints, "viewpoint-1");
    const strip = container.querySelector<HTMLDivElement>('[data-testid="viewpoint-strip"]') as HTMLDivElement;
    vi.spyOn(strip, "getBoundingClientRect").mockReturnValue({
      left: 0,
      right: 320
    } as DOMRect);
    const target = container.querySelector<HTMLButtonElement>('[data-testid="viewpoint-item-viewpoint-10"]')!;
    vi.spyOn(target, "getBoundingClientRect").mockImplementation(() => ({
      left: 480 - strip.scrollLeft,
      right: 636 - strip.scrollLeft
    } as DOMRect));

    await rerender(viewpoints, "viewpoint-10");
    expect(strip.scrollLeft).toBe(316);
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
