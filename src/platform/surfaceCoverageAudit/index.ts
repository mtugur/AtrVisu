export { createPlatformSurfaceCoverageReport } from "./platformSurfaceCoverageReport";
export {
  createCommandSurfaceCoverage,
  createFeatureSurfaceCoverage,
  createPanelSurfaceCoverage,
  createSurfaceCoverageAuditReport,
  createSurfaceCoverageAuditReportFromSources,
  getSurfaceIdsByCommandId,
  getSurfaceIdsByFeatureId,
  getSurfaceIdsByPanelId,
  getUncoveredCommandSeedIds,
  getUncoveredPanelSeedIds,
  getUncoveredRequiredFeatureIds
} from "./surfaceCoverageAudit";
export type {
  CommandSurfaceCoverage,
  FeatureSurfaceCoverage,
  PanelSurfaceCoverage,
  SurfaceCoverageAuditIssue,
  SurfaceCoverageAuditIssueSeverity,
  SurfaceCoverageAuditReport,
  SurfaceCoverageAuditSources
} from "./surfaceCoverageAuditTypes";
