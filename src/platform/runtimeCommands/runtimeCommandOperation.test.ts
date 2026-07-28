import { describe, expect, it, vi } from "vitest";
import {
  createCancelledRuntimeCommandResult,
  createDisabledRuntimeCommandResult,
  createExecutedRuntimeCommandResult,
  createFailedRuntimeCommandResult,
  createNextRuntimeCommandExecutionProbe,
  createUnavailableRuntimeCommandResult,
  executeConfirmedRuntimeCommandOperation,
  normalizeRuntimeCommandOperationResult
} from "./runtimeCommandOperation";

describe("runtime command operation results", () => {
  it("derives handled exclusively from the final operation status", () => {
    expect(createExecutedRuntimeCommandResult()).toEqual({
      handled: true,
      status: "executed"
    });
    expect(createCancelledRuntimeCommandResult("Cancelled.")).toEqual({
      handled: false,
      status: "cancelled",
      reason: "Cancelled."
    });
    expect(createDisabledRuntimeCommandResult("Disabled.").handled).toBe(false);
    expect(createUnavailableRuntimeCommandResult("Unavailable.").handled).toBe(false);
    expect(createFailedRuntimeCommandResult(new Error("Failed.")).handled).toBe(false);
  });

  it("normalizes inconsistent handled values from valid status results", () => {
    expect(normalizeRuntimeCommandOperationResult({
      handled: true,
      status: "cancelled"
    })).toEqual({
      handled: false,
      status: "cancelled"
    });
    expect(normalizeRuntimeCommandOperationResult({
      handled: false,
      status: "executed"
    })).toEqual({
      handled: true,
      status: "executed"
    });
  });

  it("rejects malformed or unknown operation results deterministically", () => {
    const invalidResults: unknown[] = [
      undefined,
      null,
      {},
      { handled: "yes", status: "executed" },
      { handled: false, status: "unknown" },
      { handled: false, status: "cancelled", reason: 42 }
    ];

    invalidResults.forEach((result) => {
      expect(() => normalizeRuntimeCommandOperationResult(result)).toThrow(
        "Runtime command returned an invalid operation result."
      );
    });
  });

  it("does not invoke or mutate an operation when confirmation is rejected", () => {
    const execute = vi.fn(() => createExecutedRuntimeCommandResult());
    const state = {
      objects: ["machine-1"],
      annotations: ["annotation-1"],
      groupMembers: ["machine-1"],
      selection: ["machine:machine-1"],
      historyCount: 0,
      dirty: false
    };

    const result = executeConfirmedRuntimeCommandOperation({
      confirm: () => false,
      cancelledReason: "Delete selected was cancelled.",
      execute: () => {
        state.objects = [];
        state.annotations = [];
        state.groupMembers = [];
        state.selection = [];
        state.historyCount += 1;
        state.dirty = true;
        return execute();
      }
    });

    expect(result).toEqual({
      handled: false,
      status: "cancelled",
      reason: "Delete selected was cancelled."
    });
    expect(execute).not.toHaveBeenCalled();
    expect(state).toEqual({
      objects: ["machine-1"],
      annotations: ["annotation-1"],
      groupMembers: ["machine-1"],
      selection: ["machine:machine-1"],
      historyCount: 0,
      dirty: false
    });
  });

  it("invokes an accepted operation exactly once and returns its normalized result", () => {
    const execute = vi.fn(() => createExecutedRuntimeCommandResult());

    expect(executeConfirmedRuntimeCommandOperation({
      confirm: () => true,
      cancelledReason: "Cancelled.",
      execute
    })).toEqual({
      handled: true,
      status: "executed"
    });
    expect(execute).toHaveBeenCalledOnce();
  });

  it("counts cancelled attempts without counting them as executions", () => {
    const previous = {
      commandId: "edit.deleteSelected",
      attemptCount: 2,
      executedCount: 1,
      lastResult: createExecutedRuntimeCommandResult()
    };

    expect(createNextRuntimeCommandExecutionProbe(
      "edit.deleteSelected",
      previous,
      createCancelledRuntimeCommandResult("Delete selected was cancelled.")
    )).toEqual({
      commandId: "edit.deleteSelected",
      attemptCount: 3,
      executedCount: 1,
      lastResult: {
        handled: false,
        status: "cancelled",
        reason: "Delete selected was cancelled."
      }
    });
  });

  it("counts accepted operations once and records their final result", () => {
    expect(createNextRuntimeCommandExecutionProbe(
      "assembly.ungroup",
      undefined,
      createExecutedRuntimeCommandResult()
    )).toEqual({
      commandId: "assembly.ungroup",
      attemptCount: 1,
      executedCount: 1,
      lastResult: {
        handled: true,
        status: "executed"
      }
    });
  });
});
