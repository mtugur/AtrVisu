import { describe, expect, it } from "vitest";
import type { FeatureAccessEntry } from "../contracts";
import type {
  RuntimeCommandExecutionProbe,
  RuntimeCommandExecutionObservation,
  RuntimeSurfaceExecutionAttestation
} from "./runtimeFeatureAccessTypes";
import {
  createRuntimeCommandExecutionObservation,
  deriveRequiredRuntimeSurfaceExecutionCommandIds,
  validateRuntimeSurfaceExecutionAttestation
} from "./runtimeSurfaceExecutionEvidence";

const sessionId = "current-session";

const feature = (
  featureId: string,
  commandId: string,
  overrides: Partial<FeatureAccessEntry> = {}
): FeatureAccessEntry => ({
  featureId,
  label: featureId,
  classification: "required-runtime",
  surfaces: ["toolbar"],
  commandIds: [commandId],
  requiresSurfaceExecutionEvidence: true,
  requiredForRegression: true,
  ...overrides
});

const probe = (
  commandId: string,
  attemptCount: number,
  executedCount: number,
  status: "executed" | "cancelled" | "disabled" | "unavailable" | "unsupported" | "failed" = "executed"
) => ({
  commandId,
  attemptCount,
  executedCount,
  lastResult: {
    handled: status === "executed",
    status
  }
});

const observation = (
  commandId: string,
  overrides: Partial<RuntimeCommandExecutionObservation> = {}
): RuntimeCommandExecutionObservation => ({
  commandId,
  sessionId,
  beforeAttemptCount: 0,
  beforeExecutedCount: 0,
  afterAttemptCount: 1,
  afterExecutedCount: 1,
  finalResult: { handled: true, status: "executed" },
  ...overrides
});

const attestation = (
  observations: readonly RuntimeCommandExecutionObservation[],
  attestationSessionId = sessionId
): RuntimeSurfaceExecutionAttestation => ({
  source: "observed-runtime-probes",
  sessionId: attestationSessionId,
  observations
});

describe("required runtime surface execution command derivation", () => {
  it("sorts canonical required command IDs deterministically", () => {
    expect(deriveRequiredRuntimeSurfaceExecutionCommandIds([
      feature("feature.redo", "edit.redo"),
      feature("feature.undo", "edit.undo")
    ])).toEqual(["edit.redo", "edit.undo"]);
  });

  it("rejects duplicate canonical command IDs", () => {
    expect(() => deriveRequiredRuntimeSurfaceExecutionCommandIds([
      feature("feature.one", "edit.undo"),
      feature("feature.two", "edit.undo")
    ])).toThrow("duplicate command IDs: edit.undo");
  });

  it("excludes planned features and quality signals", () => {
    expect(deriveRequiredRuntimeSurfaceExecutionCommandIds([
      feature("feature.required", "edit.undo"),
      feature("feature.planned", "view.fitView", {
        classification: "declared-planned",
        requiredForRegression: false
      }),
      feature("feature.quality", "diagnostics.noRedConsole", {
        classification: "quality-signal",
        qualitySignalId: "no-red-console"
      })
    ])).toEqual(["edit.undo"]);
  });

  it("rejects unknown command references", () => {
    expect(() => deriveRequiredRuntimeSurfaceExecutionCommandIds([
      feature("feature.unknown", "command.unknown")
    ])).toThrow("unknown command IDs: command.unknown");
  });

  it("automatically changes required evidence when the feature matrix changes", () => {
    const initial = [feature("feature.undo", "edit.undo")];
    const changed = [...initial, feature("feature.redo", "edit.redo")];

    expect(deriveRequiredRuntimeSurfaceExecutionCommandIds(initial)).toEqual(["edit.undo"]);
    expect(deriveRequiredRuntimeSurfaceExecutionCommandIds(changed))
      .toEqual(["edit.redo", "edit.undo"]);
  });
});

