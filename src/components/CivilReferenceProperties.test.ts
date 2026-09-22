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
      isLocked,
      onUpdateCivilReference,
      onChangeLayer: vi.fn(),
      onDeleteCivilReference: vi.fn()
    })));
    await render(false);
    const color = container.querySelector<HTMLInputElement>('[aria-label="Civil Color"]')!;
    const opacity = container.querySelector<HTMLInputElement>('[aria-label="Civil Opacity"]')!;
    expect(container.querySelector('option[value="beam"]')).not.toBeNull();
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
});
