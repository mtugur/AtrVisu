import { describe, expect, it, vi } from "vitest";
import type { CommandEnableState } from "../contracts";
import { getPlatformCommandSeedById } from "../registrySeeds";
import { getEditorCommandIdForShortcutAction } from "../../utils/keyboardShortcuts";
import {
  CORE_EDITOR_COMMAND_IDS,
  createCoreEditorCommandAction,
  createCoreEditorRuntimeCommandBridge,
  isDeleteSelectionEligible,
  isMachineSelectionDuplicable,
  type CoreEditorRuntimeCommandBindings
} from "./coreEditorRuntimeCommands";

const enabled = (): CommandEnableState => ({ enabled: true });
const disabled = (reason = "Disabled for test."): CommandEnableState => ({
  enabled: false,
  reason
});

const createBindings = (
  execute: () => void = vi.fn(),
  getEnableState: () => CommandEnableState = enabled
): CoreEditorRuntimeCommandBindings => ({
  [CORE_EDITOR_COMMAND_IDS.undo]: { execute, getEnableState },
  [CORE_EDITOR_COMMAND_IDS.redo]: { execute, getEnableState },
  [CORE_EDITOR_COMMAND_IDS.deleteSelected]: { execute, getEnableState },
  [CORE_EDITOR_COMMAND_IDS.duplicateSelected]: { execute, getEnableState }
});

