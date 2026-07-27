import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { setTimeout as delay } from "node:timers/promises";

const host = "127.0.0.1";
const startupTimeoutMs = 120_000;
const preferredPort = 5173;
const fallbackPorts = [5174, 5175, 5176, 5177];

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
    return response.ok && (await response.text()).includes("<title>AtrVisu</title>");
  } catch {
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

const chooseServer = async () => {
  const preferredBaseUrl = `http://${host}:${preferredPort}`;
  if (await isAtrVisuServer(preferredBaseUrl)) {
    return { baseUrl: preferredBaseUrl, port: preferredPort, reuseExisting: true };
  }
  if (await isPortAvailable(preferredPort)) {
    return { baseUrl: preferredBaseUrl, port: preferredPort, reuseExisting: false };
  }
  for (const port of fallbackPorts) {
    if (await isPortAvailable(port)) {
      return {
        baseUrl: `http://${host}:${port}`,
        port,
        reuseExisting: false
      };
    }
  }
  throw new Error("No available AtrVisu E2E port was found.");
};

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
  if (!child || child.exitCode !== null || child.killed) {
    return;
  }

  child.kill("SIGTERM");
  await delay(2_000);

  if (child.exitCode === null && !child.killed) {
    child.kill("SIGKILL");
  }
};

let vite = null;

const teardown = async () => {
  await stopProcess(vite);
};

process.on("SIGINT", () => {
  void teardown().finally(() => process.exit(130));
});
process.on("SIGTERM", () => {
  void teardown().finally(() => process.exit(143));
});

try {
  const server = await chooseServer();
  if (!server.reuseExisting) {
    vite = spawn(
      process.execPath,
      [
        "./node_modules/vite/bin/vite.js",
        "--host",
        host,
        "--port",
        String(server.port),
        "--strictPort"
      ],
      {
        stdio: "inherit",
        shell: false
      }
    );
  }
  await waitForServer(server.baseUrl);
  const result = await run(process.execPath, ["./node_modules/@playwright/test/cli.js", "test"], {
    env: {
      ...process.env,
      ATRVISU_E2E_EXTERNAL_SERVER: "1",
      ATRVISU_E2E_BASE_URL: server.baseUrl
    }
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
