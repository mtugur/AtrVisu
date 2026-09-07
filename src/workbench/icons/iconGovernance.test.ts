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

  it("keeps maintained disclosure controls free of standalone pseudo-icon glyphs", () => {
    const pseudoDisclosure = /(?:>\s*(?:&lt;|&gt;|\+|-|−|‹|›)\s*<|\{`\\u203(?:9|A)`\}|\?\s*["'](?:\+|-|−|‹|›)["']\s*:\s*["'](?:\+|-|−|‹|›)["'])/s;
    [
      "../../components/AssemblyTreePanel.tsx",
      "../../components/ViewpointsPanel.tsx",
      "../../components/assetBrowser/AssetBrowserHierarchy.tsx",
      "../../components/PanelSection.tsx",
      "../../components/workbench/PreferenceDisclosureRow.tsx",
      "../../components/workbench/WorkspacePreferencesControl.tsx",
      "../../components/LibraryManager.tsx",
      "../../components/workbench/WorkbenchContextContribution.tsx"
    ].forEach((path) => {
      const source = readFileSync(new URL(path, import.meta.url), "utf8");
      expect(source).not.toMatch(pseudoDisclosure);
    });
  });

  it("keeps Library clear and reset controls on the canonical compact action primitive", () => {
    const source = readFileSync(new URL("../../components/MachineLibrary.tsx", import.meta.url), "utf8");

    expect(source.match(/iconId="clear"/g)).toHaveLength(2);
    expect(source).toContain('label="Clear filters"');
    expect(source).toContain('label="Clear search and filters"');
    expect(source).not.toMatch(/>\s*Clear (?:filters|search and filters)\s*</);
  });
});
