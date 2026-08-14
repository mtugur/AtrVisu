// @vitest-environment jsdom

import { createElement } from "react";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { describe, expect, it, vi } from "vitest";
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
        root: { id: "root", name: "Root", children: [], items: [] }
      }],
      warnings: [],
      loadError: ""
    });
    const container = document.createElement("div");
    const root = createRoot(container);
    await act(async () => {
      root.render(createElement(MachineLibrary, {
        onAddMachine: vi.fn(),
        isLibraryManagerOpen: false,
        isTaxonomyManagerOpen: false,
        onOpenLibraryManager: vi.fn(),
        onCloseLibraryManager: vi.fn(),
        onOpenTaxonomyManager: vi.fn(),
        onCloseTaxonomyManager: vi.fn()
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
});
