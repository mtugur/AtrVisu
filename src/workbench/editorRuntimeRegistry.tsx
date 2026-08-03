import type { ReactNode } from "react";
import type { EditorId } from "../platform/contracts";
import type { EditorDefinitionRegistry } from "../platform/editorDefinitionRegistry";

export type EditorRuntimeBinding = Readonly<{
  editorId: EditorId;
  render: () => ReactNode;
}>;

export type EditorRuntimeRegistryErrorCode =
  | "editor_runtime.duplicate_binding"
  | "editor_runtime.unknown_definition"
  | "editor_runtime.missing_binding"
  | "editor_runtime.unknown_binding";

export class EditorRuntimeRegistryError extends Error {
  readonly code: EditorRuntimeRegistryErrorCode;
  readonly editorId: EditorId;

  constructor(
    code: EditorRuntimeRegistryErrorCode,
    message: string,
    editorId: EditorId
  ) {
    super(message);
    this.name = "EditorRuntimeRegistryError";
    this.code = code;
    this.editorId = editorId;
  }
}

export type EditorRuntimeRegistry = Readonly<{
  bindings: readonly EditorRuntimeBinding[];
  has: (editorId: EditorId) => boolean;
  get: (editorId: EditorId) => EditorRuntimeBinding | undefined;
  require: (editorId: EditorId) => EditorRuntimeBinding;
}>;

export const createEditorRuntimeRegistry = (
  definitionRegistry: EditorDefinitionRegistry,
  bindings: readonly EditorRuntimeBinding[]
): EditorRuntimeRegistry => {
  const orderedBindings: EditorRuntimeBinding[] = [];
  const bindingsById = new Map<EditorId, EditorRuntimeBinding>();

  bindings.forEach((binding) => {
    if (!definitionRegistry.has(binding.editorId)) {
      throw new EditorRuntimeRegistryError(
        "editor_runtime.unknown_definition",
        `Runtime binding references unknown editor definition "${binding.editorId}".`,
        binding.editorId
      );
    }
    if (bindingsById.has(binding.editorId)) {
      throw new EditorRuntimeRegistryError(
        "editor_runtime.duplicate_binding",
        `Duplicate runtime binding for editor "${binding.editorId}".`,
        binding.editorId
      );
    }

    const snapshot = Object.freeze({ ...binding });
    orderedBindings.push(snapshot);
    bindingsById.set(snapshot.editorId, snapshot);
  });

  definitionRegistry.definitions.forEach((definition) => {
    if (definition.availability === "available" && !bindingsById.has(definition.id)) {
      throw new EditorRuntimeRegistryError(
        "editor_runtime.missing_binding",
        `Available editor "${definition.id}" requires a runtime binding.`,
        definition.id
      );
    }
  });

  const immutableBindings = Object.freeze([...orderedBindings]);
  return Object.freeze({
    bindings: immutableBindings,
    has: (editorId: EditorId) => bindingsById.has(editorId),
    get: (editorId: EditorId) => bindingsById.get(editorId),
    require: (editorId: EditorId) => {
      const binding = bindingsById.get(editorId);
      if (!binding) {
        throw new EditorRuntimeRegistryError(
          "editor_runtime.unknown_binding",
          `Unknown runtime binding for editor "${editorId}".`,
          editorId
        );
      }
      return binding;
    }
  });
};
