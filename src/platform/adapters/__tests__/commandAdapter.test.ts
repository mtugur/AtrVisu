import { describe, expect, it } from "vitest";
import type { CommandDefinition } from "../../contracts";
import { createDisabledCommand, createNoopCommand, isCommandDataSafe } from "../commandAdapter";

const createCommandDefinition = (overrides: Partial<Omit<CommandDefinition, "execute">> = {}): Omit<CommandDefinition, "execute"> => ({
  id: "edit.delete",
  group: "edit",
  label: "Delete",
  tooltip: "Delete selected entities",
  mutatesData: true,
  requiresUndoTransaction: true,
  ...overrides
});

describe("command adapter", () => {
  it("creates a noop command with executable handler", () => {
    const command = createNoopCommand(createCommandDefinition());

    expect(command.execute({ selectionIds: [], hasUnsavedChanges: false })).toBeUndefined();
  });

  it("creates a disabled command with reason", () => {
    const command = createDisabledCommand(createCommandDefinition(), "Select an entity first.");

    expect(command.enableRule?.({ selectionIds: [], hasUnsavedChanges: false })).toEqual({
      enabled: false,
      reason: "Select an entity first."
    });
  });

  it("marks mutating commands without undo transaction as unsafe", () => {
    const command = createNoopCommand(createCommandDefinition({ requiresUndoTransaction: false }));

    expect(isCommandDataSafe(command)).toBe(false);
  });

  it("marks mutating view commands as unsafe", () => {
    const command = createNoopCommand(createCommandDefinition({ group: "view" }));

    expect(isCommandDataSafe(command)).toBe(false);
  });

  it("marks commands with empty label or tooltip as unsafe", () => {
    expect(isCommandDataSafe(createNoopCommand(createCommandDefinition({ label: " " })))).toBe(false);
    expect(isCommandDataSafe(createNoopCommand(createCommandDefinition({ tooltip: "" })))).toBe(false);
  });

  it("marks safe command metadata as safe", () => {
    expect(isCommandDataSafe(createNoopCommand(createCommandDefinition()))).toBe(true);
  });
});

