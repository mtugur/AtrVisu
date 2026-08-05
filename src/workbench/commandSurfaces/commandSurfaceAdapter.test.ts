import { describe, expect, it, vi } from "vitest";
import type { CommandContext, CommandDefinition } from "../../platform/contracts";
import { getPlatformCommandSeedById } from "../../platform/registrySeeds";
import {
  createExecutedRuntimeCommandResult,
  createUnavailableRuntimeCommandResult
} from "../../platform/runtimeCommands/runtimeCommandOperation";
import { createCommandSurfaceAdapter } from "./commandSurfaceAdapter";
import {
  COMMAND_BAR_COMMAND_IDS,
  COMMAND_SURFACE_MENU_DEFINITIONS
} from "./commandSurfaceConfig";
import type {
  CommandSurfaceAdapterOptions,
  CoreCommandSurfaceBridge,
  RuntimeCommandSurfaceBridge
} from "./commandSurfaceTypes";

const context: CommandContext = {
  selectionIds: ["machine:a"],
  primarySelectionId: "machine:a",
  hasUnsavedChanges: true
};

const metadataRegistry = {
  get: (commandId: string): CommandDefinition | undefined =>
    getPlatformCommandSeedById(commandId)
};

const createHarness = (overrides: Partial<CommandSurfaceAdapterOptions> = {}) => {
  const coreExecute = vi.fn(() => createExecutedRuntimeCommandResult("core"));
  const runtimeExecute = vi.fn(() => createExecutedRuntimeCommandResult("runtime"));
  const coreBridge: CoreCommandSurfaceBridge = {
    registry: metadataRegistry,
    canExecuteCommand: () => ({ enabled: true }),
    executeCommand: coreExecute
  };
  const runtimeBridge: RuntimeCommandSurfaceBridge = {
    registry: metadataRegistry,
    getRuntimeCommand: (commandId) => ({
      commandId,
      registered: true,
      bound: true,
      reachable: true,
      currentlyAvailable: true
    }),
    executeCommand: runtimeExecute
  };
  const options: CommandSurfaceAdapterOptions = {
    metadataRegistry,
    coreBridge,
    runtimeBridge,
    getContext: () => context,
    importRequest: { request: () => true, isPending: () => false },
    ...overrides
  };
  return {
    adapter: createCommandSurfaceAdapter(options),
    coreExecute,
    runtimeExecute
  };
};

