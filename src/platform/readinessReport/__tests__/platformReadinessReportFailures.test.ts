import { describe, expect, it } from "vitest";
import {
  createPlatformReadinessReportFromDependencies,
  createPlatformReadinessReportFromParts
} from "../platformReadinessReport";
import type { PlatformReadinessDependencies } from "../platformReadinessReport";
import type { PlatformReadinessReport } from "../platformReadinessTypes";

type ReadinessParts = Pick<
  PlatformReadinessReport,
  | "registrySeedSummary"
  | "featureAccessIntegrationSummary"
  | "surfaceInventorySummary"
  | "surfaceCoverageSummary"
  | "appShellBoundarySummary"
  | "sceneViewportBoundarySummary"
  | "babylonSceneBoundarySummary"
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
  },
  appShellBoundarySummary: {
    zoneCount: 1,
    highRiskZoneCount: 0,
    mediumRiskZoneCount: 1,
    lowRiskZoneCount: 0,
    issueCount: 0,
    errorCount: 0,
    warningCount: 0
  },
  sceneViewportBoundarySummary: {
    status: "ready",
    boundaryId: "scene-viewport",
    displayName: "Scene Viewport",
    ownerLayer: "app-shell",
    runtimeStatus: "active",
    appShellZoneId: "scene-viewport",
    sourceFileCount: 1,
    responsibilityCount: 1,
    upstreamInputCount: 1,
    downstreamEffectCount: 1,
    boundaryRiskCount: 1,
    extractionNoteCount: 1,
    issueCount: 0,
    errorCount: 0,
    warningCount: 0
  },
  babylonSceneBoundarySummary: {
    status: "ready",
    boundaryId: "babylon-scene",
    displayName: "Babylon Scene",
    ownerLayer: "scene-viewport",
    runtimeStatus: "active",
    sourceFileCount: 1,
    parentBoundaryCount: 1,
    responsibilityCount: 1,
    upstreamInputCount: 1,
    downstreamEffectCount: 1,
    boundaryRiskCount: 1,
    extractionNoteCount: 1,
    issueCount: 0,
    errorCount: 0,
    warningCount: 0
  }
});

