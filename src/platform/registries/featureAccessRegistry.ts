import type { FeatureAccessEntry, FeatureId } from "../contracts";

const hasText = (value: string) => value.trim().length > 0;

export const validateFeatureAccessEntry = (entry: FeatureAccessEntry) => {
  if (!hasText(entry.featureId)) {
    throw new Error("Feature id is required.");
  }
  if (!hasText(entry.label)) {
    throw new Error(`Feature "${entry.featureId}" label is required.`);
  }
  if (entry.requiredForRegression && entry.surfaces.length === 0) {
    throw new Error(`Feature "${entry.featureId}" requires at least one access surface.`);
  }
  if (entry.classification === "declared-planned" && entry.requiredForRegression) {
    throw new Error(`Planned feature "${entry.featureId}" cannot be required for regression.`);
  }
  if (entry.classification === "quality-signal") {
    if (!entry.qualitySignalId) {
      throw new Error(`Quality signal "${entry.featureId}" requires qualitySignalId.`);
    }
    if ((entry.commandIds?.length ?? 0) > 0 || (entry.panelIds?.length ?? 0) > 0) {
      throw new Error(`Quality signal "${entry.featureId}" cannot require command or panel bindings.`);
    }
  }
  if (entry.commandId !== undefined && !hasText(entry.commandId)) {
    throw new Error(`Feature "${entry.featureId}" commandId cannot be empty.`);
  }
  if (entry.panelId !== undefined && !hasText(entry.panelId)) {
    throw new Error(`Feature "${entry.featureId}" panelId cannot be empty.`);
  }
  entry.commandIds?.forEach((commandId) => {
    if (!hasText(commandId)) {
      throw new Error(`Feature "${entry.featureId}" commandIds cannot contain empty values.`);
    }
  });
  entry.panelIds?.forEach((panelId) => {
    if (!hasText(panelId)) {
      throw new Error(`Feature "${entry.featureId}" panelIds cannot contain empty values.`);
    }
  });
};

export const createFeatureAccessRegistry = () => {
  const entries = new Map<FeatureId, FeatureAccessEntry>();

  return {
    register(entry: FeatureAccessEntry) {
      validateFeatureAccessEntry(entry);
      if (entries.has(entry.featureId)) {
        throw new Error(`Duplicate feature id "${entry.featureId}".`);
      }
      entries.set(entry.featureId, entry);
      return entry;
    },
    get(featureId: FeatureId) {
      return entries.get(featureId);
    },
    list() {
      return Array.from(entries.values());
    },
    validate(entry: FeatureAccessEntry) {
      validateFeatureAccessEntry(entry);
    }
  };
};

