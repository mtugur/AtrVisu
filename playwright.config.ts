import { defineConfig, devices } from "@playwright/test";

const useExternalWebServer = process.env.ATRVISU_E2E_EXTERNAL_SERVER === "1";
const baseURL = process.env.ATRVISU_E2E_BASE_URL ?? "http://127.0.0.1:5173";

export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  expect: {
    timeout: 5_000
  },
  use: {
    baseURL,
    trace: "on-first-retry"
  },
  webServer: useExternalWebServer
    ? undefined
    : {
        command: "node ./node_modules/vite/bin/vite.js --host 127.0.0.1 --port 5173 --strictPort",
        url: "http://127.0.0.1:5173",
        reuseExistingServer: true,
        timeout: 120_000
      },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] }
    }
  ]
});
