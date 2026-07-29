import type { FeatureAccessEntry } from "../contracts";
import { getPlatformCommandSeedById } from "../registrySeeds";
import type {
  RuntimeSurfaceExecutionAuthoritySnapshot,
  RuntimeSurfaceExecutionAuthorityValidation
} from "./runtimeFeatureAccessTypes";
import { isRuntimeSurfaceExecutionAuthoritySnapshot } from "./runtimeSurfaceExecutionAuthority";

type ValidateRuntimeSurfaceExecutionAuthoritySnapshotInput = {
  requiredCommandIds: readonly string[];
  currentSessionId?: string;
  snapshot?: RuntimeSurfaceExecutionAuthoritySnapshot;
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

export const validateRuntimeSurfaceExecutionAuthoritySnapshot = ({
  requiredCommandIds,
  currentSessionId,
  snapshot
}: ValidateRuntimeSurfaceExecutionAuthoritySnapshotInput): RuntimeSurfaceExecutionAuthorityValidation => {
  const sortedRequiredCommandIds = uniqueSorted(requiredCommandIds);
  const requiredCommandIdSet = new Set(sortedRequiredCommandIds);

  if (!isRuntimeSurfaceExecutionAuthoritySnapshot(snapshot)) {
    return {
      passed: sortedRequiredCommandIds.length === 0 && snapshot === undefined,
      verifiedCommandIds: [],
      missingCommandIds: sortedRequiredCommandIds,
      duplicateCommandIds: [],
      staleCommandIds: [],
      cancelledCommandIds: [],
      failedCommandIds: [],
      attemptedOnlyCommandIds: [],
      unknownCommandIds: [],
      malformedCommandIds: snapshot === undefined ? [] : sortedRequiredCommandIds,
      reasons: uniqueSorted([
        ...sortedRequiredCommandIds.map(
          (commandId) => `Live runtime execution evidence is missing for "${commandId}".`
        ),
        ...(snapshot === undefined
          ? []
          : ["Runtime surface execution evidence is not owned by the live probe authority."])
      ])
    };
  }

  const verifiedCommandIds = [...snapshot.verifiedCommandIds];
  const duplicateCommandIds = findDuplicates(verifiedCommandIds);
  const unknownCommandIds = uniqueSorted(
    verifiedCommandIds.filter((commandId) => !requiredCommandIdSet.has(commandId))
  );
  const stale = !currentSessionId || snapshot.sessionId !== currentSessionId;
  const staleCommandIds = stale ? sortedRequiredCommandIds : [];
  const verifiedCommandIdSet = new Set(
    stale ? [] : verifiedCommandIds.filter((commandId) => requiredCommandIdSet.has(commandId))
  );
  const rejectionByCommandId = new Map(
    snapshot.rejections.map((rejection) => [rejection.commandId, rejection])
  );
  const cancelledCommandIds = uniqueSorted(snapshot.rejections
    .filter((rejection) => rejection.kind === "cancelled")
    .map((rejection) => rejection.commandId));
  const failedCommandIds = uniqueSorted(snapshot.rejections
    .filter((rejection) => rejection.kind === "failed")
    .map((rejection) => rejection.commandId));
  const attemptedOnlyCommandIds = uniqueSorted(snapshot.rejections
    .filter((rejection) =>
      rejection.kind === "cancelled"
      || rejection.kind === "disabled"
      || rejection.kind === "unavailable"
      || rejection.kind === "unsupported"
      || rejection.kind === "failed"
    )
    .map((rejection) => rejection.commandId));
  const malformedCommandIds = uniqueSorted(snapshot.rejections
    .filter((rejection) =>
      rejection.kind === "attempt-delta"
      || rejection.kind === "execution-delta"
      || rejection.kind === "malformed"
    )
    .map((rejection) => rejection.commandId));
  const missingCommandIds = sortedRequiredCommandIds.filter(
    (commandId) => !verifiedCommandIdSet.has(commandId)
  );
  const reasons = uniqueSorted([
    ...missingCommandIds.map(
      (commandId) => `Live runtime execution evidence is missing for "${commandId}".`
    ),
    ...duplicateCommandIds.map(
      (commandId) => `Live runtime execution evidence is duplicated for "${commandId}".`
    ),
    ...unknownCommandIds.map(
      (commandId) => `Live runtime execution evidence references unknown command "${commandId}".`
    ),
    ...staleCommandIds.map(
      (commandId) => `Live runtime execution evidence is stale for "${commandId}".`
    ),
    ...sortedRequiredCommandIds.flatMap((commandId) => {
      const rejection = rejectionByCommandId.get(commandId);
      return rejection ? [rejection.reason] : [];
    })
  ]);

  return {
    passed:
      !stale
      && missingCommandIds.length === 0
      && duplicateCommandIds.length === 0
      && unknownCommandIds.length === 0
      && snapshot.complete,
    verifiedCommandIds: uniqueSorted(verifiedCommandIds),
    missingCommandIds,
    duplicateCommandIds,
    staleCommandIds,
    cancelledCommandIds,
    failedCommandIds,
    attemptedOnlyCommandIds,
    unknownCommandIds,
    malformedCommandIds,
    reasons
  };
};
