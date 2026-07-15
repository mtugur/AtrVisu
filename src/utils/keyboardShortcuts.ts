import {
  CORE_EDITOR_COMMAND_IDS,
  type CoreEditorCommandId
} from "../platform/runtimeCommands/coreEditorRuntimeCommands";

export const isTextEditingElement = (target: EventTarget | null): boolean => {
  if (typeof HTMLElement === "undefined" || !(target instanceof HTMLElement)) {
    return false;
  }

  return (
    (typeof HTMLInputElement !== "undefined" && target instanceof HTMLInputElement) ||
    (typeof HTMLTextAreaElement !== "undefined" && target instanceof HTMLTextAreaElement) ||
    (typeof HTMLSelectElement !== "undefined" && target instanceof HTMLSelectElement) ||
    target.isContentEditable ||
    target.closest("[contenteditable='true']") !== null
  );
};

export type EditorShortcutAction =
  | "duplicate-selected"
  | "delete-selected"
  | "undo"
  | "redo"
  | "clear-selection"
  | "nudge-left"
  | "nudge-right"
  | "nudge-forward"
  | "nudge-back";

export type EditorShortcutEvent = {
  key: string;
  target: EventTarget | null;
  ctrlKey?: boolean;
  metaKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
  repeat?: boolean;
  modalOpen?: boolean;
};

const editorShortcutCommandIds: Partial<Record<EditorShortcutAction, CoreEditorCommandId>> = {
  "duplicate-selected": CORE_EDITOR_COMMAND_IDS.duplicateSelected,
  "delete-selected": CORE_EDITOR_COMMAND_IDS.deleteSelected,
  undo: CORE_EDITOR_COMMAND_IDS.undo,
  redo: CORE_EDITOR_COMMAND_IDS.redo
};

export const getEditorCommandIdForShortcutAction = (
  action: EditorShortcutAction
) => editorShortcutCommandIds[action] ?? null;

export const shouldIgnoreEditorShortcuts = (
  target: EventTarget | null,
  modalOpen = false
) => modalOpen || isTextEditingElement(target);

export const resolveEditorShortcut = (
  event: EditorShortcutEvent
): EditorShortcutAction | null => {
  if (shouldIgnoreEditorShortcuts(event.target, event.modalOpen)) {
    return null;
  }

  const key = event.key.toLowerCase();
  const commandModifier = Boolean(event.ctrlKey || event.metaKey);

  if (commandModifier && !event.altKey && key === "d" && !event.shiftKey) {
    return event.repeat ? null : "duplicate-selected";
  }

  if (commandModifier && !event.altKey && key === "z") {
    return event.shiftKey ? "redo" : "undo";
  }

  if (commandModifier && !event.altKey && key === "y" && !event.shiftKey) {
    return "redo";
  }

  if (!commandModifier && !event.altKey && !event.shiftKey && key === "delete") {
    return event.repeat ? null : "delete-selected";
  }

  if (!commandModifier && !event.altKey && !event.shiftKey && key === "escape") {
    return event.repeat ? null : "clear-selection";
  }

  if (event.metaKey) {
    return null;
  }

  return ({
    arrowleft: "nudge-left",
    arrowright: "nudge-right",
    arrowup: "nudge-forward",
    arrowdown: "nudge-back"
  } as const)[key] ?? null;
};

export const shouldPreventEditorShortcutDefault = (
  action: EditorShortcutAction | null,
  handled: boolean
) => action !== null && handled;

export const shouldHandleGlobalUndoRedo = (
  event: Pick<KeyboardEvent, "target" | "ctrlKey" | "metaKey" | "key"> & { shiftKey?: boolean }
) => {
  const action = resolveEditorShortcut(event);
  return action === "undo" || action === "redo";
};
