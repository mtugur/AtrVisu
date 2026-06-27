import { createPlatformAppShellBoundaryReport } from "../appShellBoundary";
import { createPlatformBabylonSceneBoundaryReport } from "../babylonSceneBoundary";
import { platformFeatureAccessMatrix } from "../featureAccess";
import {
  createFeatureAccessIntegrationReport,
  platformFeatureAccessCoverageDefinitions
} from "../integration";
import {
  createSeededPlatformCommandRegistry,
  createSeededPlatformPanelRegistry
} from "../registrySeeds";
import { createPlatformSceneViewportBoundaryReport } from "../sceneViewportBoundary";
import { createPlatformSurfaceCoverageReport } from "../surfaceCoverageAudit";
import { createPlatformSurfaceInventoryReport } from "../surfaceInventory";
import type {
  PlatformReadinessCheck,
  PlatformReadinessReport,
  PlatformReadinessStatus
} from "./platformReadinessTypes";

type PlatformReadinessReportParts = Pick<
  PlatformReadinessReport,
  | "registrySeedSummary"
  | "featureAccessIntegrationSummary"
  | "surfaceInventorySummary"
  | "surfaceCoverageSummary"
  | "appShellBoundarySummary"
  | "sceneViewportBoundarySummary"
  | "babylonSceneBoundarySummary"
>;

type PlatformReadinessCheckId =
  | "registry-seeds"
  | "feature-access-integration"
  | "surface-inventory"
  | "surface-coverage"
  | "app-shell-boundary"
  | "scene-viewport-boundary"
  | "babylon-scene-boundary";

type PlatformReadinessFailureSummaries = Partial<Record<PlatformReadinessCheckId, string>>;

export type PlatformReadinessDependencies = {
  createRegistrySeedSummary: () => PlatformReadinessReport["registrySeedSummary"];
  createFeatureAccessIntegrationSummary: () => PlatformReadinessReport["featureAccessIntegrationSummary"];
  createSurfaceInventorySummary: () => PlatformReadinessReport["surfaceInventorySummary"];
  createSurfaceCoverageSummary: () => PlatformReadinessReport["surfaceCoverageSummary"];
  createAppShellBoundarySummary: () => PlatformReadinessReport["appShellBoundarySummary"];
  createSceneViewportBoundarySummary: () => PlatformReadinessReport["sceneViewportBoundarySummary"];
  createBabylonSceneBoundarySummary: () => PlatformReadinessReport["babylonSceneBoundarySummary"];
};

type SafeSummaryResult<T> = {
  summary: T;
  failureSummary?: string;
};

const normalizeIssueCount = (issueCount: number, errorCount: number, warningCount: number) =>
  Math.max(issueCount, errorCount + warningCount);

const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message.trim();
  }
  if (typeof error === "string" && error.trim().length > 0) {
    return error.trim();
  }
  return "Unknown error.";
};

const safelyCreateSummary = <T>(
  factory: () => T,
  fallback: T,
  label: string
): SafeSummaryResult<T> => {
  try {
    return { summary: factory() };
  } catch (error: unknown) {
    return {
      summary: fallback,
      failureSummary: `${label} failed: ${getErrorMessage(error)}`
    };
  }
};

const createCheck = (
  id: string,
  label: string,
  passes: boolean,
  issueCount: number,
  errorCount: number,
  warningCount: number,
  passSummary: string,
  failSummary: string
): PlatformReadinessCheck => ({
  id,
  label,
  status: passes ? "pass" : "fail",
  issueCount,
  errorCount,
  warningCount,
  summary: passes ? passSummary : failSummary
});

