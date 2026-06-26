import { describe, expect, it } from "vitest";
import { currentAppShellBoundaryZones } from "../../appShellBoundary";
import { platformFeatureAccessMatrix } from "../../featureAccess";
import { platformFeatureAccessCoverageDefinitions } from "../../integration";
import { platformCommandSeedDefinitions, platformPanelSeedDefinitions } from "../../registrySeeds";
import { currentPlatformSurfaceInventory } from "../../surfaceInventory";
import {
  createPlatformReadinessReport,
  getPlatformReadinessStatus
} from "../platformReadinessReport";

describe("platform readiness report", () => {
  it("returns ready status for current valid platform data", () => {
    const report = createPlatformReadinessReport();

    expect(report.status).toBe("ready");
    expect(getPlatformReadinessStatus()).toBe("ready");
  });

  it("contains every readiness check and passes them", () => {
    const report = createPlatformReadinessReport();

    expect(report.checks.map((check) => check.id)).toEqual([
      "registry-seeds",
      "feature-access-integration",
      "surface-inventory",
      "surface-coverage",
      "app-shell-boundary"
    ]);
    expect(report.checks.every((check) => check.status === "pass")).toBe(true);
  });

  it("returns aggregate issue counts", () => {
    const report = createPlatformReadinessReport();

    expect(typeof report.issueCount).toBe("number");
    expect(report.errorCount).toBe(0);
    expect(typeof report.warningCount).toBe("number");
  });

  it("reports non-empty registry seed summaries", () => {
    const report = createPlatformReadinessReport();

    expect(report.registrySeedSummary.commandSeedCount).toBeGreaterThan(0);
    expect(report.registrySeedSummary.panelSeedCount).toBeGreaterThan(0);
  });

  it("reports complete surface coverage", () => {
    const summary = createPlatformReadinessReport().surfaceCoverageSummary;

    expect(summary.uncoveredCommandSeedCount).toBe(0);
    expect(summary.uncoveredPanelSeedCount).toBe(0);
    expect(summary.uncoveredRequiredFeatureCount).toBe(0);
  });

  it("includes a passing app shell boundary check", () => {
    const report = createPlatformReadinessReport();
    const check = report.checks.find((item) => item.id === "app-shell-boundary");

    expect(check?.status).toBe("pass");
    expect(report.status).toBe("ready");
    expect(report.errorCount).toBe(0);
    expect(typeof report.warningCount).toBe("number");
  });

  it("returns app shell boundary summary", () => {
    const summary = createPlatformReadinessReport().appShellBoundarySummary;

    expect(summary.zoneCount).toBeGreaterThan(0);
    expect(typeof summary.warningCount).toBe("number");
  });

  it("does not mutate platform source arrays", () => {
    const lengths = {
      commands: platformCommandSeedDefinitions.length,
      panels: platformPanelSeedDefinitions.length,
      features: platformFeatureAccessMatrix.length,
      coverage: platformFeatureAccessCoverageDefinitions.length,
      surfaces: currentPlatformSurfaceInventory.length,
      appShellBoundaryZones: currentAppShellBoundaryZones.length
    };

    createPlatformReadinessReport();

    expect(platformCommandSeedDefinitions).toHaveLength(lengths.commands);
    expect(platformPanelSeedDefinitions).toHaveLength(lengths.panels);
    expect(platformFeatureAccessMatrix).toHaveLength(lengths.features);
    expect(platformFeatureAccessCoverageDefinitions).toHaveLength(lengths.coverage);
    expect(currentPlatformSurfaceInventory).toHaveLength(lengths.surfaces);
    expect(currentAppShellBoundaryZones).toHaveLength(lengths.appShellBoundaryZones);
  });
});
