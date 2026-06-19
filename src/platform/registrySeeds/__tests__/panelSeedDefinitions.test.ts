import { describe, expect, it } from "vitest";
import type { PanelDefinition } from "../../contracts";
import { createPanelRegistry } from "../../registries";
import { platformPanelSeedDefinitions } from "../panelSeedDefinitions";

const panelSeeds: readonly PanelDefinition[] = platformPanelSeedDefinitions;

const criticalPanelIds = [
  "panel.machineLibrary",
  "panel.layoutExplorer",
  "panel.inspector",
  "panel.annotations",
  "panel.layers",
  "panel.groups",
  "panel.projectManager",
  "panel.libraryManager",
  "panel.taxonomyManager",
  "panel.performanceBenchmark"
] as const;

describe("platform panel seed definitions", () => {
  it("is not empty", () => {
    expect(panelSeeds.length).toBeGreaterThan(0);
  });

  it("uses unique panel ids", () => {
    const panelIds = panelSeeds.map((panel) => panel.id);

    expect(new Set(panelIds).size).toBe(panelIds.length);
  });

  it("registers every panel seed", () => {
    const registry = createPanelRegistry();

    panelSeeds.forEach((panel) => registry.register(panel));

    expect(registry.list()).toHaveLength(panelSeeds.length);
  });

  it("has non-empty titles", () => {
    expect(panelSeeds.every((panel) => panel.title.trim())).toBe(true);
  });

  it("uses right dock for inspector role only", () => {
    expect(panelSeeds.filter((panel) => panel.role === "inspector").every((panel) => panel.dock === "right")).toBe(true);
  });

  it("keeps manager, diagnostics, and tool roles separate from inspector", () => {
    const nonInspectorRoles = new Set(["manager", "diagnostics", "tool"]);
    expect(panelSeeds.filter((panel) => nonInspectorRoles.has(panel.role)).every((panel) => panel.role !== "inspector")).toBe(true);
  });

  it("contains critical panel ids", () => {
    const panelIds = new Set(panelSeeds.map((panel) => panel.id));

    criticalPanelIds.forEach((panelId) => {
      expect(panelIds.has(panelId)).toBe(true);
    });
  });
});

