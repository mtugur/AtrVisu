import type { CommandContext, CommandId } from "../../platform/contracts";
import { RUNTIME_FEATURE_COMMAND_IDS } from "../../platform/runtimeCommands/runtimeFeatureCommands";
import {
  createDisabledRuntimeCommandResult,
  createExecutedRuntimeCommandResult,
  createFailedRuntimeCommandResult,
  createUnavailableRuntimeCommandResult,
  createUnsupportedRuntimeCommandResult,
  normalizeRuntimeCommandOperationResult,
  type RuntimeCommandOperationResult
} from "../../platform/runtimeCommands/runtimeCommandOperation";
import {
  APPLICATION_BAR_COMMAND_IDS,
  COMMAND_BAR_COMMAND_IDS,
  COMMAND_SURFACE_MENU_DEFINITIONS,
  getCommandSurfaceRuntimeRoute
} from "./commandSurfaceConfig";
import type {
  CommandSurfaceAdapter,
  CommandSurfaceAdapterOptions,
  CommandSurfaceItem,
  CommandSurfacePlacement
} from "./commandSurfaceTypes";
import { COMMAND_SURFACE_PLACEMENTS } from "./commandSurfaceTypes";

export const COMMAND_SURFACE_ERROR_CODES = Object.freeze({
  unknown: "command-surface.unknown",
  unsupported: "command-surface.unsupported",
  unbound: "command-surface.unbound",
  pending: "command-surface.pending",
  importUnavailable: "command-surface.import-unavailable"
} as const);

const withCode = (code: string, message: string) => `${code}: ${message}`;

const getContextWithPayload = (context: CommandContext, payload?: unknown) => ({
  ...context,
  ...(payload === undefined ? {} : { payload })
});

