// @vitest-environment jsdom

import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_PLACEMENT_SETTINGS } from "../utils/placementSettings";
import { PrecisionPlacementPanel } from "./PrecisionPlacementPanel";

const roots: ReturnType<typeof createRoot>[] = [];
const actEnvironment = globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean };
actEnvironment.IS_REACT_ACT_ENVIRONMENT = true;

afterEach(async () => {
  await act(async () => roots.splice(0).forEach((root) => root.unmount()));
  document.body.replaceChildren();
});

describe("PrecisionPlacementPanel", () => {
  it("keeps Keyboard Nudge settings reachable through Measurement Helpers", async () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);
    roots.push(root);
    const onChangeNudgeSettings = vi.fn();
    const nudgeSettings = { nudgeStepMm: 100, largeNudgeStepMm: 1000, smallNudgeStepMm: 10 };

    await act(async () => root.render(createElement(PrecisionPlacementPanel, {
      settings: { ...DEFAULT_PLACEMENT_SETTINGS, showMeasurementHelpers: true },
      nudgeSettings,
      placedMachines: [],
      onChangeSettings: vi.fn(),
      onChangeNudgeSettings,
      onUpdateMachine: vi.fn()
    })));

    expect(container.querySelector('[data-testid="precision-nudge-settings"]')?.textContent).toContain("Keyboard Nudge");
    const input = container.querySelector<HTMLInputElement>('[aria-label="Default Nudge Step"]') as HTMLInputElement;
    await act(async () => {
      const valueSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
      valueSetter?.call(input, "250");
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });
    expect(onChangeNudgeSettings).toHaveBeenCalledWith({ ...nudgeSettings, nudgeStepMm: 250 });
  });

  it("does not render Nudge settings while Measurement Helpers are hidden", async () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);
    roots.push(root);

    await act(async () => root.render(createElement(PrecisionPlacementPanel, {
      settings: { ...DEFAULT_PLACEMENT_SETTINGS, showMeasurementHelpers: false },
      nudgeSettings: { nudgeStepMm: 100, largeNudgeStepMm: 1000, smallNudgeStepMm: 10 },
      placedMachines: [],
      onChangeSettings: vi.fn(),
      onChangeNudgeSettings: vi.fn(),
      onUpdateMachine: vi.fn()
    })));

    expect(container.querySelector('[data-testid="precision-nudge-settings"]')).toBeNull();
  });
});
