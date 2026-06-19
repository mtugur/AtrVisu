import type { CommandDefinition, CommandId } from "../contracts";

const hasText = (value: string) => value.trim().length > 0;

export const validateCommandDefinition = (command: CommandDefinition) => {
  if (!hasText(command.id)) {
    throw new Error("Command id is required.");
  }
  if (!hasText(command.label)) {
    throw new Error(`Command "${command.id}" label is required.`);
  }
  if (!hasText(command.tooltip)) {
    throw new Error(`Command "${command.id}" tooltip is required.`);
  }
  if (command.mutatesData && !command.requiresUndoTransaction) {
    throw new Error(`Command "${command.id}" mutates data and must require an undo transaction.`);
  }
  if (command.group === "view" && command.mutatesData) {
    throw new Error(`View command "${command.id}" must not mutate data.`);
  }
};

export const createCommandRegistry = () => {
  const commands = new Map<CommandId, CommandDefinition>();

  return {
    register(command: CommandDefinition) {
      validateCommandDefinition(command);
      if (commands.has(command.id)) {
        throw new Error(`Duplicate command id "${command.id}".`);
      }
      commands.set(command.id, command);
      return command;
    },
    get(id: CommandId) {
      return commands.get(id);
    },
    list() {
      return Array.from(commands.values());
    },
    validate(command: CommandDefinition) {
      validateCommandDefinition(command);
    }
  };
};

