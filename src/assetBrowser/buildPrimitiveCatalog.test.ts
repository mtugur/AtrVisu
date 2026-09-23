import { describe, expect, it } from "vitest";
import { EMPTY_ASSET_BROWSER_FILTERS, selectAssetBrowserRecords } from "./assetBrowserProjection";
import { BUILD_PRIMITIVE_GROUPS, createBuildAssetBrowserRecords, isBuildPrimitiveType } from "./buildPrimitiveCatalog";

describe("Build primitive catalog", () => {
  it("projects the frozen Structure and Planning hierarchy as civil assets, never machine definitions", () => {
    expect(BUILD_PRIMITIVE_GROUPS.map((group) => [group.name, ...group.types])).toEqual([
      ["Structure", "column", "beam", "wall", "door-opening"],
      ["Planning", "floor-area", "walkway", "restricted-area", "reference-zone"]
    ]);
    const records = createBuildAssetBrowserRecords();
    expect(records).toHaveLength(8);
    expect(records.every((record) => record.kind === "civil" && !("item" in record))).toBe(true);
    expect(records.map((record) => record.assetKey)).toEqual([
      "build::column", "build::beam", "build::wall", "build::door-opening",
      "build::floor-area", "build::walkway", "build::restricted-area", "build::reference-zone"
    ]);
    expect(records[1]).toMatchObject({ dimensionsMm: { widthMm: 6000, depthMm: 300, heightMm: 500 } });
    expect(Object.isFrozen(records[1].dimensionsMm)).toBe(true);
  });

  it("uses the common browser search, source filter, favorites, and Recent projection", () => {
    const records = createBuildAssetBrowserRecords();
    const options = { scope: "all" as const, query: "beam", filters: EMPTY_ASSET_BROWSER_FILTERS, favoriteAssetKeys: [], recentAssetKeys: [] };
    expect(selectAssetBrowserRecords(records, options).map((record) => record.civilType)).toEqual(["beam"]);
    expect(selectAssetBrowserRecords(records, { ...options, query: "", filters: { libraryId: "build", category: "Planning", family: "" } })).toHaveLength(4);
    expect(selectAssetBrowserRecords(records, { ...options, query: "", scope: "favorites", favoriteAssetKeys: ["build::wall"] }).map((record) => record.civilType)).toEqual(["wall"]);
    expect(selectAssetBrowserRecords(records, { ...options, query: "", scope: "recent", recentAssetKeys: ["build::beam", "build::column"] }).map((record) => record.civilType)).toEqual(["beam", "column"]);
    expect(isBuildPrimitiveType("beam")).toBe(true);
    expect(isBuildPrimitiveType("machine")).toBe(false);
  });
});
