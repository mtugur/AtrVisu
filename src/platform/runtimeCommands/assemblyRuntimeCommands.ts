import type { CommandContext, CommandDefinition, CommandEnableState } from "../contracts";
import { createCommandRegistry } from "../registries";
import {
  createDisabledRuntimeCommandResult,
  createUnavailableRuntimeCommandResult,
  normalizeRuntimeCommandOperationResult,
  type RuntimeCommandOperationResult
} from "./runtimeCommandOperation";

export const ASSEMBLY_COMMAND_IDS = {
  createGroup: "assembly.createGroup",
  addSelected: "assembly.addSelected",
  removeSelected: "assembly.removeSelected",
  enterEdit: "assembly.enterEdit",
  exitEdit: "assembly.exitEdit",
  ungroup: "assembly.ungroup"
} as const;

export type AssemblyCommandId = typeof ASSEMBLY_COMMAND_IDS[keyof typeof ASSEMBLY_COMMAND_IDS];

export type AssemblyRuntimeCommandBinding = {
  getEnableState: (context: CommandContext) => CommandEnableState;
  execute: (context: CommandContext) => RuntimeCommandOperationResult;
};

export type AssemblyRuntimeCommandBindings = Readonly<
  Partial<Record<AssemblyCommandId, AssemblyRuntimeCommandBinding>>
>;

const definitions: Readonly<Record<AssemblyCommandId, Omit<CommandDefinition, "enableRule" | "execute">>> = {
  [ASSEMBLY_COMMAND_IDS.createGroup]: {
    id: ASSEMBLY_COMMAND_IDS.createGroup,
    group: "edit",
    label: "Create Group",
    tooltip: "Create an assembly from the selected layout entities.",
    mutatesData: true,
    requiresUndoTransaction: true
  },
  [ASSEMBLY_COMMAND_IDS.addSelected]: {
    id: ASSEMBLY_COMMAND_IDS.addSelected,
    group: "edit",
    label: "Add Selected",
    tooltip: "Add the selected layout entities to an assembly.",
    mutatesData: true,
    requiresUndoTransaction: true
  },
  [ASSEMBLY_COMMAND_IDS.removeSelected]: {
    id: ASSEMBLY_COMMAND_IDS.removeSelected,
    group: "edit",
    label: "Remove Selected",
    tooltip: "Remove the selected layout entities from an assembly.",
    mutatesData: true,
    requiresUndoTransaction: true
  },
  [ASSEMBLY_COMMAND_IDS.enterEdit]: {
    id: ASSEMBLY_COMMAND_IDS.enterEdit,
    group: "edit",
    label: "Edit Group",
    tooltip: "Edit members of the selected assembly independently.",
    mutatesData: false,
    requiresUndoTransaction: false
  },
  [ASSEMBLY_COMMAND_IDS.exitEdit]: {
    id: ASSEMBLY_COMMAND_IDS.exitEdit,
    group: "edit",
    label: "Exit Group Edit",
    tooltip: "Return the active assembly to rigid selection mode.",
    mutatesData: false,
    requiresUndoTransaction: false
  },
  [ASSEMBLY_COMMAND_IDS.ungroup]: {
    id: ASSEMBLY_COMMAND_IDS.ungroup,
    group: "edit",
    label: "Ungroup",
    tooltip: "Remove the assembly while preserving all member objects and transforms.",
    mutatesData: true,
    requiresUndoTransaction: true
  }
};

const disabled = (reason: string): CommandEnableState => ({ enabled: false, reason });

export const createAssemblyRuntimeCommandBridge = (
  getBindings: () => AssemblyRuntimeCommandBindings
) => {
  const registry = createCommandRegistry();

  Object.values(ASSEMBLY_COMMAND_IDS).forEach((commandId) => {
    const definition = definitions[commandId];
    registry.register({
      ...definition,
      enableRule: (context) => getBindings()[commandId]?.getEnableState(context)
        ?? disabled(`Runtime command "${commandId}" is not bound.`),
      execute: (context) => {
        const binding = getBindings()[commandId];
        if (!binding) {
          throw new Error(`Runtime command "${commandId}" is not bound.`);
        }
        if (binding.getEnableState(context).enabled) {
          normalizeRuntimeCommandOperationResult(binding.execute(context));
        }
      }
    });
  });

  const getRuntimeCommand = (commandId: string, context: CommandContext) => {
    const command = registry.get(commandId);
    if (!command) {
      return {
        commandId,
        registered: false,
        bound: false,
        reachable: false,
        currentlyAvailable: false,
        reason: `Runtime command "${commandId}" is unknown.`
      };
    }
    const binding = getBindings()[commandId as AssemblyCommandId];
    if (!binding) {
      return {
        commandId,
        registered: true,
        bound: false,
        reachable: false,
        currentlyAvailable: false,
        reason: `Runtime command "${commandId}" is not bound.`
      };
    }
    const enableState = binding.getEnableState(context);
    return {
      commandId,
      registered: true,
      bound: true,
      reachable: true,
      currentlyAvailable: enableState.enabled,
      ...(enableState.reason ? { reason: enableState.reason } : {})
    };
  };

  return {
    registry,
    getRuntimeCommand,
    executeCommand(commandId: AssemblyCommandId, context: CommandContext) {
      const binding = getBindings()[commandId];
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
    }
  };
};
