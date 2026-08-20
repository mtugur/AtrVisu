import { describe, expect, it, vi } from "vitest";
import type { CommandContext } from "../contracts";
import { createArrangeRuntimeCommandBindings } from "./arrangeRuntimeCommands";
import {
  createExecutedRuntimeFeatureCommandResult,
  RUNTIME_FEATURE_COMMAND_IDS
} from "./runtimeFeatureCommands";

const context: CommandContext = { selectionIds: [], hasUnsavedChanges: false };

const createHarness = (selectedCount: number, movementAllowed = true) => {
  const align = vi.fn();
  const distribute = vi.fn();
  const equalGap = vi.fn();
  const openAlignmentTools = vi.fn(() => createExecutedRuntimeFeatureCommandResult());
  return {
    bindings: createArrangeRuntimeCommandBindings({
      selectedCount,
      movementAllowed,
      align,
      distribute,
      equalGap,
      openAlignmentTools
    }),
    align,
    distribute,
    equalGap,
    openAlignmentTools
  };
};

describe("Arrange runtime command bindings", () => {
  it("delegates every promoted alignment, distribution, gap, and advanced action", () => {
    const harness = createHarness(3);
    const execute = (id: keyof typeof harness.bindings) => harness.bindings[id]?.execute(context);

    execute(RUNTIME_FEATURE_COMMAND_IDS.alignLeft);
    execute(RUNTIME_FEATURE_COMMAND_IDS.alignRight);
    execute(RUNTIME_FEATURE_COMMAND_IDS.alignFront);
    execute(RUNTIME_FEATURE_COMMAND_IDS.alignBack);
    execute(RUNTIME_FEATURE_COMMAND_IDS.alignCenterX);
    execute(RUNTIME_FEATURE_COMMAND_IDS.alignCenterY);
    execute(RUNTIME_FEATURE_COMMAND_IDS.distributeHorizontal);
    execute(RUNTIME_FEATURE_COMMAND_IDS.distributeVertical);
    execute(RUNTIME_FEATURE_COMMAND_IDS.equalGapX);
    execute(RUNTIME_FEATURE_COMMAND_IDS.equalGapY);
    execute(RUNTIME_FEATURE_COMMAND_IDS.alignmentTools);

    expect(harness.align.mock.calls.map(([action]) => action)).toEqual([
      "left", "right", "front", "back", "centerX", "centerY"
    ]);
    expect(harness.distribute.mock.calls.map(([action]) => action)).toEqual(["horizontal", "vertical"]);
    expect(harness.equalGap.mock.calls.map(([action]) => action)).toEqual(["gapX", "gapY"]);
    expect(harness.openAlignmentTools).toHaveBeenCalledTimes(1);
  });

  it("enforces two-entity alignment and three-entity distribution thresholds", () => {
    const one = createHarness(1).bindings;
    const two = createHarness(2).bindings;
    const three = createHarness(3).bindings;

    expect(one[RUNTIME_FEATURE_COMMAND_IDS.alignLeft]?.getEnableState(context).enabled).toBe(false);
    expect(two[RUNTIME_FEATURE_COMMAND_IDS.alignLeft]?.getEnableState(context).enabled).toBe(true);
    expect(two[RUNTIME_FEATURE_COMMAND_IDS.distributeHorizontal]?.getEnableState(context).enabled).toBe(false);
    expect(two[RUNTIME_FEATURE_COMMAND_IDS.equalGapX]?.getEnableState(context).enabled).toBe(false);
    expect(three[RUNTIME_FEATURE_COMMAND_IDS.distributeHorizontal]?.getEnableState(context).enabled).toBe(true);
    expect(three[RUNTIME_FEATURE_COMMAND_IDS.equalGapX]?.getEnableState(context).enabled).toBe(true);
  });

  it("rejects Arrange mutations while keeping the non-mutating Selection Tools entry reachable", () => {
    const bindings = createHarness(3, false).bindings;
    Object.entries(bindings).forEach(([commandId, binding]) => {
      if (commandId === RUNTIME_FEATURE_COMMAND_IDS.alignmentTools) {
        expect(binding?.getEnableState(context)).toEqual({ enabled: true });
        return;
      }
      expect(binding?.getEnableState(context)).toMatchObject({
        enabled: false,
        reason: expect.stringContaining("unlocked")
      });
    });
  });
});
