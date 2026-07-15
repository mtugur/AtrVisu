import { afterEach, describe, expect, it } from "vitest";
import {
  isTextEditingElement,
  resolveEditorShortcut,
  shouldHandleGlobalUndoRedo,
  shouldIgnoreEditorShortcuts,
  shouldPreventEditorShortcutDefault,
  type EditorShortcutEvent
} from "./keyboardShortcuts";

class FakeHTMLElement extends EventTarget {
  isContentEditable = false;
  parent: FakeHTMLElement | null = null;

  closest(selector: string) {
    if (selector !== "[contenteditable='true']") {
      return null;
    }
    let current: FakeHTMLElement | null = this;
    while (current) {
      if (current.isContentEditable) {
        return current;
      }
      current = current.parent;
    }
    return null;
  }
}

class FakeHTMLInputElement extends FakeHTMLElement {}
class FakeHTMLTextAreaElement extends FakeHTMLElement {}
class FakeHTMLSelectElement extends FakeHTMLElement {}

const originalGlobals = {
  HTMLElement: globalThis.HTMLElement,
  HTMLInputElement: globalThis.HTMLInputElement,
  HTMLTextAreaElement: globalThis.HTMLTextAreaElement,
  HTMLSelectElement: globalThis.HTMLSelectElement
};

const installFakeDomClasses = () => {
  Object.assign(globalThis, {
    HTMLElement: FakeHTMLElement,
    HTMLInputElement: FakeHTMLInputElement,
    HTMLTextAreaElement: FakeHTMLTextAreaElement,
    HTMLSelectElement: FakeHTMLSelectElement
  });
};

const shortcut = (overrides: Partial<EditorShortcutEvent>): EditorShortcutEvent => ({
  key: "",
  target: new FakeHTMLElement(),
  ctrlKey: false,
  metaKey: false,
  shiftKey: false,
  altKey: false,
  repeat: false,
  modalOpen: false,
  ...overrides
});

afterEach(() => {
  Object.assign(globalThis, originalGlobals);
});

describe("keyboard shortcut guards", () => {
  it("allows global undo and redo from non-editing targets", () => {
    installFakeDomClasses();
    const canvas = new FakeHTMLElement();
    const body = new FakeHTMLElement();

    expect(shouldHandleGlobalUndoRedo({ target: canvas, ctrlKey: true, metaKey: false, key: "z" })).toBe(true);
    expect(shouldHandleGlobalUndoRedo({ target: body, ctrlKey: true, metaKey: false, key: "y" })).toBe(true);
    expect(shouldHandleGlobalUndoRedo({ target: canvas, ctrlKey: false, metaKey: false, key: "z" })).toBe(false);
    expect(shouldHandleGlobalUndoRedo({ target: canvas, ctrlKey: true, metaKey: false, key: "a" })).toBe(false);
  });

  it("blocks global undo and redo while typing in form controls", () => {
    installFakeDomClasses();
    const input = new FakeHTMLInputElement();
    const textarea = new FakeHTMLTextAreaElement();
    const select = new FakeHTMLSelectElement();

    expect(isTextEditingElement(input)).toBe(true);
    expect(isTextEditingElement(textarea)).toBe(true);
    expect(isTextEditingElement(select)).toBe(true);
    expect(shouldHandleGlobalUndoRedo({ target: input, ctrlKey: true, metaKey: false, key: "z" })).toBe(false);
    expect(shouldHandleGlobalUndoRedo({ target: textarea, ctrlKey: true, metaKey: false, key: "y" })).toBe(false);
    expect(shouldHandleGlobalUndoRedo({ target: select, ctrlKey: true, metaKey: false, key: "z" })).toBe(false);
  });

  it("blocks global shortcuts inside contenteditable regions", () => {
    installFakeDomClasses();
    const editor = new FakeHTMLElement();
    editor.isContentEditable = true;
    const child = new FakeHTMLElement();
    child.parent = editor;

    expect(isTextEditingElement(editor)).toBe(true);
    expect(isTextEditingElement(child)).toBe(true);
    expect(shouldIgnoreEditorShortcuts(child)).toBe(true);
    expect(resolveEditorShortcut(shortcut({ target: child, key: "d", ctrlKey: true }))).toBeNull();
  });

  it("blocks editor shortcuts while a modal dialog is open", () => {
    installFakeDomClasses();

    expect(resolveEditorShortcut(shortcut({ key: "Escape", modalOpen: true }))).toBeNull();
    expect(resolveEditorShortcut(shortcut({ key: "d", ctrlKey: true, modalOpen: true }))).toBeNull();
  });
});

