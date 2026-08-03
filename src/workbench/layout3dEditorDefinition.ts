import {
  EDITOR_DEFINITION_SCHEMA_VERSION,
  type EditorDefinition
} from "../platform/contracts";

export const LAYOUT_3D_EDITOR_ID = "layout.3d" as const;

export const LAYOUT_3D_EDITOR_DEFINITION = Object.freeze({
  schemaVersion: EDITOR_DEFINITION_SCHEMA_VERSION,
  id: LAYOUT_3D_EDITOR_ID,
  kind: "visual",
  titleKey: "editor.layout3d.title",
  tooltipKey: "editor.layout3d.tooltip",
  availability: "available"
} satisfies EditorDefinition);
