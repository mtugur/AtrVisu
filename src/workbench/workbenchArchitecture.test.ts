import ts from "typescript";
import { describe, expect, it } from "vitest";

const readSource = (relativePath: string) => {
  const url = new URL(relativePath, import.meta.url);
  const path = decodeURIComponent(url.pathname).replace(/^\/([A-Za-z]:)/, "$1");
  const source = ts.sys.readFile(path);
  if (source === undefined) {
    throw new Error(`Unable to read architecture source "${relativePath}".`);
  }
  return source;
};

describe("P1-B workbench architecture", () => {
  it("keeps BabylonScene out of WorkbenchShell", () => {
    const source = readSource("../components/WorkbenchShell.tsx");

    expect(source).not.toContain("BabylonScene");
    expect(source).toContain('import { AppShell } from "./AppShell"');
  });

  it("keeps editor metadata free of React and Babylon runtime imports", () => {
    const registrySource = readSource("../platform/editorDefinitionRegistry.ts");
    const definitionSource = readSource("./layout3dEditorDefinition.ts");
    const contractSource = readSource("../platform/contracts/editor.ts");

    [registrySource, definitionSource, contractSource].forEach((source) => {
      expect(source).not.toMatch(/from\s+["']react["']/);
      expect(source).not.toContain("@babylonjs");
    });
    expect(contractSource).not.toContain("render:");
    expect(contractSource).not.toContain("ReactNode");
  });

  it("routes App through WorkbenchShell and the explicit layout.3d editor", () => {
    const appSource = readSource("../App.tsx");

    expect(appSource).not.toContain('from "./components/AppShell"');
    expect(appSource).toContain('from "./components/WorkbenchShell"');
    expect(appSource).toContain('from "./components/EditorHost"');
    expect(appSource).toContain("LAYOUT_3D_EDITOR_ID");
    expect(appSource).toContain("LAYOUT_3D_EDITOR_DEFINITION");
  });

  it("does not introduce runtime authority or storage dependencies in shell components", () => {
    const hostSource = readSource("../components/EditorHost.tsx");
    const shellSource = readSource("../components/WorkbenchShell.tsx");
    const combined = `${hostSource}\n${shellSource}`;

    expect(combined).not.toMatch(/createRuntime(Command|Panel|Selection|Viewport)/);
    expect(combined).not.toContain("indexedDB");
    expect(combined).not.toContain("localStorage");
    expect(combined).not.toContain("ResizeObserver");
  });
});
