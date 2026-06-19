import { describe, expect, it } from "vitest";
import { platformCommandSeedDefinitions, platformPanelSeedDefinitions } from "../../registrySeeds";
import { platformFeatureAccessCoverageDefinitions } from "../featureAccessCoverageDefinitions";
import { createPlatformSurfaceAuditReport } from "../platformSurfaceAudit";

describe("platform surface audit", () => {
  it("reports feature and regression counts", () => {
    const report = createPlatformSurfaceAuditReport();

    expect(report.featureCount).toBeGreaterThan(0);
    expect(report.requiredRegressionFeatureCount).toBeGreaterThan(0);
  });

  it("matches command, panel, and coverage seed counts", () => {
    const report = createPlatformSurfaceAuditReport();

    expect(report.commandSeedCount).toBe(platformCommandSeedDefinitions.length);
    expect(report.panelSeedCount).toBe(platformPanelSeedDefinitions.length);
    expect(report.coverageCount).toBe(platformFeatureAccessCoverageDefinitions.length);
  });

  it("returns valid coverage with no errors", () => {
    expect(createPlatformSurfaceAuditReport().coverageValidation.errors).toEqual([]);
  });

  it("proves command and panel seed registries can be built", () => {
    const report = createPlatformSurfaceAuditReport();

    expect(report.commandSeedCount).toBeGreaterThan(0);
    expect(report.panelSeedCount).toBeGreaterThan(0);
  });
});

