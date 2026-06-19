import type { FeatureAccessEntry, FeatureId } from "../contracts";
import { platformFeatureAccessMatrix } from "../featureAccess";
import { createFeatureAccessRegistry } from "../registries";

const featureAccessEntries: readonly FeatureAccessEntry[] = platformFeatureAccessMatrix;

export const createPlatformFeatureAccessRegistry = () => {
  const registry = createFeatureAccessRegistry();

  featureAccessEntries.forEach((entry) => {
    registry.register(entry);
  });

  return registry;
};

export const getRequiredRegressionFeatures = () =>
  featureAccessEntries.filter((entry) => entry.requiredForRegression);

export const findFeatureAccessById = (featureId: FeatureId) =>
  featureAccessEntries.find((entry) => entry.featureId === featureId);

