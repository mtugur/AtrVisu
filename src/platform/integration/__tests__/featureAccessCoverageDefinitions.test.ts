import { describe, expect, it } from "vitest";
import { platformFeatureAccessMatrix } from "../../featureAccess";
import { platformCommandSeedDefinitions, platformPanelSeedDefinitions } from "../../registrySeeds";
import { runtimePanelDescriptors } from "../../runtimePanels";
import {
  platformFeatureAccessCoverageDefinitions,
  type FeatureAccessCoverageDefinition
} from "../featureAccessCoverageDefinitions";

describe("feature access coverage definitions", () => {
  const coverageDefinitions: readonly FeatureAccessCoverageDefinition[] = platformFeatureAccessCoverageDefinitions;
  const matrixFeatureIds: Set<string> = new Set(platformFeatureAccessMatrix.map((feature) => feature.featureId));
  const commandIds: Set<string> = new Set(platformCommandSeedDefinitions.map((command) => command.id));
  const panelIds: Set<string> = new Set([
    ...platformPanelSeedDefinitions.map((panel) => panel.id),
    ...runtimePanelDescriptors.map((panel) => panel.definition.id)
  ]);

  it("is not empty", () => {
    expect(coverageDefinitions.length).toBeGreaterThan(0);
  });

  it("uses unique feature ids", () => {
    const coverageFeatureIds = coverageDefinitions.map((coverage) => coverage.featureId);

    expect(new Set(coverageFeatureIds).size).toBe(coverageFeatureIds.length);
  });

  it("references feature ids from the feature access matrix", () => {
    expect(coverageDefinitions.every((coverage) => matrixFeatureIds.has(coverage.featureId))).toBe(true);
  });

  it("references command ids from command seeds", () => {
    const allCommandIds = coverageDefinitions.flatMap((coverage) => [...(coverage.commandIds ?? [])]);

    expect(allCommandIds.every((commandId) => commandIds.has(commandId))).toBe(true);
  });

  it("references panel ids from panel seeds", () => {
    const allPanelIds = coverageDefinitions.flatMap((coverage) => [...(coverage.panelIds ?? [])]);

    expect(allPanelIds.every((panelId) => panelIds.has(panelId))).toBe(true);
  });

  it("covers every required regression feature", () => {
    const coverageFeatureIds = new Set(coverageDefinitions.map((coverage) => coverage.featureId));
    const missingFeatureIds = platformFeatureAccessMatrix
      .filter((feature) => feature.requiredForRegression)
      .map((feature) => feature.featureId)
      .filter((featureId) => !coverageFeatureIds.has(featureId));

    expect(missingFeatureIds).toEqual([]);
  });

  it("requires notes for authority, planned, and external evidence coverage", () => {
    const documentationOnlyCoverage = new Set(["runtime-authority", "declared-planned", "external-evidence"]);
    const undocumented = coverageDefinitions.filter(
      (coverage) => documentationOnlyCoverage.has(coverage.coverageType) && !coverage.notes?.trim()
    );

    expect(undocumented).toEqual([]);
  });

  it("does not leave required runtime features as metadata-only", () => {
    expect(coverageDefinitions.some((coverage) =>
      coverage.coverageType === "runtime-authority"
      && ["selection.singleSelect", "selection.multiSelect"].includes(coverage.featureId)
    )).toBe(true);
  });
});
