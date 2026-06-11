# Advanced Alignment & Multi-Select Foundation v0.1

AtrVisu supports transient multi-selection for layout editing.

## Selection Model

- Selection state is UI-only and is not saved in layouts, revisions, autosave, or project exports.
- `selectedObjectIds` stores every selected scene object.
- `primarySelectedObjectId` stores the alignment anchor.
- Single click replaces the selection.
- `Ctrl` or `Shift` click toggles an object in the selection and makes it primary when selected.
- Empty floor click clears selection.
- `Escape` clears selection.
- `Delete` removes every selected object after confirmation.

## Movement

Dragging one selected object moves the full selected set by the same plan delta. Positions are stored in millimeters and rendered in Babylon.js meters.

Keyboard nudge applies to the current selection:

- Arrow keys move by the default nudge step.
- `Shift` uses the large step.
- `Alt` or `Ctrl` uses the small step.

Nudge settings are stored in browser `localStorage`.

## Viewport Navigation

- Mouse wheel zoom attempts to keep the ground point under the cursor near the cursor while zooming.
- If the ground plane cannot be picked, zoom falls back to the normal orbit-camera target behavior.
- Middle mouse drag pans the view along the plan.
- Right mouse drag also pans the view.
- `Shift` + left mouse drag pans the view as a fallback.
- Panning is camera-only and does not clear selection or move selected objects.

## Alignment

Alignment tools are available when at least two objects are selected. The primary selected object is kept fixed and acts as the anchor.

Supported foundation actions:

- Align left, right, front, back
- Align center X and center Y
- Distribute horizontally or vertically by center
- Equalize gaps on X or Y
- Pair alignment for exactly two selected objects
- Pair gap placement in millimeters
- Pair footprint anchor snap

## Bounds Limitation

v0.1 uses axis-aligned plan bounds. Rotated objects are measured by their enclosing axis-aligned bounding box. This keeps the math predictable and renderer-independent, but it is not an oriented-bound alignment system yet.

## Pair Footprint Anchor Snap

When exactly two objects are selected, AtrVisu treats the primary selected object as the moving object and the other selected object as the fixed reference.

Available footprint anchors:

- Center
- Left edge center
- Right edge center
- Front edge center
- Back edge center
- Front-left corner
- Front-right corner
- Back-left corner
- Back-right corner

The action "Snap Primary Anchor to Secondary Anchor" moves the primary object so the chosen primary anchor coincides with the chosen secondary anchor.

Zero-gap edge-to-edge actions use the same footprint bounds:

- Primary left edge to secondary right edge
- Primary right edge to secondary left edge
- Primary front edge to secondary back edge
- Primary back edge to secondary front edge

This is not connection point snapping. ATARA connection points remain available as metadata, but automatic connection point snap, routing, conveyor transfer logic, and utility routing are future work.

## Undo And Redo

Undo/redo is an in-memory layout editing history.

Included operations:

- Add object
- Delete selected object or objects
- Single and multi-object drag movement
- Keyboard nudge
- Alignment and distribution actions
- Pair alignment and pair anchor snap
- Single-object position, elevation, rotation, and flow-direction edits
- Layout import replacement

Excluded transient state:

- Selection
- Panel expansion and width
- Camera position
- Modal state
- Project list metadata outside the current layout snapshot

History is limited to 50 snapshots and is cleared when loading a benchmark scene or project revision. It is not persisted after browser refresh.