const passingDependencies = (): PlatformReadinessDependencies => {
  const parts = passingParts();

  return {
    createRegistrySeedSummary: () => ({ ...parts.registrySeedSummary }),
    createFeatureAccessIntegrationSummary: () => ({ ...parts.featureAccessIntegrationSummary }),
    createSurfaceInventorySummary: () => ({ ...parts.surfaceInventorySummary }),
    createSurfaceCoverageSummary: () => ({ ...parts.surfaceCoverageSummary }),
    createAppShellBoundarySummary: () => ({ ...parts.appShellBoundarySummary }),
    createSceneViewportBoundarySummary: () => ({ ...parts.sceneViewportBoundarySummary }),
    createBabylonSceneBoundarySummary: () => ({ ...parts.babylonSceneBoundarySummary })
  };
};

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

  it("is not ready when app shell boundary fails", () => {
    const parts = passingParts();
    const report = createPlatformReadinessReportFromParts({
      ...parts,
      appShellBoundarySummary: {
        ...parts.appShellBoundarySummary,
        issueCount: 1,
        errorCount: 1
      }
    });

    expect(report.status).toBe("not-ready");
    expect(report.checks.find((check) => check.id === "app-shell-boundary")?.status).toBe("fail");
  });

  it("is not ready when scene viewport boundary fails", () => {
    const parts = passingParts();
    const report = createPlatformReadinessReportFromParts({
      ...parts,
      sceneViewportBoundarySummary: {
        ...parts.sceneViewportBoundarySummary,
        status: "not-ready",
        issueCount: 1,
        errorCount: 1
      }
    });

    expect(report.status).toBe("not-ready");
    expect(report.checks.find((check) => check.id === "scene-viewport-boundary")?.status).toBe("fail");
  });

  it("is not ready when Babylon scene boundary fails", () => {
    const parts = passingParts();
    const report = createPlatformReadinessReportFromParts({
      ...parts,
      babylonSceneBoundarySummary: {
        ...parts.babylonSceneBoundarySummary,
        status: "not-ready",
        issueCount: 1,
        errorCount: 1
      }
    });

    expect(report.status).toBe("not-ready");
    expect(report.checks.find((check) => check.id === "babylon-scene-boundary")?.status).toBe("fail");
  });

  it("keeps app shell boundary warnings passing but counted", () => {
    const parts = passingParts();
    const report = createPlatformReadinessReportFromParts({
      ...parts,
      appShellBoundarySummary: {
        ...parts.appShellBoundarySummary,
        issueCount: 1,
        warningCount: 1
      }
    });
    const check = report.checks.find((item) => item.id === "app-shell-boundary");

    expect(report.status).toBe("ready");
    expect(check?.status).toBe("pass");
    expect(report.warningCount).toBe(1);
    expect(report.issueCount).toBe(1);
  });

  it("returns not-ready when registry seed validation throws", () => {
    const dependencies = passingDependencies();
    const createReport = () => createPlatformReadinessReportFromDependencies({
      ...dependencies,
      createRegistrySeedSummary: () => {
        throw new Error("Duplicate command id.");
      }
    });

    expect(createReport).not.toThrow();

    const report = createReport();
    const registryCheck = report.checks.find((check) => check.id === "registry-seeds");

    expect(report.status).toBe("not-ready");
    expect(report.errorCount).toBeGreaterThan(0);
    expect(report.issueCount).toBeGreaterThan(0);
    expect(registryCheck?.status).toBe("fail");
    expect(registryCheck?.summary).toContain("Duplicate command id.");
  });

  it("returns a report when an audit dependency throws", () => {
    const dependencies = passingDependencies();
    const createReport = () => createPlatformReadinessReportFromDependencies({
      ...dependencies,
      createSurfaceInventorySummary: () => {
        throw "Inventory unavailable";
      }
    });

    expect(createReport).not.toThrow();

    const report = createReport();
    const inventoryCheck = report.checks.find((check) => check.id === "surface-inventory");

    expect(report.status).toBe("not-ready");
    expect(inventoryCheck?.status).toBe("fail");
    expect(inventoryCheck?.summary).toContain("Inventory unavailable");
  });

  it("returns a report when app shell boundary dependency throws", () => {
    const dependencies = passingDependencies();
    const createReport = () => createPlatformReadinessReportFromDependencies({
      ...dependencies,
      createAppShellBoundarySummary: () => {
        throw new Error("Boundary unavailable.");
      }
    });

    expect(createReport).not.toThrow();

    const report = createReport();
    const check = report.checks.find((item) => item.id === "app-shell-boundary");

    expect(report.status).toBe("not-ready");
    expect(report.errorCount).toBeGreaterThan(0);
    expect(report.issueCount).toBeGreaterThan(0);
    expect(check?.status).toBe("fail");
    expect(check?.summary).toContain("Boundary unavailable.");
  });

  it("returns a report when scene viewport boundary dependency throws", () => {
    const dependencies = passingDependencies();
    const createReport = () => createPlatformReadinessReportFromDependencies({
      ...dependencies,
      createSceneViewportBoundarySummary: () => {
        throw new Error("Scene viewport boundary unavailable.");
      }
    });

    expect(createReport).not.toThrow();

    const report = createReport();
    const check = report.checks.find((item) => item.id === "scene-viewport-boundary");

    expect(report.status).toBe("not-ready");
    expect(report.errorCount).toBeGreaterThan(0);
    expect(report.issueCount).toBeGreaterThan(0);
    expect(check?.status).toBe("fail");
    expect(check?.summary).toContain("Scene viewport boundary unavailable.");
  });

  it("returns a report when Babylon scene boundary dependency throws", () => {
    const dependencies = passingDependencies();
    const createReport = () => createPlatformReadinessReportFromDependencies({
      ...dependencies,
      createBabylonSceneBoundarySummary: () => {
        throw new Error("Babylon scene boundary unavailable.");
      }
    });

    expect(createReport).not.toThrow();

    const report = createReport();
    const check = report.checks.find((item) => item.id === "babylon-scene-boundary");

    expect(report.status).toBe("not-ready");
    expect(report.errorCount).toBeGreaterThan(0);
    expect(report.issueCount).toBeGreaterThan(0);
    expect(check?.status).toBe("fail");
    expect(check?.summary).toContain("Babylon scene boundary unavailable.");
  });
});
