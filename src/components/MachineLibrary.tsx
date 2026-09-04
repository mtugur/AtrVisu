import {
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore
} from "react";
import { Upload } from "lucide-react";
import {
  EMPTY_ASSET_BROWSER_FILTERS,
  createAssetBrowserPreferencesRuntime,
  createAssetBrowserRecords,
  getActiveAssetBrowserFilterCount,
  getAssetBrowserFilterOptions,
  selectAssetBrowserRecords,
  type AssetBrowserFilters,
  type AssetBrowserPreferencesRuntime,
  type AssetBrowserRecord,
  type AssetBrowserScope
} from "../assetBrowser";
import type {
  LibraryMachineItem,
  LibraryValidationWarning,
  LoadedMachineLibrary,
  MachineDefinition
} from "../types/machine";
import { loadMachineLibraries } from "../utils/libraryValidation";
import { normalizeMachineDefinitionDimensions } from "../utils/machineDimensions";
import { normalizeMachineVisualModel } from "../utils/visualModel";
import { WorkbenchIcon } from "../workbench/icons";
import { AssetBrowserCard } from "./assetBrowser/AssetBrowserCard";
import { AssetBrowserHierarchy } from "./assetBrowser/AssetBrowserHierarchy";
import { LibraryManager, type LibraryManagerRuntimeController } from "./LibraryManager";
import { TaxonomyManager } from "./TaxonomyManager";

type LibrarySelection = {
  libraryId: string;
  item: LibraryMachineItem;
  definition: MachineDefinition;
};

type MachineLibraryProps = {
  onImportAsset?: () => void;
  onCreateVariant?: (selection: LibrarySelection) => Promise<void>;
  onAddMachine: (selection: LibrarySelection) => Promise<boolean>;
  isLibraryManagerOpen: boolean;
  isTaxonomyManagerOpen: boolean;
  onCloseLibraryManager: () => void;
  onCloseTaxonomyManager: () => void;
  onLibraryManagerRuntimeControllerChange?: (controller: LibraryManagerRuntimeController | null) => void;
  preferencesRuntime?: AssetBrowserPreferencesRuntime;
};

export const toMachineDefinition = (item: LibraryMachineItem): MachineDefinition => normalizeMachineVisualModel(normalizeMachineDefinitionDimensions({
  id: item.id,
  name: item.name,
  category: item.category,
  machineType: item.machineType,
  variant: item.variant,
  productFamilyCode: item.productFamilyCode,
  tags: item.tags,
  placeholderVisualType: item.placeholderVisualType,
  widthMm: item.widthMm,
  depthMm: item.depthMm,
  heightMm: item.heightMm,
  width: item.width,
  depth: item.depth,
  height: item.height,
  defaultColor: item.defaultColor,
  modelPath: item.modelPath,
  visualModel: item.visualModel,
  thumbnailPath: item.thumbnailPath,
  connectionPoints: item.connectionPoints,
  clearance: item.clearance,
  collisionEnvelope: item.collisionEnvelope,
  ataraMachineData: item.ataraMachineData,
  capabilities: item.capabilities
}));

const scopeLabels: Readonly<Record<AssetBrowserScope, string>> = Object.freeze({
  all: "All",
  recent: "Recent",
  favorites: "Favorites"
});

const EmptyState = ({ scope, filtered }: { scope: AssetBrowserScope; filtered: boolean }) => {
  if (filtered) {
    return (
      <div className="asset-browser-empty" role="status">
        <strong>No assets match the current search and filters.</strong>
        <span>Clear the search or filters to browse all available equipment.</span>
      </div>
    );
  }
  if (scope === "favorites") {
    return (
      <div className="asset-browser-empty" role="status">
        <strong>No favorites yet.</strong>
        <span>Use the star on an asset to keep it here.</span>
      </div>
    );
  }
  if (scope === "recent") {
    return (
      <div className="asset-browser-empty" role="status">
        <strong>No recent assets yet.</strong>
        <span>Equipment appears here after it is added to the layout.</span>
      </div>
    );
  }
  return (
    <div className="asset-browser-empty" role="status">
      <strong>No assets are currently available.</strong>
    </div>
  );
};

