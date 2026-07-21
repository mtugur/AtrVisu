import type { ObjectGroup } from "../types/groups";
import type { PlacedMachine } from "../types/machine";
import type { CivilReferenceItem } from "../types/civil";
import { getCivilTypeLabel } from "../utils/civil";

type AssemblyTreePanelProps = {
  groups: ObjectGroup[];
  placedMachines: PlacedMachine[];
  civilReferences: CivilReferenceItem[];
  selectedGroupId: string | null;
  activeGroupEditId: string | null;
  selectedEntityCount: number;
  onCreateGroupFromSelection: (name: string) => void;
  onAddSelectionToGroup: (groupId: string) => void;
  onRemoveSelectionFromGroup: (groupId: string) => void;
  onRenameGroup: (groupId: string, name: string) => void;
  onEnterGroupEdit: (groupId: string) => void;
  onExitGroupEdit: (groupId: string) => void;
  onUngroup: (groupId: string) => void;
  onSelectGroup: (groupId: string) => void;
  onToggleGroupCollapsed: (groupId: string) => void;
};

export function AssemblyTreePanel({
  groups,
  placedMachines,
  civilReferences,
  selectedGroupId,
  activeGroupEditId,
  selectedEntityCount,
  onCreateGroupFromSelection,
  onAddSelectionToGroup,
  onRemoveSelectionFromGroup,
  onRenameGroup,
  onEnterGroupEdit,
  onExitGroupEdit,
  onUngroup,
  onSelectGroup,
  onToggleGroupCollapsed
}: AssemblyTreePanelProps) {
  const machinesById = new Map(placedMachines.map((machine) => [machine.instanceId, machine]));
  const civilById = new Map(civilReferences.map((item) => [item.id, item]));
  const selectedCount = selectedEntityCount;

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
        Groups are rigid assemblies. Use Edit Group to adjust an individual member.
      </p>
      <div className="assembly-list" aria-label="Object groups">
        {groups.length > 0 ? groups.map((group) => {
          const isEditing = activeGroupEditId === group.id;
          const members = group.objectIds.flatMap((objectId) => {
            if (objectId.startsWith("civil:")) {
              const civil = civilById.get(objectId.slice("civil:".length));
              return civil ? [{ id: objectId, name: civil.name, typeLabel: getCivilTypeLabel(civil.type) }] : [];
            }
            const machineId = objectId.replace(/^(object|machine):/, "");
            const machine = machinesById.get(machineId);
            return machine ? [{ id: objectId, name: machine.definition.name, typeLabel: machine.definition.category }] : [];
          });
          return (
            <article
              className={`assembly-group-row${selectedGroupId === group.id ? " is-selected" : ""}${isEditing ? " is-editing" : ""}`}
              key={group.id}
              data-testid={`assembly-group-row-${group.id}`}
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
                  <small>{members.length} item{members.length === 1 ? "" : "s"}</small>
                  {isEditing ? <small data-testid={`assembly-group-editing-${group.id}`}>Editing members</small> : null}
                </button>
              </div>
              {!group.collapsed ? (
                <div className="assembly-members">
                  {members.length > 0 ? members.map((member) => (
                    <span key={member.id}>{member.name} <small>{member.typeLabel}</small></span>
                  )) : <span>No objects assigned.</span>}
                </div>
              ) : null}
              <div className="assembly-actions">
                <button type="button" disabled={selectedCount === 0} onClick={() => onAddSelectionToGroup(group.id)}>
                  Add Selected
                </button>
                <button type="button" disabled={!isEditing || selectedCount === 0} onClick={() => onRemoveSelectionFromGroup(group.id)}>
                  Remove Selected
                </button>
                {isEditing ? (
                  <button type="button" aria-label={`Exit Group Edit ${group.name}`} onClick={() => onExitGroupEdit(group.id)}>
                    Exit Group Edit
                  </button>
                ) : (
                  <button type="button" aria-label={`Edit Group ${group.name}`} onClick={() => onEnterGroupEdit(group.id)}>
                    Edit Group
                  </button>
                )}
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
                <button className="danger-action" type="button" aria-label={`Ungroup ${group.name}`} onClick={() => onUngroup(group.id)}>
                  Ungroup
                </button>
              </div>
            </article>
          );
        }) : <p className="empty-selection">No groups yet. Select objects, then create a group.</p>}
      </div>
    </section>
  );
}