export const createPlatformReadinessReportFromParts = (
  parts: PlatformReadinessReportParts,
  failureSummaries: PlatformReadinessFailureSummaries = {}
): PlatformReadinessReport => {
  const registryErrorCount =
    Number(parts.registrySeedSummary.commandSeedCount === 0) +
    Number(parts.registrySeedSummary.panelSeedCount === 0);
  const integrationErrorCount = parts.featureAccessIntegrationSummary.errorCount;
  const integrationWarningCount = parts.featureAccessIntegrationSummary.warningCount;
  const integrationIssueCount = normalizeIssueCount(
    parts.featureAccessIntegrationSummary.issueCount,
    integrationErrorCount,
    integrationWarningCount
  );
  const inventoryErrorCount = parts.surfaceInventorySummary.errorCount;
  const inventoryWarningCount = parts.surfaceInventorySummary.warningCount;
  const inventoryIssueCount = normalizeIssueCount(
    parts.surfaceInventorySummary.issueCount,
    inventoryErrorCount,
    inventoryWarningCount
  );
  const uncoveredCoverageCount =
    parts.surfaceCoverageSummary.uncoveredCommandSeedCount +
    parts.surfaceCoverageSummary.uncoveredPanelSeedCount +
    parts.surfaceCoverageSummary.uncoveredRequiredFeatureCount;
  const coverageErrorCount = Math.max(
    parts.surfaceCoverageSummary.errorCount,
    uncoveredCoverageCount
  );
  const coverageWarningCount = parts.surfaceCoverageSummary.warningCount;
  const coverageIssueCount = normalizeIssueCount(
    parts.surfaceCoverageSummary.issueCount,
    coverageErrorCount,
    coverageWarningCount
  );
  const appShellBoundaryErrorCount = parts.appShellBoundarySummary.errorCount;
  const appShellBoundaryWarningCount = parts.appShellBoundarySummary.warningCount;
  const appShellBoundaryIssueCount = normalizeIssueCount(
    parts.appShellBoundarySummary.issueCount,
    appShellBoundaryErrorCount,
    appShellBoundaryWarningCount
  );
  const sceneViewportBoundaryErrorCount = parts.sceneViewportBoundarySummary.errorCount;
  const sceneViewportBoundaryWarningCount = parts.sceneViewportBoundarySummary.warningCount;
  const sceneViewportBoundaryIssueCount = normalizeIssueCount(
    parts.sceneViewportBoundarySummary.issueCount,
    sceneViewportBoundaryErrorCount,
    sceneViewportBoundaryWarningCount
  );
  const babylonSceneBoundaryErrorCount = parts.babylonSceneBoundarySummary.errorCount;
  const babylonSceneBoundaryWarningCount = parts.babylonSceneBoundarySummary.warningCount;
  const babylonSceneBoundaryIssueCount = normalizeIssueCount(
    parts.babylonSceneBoundarySummary.issueCount,
    babylonSceneBoundaryErrorCount,
    babylonSceneBoundaryWarningCount
  );
  const registryPasses = registryErrorCount === 0;
  const integrationPasses = integrationErrorCount === 0;
  const inventoryPasses = inventoryErrorCount === 0;
  const coveragePasses = coverageErrorCount === 0 && uncoveredCoverageCount === 0;
  const appShellBoundaryPasses = appShellBoundaryErrorCount === 0;
  const sceneViewportBoundaryPasses =
    sceneViewportBoundaryErrorCount === 0 && parts.sceneViewportBoundarySummary.status === "ready";
  const babylonSceneBoundaryPasses =
    babylonSceneBoundaryErrorCount === 0 && parts.babylonSceneBoundarySummary.status === "ready";
  const checks: readonly PlatformReadinessCheck[] = [
    createCheck(
      "registry-seeds",
      "Registry Seeds",
      registryPasses,
      registryErrorCount,
      registryErrorCount,
      0,
      "Command and panel registry seeds are available.",
      failureSummaries["registry-seeds"] ?? "Command or panel registry seeds are missing."
    ),
    createCheck(
      "feature-access-integration",
      "Feature Access Integration",
      integrationPasses,
      integrationIssueCount,
      integrationErrorCount,
      integrationWarningCount,
      "Feature access integration has no errors.",
      failureSummaries["feature-access-integration"] ?? "Feature access integration contains errors."
    ),
    createCheck(
      "surface-inventory",
      "Surface Inventory",
      inventoryPasses,
      inventoryIssueCount,
      inventoryErrorCount,
      inventoryWarningCount,
      "Surface inventory has no errors.",
      failureSummaries["surface-inventory"] ?? "Surface inventory contains errors."
    ),
    createCheck(
      "surface-coverage",
      "Surface Coverage",
      coveragePasses,
      coverageIssueCount,
      coverageErrorCount,
      coverageWarningCount,
      "All command, panel, and required feature surfaces are covered.",
      failureSummaries["surface-coverage"] ?? "Surface coverage contains errors or uncovered platform entries."
    ),
    createCheck(
      "app-shell-boundary",
      "App shell boundary",
      appShellBoundaryPasses,
      appShellBoundaryIssueCount,
      appShellBoundaryErrorCount,
      appShellBoundaryWarningCount,
      "App shell boundary inventory has no errors.",
      failureSummaries["app-shell-boundary"] ?? "App shell boundary inventory contains errors."
    ),
    createCheck(
      "scene-viewport-boundary",
      "Scene viewport boundary",
      sceneViewportBoundaryPasses,
      sceneViewportBoundaryIssueCount,
      sceneViewportBoundaryErrorCount,
      sceneViewportBoundaryWarningCount,
      "Scene viewport boundary inventory is ready.",
      failureSummaries["scene-viewport-boundary"] ?? "Scene viewport boundary inventory is not ready."
    ),
    createCheck(
      "babylon-scene-boundary",
      "Babylon scene boundary",
      babylonSceneBoundaryPasses,
      babylonSceneBoundaryIssueCount,
      babylonSceneBoundaryErrorCount,
      babylonSceneBoundaryWarningCount,
      "Babylon scene boundary inventory is ready.",
      failureSummaries["babylon-scene-boundary"] ?? "Babylon scene boundary inventory is not ready."
    )
  ];
  const errorCount = checks.reduce((total, check) => total + check.errorCount, 0);
  const warningCount = checks.reduce((total, check) => total + check.warningCount, 0);
  const issueCount = checks.reduce((total, check) => total + check.issueCount, 0);

  return {
    status: checks.every((check) => check.status === "pass") ? "ready" : "not-ready",
    checks,
    issueCount,
    errorCount,
    warningCount,
    registrySeedSummary: { ...parts.registrySeedSummary },
    featureAccessIntegrationSummary: {
      ...parts.featureAccessIntegrationSummary,
      issueCount: integrationIssueCount
    },
    surfaceInventorySummary: {
      ...parts.surfaceInventorySummary,
      issueCount: inventoryIssueCount
    },
    surfaceCoverageSummary: {
      ...parts.surfaceCoverageSummary,
      issueCount: coverageIssueCount,
      errorCount: coverageErrorCount
    },
    appShellBoundarySummary: {
      ...parts.appShellBoundarySummary,
      issueCount: appShellBoundaryIssueCount
    },
    sceneViewportBoundarySummary: {
      ...parts.sceneViewportBoundarySummary,
      issueCount: sceneViewportBoundaryIssueCount
    },
    babylonSceneBoundarySummary: {
      ...parts.babylonSceneBoundarySummary,
      issueCount: babylonSceneBoundaryIssueCount
    }
  };
};

