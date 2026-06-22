import { describe, expect, it } from "vitest";
import { createPlatformReadinessReportFromParts } from "../platformReadinessReport";
import type { PlatformReadinessReport } from "../platformReadinessTypes";

type ReadinessParts = Pick<
  PlatformReadinessReport,
  | "registrySeedSummary"
  | "featureAccessIntegrationSummary"
  | "surfaceInventorySummary"
  | "surfaceCoverageSummary"
>;

const passingParts = (): ReadinessParts => ({
  registrySeedSummary: {
    commandSeedCount: 1,
    panelSeedCount: 1
  },
  featureAccessIntegrationSummary: {
    featureCount: 1,
    requiredRegressionFeatureCount: 1,
    coverageCount: 1,
    issueCount: 0,
    errorCount: 0,
    warningCount: 0
  },
  surfaceInventorySummary: {
    surfaceCount: 1,
    panelLinkedSurfaceCount: 1,
    commandLinkedSurfaceCount: 1,
    featureLinkedSurfaceCount: 1,
    unlinkedSurfaceCount: 0,
    issueCount: 0,
    errorCount: 0,
    warningCount: 0
  },
  surfaceCoverageSummary: {
    commandSeedCount: 1,
    coveredCommandSeedCount: 1,
    uncoveredCommandSeedCount: 0,
    panelSeedCount: 1,
    coveredPanelSeedCount: 1,
    uncoveredPanelSeedCount: 0,
    requiredFeatureCount: 1,
    coveredRequiredFeatureCount: 1,
    uncoveredRequiredFeatureCount: 0,
    issueCount: 0,
    errorCount: 0,
    warningCount: 0
  }
});

describe("platform readiness report failures", () => {
  it("is not ready when registry seeds fail", () => {
    const parts = passingParts();
    const report = createPlatformReadinessReportFromParts({
      ...parts,
      registrySeedSummary: { ...parts.registrySeedSummary, commandSeedCount: 0 }
    });

    expect(report.status).toBe("not-ready");
    expect(report.checks.find((check) => check.id === "registry-seeds")?.status).toBe("fail");
  });

  it("is not ready when feature access integration fails", () => {
    const parts = passingParts();
    const report = createPlatformReadinessReportFromParts({
      ...parts,
      featureAccessIntegrationSummary: {
        ...parts.featureAccessIntegrationSummary,
        issueCount: 1,
        errorCount: 1
      }
    });

    expect(report.status).toBe("not-ready");
    expect(report.checks.find((check) => check.id === "feature-access-integration")?.status).toBe("fail");
  });

  it("is not ready when surface inventory fails", () => {
    const parts = passingParts();
    const report = createPlatformReadinessReportFromParts({
      ...parts,
      surfaceInventorySummary: {
        ...parts.surfaceInventorySummary,
        issueCount: 1,
        errorCount: 1
      }
    });

    expect(report.status).toBe("not-ready");
    expect(report.checks.find((check) => check.id === "surface-inventory")?.status).toBe("fail");
  });

  it("is not ready when surface coverage fails", () => {
    const parts = passingParts();
    const report = createPlatformReadinessReportFromParts({
      ...parts,
      surfaceCoverageSummary: {
        ...parts.surfaceCoverageSummary,
        coveredCommandSeedCount: 0,
        uncoveredCommandSeedCount: 1
      }
    });

    expect(report.status).toBe("not-ready");
    expect(report.errorCount).toBe(1);
    expect(report.checks.find((check) => check.id === "surface-coverage")?.status).toBe("fail");
  });

  it("sums errors across multiple failing checks", () => {
    const parts = passingParts();
    const report = createPlatformReadinessReportFromParts({
      ...parts,
      registrySeedSummary: { ...parts.registrySeedSummary, panelSeedCount: 0 },
      featureAccessIntegrationSummary: {
        ...parts.featureAccessIntegrationSummary,
        issueCount: 1,
        errorCount: 1
      },
      surfaceInventorySummary: {
        ...parts.surfaceInventorySummary,
        issueCount: 2,
        errorCount: 2
      }
    });

    expect(report.errorCount).toBe(4);
  });

  it("is ready when every check passes", () => {
    const report = createPlatformReadinessReportFromParts(passingParts());

    expect(report.status).toBe("ready");
    expect(report.checks.every((check) => check.status === "pass")).toBe(true);
  });
});
