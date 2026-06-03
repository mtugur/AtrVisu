import { useEffect, useMemo, useState } from "react";
import type {
  LibraryGroup,
  LibraryIndexEntry,
  LibraryMachineItem,
  LoadedMachineLibrary,
  MachineDefinition
} from "../types/machine";

type LibrarySelection = {
  libraryId: string;
  item: LibraryMachineItem;
  definition: MachineDefinition;
};

type MachineLibraryProps = {
  onAddMachine: (selection: LibrarySelection) => void;
};

type LibraryIndex = {
  libraries: LibraryIndexEntry[];
};

const toMachineDefinition = (item: LibraryMachineItem): MachineDefinition => ({
  id: item.id,
  name: item.name,
  category: item.type,
  width: item.width,
  depth: item.depth,
  height: item.height,
  defaultColor: item.defaultColor,
  modelPath: item.modelPath,
  thumbnailPath: item.thumbnailPath,
  connectionPoints: item.connectionPoints,
  clearance: item.clearance,
  capabilities: item.capabilities
});

const filterDuplicateItems = (libraries: LoadedMachineLibrary[]) => {
  const seenIds = new Set<string>();

  const visitGroup = (library: LoadedMachineLibrary, group: LibraryGroup): LibraryGroup => {
    const items = group.items.filter((item) => {
      if (seenIds.has(item.id)) {
        console.warn(
          `Duplicate machine item id "${item.id}" found in library "${library.libraryName}". Keeping the first loaded item.`
        );
        return false;
      }
      seenIds.add(item.id);
      return true;
    });

    return {
      ...group,
      items,
      children: group.children.map((child) => visitGroup(library, child))
    };
  };

  return libraries.map((library) => ({
    ...library,
    root: visitGroup(library, library.root)
  }));
};

function GroupNode({
  group,
  libraryId,
  depth,
  onAddMachine
}: {
  group: LibraryGroup;
  libraryId: string;
  depth: number;
  onAddMachine: (selection: LibrarySelection) => void;
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
      >
        <span aria-hidden="true">{hasChildren ? (isOpen ? "-" : "+") : ""}</span>
        <strong>{group.name}</strong>
      </button>

      {isOpen ? (
        <div className="library-tree-children">
          {group.children.map((child) => (
            <GroupNode
              group={child}
              key={child.id}
              libraryId={libraryId}
              depth={depth + 1}
              onAddMachine={onAddMachine}
            />
          ))}
          {group.items.map((item) => {
            const definition = toMachineDefinition(item);

            return (
              <button
                className="machine-card"
                key={item.id}
                type="button"
                onClick={() => onAddMachine({ libraryId, item, definition })}
                style={{ marginLeft: 10 + (depth + 1) * 14 }}
                title={`Add ${item.name}`}
              >
                <span
                  className="machine-icon"
                  style={{ backgroundColor: item.defaultColor }}
                  aria-hidden="true"
                >
                  {item.name.slice(0, 1)}
                </span>
                <span className="machine-content">
                  <strong>{item.name}</strong>
                  <span>{item.type}</span>
                  <small>
                    {item.width} x {item.depth} x {item.height} m
                  </small>
                </span>
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

export function MachineLibrary({ onAddMachine }: MachineLibraryProps) {
  const [libraries, setLibraries] = useState<LoadedMachineLibrary[]>([]);
  const [openLibraries, setOpenLibraries] = useState<Set<string>>(new Set());
  const [loadError, setLoadError] = useState<string>("");

  useEffect(() => {
    let isCancelled = false;

    const loadLibraries = async () => {
      try {
        const indexResponse = await fetch("/library/libraries.index.json");
        if (!indexResponse.ok) {
          throw new Error("Could not load library index.");
        }

        const index = (await indexResponse.json()) as LibraryIndex;
        const enabledEntries = index.libraries.filter((entry) => entry.enabled);
        const loadedLibraries = await Promise.all(
          enabledEntries.map(async (entry) => {
            const response = await fetch(entry.path);
            if (!response.ok) {
              throw new Error(`Could not load ${entry.libraryName}.`);
            }

            const library = (await response.json()) as LoadedMachineLibrary;
            return {
              ...library,
              path: entry.path,
              enabled: entry.enabled,
              readonly: entry.readonly
            };
          })
        );

        if (isCancelled) {
          return;
        }

        const uniqueLibraries = filterDuplicateItems(loadedLibraries);
        setLibraries(uniqueLibraries);
        setOpenLibraries(new Set(uniqueLibraries.map((library) => library.libraryId)));
      } catch (error) {
        if (!isCancelled) {
          setLoadError(error instanceof Error ? error.message : "Could not load libraries.");
        }
      }
    };

    void loadLibraries();

    return () => {
      isCancelled = true;
    };
  }, []);

  const libraryCountText = useMemo(
    () => `${libraries.length} librar${libraries.length === 1 ? "y" : "ies"}`,
    [libraries.length]
  );

  return (
    <section className="library-section" aria-label="Machine library">
      <header className="panel-header">
        <span className="panel-kicker">AtrVisu</span>
        <h1>Machine Library</h1>
      </header>

      <div className="panel-search">
        <span aria-hidden="true">+</span>
        <input type="search" placeholder={libraryCountText} aria-label="Machine library status" readOnly />
      </div>

      {loadError ? <p className="library-error">{loadError}</p> : null}

      <section className="machine-list" aria-label="Available libraries">
        {libraries.map((library) => {
          const isOpen = openLibraries.has(library.libraryId);

          return (
            <article className="library-card" key={library.libraryId}>
              <button
                className="library-title"
                type="button"
                onClick={() =>
                  setOpenLibraries((current) => {
                    const next = new Set(current);
                    if (next.has(library.libraryId)) {
                      next.delete(library.libraryId);
                    } else {
                      next.add(library.libraryId);
                    }
                    return next;
                  })
                }
              >
                <span aria-hidden="true">{isOpen ? "-" : "+"}</span>
                <strong>{library.libraryName}</strong>
                <small>{library.readonly ? "Read-only" : "Editable later"}</small>
              </button>

              {isOpen ? (
                <GroupNode
                  group={library.root}
                  libraryId={library.libraryId}
                  depth={0}
                  onAddMachine={onAddMachine}
                />
              ) : null}
            </article>
          );
        })}
      </section>
    </section>
  );
}
