import { useEffect, useMemo, useState } from "react";
import { LibraryManager } from "./LibraryManager";
import { TaxonomyManager } from "./TaxonomyManager";
import type {
  LibraryGroup,
  LibraryMachineItem,
  LibraryValidationWarning,
  LoadedMachineLibrary,
  MachineDefinition
} from "../types/machine";
import { loadMachineLibraries } from "../utils/libraryValidation";
import { getMachineDimensionsMm, normalizeMachineDefinitionDimensions } from "../utils/machineDimensions";
import { formatLength } from "../utils/units";
import { normalizeMachineVisualModel } from "../utils/visualModel";

type LibrarySelection = {
  libraryId: string;
  item: LibraryMachineItem;
  definition: MachineDefinition;
};

type MachineLibraryProps = {
  onAddMachine: (selection: LibrarySelection) => void;
};

const toMachineDefinition = (item: LibraryMachineItem): MachineDefinition => normalizeMachineVisualModel(normalizeMachineDefinitionDimensions({
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
  capabilities: item.capabilities
}));

const formatDimensions = (item: LibraryMachineItem) => {
  const dimensions = getMachineDimensionsMm({
    ...item,
    category: item.type
  });

  return `${formatLength(dimensions.widthMm, "mm", 0)} x ${formatLength(dimensions.depthMm, "mm", 0)} x ${formatLength(dimensions.heightMm, "mm", 0)}`;
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
                  <span>{item.category} / {item.machineType ?? item.type}</span>
                  <small>{formatDimensions(item)}</small>
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
  const [isTaxonomyManagerOpen, setIsTaxonomyManagerOpen] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);
  const [taxonomyReloadToken, setTaxonomyReloadToken] = useState(0);

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
    <section className="library-section" aria-label="Machine library" data-testid="machine-library-panel">
      <div className="panel-search">
        <span aria-hidden="true">+</span>
        <input type="search" placeholder={libraryCountText} aria-label="Machine library status" readOnly />
      </div>

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

      <section className="library-tools" aria-label="Library tools">
        <div className="section-header">
          <span>Library Tools</span>
          <strong>Manager</strong>
        </div>
        <button className="manager-open-button" data-testid="open-library-manager" type="button" onClick={() => setIsManagerOpen(true)}>
          Open Library Manager
        </button>
        <button className="manager-open-button" data-testid="open-taxonomy-manager" type="button" onClick={() => setIsTaxonomyManagerOpen(true)}>
          Open Taxonomy Manager
        </button>
      </section>

      {isManagerOpen ? (
        <LibraryManager
          libraries={libraries}
          taxonomyReloadToken={taxonomyReloadToken}
          onClose={() => setIsManagerOpen(false)}
          onLibrariesChanged={() => setReloadToken((current) => current + 1)}
        />
      ) : null}
      {isTaxonomyManagerOpen ? (
        <TaxonomyManager
          onClose={() => setIsTaxonomyManagerOpen(false)}
          onChanged={() => setTaxonomyReloadToken((current) => current + 1)}
        />
      ) : null}
    </section>
  );
}
