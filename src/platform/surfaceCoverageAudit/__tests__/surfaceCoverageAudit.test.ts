import { describe, expect, it } from "vitest";
import { platformFeatureAccessMatrix } from "../../featureAccess";
import { platformFeatureAccessCoverageDefinitions } from "../../integration";
import { platformCommandSeedDefinitions, platformPanelSeedDefinitions } from "../../registrySeeds";
import { currentPlatformSurfaceInventory } from "../../surfaceInventory";
import {
  createCommandSurfaceCoverage,
  createFeatureSurfaceCoverage,
  createPanelSurfaceCoverage,
  createSurfaceCoverageAuditReport,
  getSurfaceIdsByCommandId,
  getSurfaceIdsByFeatureId,
  getSurfaceIdsByPanelId,
  getUncoveredCommandSeedIds,
  getUncoveredPanelSeedIds,
  getUncoveredRequiredFeatureIds
} from "../surfaceCoverageAudit";

describe("surface coverage audit", () => {
  it("creates coverage for every command seed", () => {
    expect(createCommandSurfaceCoverage().map((coverage) => coverage.commandId)).toEqual(
      platformCommandSeedDefinitions.map((command) => command.id)
    );
  });

  it("creates coverage for every panel seed", () => {
    expect(createPanelSurfaceCoverage().map((coverage) => coverage.panelId)).toEqual(
      platformPanelSeedDefinitions.map((panel) => panel.id)
    );
  });

  it("includes every required regression feature", () => {
    const requiredFeatureIds = platformFeatureAccessMatrix
      .filter((feature) => feature.requiredForRegression)
      .map((feature) => feature.featureId);
    const coveredFeatureIds = new Set(createFeatureSurfaceCoverage().map((coverage) => coverage.featureId));

    requiredFeatureIds.forEach((featureId) => expect(coveredFeatureIds.has(featureId)).toBe(true));
  });

  it("finds surfaces by command, panel, and feature ids", () => {
    expect(getSurfaceIdsByCommandId("project.exportJson")).toContain("surface.projectExportJson");
    expect(getSurfaceIdsByPanelId("panel.machineLibrary")).toContain("surface.machineLibrary");
    expect(getSurfaceIdsByFeatureId("library.manager")).toContain("surface.libraryManager");
  });

  it("covers the multi-selection alignment panel surface", () => {
    expect(getSurfaceIdsByFeatureId("selection.multiSelect")).toContain("surface.multiSelectionAlignment");
    expect(getSurfaceIdsByFeatureId("alignment.alignSelection")).toContain("surface.multiSelectionAlignment");
    expect(getSurfaceIdsByCommandId("alignment.alignSelection")).toContain("surface.multiSelectionAlignment");
    expect(getSurfaceIdsByPanelId("panel.inspector")).toContain("surface.multiSelectionAlignment");
  });

  it("covers the previously missing command and panel links", () => {
    expect(getSurfaceIdsByCommandId("view.fitView").length).toBeGreaterThan(0);
    expect(getSurfaceIdsByCommandId("diagnostics.noRedConsole").length).toBeGreaterThan(0);
    expect(getSurfaceIdsByPanelId("panel.layoutExplorer").length).toBeGreaterThan(0);
    expect(getSurfaceIdsByPanelId("panel.diagnostics").length).toBeGreaterThan(0);
  });

  it("has no uncovered seeds or required features for current valid data", () => {
    expect(getUncoveredCommandSeedIds()).toEqual([]);
    expect(getUncoveredPanelSeedIds()).toEqual([]);
    expect(getUncoveredRequiredFeatureIds()).toEqual([]);
  });

  it("creates no error issues for current valid data", () => {
    expect(createSurfaceCoverageAuditReport().issues.filter((issue) => issue.severity === "error")).toEqual([]);
  });

  it("does not mutate source arrays", () => {
    const lengths = {
      commands: platformCommandSeedDefinitions.length,
      panels: platformPanelSeedDefinitions.length,
      features: platformFeatureAccessMatrix.length,
      integrationCoverage: platformFeatureAccessCoverageDefinitions.length,
      surfaces: currentPlatformSurfaceInventory.length
    };

    createCommandSurfaceCoverage();
    createPanelSurfaceCoverage();
    createFeatureSurfaceCoverage();
    createSurfaceCoverageAuditReport();

    expect(platformCommandSeedDefinitions).toHaveLength(lengths.commands);
    expect(platformPanelSeedDefinitions).toHaveLength(lengths.panels);
    expect(platformFeatureAccessMatrix).toHaveLength(lengths.features);
    expect(platformFeatureAccessCoverageDefinitions).toHaveLength(lengths.integrationCoverage);
    expect(currentPlatformSurfaceInventory).toHaveLength(lengths.surfaces);
  });
});
