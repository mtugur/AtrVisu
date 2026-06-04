import { useEffect, useMemo, useState } from "react";
import { LibraryManager } from "./LibraryManager";
import type {
  LibraryGroup,
  LibraryMachineItem,
  LibraryValidationWarning,
  LoadedMachineLibrary,
  MachineDefinition
} from "../types/machine";
import { loadMachineLibraries } from "../utils/libraryValidation";

type LibrarySelection = {
  libraryId: string;
  item: LibraryMachineItem;
  definition: MachineDefinition;
};

type MachineLibraryProps = {
  onAddMachine: (selection: LibrarySelection) => void;
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
  const [warnings, setWarnings] = useState<LibraryValidationWarning[]>([]);
  const [loadError, setLoadError] = useState<string>("");
  const [isManagerOpen, setIsManagerOpen] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let isCancelled = false;

    const loadLibraries = async () => {
      const result = await loadMachineLibraries();

      if (!isCancelled) {
        setLibraries(result.libraries);
        setWarnings(result.warnings);
        setLoadError(result.loadError);
        setOpenLibraries(new Set(result.libraries.map((library) => library.libraryId)));
      }
    };

    void loadLibraries();

    return () => {
      isCancelled = true;
    };
  }, [reloadToken]);

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

      <button className="manager-open-button" type="button" onClick={() => setIsManagerOpen(true)}>
        Library Manager
      </button>

      {loadError ? <p className="library-error">{loadError}</p> : null}
      {warnings.length > 0 ? (
        <p className="library-warning-summary">
          Library warnings found: {warnings.length}. Check console for details.
        </p>
      ) : null}

      <section className="machine-list" aria-label="Available libraries">
        {libraries.map((library) => {
          const isOpen = openLibraries.has(library.libraryId);

          return (
            <article
              className={`library-card${library.loadError ? " has-error" : ""}`}
              key={library.libraryId}
            >
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
                <small>{library.loadError ?? (library.readonly ? "Read-only" : "Editable later")}</small>
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

      {isManagerOpen ? (
        <LibraryManager
          libraries={libraries}
          onClose={() => setIsManagerOpen(false)}
          onLibrariesChanged={() => setReloadToken((current) => current + 1)}
        />
      ) : null}
    </section>
  );
}
