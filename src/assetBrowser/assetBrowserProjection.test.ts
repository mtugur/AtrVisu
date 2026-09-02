import { describe, expect, it } from "vitest";
import type { LibraryMachineItem, LoadedMachineLibrary } from "../types/machine";
import {
  EMPTY_ASSET_BROWSER_FILTERS,
  createAssetBrowserRecords,
  createAssetKey,
  getAssetBrowserFilterOptions,
  selectAssetBrowserRecords
} from "./assetBrowserProjection";

const createItem = (
  id: string,
  name: string,
  overrides: Partial<LibraryMachineItem> = {}
): LibraryMachineItem => ({
  id,
  name,
  type: "Packaging Machine",
  category: "Packaging",
  machineType: "Packaging Machine",
  variant: "",
  productFamilyCode: "",
  tags: [],
  placeholderVisualType: "machine-box",
  widthMm: 1000,
  depthMm: 800,
  heightMm: 1200,
  width: 1,
  depth: 0.8,
  height: 1.2,
  defaultColor: "#ffffff",
  modelPath: null,
  thumbnailPath: null,
  connectionPoints: [],
  clearance: { front: 0, back: 0, left: 0, right: 0 },
  ...overrides
});

const createLibraries = (): readonly LoadedMachineLibrary[] => [{
  libraryId: "atara-standard",
  libraryName: "Atara Standard Library",
  readonly: true,
  enabled: true,
  path: "/atara.json",
  root: {
    id: "root",
    name: "Atara Standard Library",
    children: [{
      id: "packaging",
      name: "Primary Packaging",
      children: [{
        id: "flow-pack",
        name: "Horizontal Flow Pack",
        children: [],
        items: [
          createItem("flow-pack", "Flow Pack Machine", { tags: ["pillow bag"] }),
          createItem("flow-wrapper", "Flow Wrapper", { variant: "servo" })
        ]
      }],
      items: []
    }, {
      id: "handling",
      name: "Material Handling",
      children: [{
        id: "belt",
        name: "Belt Conveyors",
        children: [],
        items: [createItem("belt", "Belt Conveyor", {
          type: "Conveyor",
          category: "Conveying",
          machineType: "Conveyor",
          productFamilyCode: "CONV"
        })]
      }],
      items: []
    }],
    items: [createItem("pallet", "Euro Pállet", {
      type: "Pallet",
      category: "Material Handling",
      machineType: "Pallet"
    })]
  }
}, {
  libraryId: "project-custom",
  libraryName: "Project Custom Library",
  readonly: false,
  enabled: true,
  path: "/custom.json",
  root: {
    id: "root",
    name: "Project Custom Library",
    children: [{
      id: "safety",
      name: "Safety",
      children: [],
      items: [createItem("fence", "Project Safety Fence", {
        type: "Safety Fence",
        category: "Safety",
        machineType: "Safety Fence"
      })]
    }],
    items: []
  }
}];

const select = (
  query = "",
  overrides: Partial<Parameters<typeof selectAssetBrowserRecords>[1]> = {}
) => selectAssetBrowserRecords(createAssetBrowserRecords(createLibraries()), {
  scope: "all",
  query,
  filters: EMPTY_ASSET_BROWSER_FILTERS,
  favoriteAssetKeys: [],
  recentAssetKeys: [],
  ...overrides
});

describe("asset browser projection", () => {
  it("creates stable keys and preserves canonical child-before-root order", () => {
    const records = createAssetBrowserRecords(createLibraries());

    expect(records.map((record) => record.assetKey)).toEqual([
      "atara-standard::flow-pack",
      "atara-standard::flow-wrapper",
      "atara-standard::belt",
      "atara-standard::pallet",
      "project-custom::fence"
    ]);
    expect(createAssetKey("library", "asset")).toBe("library::asset");
    expect(records[0].familyLabel).toBe("Horizontal Flow Pack");
    expect(records[2].familyLabel).toBe("CONV");
  });

  it("ranks exact, prefix, partial, semantic, and group matches deterministically", () => {
    expect(select("Flow Pack Machine").map((record) => record.item.id)).toEqual([
      "flow-pack",
      "flow-wrapper"
    ]);
    expect(select("flow").map((record) => record.item.id)).toEqual(["flow-pack", "flow-wrapper"]);
    expect(select("wrapper").map((record) => record.item.id)).toEqual(["flow-wrapper"]);
    expect(select("conveying").map((record) => record.item.id)).toEqual(["belt"]);
    expect(select("horizontal pillow").map((record) => record.item.id)).toEqual(["flow-pack"]);
    expect(select("pallet").map((record) => record.item.id)).toEqual(["pallet"]);
  });

  it("uses token AND semantics across searchable fields", () => {
    expect(select("belt conv").map((record) => record.item.id)).toEqual(["belt"]);
    expect(select("belt packaging")).toEqual([]);
  });

  it("derives and combines only real source, category, and family filters", () => {
    const records = createAssetBrowserRecords(createLibraries());
    const options = getAssetBrowserFilterOptions(records);

    expect(options.sources).toEqual([
      { value: "atara-standard", label: "Atara Standard" },
      { value: "project-custom", label: "Project Custom" }
    ]);
    expect(options.categories.map((option) => option.value)).toEqual([
      "Packaging", "Conveying", "Material Handling", "Safety"
    ]);
    expect(select("", {
      filters: { libraryId: "atara-standard", category: "Conveying", family: "CONV" }
    }).map((record) => record.item.id)).toEqual(["belt"]);
    expect(select("", {
      filters: { libraryId: "project-custom", category: "Conveying", family: "" }
    })).toEqual([]);
  });

  it("filters favorites and orders recent assets most-recent-first while ignoring stale keys", () => {
    expect(select("", {
      scope: "favorites",
      favoriteAssetKeys: ["atara-standard::belt", "missing::asset"]
    }).map((record) => record.item.id)).toEqual(["belt"]);
    expect(select("", {
      scope: "recent",
      recentAssetKeys: ["project-custom::fence", "missing::asset", "atara-standard::flow-pack"]
    }).map((record) => record.item.id)).toEqual(["fence", "flow-pack"]);
  });

  it("indexes and filters a generated 1000-record library without stateful ordering", () => {
    const generated: LoadedMachineLibrary = {
      libraryId: "large",
      libraryName: "Large Library",
      readonly: true,
      enabled: true,
      path: "/large.json",
      root: {
        id: "root",
        name: "Large Library",
        children: [],
        items: Array.from({ length: 1000 }, (_, index) => createItem(
          `asset-${index}`,
          `Generated Asset ${index}`,
          { category: index % 2 === 0 ? "Even" : "Odd", tags: [`batch${Math.floor(index / 100)}`] }
        ))
      }
    };
    const records = createAssetBrowserRecords([generated]);
    const selected = selectAssetBrowserRecords(records, {
      scope: "all",
      query: "generated batch9",
      filters: { libraryId: "large", category: "Even", family: "" },
      favoriteAssetKeys: [],
      recentAssetKeys: []
    });

    expect(records).toHaveLength(1000);
    expect(selected).toHaveLength(50);
    expect(selected[0].item.id).toBe("asset-900");
    expect(selected[selected.length - 1]?.item.id).toBe("asset-998");
  });
});
