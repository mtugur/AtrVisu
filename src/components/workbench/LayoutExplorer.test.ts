// @vitest-environment jsdom

import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { PlatformEntity, SelectionState } from "../../platform/contracts";
import { LayoutExplorer } from "./LayoutExplorer";

const actEnvironment = globalThis as typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean;
};
actEnvironment.IS_REACT_ACT_ENVIRONMENT = true;

const roots: ReturnType<typeof createRoot>[] = [];

const entity = (updates: Partial<PlatformEntity> = {}): PlatformEntity => ({
  id: "machine:one",
  type: "machine",
  name: "Flow Pack Machine",
  transform: { planX: 0, planY: 0, elevation: 0, rotationDeg: 0 },
  properties: [],
  connectors: [],
  childrenIds: [],
  visible: true,
  locked: false,
  selectable: true,
  ...updates
});

const selection: SelectionState = {
  ids: ["machine:one"],
  primaryId: "machine:one",
  source: "explorer"
};

afterEach(async () => {
  await act(async () => {
    roots.splice(0).forEach((root) => root.unmount());
  });
  document.body.replaceChildren();
});

const dispatchInput = (input: HTMLInputElement, value: string) => {
  const valueSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
  valueSetter?.call(input, value);
  input.dispatchEvent(new Event("input", { bubbles: true }));
};

describe("LayoutExplorer rename interaction", () => {
  it("commits Enter and cancels Escape or blur through the provided command callback", async () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);
    roots.push(root);
    const onRenameEntity = vi.fn(() => true);
    const render = async (version: number) => act(async () => root.render(createElement(LayoutExplorer, {
      entities: [entity()],
      selection,
      layerNames: new Map(),
      onSelectEntity: vi.fn(),
      renameRequestEntityId: "machine:one",
      renameRequestVersion: version,
      onRenameEntity
    })));

    await render(1);
    let input = container.querySelector("input") as HTMLInputElement;
    await act(async () => {
      dispatchInput(input, "Flow Pack Machine - Line 2");
      input.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
      await Promise.resolve();
    });
    expect(onRenameEntity).toHaveBeenCalledWith("machine:one", "Flow Pack Machine - Line 2");
    expect(container.querySelector("input")).toBeNull();

    await render(2);
    input = container.querySelector("input") as HTMLInputElement;
    await act(async () => input.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true })));
    expect(onRenameEntity).toHaveBeenCalledTimes(1);
    expect(container.querySelector("input")).toBeNull();

    await render(3);
    input = container.querySelector("input") as HTMLInputElement;
    await act(async () => input.blur());
    expect(onRenameEntity).toHaveBeenCalledTimes(1);
  });

  it("does not expose inline rename for locked or unsupported entities", async () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);
    roots.push(root);
    await act(async () => root.render(createElement(LayoutExplorer, {
      entities: [
        entity({ locked: true }),
        entity({ id: "annotation:one", type: "annotation", name: "Note" })
      ],
      selection,
      layerNames: new Map(),
      onSelectEntity: vi.fn(),
      renameRequestEntityId: "machine:one",
      renameRequestVersion: 1,
      onRenameEntity: vi.fn(() => true)
    })));

    expect(container.querySelector("input")).toBeNull();
  });
});