export const createCommandSurfaceAdapter = (
  options: CommandSurfaceAdapterOptions
): CommandSurfaceAdapter => {
  const pendingCommandIds = new Set<CommandId>();
  const listeners = new Set<() => void>();
  let revision = 0;

  const emitChange = () => {
    revision += 1;
    listeners.forEach((listener) => listener());
  };

  const isPending = (commandId: CommandId) =>
    pendingCommandIds.has(commandId)
    || (commandId === RUNTIME_FEATURE_COMMAND_IDS.projectImportJson
      && options.importRequest?.isPending() === true);

  const getAvailability = (commandId: CommandId) => {
    const metadata = options.metadataRegistry.get(commandId);
    if (!metadata) {
      return {
        renderable: false,
        enabled: false,
        reason: withCode(COMMAND_SURFACE_ERROR_CODES.unknown, `Command "${commandId}" is not registered.`)
      };
    }

    const route = getCommandSurfaceRuntimeRoute(commandId);
    if (!route) {
      return {
        renderable: false,
        enabled: false,
        reason: withCode(COMMAND_SURFACE_ERROR_CODES.unsupported, `Command "${commandId}" has no runtime route.`)
      };
    }

    if (isPending(commandId)) {
      return {
        renderable: true,
        enabled: false,
        reason: withCode(COMMAND_SURFACE_ERROR_CODES.pending, `${metadata.label} is already running.`)
      };
    }

    const context = options.getContext();
    if (route === "core") {
      if (!options.coreBridge.registry.get(commandId)) {
        return {
          renderable: false,
          enabled: false,
          reason: withCode(COMMAND_SURFACE_ERROR_CODES.unbound, `Command "${commandId}" is not bound to the core bridge.`)
        };
      }
      const enableState = options.coreBridge.canExecuteCommand(commandId, context);
      return {
        renderable: true,
        enabled: enableState.enabled,
        reason: enableState.reason
      };
    }

    if (commandId === RUNTIME_FEATURE_COMMAND_IDS.projectImportJson) {
      return options.importRequest
        ? { renderable: true, enabled: true, reason: undefined }
        : {
            renderable: false,
            enabled: false,
            reason: withCode(COMMAND_SURFACE_ERROR_CODES.importUnavailable, "Project import file acquisition is unavailable.")
          };
    }

    const bridge = route === "assembly" ? options.assemblyBridge : options.runtimeBridge;
    const reachability = bridge.getRuntimeCommand(commandId, context);
    return {
      renderable: reachability.registered && reachability.bound && reachability.reachable,
      enabled: reachability.currentlyAvailable,
      reason: reachability.reason
    };
  };

  const getItem = (
    commandId: CommandId,
    placement: CommandSurfacePlacement
  ): CommandSurfaceItem | undefined => {
    if (!(COMMAND_SURFACE_PLACEMENTS as readonly string[]).includes(placement)) {
      return undefined;
    }
    const metadata = options.metadataRegistry.get(commandId);
    const availability = getAvailability(commandId);
    if (!metadata || !availability.renderable) {
      return undefined;
    }
    const pending = isPending(commandId);
    const pressed = options.getPressed?.(commandId);
    return {
      commandId,
      placement,
      label: metadata.label,
      tooltip: metadata.tooltip,
      ...(metadata.shortcut ? { shortcut: metadata.shortcut } : {}),
      ...(metadata.iconId ? { iconId: metadata.iconId } : {}),
      disabled: !availability.enabled,
      ...(availability.reason ? { disabledReason: availability.reason } : {}),
      pending,
      ...(pressed === undefined ? {} : { pressed })
    };
  };

  const executeRuntime = async (
    commandId: CommandId,
    context: CommandContext
  ) => normalizeRuntimeCommandOperationResult(
    await options.runtimeBridge.executeCommand(commandId, context)
  );

  const execute = async (commandId: CommandId, payload?: unknown): Promise<RuntimeCommandOperationResult> => {
    const metadata = options.metadataRegistry.get(commandId);
    if (!metadata) {
      return createUnsupportedRuntimeCommandResult(
        withCode(COMMAND_SURFACE_ERROR_CODES.unknown, `Command "${commandId}" is not registered.`)
      );
    }
    const route = getCommandSurfaceRuntimeRoute(commandId);
    if (!route) {
      return createUnsupportedRuntimeCommandResult(
        withCode(COMMAND_SURFACE_ERROR_CODES.unsupported, `Command "${commandId}" has no runtime route.`)
      );
    }
    const availability = getAvailability(commandId);
    if (!availability.renderable) {
      return createUnavailableRuntimeCommandResult(availability.reason ?? `${metadata.label} is unavailable.`);
    }
    if (!availability.enabled) {
      return createDisabledRuntimeCommandResult(availability.reason ?? `${metadata.label} is disabled.`);
    }

    if (commandId === RUNTIME_FEATURE_COMMAND_IDS.projectImportJson) {
      const importRequest = options.importRequest;
      if (!importRequest) {
        return createUnavailableRuntimeCommandResult(
          withCode(COMMAND_SURFACE_ERROR_CODES.importUnavailable, "Project import file acquisition is unavailable.")
        );
      }
      const requested = importRequest.request(() => emitChange());
      return requested
        ? createExecutedRuntimeCommandResult("Project import file selection requested.")
        : createUnavailableRuntimeCommandResult("Project import file selection could not be started.");
    }

    pendingCommandIds.add(commandId);
    emitChange();
    try {
      const context = getContextWithPayload(options.getContext(), payload);
      return route === "core"
        ? normalizeRuntimeCommandOperationResult(options.coreBridge.executeCommand(commandId, context))
        : route === "assembly"
          ? normalizeRuntimeCommandOperationResult(await options.assemblyBridge.executeCommand(commandId, context))
          : await executeRuntime(commandId, context);
    } catch (error) {
      return createFailedRuntimeCommandResult(error);
    } finally {
      pendingCommandIds.delete(commandId);
      emitChange();
    }
  };

  return {
    getApplicationSaveItem: () => getItem(APPLICATION_BAR_COMMAND_IDS[0], "application-bar"),
    getMenus: () => COMMAND_SURFACE_MENU_DEFINITIONS.map((menu) => ({
      id: menu.id,
      labelKey: menu.labelKey,
      fallbackLabel: menu.fallbackLabel,
      items: menu.commandIds
        .map((commandId) => getItem(commandId, "menu-bar"))
        .filter((item): item is CommandSurfaceItem => Boolean(item))
    })),
    getCommandBarItems: () => COMMAND_BAR_COMMAND_IDS
      .map((commandId) => getItem(commandId, "command-bar"))
      .filter((item): item is CommandSurfaceItem => Boolean(item)),
    getItem,
    execute,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    getRevision: () => revision
  };
};
