# AtrVisu Viewport Navigation Standard

Status: Phase-1 closeout normative contract.

Applies to:
- canonical view-parallel camera Pan (Stage A contract; Stage B PENDING)
- Fit View
- ViewCube / standard and axonometric view presets
- passive world-axis orientation triad
- left/right dock screen-space viewport stability

Does not redefine PF-3A object movement.

The Pan contract extension is the separate governance package authorized by PR #122 review `5407842477`. It does not certify or modify PR #122 runtime. Benchmark: `docs/benchmarks/P1_VIEWPORT_PAN_GRID_EVIDENCE.md`; decision: `docs/adr/ADR-007-view-parallel-camera-pan-grid-readability.md`.

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

Preset-vector contract:
- represent each clicked cube zone as a camera-side vector in AtrVisu domain axes;
- face vectors are exactly one of (+/-X, +/-Y, +/-Z);
- edge vectors are the normalized sum of their two adjacent face vectors;
- corner vectors are the normalized sum of their three adjacent face vectors;
- adapter mapping to Babylon camera-side coordinates is
  `(domainX, domainY, domainZ) -> (babylonX, babylonY, babylonZ) = (domainX, domainZ, domainY)`;
- derive ArcRotate orientation from the mapped unit vector using
  `alpha = atan2(babylonZ, babylonX)` and
  `beta = acos(clamp(babylonY, -1, 1))`;
- pure Top and Bottom use canonical `alpha = -PI/2` so Top keeps +X to screen-right and +Y toward screen-up;
- ArcRotate pole singularity is handled only by a frozen pole epsilon:
  `VIEW_PRESET_POLE_EPSILON_RAD = 0.01`; clamp beta to
  `[0.01, PI - 0.01]`;
- no sign repair, camera-angle exception or fallback orientation is allowed.

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
- new orbit gesture model; Pan runtime replacement is outside the original P1-CLOSE-NAV PR #122 and belongs only to the separately reviewed Stage B package after the section 11 contract is merged;
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
- resulting camera-side unit vector matches the canonical preset vector; for Top/Bottom compare direction with the frozen 0.01-rad pole approximation rather than requiring beta=0/PI;
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

## 11. Canonical camera Pan and acceptance

### Mental model and authority

- Pan is view-parallel camera translation, not floor dragging or PF-3A entity Plan Move.
- Direct middle-mouse drag remains required. Existing secondary pan bindings may remain only if they resolve through the exact same Runtime Viewport / BabylonScene camera-pan authority.
- Pan MUST NOT require a floor hit, scene hit, selected entity, depth-buffer hit or intersection with domain Z=0. It works on empty viewport space as well as over geometry.
- Grab direction is explicit: pointer right/down moves viewed content right/down at the reference depth.
- Perspective scale is defined at camera-target depth. Orthographic scale is defined by the current orthographic world span, not camera pixels interpreted as world units.
- At gesture start, the canonical reference plane passes through the current camera target and is parallel to the viewport. The reference plane and initial reference point are fixed for the gesture's acceptance oracle; neither comes from a floor/entity pick.
- Camera position and target translate together in that viewport plane. Alpha, beta, orientation, radius, FOV, projection mode and orthographic span remain unchanged.
- A non-Top vertical pan may change camera-target Elevation. This is camera-only state: entity/domain Elevation does not change.
- Pan remains available in every canonical face/edge/corner view, including exact Front, Back, Left and Right orthographic views. There is no floor-ray dead zone.
- Event cadence cannot change meaning, gain or final framing. Gain clamps, catch-up, alternating compensation, angle-specific sign repair, hidden fallback planes, smoothing, hysteresis and retry loops are forbidden.
- No entity mutation, selection change, project history/dirty transition or scene/canvas recreation is permitted. Existing control release/cancel and other orbit/wheel routes must remain deterministic and unchanged.

### User-observable acceptance oracle

Use real MMB input at 1440x900 DPR1 and the supported narrow viewport (640x800 DPR1 where applicable), without diagnostic-only camera mutation. Use existing real controls to enter:

1. default perspective;
2. ordinary wheel-zoomed perspective;
3. oblique and shallow perspective;
4. real Fit perspective;
5. Top orthographic;
6. exact Front/Back/Left/Right orthographic; Bottom availability is also required by the all-face rule;
7. a representative axonometric edge and corner.

In each state run +120/-120 horizontal, +120/-120 vertical, 120x80 diagonal and slow 240 px multi-step drags from the same initial camera. Restore through existing authority between comparisons. Include empty space and mixed Machine/Civil/Group context; selection does not control Pan availability.

- Pick the initial pointer's reference point on the gesture-start camera-target-depth, viewport-parallel plane as an observation oracle, not a scene hit requirement.
- Project that same fixed world point at every pointer step. It follows grab direction continuously without alternating stalls, reversal or catch-up; final screen residual <= 1 CSS px versus the pointer displacement.
- Compare 1x120, 8x15 and 24x5 representations of the same path from the same camera. Their final projected positions differ by <= 1 CSS px.
- Reverse the path and return within <= 1 CSS px of the initial projection.
- Alpha/beta/radius/FOV/projection/ortho span remain unchanged; position and target undergo the same camera translation.
- Selection IDs/order/primary, canonical entity transforms/Elevation, history, dirty state, canvas identity and engine/scene/canvas lifecycle remain unchanged. No console/page errors; no blocker warning filtering.
- Record viewport CSS/render dimensions, DPR, pointer trajectory, reference plane/point, projected point, complete before/after camera state and invariants. Do not assert only helper math, finite deltas or implementation-specific internal gains.

### Stage boundary

Stage A is governance only. Stage B implementation remains PENDING and requires an independent bounded task after governance review/merge. Fit inclusion/framing, ViewCube preset vectors/pole epsilon, side-dock invariance, saved viewpoints, existing orbit/wheel semantics and ADR-001 body drag are not changed by this contract. No runtime acceptance is claimed by Stage A CI.
