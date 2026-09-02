import type {
  LibraryGroup,
  LibraryMachineItem,
  LoadedMachineLibrary
} from "../types/machine";

export type AssetBrowserScope = "all" | "recent" | "favorites";

export type AssetBrowserFilters = Readonly<{
  libraryId: string;
  category: string;
  family: string;
}>;

export type AssetBrowserRecord = Readonly<{
  assetKey: string;
  libraryId: string;
  libraryName: string;
  sourceLabel: string;
  item: LibraryMachineItem;
  canonicalOrder: number;
  groupPath: readonly string[];
  familyLabel: string;
  normalizedName: string;
  normalizedSearchFields: readonly string[];
  normalizedSemanticFields: readonly string[];
  normalizedGroupFields: readonly string[];
}>;

export type AssetBrowserFilterOption = Readonly<{
  value: string;
  label: string;
}>;

export type AssetBrowserFilterOptions = Readonly<{
  sources: readonly AssetBrowserFilterOption[];
  categories: readonly AssetBrowserFilterOption[];
  families: readonly AssetBrowserFilterOption[];
}>;

export type SelectAssetBrowserRecordsOptions = Readonly<{
  scope: AssetBrowserScope;
  query: string;
  filters: AssetBrowserFilters;
  favoriteAssetKeys: readonly string[];
  recentAssetKeys: readonly string[];
}>;

export const EMPTY_ASSET_BROWSER_FILTERS: AssetBrowserFilters = Object.freeze({
  libraryId: "",
  category: "",
  family: ""
});

export const createAssetKey = (libraryId: string, itemId: string) =>
  `${libraryId}::${itemId}`;

export const normalizeAssetSearchText = (value: string) => value
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .replace(/ı/g, "i")
  .toLocaleLowerCase("en-US")
  .replace(/[^a-z0-9]+/g, " ")
  .trim()
  .replace(/\s+/g, " ");

const getSourceLabel = (library: LoadedMachineLibrary) => {
  if (library.libraryId === "atara-standard") {
    return "Atara Standard";
  }
  if (library.libraryId === "project-custom") {
    return "Project Custom";
  }
  return library.libraryName.replace(/\s+Library$/i, "");
};

const getFamilyLabel = (item: LibraryMachineItem, groupPath: readonly string[]) =>
  item.productFamilyCode?.trim()
  || groupPath[groupPath.length - 1]
  || item.machineType
  || item.category;

const appendGroupRecords = (
  records: AssetBrowserRecord[],
  library: LoadedMachineLibrary,
  group: LibraryGroup,
  groupPath: readonly string[],
  order: { value: number }
) => {
  group.children.forEach((child) => {
    appendGroupRecords(records, library, child, [...groupPath, child.name], order);
  });

  group.items.forEach((item) => {
    const familyLabel = getFamilyLabel(item, groupPath);
    const semanticFields = [
      item.machineType,
      item.category,
      item.productFamilyCode,
      item.variant,
      ...(item.tags ?? []),
      familyLabel
    ].filter((value): value is string => typeof value === "string" && value.trim().length > 0);
    const groupFields = [...groupPath, library.libraryName];
    records.push(Object.freeze({
      assetKey: createAssetKey(library.libraryId, item.id),
      libraryId: library.libraryId,
      libraryName: library.libraryName,
      sourceLabel: getSourceLabel(library),
      item,
      canonicalOrder: order.value,
      groupPath: Object.freeze([...groupPath]),
      familyLabel,
      normalizedName: normalizeAssetSearchText(item.name),
      normalizedSearchFields: Object.freeze([
        item.name,
        ...semanticFields,
        ...groupFields
      ].map(normalizeAssetSearchText)),
      normalizedSemanticFields: Object.freeze(semanticFields.map(normalizeAssetSearchText)),
      normalizedGroupFields: Object.freeze(groupFields.map(normalizeAssetSearchText))
    }));
    order.value += 1;
  });

};

export const createAssetBrowserRecords = (
  libraries: readonly LoadedMachineLibrary[]
): readonly AssetBrowserRecord[] => {
  const records: AssetBrowserRecord[] = [];
  const order = { value: 0 };
  libraries.forEach((library) => {
    appendGroupRecords(records, library, library.root, [], order);
  });
  return Object.freeze(records);
};

const tokenizeQuery = (query: string) => {
  const normalized = normalizeAssetSearchText(query);
  return {
    normalized,
    tokens: normalized ? normalized.split(" ") : []
  };
};

const fieldMatchesToken = (field: string, token: string) => field.includes(token);

const everyTokenMatches = (fields: readonly string[], tokens: readonly string[]) =>
  tokens.every((token) => fields.some((field) => fieldMatchesToken(field, token)));

const nameHasWordPrefix = (name: string, token: string) =>
  name.split(" ").some((word) => word.startsWith(token));

const getSearchRank = (
  record: AssetBrowserRecord,
  normalizedQuery: string,
  tokens: readonly string[]
) => {
  if (record.normalizedName === normalizedQuery) {
    return 0;
  }
  if (
    record.normalizedName.startsWith(normalizedQuery)
    || tokens.every((token) => nameHasWordPrefix(record.normalizedName, token))
  ) {
    return 1;
  }
  if (tokens.every((token) => record.normalizedName.includes(token))) {
    return 2;
  }
  if (everyTokenMatches(record.normalizedSemanticFields, tokens)) {
    return 3;
  }
  return 4;
};

export const getAssetBrowserFilterOptions = (
  records: readonly AssetBrowserRecord[]
): AssetBrowserFilterOptions => {
  const unique = (
    values: readonly AssetBrowserFilterOption[]
  ) => [...new Map(values.map((value) => [value.value, value])).values()];

  return Object.freeze({
    sources: Object.freeze(unique(records.map((record) => ({
      value: record.libraryId,
      label: record.sourceLabel
    })))),
    categories: Object.freeze(unique(records.map((record) => ({
      value: record.item.category,
      label: record.item.category
    })))),
    families: Object.freeze(unique(records.map((record) => ({
      value: record.familyLabel,
      label: record.familyLabel
    }))))
  });
};

export const getActiveAssetBrowserFilterCount = (filters: AssetBrowserFilters) =>
  [filters.libraryId, filters.category, filters.family].filter(Boolean).length;

export const selectAssetBrowserRecords = (
  records: readonly AssetBrowserRecord[],
  options: SelectAssetBrowserRecordsOptions
): readonly AssetBrowserRecord[] => {
  const favoriteKeys = new Set(options.favoriteAssetKeys);
  const recordsByKey = new Map(records.map((record) => [record.assetKey, record]));
  const scopedRecords = options.scope === "recent"
    ? options.recentAssetKeys.flatMap((assetKey) => {
        const record = recordsByKey.get(assetKey);
        return record ? [record] : [];
      })
    : records.filter((record) => options.scope !== "favorites" || favoriteKeys.has(record.assetKey));
  const filtered = scopedRecords.filter((record) => (
    (!options.filters.libraryId || record.libraryId === options.filters.libraryId)
    && (!options.filters.category || record.item.category === options.filters.category)
    && (!options.filters.family || record.familyLabel === options.filters.family)
  ));
  const { normalized, tokens } = tokenizeQuery(options.query);
  if (tokens.length === 0) {
    return filtered;
  }

  return filtered
    .filter((record) => everyTokenMatches(record.normalizedSearchFields, tokens))
    .map((record) => ({ record, rank: getSearchRank(record, normalized, tokens) }))
    .sort((left, right) => left.rank - right.rank
      || left.record.canonicalOrder - right.record.canonicalOrder)
    .map(({ record }) => record);
};
