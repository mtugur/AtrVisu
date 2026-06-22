import { createSurfaceCoverageAuditReport } from "./surfaceCoverageAudit";

export const createPlatformSurfaceCoverageReport = () => {
  const audit = createSurfaceCoverageAuditReport();
  const requiredFeatureCoverage = audit.featureCoverage.filter(
    (coverage) => coverage.requiredForRegression
  );

  return {
    commandSeedCount: audit.commandCoverage.length,
    coveredCommandSeedCount: audit.commandCoverage.filter((coverage) => coverage.isCovered).length,
    uncoveredCommandSeedCount: audit.uncoveredCommandIds.length,
    panelSeedCount: audit.panelCoverage.length,
    coveredPanelSeedCount: audit.panelCoverage.filter((coverage) => coverage.isCovered).length,
    uncoveredPanelSeedCount: audit.uncoveredPanelIds.length,
    requiredFeatureCount: requiredFeatureCoverage.length,
    coveredRequiredFeatureCount: requiredFeatureCoverage.filter((coverage) => coverage.isCovered).length,
    uncoveredRequiredFeatureCount: audit.uncoveredRequiredFeatureIds.length,
    issueCount: audit.issues.length,
    errorCount: audit.issues.filter((issue) => issue.severity === "error").length,
    warningCount: audit.issues.filter((issue) => issue.severity === "warning").length,
    audit
  };
};
