export type CommandId = string;

export type CommandGroup = "file" | "edit" | "view" | "insert" | "arrange" | "tools";

export type CommandEnableState = {
  enabled: boolean;
  reason?: string;
};

export type CommandContext = {
  selectionIds: readonly string[];
  primarySelectionId?: string;
  hasUnsavedChanges: boolean;
};

export type CommandDefinition = {
  id: CommandId;
  group: CommandGroup;
  label: string;
  tooltip: string;
  icon?: string;
  shortcut?: string;
  enableRule?: (context: CommandContext) => CommandEnableState;
  execute: (context: CommandContext) => void | Promise<void>;
  mutatesData: boolean;
  requiresUndoTransaction: boolean;
};

