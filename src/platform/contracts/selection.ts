import type { EntityId } from "./entity";

export type SelectionSource = "scene" | "explorer" | "inspector" | "command" | "test";

export type SelectionState = {
  ids: readonly EntityId[];
  primaryId?: EntityId;
  source: SelectionSource;
};

export type SelectionChange = {
  previous: SelectionState;
  next: SelectionState;
};

