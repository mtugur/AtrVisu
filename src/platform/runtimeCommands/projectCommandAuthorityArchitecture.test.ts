import ts from "typescript";
import { describe, expect, it } from "vitest";

const readSource = (relativePath: string) => {
  const url = new URL(`../../${relativePath}`, import.meta.url);
  const path = decodeURIComponent(url.pathname).replace(/^\/([A-Za-z]:)/, "$1");
  const source = ts.sys.readFile(path);
  if (source === undefined) {
    throw new Error(`Unable to read project command source "${relativePath}".`);
  }
  return source;
};

describe("project command runtime ownership architecture", () => {
  it("removes the ProjectManager lifecycle controller from App and ProjectManager", () => {
    const source = `${readSource("App.tsx")}\n${readSource("components/ProjectManager.tsx")}`;

    expect(source).not.toContain("ProjectManagerRuntimeController");
    expect(source).not.toContain("projectManagerRuntimeControllerRef");
    expect(source).not.toContain("onRuntimeControllerChange");
  });

  it("keeps save, export, and import storage execution outside ProjectManager", () => {
    const source = readSource("components/ProjectManager.tsx");

    expect(source).not.toMatch(/\bcreateRevision\b/);
    expect(source).not.toMatch(/\bexportProject\b/);
    expect(source).not.toMatch(/\bimportProject\b/);
    expect(source).not.toMatch(/\bnextRevisionCode\b/);
    expect(source).not.toContain("if (onExecuteRuntimeCommand)");
  });

  it("owns exactly one persistent project import input at the App boundary", () => {
    const appSource = readSource("App.tsx");
    const managerSource = readSource("components/ProjectManager.tsx");

    expect(appSource.match(/data-testid="import-project-file"/g)).toHaveLength(1);
    expect(managerSource).not.toContain('data-testid="import-project-file"');
    expect(appSource).toContain("createProjectRuntimeCommandBindings");
  });
});
