// @vitest-environment jsdom

import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { HelpModal } from "./HelpModal";

const actEnvironment = globalThis as typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean;
};
actEnvironment.IS_REACT_ACT_ENVIRONMENT = true;

const roots: ReturnType<typeof createRoot>[] = [];

afterEach(async () => {
  await act(async () => {
    roots.splice(0).forEach((root) => root.unmount());
  });
  document.body.replaceChildren();
});

describe("HelpModal", () => {
  it("renders real guidance, closes with Escape, and restores its opener", async () => {
    const opener = document.createElement("button");
    opener.textContent = "Help";
    document.body.appendChild(opener);
    opener.focus();
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);
    roots.push(root);
    const onClose = vi.fn();
    await act(async () => root.render(createElement(HelpModal, {
      initialSection: "quick-start",
      onClose
    })));

    const dialog = container.querySelector('[role="dialog"]') as HTMLElement;
    expect(dialog.getAttribute("aria-modal")).toBe("true");
    expect(dialog.textContent).toContain("Library");
    expect(dialog.textContent).toContain("Arrange");
    expect(dialog.textContent).toContain("Selection Tools");
    expect(dialog.textContent).toContain("Engineering Command Strip");
    expect(dialog.textContent).toContain("recovery");
    expect(dialog.textContent).toContain("Viewpoints");
    expect(dialog.textContent).toContain("Commercial Outputs");
    expect(dialog.contains(document.activeElement)).toBe(true);

    const focusable = [...dialog.querySelectorAll<HTMLElement>(
      "button:not([disabled]), [tabindex]:not([tabindex='-1'])"
    )];
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    last?.focus();
    await act(async () => document.dispatchEvent(new KeyboardEvent("keydown", {
      key: "Tab",
      bubbles: true
    })));
    expect(document.activeElement).toBe(first);
    first?.focus();
    await act(async () => document.dispatchEvent(new KeyboardEvent("keydown", {
      key: "Tab",
      shiftKey: true,
      bubbles: true
    })));
    expect(document.activeElement).toBe(last);

    await act(async () => document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true })));
    expect(onClose).toHaveBeenCalledTimes(1);
    await act(async () => root.unmount());
    roots.pop();
    expect(document.activeElement).toBe(opener);
  });

  it("shows only current real shortcuts and the shared application version", async () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);
    roots.push(root);
    await act(async () => root.render(createElement(HelpModal, {
      initialSection: "shortcuts",
      onClose: vi.fn()
    })));
    expect(container.textContent).toContain("F2");
    expect(container.textContent).toContain("Ctrl/Cmd+D");
    const about = [...container.querySelectorAll<HTMLButtonElement>("button")]
      .find((button) => button.textContent === "About AtrVisu");
    await act(async () => about?.click());
    expect(container.textContent).toContain("Version 0.1.0");
  });
});
