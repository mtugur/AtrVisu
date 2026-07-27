import { platformFeatureAccessMatrix } from "../featureAccess";
import { platformFeatureAccessCoverageDefinitions } from "../integration";
import { platformCommandSeedDefinitions, platformPanelSeedDefinitions } from "../registrySeeds";
import { currentPlatformSurfaceInventory } from "../surfaceInventory";
import type { FeatureAccessEntry } from "../contracts";
import type { FeatureAccessCoverageDefinition } from "../integration";
import type { PlatformSurfaceInventoryItem } from "../surfaceInventory";
import type {
  CommandSurfaceCoverage,
  FeatureSurfaceCoverage,
  PanelSurfaceCoverage,
  SurfaceCoverageAuditIssue,
  SurfaceCoverageAuditReport,
  SurfaceCoverageAuditSources
} from "./surfaceCoverageAuditTypes";

const unique = (values: readonly string[]): readonly string[] => Array.from(new Set(values));

const getMatchingSurfaceIds = (
  inventory: readonly PlatformSurfaceInventoryItem[],
  matches: (item: PlatformSurfaceInventoryItem) => boolean
): readonly string[] => unique(inventory.filter(matches).map((item) => item.surfaceId));

export const getSurfaceIdsByCommandId = (
  commandId: string,
  inventory: readonly PlatformSurfaceInventoryItem[] = currentPlatformSurfaceInventory
): readonly string[] => getMatchingSurfaceIds(inventory, (item) => item.commandIds?.includes(commandId) ?? false);

export const getSurfaceIdsByPanelId = (
  panelId: string,
  inventory: readonly PlatformSurfaceInventoryItem[] = currentPlatformSurfaceInventory
): readonly string[] => getMatchingSurfaceIds(inventory, (item) => item.panelIds?.includes(panelId) ?? false);

export const getSurfaceIdsByFeatureId = (
  featureId: string,
  inventory: readonly PlatformSurfaceInventoryItem[] = currentPlatformSurfaceInventory,
  coverageDefinitions: readonly Pick<
    FeatureAccessCoverageDefinition,
    "featureId" | "commandIds" | "panelIds"
  >[] = platformFeatureAccessCoverageDefinitions
): readonly string[] => {
  const featureCoverageDefinitions = coverageDefinitions.filter((coverage) => coverage.featureId === featureId);
  const linkedCommandIds = new Set(featureCoverageDefinitions.flatMap((coverage) => coverage.commandIds ?? []));
  const linkedPanelIds = new Set(featureCoverageDefinitions.flatMap((coverage) => coverage.panelIds ?? []));

  return getMatchingSurfaceIds(
    inventory,
    (item) =>
      (item.featureIds?.includes(featureId) ?? false) ||
      (item.commandIds?.some((commandId) => linkedCommandIds.has(commandId)) ?? false) ||
      (item.panelIds?.some((panelId) => linkedPanelIds.has(panelId)) ?? false)
  );
};

export const createCommandSurfaceCoverage = (
  commandSeeds: readonly { readonly id: string }[] = platformCommandSeedDefinitions,
  inventory: readonly PlatformSurfaceInventoryItem[] = currentPlatformSurfaceInventory
): readonly CommandSurfaceCoverage[] =>
  commandSeeds.map((command) => {
    const surfaceIds = getSurfaceIdsByCommandId(command.id, inventory);

    return {
      commandId: command.id,
      surfaceIds,
      isCovered: surfaceIds.length > 0
    };
  });

export const createPanelSurfaceCoverage = (
  panelSeeds: readonly { readonly id: string }[] = platformPanelSeedDefinitions,
  inventory: readonly PlatformSurfaceInventoryItem[] = currentPlatformSurfaceInventory
): readonly PanelSurfaceCoverage[] =>
  panelSeeds.map((panel) => {
    const surfaceIds = getSurfaceIdsByPanelId(panel.id, inventory);

    return {
      panelId: panel.id,
      surfaceIds,
      isCovered: surfaceIds.length > 0
    };
  });

export const createFeatureSurfaceCoverage = (
  featureEntries: readonly FeatureAccessEntry[] = platformFeatureAccessMatrix,
  coverageDefinitions: readonly Pick<
    FeatureAccessCoverageDefinition,
    "featureId" | "commandIds" | "panelIds"
  >[] = platformFeatureAccessCoverageDefinitions,
  inventory: readonly PlatformSurfaceInventoryItem[] = currentPlatformSurfaceInventory
): readonly FeatureSurfaceCoverage[] =>
  featureEntries.map((feature) => {
    const integrationCoverageExists = coverageDefinitions.some(
      (coverage) => coverage.featureId === feature.featureId
    );
    const surfaceIds = getSurfaceIdsByFeatureId(feature.featureId, inventory, coverageDefinitions);

    return {
      featureId: feature.featureId,
      surfaceIds,
      integrationCoverageExists,
      requiredForRegression: feature.requiredForRegression,
      isCovered: surfaceIds.length > 0 && integrationCoverageExists
    };
  });

export const getUncoveredCommandSeedIds = (
  commandSeeds: readonly { readonly id: string }[] = platformCommandSeedDefinitions,
  inventory: readonly PlatformSurfaceInventoryItem[] = currentPlatformSurfaceInventory,
  featureEntries: readonly FeatureAccessEntry[] = platformFeatureAccessMatrix
): readonly string[] => {
  const plannedCommandIds = new Set(featureEntries
    .filter((feature) => feature.classification === "declared-planned")
    .flatMap((feature) => feature.commandIds ?? (feature.commandId ? [feature.commandId] : [])));
  return createCommandSurfaceCoverage(commandSeeds, inventory)
    .filter((coverage) => !coverage.isCovered)
    .filter((coverage) => !plannedCommandIds.has(coverage.commandId))
    .map((coverage) => coverage.commandId);
};

