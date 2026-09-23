import type { CivilReferenceType } from "../types/civil";
import { getCivilTypeDefaults, getCivilTypeLabel } from "../utils/civil";
import {
  createAssetKey,
  normalizeAssetSearchText,
  type CivilAssetBrowserRecord
} from "./assetBrowserProjection";

export const BUILD_LIBRARY_ID = "build";

export const isBuildPrimitiveType = (value: unknown): value is CivilReferenceType =>
  typeof value === "string" && BUILD_PRIMITIVE_GROUPS.some((group) =>
    group.types.some((type) => type === value));

export const BUILD_PRIMITIVE_GROUPS: readonly Readonly<{
  name: "Structure" | "Planning";
  types: readonly CivilReferenceType[];
}>[] = Object.freeze([
  Object.freeze({ name: "Structure", types: Object.freeze(["column", "beam", "wall", "door-opening"] as const) }),
  Object.freeze({ name: "Planning", types: Object.freeze(["floor-area", "walkway", "restricted-area", "reference-zone"] as const) })
]);

export const createBuildAssetBrowserRecords = (startOrder = 0): readonly CivilAssetBrowserRecord[] =>
  Object.freeze(BUILD_PRIMITIVE_GROUPS.flatMap((group) => group.types.map((civilType, index) => {
    const defaults = getCivilTypeDefaults(civilType);
    const name = getCivilTypeLabel(civilType);
    const fields = [name, civilType, group.name, "Build", "Civil"];
    return Object.freeze({
      kind: "civil" as const,
      civilType,
      assetKey: createAssetKey(BUILD_LIBRARY_ID, civilType),
      libraryId: BUILD_LIBRARY_ID,
      libraryName: "Build",
      sourceLabel: "Build",
      name,
      category: group.name,
      dimensionsMm: Object.freeze({
        widthMm: defaults.widthMm,
        depthMm: defaults.depthMm,
        heightMm: defaults.heightMm ?? 20
      }),
      canonicalOrder: startOrder + BUILD_PRIMITIVE_GROUPS
        .slice(0, BUILD_PRIMITIVE_GROUPS.indexOf(group))
        .reduce((count, previous) => count + previous.types.length, 0) + index,
      groupPath: Object.freeze([group.name]),
      familyLabel: group.name,
      normalizedName: normalizeAssetSearchText(name),
      normalizedSearchFields: Object.freeze(fields.map(normalizeAssetSearchText)),
      normalizedSemanticFields: Object.freeze(fields.slice(0, 3).map(normalizeAssetSearchText)),
      normalizedGroupFields: Object.freeze(["Build", group.name].map(normalizeAssetSearchText))
    });
  })));
