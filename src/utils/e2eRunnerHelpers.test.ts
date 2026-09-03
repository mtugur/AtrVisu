import { describe, expect, it, vi } from "vitest";

type E2EServerMode =
  | { mode: "owned" }
  | { mode: "external"; baseUrl: string };

type E2EServerOwnership =
  | { ownership: "owned"; processHandle: unknown }
  | { ownership: "external"; baseUrl: string };

type E2EPhase = { name: string; args: string[] };
type E2EResult = { code: number | null; signal: string | null };

type E2ERunnerHelpers = {
  createE2EPhases: (args: string[]) => E2EPhase[];
  runE2EPhases: (
    phases: E2EPhase[],
    runPhase: (phase: E2EPhase) => Promise<E2EResult>
  ) => Promise<E2EResult>;
  ATRVISU_SOURCE_HEAD_HEADER: string;
  assertAtrVisuServerProvenance: (expectedHead: string, observedHead: string | null) => void;
  readGitSourceProvenance: (
    cwd: string,
    execute: (args: readonly string[]) => string
  ) => Readonly<{ head: string; branch: string }>;
  allowedE2EPorts: readonly number[];
  resolveE2EServerMode: (environment: Record<string, string | undefined>) => E2EServerMode;
  selectAvailableE2EPort: (
    ports: readonly number[],
    isAvailable: (port: number) => Promise<boolean>
  ) => Promise<number>;
  createOwnedServer: (processHandle: unknown) => E2EServerOwnership;
  createExternalServer: (baseUrl: string) => E2EServerOwnership;
  stopOwnedE2EServer: (
    server: E2EServerOwnership,
    stopProcess: (processHandle: unknown) => Promise<void>
  ) => Promise<void>;
  createPlaywrightEnvironment: (
    environment: Record<string, string | undefined>,
    baseUrl: string
  ) => Record<string, string | undefined>;
};

const helperModulePath = "../../scripts/e2eRunnerHelpers.mjs";
const helpers = await import(helperModulePath) as unknown as E2ERunnerHelpers;

describe("AtrVisu E2E runner ownership", () => {
  it("reports deterministic source provenance for the worktree being served", () => {
    const execute = vi.fn((args: readonly string[]) => args[0] === "rev-parse"
      ? "exact-head"
      : "feat/exact-branch");

    expect(helpers.readGitSourceProvenance("C:/AtrVisu", execute)).toEqual({
      head: "exact-head",
      branch: "feat/exact-branch"
    });
    expect(execute).toHaveBeenNthCalledWith(1, ["rev-parse", "HEAD"]);
    expect(execute).toHaveBeenNthCalledWith(2, ["branch", "--show-current"]);
  });

  it("rejects missing or stale server source provenance", () => {
    expect(() => helpers.assertAtrVisuServerProvenance("expected", null))
      .toThrow(/refusing an unverified runtime/);
    expect(() => helpers.assertAtrVisuServerProvenance("expected", "stale"))
      .toThrow(/source mismatch/);
    expect(() => helpers.assertAtrVisuServerProvenance("expected", "expected"))
      .not.toThrow();
  });

  it("selects a free fallback when port 5173 is occupied", async () => {
    const port = await helpers.selectAvailableE2EPort(
      helpers.allowedE2EPorts,
      async (candidate) => candidate === 5174
    );

    expect(port).toBe(5174);
  });

  it("does not reuse an existing server by default", () => {
    expect(helpers.resolveE2EServerMode({
      ATRVISU_E2E_BASE_URL: "http://127.0.0.1:5173"
    })).toEqual({ mode: "owned" });
  });

  it("requires an explicit URL for explicit reuse", () => {
    expect(() => helpers.resolveE2EServerMode({
      ATRVISU_E2E_REUSE_EXISTING: "1"
    })).toThrow(/requires an explicit ATRVISU_E2E_BASE_URL/);
  });

  it("fails clearly when no allowed port is available", async () => {
    await expect(helpers.selectAvailableE2EPort(
      helpers.allowedE2EPorts,
      async () => false
    )).rejects.toThrow(/No available AtrVisu E2E port was found/);
  });

  it("stops the process owned by the runner", async () => {
    const processHandle = { pid: 123 };
    const stopProcess = vi.fn(async () => undefined);

    await helpers.stopOwnedE2EServer(
      helpers.createOwnedServer(processHandle),
      stopProcess
    );

    expect(stopProcess).toHaveBeenCalledOnce();
    expect(stopProcess).toHaveBeenCalledWith(processHandle);
  });

  it("never stops an explicitly reused external process", async () => {
    const stopProcess = vi.fn(async () => undefined);

    await helpers.stopOwnedE2EServer(
      helpers.createExternalServer("http://127.0.0.1:5173"),
      stopProcess
    );

    expect(stopProcess).not.toHaveBeenCalled();
  });

  it("passes the selected base URL to Playwright configuration", () => {
    expect(helpers.createPlaywrightEnvironment(
      { EXISTING_VALUE: "preserved" },
      "http://127.0.0.1:5176"
    )).toMatchObject({
      EXISTING_VALUE: "preserved",
      ATRVISU_E2E_EXTERNAL_SERVER: "1",
      ATRVISU_E2E_BASE_URL: "http://127.0.0.1:5176"
    });
  });
});

