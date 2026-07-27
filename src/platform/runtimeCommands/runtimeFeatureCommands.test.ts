import { describe, expect, it, vi } from "vitest";
import type { CommandEnableState } from "../contracts";
import {
  RUNTIME_FEATURE_COMMAND_IDS,
  createExecutedRuntimeFeatureCommandResult,
  createRuntimeFeatureCommandBridge,
  type RuntimeFeatureCommandBindings
} from "./runtimeFeatureCommands";

const context = { selectionIds: [], hasUnsavedChanges: false };
const enabled = (): CommandEnableState => ({ enabled: true });
const executed = () => createExecutedRuntimeFeatureCommandResult();

describe("runtime feature command bridge", () => {
  it("reports seed-only definitions as unbound rather than reachable", () => {
    const bridge = createRuntimeFeatureCommandBridge(() => ({}));

    expect(bridge.getRuntimeCommand(RUNTIME_FEATURE_COMMAND_IDS.addMachine, context)).toMatchObject({
      registered: true,
      bound: false,
      reachable: false,
      currentlyAvailable: false
    });
  });

  it("does not execute commands while constructing reachability", () => {
    const execute = vi.fn(executed);
    const bridge = createRuntimeFeatureCommandBridge(() => ({
      [RUNTIME_FEATURE_COMMAND_IDS.addMachine]: { getEnableState: enabled, execute }
    }));

    expect(bridge.getRuntimeCommand(RUNTIME_FEATURE_COMMAND_IDS.addMachine, context).reachable).toBe(true);
    expect(execute).not.toHaveBeenCalled();
  });

  it("evaluates enablement once and executes an enabled callback once", () => {
    const execute = vi.fn(executed);
    const getEnableState = vi.fn(enabled);
    const bridge = createRuntimeFeatureCommandBridge(() => ({
      [RUNTIME_FEATURE_COMMAND_IDS.createAnnotation]: { getEnableState, execute }
    }));

    expect(bridge.executeCommand(RUNTIME_FEATURE_COMMAND_IDS.createAnnotation, context)).toEqual({
      handled: true,
      status: "executed"
    });
    expect(getEnableState).toHaveBeenCalledOnce();
    expect(execute).toHaveBeenCalledOnce();
  });

  it("returns handled false without executing a disabled callback", () => {
    const execute = vi.fn(executed);
    const getEnableState = vi.fn(() => ({ enabled: false, reason: "Missing context." }));
    const bridge = createRuntimeFeatureCommandBridge(() => ({
      [RUNTIME_FEATURE_COMMAND_IDS.connectionPointSnap]: { getEnableState, execute }
    }));

    expect(bridge.executeCommand(RUNTIME_FEATURE_COMMAND_IDS.connectionPointSnap, context)).toEqual({
      handled: false,
      status: "disabled",
      reason: "Missing context."
    });
    expect(getEnableState).toHaveBeenCalledOnce();
    expect(execute).not.toHaveBeenCalled();
  });

  it("uses replacement bindings without rebuilding the registry", () => {
    const oldExecute = vi.fn(executed);
    const replacementExecute = vi.fn(executed);
    let bindings: RuntimeFeatureCommandBindings = {
      [RUNTIME_FEATURE_COMMAND_IDS.toggleLabels]: {
        getEnableState: enabled,
        execute: oldExecute
      }
    };
    const bridge = createRuntimeFeatureCommandBridge(() => bindings);
    const command = bridge.registry.get(RUNTIME_FEATURE_COMMAND_IDS.toggleLabels);

    bindings = {
      [RUNTIME_FEATURE_COMMAND_IDS.toggleLabels]: {
        getEnableState: enabled,
        execute: replacementExecute
      }
    };
    command?.execute(context);

    expect(oldExecute).not.toHaveBeenCalled();
    expect(replacementExecute).toHaveBeenCalledOnce();
  });

  it("direct registry execution cannot bypass current enablement or seed execution", () => {
    const execute = vi.fn(executed);
    const getEnableState = vi.fn(() => ({ enabled: false, reason: "Disabled." }));
    const bridge = createRuntimeFeatureCommandBridge(() => ({
      [RUNTIME_FEATURE_COMMAND_IDS.performanceBenchmark]: { getEnableState, execute }
    }));

    bridge.registry.get(RUNTIME_FEATURE_COMMAND_IDS.performanceBenchmark)?.execute(context);

    expect(getEnableState).toHaveBeenCalledOnce();
    expect(execute).not.toHaveBeenCalled();
  });

  it("propagates live callback failures", () => {
    const bridge = createRuntimeFeatureCommandBridge(() => ({
      [RUNTIME_FEATURE_COMMAND_IDS.collisionCheck]: {
        getEnableState: enabled,
        execute: () => {
          throw new Error("collision failure");
        }
      }
    }));

    expect(() => bridge.executeCommand(RUNTIME_FEATURE_COMMAND_IDS.collisionCheck, context))
      .toThrow("collision failure");
  });

  it("returns an async result only after the live operation completes", async () => {
    let complete = false;
    const bridge = createRuntimeFeatureCommandBridge(() => ({
      [RUNTIME_FEATURE_COMMAND_IDS.projectSave]: {
        getEnableState: enabled,
        execute: async () => {
          await Promise.resolve();
          complete = true;
          return executed();
        }
      }
    }));

    const pending = bridge.executeCommand(RUNTIME_FEATURE_COMMAND_IDS.projectSave, context);
    expect(complete).toBe(false);
    await expect(pending).resolves.toEqual({ handled: true, status: "executed" });
    expect(complete).toBe(true);
  });

  it("normalizes cancelled, unavailable, and unsupported operation outcomes", () => {
    const statuses = ["cancelled", "unavailable", "unsupported"] as const;

    statuses.forEach((status) => {
      const bridge = createRuntimeFeatureCommandBridge(() => ({
        [RUNTIME_FEATURE_COMMAND_IDS.taxonomyManager]: {
          getEnableState: enabled,
          execute: () => ({ handled: true, status })
        }
      }));

      expect(bridge.executeCommand(RUNTIME_FEATURE_COMMAND_IDS.taxonomyManager, context))
        .toEqual({ handled: false, status });
    });
  });

  it("keeps rejected async operations observable to the caller", async () => {
    const bridge = createRuntimeFeatureCommandBridge(() => ({
      [RUNTIME_FEATURE_COMMAND_IDS.projectImportJson]: {
        getEnableState: enabled,
        execute: async () => {
          throw new Error("import failed");
        }
      }
    }));

    await expect(bridge.executeCommand(RUNTIME_FEATURE_COMMAND_IDS.projectImportJson, context))
      .rejects.toThrow("import failed");
  });
});
