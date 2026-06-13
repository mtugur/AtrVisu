# Viewpoints & Presentation States v0.1

Viewpoints store named camera positions for layout review and customer presentation. A viewpoint is part of the layout snapshot, so it is preserved by autosave, layout export/import, project revisions, and project export/import.

## Stored Data

Each viewpoint stores:

- `id`
- `name`
- optional `description`
- `camera.alpha`
- `camera.beta`
- `camera.radius`
- `camera.targetX`
- `camera.targetY`
- `camera.targetZ`
- optional camera position diagnostics
- optional display state
- `createdAt`
- `updatedAt`

Camera angles are stored in Babylon.js orbit-camera radians internally. The UI does not expose new numeric camera fields in v0.1.

## Display State

Display state is intentionally small in v0.1. A viewpoint may restore:

- annotation visibility
- connection point visibility
- collision envelope visibility
- selected object ids
- selected annotation id

The display state is optional. Older layouts without `viewpoints` or without `displayState` load safely.

## User Workflow

Use the right-panel Viewpoints section to:

- enter a viewpoint name
- capture the current camera view
- select a saved viewpoint
- apply or go to the selected viewpoint
- update the selected viewpoint from the current camera
- rename or delete a viewpoint
- step to the previous or next viewpoint

Previous and Next provide the v0.1 presentation navigation flow. Full slideshow mode, timed playback, thumbnails, and per-view overlay presets are future work.

## Persistence

Viewpoints live inside the layout snapshot as `viewpoints`. Because project revisions store layout snapshots, no separate storage table is required. Autosave remains a recovery mechanism only; named project/revision saves are still the canonical project workflow.
