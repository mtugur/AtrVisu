import { describe, expect, it } from "vitest";
import {
  createExecutedRuntimeCommandResult,
  createRuntimeCommandOperationResult,
  type RuntimeCommandExecutionProbe
} from "../runtimeCommands/runtimeCommandOperation";
import { createRuntimeSurfaceExecutionAuthority } from "./runtimeSurfaceExecutionAuthority";

const createFixture = (
  requiredCommandIds: readonly string[] = ["edit.undo"],
  sessionId = "session-one"
) => {
  const probes = new Map<string, RuntimeCommandExecutionProbe>();
  let tokenIndex = 0;
  const authority = createRuntimeSurfaceExecutionAuthority({
    sessionId,
    requiredCommandIds,
    getProbe: (commandId) => probes.get(commandId),
    createToken: () => `token-${tokenIndex++}`
  });
  return { authority, probes };
};

const executedProbe = (
  commandId: string,
  attemptCount = 1,
  executedCount = 1
): RuntimeCommandExecutionProbe => ({
  commandId,
  attemptCount,
  executedCount,
  lastResult: createExecutedRuntimeCommandResult()
});

describe("runtime surface execution authority", () => {
  it("keeps one stable session per authority and separates distinct authorities", () => {
    const first = createFixture(["edit.redo", "edit.undo"], "session-one").authority;
    const second = createFixture(["edit.undo"], "session-two").authority;

    expect(first.sessionId).toBe("session-one");
    expect(first.sessionId).toBe("session-one");
    expect(second.sessionId).toBe("session-two");
    expect(first.requiredCommandIds).toEqual(["edit.redo", "edit.undo"]);
  });

  it("rejects duplicate canonical command IDs", () => {
    expect(() => createFixture(["edit.undo", "edit.undo"]))
      .toThrow("duplicate command IDs: edit.undo");
  });

  it.each([
    "command.unknown",
    "view.fitView",
    "diagnostics.noRedConsole"
  ])("rejects non-canonical command begin for %s", (commandId) => {
    const { authority } = createFixture();

    expect(() => authority.beginObservation(commandId))
      .toThrow("is not in the canonical required set");
  });

  it("captures an absent live probe internally as zero counts", () => {
    const { authority, probes } = createFixture();
    const handle = authority.beginObservation("edit.undo");
    probes.set("edit.undo", executedProbe("edit.undo"));

    expect(authority.completeObservation(handle.token)).toEqual({
      source: "live-runtime-probe-authority",
      sessionId: "session-one",
      commandId: "edit.undo",
      status: "verified"
    });
    expect(authority.getEvidenceSnapshot()).toMatchObject({
      verifiedCommandIds: ["edit.undo"],
      missingCommandIds: [],
      complete: true
    });
  });

  it("captures and clones the live before probe without caller input", () => {
    const { authority, probes } = createFixture();
    const mutableBefore = executedProbe("edit.undo", 4, 3);
    probes.set("edit.undo", mutableBefore);
    const handle = authority.beginObservation("edit.undo");

    mutableBefore.attemptCount = 100;
    mutableBefore.executedCount = 100;
    probes.set("edit.undo", executedProbe("edit.undo", 5, 4));

    expect(authority.completeObservation(handle.token).status).toBe("verified");
  });

  it.each([
    [
      "attempt delta zero",
      { commandId: "edit.undo", attemptCount: 1, executedCount: 0 },
      executedProbe("edit.undo", 1, 1),
      "attemptCount"
    ],
    [
      "attempt delta greater than one",
      undefined,
      executedProbe("edit.undo", 2, 1),
      "attemptCount"
    ],
    [
      "execution delta zero",
      undefined,
      executedProbe("edit.undo", 1, 0),
      "executedCount"
    ],
    [
      "execution delta greater than one",
      { commandId: "edit.undo", attemptCount: 2, executedCount: 0 },
      executedProbe("edit.undo", 3, 2),
      "executedCount"
    ]
  ] as const)("rejects %s from the live probe store", (
    _label,
    before,
    after,
    expectedMessage
  ) => {
    const { authority, probes } = createFixture();
    if (before) {
      probes.set("edit.undo", before);
    }
    const handle = authority.beginObservation("edit.undo");
    probes.set("edit.undo", after);

    expect(() => authority.completeObservation(handle.token)).toThrow(expectedMessage);
    expect(authority.getEvidenceSnapshot().verifiedCommandIds).toEqual([]);
  });

  it.each([
    "cancelled",
    "disabled",
    "unavailable",
    "unsupported",
    "failed"
  ] as const)("rejects a live %s result", (status) => {
    const { authority, probes } = createFixture();
    const handle = authority.beginObservation("edit.undo");
    probes.set("edit.undo", {
      commandId: "edit.undo",
      attemptCount: 1,
      executedCount: 0,
      lastResult: createRuntimeCommandOperationResult(status, `${status} result`)
    });

    expect(() => authority.completeObservation(handle.token))
      .toThrow(`finished with status "${status}"`);
    const snapshot = authority.getEvidenceSnapshot();
    expect(snapshot.verifiedCommandIds).toEqual([]);
    expect(snapshot.rejectedCommandIds).toEqual(["edit.undo"]);
    expect(snapshot.rejections[0]?.kind).toBe(status);
  });

  it("rejects malformed and inconsistent live results", () => {
    const malformedResults: unknown[] = [
      { handled: "yes", status: "executed" },
      { handled: false, status: "executed" },
      { handled: true, status: "cancelled" }
    ];

    malformedResults.forEach((lastResult) => {
      const { authority, probes } = createFixture();
      const handle = authority.beginObservation("edit.undo");
      probes.set("edit.undo", {
        commandId: "edit.undo",
        attemptCount: 1,
        executedCount: 1,
        lastResult
      } as unknown as RuntimeCommandExecutionProbe);

      expect(() => authority.completeObservation(handle.token)).toThrow(/malformed|inconsistent/);
      expect(authority.getEvidenceSnapshot().verifiedCommandIds).toEqual([]);
    });
  });

  it("rejects malformed live counter and command identities", () => {
    const malformedProbes: unknown[] = [
      { commandId: "edit.redo", attemptCount: 1, executedCount: 1 },
      { commandId: "edit.undo", attemptCount: -1, executedCount: 0 },
      { commandId: "edit.undo", attemptCount: 1.5, executedCount: 1 },
      { commandId: "edit.undo", attemptCount: 1, executedCount: 2 }
    ];

    malformedProbes.forEach((candidate) => {
      expect(() => createRuntimeSurfaceExecutionAuthority({
        sessionId: "session",
        requiredCommandIds: ["edit.undo"],
        getProbe: () => candidate as RuntimeCommandExecutionProbe,
        createToken: () => "token"
      }).beginObservation("edit.undo")).toThrow("malformed");
    });
  });

  it("rejects forged, unknown, replayed, and stale tokens", () => {
    const { authority, probes } = createFixture();
    expect(() => authority.completeObservation("session-one.forged"))
      .toThrow("unknown");
    expect(() => authority.completeObservation("old-session.token"))
      .toThrow("stale session");

    const handle = authority.beginObservation("edit.undo");
    probes.set("edit.undo", executedProbe("edit.undo"));
    authority.completeObservation(handle.token);

    expect(() => authority.completeObservation(handle.token))
      .toThrow("already been consumed");
  });

  it("consumes a token permanently when completion has no execution", () => {
    const { authority } = createFixture();
    const handle = authority.beginObservation("edit.undo");

    expect(() => authority.completeObservation(handle.token)).toThrow("attemptCount");
    expect(() => authority.completeObservation(handle.token))
      .toThrow("already been consumed");
    expect(authority.getEvidenceSnapshot().complete).toBe(false);
  });

  it("rejects conflicting pending and duplicate verified command evidence", () => {
    const { authority, probes } = createFixture();
    const handle = authority.beginObservation("edit.undo");
    expect(() => authority.beginObservation("edit.undo")).toThrow("pending observation");

    probes.set("edit.undo", executedProbe("edit.undo"));
    authority.completeObservation(handle.token);
    expect(() => authority.beginObservation("edit.undo")).toThrow("already has verified evidence");
  });

  it("cannot substitute another command for a pending token", () => {
    const { authority, probes } = createFixture(["edit.redo", "edit.undo"]);
    const handle = authority.beginObservation("edit.undo");
    probes.set("edit.redo", executedProbe("edit.redo"));

    expect(() => authority.completeObservation(handle.token)).toThrow("attemptCount");
    expect(authority.getEvidenceSnapshot().verifiedCommandIds).toEqual([]);
  });

  it("reflects only completed authority-owned transitions in deterministic snapshots", () => {
    const { authority, probes } = createFixture(["edit.redo", "edit.undo"]);
    const undoHandle = authority.beginObservation("edit.undo");
    probes.set("edit.undo", executedProbe("edit.undo"));
    authority.completeObservation(undoHandle.token);
    authority.beginObservation("edit.redo");

    expect(authority.getEvidenceSnapshot()).toMatchObject({
      source: "live-runtime-probe-authority",
      sessionId: "session-one",
      verifiedCommandIds: ["edit.undo"],
      missingCommandIds: ["edit.redo"],
      complete: false
    });
  });

  it("reset clears pending, completed, and rejected authority state", () => {
    const { authority, probes } = createFixture(["edit.redo", "edit.undo"]);
    const undoHandle = authority.beginObservation("edit.undo");
    probes.set("edit.undo", executedProbe("edit.undo"));
    authority.completeObservation(undoHandle.token);
    const redoHandle = authority.beginObservation("edit.redo");
    authority.reset();

    expect(authority.getEvidenceSnapshot()).toMatchObject({
      verifiedCommandIds: [],
      missingCommandIds: ["edit.redo", "edit.undo"],
      rejectedCommandIds: [],
      complete: false
    });
    expect(() => authority.completeObservation(redoHandle.token))
      .toThrow("already been consumed");
  });
});
