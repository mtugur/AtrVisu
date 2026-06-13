import { afterEach, describe, expect, it } from "vitest";
import { isTextEditingElement, shouldHandleGlobalUndoRedo } from "./keyboardShortcuts";

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

  it("blocks global undo and redo inside contenteditable regions", () => {
    installFakeDomClasses();
    const editor = new FakeHTMLElement();
    editor.isContentEditable = true;
    const child = new FakeHTMLElement();
    child.parent = editor;

    expect(isTextEditingElement(editor)).toBe(true);
    expect(isTextEditingElement(child)).toBe(true);
    expect(shouldHandleGlobalUndoRedo({ target: child, ctrlKey: true, metaKey: false, key: "z" })).toBe(false);
  });
});
