import type { CommandId } from "./command";
import type { PanelId } from "./panel";

export type FeatureId = string;

export type FeatureAccessSurface = "menu" | "toolbar" | "context-menu" | "shortcut" | "panel" | "modal" | "api";

export type FeatureAccessEntry = {
  featureId: FeatureId;
  label: string;
  surfaces: readonly FeatureAccessSurface[];
  commandId?: CommandId;
  panelId?: PanelId;
  requiredForRegression: boolean;
  notes?: string;
};

