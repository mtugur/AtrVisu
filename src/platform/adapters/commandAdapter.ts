import type { CommandContext, CommandDefinition } from "../contracts";

type CommandDefinitionWithoutExecute = Omit<CommandDefinition, "execute">;

const hasText = (value: string) => value.trim().length > 0;

export const createNoopCommand = (
  definition: CommandDefinitionWithoutExecute
): CommandDefinition => ({
  ...definition,
  execute: () => undefined
});

export const createDisabledCommand = (
  definition: CommandDefinitionWithoutExecute,
  reason: string
): CommandDefinition => ({
  ...createNoopCommand(definition),
  enableRule: (_context: CommandContext) => ({
    enabled: false,
    reason
  })
});

export const isCommandDataSafe = (command: CommandDefinition) => {
  if (!hasText(command.label) || !hasText(command.tooltip)) {
    return false;
  }
  if (command.mutatesData && !command.requiresUndoTransaction) {
    return false;
  }
  if (command.group === "view" && command.mutatesData) {
    return false;
  }
  return true;
};

