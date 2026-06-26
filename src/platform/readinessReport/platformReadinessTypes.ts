export type PlatformReadinessStatus = "ready" | "not-ready";

export type PlatformReadinessCheckStatus = "pass" | "fail";

export type PlatformReadinessCheck = {
  id: string;
  label: string;
  status: PlatformReadinessCheckStatus;
  issueCount: number;
  errorCount: number;
  warningCount: number;
  summary: string;
};

export type PlatformReadinessReport = {
  status: PlatformReadinessStatus;
  checks: readonly PlatformReadinessCheck[];
  issueCount: number;
  errorCount: number;
  warningCount: number;
  registrySeedSummary: {
    commandSeedCount: number;
    panelSeedCount: number;
  };
  featureAccessIntegrationSummary: {
    featureCount: number;
    requiredRegressionFeatureCount: number;
    coverageCount: number;
    issueCount: number;
    errorCount: number;
    warningCount: number;
  };
  surfaceInventorySummary: {
    surfaceCount: number;
    panelLinkedSurfaceCount: number;
    commandLinkedSurfaceCount: number;
    featureLinkedSurfaceCount: number;
    unlinkedSurfaceCount: number;
    issueCount: number;
    errorCount: number;
    warningCount: number;
  };
  surfaceCoverageSummary: {
    commandSeedCount: number;
    coveredCommandSeedCount: number;
    uncoveredCommandSeedCount: number;
    panelSeedCount: number;
    coveredPanelSeedCount: number;
    uncoveredPanelSeedCount: number;
    requiredFeatureCount: number;
    coveredRequiredFeatureCount: number;
    uncoveredRequiredFeatureCount: number;
    issueCount: number;
    errorCount: number;
    warningCount: number;
  };
  appShellBoundarySummary: {
    zoneCount: number;
    highRiskZoneCount: number;
    mediumRiskZoneCount: number;
    lowRiskZoneCount: number;
    issueCount: number;
    errorCount: number;
    warningCount: number;
  };
};