const platformReadinessDependencies: PlatformReadinessDependencies = {
  createRegistrySeedSummary: () => {
    const commandRegistry = createSeededPlatformCommandRegistry();
    const panelRegistry = createSeededPlatformPanelRegistry();

    return {
      commandSeedCount: commandRegistry.list().length,
      panelSeedCount: panelRegistry.list().length
    };
  },
  createFeatureAccessIntegrationSummary: () => {
    const integrationAudit = createFeatureAccessIntegrationReport();
    const errorCount = integrationAudit.errors.length;
    const warningCount = integrationAudit.warnings.length;

    return {
      featureCount: platformFeatureAccessMatrix.length,
      requiredRegressionFeatureCount: platformFeatureAccessMatrix.filter(
        (feature) => feature.requiredForRegression
      ).length,
      coverageCount: platformFeatureAccessCoverageDefinitions.length,
      issueCount: errorCount + warningCount,
      errorCount,
      warningCount
    };
  },
  createSurfaceInventorySummary: () => {
    const report = createPlatformSurfaceInventoryReport();
    const errorCount = report.audit.errors.length;
    const warningCount = report.audit.warnings.length;

    return {
      surfaceCount: report.surfaceCount,
      panelLinkedSurfaceCount: report.panelLinkedSurfaceCount,
      commandLinkedSurfaceCount: report.commandLinkedSurfaceCount,
      featureLinkedSurfaceCount: report.featureLinkedSurfaceCount,
      unlinkedSurfaceCount: report.unlinkedSurfaceCount,
      issueCount: errorCount + warningCount,
      errorCount,
      warningCount
    };
  },
  createSurfaceCoverageSummary: () => {
    const report = createPlatformSurfaceCoverageReport();

    return {
      commandSeedCount: report.commandSeedCount,
      coveredCommandSeedCount: report.coveredCommandSeedCount,
      uncoveredCommandSeedCount: report.uncoveredCommandSeedCount,
      panelSeedCount: report.panelSeedCount,
      coveredPanelSeedCount: report.coveredPanelSeedCount,
      uncoveredPanelSeedCount: report.uncoveredPanelSeedCount,
      requiredFeatureCount: report.requiredFeatureCount,
      coveredRequiredFeatureCount: report.coveredRequiredFeatureCount,
      uncoveredRequiredFeatureCount: report.uncoveredRequiredFeatureCount,
      issueCount: report.issueCount,
      errorCount: report.errorCount,
      warningCount: report.warningCount
    };
  },
  createAppShellBoundarySummary: () => {
    const report = createPlatformAppShellBoundaryReport();

    return {
      zoneCount: report.zoneCount,
      highRiskZoneCount: report.highRiskZoneCount,
      mediumRiskZoneCount: report.mediumRiskZoneCount,
      lowRiskZoneCount: report.lowRiskZoneCount,
      issueCount: report.issueCount,
      errorCount: report.errorCount,
      warningCount: report.warningCount
    };
  },
  createSceneViewportBoundarySummary: () => {
    const report = createPlatformSceneViewportBoundaryReport();

    return {
      status: report.status,
      boundaryId: report.boundaryId,
      displayName: report.displayName,
      ownerLayer: report.ownerLayer,
      runtimeStatus: report.runtimeStatus,
      appShellZoneId: report.appShellZoneId,
      sourceFileCount: report.sourceFileCount,
      responsibilityCount: report.responsibilityCount,
      upstreamInputCount: report.upstreamInputCount,
      downstreamEffectCount: report.downstreamEffectCount,
      boundaryRiskCount: report.boundaryRiskCount,
      extractionNoteCount: report.extractionNoteCount,
      issueCount: report.issueCount,
      errorCount: report.errorCount,
      warningCount: report.warningCount
    };
  },
  createBabylonSceneBoundarySummary: () => {
    const report = createPlatformBabylonSceneBoundaryReport();

    return {
      status: report.status,
      boundaryId: report.boundaryId,
      displayName: report.displayName,
      ownerLayer: report.ownerLayer,
      runtimeStatus: report.runtimeStatus,
      sourceFileCount: report.sourceFileCount,
      parentBoundaryCount: report.parentBoundaryCount,
      responsibilityCount: report.responsibilityCount,
      upstreamInputCount: report.upstreamInputCount,
      downstreamEffectCount: report.downstreamEffectCount,
      boundaryRiskCount: report.boundaryRiskCount,
      extractionNoteCount: report.extractionNoteCount,
      issueCount: report.issueCount,
      errorCount: report.errorCount,
      warningCount: report.warningCount
    };
  }
};

