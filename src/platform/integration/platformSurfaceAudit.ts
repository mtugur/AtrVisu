import { platformFeatureAccessMatrix } from "../featureAccess";
import { platformCommandSeedDefinitions, platformPanelSeedDefinitions } from "../registrySeeds";
import {
  createSeededPlatformCommandRegistry,
  createSeededPlatformPanelRegistry
} from "../registrySeeds";
import { platformFeatureAccessCoverageDefinitions } from "./featureAccessCoverageDefinitions";
import {
  validateFeatureAccessCoverage,
  type FeatureAccessCoverageValidationReport
} from "./featureAccessIntegration";

export type PlatformSurfaceAuditReport = {
  featureCount: number;
  requiredRegressionFeatureCount: number;
  commandSeedCount: number;
  panelSeedCount: number;
  coverageCount: number;
  coverageValidation: FeatureAccessCoverageValidationReport;
};

export const createPlatformSurfaceAuditReport = (): PlatformSurfaceAuditReport => {
  const commandRegistry = createSeededPlatformCommandRegistry();
  const panelRegistry = createSeededPlatformPanelRegistry();
  const coverageValidation = validateFeatureAccessCoverage();

  return {
    featureCount: platformFeatureAccessMatrix.length,
    requiredRegressionFeatureCount: platformFeatureAccessMatrix.filter((feature) => feature.requiredForRegression).length,
    commandSeedCount: commandRegistry.list().length,
    panelSeedCount: panelRegistry.list().length,
    coverageCount: platformFeatureAccessCoverageDefinitions.length,
    coverageValidation
  };
};

