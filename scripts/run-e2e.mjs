import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { setTimeout as delay } from "node:timers/promises";
import {
  ATRVISU_SOURCE_HEAD_HEADER,
  allowedE2EPorts,
  assertAtrVisuServerProvenance,
  createExternalServer,
  createE2EPhases,
  createOwnedServer,
  createPlaywrightEnvironment,
  readGitSourceProvenance,
  resolveE2EServerMode,
  runE2EPhases,
  selectAvailableE2EPort,
  stopOwnedE2EServer
} from "./e2eRunnerHelpers.mjs";

const host = "127.0.0.1";
const startupTimeoutMs = 120_000;
const source = readGitSourceProvenance();

const run = (command, args, options = {}) =>
  new Promise((resolve) => {
    const child = spawn(command, args, {
      stdio: "inherit",
      shell: false,
      ...options
    });

    child.on("exit", (code, signal) => {
      resolve({ code, signal });
    });
  });

const isAtrVisuServer = async (baseUrl) => {
  try {
    const response = await fetch(baseUrl);
    if (!response.ok || !(await response.text()).includes("<title>AtrVisu</title>")) {
      return false;
    }
    assertAtrVisuServerProvenance(
      source.head,
      response.headers.get(ATRVISU_SOURCE_HEAD_HEADER)
    );
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("AtrVisu server")) {
      throw error;
    }
    return false;
  }
};

const isPortAvailable = (port) => new Promise((resolve) => {
  const server = createServer();
  server.once("error", () => resolve(false));
  server.listen(port, host, () => {
    server.close(() => resolve(true));
  });
});

const waitForServer = async (baseUrl) => {
  const startedAt = Date.now();

  while (Date.now() - startedAt < startupTimeoutMs) {
    if (await isAtrVisuServer(baseUrl)) {
      return;
    }

    await delay(250);
  }

  throw new Error(`Timed out waiting for Vite at ${baseUrl}`);
};

const stopProcess = async (child) => {
  if (!child || child.exitCode !== null) {
    return;
  }

  const waitForExit = () => new Promise((resolve) => {
    child.once("exit", resolve);
  });
  child.kill("SIGTERM");
  await Promise.race([waitForExit(), delay(2_000)]);

  if (child.exitCode === null) {
    child.kill("SIGKILL");
    await Promise.race([waitForExit(), delay(2_000)]);
  }
};

let serverOwnership = null;

const teardown = async () => {
  await stopOwnedE2EServer(serverOwnership, stopProcess);
  serverOwnership = null;
};

process.on("SIGINT", () => {
  void teardown().finally(() => process.exit(130));
});
process.on("SIGTERM", () => {
  void teardown().finally(() => process.exit(143));
});

try {
  const mode = resolveE2EServerMode(process.env);
  let baseUrl;

  if (mode.mode === "external") {
    baseUrl = mode.baseUrl;
    serverOwnership = createExternalServer(baseUrl);
  } else {
    const port = await selectAvailableE2EPort(allowedE2EPorts, isPortAvailable);
    baseUrl = `http://${host}:${port}`;
    const vite = spawn(
      process.execPath,
      [
        "./node_modules/vite/bin/vite.js",
        "--host",
        host,
        "--port",
        String(port),
        "--strictPort"
      ],
      {
        stdio: "inherit",
        shell: false
      }
    );
    serverOwnership = createOwnedServer(vite);
  }

  await waitForServer(baseUrl);
  const env = createPlaywrightEnvironment({
    ...process.env,
    ATRVISU_E2E_EXPECTED_SOURCE_HEAD: source.head
  }, baseUrl);
  const result = await runE2EPhases(createE2EPhases(process.argv.slice(2)), (phase) => {
    console.log(`AtrVisu E2E phase: ${phase.name}`);
    return run(process.execPath, [
      "./node_modules/@playwright/test/cli.js",
      "test",
      ...phase.args
    ], { env });
  });
  await teardown();

  if (result.signal) {
    console.error(`Playwright exited with signal ${result.signal}`);
    process.exit(1);
  }

  process.exit(result.code ?? 1);
} catch (error) {
  await teardown();
  console.error(error);
  process.exit(1);
}
