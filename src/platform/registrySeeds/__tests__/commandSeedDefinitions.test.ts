import { describe, expect, it } from "vitest";
import type { CommandDefinition } from "../../contracts";
import { createCommandRegistry } from "../../registries";
import { platformCommandSeedDefinitions } from "../commandSeedDefinitions";

const commandSeeds: readonly CommandDefinition[] = platformCommandSeedDefinitions;

const criticalCommandIds = [
  "project.exportJson",
  "project.importJson",
  "edit.undo",
  "edit.redo",
  "edit.deleteSelected",
  "library.addMachine",
  "annotations.create",
  "collision.check",
  "view.viewpoints",
  "library.manager",
  "library.taxonomyManager",
  "civil.addColumn"
] as const;

describe("platform command seed definitions", () => {
  it("is not empty", () => {
    expect(commandSeeds.length).toBeGreaterThan(0);
  });

  it("uses unique command ids", () => {
    const commandIds = commandSeeds.map((command) => command.id);

    expect(new Set(commandIds).size).toBe(commandIds.length);
  });

  it("registers every command seed", () => {
    const registry = createCommandRegistry();

    commandSeeds.forEach((command) => registry.register(command));

    expect(registry.list()).toHaveLength(commandSeeds.length);
  });

  it("has non-empty labels and tooltips", () => {
    expect(commandSeeds.every((command) => command.label.trim() && command.tooltip.trim())).toBe(true);
  });

  it("keeps view commands non-mutating", () => {
    expect(commandSeeds.filter((command) => command.group === "view").every((command) => !command.mutatesData)).toBe(true);
  });

  it("requires undo transactions for mutating commands", () => {
    expect(commandSeeds.filter((command) => command.mutatesData).every((command) => command.requiresUndoTransaction)).toBe(true);
  });

  it("contains critical command ids", () => {
    const commandIds = new Set(commandSeeds.map((command) => command.id));

    criticalCommandIds.forEach((commandId) => {
      expect(commandIds.has(commandId)).toBe(true);
    });
  });
});

