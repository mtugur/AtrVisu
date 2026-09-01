// @vitest-environment jsdom

import { createElement } from "react";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { describe, expect, it, vi } from "vitest";
import { createAssetBrowserPreferencesRuntime } from "../assetBrowser";
import type { LibraryMachineItem } from "../types/machine";
import { loadMachineLibraries } from "../utils/libraryValidation";
import { MachineLibrary, toMachineDefinition } from "./MachineLibrary";

vi.mock("../utils/libraryValidation", () => ({
  loadMachineLibraries: vi.fn()
}));

const item: LibraryMachineItem = {
  id: "custom-atara-machine",
  name: "Custom ATARA Machine",
  type: "Custom Machine",
  category: "Custom",
  machineType: "Custom Machine",
  widthMm: 1000,
  depthMm: 2000,
  heightMm: 3000,
  width: 1,
  depth: 2,
  height: 3,
  defaultColor: "#ffffff",
  connectionPoints: [],
  ataraMachineData: {
    identity: {
      isAtaraProduct: true,
      atrId: "ATR-001",
      machineCode: "CUSTOM-001"
    },
    physical: {
      widthMm: 1000,
      depthMm: 2000,
      heightMm: 3000,
      weightKg: 1200
    }
  }
};

describe("MachineLibrary definition conversion", () => {
  it("preserves ATARA machine data when creating runtime definitions", () => {
    const definition = toMachineDefinition(item);

    expect(definition.ataraMachineData?.identity?.atrId).toBe("ATR-001");
    expect(definition.ataraMachineData?.identity?.machineCode).toBe("CUSTOM-001");
    expect(definition.ataraMachineData?.physical?.weightKg).toBe(1200);
  });

  it("keeps a long library title discoverable beside its read-only status", async () => {
    vi.mocked(loadMachineLibraries).mockResolvedValue({
      libraries: [{
        libraryId: "atara-standard",
        libraryName: "Atara Standard Library With A Long Engineering Name",
        readonly: true,
        enabled: true,
        path: "/library.json",
        root: { id: "root", name: "Root", children: [], items: [item] }
      }],
      warnings: [],
      loadError: ""
    });
    const container = document.createElement("div");
    const root = createRoot(container);
    const preferencesRuntime = createAssetBrowserPreferencesRuntime({
      read: async () => undefined,
      write: async () => undefined
    });
    await act(async () => {
      root.render(createElement(MachineLibrary, {
        onAddMachine: vi.fn(async () => true),
        isLibraryManagerOpen: false,
        isTaxonomyManagerOpen: false,
        onCloseLibraryManager: vi.fn(),
        onCloseTaxonomyManager: vi.fn(),
        preferencesRuntime
      }));
    });

    const title = container.querySelector<HTMLButtonElement>(".library-title")!;
    const name = title.querySelector("strong")!;
    const status = title.querySelector("small")!;
    expect(name.textContent).toBe("Atara Standard Library With A Long Engineering Name");
    expect(name.getAttribute("title")).toBe(name.textContent);
    expect(title.title).toContain("Read-only");
    expect(status.textContent).toBe("Read-only");

    await act(async () => root.unmount());
  });

  it("renders real browser controls and records Recent only after an explicit successful Add", async () => {
    vi.mocked(loadMachineLibraries).mockResolvedValue({
      libraries: [{
        libraryId: "atara-standard",
        libraryName: "Atara Standard Library",
        readonly: true,
        enabled: true,
        path: "/library.json",
        root: { id: "root", name: "Root", children: [], items: [item] }
      }],
      warnings: [],
      loadError: ""
    });
    const writes: unknown[] = [];
    const preferencesRuntime = createAssetBrowserPreferencesRuntime({
      read: async () => undefined,
      write: async (preferences) => {
        writes.push(preferences);
      }
    });
    const onAddMachine = vi.fn(async () => true);
    const container = document.createElement("div");
    const root = createRoot(container);
    await act(async () => {
      root.render(createElement(MachineLibrary, {
        onAddMachine,
        isLibraryManagerOpen: false,
        isTaxonomyManagerOpen: false,
        onCloseLibraryManager: vi.fn(),
        onCloseTaxonomyManager: vi.fn(),
        preferencesRuntime
      }));
    });

    const search = container.querySelector<HTMLInputElement>('input[type="search"]')!;
    expect(search.placeholder).toBe("Search assets…");
    expect(container.querySelector('[aria-label="Library tools"]')).toBeNull();
    expect(container.querySelector(".asset-card button button")).toBeNull();
    const favorite = container.querySelector<HTMLButtonElement>('[aria-label="Add Custom ATARA Machine to favorites"]')!;
    expect(favorite.getAttribute("aria-pressed")).toBe("false");
    await act(async () => favorite.click());
    expect(favorite.getAttribute("aria-pressed")).toBe("true");

    const add = container.querySelector<HTMLButtonElement>('.machine-card[title="Add Custom ATARA Machine"]')!;
    await act(async () => add.click());
    expect(onAddMachine).toHaveBeenCalledTimes(1);
    expect(writes.length).toBeGreaterThan(0);

    const recent = [...container.querySelectorAll<HTMLButtonElement>(".asset-browser-scopes button")]
      .find((button) => button.textContent === "Recent")!;
    await act(async () => recent.click());
    expect(container.textContent).toContain("Custom ATARA Machine");

    await act(async () => root.unmount());
  });

  it("does not record Recent when the canonical add operation is not executed", async () => {
    vi.mocked(loadMachineLibraries).mockResolvedValue({
      libraries: [{
        libraryId: "atara-standard",
        libraryName: "Atara Standard Library",
        readonly: true,
        enabled: true,
        path: "/library.json",
        root: { id: "root", name: "Root", children: [], items: [item] }
      }],
      warnings: [],
      loadError: ""
    });
    const preferencesRuntime = createAssetBrowserPreferencesRuntime({
      read: async () => undefined,
      write: async () => undefined
    });
    const container = document.createElement("div");
    const root = createRoot(container);
    await act(async () => root.render(createElement(MachineLibrary, {
      onAddMachine: vi.fn(async () => false),
      isLibraryManagerOpen: false,
      isTaxonomyManagerOpen: false,
      onCloseLibraryManager: vi.fn(),
      onCloseTaxonomyManager: vi.fn(),
      preferencesRuntime
    })));

    await act(async () => container.querySelector<HTMLButtonElement>(".machine-card")?.click());
    const recent = [...container.querySelectorAll<HTMLButtonElement>(".asset-browser-scopes button")]
      .find((button) => button.textContent === "Recent")!;
    await act(async () => recent.click());
    expect(container.textContent).toContain("No recent assets yet.");

    await act(async () => root.unmount());
  });
});
