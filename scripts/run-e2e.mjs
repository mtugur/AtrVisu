import { spawn } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";

const host = "127.0.0.1";
const port = 5173;
const baseUrl = `http://${host}:${port}`;
const startupTimeoutMs = 120_000;

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

const waitForServer = async () => {
  const startedAt = Date.now();

  while (Date.now() - startedAt < startupTimeoutMs) {
    try {
      const response = await fetch(baseUrl);
      if (response.ok) {
        return;
      }
    } catch {
      // Vite is still starting.
    }

    await delay(250);
  }

  throw new Error(`Timed out waiting for Vite at ${baseUrl}`);
};

const stopProcess = async (child) => {
  if (child.exitCode !== null || child.killed) {
    return;
  }

  child.kill("SIGTERM");
  await delay(2_000);

  if (child.exitCode === null && !child.killed) {
    child.kill("SIGKILL");
  }
};

const vite = spawn(
  process.execPath,
  ["./node_modules/vite/bin/vite.js", "--host", host, "--port", String(port), "--strictPort"],
  {
    stdio: "inherit",
    shell: false
  }
);

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
  await waitForServer();
  const result = await run(process.execPath, ["./node_modules/@playwright/test/cli.js", "test"], {
    env: {
      ...process.env,
      ATRVISU_E2E_EXTERNAL_SERVER: "1"
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
