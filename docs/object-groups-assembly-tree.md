# Object Groups / Assembly Tree v0.1

Object groups organize related layout objects so a line, area, or system can be selected and understood quickly. Groups are layout-level organization data; they do not replace layers.

## Groups Versus Layers

- Groups organize machines into logical sets such as Packaging Line 1 or Palletizing Area.
- Layers control visibility and lock behavior.
- A hidden layer still hides group members.
- A locked layer still protects group members from movement, editing, and deletion.

## Data Model

Each group stores:

- `id`
- `name`
- optional `description`
- `objectIds`
- optional `annotationIds`
- optional `layerId`
- `collapsed`
- `createdAt`
- `updatedAt`

Objects may be outside any group. In v0.1, one object belongs to one group at a time. When an object is deleted, it is removed from group membership safely.

## Assembly Tree

The right-panel Assembly Tree supports:

- Create Group from Selection
- Add Selected
- Remove Selected
- Rename
- Delete
- Expand / collapse
- Select group

Selecting a group selects its visible member objects in the scene. Hidden layer members remain hidden and are not selected through the group.

## Movement

Groups use the existing multi-selection movement behavior. Dragging one selected member moves the selected members together. If the selected group contains a locked visible member, group movement is blocked for v0.1 so locked reference objects are not accidentally left behind or moved.

## Persistence

Groups are saved with the layout snapshot and survive:

- autosave restore
- layout export/import
- project revision save/load
- project export/import

Older layouts without groups load safely with an empty group list.

## Limitations

v0.1 intentionally avoids full CAD assembly complexity. Future work may add:

- nested groups
- assemblies
- BOM-like object tree
- group-level transforms
- group-level visibility
- group-level notes
- focus / zoom to group
- duplicate group