describe("editor shortcut resolution", () => {
  it("resolves Ctrl+D and Meta+D to duplicate selected", () => {
    installFakeDomClasses();

    expect(resolveEditorShortcut(shortcut({ key: "d", ctrlKey: true }))).toBe("duplicate-selected");
    expect(resolveEditorShortcut(shortcut({ key: "D", metaKey: true }))).toBe("duplicate-selected");
  });

  it("ignores repeated duplicate keydown", () => {
    installFakeDomClasses();

    expect(resolveEditorShortcut(shortcut({ key: "d", ctrlKey: true, repeat: true }))).toBeNull();
  });

  it("resolves Delete and ignores repeated Delete keydown", () => {
    installFakeDomClasses();

    expect(resolveEditorShortcut(shortcut({ key: "Delete" }))).toBe("delete-selected");
    expect(resolveEditorShortcut(shortcut({ key: "Delete", repeat: true }))).toBeNull();
  });

  it("resolves Ctrl/Meta undo and redo conventions", () => {
    installFakeDomClasses();

    expect(resolveEditorShortcut(shortcut({ key: "z", ctrlKey: true }))).toBe("undo");
    expect(resolveEditorShortcut(shortcut({ key: "z", metaKey: true }))).toBe("undo");
    expect(resolveEditorShortcut(shortcut({ key: "y", ctrlKey: true }))).toBe("redo");
    expect(resolveEditorShortcut(shortcut({ key: "y", metaKey: true }))).toBe("redo");
    expect(resolveEditorShortcut(shortcut({ key: "z", ctrlKey: true, shiftKey: true }))).toBe("redo");
    expect(resolveEditorShortcut(shortcut({ key: "z", metaKey: true, shiftKey: true }))).toBe("redo");
  });

  it("resolves Escape and arrow nudge actions", () => {
    installFakeDomClasses();

    expect(resolveEditorShortcut(shortcut({ key: "Escape" }))).toBe("clear-selection");
    expect(resolveEditorShortcut(shortcut({ key: "ArrowLeft" }))).toBe("nudge-left");
    expect(resolveEditorShortcut(shortcut({ key: "ArrowRight", repeat: true }))).toBe("nudge-right");
    expect(resolveEditorShortcut(shortcut({ key: "ArrowUp", shiftKey: true }))).toBe("nudge-forward");
    expect(resolveEditorShortcut(shortcut({ key: "ArrowDown", altKey: true }))).toBe("nudge-back");
  });

  it("does not intercept numeric input editing", () => {
    installFakeDomClasses();
    const numericInput = new FakeHTMLInputElement();

    expect(resolveEditorShortcut(shortcut({ target: numericInput, key: "d", ctrlKey: true }))).toBeNull();
    expect(resolveEditorShortcut(shortcut({ target: numericInput, key: "Delete" }))).toBeNull();
    expect(resolveEditorShortcut(shortcut({ target: numericInput, key: "ArrowLeft" }))).toBeNull();
    expect(resolveEditorShortcut(shortcut({ target: numericInput, key: "z", ctrlKey: true }))).toBeNull();
  });

  it("returns no action for unsupported shortcuts and browser-sensitive Meta+Arrow", () => {
    installFakeDomClasses();

    expect(resolveEditorShortcut(shortcut({ key: "b", ctrlKey: true }))).toBeNull();
    expect(resolveEditorShortcut(shortcut({ key: "ArrowLeft", metaKey: true }))).toBeNull();
    expect(resolveEditorShortcut(shortcut({ key: "Backspace" }))).toBeNull();
  });

  it("prevents browser defaults only when a resolved editor action is handled", () => {
    installFakeDomClasses();
    const duplicate = resolveEditorShortcut(shortcut({ key: "d", ctrlKey: true }));

    expect(shouldPreventEditorShortcutDefault(duplicate, true)).toBe(true);
    expect(shouldPreventEditorShortcutDefault(duplicate, false)).toBe(false);
    expect(shouldPreventEditorShortcutDefault(null, true)).toBe(false);
  });
});
