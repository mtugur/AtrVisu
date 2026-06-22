import { createPlatformSurfaceAuditReport } from "../integration";
import { platformCommandSeedDefinitions, platformPanelSeedDefinitions } from "../registrySeeds";
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
>;

const normalizeIssueCount = (issueCount: number, errorCount: number, warningCount: number) =>
  Math.max(issueCount, errorCount + warningCount);

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
  parts: PlatformReadinessReportParts
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
  const registryPasses = registryErrorCount === 0;
  const integrationPasses = integrationErrorCount === 0;
  const inventoryPasses = inventoryErrorCount === 0;
  const coveragePasses = coverageErrorCount === 0 && uncoveredCoverageCount === 0;
  const checks: readonly PlatformReadinessCheck[] = [
    createCheck(
      "registry-seeds",
      "Registry Seeds",
      registryPasses,
      registryErrorCount,
      registryErrorCount,
      0,
      "Command and panel registry seeds are available.",
      "Command or panel registry seeds are missing."
    ),
    createCheck(
      "feature-access-integration",
      "Feature Access Integration",
      integrationPasses,
      integrationIssueCount,
      integrationErrorCount,
      integrationWarningCount,
      "Feature access integration has no errors.",
      "Feature access integration contains errors."
    ),
    createCheck(
      "surface-inventory",
      "Surface Inventory",
      inventoryPasses,
      inventoryIssueCount,
      inventoryErrorCount,
      inventoryWarningCount,
      "Surface inventory has no errors.",
      "Surface inventory contains errors."
    ),
    createCheck(
      "surface-coverage",
      "Surface Coverage",
      coveragePasses,
      coverageIssueCount,
      coverageErrorCount,
      coverageWarningCount,
      "All command, panel, and required feature surfaces are covered.",
      "Surface coverage contains errors or uncovered platform entries."
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
    }
  };
};

export const createPlatformReadinessReport = (): PlatformReadinessReport => {
  const integrationReport = createPlatformSurfaceAuditReport();
  const surfaceInventoryReport = createPlatformSurfaceInventoryReport();
  const surfaceCoverageReport = createPlatformSurfaceCoverageReport();
  const integrationErrors = integrationReport.coverageValidation.errors.length;
  const integrationWarnings = integrationReport.coverageValidation.warnings.length;
  const inventoryErrors = surfaceInventoryReport.audit.errors.length;
  const inventoryWarnings = surfaceInventoryReport.audit.warnings.length;

  return createPlatformReadinessReportFromParts({
    registrySeedSummary: {
      commandSeedCount: platformCommandSeedDefinitions.length,
      panelSeedCount: platformPanelSeedDefinitions.length
    },
    featureAccessIntegrationSummary: {
      featureCount: integrationReport.featureCount,
      requiredRegressionFeatureCount: integrationReport.requiredRegressionFeatureCount,
      coverageCount: integrationReport.coverageCount,
      issueCount: integrationErrors + integrationWarnings,
      errorCount: integrationErrors,
      warningCount: integrationWarnings
    },
    surfaceInventorySummary: {
      surfaceCount: surfaceInventoryReport.surfaceCount,
      panelLinkedSurfaceCount: surfaceInventoryReport.panelLinkedSurfaceCount,
      commandLinkedSurfaceCount: surfaceInventoryReport.commandLinkedSurfaceCount,
      featureLinkedSurfaceCount: surfaceInventoryReport.featureLinkedSurfaceCount,
      unlinkedSurfaceCount: surfaceInventoryReport.unlinkedSurfaceCount,
      issueCount: inventoryErrors + inventoryWarnings,
      errorCount: inventoryErrors,
      warningCount: inventoryWarnings
    },
    surfaceCoverageSummary: {
      commandSeedCount: surfaceCoverageReport.commandSeedCount,
      coveredCommandSeedCount: surfaceCoverageReport.coveredCommandSeedCount,
      uncoveredCommandSeedCount: surfaceCoverageReport.uncoveredCommandSeedCount,
      panelSeedCount: surfaceCoverageReport.panelSeedCount,
      coveredPanelSeedCount: surfaceCoverageReport.coveredPanelSeedCount,
      uncoveredPanelSeedCount: surfaceCoverageReport.uncoveredPanelSeedCount,
      requiredFeatureCount: surfaceCoverageReport.requiredFeatureCount,
      coveredRequiredFeatureCount: surfaceCoverageReport.coveredRequiredFeatureCount,
      uncoveredRequiredFeatureCount: surfaceCoverageReport.uncoveredRequiredFeatureCount,
      issueCount: surfaceCoverageReport.issueCount,
      errorCount: surfaceCoverageReport.errorCount,
      warningCount: surfaceCoverageReport.warningCount
    }
  });
};

export const getPlatformReadinessStatus = (): PlatformReadinessStatus =>
  createPlatformReadinessReport().status;