export function MachineLibrary({
  onImportAsset,
  onCreateVariant,
  onAddMachine,
  isLibraryManagerOpen,
  isTaxonomyManagerOpen,
  onCloseLibraryManager,
  onCloseTaxonomyManager,
  onLibraryManagerRuntimeControllerChange,
  preferencesRuntime
}: MachineLibraryProps) {
  const [runtime] = useState(() => preferencesRuntime ?? createAssetBrowserPreferencesRuntime());
  const preferenceSnapshot = useSyncExternalStore(
    runtime.subscribe,
    runtime.getSnapshot,
    runtime.getSnapshot
  );
  const [libraries, setLibraries] = useState<LoadedMachineLibrary[]>([]);
  const [openLibraries, setOpenLibraries] = useState<Set<string>>(new Set());
  const [warnings, setWarnings] = useState<LibraryValidationWarning[]>([]);
  const [loadError, setLoadError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [reloadToken, setReloadToken] = useState(0);
  const [taxonomyReloadToken, setTaxonomyReloadToken] = useState(0);
  const [query, setQuery] = useState("");
  const [scope, setScope] = useState<AssetBrowserScope>("all");
  const [filters, setFilters] = useState<AssetBrowserFilters>(EMPTY_ASSET_BROWSER_FILTERS);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [assetMessage, setAssetMessage] = useState("");

  useEffect(() => {
    const reload = () => setReloadToken((value) => value + 1);
    window.addEventListener("atrvisu-custom-library-changed", reload);
    return () => window.removeEventListener("atrvisu-custom-library-changed", reload);
  }, []);
  const createVariant = onCreateVariant ? async (record: AssetBrowserRecord) => {
    try {
      await onCreateVariant({ libraryId: record.libraryId, item: record.item, definition: toMachineDefinition(record.item) });
      setAssetMessage(`Created ${record.item.name} Custom in Project Custom Library.`);
    } catch (error) { setAssetMessage(error instanceof Error ? error.message : "Could not create custom variant."); }
  } : undefined;

  useEffect(() => {
    void runtime.hydrate();
  }, [runtime]);

  useEffect(() => {
    let isCancelled = false;
    setIsLoading(true);
    const loadLibraries = async () => {
      const result = await loadMachineLibraries();
      if (!isCancelled) {
        setLibraries(result.libraries);
        setWarnings(result.warnings);
        setLoadError(result.loadError);
        setOpenLibraries(new Set(result.libraries.map((library) => library.libraryId)));
        setIsLoading(false);
      }
    };
    void loadLibraries();
    return () => {
      isCancelled = true;
    };
  }, [reloadToken]);

  const records = useMemo(() => createAssetBrowserRecords(libraries), [libraries]);
  const recordsByKey = useMemo(
    () => new Map(records.map((record) => [record.assetKey, record])),
    [records]
  );
  const favoriteAssetKeys = useMemo(
    () => new Set(preferenceSnapshot.preferences.favoriteAssetKeys),
    [preferenceSnapshot.preferences.favoriteAssetKeys]
  );
  const filterOptions = useMemo(() => getAssetBrowserFilterOptions(records), [records]);
  const activeFilterCount = getActiveAssetBrowserFilterCount(filters);
  const hasSearchOrFilters = query.trim().length > 0 || activeFilterCount > 0;
  const showHierarchy = scope === "all" && !hasSearchOrFilters;
  const visibleRecords = useMemo(() => selectAssetBrowserRecords(records, {
    scope,
    query,
    filters,
    favoriteAssetKeys: preferenceSnapshot.preferences.favoriteAssetKeys,
    recentAssetKeys: preferenceSnapshot.preferences.recentAssetKeys
  }), [
    filters,
    preferenceSnapshot.preferences.favoriteAssetKeys,
    preferenceSnapshot.preferences.recentAssetKeys,
    query,
    records,
    scope
  ]);

  const clearSearchAndFilters = () => {
    setQuery("");
    setFilters(EMPTY_ASSET_BROWSER_FILTERS);
  };

  const addAsset = async (record: AssetBrowserRecord) => {
    const added = await onAddMachine({
      libraryId: record.libraryId,
      item: record.item,
      definition: toMachineDefinition(record.item)
    });
    if (added) {
      void runtime.recordRecent(record.assetKey);
    }
    return added;
  };

  return (
    <section
      className="library-section"
      aria-label="Machine library"
      data-testid="machine-library-panel"
      data-asset-preferences-status={preferenceSnapshot.status}
    >
      {onImportAsset && <button type="button" className="native-asset-import-trigger" onClick={onImportAsset}><Upload size={16} /><span>Import 3D Asset</span></button>}
      {assetMessage && <p role="status">{assetMessage}</p>}
      <label className="panel-search asset-browser-search">
        <WorkbenchIcon iconId="search" />
        <input
          type="search"
          placeholder="Search assets…"
          aria-label="Search assets"
          value={query}
          onChange={(event) => setQuery(event.currentTarget.value)}
        />
      </label>

      <div className="asset-browser-scopes" role="group" aria-label="Asset scope">
        {(Object.keys(scopeLabels) as AssetBrowserScope[]).map((scopeId) => (
          <button
            key={scopeId}
            type="button"
            aria-pressed={scope === scopeId}
            onClick={() => setScope(scopeId)}
          >
            {scopeLabels[scopeId]}
          </button>
        ))}
      </div>

      <div className="asset-browser-filter-disclosure">
        <button
          type="button"
          aria-expanded={filtersOpen}
          aria-controls="asset-browser-filters"
          onClick={() => setFiltersOpen((current) => !current)}
        >
          <WorkbenchIcon iconId="filter" />
          <span>Filters</span>
          {activeFilterCount > 0 ? <small>{activeFilterCount}</small> : null}
          <WorkbenchIcon iconId={filtersOpen ? "chevron-up" : "chevron-down"} />
        </button>
        {filtersOpen ? (
          <div id="asset-browser-filters" className="asset-browser-filters">
            <label>
              <span>Source</span>
              <select aria-label="Asset source" value={filters.libraryId} onChange={(event) => setFilters((current) => ({ ...current, libraryId: event.currentTarget.value }))}>
                <option value="">All sources</option>
                {filterOptions.sources.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </label>
            <label>
              <span>Category</span>
              <select aria-label="Asset category" value={filters.category} onChange={(event) => setFilters((current) => ({ ...current, category: event.currentTarget.value }))}>
                <option value="">All categories</option>
                {filterOptions.categories.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </label>
            <label>
              <span>Family</span>
              <select aria-label="Asset family" value={filters.family} onChange={(event) => setFilters((current) => ({ ...current, family: event.currentTarget.value }))}>
                <option value="">All families</option>
                {filterOptions.families.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </label>
            <button className="asset-browser-clear" type="button" disabled={activeFilterCount === 0} onClick={() => setFilters(EMPTY_ASSET_BROWSER_FILTERS)}>
              Clear filters
            </button>
          </div>
        ) : null}
      </div>

      {preferenceSnapshot.warning ? <p className="asset-browser-storage-warning" role="status">{preferenceSnapshot.warning}</p> : null}
      {loadError ? (
        <div className="library-error" role="alert">
          <span>Assets could not be loaded.</span>
          <button type="button" onClick={() => setReloadToken((current) => current + 1)}>Retry</button>
        </div>
      ) : null}
      {warnings.length > 0 ? <p className="library-warning-summary" role="status">Some assets could not be prepared. Available assets remain usable.</p> : null}

      <div className="asset-browser-results-header" aria-live="polite">
        <span>{isLoading ? "Loading assets…" : `${visibleRecords.length} asset${visibleRecords.length === 1 ? "" : "s"}`}</span>
        {hasSearchOrFilters ? <button type="button" onClick={clearSearchAndFilters}>Clear search and filters</button> : null}
      </div>

      <section className="machine-list" aria-label="Available assets">
        {isLoading ? <p className="asset-browser-loading" role="status">Loading assets…</p> : null}
        {!isLoading && !loadError && visibleRecords.length === 0 ? <EmptyState scope={scope} filtered={hasSearchOrFilters} /> : null}
        {!isLoading && !loadError && visibleRecords.length > 0 && showHierarchy ? (
          <AssetBrowserHierarchy
            libraries={libraries}
            openLibraryIds={openLibraries}
            onToggleLibrary={(libraryId) => setOpenLibraries((current) => {
              const next = new Set(current);
              if (next.has(libraryId)) next.delete(libraryId);
              else next.add(libraryId);
              return next;
            })}
            recordsByKey={recordsByKey}
            favoriteAssetKeys={favoriteAssetKeys}
            onToggleFavorite={(assetKey) => void runtime.toggleFavorite(assetKey)}
            onAdd={addAsset}
            onCreateVariant={createVariant}
          />
        ) : null}
        {!isLoading && !loadError && visibleRecords.length > 0 && !showHierarchy ? (
          <div className="asset-browser-flat-results" data-testid="asset-browser-flat-results">
            {visibleRecords.map((record) => (
              <AssetBrowserCard
                key={record.assetKey}
                record={record}
                favorite={favoriteAssetKeys.has(record.assetKey)}
                onToggleFavorite={(assetKey) => void runtime.toggleFavorite(assetKey)}
                onAdd={addAsset}
                onCreateVariant={createVariant}
              />
            ))}
          </div>
        ) : null}
      </section>

      {isLibraryManagerOpen ? (
        <LibraryManager
          libraries={libraries}
          taxonomyReloadToken={taxonomyReloadToken}
          onClose={onCloseLibraryManager}
          onLibrariesChanged={() => setReloadToken((current) => current + 1)}
          onRuntimeControllerChange={onLibraryManagerRuntimeControllerChange}
        />
      ) : null}
      {isTaxonomyManagerOpen ? <TaxonomyManager onClose={onCloseTaxonomyManager} onChanged={() => setTaxonomyReloadToken((current) => current + 1)} /> : null}
    </section>
  );
}
