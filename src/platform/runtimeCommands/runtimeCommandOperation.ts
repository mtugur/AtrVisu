export const RUNTIME_COMMAND_OPERATION_STATUSES = [
  "executed",
  "cancelled",
  "disabled",
  "unavailable",
  "unsupported",
  "failed"
] as const;

export type RuntimeCommandOperationStatus =
  typeof RUNTIME_COMMAND_OPERATION_STATUSES[number];

export type RuntimeCommandOperationResult = {
  handled: boolean;
  status: RuntimeCommandOperationStatus;
  reason?: string;
};

export type RuntimeCommandExecutionProbe = {
  commandId: string;
  attemptCount: number;
  executedCount: number;
  lastResult?: RuntimeCommandOperationResult;
};

type ConfirmedRuntimeCommandOperation = {
  confirm: () => boolean;
  cancelledReason: string;
  execute: () => RuntimeCommandOperationResult;
};

const operationStatuses = new Set<string>(RUNTIME_COMMAND_OPERATION_STATUSES);

const isOperationStatus = (value: unknown): value is RuntimeCommandOperationStatus =>
  typeof value === "string" && operationStatuses.has(value);

export const createRuntimeCommandOperationResult = (
  status: RuntimeCommandOperationStatus,
  reason?: string
): RuntimeCommandOperationResult => ({
  handled: status === "executed",
  status,
  ...(reason ? { reason } : {})
});

export const createExecutedRuntimeCommandResult = (reason?: string) =>
  createRuntimeCommandOperationResult("executed", reason);

export const createCancelledRuntimeCommandResult = (reason: string) =>
  createRuntimeCommandOperationResult("cancelled", reason);

export const createDisabledRuntimeCommandResult = (reason: string) =>
  createRuntimeCommandOperationResult("disabled", reason);

export const createUnavailableRuntimeCommandResult = (reason: string) =>
  createRuntimeCommandOperationResult("unavailable", reason);

export const createUnsupportedRuntimeCommandResult = (reason: string) =>
  createRuntimeCommandOperationResult("unsupported", reason);

export const createFailedRuntimeCommandResult = (error: unknown) =>
  createRuntimeCommandOperationResult(
    "failed",
    error instanceof Error ? error.message : "Runtime command failed."
  );

export const normalizeRuntimeCommandOperationResult = (
  result: unknown
): RuntimeCommandOperationResult => {
  const reason = typeof result === "object" && result !== null && "reason" in result
    ? result.reason
    : undefined;
  if (
    typeof result !== "object"
    || result === null
    || !("handled" in result)
    || typeof result.handled !== "boolean"
    || !("status" in result)
    || !isOperationStatus(result.status)
    || (reason !== undefined && typeof reason !== "string")
  ) {
    throw new Error("Runtime command returned an invalid operation result.");
  }

  return createRuntimeCommandOperationResult(result.status, reason);
};

export const executeConfirmedRuntimeCommandOperation = ({
  confirm,
  cancelledReason,
  execute
}: ConfirmedRuntimeCommandOperation): RuntimeCommandOperationResult => {
  if (!confirm()) {
    return createCancelledRuntimeCommandResult(cancelledReason);
  }
  return normalizeRuntimeCommandOperationResult(execute());
};

export const createNextRuntimeCommandExecutionProbe = (
  commandId: string,
  current: RuntimeCommandExecutionProbe | undefined,
  result: RuntimeCommandOperationResult
): RuntimeCommandExecutionProbe => {
  const normalizedResult = normalizeRuntimeCommandOperationResult(result);
  return {
    commandId,
    attemptCount: (current?.attemptCount ?? 0) + 1,
    executedCount: (current?.executedCount ?? 0) + (normalizedResult.handled ? 1 : 0),
    lastResult: normalizedResult
  };
};
