import type { FeatureAccessEntry } from "../contracts";
import { getPlatformCommandSeedById } from "../registrySeeds";
import {
  normalizeRuntimeCommandOperationResult,
  type RuntimeCommandExecutionProbe,
  type RuntimeCommandOperationResult
} from "../runtimeCommands/runtimeCommandOperation";
import type {
  RuntimeCommandExecutionObservation,
  RuntimeSurfaceExecutionAttestation,
  RuntimeSurfaceExecutionAttestationValidation
} from "./runtimeFeatureAccessTypes";

type CreateRuntimeCommandExecutionObservationInput = {
  commandId: string;
  sessionId: string;
  currentSessionId: string;
  before: RuntimeCommandExecutionProbe;
  after: RuntimeCommandExecutionProbe;
};

type ValidateRuntimeSurfaceExecutionAttestationInput = {
  requiredCommandIds: readonly string[];
  currentSessionId?: string;
  attestation?: RuntimeSurfaceExecutionAttestation;
};

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

const assertKnownCommandIds = (commandIds: readonly string[]) => {
  const unknownCommandIds = commandIds.filter(
    (commandId) => !getPlatformCommandSeedById(commandId)
  );
  if (unknownCommandIds.length > 0) {
    throw new Error(
      `Required surface execution references unknown command IDs: ${unknownCommandIds.join(", ")}.`
    );
  }
};

export const deriveRequiredRuntimeSurfaceExecutionCommandIds = (
  features: readonly FeatureAccessEntry[]
) => {
  const commandIds = features
    .filter((feature) =>
      feature.classification === "required-runtime"
      && feature.requiredForRegression
      && feature.requiresSurfaceExecutionEvidence === true
    )
    .flatMap((feature) => [
      ...(feature.commandIds ?? []),
      ...(feature.commandId ? [feature.commandId] : [])
    ]);
  const duplicateCommandIds = findDuplicates(commandIds);
  if (duplicateCommandIds.length > 0) {
    throw new Error(
      `Required surface execution contains duplicate command IDs: ${duplicateCommandIds.join(", ")}.`
    );
  }
  const requiredCommandIds = [...commandIds].sort((left, right) =>
    left.localeCompare(right)
  );
  assertKnownCommandIds(requiredCommandIds);
  return requiredCommandIds;
};

const assertMatchingProbe = (
  commandId: string,
  probe: RuntimeCommandExecutionProbe,
  label: "before" | "after"
) => {
  if (probe.commandId !== commandId) {
    throw new Error(
      `Runtime command observation ${label} probe does not match "${commandId}".`
    );
  }
};

export const createRuntimeCommandExecutionObservation = ({
  commandId,
  sessionId,
  currentSessionId,
  before,
  after
}: CreateRuntimeCommandExecutionObservationInput): RuntimeCommandExecutionObservation => {
  if (sessionId !== currentSessionId) {
    throw new Error(`Runtime command observation for "${commandId}" belongs to a stale session.`);
  }
  assertMatchingProbe(commandId, before, "before");
  assertMatchingProbe(commandId, after, "after");
  if (after.attemptCount !== before.attemptCount + 1) {
    throw new Error(
      `Runtime command observation for "${commandId}" must increment attemptCount by exactly one.`
    );
  }
  if (after.executedCount !== before.executedCount + 1) {
    throw new Error(
      `Runtime command observation for "${commandId}" must increment executedCount by exactly one.`
    );
  }
  const finalResult = normalizeRuntimeCommandOperationResult(after.lastResult);
  if (
    !after.lastResult
    || after.lastResult.handled !== true
    || after.lastResult.status !== "executed"
    || !finalResult.handled
    || finalResult.status !== "executed"
  ) {
    throw new Error(
      `Runtime command observation for "${commandId}" must finish with status "executed".`
    );
  }

  return {
    commandId,
    sessionId,
    beforeAttemptCount: before.attemptCount,
    beforeExecutedCount: before.executedCount,
    afterAttemptCount: after.attemptCount,
    afterExecutedCount: after.executedCount,
    finalResult
  };
};

const getNormalizedFinalResult = (
  observation: RuntimeCommandExecutionObservation
): RuntimeCommandOperationResult | null => {
  try {
    return normalizeRuntimeCommandOperationResult(observation.finalResult);
  } catch {
    return null;
  }
};

