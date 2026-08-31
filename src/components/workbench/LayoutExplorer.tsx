import { useEffect, useRef, useState, type KeyboardEvent, type MouseEvent } from "react";
import type { EntityId, PlatformEntity, SelectionState } from "../../platform/contracts";
import type { RuntimeSelectionMode } from "../../platform/runtimeSelection";

type LayoutExplorerProps = {
  entities: readonly PlatformEntity[];
  selection: SelectionState;
  layerNames: ReadonlyMap<string, string>;
  onSelectEntity: (entityId: EntityId, mode: RuntimeSelectionMode) => void;
  renameRequestEntityId?: EntityId | null;
  renameRequestVersion?: number;
  onRenameEntity?: (entityId: EntityId, name: string) => boolean | Promise<boolean>;
  onRenameRequestHandled?: () => void;
};

const getTypeLabel = (type: PlatformEntity["type"]) => ({
  machine: "Machine",
  civil: "Civil reference",
  annotation: "Annotation",
  group: "Group",
  zone: "Zone",
  flowObject: "Flow object"
})[type];

const getSelectionMode = (
  event: Pick<MouseEvent<HTMLButtonElement>, "ctrlKey" | "metaKey" | "shiftKey">
): RuntimeSelectionMode => event.ctrlKey || event.metaKey || event.shiftKey ? "toggle" : "replace";

export function LayoutExplorer({
  entities,
  selection,
  layerNames,
  onSelectEntity,
  renameRequestEntityId,
  renameRequestVersion = 0,
  onRenameEntity,
  onRenameRequestHandled
}: LayoutExplorerProps) {
  const [editingEntityId, setEditingEntityId] = useState<EntityId | null>(null);
  const [draftName, setDraftName] = useState("");
  const inputRef = useRef<HTMLInputElement | null>(null);
  const entityById = new Map(entities.map((entity) => [entity.id, entity]));
  const groups = entities.filter((entity) => entity.type === "group");
  const groupedIds = new Set(groups.flatMap((group) => group.childrenIds));
  const ungrouped = entities.filter((entity) => entity.type !== "group" && !groupedIds.has(entity.id));

  const startRename = (entity: PlatformEntity) => {
    if (!onRenameEntity || entity.locked || !["machine", "civil", "group"].includes(entity.type)) {
      return;
    }
    setEditingEntityId(entity.id);
    setDraftName(entity.name);
  };

  useEffect(() => {
    if (!renameRequestEntityId) {
      return;
    }
    const entity = entityById.get(renameRequestEntityId);
    if (entity) {
      startRename(entity);
    }
    onRenameRequestHandled?.();
  }, [renameRequestEntityId, renameRequestVersion]);

  useEffect(() => {
    if (editingEntityId) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editingEntityId]);

  const cancelRename = () => {
    setEditingEntityId(null);
    setDraftName("");
  };

  const commitRename = async (entityId: EntityId) => {
    if (await onRenameEntity?.(entityId, draftName)) {
      cancelRename();
    }
  };

  const handleRenameKeyDown = (event: KeyboardEvent<HTMLInputElement>, entityId: EntityId) => {
    event.stopPropagation();
    if (event.key === "Enter") {
      event.preventDefault();
      void commitRename(entityId);
    } else if (event.key === "Escape") {
      event.preventDefault();
      cancelRename();
    }
  };

  const renderEntity = (entity: PlatformEntity, nested = false) => {
    const selected = selection.ids.includes(entity.id);
    const primary = selection.primaryId === entity.id;
    const layerName = entity.layerId ? layerNames.get(entity.layerId) ?? entity.layerId : "No layer";
    const unavailableReason = !entity.visible
      ? "Hidden by its layer or entity visibility."
      : !entity.selectable
        ? "This entity is not selectable."
        : undefined;

    if (editingEntityId === entity.id) {
      return (
        <div
          key={entity.id}
          className={`layout-explorer-row is-renaming${nested ? " is-nested" : ""}`}
          data-testid={`layout-explorer-rename-${entity.id}`}
        >
          <input
            ref={inputRef}
            value={draftName}
            aria-label={`Rename ${entity.name}`}
            onChange={(event) => setDraftName(event.target.value)}
            onKeyDown={(event) => handleRenameKeyDown(event, entity.id)}
            onBlur={cancelRename}
          />
          <span className="layout-explorer-context">Enter to save | Escape to cancel</span>
        </div>
      );
    }

    return (
      <button
        key={entity.id}
        type="button"
        className={`layout-explorer-row${nested ? " is-nested" : ""}${selected ? " is-selected" : ""}${primary ? " is-primary" : ""}`}
        data-testid={`layout-explorer-entity-${entity.id}`}
        data-entity-id={entity.id}
        aria-pressed={selected}
        disabled={Boolean(unavailableReason)}
        title={unavailableReason ?? `${entity.name} | ${getTypeLabel(entity.type)} | ${layerName}`}
        onClick={(event) => onSelectEntity(entity.id, getSelectionMode(event))}
        onDoubleClick={() => startRename(entity)}
      >
        <span className="layout-explorer-identity">
          <strong>{entity.name || entity.id}</strong>
          <small>{getTypeLabel(entity.type)}</small>
        </span>
        <span className="layout-explorer-context">
          {layerName}
          {entity.locked ? " | Locked" : ""}
          {primary ? " | Primary" : ""}
        </span>
      </button>
    );
  };

  return (
    <section className="layout-explorer" data-testid="layout-explorer" aria-label="Layout Explorer">
      <header className="layout-explorer-summary">
        <span>Layout entities</span>
        <strong>{entities.filter((entity) => entity.type !== "group").length}</strong>
      </header>
      <nav className="layout-explorer-tree" aria-label="Scene entities">
        <ul className="layout-explorer-list">
        {groups.map((group) => (
          <li className="layout-explorer-group" key={group.id}>
            {renderEntity(group)}
            <ul className="layout-explorer-children" aria-label={`${group.name} members`}>
              {group.childrenIds.flatMap((childId) => {
                const child = entityById.get(childId);
                return child ? [<li key={child.id}>{renderEntity(child, true)}</li>] : [];
              })}
            </ul>
          </li>
        ))}
        {ungrouped.map((entity) => <li key={entity.id}>{renderEntity(entity)}</li>)}
        </ul>
        {entities.length === 0 ? (
          <p className="empty-selection">Add a machine, civil reference, or annotation to populate the layout.</p>
        ) : null}
      </nav>
    </section>
  );
}
