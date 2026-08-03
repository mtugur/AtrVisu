import { createElement } from "react";
import { describe, expect, it, vi } from "vitest";
import type { EditorDefinition } from "../platform/contracts";
import { createEditorDefinitionRegistry } from "../platform/editorDefinitionRegistry";
import {
  createEditorRuntimeRegistry,
  type EditorRuntimeBinding
} from "./editorRuntimeRegistry";
import { LAYOUT_3D_EDITOR_DEFINITION } from "./layout3dEditorDefinition";

const createDefinition = (
  id: string,
  availability: EditorDefinition["availability"] = "available"
): EditorDefinition => ({
  ...LAYOUT_3D_EDITOR_DEFINITION,
  id,
  titleKey: `editor.${id}.title`,
  availability
});

describe("EditorRuntimeRegistry", () => {
  it("accepts a valid layout.3d binding without rendering it", () => {
    const render = vi.fn(() => createElement("canvas"));
    const definitions = createEditorDefinitionRegistry([LAYOUT_3D_EDITOR_DEFINITION]);

    const registry = createEditorRuntimeRegistry(definitions, [{
      editorId: "layout.3d",
      render
    }]);

    expect(registry.require("layout.3d").render).toBe(render);
    expect(render).not.toHaveBeenCalled();
  });

  it("rejects duplicate runtime binding IDs", () => {
    const definitions = createEditorDefinitionRegistry([LAYOUT_3D_EDITOR_DEFINITION]);
    const binding: EditorRuntimeBinding = {
      editorId: "layout.3d",
      render: () => null
    };

    expect(() => createEditorRuntimeRegistry(definitions, [binding, binding]))
      .toThrowError(expect.objectContaining({ code: "editor_runtime.duplicate_binding" }));
  });

  it("rejects a binding for an unknown definition", () => {
    const definitions = createEditorDefinitionRegistry([LAYOUT_3D_EDITOR_DEFINITION]);

    expect(() => createEditorRuntimeRegistry(definitions, [{
      editorId: "editor.unknown",
      render: () => null
    }])).toThrowError(expect.objectContaining({ code: "editor_runtime.unknown_definition" }));
  });

  it("rejects a missing binding for an available editor", () => {
    const definitions = createEditorDefinitionRegistry([LAYOUT_3D_EDITOR_DEFINITION]);

    expect(() => createEditorRuntimeRegistry(definitions, []))
      .toThrowError(expect.objectContaining({ code: "editor_runtime.missing_binding" }));
  });

  it("does not require bindings for unavailable or disabled editors", () => {
    const definitions = createEditorDefinitionRegistry([
      createDefinition("editor.unavailable", "unavailable"),
      createDefinition("editor.disabled", "disabled")
    ]);

    const registry = createEditorRuntimeRegistry(definitions, []);

    expect(registry.bindings).toEqual([]);
  });

  it("does not mutate caller input and exposes frozen binding snapshots", () => {
    const definitions = createEditorDefinitionRegistry([LAYOUT_3D_EDITOR_DEFINITION]);
    const binding: EditorRuntimeBinding = {
      editorId: "layout.3d",
      render: () => null
    };
    const input = [binding];

    const registry = createEditorRuntimeRegistry(definitions, input);

    expect(input).toEqual([binding]);
    expect(input[0]).toBe(binding);
    expect(registry.bindings[0]).not.toBe(binding);
    expect(Object.isFrozen(registry)).toBe(true);
    expect(Object.isFrozen(registry.bindings)).toBe(true);
    expect(Object.isFrozen(registry.bindings[0])).toBe(true);
  });
});