export const createPlatformReadinessReportFromDependencies = (
  dependencies: PlatformReadinessDependencies
): PlatformReadinessReport => {
  const registryResult = safelyCreateSummary(
    dependencies.createRegistrySeedSummary,
    { commandSeedCount: 0, panelSeedCount: 0 },
    "Registry seed validation"
  );
  const integrationResult = safelyCreateSummary(
    dependencies.createFeatureAccessIntegrationSummary,
    {
      featureCount: 0,
      requiredRegressionFeatureCount: 0,
      coverageCount: 0,
      issueCount: 1,
      errorCount: 1,
      warningCount: 0
    },
    "Feature access integration audit"
  );
  const inventoryResult = safelyCreateSummary(
    dependencies.createSurfaceInventorySummary,
    {
      surfaceCount: 0,
      panelLinkedSurfaceCount: 0,
      commandLinkedSurfaceCount: 0,
      featureLinkedSurfaceCount: 0,
      unlinkedSurfaceCount: 0,
      issueCount: 1,
      errorCount: 1,
      warningCount: 0
    },
    "Surface inventory audit"
  );
  const coverageResult = safelyCreateSummary(
    dependencies.createSurfaceCoverageSummary,
    {
      commandSeedCount: 0,
      coveredCommandSeedCount: 0,
      uncoveredCommandSeedCount: 0,
      panelSeedCount: 0,
      coveredPanelSeedCount: 0,
      uncoveredPanelSeedCount: 0,
      requiredFeatureCount: 0,
      coveredRequiredFeatureCount: 0,
      uncoveredRequiredFeatureCount: 0,
      issueCount: 1,
      errorCount: 1,
      warningCount: 0
    },
    "Surface coverage audit"
  );
  const appShellBoundaryResult = safelyCreateSummary(
    dependencies.createAppShellBoundarySummary,
    {
      zoneCount: 0,
      highRiskZoneCount: 0,
      mediumRiskZoneCount: 0,
      lowRiskZoneCount: 0,
      issueCount: 1,
      errorCount: 1,
      warningCount: 0
    },
    "App shell boundary audit"
  );
  const sceneViewportBoundaryResult = safelyCreateSummary(
    dependencies.createSceneViewportBoundarySummary,
    {
      status: "not-ready",
      boundaryId: "scene-viewport",
      displayName: "Scene Viewport",
      ownerLayer: "app-shell",
      runtimeStatus: "active",
      appShellZoneId: "scene-viewport",
      sourceFileCount: 0,
      responsibilityCount: 0,
      upstreamInputCount: 0,
      downstreamEffectCount: 0,
      boundaryRiskCount: 0,
      extractionNoteCount: 0,
      issueCount: 1,
      errorCount: 1,
      warningCount: 0
    } satisfies PlatformReadinessReport["sceneViewportBoundarySummary"],
    "Scene viewport boundary audit"
  );
  const babylonSceneBoundaryResult = safelyCreateSummary(
    dependencies.createBabylonSceneBoundarySummary,
    {
      status: "not-ready",
      boundaryId: "babylon-scene",
      displayName: "Babylon Scene",
      ownerLayer: "scene-viewport",
      runtimeStatus: "active",
      sourceFileCount: 0,
      parentBoundaryCount: 0,
      responsibilityCount: 0,
      upstreamInputCount: 0,
      downstreamEffectCount: 0,
      boundaryRiskCount: 0,
      extractionNoteCount: 0,
      issueCount: 1,
      errorCount: 1,
      warningCount: 0
    } satisfies PlatformReadinessReport["babylonSceneBoundarySummary"],
    "Babylon scene boundary audit"
  );

  return createPlatformReadinessReportFromParts(
    {
      registrySeedSummary: registryResult.summary,
      featureAccessIntegrationSummary: integrationResult.summary,
      surfaceInventorySummary: inventoryResult.summary,
      surfaceCoverageSummary: coverageResult.summary,
      appShellBoundarySummary: appShellBoundaryResult.summary,
      sceneViewportBoundarySummary: sceneViewportBoundaryResult.summary,
      babylonSceneBoundarySummary: babylonSceneBoundaryResult.summary
    },
    {
      "registry-seeds": registryResult.failureSummary,
      "feature-access-integration": integrationResult.failureSummary,
      "surface-inventory": inventoryResult.failureSummary,
      "surface-coverage": coverageResult.failureSummary,
      "app-shell-boundary": appShellBoundaryResult.failureSummary,
      "scene-viewport-boundary": sceneViewportBoundaryResult.failureSummary,
      "babylon-scene-boundary": babylonSceneBoundaryResult.failureSummary
    }
  );
};

export const createPlatformReadinessReport = (): PlatformReadinessReport =>
  createPlatformReadinessReportFromDependencies(platformReadinessDependencies);

export const getPlatformReadinessStatus = (): PlatformReadinessStatus =>
  createPlatformReadinessReport().status;
