import type { AlignmentAction, DistributionAction, EqualGapAction } from "../../types/alignment";
import type { CommandEnableState } from "../contracts";
import {
  createExecutedRuntimeFeatureCommandResult,
  RUNTIME_FEATURE_COMMAND_IDS,
  type RuntimeFeatureCommandBindings,
  type RuntimeFeatureCommandOperationResult
} from "./runtimeFeatureCommands";

export type ArrangeRuntimeCommandOptions = Readonly<{
  selectedCount: number;
  movementAllowed: boolean;
  align: (action: AlignmentAction) => void;
  distribute: (action: DistributionAction) => void;
  equalGap: (action: EqualGapAction) => void;
  openAlignmentTools: () => RuntimeFeatureCommandOperationResult;
}>;

const enableFor = (
  selectedCount: number,
  minimumCount: number,
  movementAllowed: boolean
): CommandEnableState => selectedCount >= minimumCount && movementAllowed
  ? { enabled: true }
  : {
      enabled: false,
      reason: `Select at least ${minimumCount === 2 ? "two" : "three"} unlocked alignable entities.`
    };

export const createArrangeRuntimeCommandBindings = (
  options: ArrangeRuntimeCommandOptions
): RuntimeFeatureCommandBindings => {
  const alignEnableState = () => enableFor(options.selectedCount, 2, options.movementAllowed);
  const distributeEnableState = () => enableFor(options.selectedCount, 3, options.movementAllowed);
  const align = (action: AlignmentAction) => () => {
    options.align(action);
    return createExecutedRuntimeFeatureCommandResult();
  };
  const distribute = (action: DistributionAction) => () => {
    options.distribute(action);
    return createExecutedRuntimeFeatureCommandResult();
  };
  const equalGap = (action: EqualGapAction) => () => {
    options.equalGap(action);
    return createExecutedRuntimeFeatureCommandResult();
  };

  return {
    [RUNTIME_FEATURE_COMMAND_IDS.alignLeft]: { getEnableState: alignEnableState, execute: align("left") },
    [RUNTIME_FEATURE_COMMAND_IDS.alignRight]: { getEnableState: alignEnableState, execute: align("right") },
    [RUNTIME_FEATURE_COMMAND_IDS.alignFront]: { getEnableState: alignEnableState, execute: align("front") },
    [RUNTIME_FEATURE_COMMAND_IDS.alignBack]: { getEnableState: alignEnableState, execute: align("back") },
    [RUNTIME_FEATURE_COMMAND_IDS.alignCenterX]: { getEnableState: alignEnableState, execute: align("centerX") },
    [RUNTIME_FEATURE_COMMAND_IDS.alignCenterY]: { getEnableState: alignEnableState, execute: align("centerY") },
    [RUNTIME_FEATURE_COMMAND_IDS.distributeHorizontal]: {
      getEnableState: distributeEnableState,
      execute: distribute("horizontal")
    },
    [RUNTIME_FEATURE_COMMAND_IDS.distributeVertical]: {
      getEnableState: distributeEnableState,
      execute: distribute("vertical")
    },
    [RUNTIME_FEATURE_COMMAND_IDS.equalGapX]: { getEnableState: distributeEnableState, execute: equalGap("gapX") },
    [RUNTIME_FEATURE_COMMAND_IDS.equalGapY]: { getEnableState: distributeEnableState, execute: equalGap("gapY") },
    [RUNTIME_FEATURE_COMMAND_IDS.alignmentTools]: {
      getEnableState: () => ({ enabled: true }),
      execute: options.openAlignmentTools
    }
  };
};
