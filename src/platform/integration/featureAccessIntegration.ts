import type { FeatureAccessEntry } from "../contracts";
import { platformFeatureAccessMatrix } from "../featureAccess";
import { platformCommandSeedDefinitions, platformPanelSeedDefinitions } from "../registrySeeds";
import {
  platformFeatureAccessCoverageDefinitions,
  type FeatureAccessCoverageDefinition
} from "./featureAccessCoverageDefinitions";

export type FeatureAccessCoverageValidationIssue = {
  severity: "error" | "warning";
  featureId?: string;
  message: string;
};

export type FeatureAccessCoverageValidationReport = {
  errors: readonly FeatureAccessCoverageValidationIssue[];
  warnings: readonly FeatureAccessCoverageValidationIssue[];
};

const featureAccessEntries: readonly FeatureAccessEntry[] = platformFeatureAccessMatrix;

const hasItems = (items?: readonly string[]) => Boolean(items && items.length > 0);

const hasText = (value?: string) => Boolean(value?.trim());

export const getFeatureAccessCoverageById = (featureId: string) =>
  platformFeatureAccessCoverageDefinitions.find((coverage) => coverage.featureId === featureId);

export const getRequiredFeatureAccessCoverage = () => {
  const requiredFeatureIds = new Set(
    featureAccessEntries
      .filter((feature) => feature.requiredForRegression)
      .map((feature) => feature.featureId)
  );

  return platformFeatureAccessCoverageDefinitions.filter((coverage) => requiredFeatureIds.has(coverage.featureId));
};

export const validateFeatureAccessCoverage = (
  coverageDefinitions: readonly FeatureAccessCoverageDefinition[] = platformFeatureAccessCoverageDefinitions
): FeatureAccessCoverageValidationReport => {
  const errors: FeatureAccessCoverageValidationIssue[] = [];
  const warnings: FeatureAccessCoverageValidationIssue[] = [];
  const featureIds = new Set(featureAccessEntries.map((feature) => feature.featureId));
  const requiredFeatureIds = new Set(
    featureAccessEntries
      .filter((feature) => feature.requiredForRegression)
      .map((feature) => feature.featureId)
  );
  const commandIds = new Set(platformCommandSeedDefinitions.map((command) => command.id));
  const panelIds = new Set(platformPanelSeedDefinitions.map((panel) => panel.id));
  const seenCoverageIds = new Set<string>();

  coverageDefinitions.forEach((coverage) => {
    if (seenCoverageIds.has(coverage.featureId)) {
      errors.push({
        severity: "error",
        featureId: coverage.featureId,
        message: `Duplicate coverage featureId "${coverage.featureId}".`
      });
    }
    seenCoverageIds.add(coverage.featureId);

    if (!featureIds.has(coverage.featureId)) {
      errors.push({
        severity: "error",
        featureId: coverage.featureId,
        message: `Coverage featureId "${coverage.featureId}" does not exist in the feature access matrix.`
      });
    }

    coverage.commandIds?.forEach((commandId) => {
      if (!commandIds.has(commandId)) {
        errors.push({
          severity: "error",
          featureId: coverage.featureId,
          message: `Coverage commandId "${commandId}" does not exist in command seeds.`
        });
      }
    });

    coverage.panelIds?.forEach((panelId) => {
      if (!panelIds.has(panelId)) {
        errors.push({
          severity: "error",
          featureId: coverage.featureId,
          message: `Coverage panelId "${panelId}" does not exist in panel seeds.`
        });
      }
    });

    if (coverage.coverageType === "metadata-only" && !hasText(coverage.notes)) {
      errors.push({
        severity: "error",
        featureId: coverage.featureId,
        message: "Metadata-only coverage requires notes."
      });
    }
    if (coverage.coverageType === "command" && !hasItems(coverage.commandIds)) {
      errors.push({
        severity: "error",
        featureId: coverage.featureId,
        message: "Command coverage requires at least one commandId."
      });
    }
    if (coverage.coverageType === "panel" && !hasItems(coverage.panelIds)) {
      errors.push({
        severity: "error",
        featureId: coverage.featureId,
        message: "Panel coverage requires at least one panelId."
      });
    }
    if (coverage.coverageType === "command-and-panel" && (!hasItems(coverage.commandIds) || !hasItems(coverage.panelIds))) {
      errors.push({
        severity: "error",
        featureId: coverage.featureId,
        message: "Command-and-panel coverage requires commandIds and panelIds."
      });
    }
  });

  requiredFeatureIds.forEach((featureId) => {
    if (!seenCoverageIds.has(featureId)) {
      errors.push({
        severity: "error",
        featureId,
        message: `Required regression feature "${featureId}" has no coverage definition.`
      });
    }
  });

  return { errors, warnings };
};

export const createFeatureAccessIntegrationReport = () => validateFeatureAccessCoverage();

