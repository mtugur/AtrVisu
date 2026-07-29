import {
  normalizeRuntimeCommandOperationResult,
  type RuntimeCommandExecutionProbe
} from "../runtimeCommands/runtimeCommandOperation";
import type {
  RuntimeSurfaceExecutionAuthority,
  RuntimeSurfaceExecutionAuthoritySnapshot,
  RuntimeSurfaceExecutionCompletion,
  RuntimeSurfaceExecutionRejection,
  RuntimeSurfaceExecutionRejectionKind
} from "./runtimeFeatureAccessTypes";

type RuntimeSurfaceExecutionAuthorityInput = {
  sessionId: string;
  requiredCommandIds: readonly string[];
  getProbe: (commandId: string) => RuntimeCommandExecutionProbe | undefined;
  createToken?: () => string;
};

type PendingObservation = {
  commandId: string;
  before: RuntimeCommandExecutionProbe;
};

const trustedSnapshots = new WeakSet<object>();

const uniqueSorted = (values: readonly string[]) =>
  [...new Set(values)].sort((left, right) => left.localeCompare(right));

const findDuplicates = (values: readonly string[]) => {
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  values.forEach((value) => {
    if (seen.has(value)) {
      duplicates.add(value);
    }
    seen.add(value);
  });
  return [...duplicates].sort((left, right) => left.localeCompare(right));
};

const defaultCreateToken = () => {
  if (!globalThis.crypto?.randomUUID) {
    throw new Error("Runtime surface execution authority requires secure token generation.");
  }
  return globalThis.crypto.randomUUID();
};

const cloneProbe = (
  commandId: string,
  candidate: RuntimeCommandExecutionProbe | undefined
): RuntimeCommandExecutionProbe => {
  if (candidate === undefined) {
    return Object.freeze({
      commandId,
      attemptCount: 0,
      executedCount: 0
    });
  }
  if (
    candidate.commandId !== commandId
    || !Number.isSafeInteger(candidate.attemptCount)
    || candidate.attemptCount < 0
    || !Number.isSafeInteger(candidate.executedCount)
    || candidate.executedCount < 0
    || candidate.executedCount > candidate.attemptCount
  ) {
    throw new Error(`Live runtime command probe for "${commandId}" is malformed.`);
  }

  if (!candidate.lastResult) {
    return Object.freeze({
      commandId,
      attemptCount: candidate.attemptCount,
      executedCount: candidate.executedCount
    });
  }

  let normalizedResult;
  try {
    normalizedResult = normalizeRuntimeCommandOperationResult(candidate.lastResult);
  } catch {
    throw new Error(`Live runtime command probe result for "${commandId}" is malformed.`);
  }
  if (
    normalizedResult.handled !== candidate.lastResult.handled
    || normalizedResult.status !== candidate.lastResult.status
    || normalizedResult.reason !== candidate.lastResult.reason
  ) {
    throw new Error(`Live runtime command probe result for "${commandId}" is inconsistent.`);
  }

  return Object.freeze({
    commandId,
    attemptCount: candidate.attemptCount,
    executedCount: candidate.executedCount,
    lastResult: Object.freeze({ ...normalizedResult })
  });
};

const freezeRejection = (
  commandId: string,
  kind: RuntimeSurfaceExecutionRejectionKind,
  reason: string
): RuntimeSurfaceExecutionRejection => Object.freeze({
  commandId,
  kind,
  reason
});

export const isRuntimeSurfaceExecutionAuthoritySnapshot = (
  candidate: unknown
): candidate is RuntimeSurfaceExecutionAuthoritySnapshot =>
  typeof candidate === "object"
  && candidate !== null
  && trustedSnapshots.has(candidate);