describe("core editor runtime command bridge", () => {
  it("registers live definitions for exactly the four core editor commands", () => {
    const bridge = createCoreEditorRuntimeCommandBridge(() => createBindings());

    expect(bridge.registry.list().map((command) => command.id)).toEqual([
      CORE_EDITOR_COMMAND_IDS.undo,
      CORE_EDITOR_COMMAND_IDS.redo,
      CORE_EDITOR_COMMAND_IDS.deleteSelected,
      CORE_EDITOR_COMMAND_IDS.duplicateSelected
    ]);
  });

  it("preserves seed metadata while replacing every seed noop execute function", () => {
    const bridge = createCoreEditorRuntimeCommandBridge(() => createBindings());

    Object.values(CORE_EDITOR_COMMAND_IDS).forEach((commandId) => {
      const seed = getPlatformCommandSeedById(commandId);
      const runtimeCommand = bridge.registry.get(commandId);

      expect(runtimeCommand).toMatchObject({
        id: seed?.id,
        group: seed?.group,
        label: seed?.label,
        tooltip: seed?.tooltip,
        shortcut: seed?.shortcut,
        mutatesData: seed?.mutatesData,
        requiresUndoTransaction: seed?.requiresUndoTransaction
      });
      expect(runtimeCommand?.execute).not.toBe(seed?.execute);
    });
  });

  it("direct registry execution evaluates enablement once and invokes an enabled live binding once", () => {
    const execute = vi.fn();
    const getEnableState = vi.fn(enabled);
    const bridge = createCoreEditorRuntimeCommandBridge(() => createBindings(execute, getEnableState));
    const command = bridge.registry.get(CORE_EDITOR_COMMAND_IDS.undo);

    command?.execute({ selectionIds: [], hasUnsavedChanges: false });

    expect(getEnableState).toHaveBeenCalledOnce();
    expect(execute).toHaveBeenCalledOnce();
  });

  it("direct registry execution evaluates enablement once and skips a disabled binding", () => {
    const execute = vi.fn();
    const getEnableState = vi.fn(() => disabled());
    const bridge = createCoreEditorRuntimeCommandBridge(() => createBindings(execute, getEnableState));
    const command = bridge.registry.get(CORE_EDITOR_COMMAND_IDS.redo);

    command?.execute({ selectionIds: [], hasUnsavedChanges: false });

    expect(getEnableState).toHaveBeenCalledOnce();
    expect(execute).not.toHaveBeenCalled();
  });

  it("direct registry execution uses a replaced bindings object without rebuilding the registry", () => {
    const oldExecute = vi.fn();
    const replacementExecute = vi.fn();
    let bindings = createBindings(oldExecute);
    const bridge = createCoreEditorRuntimeCommandBridge(() => bindings);
    const command = bridge.registry.get(CORE_EDITOR_COMMAND_IDS.undo);

    command?.execute({ selectionIds: [], hasUnsavedChanges: false });
    bindings = createBindings(replacementExecute);
    command?.execute({ selectionIds: [], hasUnsavedChanges: false });

    expect(bridge.registry.get(CORE_EDITOR_COMMAND_IDS.undo)).toBe(command);
    expect(oldExecute).toHaveBeenCalledOnce();
    expect(replacementExecute).toHaveBeenCalledOnce();
  });

  it("direct registry execution invokes the live binding and never the seed noop", () => {
    const execute = vi.fn();
    const bridge = createCoreEditorRuntimeCommandBridge(() => createBindings(execute));
    const seed = getPlatformCommandSeedById(CORE_EDITOR_COMMAND_IDS.undo);
    const command = bridge.registry.get(CORE_EDITOR_COMMAND_IDS.undo);

    expect(command?.execute).not.toBe(seed?.execute);
    command?.execute({ selectionIds: [], hasUnsavedChanges: false });

    expect(execute).toHaveBeenCalledOnce();
  });

  it("direct registry execution throws when its required live binding is absent", () => {
    const bridge = createCoreEditorRuntimeCommandBridge(() => ({}));
    const command = bridge.registry.get(CORE_EDITOR_COMMAND_IDS.undo);

    expect(() => command?.execute({ selectionIds: [], hasUnsavedChanges: false })).toThrow(
      'Runtime command "edit.undo" is not bound.'
    );
  });

  it("evaluates enablement once and executes an enabled command exactly once", () => {
    const execute = vi.fn();
    const getEnableState = vi.fn(enabled);
    const bridge = createCoreEditorRuntimeCommandBridge(() => createBindings(execute, getEnableState));

    expect(bridge.executeCommand(CORE_EDITOR_COMMAND_IDS.undo)).toEqual({ handled: true });
    expect(getEnableState).toHaveBeenCalledOnce();
    expect(execute).toHaveBeenCalledTimes(1);
  });

  it("does not execute a disabled command", () => {
    const execute = vi.fn();
    const getEnableState = vi.fn(() => disabled());
    const bridge = createCoreEditorRuntimeCommandBridge(() => createBindings(execute, getEnableState));

    expect(bridge.executeCommand(CORE_EDITOR_COMMAND_IDS.redo)).toEqual({
      handled: false,
      reason: "Disabled for test."
    });
    expect(getEnableState).toHaveBeenCalledOnce();
    expect(execute).not.toHaveBeenCalled();
  });

  it("cannot report handled when a second enablement read would skip the callback", () => {
    const execute = vi.fn();
    const getEnableState = vi.fn()
      .mockReturnValueOnce(enabled())
      .mockReturnValue(disabled("A second read would be disabled."));
    const bridge = createCoreEditorRuntimeCommandBridge(() => createBindings(execute, getEnableState));

    expect(bridge.executeCommand(CORE_EDITOR_COMMAND_IDS.undo)).toEqual({ handled: true });
    expect(getEnableState).toHaveBeenCalledOnce();
    expect(execute).toHaveBeenCalledOnce();
  });

  it("handles unknown and currently unbound command ids safely", () => {
    const bridge = createCoreEditorRuntimeCommandBridge(() => ({}));

    expect(bridge.executeCommand("edit.unknown")).toEqual({
      handled: false,
      reason: 'Runtime command "edit.unknown" is unknown.'
    });
    expect(bridge.executeCommand("project.save")).toEqual({
      handled: false,
      reason: 'Runtime command "project.save" is unknown.'
    });
    expect(bridge.executeCommand(CORE_EDITOR_COMMAND_IDS.undo)).toEqual({
      handled: false,
      reason: 'Runtime command "edit.undo" is not bound.'
    });
  });

  it("evaluates current undo and redo eligibility independently without rebuilding", () => {
    let canUndo = false;
    let canRedo = true;
    const executeUndo = vi.fn();
    const executeRedo = vi.fn();
    const bindings: CoreEditorRuntimeCommandBindings = {
      ...createBindings(),
      [CORE_EDITOR_COMMAND_IDS.undo]: {
        execute: executeUndo,
        getEnableState: () => canUndo ? enabled() : disabled("Nothing to undo.")
      },
      [CORE_EDITOR_COMMAND_IDS.redo]: {
        execute: executeRedo,
        getEnableState: () => canRedo ? enabled() : disabled("Nothing to redo.")
      }
    };
    const bridge = createCoreEditorRuntimeCommandBridge(() => bindings);

    expect(bridge.canExecuteCommand(CORE_EDITOR_COMMAND_IDS.undo)).toEqual({
      enabled: false,
      reason: "Nothing to undo."
    });
    expect(bridge.canExecuteCommand(CORE_EDITOR_COMMAND_IDS.redo)).toEqual({ enabled: true });

    canUndo = true;
    canRedo = false;

    expect(bridge.canExecuteCommand(CORE_EDITOR_COMMAND_IDS.undo)).toEqual({ enabled: true });
    expect(bridge.canExecuteCommand(CORE_EDITOR_COMMAND_IDS.redo)).toEqual({
      enabled: false,
      reason: "Nothing to redo."
    });
    expect(bridge.executeCommand(CORE_EDITOR_COMMAND_IDS.undo).handled).toBe(true);
    expect(bridge.executeCommand(CORE_EDITOR_COMMAND_IDS.redo).handled).toBe(false);
    expect(executeUndo).toHaveBeenCalledTimes(1);
    expect(executeRedo).not.toHaveBeenCalled();
  });

  it("uses a replaced bindings object without rebuilding the registry", () => {
    const oldExecute = vi.fn();
    const disabledReplacementExecute = vi.fn();
    const currentExecute = vi.fn();
    let bindings = createBindings(oldExecute);
    const bridge = createCoreEditorRuntimeCommandBridge(() => bindings);
    const originalRegistry = bridge.registry;

    expect(bridge.executeCommand(CORE_EDITOR_COMMAND_IDS.undo)).toEqual({ handled: true });

    bindings = createBindings(
      disabledReplacementExecute,
      () => disabled("Replacement is disabled.")
    );

    expect(bridge.canExecuteCommand(CORE_EDITOR_COMMAND_IDS.undo)).toEqual({
      enabled: false,
      reason: "Replacement is disabled."
    });
    expect(bridge.executeCommand(CORE_EDITOR_COMMAND_IDS.undo)).toEqual({
      handled: false,
      reason: "Replacement is disabled."
    });

    bindings = createBindings(currentExecute);

    expect(bridge.registry).toBe(originalRegistry);
    expect(bridge.canExecuteCommand(CORE_EDITOR_COMMAND_IDS.undo)).toEqual({ enabled: true });
    expect(bridge.executeCommand(CORE_EDITOR_COMMAND_IDS.undo)).toEqual({ handled: true });
    expect(oldExecute).toHaveBeenCalledOnce();
    expect(disabledReplacementExecute).not.toHaveBeenCalled();
    expect(currentExecute).toHaveBeenCalledOnce();
  });

  it("does not swallow execution errors", () => {
    const error = new Error("Undo failed.");
    const bridge = createCoreEditorRuntimeCommandBridge(() => createBindings(() => {
      throw error;
    }));

    expect(() => bridge.executeCommand(CORE_EDITOR_COMMAND_IDS.undo)).toThrow(error);
  });

  it("routes visible actions and keyboard shortcuts through the same command id", () => {
    const executeCommand = vi.fn(() => true);
    const visibleAction = createCoreEditorCommandAction(
      CORE_EDITOR_COMMAND_IDS.duplicateSelected,
      executeCommand
    );
    const keyboardCommandId = getEditorCommandIdForShortcutAction("duplicate-selected");

    visibleAction();

    expect(keyboardCommandId).toBe(CORE_EDITOR_COMMAND_IDS.duplicateSelected);
    expect(executeCommand).toHaveBeenCalledOnce();
    expect(executeCommand).toHaveBeenCalledWith(keyboardCommandId);
  });
});

