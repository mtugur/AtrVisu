import { describe, expect, it } from "vitest";
import type { FeatureAccessEntry } from "../contracts";
import { createFeatureAccessRegistry } from "../registries";

const createEntry = (overrides: Partial<FeatureAccessEntry> = {}): FeatureAccessEntry => ({
  featureId: "library.manager",
  label: "Library Manager",
  surfaces: ["menu", "modal"],
  commandId: "tools.libraryManager",
  panelId: "library.manager",
  requiredForRegression: true,
  ...overrides
});

describe("feature access registry", () => {
  it("registers a valid feature access entry", () => {
    const registry = createFeatureAccessRegistry();
    const entry = createEntry();

    registry.register(entry);

    expect(registry.get("library.manager")).toBe(entry);
    expect(registry.list()).toEqual([entry]);
  });

  it("rejects duplicate feature ids", () => {
    const registry = createFeatureAccessRegistry();
    registry.register(createEntry());

    expect(() => registry.register(createEntry())).toThrow(/Duplicate feature id/);
  });

  it("rejects required regression features without surfaces", () => {
    const registry = createFeatureAccessRegistry();

    expect(() => registry.register(createEntry({ surfaces: [] }))).toThrow(/at least one access surface/);
  });

  it("allows optional features without surfaces", () => {
    const registry = createFeatureAccessRegistry();
    const entry = createEntry({
      featureId: "future.clipboard",
      label: "Future Clipboard",
      surfaces: [],
      commandId: undefined,
      panelId: undefined,
      requiredForRegression: false
    });

    registry.register(entry);

    expect(registry.get("future.clipboard")).toBe(entry);
  });

  it("rejects empty commandId or panelId strings", () => {
    const registry = createFeatureAccessRegistry();

    expect(() => registry.register(createEntry({ commandId: " " }))).toThrow(/commandId cannot be empty/);
    expect(() => registry.register(createEntry({ featureId: "project.manager", panelId: "" }))).toThrow(/panelId cannot be empty/);
  });
});

