import { describe, expect, it, vi } from "vitest";
import {
  ASSEMBLY_COMMAND_IDS,
  createAssemblyRuntimeCommandBridge,
  type AssemblyRuntimeCommandBindings
} from "./assemblyRuntimeCommands";
import {
  createCancelledRuntimeCommandResult,
  createExecutedRuntimeCommandResult
} from "./runtimeCommandOperation";

const context = {
  selectionIds: ["group:g1"],
  primarySelectionId: "group:g1",
  hasUnsavedChanges: false
};

describe("assembly runtime commands", () => {
  it("registers every current assembly action", () => {
    const bridge = createAssemblyRuntimeCommandBridge(() => ({}));

    expect(bridge.registry.list().map((command) => command.id)).toEqual([
      ASSEMBLY_COMMAND_IDS.createGroup,
      ASSEMBLY_COMMAND_IDS.addSelected,
      ASSEMBLY_COMMAND_IDS.removeSelected,
      ASSEMBLY_COMMAND_IDS.enterEdit,
      ASSEMBLY_COMMAND_IDS.exitEdit,
      ASSEMBLY_COMMAND_IDS.ungroup
    ]);
  });

  it("executes only an enabled live binding", () => {
    const execute = vi.fn(() => createExecutedRuntimeCommandResult());
    const getEnableState = vi.fn(() => ({ enabled: true }));
    const bindings: AssemblyRuntimeCommandBindings = {
      [ASSEMBLY_COMMAND_IDS.enterEdit]: { execute, getEnableState }
    };
    const bridge = createAssemblyRuntimeCommandBridge(() => bindings);

    expect(bridge.executeCommand(ASSEMBLY_COMMAND_IDS.enterEdit, context)).toEqual({
      handled: true,
      status: "executed"
    });
    expect(getEnableState).toHaveBeenCalledTimes(1);
    expect(execute).toHaveBeenCalledTimes(1);
  });

  it("does not execute a disabled command", () => {
    const execute = vi.fn(() => createExecutedRuntimeCommandResult());
    const bridge = createAssemblyRuntimeCommandBridge(() => ({
      [ASSEMBLY_COMMAND_IDS.ungroup]: {
        execute,
        getEnableState: () => ({ enabled: false, reason: "No assembly selected." })
      }
    }));

    expect(bridge.executeCommand(ASSEMBLY_COMMAND_IDS.ungroup, context)).toEqual({
      handled: false,
      status: "disabled",
      reason: "No assembly selected."
    });
    expect(execute).not.toHaveBeenCalled();
  });

  it("uses replacement bindings without rebuilding the registry", () => {
    const first = vi.fn(() => createExecutedRuntimeCommandResult());
    const second = vi.fn(() => createExecutedRuntimeCommandResult());
    let bindings: AssemblyRuntimeCommandBindings = {
      [ASSEMBLY_COMMAND_IDS.exitEdit]: { execute: first, getEnableState: () => ({ enabled: true }) }
    };
    const bridge = createAssemblyRuntimeCommandBridge(() => bindings);
    const registry = bridge.registry;

    bindings = {
      [ASSEMBLY_COMMAND_IDS.exitEdit]: { execute: second, getEnableState: () => ({ enabled: true }) }
    };
    bridge.executeCommand(ASSEMBLY_COMMAND_IDS.exitEdit, context);

    expect(bridge.registry).toBe(registry);
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
  });

  it("returns an unbound command as unavailable", () => {
    const bridge = createAssemblyRuntimeCommandBridge(() => ({}));

    expect(bridge.executeCommand(ASSEMBLY_COMMAND_IDS.ungroup, context)).toEqual({
      handled: false,
      status: "unavailable",
      reason: 'Runtime command "assembly.ungroup" is not bound.'
    });
  });

  it("returns a cancelled Ungroup result without converting it to executed", () => {
    const execute = vi.fn(() =>
      createCancelledRuntimeCommandResult("Ungroup was cancelled.")
    );
    const bridge = createAssemblyRuntimeCommandBridge(() => ({
      [ASSEMBLY_COMMAND_IDS.ungroup]: {
        execute,
        getEnableState: () => ({ enabled: true })
      }
    }));

    expect(bridge.executeCommand(ASSEMBLY_COMMAND_IDS.ungroup, context)).toEqual({
      handled: false,
      status: "cancelled",
      reason: "Ungroup was cancelled."
    });
    expect(execute).toHaveBeenCalledOnce();
  });

  it("keeps direct registry execution enablement-protected", () => {
    const execute = vi.fn(() => createExecutedRuntimeCommandResult());
    const getEnableState = vi.fn(() => ({ enabled: false, reason: "Disabled." }));
    const bridge = createAssemblyRuntimeCommandBridge(() => ({
      [ASSEMBLY_COMMAND_IDS.ungroup]: { execute, getEnableState }
    }));

    bridge.registry.get(ASSEMBLY_COMMAND_IDS.ungroup)?.execute(context);

    expect(getEnableState).toHaveBeenCalledOnce();
    expect(execute).not.toHaveBeenCalled();
  });

  it("keeps callback errors observable", () => {
    const bridge = createAssemblyRuntimeCommandBridge(() => ({
      [ASSEMBLY_COMMAND_IDS.ungroup]: {
        getEnableState: () => ({ enabled: true }),
        execute: () => {
          throw new Error("Ungroup failed.");
        }
      }
    }));

    expect(() => bridge.executeCommand(ASSEMBLY_COMMAND_IDS.ungroup, context))
      .toThrow("Ungroup failed.");
  });
});