describe("AtrVisu complete E2E phase scheduling", () => {
  it("partitions the exact command-route scenario without changing workers, retries or timeouts", () => {
    const phases = helpers.createE2EPhases([]);
    expect(phases).toHaveLength(2);
    const [parallel, isolated] = phases;
    expect(parallel.args[0]).toBe("--grep-invert");
    expect(isolated.args.slice(0, 2)).toEqual(["--grep", parallel.args[1]]);
    const pattern = new RegExp(parallel.args[1]);
    expect(pattern.test("[chromium] app-smoke.spec.ts runtime feature access complete gate is bound to observed visible command routes")).toBe(true);
    expect(pattern.test("runtime feature access complete gate is bound to observed visible command routes extra")).toBe(false);
    expect(pattern.test("native asset import is persistent")).toBe(false);
    for (const phase of phases) {
      expect(phase.args.join(" ")).not.toMatch(/--(?:workers|retries|timeout|pass-with-no-tests)/);
    }
  });

  it("keeps phase-one evidence outside the isolated Playwright output directory", () => {
    const [parallel, isolated] = helpers.createE2EPhases([]);
    expect(parallel.args).not.toContain("--output");
    expect(isolated.args.slice(-2)).toEqual(["--output", "test-results/runtime-feature-access"]);
  });

  it("preserves explicit focused and list CLI arguments without adding another test", () => {
    for (const args of [["--list"], ["native-assets.spec.ts", "--grep", "reload", "--workers=2"]]) {
      expect(helpers.createE2EPhases(args)).toEqual([{ name: "focused", args }]);
      expect(helpers.createE2EPhases(args)[0].args).not.toBe(args);
    }
  });

  it("waits for the parallel child to exit before starting the isolated child", async () => {
    const phases = helpers.createE2EPhases([]);
    let finishParallel!: (result: E2EResult) => void;
    const parallelExit = new Promise<E2EResult>((resolve) => { finishParallel = resolve; });
    const runPhase = vi.fn()
      .mockReturnValueOnce(parallelExit)
      .mockResolvedValueOnce({ code: 0, signal: null });
    const execution = helpers.runE2EPhases(phases, runPhase);
    expect(runPhase).toHaveBeenCalledTimes(1);
    expect(runPhase).toHaveBeenNthCalledWith(1, phases[0]);
    finishParallel({ code: 0, signal: null });
    await expect(execution).resolves.toEqual({ code: 0, signal: null });
    expect(runPhase).toHaveBeenNthCalledWith(2, phases[1]);
  });

  it.each([0, 1])("does not hide a failure in phase %i or omit another phase", async (failedPhase) => {
    const phases = helpers.createE2EPhases([]);
    const runPhase = vi.fn(async (phase: E2EPhase) => ({
      code: phase === phases[failedPhase] ? 1 : 0, signal: null
    }));
    await expect(helpers.runE2EPhases(phases, runPhase)).resolves.toEqual({ code: 1, signal: null });
    expect(runPhase).toHaveBeenCalledTimes(2);
  });

  it("does not continue after a terminated child or turn a missing exit code into success", async () => {
    const phases = helpers.createE2EPhases([]);
    const terminated = vi.fn(async () => ({ code: null, signal: "SIGTERM" }));
    await expect(helpers.runE2EPhases(phases, terminated)).resolves.toEqual({ code: null, signal: "SIGTERM" });
    expect(terminated).toHaveBeenCalledOnce();
    const missingCode = vi.fn()
      .mockResolvedValueOnce({ code: null, signal: null })
      .mockResolvedValueOnce({ code: 0, signal: null });
    await expect(helpers.runE2EPhases(phases, missingCode)).resolves.toEqual({ code: null, signal: null });
  });
});
