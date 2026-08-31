import { execFileSync } from "node:child_process";

export const ATRVISU_SOURCE_HEAD_HEADER = "x-atrvisu-source-head";
export const ATRVISU_SOURCE_BRANCH_HEADER = "x-atrvisu-source-branch";

export const readGitSourceProvenance = (
  cwd = process.cwd(),
  execute = (args) => execFileSync("git", args, { cwd, encoding: "utf8" }).trim()
) => Object.freeze({
  head: execute(["rev-parse", "HEAD"]),
  branch: execute(["branch", "--show-current"])
});

export const assertAtrVisuServerProvenance = (expectedHead, observedHead) => {
  if (!observedHead) {
    throw new Error(
      `AtrVisu server did not report ${ATRVISU_SOURCE_HEAD_HEADER}; refusing an unverified runtime.`
    );
  }
  if (observedHead !== expectedHead) {
    throw new Error(
      `AtrVisu server source mismatch: expected ${expectedHead}, received ${observedHead}.`
    );
  }
};

export const allowedE2EPorts = Object.freeze([5173, 5174, 5175, 5176, 5177]);

export const resolveE2EServerMode = (environment) => {
  if (environment.ATRVISU_E2E_REUSE_EXISTING !== "1") {
    return { mode: "owned" };
  }

  const baseUrl = environment.ATRVISU_E2E_BASE_URL?.trim();
  if (!baseUrl) {
    throw new Error(
      "ATRVISU_E2E_REUSE_EXISTING=1 requires an explicit ATRVISU_E2E_BASE_URL. "
      + "The caller is responsible for verifying the reused server's code identity."
    );
  }

  return { mode: "external", baseUrl };
};

export const selectAvailableE2EPort = async (ports, isAvailable) => {
  for (const port of ports) {
    if (await isAvailable(port)) {
      return port;
    }
  }

  throw new Error(`No available AtrVisu E2E port was found in: ${ports.join(", ")}.`);
};

export const createOwnedServer = (processHandle) => ({
  ownership: "owned",
  processHandle
});

export const createExternalServer = (baseUrl) => ({
  ownership: "external",
  baseUrl
});

export const stopOwnedE2EServer = async (server, stopProcess) => {
  if (server?.ownership === "owned") {
    await stopProcess(server.processHandle);
  }
};

export const createPlaywrightEnvironment = (environment, baseUrl) => ({
  ...environment,
  ATRVISU_E2E_EXTERNAL_SERVER: "1",
  ATRVISU_E2E_BASE_URL: baseUrl
});