describe("runtime command execution observation", () => {
  const create = (
    before: RuntimeCommandExecutionProbe = probe("edit.undo", 0, 0),
    after: RuntimeCommandExecutionProbe = probe("edit.undo", 1, 1),
    observedSessionId = sessionId,
    currentSessionId = sessionId
  ) => createRuntimeCommandExecutionObservation({
    commandId: "edit.undo",
    sessionId: observedSessionId,
    currentSessionId,
    before,
    after
  });

  it("accepts one observed executed probe transition", () => {
    expect(create()).toEqual(observation("edit.undo"));
  });

  it.each([
    ["attempt delta zero", probe("edit.undo", 0, 1), "attemptCount"],
    ["attempt delta greater than one", probe("edit.undo", 2, 1), "attemptCount"],
    ["execution delta zero", probe("edit.undo", 1, 0), "executedCount"],
    ["execution delta greater than one", probe("edit.undo", 1, 2), "executedCount"]
  ])("rejects %s", (_label, after, expectedMessage) => {
    expect(() => create(undefined, after)).toThrow(expectedMessage);
  });

  it("rejects a command ID mismatch", () => {
    expect(() => create(
      probe("edit.redo", 0, 0),
      probe("edit.undo", 1, 1)
    )).toThrow("before probe does not match");
  });

  it.each([
    "cancelled",
    "disabled",
    "unavailable",
    "unsupported",
    "failed"
  ] as const)("rejects a %s final result", (status) => {
    expect(() => create(
      probe("edit.undo", 0, 0),
      probe("edit.undo", 1, 1, status)
    )).toThrow('status "executed"');
  });

  it("rejects a malformed final result", () => {
    expect(() => create(
      probe("edit.undo", 0, 0),
      { commandId: "edit.undo", attemptCount: 1, executedCount: 1 }
    )).toThrow("invalid operation result");
  });

  it("rejects an inconsistent handled flag", () => {
    expect(() => create(
      probe("edit.undo", 0, 0),
      {
        commandId: "edit.undo",
        attemptCount: 1,
        executedCount: 1,
        lastResult: { handled: false, status: "executed" }
      }
    )).toThrow('status "executed"');
  });

  it("rejects a stale diagnostics session", () => {
    expect(() => create(
      undefined,
      undefined,
      "old-session",
      sessionId
    )).toThrow("stale session");
  });
});

describe("runtime surface execution attestation", () => {
  const requiredCommandIds = ["edit.redo", "edit.undo"] as const;
  const validate = (
    candidate?: RuntimeSurfaceExecutionAttestation,
    currentSessionId = sessionId
  ) => validateRuntimeSurfaceExecutionAttestation({
    requiredCommandIds,
    currentSessionId,
    attestation: candidate
  });

  it("passes an exact complete observed set", () => {
    const result = validate(attestation([
      observation("edit.undo"),
      observation("edit.redo")
    ]));

    expect(result.passed).toBe(true);
    expect(result.verifiedCommandIds).toEqual(requiredCommandIds);
    expect(result.reasons).toEqual([]);
  });

  it("fails empty and partial attestations with deterministic missing IDs", () => {
    expect(validate(attestation([])).missingCommandIds).toEqual(requiredCommandIds);
    expect(validate(attestation([observation("edit.undo")])).missingCommandIds)
      .toEqual(["edit.redo"]);
  });

  it("rejects duplicate observations instead of replaying them", () => {
    const result = validate(attestation([
      observation("edit.undo"),
      observation("edit.undo"),
      observation("edit.redo")
    ]));

    expect(result.passed).toBe(false);
    expect(result.duplicateCommandIds).toEqual(["edit.undo"]);
    expect(result.missingCommandIds).toContain("edit.undo");
  });

  it("rejects unknown and stale observations", () => {
    const unknown = validate(attestation([observation("command.unknown")]));
    const stale = validate(attestation([
      observation("edit.undo", { sessionId: "old-session" })
    ]));

    expect(unknown.unknownCommandIds).toEqual(["command.unknown"]);
    expect(stale.staleCommandIds).toEqual(["edit.undo"]);
  });

  it.each([
    ["attempted-only", "disabled", "attemptedOnlyCommandIds"],
    ["cancelled", "cancelled", "cancelledCommandIds"],
    ["failed", "failed", "failedCommandIds"]
  ] as const)("rejects a %s observation", (_label, status, field) => {
    const result = validate(attestation([
      observation("edit.undo", {
        afterExecutedCount: 0,
        finalResult: { handled: false, status }
      })
    ]));

    expect(result[field]).toEqual(["edit.undo"]);
    expect(result.passed).toBe(false);
  });

  it("returns deterministically sorted reasons", () => {
    const result = validate(attestation([
      observation("edit.undo", { sessionId: "old-session" }),
      observation("command.unknown")
    ]));

    expect(result.reasons).toEqual([...result.reasons].sort());
  });

  it("classifies an inconsistent operation result as malformed", () => {
    const result = validate(attestation([
      observation("edit.undo", {
        finalResult: { handled: true, status: "cancelled" }
      })
    ]));

    expect(result.malformedCommandIds).toEqual(["edit.undo"]);
    expect(result.cancelledCommandIds).toEqual([]);
  });

  it("cannot pass from copied raw command IDs without observations", () => {
    const copiedIdsOnly: unknown = { verifiedCommandIds: [...requiredCommandIds] };
    const result = validate(copiedIdsOnly as RuntimeSurfaceExecutionAttestation);

    expect(result.passed).toBe(false);
    expect(result.verifiedCommandIds).toEqual([]);
    expect(result.missingCommandIds).toEqual(requiredCommandIds);
  });
});
