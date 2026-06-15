import type { ObjectGroup } from "../types/groups";
import type { PlacedMachine } from "../types/machine";

type AssemblyTreePanelProps = {
  groups: ObjectGroup[];
  placedMachines: PlacedMachine[];
  selectedGroupId: string | null;
  selectedMachineIds: string[];
  onCreateGroupFromSelection: (name: string) => void;
  onAddSelectionToGroup: (groupId: string) => void;
  onRemoveSelectionFromGroup: (groupId: string) => void;
  onRenameGroup: (groupId: string, name: string) => void;
  onDeleteGroup: (groupId: string) => void;
  onSelectGroup: (groupId: string) => void;
  onToggleGroupCollapsed: (groupId: string) => void;
};

export function AssemblyTreePanel({
  groups,
  placedMachines,
  selectedGroupId,
  selectedMachineIds,
  onCreateGroupFromSelection,
  onAddSelectionToGroup,
  onRemoveSelectionFromGroup,
  onRenameGroup,
  onDeleteGroup,
  onSelectGroup,
  onToggleGroupCollapsed
}: AssemblyTreePanelProps) {
  const machinesById = new Map(placedMachines.map((machine) => [machine.instanceId, machine]));
  const selectedCount = selectedMachineIds.length;

  return (
    <section className="assembly-panel" data-testid="assembly-tree-panel" aria-label="Assembly Tree">
      <button
        className="primary-action"
        type="button"
        data-testid="create-group-from-selection"
        disabled={selectedCount === 0}
        onClick={() => {
          const name = window.prompt("Group name");
          if (name?.trim()) {
            onCreateGroupFromSelection(name);
          }
        }}
      >
        Create Group from Selection
      </button>
      <p className="collision-note">
        Groups organize objects. Layers still control visibility and locking.
      </p>
      <div className="assembly-list" aria-label="Object groups">
        {groups.length > 0 ? groups.map((group) => {
          const memberMachines = group.objectIds.flatMap((objectId) => {
            const machine = machinesById.get(objectId);
            return machine ? [machine] : [];
          });
          return (
            <article
              className={`assembly-group-row${selectedGroupId === group.id ? " is-selected" : ""}`}
              key={group.id}
            >
              <div className="assembly-group-header">
                <button
                  type="button"
                  className="assembly-collapse-button"
                  aria-label={group.collapsed ? `Expand ${group.name}` : `Collapse ${group.name}`}
                  onClick={() => onToggleGroupCollapsed(group.id)}
                >
                  {group.collapsed ? "+" : "-"}
                </button>
                <button
                  type="button"
                  className="assembly-group-button"
                  data-testid={`assembly-group-${group.id}`}
                  onClick={() => onSelectGroup(group.id)}
                >
                  <strong>{group.name}</strong>
                  <small>{memberMachines.length} object{memberMachines.length === 1 ? "" : "s"}</small>
                </button>
              </div>
              {!group.collapsed ? (
                <div className="assembly-members">
                  {memberMachines.length > 0 ? memberMachines.map((machine) => (
                    <span key={machine.instanceId}>{machine.definition.name}</span>
                  )) : <span>No objects assigned.</span>}
                </div>
              ) : null}
              <div className="assembly-actions">
                <button type="button" disabled={selectedCount === 0} onClick={() => onAddSelectionToGroup(group.id)}>
                  Add Selected
                </button>
                <button type="button" disabled={selectedCount === 0} onClick={() => onRemoveSelectionFromGroup(group.id)}>
                  Remove Selected
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const name = window.prompt("Group name", group.name);
                    if (name?.trim()) {
                      onRenameGroup(group.id, name);
                    }
                  }}
                >
                  Rename
                </button>
                <button className="danger-action" type="button" onClick={() => onDeleteGroup(group.id)}>
                  Delete
                </button>
              </div>
            </article>
          );
        }) : <p className="empty-selection">No groups yet. Select objects, then create a group.</p>}
      </div>
    </section>
  );
}
