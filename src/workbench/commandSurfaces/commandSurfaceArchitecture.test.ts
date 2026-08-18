// Node is available to Vitest; the app intentionally does not depend on @types/node.
// @ts-expect-error The test-only built-in import is outside the browser type surface.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const repositoryRoot = new URL("../../", import.meta.url);
const readRepositoryFile = (path: string) =>
  readFileSync(new URL(path, repositoryRoot), "utf8");

describe("P1-C command surface architecture", () => {
  it("keeps App on WorkbenchShell and preserves one project import input", () => {
    const appSource = readRepositoryFile("App.tsx");

    expect(appSource).toContain('from "./components/WorkbenchShell"');
    expect(appSource).not.toContain('from "./components/AppShell"');
    expect(appSource.match(/data-testid="import-project-file"/g)).toHaveLength(1);
    expect(appSource.match(/projectImportFileInputRef/g)?.length).toBeGreaterThan(1);
  });

  it("keeps chrome independent of Babylon and project storage", () => {
    [
      "components/workbench/WorkbenchApplicationBar.tsx",
      "components/workbench/WorkbenchMenuBar.tsx",
      "components/workbench/WorkbenchCommandBar.tsx"
    ].forEach((path) => {
      const source = readRepositoryFile(path);
      expect(source).not.toMatch(/BabylonScene|@babylonjs|projectStorage|indexedDB|localStorage/);
    });
  });

  it("does not create a parallel registry or runtime authority", () => {
    const adapter = readRepositoryFile("workbench/commandSurfaces/commandSurfaceAdapter.ts");
    const config = readRepositoryFile("workbench/commandSurfaces/commandSurfaceConfig.ts");

    expect(adapter).not.toMatch(/createCommandRegistry|createPanelRegistry|createRuntimeSelection/);
    expect(config).not.toMatch(/createCommandRegistry|execute:\s*\(/);
    expect(adapter).toContain("coreBridge.executeCommand");
    expect(adapter).toContain("runtimeBridge.executeCommand");
  });

  it("keeps the production dependency allowlist explicit and package lock governed by npm", () => {
    const packageJson = JSON.parse(readRepositoryFile("../package.json")) as {
      dependencies: Record<string, string>;
      devDependencies: Record<string, string>;
    };
    expect(Object.keys(packageJson.dependencies).sort()).toEqual([
      "@babylonjs/core",
      "@babylonjs/loaders",
      "@pdf-lib/fontkit",
      "fflate",
      "idb",
      "lucide-react",
      "pdf-lib",
      "react",
      "react-dom"
    ]);
    expect(Object.keys(packageJson.devDependencies).sort()).toEqual([
      "@playwright/test",
      "@types/react",
      "@types/react-dom",
      "@vitejs/plugin-react",
      "fake-indexeddb",
      "jsdom",
      "typescript",
      "vite",
      "vitest"
    ]);
  });
});