describe("core editor command eligibility", () => {
  const machine = (id: string, locked = false) => ({ id, locked });

  it("preserves single and multi-selection duplicate eligibility", () => {
    expect(isMachineSelectionDuplicable([], [])).toBe(false);
    expect(isMachineSelectionDuplicable(["a"], [machine("a")])).toBe(true);
    expect(isMachineSelectionDuplicable(["a", "b"], [machine("a"), machine("b")])).toBe(true);
    expect(isMachineSelectionDuplicable(["a", "b"], [machine("a")])).toBe(false);
    expect(isMachineSelectionDuplicable(["a", "b"], [machine("a"), machine("b", true)])).toBe(false);
  });

  it("preserves civil delete lock and existence policy", () => {
    expect(isDeleteSelectionEligible({
      civil: { exists: true, locked: false },
      annotation: null,
      machines: []
    })).toBe(true);
    expect(isDeleteSelectionEligible({
      civil: { exists: true, locked: true },
      annotation: null,
      machines: [machine("a")]
    })).toBe(false);
    expect(isDeleteSelectionEligible({
      civil: { exists: false, locked: false },
      annotation: null,
      machines: [machine("a")]
    })).toBe(false);
  });

  it("preserves annotation delete layer-lock policy", () => {
    expect(isDeleteSelectionEligible({
      civil: null,
      annotation: { exists: true, locked: false },
      machines: []
    })).toBe(true);
    expect(isDeleteSelectionEligible({
      civil: null,
      annotation: { exists: true, locked: true },
      machines: [machine("a")]
    })).toBe(false);
  });

  it("preserves eligible-unlocked machine delete policy", () => {
    expect(isDeleteSelectionEligible({
      civil: null,
      annotation: null,
      machines: [machine("a", true), machine("b")]
    })).toBe(true);
    expect(isDeleteSelectionEligible({
      civil: null,
      annotation: null,
      machines: [machine("a", true), machine("b", true)]
    })).toBe(false);
  });
});
