// @vitest-environment jsdom

import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { EmptyProjectWelcome } from "./EmptyProjectWelcome";

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

describe("EmptyProjectWelcome", () => {
  it("offers both canonical project-entry routes without creating local project state", async () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);
    roots.push(root);
    const onCreateNewLayout = vi.fn();
    const onOpenExistingProject = vi.fn();
    await act(async () => root.render(createElement(EmptyProjectWelcome, {
      onCreateNewLayout,
      onOpenExistingProject
    })));
    const buttons = [...container.querySelectorAll<HTMLButtonElement>("button")];
    expect(buttons.map((button) => button.textContent)).toEqual(["Create New Layout", "Open Existing Project"]);
    await act(async () => buttons[0]?.click());
    await act(async () => buttons[1]?.click());
    expect(onCreateNewLayout).toHaveBeenCalledTimes(1);
    expect(onOpenExistingProject).toHaveBeenCalledTimes(1);
  });
});
