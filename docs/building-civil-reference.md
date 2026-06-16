# Building / Civil Reference Geometry v0.1

Building and civil references are lightweight layout guides for factory planning. They help show factory boundaries, walls, columns, restricted areas, walkways, service corridors, and reference zones while users position machines.

This is not architectural CAD, BIM, or DXF/DWG import. v0.1 is intentionally simple and practical.

## Supported Types

AtrVisu supports these civil reference types:

- `column`: rectangular column obstacle
- `wall`: rectangular wall segment
- `floor-area`: flat floor boundary or area
- `walkway`: flat service or walking corridor
- `restricted-area`: flat warning/restricted zone
- `reference-zone`: general flat planning zone
- `door-opening`: simple opening marker

All items store Plan X / Plan Y in millimeters. Width, depth, and height are positive physical dimensions in millimeters. Rotation is stored as degrees.

Plan X / Plan Y / elevation use the global front-left-bottom reference point. Babylon.js meshes are still center-origin boxes internally, so rendering converts the stored civil reference point to the mesh center. Resizing or rotating a wall, column, floor area, walkway, restricted area, or reference zone keeps its stored reference point stable.

## Layers

New civil references are created on the `Default` layer. There is no hidden current-layer behavior in v0.1. Users can manually assign a civil reference to another layer from Civil Reference Properties.

A common workflow is:

1. Create a user layer named `Civil` or `Building`.
2. Add columns, walls, floor areas, and walkways.
3. Assign those civil references to the Civil layer.
4. Lock the Civil layer when references should stay fixed.

Hidden layers hide civil references and prevent scene picking. Locked layers prevent civil reference movement, editing, and deletion.

## Selection And Editing

Civil references are selectable in the scene. Selecting one opens Civil Reference Properties in the right panel.

Civil references are first-class layout entities internally while remaining in the separate Building / Civil UI section. Mixed selection with machines preserves the actual click order across entity types. The first selected visible entity is the primary entity for Align to Primary, regardless of whether it is a machine, wall, column, or other civil reference. No selection or alignment tool should prioritize machines over civil references unless that behavior is explicitly documented.

Editable fields include:

- name
- type
- layer
- Plan X
- Plan Y
- elevation
- width / length
- depth / thickness
- height
- rotation angle
- item locked

Plan X and Plan Y support negative coordinates. Physical dimensions reject invalid negative values through the shared numeric field rules.

## Movement

Unlocked civil references can be dragged on the floor plane. They can also be moved precisely by editing Plan X and Plan Y.

Item lock and layer lock both prevent accidental movement. Dragging creates one reasonable undo/redo history entry.

## Alignment

Civil references are first-class alignable layout entities. Columns, walls, restricted areas, walkways, floor areas, and reference zones can be aligned with other civil references and with machines.

Alignment uses the same footprint-bound logic as machines:

- align left / right
- align front / back
- align center X / center Y
- distribution and equal-gap tools where enough entities are selected
- pair alignment and anchor snap for two selected entities

The v0.1 alignment bounds are axis-aligned footprint bounds derived from the front-left-bottom reference point, dimensions, and rotation. Locked selected entities block alignment with a clear message. Hidden civil references do not participate in alignment.

## Collision

Civil references participate in collision diagnostics according to their type.

Solid / blocking in v0.1:

- wall
- column

Non-solid reference geometry by default:

- floor-area
- walkway
- reference-zone
- restricted-area unless a future blocking flag is added

A machine hitting a wall or column creates a hard collision result. Hidden civil references are ignored. Locked visible civil references still participate as static obstacles.

Future work may add configurable restricted-area blocking and object-to-wall clearance checks.

## Persistence

Civil references are part of layout snapshots and are preserved by:

- layout export/import
- project save/load
- revision save/load
- autosave recovery
- undo/redo

Older layouts without `civilReferences` load safely.

## Future Ideas

- DXF/DWG import
- multi-floor building model
- column grid generation
- wall drawing tool
- civil templates
- restricted-area collision rules
- floor elevation and basement levels
- object-to-wall clearance checks
