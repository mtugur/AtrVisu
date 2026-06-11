export type SelectionState = {
  selectedObjectIds: string[];
  primarySelectedObjectId: string | null;
};

export type SelectionMode = "replace" | "toggle" | "clear";

export type NudgeSettings = {
  nudgeStepMm: number;
  largeNudgeStepMm: number;
  smallNudgeStepMm: number;
};
