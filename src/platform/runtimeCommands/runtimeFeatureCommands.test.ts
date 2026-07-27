import { describe, expect, it, vi } from "vitest";
import type { CommandEnableState } from "../contracts";
import {
  RUNTIME_FEATURE_COMMAND_IDS,
  createRuntimeFeatureCommandBridge,
  type RuntimeFeatureCommandBindings
} from "./runtimeFeatureCommands";

const context = { selectionIds: [], hasUnsavedChanges: false };
const enabled = (): CommandEnableState => ({ enabled: true });

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
    const execute = vi.fn();
    const bridge = createRuntimeFeatureCommandBridge(() => ({
      [RUNTIME_FEATURE_COMMAND_IDS.addMachine]: { getEnableState: enabled, execute }
    }));

    expect(bridge.getRuntimeCommand(RUNTIME_FEATURE_COMMAND_IDS.addMachine, context).reachable).toBe(true);
    expect(execute).not.toHaveBeenCalled();
  });

  it("evaluates enablement once and executes an enabled callback once", () => {
    const execute = vi.fn();
    const getEnableState = vi.fn(enabled);
    const bridge = createRuntimeFeatureCommandBridge(() => ({
      [RUNTIME_FEATURE_COMMAND_IDS.createAnnotation]: { getEnableState, execute }
    }));

    expect(bridge.executeCommand(RUNTIME_FEATURE_COMMAND_IDS.createAnnotation, context)).toEqual({
      handled: true
    });
    expect(getEnableState).toHaveBeenCalledOnce();
    expect(execute).toHaveBeenCalledOnce();
  });

  it("returns handled false without executing a disabled callback", () => {
    const execute = vi.fn();
    const getEnableState = vi.fn(() => ({ enabled: false, reason: "Missing context." }));
    const bridge = createRuntimeFeatureCommandBridge(() => ({
      [RUNTIME_FEATURE_COMMAND_IDS.connectionPointSnap]: { getEnableState, execute }
    }));

    expect(bridge.executeCommand(RUNTIME_FEATURE_COMMAND_IDS.connectionPointSnap, context)).toEqual({
      handled: false,
      reason: "Missing context."
    });
    expect(getEnableState).toHaveBeenCalledOnce();
    expect(execute).not.toHaveBeenCalled();
  });

  it("uses replacement bindings without rebuilding the registry", () => {
    const oldExecute = vi.fn();
    const replacementExecute = vi.fn();
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
    const execute = vi.fn();
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
});
