import { describe, expect, it, vi } from "vitest";

type E2EServerMode =
  | { mode: "owned" }
  | { mode: "external"; baseUrl: string };

type E2EServerOwnership =
  | { ownership: "owned"; processHandle: unknown }
  | { ownership: "external"; baseUrl: string };

type E2ERunnerHelpers = {
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
