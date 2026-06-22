import type { CommandDefinition, FeatureAccessEntry, PanelDefinition } from "../contracts";
import type { FeatureAccessCoverageDefinition } from "../integration";
import type { PlatformSurfaceInventoryItem } from "../surfaceInventory";

export type SurfaceCoverageAuditIssueSeverity = "error" | "warning";

export type SurfaceCoverageAuditIssue = {
  severity: SurfaceCoverageAuditIssueSeverity;
  code: string;
  message: string;
  id?: string;
  relatedIds?: readonly string[];
};

export type CommandSurfaceCoverage = {
  commandId: string;
  surfaceIds: readonly string[];
  isCovered: boolean;
};

export type PanelSurfaceCoverage = {
  panelId: string;
  surfaceIds: readonly string[];
  isCovered: boolean;
};

export type FeatureSurfaceCoverage = {
  featureId: string;
  surfaceIds: readonly string[];
  integrationCoverageExists: boolean;
  requiredForRegression: boolean;
  isCovered: boolean;
};

export type SurfaceCoverageAuditReport = {
  commandCoverage: readonly CommandSurfaceCoverage[];
  panelCoverage: readonly PanelSurfaceCoverage[];
  featureCoverage: readonly FeatureSurfaceCoverage[];
  uncoveredCommandIds: readonly string[];
  uncoveredPanelIds: readonly string[];
  uncoveredRequiredFeatureIds: readonly string[];
  issues: readonly SurfaceCoverageAuditIssue[];
};

export type SurfaceCoverageAuditSources = {
  commandSeedDefinitions: readonly Pick<CommandDefinition, "id">[];
  panelSeedDefinitions: readonly Pick<PanelDefinition, "id">[];
  featureAccessEntries: readonly FeatureAccessEntry[];
  featureAccessCoverageDefinitions: readonly Pick<
    FeatureAccessCoverageDefinition,
    "featureId" | "commandIds" | "panelIds"
  >[];
  surfaceInventory: readonly PlatformSurfaceInventoryItem[];
};
