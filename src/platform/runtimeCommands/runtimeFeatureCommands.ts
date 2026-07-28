import type {
  CommandContext,
  CommandDefinition,
  CommandEnableState,
  CommandId
} from "../contracts";
import { createCommandRegistry } from "../registries";
import { getPlatformCommandSeedById } from "../registrySeeds";
import {
  createExecutedRuntimeCommandResult,
  createUnsupportedRuntimeCommandResult,
  createUnavailableRuntimeCommandResult,
  normalizeRuntimeCommandOperationResult,
  type RuntimeCommandOperationResult,
  type RuntimeCommandOperationStatus
} from "./runtimeCommandOperation";

export const RUNTIME_FEATURE_COMMAND_IDS = {
  projectSave: "project.save",
  projectExportJson: "project.exportJson",
  projectImportJson: "project.importJson",
  projectRestorePrompt: "project.restorePrompt",
  toggleLabels: "view.toggleLabels",
  viewpoints: "view.viewpoints",
  toggleConnectionPoints: "view.toggleConnectionPoints",
  showMeasurements: "view.showMeasurements",
  addMachine: "library.addMachine",
  libraryManager: "library.manager",
  taxonomyManager: "library.taxonomyManager",
  createAnnotation: "annotations.create",
  addFloor: "civil.addFloor",
  addWall: "civil.addWall",
  addColumn: "civil.addColumn",
  addWalkway: "civil.addWalkway",
  addRestrictedZone: "civil.addRestrictedZone",
  addReferenceZone: "civil.addReferenceZone",
  alignSelection: "alignment.alignSelection",
  rotationSnap: "snap.rotation",
  connectionPointSnap: "snap.connectionPoint",
  collisionCheck: "collision.check",
  performanceBenchmark: "performance.benchmark"
} as const;

export type RuntimeFeatureCommandId =
  typeof RUNTIME_FEATURE_COMMAND_IDS[keyof typeof RUNTIME_FEATURE_COMMAND_IDS];

export type RuntimeFeatureCommandBinding = {
  getEnableState: (context: CommandContext) => CommandEnableState;
  execute: (
    context: CommandContext
  ) => RuntimeFeatureCommandOperationResult | Promise<RuntimeFeatureCommandOperationResult>;
};

export type RuntimeFeatureCommandBindings = Readonly<
  Partial<Record<RuntimeFeatureCommandId, RuntimeFeatureCommandBinding>>
>;

export type RuntimeCommandReachability = {
  commandId: CommandId;
  registered: boolean;
  bound: boolean;
  reachable: boolean;
  currentlyAvailable: boolean;
  reason?: string;
};

export type RuntimeFeatureCommandOperationStatus = RuntimeCommandOperationStatus;
export type RuntimeFeatureCommandOperationResult = RuntimeCommandOperationResult;

const commandIds = Object.values(RUNTIME_FEATURE_COMMAND_IDS);
const defaultContext: CommandContext = {
  selectionIds: [],
  hasUnsavedChanges: false
};

const disabled = (reason: string): CommandEnableState => ({ enabled: false, reason });
export const createExecutedRuntimeFeatureCommandResult =
  createExecutedRuntimeCommandResult;

export const normalizeRuntimeFeatureCommandOperationResult =
  normalizeRuntimeCommandOperationResult;

const createRuntimeDefinition = (
  commandId: RuntimeFeatureCommandId,
  getBindings: () => RuntimeFeatureCommandBindings
): CommandDefinition => {
  const seed = getPlatformCommandSeedById(commandId);
  if (!seed) {
    throw new Error(`Command seed "${commandId}" is required for runtime binding.`);
  }

  return {
    ...seed,
    enableRule: (context) => getBindings()[commandId]?.getEnableState(context)
      ?? disabled(`Runtime command "${commandId}" is not bound.`),
    execute: (context) => {
      const binding = getBindings()[commandId];
      if (!binding) {
        throw new Error(`Runtime command "${commandId}" is not bound.`);
      }
      const enableState = binding.getEnableState(context);
      if (!enableState.enabled) {
        return;
      }
      const result = binding.execute(context);
      if (result instanceof Promise) {
        return result.then((operationResult) => {
          normalizeRuntimeCommandOperationResult(operationResult);
        });
      }
      normalizeRuntimeCommandOperationResult(result);
    }
  };
};

export const createRuntimeFeatureCommandBridge = (
  getBindings: () => RuntimeFeatureCommandBindings
) => {
  const registry = createCommandRegistry();

  commandIds.forEach((commandId) => {
    registry.register(createRuntimeDefinition(commandId, getBindings));
  });

  const getRuntimeCommand = (
    commandId: CommandId,
    context: CommandContext = defaultContext
  ): RuntimeCommandReachability => {
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
    const binding = getBindings()[command.id as RuntimeFeatureCommandId];
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

  const executeCommand = (
    commandId: CommandId,
    context: CommandContext = defaultContext
  ): RuntimeFeatureCommandOperationResult | Promise<RuntimeFeatureCommandOperationResult> => {
    const command = registry.get(commandId);
    if (!command) {
      return createUnsupportedRuntimeCommandResult(
        `Runtime command "${commandId}" is unknown.`
      );
    }
    const binding = getBindings()[command.id as RuntimeFeatureCommandId];
    if (!binding) {
      return createUnavailableRuntimeCommandResult(
        `Runtime command "${commandId}" is not bound.`
      );
    }
    const enableState = binding.getEnableState(context);
    if (!enableState.enabled) {
      return {
        handled: false,
        status: "disabled",
        reason: enableState.reason ?? `Runtime command "${commandId}" is disabled.`
      };
    }
    const result = binding.execute(context);
    if (result instanceof Promise) {
      return result.then(normalizeRuntimeCommandOperationResult);
    }
    return normalizeRuntimeCommandOperationResult(result);
  };

  return {
    registry,
    getRuntimeCommand,
    listRuntimeCommands: (context: CommandContext = defaultContext) =>
      commandIds.map((commandId) => getRuntimeCommand(commandId, context)),
    executeCommand
  };
};

export type RuntimeFeatureCommandBridge = ReturnType<typeof createRuntimeFeatureCommandBridge>;
