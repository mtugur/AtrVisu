import { describe, expect, it } from "vitest";
import type { FeatureAccessEntry } from "../contracts";
import { createFeatureAccessRegistry } from "../registries";
import { criticalRegressionFeatureIds, platformFeatureAccessMatrix } from "../featureAccess";

const featureAccessEntries: readonly FeatureAccessEntry[] = platformFeatureAccessMatrix;

describe("platform feature access matrix", () => {
  it("is not empty", () => {
    expect(featureAccessEntries.length).toBeGreaterThan(0);
  });

  it("uses unique feature ids", () => {
    const featureIds = featureAccessEntries.map((entry) => entry.featureId);

    expect(new Set(featureIds).size).toBe(featureIds.length);
  });

  it("gives every required regression feature at least one surface", () => {
    const missingSurfaceEntries = featureAccessEntries.filter(
      (entry) => entry.requiredForRegression && entry.surfaces.length === 0
    );

    expect(missingSurfaceEntries).toEqual([]);
  });

  it("can register every matrix entry in the feature access registry", () => {
    const registry = createFeatureAccessRegistry();

    featureAccessEntries.forEach((entry) => {
      registry.register(entry);
    });

    expect(registry.list()).toHaveLength(featureAccessEntries.length);
  });

  it("contains the critical regression feature list", () => {
    const featureIds = new Set(featureAccessEntries.map((entry) => entry.featureId));

    criticalRegressionFeatureIds.forEach((featureId) => {
      expect(featureIds.has(featureId)).toBe(true);
    });
  });

  it("does not use empty commandId or panelId strings", () => {
    const entriesWithEmptyIds = featureAccessEntries.filter((entry) =>
      entry.commandId?.trim() === "" || entry.panelId?.trim() === ""
    );

    expect(entriesWithEmptyIds).toEqual([]);
  });
});
