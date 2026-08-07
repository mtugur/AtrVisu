// Node is available to Vitest; the app intentionally does not depend on @types/node.
// @ts-expect-error The test-only built-in import is outside the browser type surface.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8");

describe("P1-D1 UI preference architecture", () => {
  it("composes one provider above the live design-system boundary without keying App", () => {
    const main = read("../../main.tsx");
    expect(main).toContain("<UiPreferencesProvider>");
    expect(main).toContain("<UiPreferencesDesignSystemBoundary>");
    expect(main).toContain("<App />");
    expect(main).not.toMatch(/<App[^>]+key=/);
  });

  it("keeps migrated legacy persistence out of App and controlled PanelSection", () => {
    const app = read("../../App.tsx");
    const panelSection = read("../../components/PanelSection.tsx");
    expect(app).not.toContain("atrvisu.rightPanelWidth.v1");
    expect(app).not.toContain("atrvisu.rightPanelCollapsed.v1");
    expect(app).not.toContain("atrvisu.panelSection.");
    expect(app).toContain("useUiPreferencesStore");
    expect(panelSection).toContain("expanded !== undefined || !storageKey");
  });

  it("keeps the runtime boundary free of domain, Babylon, project-storage, and workspace application imports", () => {
    const runtime = read("./uiPreferencesRuntimeStore.ts");
    const provider = read("./UiPreferencesProvider.tsx");
    const combined = `${runtime}\n${provider}`;
    expect(combined).not.toMatch(/types\/(machine|project|civil|annotations|groups|layers)/);
    expect(combined).not.toContain("Babylon");
    expect(combined).not.toContain("projectStorage");
    expect(combined).not.toContain("WorkspaceRegistry");
  });
});
