import type {
  CommandContext,
  CommandDefinition,
  CommandEnableState,
  CommandId
} from "../contracts";
import { createCommandRegistry } from "../registries";
import { getPlatformCommandSeedById } from "../registrySeeds";
import {
  createDisabledRuntimeCommandResult,
  createUnavailableRuntimeCommandResult,
  createUnsupportedRuntimeCommandResult,
  normalizeRuntimeCommandOperationResult,
  type RuntimeCommandOperationResult
} from "./runtimeCommandOperation";

export const CORE_EDITOR_COMMAND_IDS = {
  undo: "edit.undo",
  redo: "edit.redo",
  deleteSelected: "edit.deleteSelected",
  duplicateSelected: "edit.duplicateSelected"
} as const;

export type CoreEditorCommandId =
  typeof CORE_EDITOR_COMMAND_IDS[keyof typeof CORE_EDITOR_COMMAND_IDS];

export type CoreEditorRuntimeCommandBinding = {
  getEnableState: (context: CommandContext) => CommandEnableState;
  execute: (context: CommandContext) => RuntimeCommandOperationResult;
};

export type CoreEditorRuntimeCommandBindings = Readonly<
  Partial<Record<CoreEditorCommandId, CoreEditorRuntimeCommandBinding>>
>;

export type CoreEditorCommandExecutor = (commandId: CoreEditorCommandId) => boolean;

export type LockAwareSelectionTarget = {
  exists: boolean;
  locked: boolean;
};

export type LockAwareMachineTarget = {
  id: string;
  locked: boolean;
};

export type DeleteSelectionEligibility = {
  civil: LockAwareSelectionTarget | null;
  annotation: LockAwareSelectionTarget | null;
  machines: readonly LockAwareMachineTarget[];
};

const coreEditorCommandIds = Object.values(CORE_EDITOR_COMMAND_IDS);

const defaultCommandContext: CommandContext = {
  selectionIds: [],
  hasUnsavedChanges: false
};

const disabledState = (reason: string): CommandEnableState => ({
  enabled: false,
  reason
});

export const isMachineSelectionDuplicable = (
  selectedIds: readonly string[],
  resolvedMachines: readonly LockAwareMachineTarget[]
) => selectedIds.length > 0
  && resolvedMachines.length === selectedIds.length
  && resolvedMachines.every((machine) => !machine.locked);

export const isDeleteSelectionEligible = ({
  civil,
  annotation,
  machines
}: DeleteSelectionEligibility) => {
  if (civil) {
    return civil.exists && !civil.locked;
  }
  if (annotation) {
    return annotation.exists && !annotation.locked;
  }
  return machines.some((machine) => !machine.locked);
};

export const createCoreEditorCommandAction = (
  commandId: CoreEditorCommandId,
  executeCommand: CoreEditorCommandExecutor
) => () => executeCommand(commandId);

const createRuntimeCommandDefinition = (
  commandId: CoreEditorCommandId,
  getBindings: () => CoreEditorRuntimeCommandBindings
): CommandDefinition => {
  const seed = getPlatformCommandSeedById(commandId);
  if (!seed) {
    throw new Error(`Command seed "${commandId}" is required for runtime binding.`);
  }

  return {
    ...seed,
    enableRule: (context) => {
      const binding = getBindings()[commandId];
      return binding
        ? binding.getEnableState(context)
        : disabledState(`Runtime command "${commandId}" is not bound.`);
    },
    execute: (context) => {
      const binding = getBindings()[commandId];
      if (!binding) {
        throw new Error(`Runtime command "${commandId}" is not bound.`);
      }
      if (!binding.getEnableState(context).enabled) {
        return;
      }
      normalizeRuntimeCommandOperationResult(binding.execute(context));
    }
  };
};

export const createCoreEditorRuntimeCommandBridge = (
  getBindings: () => CoreEditorRuntimeCommandBindings
) => {
  const registry = createCommandRegistry();

  coreEditorCommandIds.forEach((commandId) => {
    registry.register(createRuntimeCommandDefinition(commandId, getBindings));
  });

  const canExecuteCommand = (
    commandId: CommandId,
    context: CommandContext = defaultCommandContext,
    bindings: CoreEditorRuntimeCommandBindings = getBindings()
  ): CommandEnableState => {
    const command = registry.get(commandId);
    if (!command) {
      return disabledState(`Runtime command "${commandId}" is unknown.`);
    }
    const binding = bindings[command.id as CoreEditorCommandId];
    return binding
      ? binding.getEnableState(context)
      : disabledState(`Runtime command "${commandId}" is not bound.`);
  };

  const executeCommand = (
    commandId: CommandId,
    context: CommandContext = defaultCommandContext
  ): RuntimeCommandOperationResult => {
    const command = registry.get(commandId);
    if (!command) {
      return createUnsupportedRuntimeCommandResult(
        `Runtime command "${commandId}" is unknown.`
      );
    }

    const binding = getBindings()[command.id as CoreEditorCommandId];
    if (!binding) {
      return createUnavailableRuntimeCommandResult(
        `Runtime command "${commandId}" is not bound.`
      );
    }

    const enableState = binding.getEnableState(context);
    if (!enableState.enabled) {
      return createDisabledRuntimeCommandResult(
        enableState.reason ?? `Runtime command "${commandId}" is disabled.`
      );
    }

    return normalizeRuntimeCommandOperationResult(binding.execute(context));
  };

  return {
    registry,
    canExecuteCommand,
    executeCommand
  };
};
