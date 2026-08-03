import type { EditorId } from "../platform/contracts";
import type { EditorDefinitionRegistry } from "../platform/editorDefinitionRegistry";
import type { EditorRuntimeRegistry } from "../workbench/editorRuntimeRegistry";

type EditorHostProps = {
  activeEditorId: EditorId;
  definitionRegistry: EditorDefinitionRegistry;
  runtimeRegistry: EditorRuntimeRegistry;
};

type EditorHostFailure = Readonly<{
  code: "unknown" | "unavailable" | "disabled" | "missing-binding";
  message: string;
}>;

const getEditorHostFailure = (
  activeEditorId: EditorId,
  definitionRegistry: EditorDefinitionRegistry,
  runtimeRegistry: EditorRuntimeRegistry
): EditorHostFailure | undefined => {
  const definition = definitionRegistry.get(activeEditorId);
  if (!definition) {
    return {
      code: "unknown",
      message: `Editor "${activeEditorId}" is not registered.`
    };
  }
  if (definition.availability === "unavailable") {
    return {
      code: "unavailable",
      message: `Editor "${activeEditorId}" is unavailable.`
    };
  }
  if (definition.availability === "disabled") {
    return {
      code: "disabled",
      message: `Editor "${activeEditorId}" is disabled.`
    };
  }
  if (!runtimeRegistry.has(activeEditorId)) {
    return {
      code: "missing-binding",
      message: `Editor "${activeEditorId}" has no runtime binding.`
    };
  }
  return undefined;
};

export function EditorHost({
  activeEditorId,
  definitionRegistry,
  runtimeRegistry
}: EditorHostProps) {
  const failure = getEditorHostFailure(
    activeEditorId,
    definitionRegistry,
    runtimeRegistry
  );

  return (
    <div
      data-testid="editor-host"
      data-active-editor-id={activeEditorId}
      style={{ position: "absolute", inset: 0, minWidth: 0, overflow: "hidden" }}
    >
      {failure ? (
        <section
          role="alert"
          data-testid="editor-host-fallback"
          data-editor-host-error={failure.code}
        >
          {failure.message}
        </section>
      ) : runtimeRegistry.require(activeEditorId).render()}
    </div>
  );
}
