import { platformFeatureAccessMatrix } from "../featureAccess";

export type FeatureAccessCoverageType =
  | "command"
  | "panel"
  | "command-and-panel"
  | "runtime-authority"
  | "declared-planned"
  | "external-evidence";

export type FeatureAccessCoverageDefinition = {
  featureId: string;
  commandIds?: readonly string[];
  panelIds?: readonly string[];
  coverageType: FeatureAccessCoverageType;
  notes?: string;
};

export const platformFeatureAccessCoverageDefinitions: readonly FeatureAccessCoverageDefinition[] =
  platformFeatureAccessMatrix.map((feature) => {
    if (feature.classification === "declared-planned") {
      return {
        featureId: feature.featureId,
        commandIds: feature.commandIds,
        panelIds: feature.panelIds,
        coverageType: "declared-planned",
        notes: feature.notes ?? "Explicitly planned and unbound."
      };
    }
    if (feature.classification === "quality-signal") {
      return {
        featureId: feature.featureId,
        coverageType: "external-evidence",
        notes: feature.notes ?? "Requires explicit external quality evidence."
      };
    }
    if ((feature.commandIds?.length ?? 0) > 0 && (feature.panelIds?.length ?? 0) > 0) {
      return {
        featureId: feature.featureId,
        commandIds: feature.commandIds,
        panelIds: feature.panelIds,
        coverageType: "command-and-panel"
      };
    }
    if ((feature.commandIds?.length ?? 0) > 0) {
      return {
        featureId: feature.featureId,
        commandIds: feature.commandIds,
        coverageType: "command"
      };
    }
    if ((feature.panelIds?.length ?? 0) > 0) {
      return {
        featureId: feature.featureId,
        panelIds: feature.panelIds,
        coverageType: "panel"
      };
    }
    return {
      featureId: feature.featureId,
      coverageType: "runtime-authority",
      notes: `Runtime requirements: ${feature.runtimeRequirements?.join(", ") ?? "none"}.`
    };
  });
