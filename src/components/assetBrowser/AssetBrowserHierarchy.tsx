import { useState } from "react";
import { createAssetKey, type AssetBrowserRecord } from "../../assetBrowser";
import type { LibraryGroup, LoadedMachineLibrary } from "../../types/machine";
import { AssetBrowserCard } from "./AssetBrowserCard";

type SharedProps = {
  onCreateVariant?: (record: AssetBrowserRecord) => Promise<void>;
  recordsByKey: ReadonlyMap<string, AssetBrowserRecord>;
  favoriteAssetKeys: ReadonlySet<string>;
  onToggleFavorite: (assetKey: string) => void;
  onAdd: (record: AssetBrowserRecord) => Promise<boolean>;
};

function GroupNode({
  group,
  libraryId,
  depth,
  ...shared
}: SharedProps & {
  group: LibraryGroup;
  libraryId: string;
  depth: number;
}) {
  const [isOpen, setIsOpen] = useState(depth < 2);
  const hasChildren = group.children.length > 0 || group.items.length > 0;

  return (
    <div className="library-tree-node">
      <button
        className="library-tree-toggle"
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        style={{ paddingLeft: 10 + depth * 14 }}
        disabled={!hasChildren}
        aria-expanded={hasChildren ? isOpen : undefined}
      >
        <span aria-hidden="true">{hasChildren ? (isOpen ? "−" : "+") : ""}</span>
        <strong>{group.name}</strong>
      </button>

      {isOpen ? (
        <div className="library-tree-children">
          {group.children.map((child) => (
            <GroupNode
              {...shared}
              group={child}
              key={child.id}
              libraryId={libraryId}
              depth={depth + 1}
            />
          ))}
          {group.items.map((item) => {
            const record = shared.recordsByKey.get(createAssetKey(libraryId, item.id));
            return record ? (
              <div key={item.id} style={{ marginLeft: 10 + (depth + 1) * 14 }}>
                <AssetBrowserCard
                  record={record}
                  favorite={shared.favoriteAssetKeys.has(record.assetKey)}
                  onToggleFavorite={shared.onToggleFavorite}
                  onAdd={shared.onAdd}
                  onCreateVariant={shared.onCreateVariant}
                />
              </div>
            ) : null;
          })}
        </div>
      ) : null}
    </div>
  );
}
export function AssetBrowserHierarchy({
  libraries,
  openLibraryIds,
  onToggleLibrary,
  ...shared
}: SharedProps & {
  libraries: readonly LoadedMachineLibrary[];
  openLibraryIds: ReadonlySet<string>;
  onToggleLibrary: (libraryId: string) => void;
}) {
  return (
    <div className="asset-browser-hierarchy" data-testid="asset-browser-hierarchy">
      {libraries.map((library) => {
        const isOpen = openLibraryIds.has(library.libraryId);
        return (
          <article
            className={`library-card${library.loadError ? " has-error" : ""}`}
            key={library.libraryId}
          >
            <button
              className="library-title"
              type="button"
              title={`${library.libraryName} - ${library.loadError ?? (library.readonly ? "Read-only" : "Project source")}`}
              onClick={() => onToggleLibrary(library.libraryId)}
              aria-expanded={isOpen}
            >
              <span aria-hidden="true">{isOpen ? "−" : "+"}</span>
              <strong title={library.libraryName}>{library.libraryName}</strong>
              <small>{library.loadError ?? (library.readonly ? "Read-only" : "Project")}</small>
            </button>
            {isOpen ? (
              <GroupNode
                {...shared}
                group={library.root}
                libraryId={library.libraryId}
                depth={0}
              />
            ) : null}
          </article>
        );
      })}
    </div>
  );
}
