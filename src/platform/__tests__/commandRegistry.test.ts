import { describe, expect, it } from "vitest";
import type { CommandDefinition } from "../contracts";
import { createCommandRegistry } from "../registries";

const createCommand = (overrides: Partial<CommandDefinition> = {}): CommandDefinition => ({
  id: "file.save",
  group: "file",
  label: "Save",
  tooltip: "Save current project",
  execute: () => undefined,
  mutatesData: true,
  requiresUndoTransaction: true,
  ...overrides
});

describe("command registry", () => {
  it("registers a valid command", () => {
    const registry = createCommandRegistry();
    const command = createCommand();

    registry.register(command);

    expect(registry.get("file.save")).toBe(command);
    expect(registry.list()).toEqual([command]);
  });

  it("rejects duplicate command ids", () => {
    const registry = createCommandRegistry();
    registry.register(createCommand());

    expect(() => registry.register(createCommand())).toThrow(/Duplicate command id/);
  });

  it("rejects mutating commands without undo transactions", () => {
    const registry = createCommandRegistry();

    expect(() => registry.register(createCommand({ requiresUndoTransaction: false }))).toThrow(/undo transaction/);
  });

  it("rejects view commands that mutate data", () => {
    const registry = createCommandRegistry();

    expect(() => registry.register(createCommand({ id: "view.labels", group: "view" }))).toThrow(/must not mutate data/);
  });

  it("allows disabled enable rules to carry a reason", () => {
    const registry = createCommandRegistry();
    const command = createCommand({
      id: "edit.delete",
      group: "edit",
      label: "Delete",
      tooltip: "Delete selected entities",
      mutatesData: true,
      requiresUndoTransaction: true,
      enableRule: () => ({ enabled: false, reason: "Select an entity first." })
    });

    registry.register(command);

    expect(command.enableRule?.({ selectionIds: [], hasUnsavedChanges: false })).toEqual({
      enabled: false,
      reason: "Select an entity first."
    });
  });
});

