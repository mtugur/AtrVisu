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

const setNativeInputValue = (control: HTMLInputElement, value: string) => {
  const prototype = HTMLInputElement.prototype;
  const setter = Object.getOwnPropertyDescriptor(prototype, "value")?.set;
  setter?.call(control, value);
  control.dispatchEvent(new Event("input", { bubbles: true }));
};

const setNativeSelectValue = (control: HTMLSelectElement, value: string) => {
  const setter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value")?.set;
  setter?.call(control, value);
  control.dispatchEvent(new Event("change", { bubbles: true }));
};

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
        onAddCivilReference: vi.fn(async () => true),
        isLibraryManagerOpen: false,
        isTaxonomyManagerOpen: false,
        onCloseLibraryManager: vi.fn(),
        onCloseTaxonomyManager: vi.fn(),
        preferencesRuntime
      }));
    });

    const title = container.querySelector<HTMLButtonElement>('.library-card:not([data-testid="build-library-root"]) .library-title')!;
    const name = title.querySelector("strong")!;
    const status = title.querySelector("small")!;
    expect(name.textContent).toBe("Atara Standard Library With A Long Engineering Name");
    expect(name.getAttribute("title")).toBe(name.textContent);
    expect(title.title).toContain("Read-only");
    expect(status.textContent).toBe("Read-only");
    expect(title.getAttribute("aria-expanded")).toBe("true");
    expect(title.querySelectorAll("svg")).toHaveLength(1);

    await act(async () => root.unmount());
  });

  it("renders a redundant library root identity once and promotes its real children", async () => {
    vi.mocked(loadMachineLibraries).mockResolvedValue({
      libraries: [{
        libraryId: "atara-standard",
        libraryName: "Atara Standard Library",
        readonly: true,
        enabled: true,
        path: "/library.json",
        root: {
          id: "root",
          name: "Atara Standard Library",
          children: [{ id: "packaging", name: "Packaging Lines", children: [], items: [item] }],
          items: []
        }
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

    await act(async () => root.render(createElement(MachineLibrary, {
      onAddMachine: vi.fn(async () => true),
      onAddCivilReference: vi.fn(async () => true),
      isLibraryManagerOpen: false,
      isTaxonomyManagerOpen: false,
      onCloseLibraryManager: vi.fn(),
      onCloseTaxonomyManager: vi.fn(),
      preferencesRuntime
    })));

    expect(container.querySelectorAll('.library-card:not([data-testid="build-library-root"]) .library-title strong')).toHaveLength(1);
    expect(container.querySelectorAll('.library-card:not([data-testid="build-library-root"]) .library-tree-toggle strong')).toHaveLength(1);
    expect(container.querySelector('.library-card:not([data-testid="build-library-root"]) .library-title strong')?.textContent).toBe("Atara Standard Library");
    expect(container.querySelector('.library-card:not([data-testid="build-library-root"]) .library-tree-toggle strong')?.textContent).toBe("Packaging Lines");
    expect(container.querySelector(".library-tree-children.is-root-content")).not.toBeNull();

    await act(async () => root.unmount());
  });

  it("keeps Library clear actions compact while preserving their existing state resets", async () => {
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
    const container = document.createElement("div");
    const root = createRoot(container);
    const preferencesRuntime = createAssetBrowserPreferencesRuntime({
      read: async () => undefined,
      write: async () => undefined
    });
    await act(async () => root.render(createElement(MachineLibrary, {
      onAddMachine: vi.fn(async () => true),
      onAddCivilReference: vi.fn(async () => true),
      isLibraryManagerOpen: false,
      isTaxonomyManagerOpen: false,
      onCloseLibraryManager: vi.fn(),
      onCloseTaxonomyManager: vi.fn(),
      preferencesRuntime
    })));

    const search = container.querySelector<HTMLInputElement>('input[type="search"]')!;
    await act(async () => {
      setNativeInputValue(search, "Custom");
    });
    const clearAll = container.querySelector<HTMLButtonElement>('[aria-label="Clear search and filters"]')!;
    expect(clearAll.title).toBe("Clear search and filters");
    expect(clearAll.textContent).toBe("");
    expect(clearAll.querySelectorAll("svg")).toHaveLength(1);
    await act(async () => clearAll.click());
    expect(search.value).toBe("");

    const filtersToggle = [...container.querySelectorAll<HTMLButtonElement>("button")]
      .find((button) => button.textContent?.includes("Filters"))!;
    await act(async () => filtersToggle.click());
    const clearFilters = container.querySelector<HTMLButtonElement>('[aria-label="Clear filters"]')!;
    expect(clearFilters.disabled).toBe(true);
    expect(clearFilters.title).toBe("Clear filters");
    expect(clearFilters.textContent).toBe("");
    expect(clearFilters.querySelectorAll("svg")).toHaveLength(1);

    await act(async () => root.unmount());
  });

  it("captures filter values before React releases the change event", async () => {
    vi.mocked(loadMachineLibraries).mockResolvedValue({
      libraries: [{
        libraryId: "atara-standard",
        libraryName: "Atara Standard Library",
        readonly: true,
        enabled: true,
        path: "/library.json",
        root: {
          id: "root",
          name: "Root",
          children: [{ id: "conveying", name: "Conveying", children: [], items: [item] }],
          items: []
        }
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
    await act(async () => root.render(createElement(MachineLibrary, {
      onAddMachine: vi.fn(async () => true),
      onAddCivilReference: vi.fn(async () => true),
      isLibraryManagerOpen: false,
      isTaxonomyManagerOpen: false,
      onCloseLibraryManager: vi.fn(),
      onCloseTaxonomyManager: vi.fn(),
      preferencesRuntime
    })));

    const filtersToggle = [...container.querySelectorAll<HTMLButtonElement>("button")]
      .find((button) => button.textContent?.includes("Filters"))!;
    await act(async () => filtersToggle.click());
    const source = container.querySelector<HTMLSelectElement>('[aria-label="Asset source"]')!;
    const category = container.querySelector<HTMLSelectElement>('[aria-label="Asset category"]')!;
    await act(async () => {
      setNativeSelectValue(source, "atara-standard");
      setNativeSelectValue(category, "Custom");
    });

    expect(source.value).toBe("atara-standard");
    expect(category.value).toBe("Custom");
    expect(container.querySelector('[aria-label="Clear filters"]')).not.toBeNull();

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
        onAddCivilReference: vi.fn(async () => true),
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

    const add = container.querySelector<HTMLButtonElement>('.machine-card[title="Add Custom ATARA Machine to layout"]')!;
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
      onAddCivilReference: vi.fn(async () => true),
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

  it("discovers Build and machine assets in one browser and dispatches each to its own placement authority", async () => {
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
    const onAddMachine = vi.fn(async () => true);
    const onAddCivilReference = vi.fn(async () => true);
    const container = document.createElement("div");
    const root = createRoot(container);
    await act(async () => root.render(createElement(MachineLibrary, {
      onAddMachine,
      onAddCivilReference,
      isLibraryManagerOpen: false,
      isTaxonomyManagerOpen: false,
      onCloseLibraryManager: vi.fn(),
      onCloseTaxonomyManager: vi.fn()
    })));

    expect(container.querySelector('[data-testid="build-library-root"]')).not.toBeNull();
    expect(container.querySelector('[data-asset-kind="machine"]')).not.toBeNull();
    const structure = container.querySelector<HTMLButtonElement>('[data-testid="build-group-structure"] button')!;
    await act(async () => structure.click());
    const beam = container.querySelector<HTMLElement>('[data-testid="asset-card-build::beam"]')!;
    expect(beam.dataset.assetKind).toBe("civil");
    expect(beam.querySelector('[title="Create Custom Variant of Beam"]')).toBeNull();
    await act(async () => beam.querySelector<HTMLButtonElement>('[title="Add Beam to layout"]')!.click());
    expect(onAddCivilReference).toHaveBeenCalledExactlyOnceWith("beam");
    expect(onAddMachine).not.toHaveBeenCalled();

    await act(async () => container.querySelector<HTMLButtonElement>('[title="Add Custom ATARA Machine to layout"]')!.click());
    expect(onAddMachine).toHaveBeenCalledTimes(1);
    expect(onAddMachine).toHaveBeenCalledWith(expect.objectContaining({
      definition: expect.objectContaining({ name: "Custom ATARA Machine" })
    }));

    const search = container.querySelector<HTMLInputElement>('input[type="search"]')!;
    await act(async () => setNativeInputValue(search, "wall"));
    expect(container.querySelector('[data-testid="asset-card-build::wall"]')).not.toBeNull();
    expect(container.querySelector('[data-asset-kind="machine"]')).toBeNull();
    await act(async () => root.unmount());
  });
});
