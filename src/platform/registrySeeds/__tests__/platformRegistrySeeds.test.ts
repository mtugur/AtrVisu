import { describe, expect, it } from "vitest";
import { platformCommandSeedDefinitions } from "../commandSeedDefinitions";
import { platformPanelSeedDefinitions } from "../panelSeedDefinitions";
import {
  createSeededPlatformCommandRegistry,
  createSeededPlatformPanelRegistry,
  getPlatformCommandSeedById,
  getPlatformPanelSeedById
} from "../platformRegistrySeeds";

describe("platform registry seed factories", () => {
  it("loads every command seed into a command registry", () => {
    const registry = createSeededPlatformCommandRegistry();

    expect(registry.list()).toHaveLength(platformCommandSeedDefinitions.length);
  });

  it("loads every panel seed into a panel registry", () => {
    const registry = createSeededPlatformPanelRegistry();

    expect(registry.list()).toHaveLength(platformPanelSeedDefinitions.length);
  });

  it("finds an existing command seed by id", () => {
    expect(getPlatformCommandSeedById("library.manager")?.label).toBe("Library Manager");
  });

  it("returns undefined for missing command seed ids", () => {
    expect(getPlatformCommandSeedById("missing.command")).toBeUndefined();
  });

  it("finds an existing panel seed by id", () => {
    expect(getPlatformPanelSeedById("panel.inspector")?.title).toBe("Properties Inspector");
  });

  it("returns undefined for missing panel seed ids", () => {
    expect(getPlatformPanelSeedById("panel.missing")).toBeUndefined();
  });

  it("does not mutate seed arrays when creating registries", () => {
    const commandCount = platformCommandSeedDefinitions.length;
    const panelCount = platformPanelSeedDefinitions.length;

    createSeededPlatformCommandRegistry();
    createSeededPlatformPanelRegistry();

    expect(platformCommandSeedDefinitions).toHaveLength(commandCount);
    expect(platformPanelSeedDefinitions).toHaveLength(panelCount);
  });
});

