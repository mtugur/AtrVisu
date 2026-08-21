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
    expect(dialog.querySelectorAll(".help-task-card")).toHaveLength(4);
    expect(dialog.textContent).toContain("Start or open a layout");
    expect(dialog.textContent).toContain("Present and export");
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

  it("provides all product help sections without internal development language", async () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);
    roots.push(root);
    await act(async () => root.render(createElement(HelpModal, {
      initialSection: "shortcuts",
      onClose: vi.fn()
    })));
    const expectedSections = [
      "Quick Start",
      "Workbench",
      "Arrange & Snap",
      "Measurements",
      "Viewpoints",
      "Outputs",
      "Keyboard Shortcuts",
      "About"
    ];
    const sectionButtons = [...container.querySelectorAll<HTMLButtonElement>(".help-dialog-nav button")];
    expect(sectionButtons.map((button) => button.textContent?.trim())).toEqual(expectedSections);
    expect(container.querySelectorAll("kbd").length).toBeGreaterThan(0);
    expect(container.textContent).toContain("F2");
    expect(container.textContent).toContain("Arrow keys");

    for (const button of sectionButtons) {
      await act(async () => button.click());
      const visibleText = container.querySelector(".help-dialog-content")?.textContent?.toLowerCase() ?? "";
      for (const forbidden of ["pull request", "product rule", "canonical", "registry", "phase", "pf-"]) {
        expect(visibleText).not.toContain(forbidden);
      }
    }

    const about = sectionButtons.find((button) => button.textContent?.trim() === "About");
    await act(async () => about?.click());
    expect(container.textContent).toContain("Version 0.1.0");
  });
});
