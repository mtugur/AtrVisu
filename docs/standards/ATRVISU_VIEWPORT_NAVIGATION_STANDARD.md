# AtrVisu Viewport Navigation Standard

Status: Phase-1 closeout normative contract.

Applies to:
- Fit View
- ViewCube / standard and axonometric view presets
- passive world-axis orientation triad
- left/right dock screen-space viewport stability

Does not redefine PF-3A object movement.

## 1. Authority

All camera mutations MUST flow through the existing Runtime Viewport /
BabylonScene camera authority.

Forbidden:
- a ViewCube-owned camera store;
- direct DOM/E2E-only camera mutation;
- hidden camera pan compensation for panel layout;
- Fit View side effects triggered by unrelated UI actions.

## 2. Canonical AtrVisu axes

User-facing axes are the domain axes:

- +X = Right
- -X = Left
- -Y = Front
- +Y = Back
- +Z = Top
- -Z = Bottom

Rendering adapter mapping:
- domain X -> Babylon X
- domain Y (Plan Y) -> Babylon Z
- domain Z (Elevation) -> Babylon Y

All labels, ViewCube faces and triad directions use domain axes.

## 3. ViewCube

Placement:
- persistent upper-right viewport HUD;
- not part of scene geometry;
- non-exported editor affordance;
- kept clear of an open right dock using HUD safe-area layout;
- opening/closing the dock may move the HUD but MUST NOT move scene projection.

Interaction zones:
- 6 faces;
- 12 edges;
- 8 corners.

Face semantics:
- X+ / Right: camera is on +X side looking toward -X.
- X- / Left: camera is on -X side looking toward +X.
- Y- / Front: camera is on -Y side looking toward +Y.
- Y+ / Back: camera is on +Y side looking toward -Y.
- Z+ / Top: camera is above (+Z) looking downward.
- Z- / Bottom: camera is below (-Z) looking upward.

All face presets:
- orthographic;
- preserve current target;
- preserve current orthographic world span when already orthographic;
- when invoked from perspective, derive an orthographic span from the current
  visible framing before switching;
- do not Fit View.

Edge/corner presets:
- use the normalized sum of the participating face-side vectors;
- are deterministic orthographic axonometric views;
- preserve target and framing by the same rule as face presets;
- do not Fit View.

The cube MUST visually track current camera orientation after:
- mouse orbit;
- pan;
- zoom;
- viewpoint restore;
- Fit View;
- cube preset.

Phase 1 does not require drag-to-tumble on the cube.

## 4. Passive orientation triad

Placement:
- lower-left viewport HUD;
- persistent while the 3D viewport is active;
- non-pickable;
- non-exported editor affordance.

Behavior:
- displays X/Y/Z with positive-axis direction;
- rotates only as presentation to reflect current camera orientation;
- never mutates camera, selection, entity state, history or project dirty state;
- is not a snap/inference target.

## 5. Fit View command

Canonical command:
- existing seed `view.fitView` becomes required-runtime.

Required surfaces:
- compact Quick Toolbar icon;
- View menu entry;
- Command Palette/search.
- shortcut may be added only if it does not conflict with existing bindings.

Fit target geometry:
- currently visible Machines;
- currently visible Civil references.

Excluded:
- global workplane/grid;
- labels;
- annotations;
- connection markers;
- selection frames;
- collision/clearance frames;
- measurement helpers;
- ViewCube/triad/HUD;
- hidden-layer entities.

Empty layout:
- command is unavailable/disabled with a truthful reason;
- no camera mutation.

Framing:
- compute 3D world bounds of included visible geometry;
- use camera-space projected bounds, not only Plan AABB;
- add 10% framing margin on each side;
- preserve current camera orientation;
- preserve current projection mode;
- set target to included geometry bounds center;
- perspective: adjust radius so all included bounds fit horizontal and vertical
  FOV with margin;
- orthographic: update ortho extents so all included bounds fit with margin.

Fit View:
- does not mutate entities;
- does not change selection;
- does not create project Undo/Redo history;
- does not dirty the project;
- does not recreate canvas/scene.

## 6. Side-dock screen-space stability

Left and right docks MUST overlay one stable editor viewport/canvas.

Desktop acceptance:
- canvas CSS left/right remain invariant when primary/secondary dock opens,
  collapses or changes width;
- Babylon scene/canvas lifecycle generation remains unchanged;
- camera alpha/beta/radius/target/projection remain unchanged;
- entity transforms, selection, history and dirty state remain unchanged.

Screen-space invariant:
- choose at least one finite visible world point before dock change;
- project it to canvas/client coordinates;
- after dock open/close/resize, the point remains within +/-1 CSS pixel in X/Y.

The implementation MUST NOT satisfy this by:
- camera target change;
- panning;
- radius/FOV change;
- Fit View;
- scene recreation.

HUD safe-area:
- ViewCube may shift left of an open right dock;
- lower-left triad may shift right of an open left dock;
- measurement/status HUD may use the same safe-area contract;
- HUD relocation is presentation only.

## 7. Viewpoint compatibility

Viewpoint restore remains authoritative for its saved camera state.

After a saved viewpoint is restored:
- ViewCube and triad update to reflect the camera;
- no preset is silently selected/applied;
- Fit View is not invoked.

## 8. Commercial output

ViewCube and triad are editor-only and must not appear in clean commercial PNG.

Fit View affects the current camera view and therefore may intentionally affect
a later snapshot if the user invokes it before capture.

## 9. Frozen out-of-scope

- PF-3A Plan Move changes;
- new orbit/pan gesture model;
- camera smoothing/tuning experiments;
- camera collision;
- animated view transitions;
- per-Level camera planes;
- saved named standard-view preferences;
- ViewCube drag-to-tumble;
- Zoom Previous history;
- Fit Selection;
- multi-viewport layouts.

## 10. Required regression evidence

### Camera preset tests
For every face:
- resulting camera direction matches the canonical side;
- mode is orthographic;
- target is unchanged;
- no project/history/selection mutation.

At least:
- one edge;
- one corner;
- Top;
- Bottom;
- Front;
- Back;
- Left;
- Right
receive Chromium screenshot/state evidence.

### Fit View tests
- mixed Machine + Civil content;
- rotated long Beam;
- elevated Level content;
- perspective fit;
- orthographic fit;
- hidden-layer entity excluded;
- workplane excluded;
- no-op/unavailable on empty content;
- all projected included bounds lie inside viewport with >= configured margin.

### Dock tests
For left and right dock independently:
- open;
- collapse;
- resize;
and verify world-point screen coordinates remain within +/-1 CSS px.

### Lifecycle
All navigation and dock operations:
- console/page errors = 0;
- same scene/canvas lifecycle unless application itself is unloaded;
- no Maximum update depth;
- no GL_INVALID_VALUE.
