import type { EditorDefinition, EditorId } from "./contracts";
import { validateEditorDefinition } from "./phase1ArchitectureValidation";

export type EditorDefinitionRegistryErrorCode =
  | "editor_definition.invalid"
  | "editor_definition.duplicate"
  | "editor_definition.unknown";

export class EditorDefinitionRegistryError extends Error {
  readonly code: EditorDefinitionRegistryErrorCode;
  readonly editorId?: EditorId;

  constructor(
    code: EditorDefinitionRegistryErrorCode,
    message: string,
    editorId?: EditorId
  ) {
    super(message);
    this.name = "EditorDefinitionRegistryError";
    this.code = code;
    this.editorId = editorId;
  }
}

export type EditorDefinitionRegistry = Readonly<{
  definitions: readonly Readonly<EditorDefinition>[];
  has: (editorId: EditorId) => boolean;
  get: (editorId: EditorId) => Readonly<EditorDefinition> | undefined;
  require: (editorId: EditorId) => Readonly<EditorDefinition>;
}>;

const formatValidationErrors = (
  errors: ReturnType<typeof validateEditorDefinition>["errors"]
) => errors.map((error) => `${error.code}@${error.path}`).join(", ");

export const createEditorDefinitionRegistry = (
  definitions: readonly EditorDefinition[]
): EditorDefinitionRegistry => {
  const orderedDefinitions: Readonly<EditorDefinition>[] = [];
  const definitionsById = new Map<EditorId, Readonly<EditorDefinition>>();

  definitions.forEach((definition) => {
    const validation = validateEditorDefinition(definition);
    if (!validation.valid) {
      const editorId = typeof definition.id === "string" && definition.id.length > 0
        ? definition.id
        : undefined;
      throw new EditorDefinitionRegistryError(
        "editor_definition.invalid",
        `Invalid editor definition${editorId ? ` "${editorId}"` : ""}: ${formatValidationErrors(validation.errors)}.`,
        editorId
      );
    }
    if (definitionsById.has(definition.id)) {
      throw new EditorDefinitionRegistryError(
        "editor_definition.duplicate",
        `Duplicate editor definition "${definition.id}".`,
        definition.id
      );
    }

    const snapshot = Object.freeze({ ...definition });
    orderedDefinitions.push(snapshot);
    definitionsById.set(snapshot.id, snapshot);
  });

  const immutableDefinitions = Object.freeze([...orderedDefinitions]);
  return Object.freeze({
    definitions: immutableDefinitions,
    has: (editorId: EditorId) => definitionsById.has(editorId),
    get: (editorId: EditorId) => definitionsById.get(editorId),
    require: (editorId: EditorId) => {
      const definition = definitionsById.get(editorId);
      if (!definition) {
        throw new EditorDefinitionRegistryError(
          "editor_definition.unknown",
          `Unknown editor definition "${editorId}".`,
          editorId
        );
      }
      return definition;
    }
  });
};
