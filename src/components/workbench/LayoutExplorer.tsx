import type { MouseEvent } from "react";
import type { EntityId, PlatformEntity, SelectionState } from "../../platform/contracts";
import type { RuntimeSelectionMode } from "../../platform/runtimeSelection";

type LayoutExplorerProps = {
  entities: readonly PlatformEntity[];
  selection: SelectionState;
  layerNames: ReadonlyMap<string, string>;
  onSelectEntity: (entityId: EntityId, mode: RuntimeSelectionMode) => void;
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
  onSelectEntity
}: LayoutExplorerProps) {
  const entityById = new Map(entities.map((entity) => [entity.id, entity]));
  const groups = entities.filter((entity) => entity.type === "group");
  const groupedIds = new Set(groups.flatMap((group) => group.childrenIds));
  const ungrouped = entities.filter((entity) => entity.type !== "group" && !groupedIds.has(entity.id));

  const renderEntity = (entity: PlatformEntity, nested = false) => {
    const selected = selection.ids.includes(entity.id);
    const primary = selection.primaryId === entity.id;
    const layerName = entity.layerId ? layerNames.get(entity.layerId) ?? entity.layerId : "No layer";
    const unavailableReason = !entity.visible
      ? "Hidden by its layer or entity visibility."
      : !entity.selectable
        ? "This entity is not selectable."
        : undefined;

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
      <div className="layout-explorer-tree" role="tree" aria-label="Scene entities">
        {groups.map((group) => (
          <section className="layout-explorer-group" key={group.id} aria-label={group.name}>
            {renderEntity(group)}
            <div className="layout-explorer-children">
              {group.childrenIds.flatMap((childId) => {
                const child = entityById.get(childId);
                return child ? [renderEntity(child, true)] : [];
              })}
            </div>
          </section>
        ))}
        {ungrouped.map((entity) => renderEntity(entity))}
        {entities.length === 0 ? (
          <p className="empty-selection">Add a machine, civil reference, or annotation to populate the layout.</p>
        ) : null}
      </div>
      <p className="layout-explorer-rename-note" title="Rename requires a canonical history-backed mutation command.">
        Rename is unavailable until a history-backed entity rename command exists.
      </p>
    </section>
  );
}
