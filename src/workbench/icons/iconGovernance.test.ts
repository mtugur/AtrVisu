// Node is available to Vitest; the app intentionally does not depend on @types/node.
// @ts-expect-error The test-only built-in import is outside the browser type surface.
import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const sourceRoot = new URL("../../", import.meta.url);

type SourceDirectoryEntry = Readonly<{
  name: string;
  isDirectory: () => boolean;
}>;

const productSources = (directory: URL): URL[] => (readdirSync(directory, { withFileTypes: true }) as SourceDirectoryEntry[])
  .flatMap((entry) => {
    const child = new URL(entry.name + (entry.isDirectory() ? "/" : ""), directory);
    if (entry.isDirectory()) return productSources(child);
    return /\.(ts|tsx)$/.test(entry.name) && !/\.test\.(ts|tsx)$/.test(entry.name) ? [child] : [];
  });

describe("PF-3A iconography governance", () => {
  it("keeps lucide-react imports inside the canonical registry implementation", () => {
    const directImports = productSources(sourceRoot)
      .filter((file) => readFileSync(file, "utf8").includes('from "lucide-react"'))
      .map((file) => file.pathname.replace(/.*\/src\//, "src/"));

    expect(directImports).toEqual(["src/workbench/icons/iconRegistry.tsx"]);
  });

  it("keeps migrated group and viewpoint controls free of standalone pseudo-icon glyphs", () => {
    ["../../components/AssemblyTreePanel.tsx", "../../components/ViewpointsPanel.tsx"].forEach((path) => {
      const source = readFileSync(new URL(path, import.meta.url), "utf8");
      expect(source).not.toMatch(/<button[^>]*>\s*(?:&lt;|&gt;|\+|-)\s*<\/button>/s);
    });
  });
});
