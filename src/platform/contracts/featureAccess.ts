import type { CommandId } from "./command";
import type { PanelId } from "./panel";

export type FeatureId = string;

export type FeatureAccessSurface = "menu" | "toolbar" | "context-menu" | "shortcut" | "panel" | "modal" | "api";
export type FeatureAccessClassification = "required-runtime" | "declared-planned" | "quality-signal";
export type FeatureRuntimeRequirement = "selection" | "entity" | "viewport";
export type FeatureQualitySignalId = "no-red-console";

export type FeatureAccessEntry = {
  featureId: FeatureId;
  label: string;
  classification: FeatureAccessClassification;
  surfaces: readonly FeatureAccessSurface[];
  commandIds?: readonly CommandId[];
  panelIds?: readonly PanelId[];
  runtimeRequirements?: readonly FeatureRuntimeRequirement[];
  qualitySignalId?: FeatureQualitySignalId;
  /**
   * Legacy singular links remain readable while existing metadata consumers
   * migrate to the canonical arrays above.
   */
  commandId?: CommandId;
  panelId?: PanelId;
  requiredForRegression: boolean;
  notes?: string;
};

