import { describe, expect, it } from "vitest";
import type { FeatureAccessEntry } from "../contracts";
import {
  createExecutedRuntimeCommandResult,
  type RuntimeCommandExecutionProbe
} from "../runtimeCommands/runtimeCommandOperation";
import { createRuntimeSurfaceExecutionAuthority } from "./runtimeSurfaceExecutionAuthority";
import type { RuntimeSurfaceExecutionAuthoritySnapshot } from "./runtimeFeatureAccessTypes";
import {
  deriveRequiredRuntimeSurfaceExecutionCommandIds,
  validateRuntimeSurfaceExecutionAuthoritySnapshot
} from "./runtimeSurfaceExecutionEvidence";

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

describe("runtime surface execution authority snapshot validation", () => {
  const sessionId = "current-session";
  const requiredCommandIds = ["edit.redo", "edit.undo"] as const;

  const createFixture = () => {
    const probes = new Map<string, RuntimeCommandExecutionProbe>();
    let tokenIndex = 0;
    const authority = createRuntimeSurfaceExecutionAuthority({
      sessionId,
      requiredCommandIds,
      getProbe: (commandId) => probes.get(commandId),
      createToken: () => `token-${tokenIndex++}`
    });
    const execute = (commandId: string) => {
      const handle = authority.beginObservation(commandId);
      probes.set(commandId, {
        commandId,
        attemptCount: 1,
        executedCount: 1,
        lastResult: createExecutedRuntimeCommandResult()
      });
      authority.completeObservation(handle.token);
    };
    return { authority, execute };
  };

  const validate = (
    snapshot: RuntimeSurfaceExecutionAuthoritySnapshot | undefined,
    currentSessionId = sessionId
  ) => validateRuntimeSurfaceExecutionAuthoritySnapshot({
    requiredCommandIds,
    currentSessionId,
    snapshot
  });

  it("passes only an exact trusted current-session authority snapshot", () => {
    const { authority, execute } = createFixture();
    execute("edit.undo");
    execute("edit.redo");

    const result = validate(authority.getEvidenceSnapshot());

    expect(result.passed).toBe(true);
    expect(result.verifiedCommandIds).toEqual(requiredCommandIds);
    expect(result.missingCommandIds).toEqual([]);
    expect(result.reasons).toEqual([]);
  });

  it("blocks empty and partial authority snapshots with deterministic missing IDs", () => {
    const { authority, execute } = createFixture();
    expect(validate(authority.getEvidenceSnapshot()).missingCommandIds)
      .toEqual(requiredCommandIds);

    execute("edit.undo");
    const partial = validate(authority.getEvidenceSnapshot());

    expect(partial.passed).toBe(false);
    expect(partial.verifiedCommandIds).toEqual(["edit.undo"]);
    expect(partial.missingCommandIds).toEqual(["edit.redo"]);
  });

  it("blocks a trusted snapshot from another diagnostics session", () => {
    const { authority, execute } = createFixture();
    execute("edit.undo");

    const result = validate(authority.getEvidenceSnapshot(), "new-session");

    expect(result.passed).toBe(false);
    expect(result.staleCommandIds).toEqual(requiredCommandIds);
    expect(result.verifiedCommandIds).toEqual(["edit.undo"]);
  });

  it("rejects structurally matching caller-authored snapshots", () => {
    const synthetic = {
      source: "live-runtime-probe-authority",
      sessionId,
      verifiedCommandIds: [...requiredCommandIds],
      missingCommandIds: [],
      rejectedCommandIds: [],
      rejections: [],
      complete: true,
      reasons: []
    } as const;
    const result = validate(synthetic as RuntimeSurfaceExecutionAuthoritySnapshot);

    expect(result.passed).toBe(false);
    expect(result.verifiedCommandIds).toEqual([]);
    expect(result.missingCommandIds).toEqual(requiredCommandIds);
    expect(result.reasons).toContain(
      "Runtime surface execution evidence is not owned by the live probe authority."
    );
  });

  it("rejects copied IDs and raw observation arrays", () => {
    const copiedIds = { verifiedCommandIds: [...requiredCommandIds] };
    const rawObservations = {
      observations: requiredCommandIds.map((commandId) => ({
        commandId,
        beforeAttemptCount: 0,
        afterAttemptCount: 1
      }))
    };

    for (const candidate of [copiedIds, rawObservations]) {
      expect(validate(candidate as unknown as RuntimeSurfaceExecutionAuthoritySnapshot).passed)
        .toBe(false);
    }
  });
});