describe("command surface adapter", () => {
  it("projects exact authoritative menus and command-bar order", () => {
    const { adapter } = createHarness();

    expect(adapter.getMenus().map(({ id, labelKey, fallbackLabel }) => ({
      id,
      labelKey,
      fallbackLabel
    }))).toEqual([
      { id: "file", labelKey: "menu.file", fallbackLabel: "File" },
      { id: "edit", labelKey: "menu.edit", fallbackLabel: "Edit" },
      { id: "view", labelKey: "menu.view", fallbackLabel: "View" },
      { id: "tools", labelKey: "menu.tools", fallbackLabel: "Tools" }
    ]);
    expect(adapter.getMenus().map((menu) => menu.items.map((item) => item.commandId)))
      .toEqual(COMMAND_SURFACE_MENU_DEFINITIONS.map((menu) => [...menu.commandIds]));
    expect(adapter.getCommandBarItems().map((item) => item.commandId)).toEqual(COMMAND_BAR_COMMAND_IDS);
    expect(adapter.getMenus().flatMap((menu) => menu.items).find((item) => item.commandId === "edit.undo"))
      .toMatchObject({ label: "Undo", shortcut: "Ctrl/Cmd+Z" });
  });

  it("routes core and runtime commands to one live bridge each without seed execution", async () => {
    const seed = getPlatformCommandSeedById("edit.undo");
    if (!seed) throw new Error("Undo seed missing.");
    const seedExecute = vi.spyOn(seed, "execute");
    const { adapter, coreExecute, runtimeExecute } = createHarness();

    await expect(adapter.execute("edit.undo")).resolves.toMatchObject({ handled: true });
    await expect(adapter.execute("view.toggleLabels")).resolves.toMatchObject({ handled: true });

    expect(coreExecute).toHaveBeenCalledTimes(1);
    expect(runtimeExecute).toHaveBeenCalledTimes(1);
    expect(seedExecute).not.toHaveBeenCalled();
  });

  it("projects disabled reasons and never executes disabled commands", async () => {
    const coreExecute = vi.fn(() => createExecutedRuntimeCommandResult());
    const { adapter } = createHarness({
      coreBridge: {
        registry: metadataRegistry,
        canExecuteCommand: () => ({ enabled: false, reason: "Nothing to undo." }),
        executeCommand: coreExecute
      }
    });

    expect(adapter.getItem("edit.undo", "command-bar")).toMatchObject({
      disabled: true,
      disabledReason: "Nothing to undo."
    });
    await expect(adapter.execute("edit.undo")).resolves.toMatchObject({
      handled: false,
      status: "disabled"
    });
    expect(coreExecute).not.toHaveBeenCalled();
  });

  it("rejects unknown, unsupported-placement, and unbound commands", async () => {
    const { adapter } = createHarness({
      runtimeBridge: {
        registry: metadataRegistry,
        getRuntimeCommand: (commandId) => ({
          commandId,
          registered: true,
          bound: false,
          reachable: false,
          currentlyAvailable: false,
          reason: "Not bound."
        }),
        executeCommand: () => createUnavailableRuntimeCommandResult("Not bound.")
      }
    });

    expect(adapter.getItem("missing.command", "menu-bar")).toBeUndefined();
    expect(adapter.getItem("view.toggleLabels", "invalid" as never)).toBeUndefined();
    expect(adapter.getItem("view.toggleLabels", "command-bar")).toBeUndefined();
    await expect(adapter.execute("missing.command")).resolves.toMatchObject({
      handled: false,
      status: "unsupported",
      reason: expect.stringContaining("command-surface.unknown")
    });
  });

  it("guards duplicate async execution and leaves caller context unchanged", async () => {
    let resolveCommand: ((value: ReturnType<typeof createExecutedRuntimeCommandResult>) => void) | undefined;
    const runtimeExecute = vi.fn(() => new Promise<ReturnType<typeof createExecutedRuntimeCommandResult>>((resolve) => {
      resolveCommand = resolve;
    }));
    const original = { ...context, selectionIds: [...context.selectionIds] };
    const { adapter } = createHarness({
      runtimeBridge: {
        registry: metadataRegistry,
        getRuntimeCommand: (commandId) => ({ commandId, registered: true, bound: true, reachable: true, currentlyAvailable: true }),
        executeCommand: runtimeExecute
      },
      getContext: () => original
    });

    const first = adapter.execute("view.toggleLabels");
    await expect(adapter.execute("view.toggleLabels")).resolves.toMatchObject({ status: "disabled" });
    expect(runtimeExecute).toHaveBeenCalledTimes(1);
    resolveCommand?.(createExecutedRuntimeCommandResult());
    await expect(first).resolves.toMatchObject({ handled: true });
    expect(original).toEqual({ ...context, selectionIds: [...context.selectionIds] });
  });

  it("projects pressed state without owning it", () => {
    let pressed = false;
    const { adapter } = createHarness({ getPressed: () => pressed });

    expect(adapter.getItem("view.toggleLabels", "command-bar")?.pressed).toBe(false);
    pressed = true;
    expect(adapter.getItem("view.toggleLabels", "command-bar")?.pressed).toBe(true);
  });

  it("renders import only with canonical acquisition and never executes payload-free runtime import", async () => {
    let pending = false;
    let onResult: ((result: ReturnType<typeof createExecutedRuntimeCommandResult>) => void) | undefined;
    const request = vi.fn((callback: typeof onResult) => {
      if (pending) return false;
      pending = true;
      onResult = callback;
      return true;
    });
    const withoutProvider = createHarness({ importRequest: undefined }).adapter;
    const { adapter, runtimeExecute } = createHarness({
      importRequest: { request, isPending: () => pending }
    });

    expect(withoutProvider.getItem("project.importJson", "menu-bar")).toBeUndefined();
    expect(adapter.getItem("project.importJson", "menu-bar")).toBeDefined();
    await expect(adapter.execute("project.importJson")).resolves.toMatchObject({ handled: true });
    await expect(adapter.execute("project.importJson")).resolves.toMatchObject({ status: "disabled" });
    expect(request).toHaveBeenCalledTimes(1);
    expect(runtimeExecute).not.toHaveBeenCalled();
    pending = false;
    onResult?.(createExecutedRuntimeCommandResult());
  });
});
