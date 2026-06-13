# Layers / Visibility / Lock / Isolate v0.1

Layers organize layout objects and annotations for editing, review, and presentation. They are layout-level data and are saved with project revisions, layout export/import, project export/import, and autosave.

## Default Layer

Every layout has a `Default` system layer:

- `id: "default"`
- visible by default
- unlocked by default
- cannot be deleted

Older layouts without layer data load safely. Machines and annotations without `layerId` resolve to the Default layer.

## Assignments

v0.1 supports layers for:

- machines / layout objects
- annotations

Connection points inherit the visibility and lock behavior of their parent machine.

## Visibility

When a layer is hidden:

- machines on that layer are not rendered in the scene
- annotations on that layer are not rendered in the scene
- hidden items are not pickable from the scene
- hidden machines are ignored by the visible collision overlay
- hidden data remains in the layout and can be shown again

If a selected item becomes hidden, the app clears the confusing selection state.

## Locking

When a layer is locked:

- machines and annotations remain visible
- locked machines can be selected but cannot be dragged, moved, edited, or deleted
- locked annotations can be selected but cannot be dragged, edited, or deleted
- locked machines remain collision-relevant when visible

Locked visible objects can still act as visual references and connection snap context, but the locked object itself must not move.

## Isolate And Show All

`Isolate` makes the selected layer visible and hides other regular layers. `Show All Layers` restores visibility for all layers. These actions do not delete data or change object positions.

## Limitations

v0.1 intentionally avoids full CAD layer-manager complexity. Future work may add:

- per-viewpoint layer visibility
- object groups and assemblies
- an assembly tree
- layer colors in scene geometry
- locked reference drawing templates
- building and floor layer templates
