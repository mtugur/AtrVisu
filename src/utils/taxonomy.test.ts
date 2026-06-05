import { describe, expect, it } from "vitest";
import defaultTaxonomy from "../../public/library/taxonomy/machine-taxonomy.json";
import {
  inferPlaceholderVisualType,
  mergeTaxonomies,
  validateTaxonomy
} from "./taxonomy";

describe("taxonomy utilities", () => {
  it("accepts the default taxonomy shape", () => {
    const taxonomy = validateTaxonomy(defaultTaxonomy);

    expect(taxonomy.categories.some((category) => category.name === "Material Handling")).toBe(true);
    expect(taxonomy.machineTypes.some((type) => type.name === "Forklift")).toBe(true);
    expect(taxonomy.placeholderVisualTypes.some((type) => type.id === "forklift-proxy")).toBe(true);
  });

  it("represents custom categories and machine types", () => {
    const base = validateTaxonomy(defaultTaxonomy);
    const custom = validateTaxonomy({
      ...base,
      categories: [{ id: "custom-test", name: "Custom Test" }],
      machineTypes: [{ id: "custom-type", name: "Custom Type", categoryId: "custom-test" }],
      placeholderVisualTypes: [{ id: "box-generic", name: "Generic Box" }],
      productFamilyCodes: []
    });
    const merged = mergeTaxonomies(base, custom);

    expect(merged.categories.some((category) => category.name === "Custom Test")).toBe(true);
    expect(merged.machineTypes.some((type) => type.categoryId === "custom-test")).toBe(true);
  });

  it("drops machine types with invalid category relationships", () => {
    const taxonomy = validateTaxonomy({
      version: 1,
      categories: [{ id: "valid", name: "Valid" }],
      machineTypes: [{ id: "invalid-type", name: "Invalid", categoryId: "missing" }],
      placeholderVisualTypes: [{ id: "box-generic", name: "Generic Box" }],
      productFamilyCodes: []
    });

    expect(taxonomy).toEqual(expect.objectContaining({ categories: expect.any(Array) }));
    expect(taxonomy.machineTypes.some((type) => type.id === "invalid-type")).toBe(false);
  });

  it("falls back to safe placeholder visual types", () => {
    expect(inferPlaceholderVisualType("Material Handling", "Forklift", "bad-value")).toBe("forklift-proxy");
    expect(inferPlaceholderVisualType("", "", "bad-value")).toBe("box-generic");
  });

  it("does not crash on missing optional fields", () => {
    const taxonomy = validateTaxonomy({
      categories: [{ name: "Custom" }],
      machineTypes: [{ name: "Custom Machine", categoryId: "custom" }],
      placeholderVisualTypes: [{ name: "Generic Box" }]
    });

    expect(taxonomy.categories[0].name).toBe("Custom");
  });
});