export const createRuntimeSurfaceExecutionAuthority = ({
  sessionId,
  requiredCommandIds,
  getProbe,
  createToken = defaultCreateToken
}: RuntimeSurfaceExecutionAuthorityInput): RuntimeSurfaceExecutionAuthority => {
  if (!sessionId) {
    throw new Error("Runtime surface execution authority requires a session ID.");
  }
  const duplicateCommandIds = findDuplicates(requiredCommandIds);
  if (duplicateCommandIds.length > 0) {
    throw new Error(
      `Runtime surface execution authority contains duplicate command IDs: ${duplicateCommandIds.join(", ")}.`
    );
  }

  const canonicalCommandIds = Object.freeze(
    [...requiredCommandIds].sort((left, right) => left.localeCompare(right))
  );
  const canonicalCommandIdSet = new Set(canonicalCommandIds);
  const pendingByToken = new Map<string, PendingObservation>();
  const pendingTokenByCommandId = new Map<string, string>();
  const consumedTokens = new Set<string>();
  const verifiedCommandIds = new Set<string>();
  const rejectionsByCommandId = new Map<string, RuntimeSurfaceExecutionRejection>();
  const tokenPrefix = `${sessionId}.`;

  const recordRejection = (
    commandId: string,
    kind: RuntimeSurfaceExecutionRejectionKind,
    reason: string
  ): never => {
    rejectionsByCommandId.set(commandId, freezeRejection(commandId, kind, reason));
    throw new Error(reason);
  };

  const beginObservation = (commandId: string) => {
    if (!canonicalCommandIdSet.has(commandId)) {
      throw new Error(
        `Runtime surface execution command "${commandId}" is not in the canonical required set.`
      );
    }
    if (verifiedCommandIds.has(commandId)) {
      throw new Error(
        `Runtime surface execution command "${commandId}" already has verified evidence.`
      );
    }
    if (pendingTokenByCommandId.has(commandId)) {
      throw new Error(
        `Runtime surface execution command "${commandId}" already has a pending observation.`
      );
    }

    const token = `${tokenPrefix}${createToken()}`;
    if (pendingByToken.has(token) || consumedTokens.has(token)) {
      throw new Error("Runtime surface execution authority generated a duplicate token.");
    }
    const before = cloneProbe(commandId, getProbe(commandId));
    pendingByToken.set(token, { commandId, before });
    pendingTokenByCommandId.set(commandId, token);
    return Object.freeze({ token, commandId });
  };

  const completeObservation = (token: string): RuntimeSurfaceExecutionCompletion => {
    if (!token.startsWith(tokenPrefix)) {
      throw new Error("Runtime surface execution token belongs to a stale session.");
    }
    if (consumedTokens.has(token)) {
      throw new Error("Runtime surface execution token has already been consumed.");
    }
    const pending = pendingByToken.get(token);
    if (!pending) {
      throw new Error("Runtime surface execution token is unknown.");
    }

    pendingByToken.delete(token);
    pendingTokenByCommandId.delete(pending.commandId);
    consumedTokens.add(token);

    let after: RuntimeCommandExecutionProbe;
    try {
      after = cloneProbe(pending.commandId, getProbe(pending.commandId));
    } catch (error) {
      return recordRejection(
        pending.commandId,
        "malformed",
        error instanceof Error
          ? error.message
          : `Live runtime command probe for "${pending.commandId}" is malformed.`
      );
    }

    const attemptDelta = after.attemptCount - pending.before.attemptCount;
    if (attemptDelta !== 1) {
      return recordRejection(
        pending.commandId,
        "attempt-delta",
        `Runtime surface execution for "${pending.commandId}" must increment attemptCount by exactly one.`
      );
    }

    const finalResult = after.lastResult;
    if (!finalResult) {
      return recordRejection(
        pending.commandId,
        "malformed",
        `Runtime surface execution for "${pending.commandId}" has no final operation result.`
      );
    }
    if (!finalResult.handled || finalResult.status !== "executed") {
      const kind: RuntimeSurfaceExecutionRejectionKind =
        finalResult.status === "cancelled"
        || finalResult.status === "disabled"
        || finalResult.status === "unavailable"
        || finalResult.status === "unsupported"
        || finalResult.status === "failed"
          ? finalResult.status
          : "malformed";
      return recordRejection(
        pending.commandId,
        kind,
        `Runtime surface execution for "${pending.commandId}" finished with status "${finalResult.status}".`
      );
    }

    const executionDelta = after.executedCount - pending.before.executedCount;
    if (executionDelta !== 1) {
      return recordRejection(
        pending.commandId,
        "execution-delta",
        `Runtime surface execution for "${pending.commandId}" must increment executedCount by exactly one.`
      );
    }
    if (verifiedCommandIds.has(pending.commandId)) {
      return recordRejection(
        pending.commandId,
        "malformed",
        `Runtime surface execution command "${pending.commandId}" already has verified evidence.`
      );
    }

    verifiedCommandIds.add(pending.commandId);
    rejectionsByCommandId.delete(pending.commandId);
    return Object.freeze({
      source: "live-runtime-probe-authority",
      sessionId,
      commandId: pending.commandId,
      status: "verified"
    });
  };

  const getEvidenceSnapshot = (): RuntimeSurfaceExecutionAuthoritySnapshot => {
    const sortedVerifiedCommandIds = Object.freeze(
      [...verifiedCommandIds].sort((left, right) => left.localeCompare(right))
    );
    const missingCommandIds = Object.freeze(
      canonicalCommandIds.filter((commandId) => !verifiedCommandIds.has(commandId))
    );
    const rejections = Object.freeze(
      [...rejectionsByCommandId.values()]
        .sort((left, right) => left.commandId.localeCompare(right.commandId))
    );
    const rejectedCommandIds = Object.freeze(
      rejections.map((rejection) => rejection.commandId)
    );
    const reasons = Object.freeze(uniqueSorted([
      ...missingCommandIds.map(
        (commandId) => `Live runtime execution evidence is missing for "${commandId}".`
      ),
      ...rejections.map((rejection) => rejection.reason)
    ]));
    const snapshot = Object.freeze({
      source: "live-runtime-probe-authority" as const,
      sessionId,
      verifiedCommandIds: sortedVerifiedCommandIds,
      missingCommandIds,
      rejectedCommandIds,
      rejections,
      complete: missingCommandIds.length === 0,
      reasons
    });
    trustedSnapshots.add(snapshot);
    return snapshot;
  };

  const reset = () => {
    pendingByToken.forEach((_pending, token) => {
      consumedTokens.add(token);
    });
    pendingByToken.clear();
    pendingTokenByCommandId.clear();
    verifiedCommandIds.clear();
    rejectionsByCommandId.clear();
  };

  return Object.freeze({
    sessionId,
    requiredCommandIds: canonicalCommandIds,
    beginObservation,
    completeObservation,
    getEvidenceSnapshot,
    reset
  });
};