export const validateRuntimeSurfaceExecutionAttestation = ({
  requiredCommandIds,
  currentSessionId,
  attestation
}: ValidateRuntimeSurfaceExecutionAttestationInput): RuntimeSurfaceExecutionAttestationValidation => {
  const sortedRequiredCommandIds = uniqueSorted(requiredCommandIds);
  const observations = attestation?.observations ?? [];
  const observedCommandIds = observations.map((observation) => observation.commandId);
  const duplicateCommandIds = findDuplicates(observedCommandIds);
  const requiredCommandIdSet = new Set(sortedRequiredCommandIds);
  const duplicateCommandIdSet = new Set(duplicateCommandIds);
  const staleCommandIds = new Set<string>();
  const cancelledCommandIds = new Set<string>();
  const failedCommandIds = new Set<string>();
  const attemptedOnlyCommandIds = new Set<string>();
  const malformedCommandIds = new Set<string>();
  const unknownCommandIds = new Set<string>();
  const verifiedCommandIds = new Set<string>();

  observations.forEach((observation) => {
    const commandId = observation.commandId;
    if (!requiredCommandIdSet.has(commandId)) {
      unknownCommandIds.add(commandId);
      return;
    }
    if (
      !attestation
      || attestation.source !== "observed-runtime-probes"
      || !currentSessionId
      || attestation.sessionId !== currentSessionId
      || observation.sessionId !== currentSessionId
    ) {
      staleCommandIds.add(commandId);
      return;
    }
    if (duplicateCommandIdSet.has(commandId)) {
      return;
    }

    const finalResult = getNormalizedFinalResult(observation);
    if (
      !finalResult
      || finalResult.handled !== observation.finalResult.handled
      || finalResult.status !== observation.finalResult.status
    ) {
      malformedCommandIds.add(commandId);
      return;
    }
    const attemptDelta = observation.afterAttemptCount - observation.beforeAttemptCount;
    const executedDelta = observation.afterExecutedCount - observation.beforeExecutedCount;
    if (attemptDelta !== 1 || executedDelta < 0 || executedDelta > 1) {
      malformedCommandIds.add(commandId);
      return;
    }
    if (executedDelta === 0) {
      attemptedOnlyCommandIds.add(commandId);
      if (finalResult.status === "cancelled") {
        cancelledCommandIds.add(commandId);
      } else if (finalResult.status === "failed") {
        failedCommandIds.add(commandId);
      }
      return;
    }
    if (!finalResult.handled || finalResult.status !== "executed") {
      malformedCommandIds.add(commandId);
      return;
    }
    verifiedCommandIds.add(commandId);
  });

  const sortedVerifiedCommandIds = [...verifiedCommandIds].sort((left, right) =>
    left.localeCompare(right)
  );
  const missingCommandIds = sortedRequiredCommandIds.filter(
    (commandId) => !verifiedCommandIds.has(commandId)
  );
  const sortedUnknownCommandIds = [...unknownCommandIds].sort((left, right) =>
    left.localeCompare(right)
  );
  const sortedStaleCommandIds = [...staleCommandIds].sort((left, right) =>
    left.localeCompare(right)
  );
  const sortedCancelledCommandIds = [...cancelledCommandIds].sort((left, right) =>
    left.localeCompare(right)
  );
  const sortedFailedCommandIds = [...failedCommandIds].sort((left, right) =>
    left.localeCompare(right)
  );
  const sortedAttemptedOnlyCommandIds = [...attemptedOnlyCommandIds].sort(
    (left, right) => left.localeCompare(right)
  );
  const sortedMalformedCommandIds = [...malformedCommandIds].sort((left, right) =>
    left.localeCompare(right)
  );
  const reasons = uniqueSorted([
    ...missingCommandIds.map(
      (commandId) => `Observed runtime execution evidence is missing for "${commandId}".`
    ),
    ...duplicateCommandIds.map(
      (commandId) => `Observed runtime execution evidence is duplicated for "${commandId}".`
    ),
    ...sortedUnknownCommandIds.map(
      (commandId) => `Observed runtime execution evidence references unknown command "${commandId}".`
    ),
    ...sortedStaleCommandIds.map(
      (commandId) => `Observed runtime execution evidence is stale for "${commandId}".`
    ),
    ...sortedCancelledCommandIds.map(
      (commandId) => `Observed runtime execution was cancelled for "${commandId}".`
    ),
    ...sortedFailedCommandIds.map(
      (commandId) => `Observed runtime execution failed for "${commandId}".`
    ),
    ...sortedAttemptedOnlyCommandIds.map(
      (commandId) => `Observed runtime execution did not execute "${commandId}".`
    ),
    ...sortedMalformedCommandIds.map(
      (commandId) => `Observed runtime execution evidence is malformed for "${commandId}".`
    )
  ]);

  return {
    passed:
      missingCommandIds.length === 0
      && duplicateCommandIds.length === 0
      && sortedUnknownCommandIds.length === 0
      && sortedStaleCommandIds.length === 0
      && sortedCancelledCommandIds.length === 0
      && sortedFailedCommandIds.length === 0
      && sortedAttemptedOnlyCommandIds.length === 0
      && sortedMalformedCommandIds.length === 0,
    verifiedCommandIds: sortedVerifiedCommandIds,
    missingCommandIds,
    duplicateCommandIds,
    staleCommandIds: sortedStaleCommandIds,
    cancelledCommandIds: sortedCancelledCommandIds,
    failedCommandIds: sortedFailedCommandIds,
    attemptedOnlyCommandIds: sortedAttemptedOnlyCommandIds,
    unknownCommandIds: sortedUnknownCommandIds,
    malformedCommandIds: sortedMalformedCommandIds,
    reasons
  };
};
