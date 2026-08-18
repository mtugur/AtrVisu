import type {
  CommandContext,
  CommandDefinition,
  CommandEnableState,
  CommandId
} from "../../platform/contracts";
import type { RuntimeCommandOperationResult } from "../../platform/runtimeCommands/runtimeCommandOperation";

export const COMMAND_SURFACE_PLACEMENTS = [
  "application-bar",
  "menu-bar",
  "command-bar"
] as const;

export type CommandSurfacePlacement = typeof COMMAND_SURFACE_PLACEMENTS[number];

export type CommandSurfaceItem = Readonly<{
  commandId: CommandId;
  placement: CommandSurfacePlacement;
  label: string;
  tooltip: string;
  iconId?: string;
  shortcut?: string;
  disabled: boolean;
  disabledReason?: string;
  pending: boolean;
  pressed?: boolean;
}>;

export type CommandSurfaceMenu = Readonly<{
  id: "file" | "edit" | "view" | "insert" | "arrange" | "tools" | "help";
  labelKey: `menu.${"file" | "edit" | "view" | "insert" | "arrange" | "tools" | "help"}`;
  fallbackLabel: string;
  items: readonly CommandSurfaceItem[];
}>;

export type CommandMetadataRegistry = Readonly<{
  get: (commandId: CommandId) => CommandDefinition | undefined;
}>;

export type CoreCommandSurfaceBridge = Readonly<{
  registry: CommandMetadataRegistry;
  canExecuteCommand: (
    commandId: CommandId,
    context?: CommandContext
  ) => CommandEnableState;
  executeCommand: (
    commandId: CommandId,
    context?: CommandContext
  ) => RuntimeCommandOperationResult;
}>;

export type RuntimeCommandReachability = Readonly<{
  commandId: CommandId;
  registered: boolean;
  bound: boolean;
  reachable: boolean;
  currentlyAvailable: boolean;
  reason?: string;
}>;

export type RuntimeCommandSurfaceBridge = Readonly<{
  registry: CommandMetadataRegistry;
  getRuntimeCommand: (
    commandId: CommandId,
    context?: CommandContext
  ) => RuntimeCommandReachability;
  executeCommand: (
    commandId: CommandId,
    context?: CommandContext
  ) => RuntimeCommandOperationResult | Promise<RuntimeCommandOperationResult>;
}>;

export type AssemblyCommandSurfaceBridge = RuntimeCommandSurfaceBridge;

export type CommandSurfaceImportRequest = Readonly<{
  request: (onResult: (result: RuntimeCommandOperationResult) => void) => boolean;
  isPending: () => boolean;
}>;

export type CommandSurfaceAdapterOptions = Readonly<{
  metadataRegistry: CommandMetadataRegistry;
  coreBridge: CoreCommandSurfaceBridge;
  runtimeBridge: RuntimeCommandSurfaceBridge;
  assemblyBridge: AssemblyCommandSurfaceBridge;
  getContext: () => CommandContext;
  getPressed?: (commandId: CommandId) => boolean | undefined;
  importRequest?: CommandSurfaceImportRequest;
}>;

export type CommandSurfaceAdapter = Readonly<{
  getApplicationSaveItem: () => CommandSurfaceItem | undefined;
  getMenus: () => readonly CommandSurfaceMenu[];
  getCommandBarItems: () => readonly CommandSurfaceItem[];
  getItem: (
    commandId: CommandId,
    placement: CommandSurfacePlacement
  ) => CommandSurfaceItem | undefined;
  execute: (commandId: CommandId, payload?: unknown) => Promise<RuntimeCommandOperationResult>;
  subscribe: (listener: () => void) => () => void;
  getRevision: () => number;
}>;
