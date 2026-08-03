export type EditorId = string;

export const EDITOR_KINDS = ["visual", "document", "table", "report", "analysis"] as const;
export type EditorKind = (typeof EDITOR_KINDS)[number];

export const EDITOR_AVAILABILITY_STATES = ["available", "unavailable", "disabled"] as const;
export type EditorAvailabilityState = (typeof EDITOR_AVAILABILITY_STATES)[number];

export const EDITOR_DEFINITION_SCHEMA_VERSION = 1 as const;

export type EditorDefinition = {
  schemaVersion: typeof EDITOR_DEFINITION_SCHEMA_VERSION;
  id: EditorId;
  kind: EditorKind;
  titleKey: string;
  tooltipKey?: string;
  iconId?: string;
  availability: EditorAvailabilityState;
  unavailableReasonKey?: string;
};
