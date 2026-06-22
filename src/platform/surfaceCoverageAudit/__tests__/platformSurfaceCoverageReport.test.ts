import { describe, expect, it } from "vitest";
import { platformFeatureAccessMatrix } from "../../featureAccess";
import { platformCommandSeedDefinitions, platformPanelSeedDefinitions } from "../../registrySeeds";
import { createPlatformSurfaceCoverageReport } from "../platformSurfaceCoverageReport";

describe("platform surface coverage report", () => {
  it("matches platform seed and required feature counts", () => {
    const report = createPlatformSurfaceCoverageReport();
    const requiredFeatureCount = platformFeatureAccessMatrix.filter(
      (feature) => feature.requiredForRegression
    ).length;

    expect(report.commandSeedCount).toBe(platformCommandSeedDefinitions.length);
    expect(report.panelSeedCount).toBe(platformPanelSeedDefinitions.length);
    expect(report.requiredFeatureCount).toBe(requiredFeatureCount);
  });

  it("reports complete coverage for current valid data", () => {
    const report = createPlatformSurfaceCoverageReport();

    expect(report.uncoveredCommandSeedCount).toBe(0);
    expect(report.uncoveredPanelSeedCount).toBe(0);
    expect(report.uncoveredRequiredFeatureCount).toBe(0);
    expect(report.errorCount).toBe(0);
  });

  it("includes the audit issue array", () => {
    expect(Array.isArray(createPlatformSurfaceCoverageReport().audit.issues)).toBe(true);
  });
});