export const getUncoveredPanelSeedIds = (
  panelSeeds: readonly { readonly id: string }[] = platformPanelSeedDefinitions,
  inventory: readonly PlatformSurfaceInventoryItem[] = currentPlatformSurfaceInventory,
  featureEntries: readonly FeatureAccessEntry[] = platformFeatureAccessMatrix
): readonly string[] => {
  const plannedPanelIds = new Set(featureEntries
    .filter((feature) => feature.classification === "declared-planned")
    .flatMap((feature) => feature.panelIds ?? (feature.panelId ? [feature.panelId] : [])));
  return createPanelSurfaceCoverage(panelSeeds, inventory)
    .filter((coverage) => !coverage.isCovered)
    .filter((coverage) => !plannedPanelIds.has(coverage.panelId))
    .map((coverage) => coverage.panelId);
};

export const getUncoveredRequiredFeatureIds = (
  featureEntries: readonly FeatureAccessEntry[] = platformFeatureAccessMatrix,
  coverageDefinitions: readonly Pick<
    FeatureAccessCoverageDefinition,
    "featureId" | "commandIds" | "panelIds"
  >[] = platformFeatureAccessCoverageDefinitions,
  inventory: readonly PlatformSurfaceInventoryItem[] = currentPlatformSurfaceInventory
): readonly string[] =>
  createFeatureSurfaceCoverage(featureEntries, coverageDefinitions, inventory)
    .filter((coverage) => coverage.requiredForRegression && !coverage.isCovered)
    .map((coverage) => coverage.featureId);

export const createSurfaceCoverageAuditReportFromSources = (
  sources: SurfaceCoverageAuditSources
): SurfaceCoverageAuditReport => {
  const plannedCommandIds = new Set(sources.featureAccessEntries
    .filter((feature) => feature.classification === "declared-planned")
    .flatMap((feature) => feature.commandIds ?? (feature.commandId ? [feature.commandId] : [])));
  const plannedPanelIds = new Set(sources.featureAccessEntries
    .filter((feature) => feature.classification === "declared-planned")
    .flatMap((feature) => feature.panelIds ?? (feature.panelId ? [feature.panelId] : [])));
  const commandCoverage = createCommandSurfaceCoverage(
    sources.commandSeedDefinitions,
    sources.surfaceInventory
  );
  const panelCoverage = createPanelSurfaceCoverage(
    sources.panelSeedDefinitions,
    sources.surfaceInventory
  );
  const featureCoverage = createFeatureSurfaceCoverage(
    sources.featureAccessEntries,
    sources.featureAccessCoverageDefinitions,
    sources.surfaceInventory
  );
  const uncoveredCommandIds = commandCoverage
    .filter((coverage) => !coverage.isCovered)
    .filter((coverage) => !plannedCommandIds.has(coverage.commandId))
    .map((coverage) => coverage.commandId);
  const uncoveredPanelIds = panelCoverage
    .filter((coverage) => !coverage.isCovered)
    .filter((coverage) => !plannedPanelIds.has(coverage.panelId))
    .map((coverage) => coverage.panelId);
  const uncoveredRequiredFeatureIds = featureCoverage
    .filter((coverage) => coverage.requiredForRegression && !coverage.isCovered)
    .map((coverage) => coverage.featureId);
  const issues: SurfaceCoverageAuditIssue[] = [];

  uncoveredCommandIds.forEach((commandId) => {
    issues.push({
      severity: "error",
      code: "command-surface-missing",
      message: `Command seed "${commandId}" has no surface inventory coverage.`,
      id: commandId
    });
  });

  uncoveredPanelIds.forEach((panelId) => {
    issues.push({
      severity: "error",
      code: "panel-surface-missing",
      message: `Panel seed "${panelId}" has no surface inventory coverage.`,
      id: panelId
    });
  });

  featureCoverage
    .filter((coverage) => coverage.requiredForRegression && coverage.surfaceIds.length === 0)
    .forEach((coverage) => {
      issues.push({
        severity: "error",
        code: "required-feature-surface-missing",
        message: `Required regression feature "${coverage.featureId}" has no surface inventory coverage.`,
        id: coverage.featureId
      });
    });

  featureCoverage
    .filter((coverage) => coverage.requiredForRegression && !coverage.integrationCoverageExists)
    .forEach((coverage) => {
      issues.push({
        severity: "error",
        code: "required-feature-integration-coverage-missing",
        message: `Required regression feature "${coverage.featureId}" has no integration coverage definition.`,
        id: coverage.featureId
      });
    });

  return {
    commandCoverage,
    panelCoverage,
    featureCoverage,
    uncoveredCommandIds,
    uncoveredPanelIds,
    uncoveredRequiredFeatureIds,
    issues
  };
};

export const createSurfaceCoverageAuditReport = (): SurfaceCoverageAuditReport =>
  createSurfaceCoverageAuditReportFromSources({
    commandSeedDefinitions: platformCommandSeedDefinitions,
    panelSeedDefinitions: platformPanelSeedDefinitions,
    featureAccessEntries: platformFeatureAccessMatrix,
    featureAccessCoverageDefinitions: platformFeatureAccessCoverageDefinitions,
    surfaceInventory: currentPlatformSurfaceInventory
  });
