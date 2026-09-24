// @vitest-environment jsdom

import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { describe, expect, it, vi } from "vitest";
import { createCivilReference } from "../utils/civil";
import { CivilReferenceProperties } from "./CivilReferenceProperties";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const change = (input: HTMLInputElement, value: string) => {
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set?.call(input, value);
  input.dispatchEvent(new Event("input", { bubbles: true }));
  input.dispatchEvent(new Event("change", { bubbles: true }));
};

describe("CivilReferenceProperties style authority", () => {
  it("edits the placed CivilReferenceItem style and disables controls when locked", async () => {
    const item = createCivilReference("beam", { xMm: 0, yMm: 0 }, "2026-09-21T00:00:00.000Z");
    const onUpdateCivilReference = vi.fn();
    const container = document.createElement("div");
    const root = createRoot(container);
    const render = async (isLocked: boolean) => act(async () => root.render(createElement(CivilReferenceProperties, {
      selectedCivilReference: item,
      layers: [],
      levels: [{ id: "ground", name: "Ground", elevationMm: 0, systemLevel: true, createdAt: "now", updatedAt: "now" }],
      isLocked,
      onUpdateCivilReference,
      onChangeLayer: vi.fn(),
      onChangeLevel: vi.fn(),
      onUpdateRelativeElevation: vi.fn(),
      onDeleteCivilReference: vi.fn()
    })));
    await render(false);
    const color = container.querySelector<HTMLInputElement>('[aria-label="Civil Color"]')!;
    const opacity = container.querySelector<HTMLInputElement>('[aria-label="Civil Opacity"]')!;
    expect(container.querySelector('option[value="beam"]')).not.toBeNull();
    expect(container.textContent).toContain("Depth / Thickness (mm)");
    expect(container.textContent).toContain("Height (mm)");
    expect(container.querySelector('[aria-label="Civil Depth"]')).not.toBeNull();
    expect(container.querySelector('[aria-label="Civil Height"]')).not.toBeNull();
    expect(container.querySelector('[aria-label="Civil Plan Depth"]')).toBeNull();
    expect(container.querySelector('[aria-label="Civil Floor Thickness"]')).toBeNull();
    expect(color.value).toBe(item.style?.colorToken);
    await act(async () => change(color, "#09aabb"));
    await act(async () => change(opacity, "0.42"));
    expect(onUpdateCivilReference).toHaveBeenCalledWith(item.id, { style: expect.objectContaining({ colorToken: "#09aabb" }) });
    expect(onUpdateCivilReference).toHaveBeenCalledWith(item.id, { style: expect.objectContaining({ opacity: 0.42 }) });
    await render(true);
    expect(color.disabled).toBe(true);
    expect(opacity.disabled).toBe(true);
    await act(async () => root.unmount());
  });

  it("projects Floor Area elevation from its top surface and preserves that top through thickness edits", async () => {
    const item = createCivilReference("floor-area", { xMm: 0, yMm: 0 }, "2026-09-24T00:00:00.000Z");
    item.levelId = "ground";
    item.positionMm.zMm = -20;
    const onUpdateCivilReference = vi.fn();
    const container = document.createElement("div");
    const root = createRoot(container);
    await act(async () => root.render(createElement(CivilReferenceProperties, {
      selectedCivilReference: item,
      layers: [],
      levels: [{ id: "ground", name: "Ground", elevationMm: 0, systemLevel: true, createdAt: "now", updatedAt: "now" }],
      isLocked: false,
      onUpdateCivilReference,
      onChangeLayer: vi.fn(),
      onChangeLevel: vi.fn(),
      onUpdateRelativeElevation: vi.fn(),
      onDeleteCivilReference: vi.fn()
    })));

    expect(container.querySelector<HTMLInputElement>('[aria-label="Civil Top Elevation above Level"]')?.value).toBe("0");
    expect(container.querySelector('[data-testid="civil-world-elevation"]')?.textContent).toContain("Top Surface World Elevation0 mm");
    expect(container.textContent).toContain("Plan Depth (mm)");
    expect(container.textContent).toContain("Floor Thickness (mm)");
    expect(container.textContent).not.toContain("Depth / Thickness (mm)");
    expect(container.querySelector('[aria-label="Civil Plan Depth"]')).not.toBeNull();
    expect(container.querySelector('[aria-label="Civil Depth"]')).toBeNull();
    expect(container.querySelector('[aria-label="Civil Height"]')).toBeNull();
    const floorThickness = container.querySelector<HTMLInputElement>('[aria-label="Civil Floor Thickness"]')!;
    await act(async () => change(floorThickness, "350"));
    expect(onUpdateCivilReference).toHaveBeenCalledWith(item.id, expect.objectContaining({
      positionMm: expect.objectContaining({ zMm: -350 }),
      sizeMm: expect.objectContaining({ heightMm: 350 })
    }));
    expect(container.querySelector('[aria-label="Civil Elevation above Level"]')).toBeNull();
    await act(async () => root.unmount());
  });
});
