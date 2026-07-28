import { describe, expect, it } from "vitest";
import { platformCommandSeedDefinitions, platformPanelSeedDefinitions } from "../../registrySeeds";
import { platformFeatureAccessCoverageDefinitions, type FeatureAccessCoverageDefinition } from "../featureAccessCoverageDefinitions";
import {
  getFeatureAccessCoverageById,
  getRequiredFeatureAccessCoverage,
  validateFeatureAccessCoverage
} from "../featureAccessIntegration";

const findCoverage = (featureId: string) => {
  const coverage = getFeatureAccessCoverageById(featureId);
  if (!coverage) {
    throw new Error(`Missing test coverage fixture: ${featureId}`);
  }
  return coverage;
};

describe("feature access integration", () => {
  it("finds existing coverage by id", () => {
    expect(getFeatureAccessCoverageById("library.manager")?.featureId).toBe("library.manager");
  });

  it("returns undefined for unknown coverage ids", () => {
    expect(getFeatureAccessCoverageById("missing.feature")).toBeUndefined();
  });

  it("returns only required regression feature coverage", () => {
    const requiredCoverage = getRequiredFeatureAccessCoverage();
    const requiredCoverageIds = new Set(requiredCoverage.map((coverage) => coverage.featureId));

    expect(requiredCoverage.length).toBeGreaterThan(0);
    expect(requiredCoverageIds.has("project.exportJson")).toBe(true);
    expect(requiredCoverageIds.has("object.duplicate")).toBe(true);
  });

  it("validates current coverage data without errors", () => {
    expect(validateFeatureAccessCoverage().errors).toEqual([]);
  });

  it("reports duplicate feature ids", () => {
    const duplicateCoverage = [
      ...platformFeatureAccessCoverageDefinitions,
      findCoverage("library.manager")
    ];

    expect(validateFeatureAccessCoverage(duplicateCoverage).errors.some((error) => /Duplicate coverage/.test(error.message))).toBe(true);
  });

  it("reports missing command ids", () => {
    const invalidCoverage: readonly FeatureAccessCoverageDefinition[] = [
      {
        ...findCoverage("library.manager"),
        commandIds: ["missing.command"]
      }
    ];

    expect(validateFeatureAccessCoverage(invalidCoverage).errors.some((error) => /commandId/.test(error.message))).toBe(true);
  });

  it("reports missing panel ids", () => {
    const invalidCoverage: readonly FeatureAccessCoverageDefinition[] = [
      {
        ...findCoverage("panel.layers"),
        panelIds: ["panel.missing"]
      }
    ];

    expect(validateFeatureAccessCoverage(invalidCoverage).errors.some((error) => /panelId/.test(error.message))).toBe(true);
  });

  it("reports runtime-authority coverage without notes", () => {
    const invalidCoverage: readonly FeatureAccessCoverageDefinition[] = [
      {
        featureId: "selection.singleSelect",
        coverageType: "runtime-authority",
        notes: " "
      }
    ];

    expect(validateFeatureAccessCoverage(invalidCoverage).errors.some((error) => /runtime-authority/.test(error.message))).toBe(true);
  });

  it("does not mutate seed arrays during validation", () => {
    const commandSeedCount = platformCommandSeedDefinitions.length;
    const panelSeedCount = platformPanelSeedDefinitions.length;
    const coverageCount = platformFeatureAccessCoverageDefinitions.length;

    validateFeatureAccessCoverage();

    expect(platformCommandSeedDefinitions).toHaveLength(commandSeedCount);
    expect(platformPanelSeedDefinitions).toHaveLength(panelSeedCount);
    expect(platformFeatureAccessCoverageDefinitions).toHaveLength(coverageCount);
  });
});

