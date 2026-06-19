import { describe, expect, it } from "vitest";
import { platformFeatureAccessMatrix } from "../../featureAccess";
import {
  createPlatformFeatureAccessRegistry,
  findFeatureAccessById,
  getRequiredRegressionFeatures
} from "../featureAccessAdapter";

describe("feature access adapter", () => {
  it("registers all platform feature access matrix entries", () => {
    const registry = createPlatformFeatureAccessRegistry();

    expect(registry.list()).toHaveLength(platformFeatureAccessMatrix.length);
  });

  it("returns only required regression features", () => {
    const requiredFeatures = getRequiredRegressionFeatures();

    expect(requiredFeatures.length).toBeGreaterThan(0);
    expect(requiredFeatures.every((entry) => entry.requiredForRegression)).toBe(true);
  });

  it("finds an existing feature by id", () => {
    expect(findFeatureAccessById("library.manager")?.label).toBe("Library Manager");
  });

  it("returns undefined for an unknown feature id", () => {
    expect(findFeatureAccessById("missing.feature")).toBeUndefined();
  });

  it("includes critical regression features", () => {
    const requiredFeatureIds = new Set(getRequiredRegressionFeatures().map((entry) => entry.featureId));

    expect(requiredFeatureIds.has("project.exportJson")).toBe(true);
    expect(requiredFeatureIds.has("edit.undo")).toBe(true);
    expect(requiredFeatureIds.has("library.manager")).toBe(true);
    expect(requiredFeatureIds.has("panel.layers")).toBe(true);
    expect(requiredFeatureIds.has("civil.column")).toBe(true);
  });
});

