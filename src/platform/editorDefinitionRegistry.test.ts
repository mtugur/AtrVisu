import { describe, expect, it } from "vitest";
import type { EditorDefinition } from "./contracts";
import {
  EditorDefinitionRegistryError,
  createEditorDefinitionRegistry
} from "./editorDefinitionRegistry";
import { LAYOUT_3D_EDITOR_DEFINITION } from "../workbench/layout3dEditorDefinition";

const createDefinition = (id: string): EditorDefinition => ({
  ...LAYOUT_3D_EDITOR_DEFINITION,
  id,
  titleKey: `editor.${id}.title`
});

describe("EditorDefinitionRegistry", () => {
  it("accepts layout.3d and provides deterministic lookup", () => {
    const registry = createEditorDefinitionRegistry([LAYOUT_3D_EDITOR_DEFINITION]);

    expect(registry.has("layout.3d")).toBe(true);
    expect(registry.get("layout.3d")).toEqual(LAYOUT_3D_EDITOR_DEFINITION);
    expect(registry.require("layout.3d")).toBe(registry.get("layout.3d"));
  });

  it("rejects invalid editor metadata", () => {
    const invalid = {
      ...LAYOUT_3D_EDITOR_DEFINITION,
      titleKey: ""
    } as EditorDefinition;

    expect(() => createEditorDefinitionRegistry([invalid])).toThrowError(
      expect.objectContaining({ code: "editor_definition.invalid" })
    );
  });

  it("rejects duplicate editor IDs", () => {
    expect(() => createEditorDefinitionRegistry([
      LAYOUT_3D_EDITOR_DEFINITION,
      { ...LAYOUT_3D_EDITOR_DEFINITION }
    ])).toThrowError(expect.objectContaining({ code: "editor_definition.duplicate" }));
  });

  it("preserves registration order", () => {
    const definitions = [
      createDefinition("editor.first"),
      createDefinition("editor.second"),
      createDefinition("editor.third")
    ];

    const registry = createEditorDefinitionRegistry(definitions);

    expect(registry.definitions.map(({ id }) => id)).toEqual([
      "editor.first",
      "editor.second",
      "editor.third"
    ]);
  });

  it("fails require with a stable code for an unknown editor", () => {
    const registry = createEditorDefinitionRegistry([LAYOUT_3D_EDITOR_DEFINITION]);

    try {
      registry.require("editor.missing");
      throw new Error("Expected require() to reject an unknown editor.");
    } catch (error) {
      expect(error).toBeInstanceOf(EditorDefinitionRegistryError);
      expect(error).toMatchObject({
        code: "editor_definition.unknown",
        editorId: "editor.missing"
      });
    }
  });

  it("does not mutate caller input and exposes frozen snapshots", () => {
    const input = [createDefinition("editor.mutable")];
    const originalDefinition = input[0];

    const registry = createEditorDefinitionRegistry(input);

    expect(input).toEqual([originalDefinition]);
    expect(input[0]).toBe(originalDefinition);
    expect(registry.definitions[0]).not.toBe(originalDefinition);
    expect(Object.isFrozen(registry)).toBe(true);
    expect(Object.isFrozen(registry.definitions)).toBe(true);
    expect(Object.isFrozen(registry.definitions[0])).toBe(true);
  });
});
