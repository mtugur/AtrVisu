# Runtime Viewport Isolation v0.1

Audit date: 2026-07-23

Branch: `feat/viewport-isolation-resize-invariance-v01`

Status: runtime viewport package ready; Phase 0 remains open

## Canonical identity and ownership

- The main 3D viewport has the canonical ID `viewport.main`.
- React and `AppShell` own committed shell layout and the right-panel inset.
- `BabylonScene` remains the only owner of the Babylon Engine, Scene, Camera, canvas, render loop, and resize controller.
- One stable Runtime Viewport Bridge is created for each `App` lifetime.
- Commit-safe bindings resolve the current Babylon runtime without rebuilding the bridge or exposing mutable Babylon objects.

## Resize path

`AppShell` renders a dedicated `scene-viewport-host`. Its right inset is the committed right-panel width, or zero while the shell is collapsed. The Babylon resize controller observes this actual host with `ResizeObserver`.

The same controller also receives:

- committed right-panel collapse and reopen intent;
- committed panel-width changes;
- browser resize notifications;
- observable device-pixel-ratio changes through the browser resize path;
- explicit preserve-only runtime resize requests.

Notifications are coalesced through one animation-frame queue. Reconciliation reads the latest committed host bounds, defers non-positive dimensions, and calls `engine.resize()` only when CSS width, CSS height, or device pixel ratio changed. Repeated identical observations do not create a resize loop.

The general Babylon scene lifecycle no longer owns a separate window-only resize listener. Viewport resizing does not dispose or recreate the Engine, Scene, Camera, meshes, pointer handlers, or render loop.

## Camera and application invariance

The diagnostics-only bridge returns a serializable camera snapshot containing:

- camera mode;
- alpha, beta, and radius;
- target and position coordinates;
- FOV;
- orthographic bounds when present.

Pure resize never calls camera home/reset and does not write camera parameters. Perspective intent remains unchanged while Babylon updates projection internals. Orthographic bounds remain unchanged because v0.1 does not introduce aspect-driven framing mutation.

The opt-in `?e2eDiagnostics=1` bridge also provides a read-only invariant snapshot for:

- Runtime Selection IDs and primary selection;
- active group edit ID;
- machine, civil, and annotation transforms;
- group membership;
- layer visibility and lock state;
- undo and redo depths;
- project dirty state;
- simulation running state.

The production runtime exposes no global viewport debug API.

## Reachability

`viewport.main` reports:

- registered and bound state;
- visibility and availability;
- CSS and canvas backing dimensions;
- device pixel ratio;
- scene lifecycle generation;
- resize generation and latest reason;
- camera mode and camera resolvability.

Unknown, unbound, unavailable, unsupported non-preserving, and deferred requests return explicit results. Required runtime reachability fails when `viewport.main` lacks a live binding or is unavailable.

## Validation evidence

Deterministic unit coverage verifies:

- canonical registration and duplicate rejection;
- stable bridge behavior with replacement bindings;
- one execution per accepted request and propagated failures;
- changed width, height, and DPR reconciliation;
- zero-size deferral and later acceptance;
- repeated-observation suppression and latest-size coalescing;
- perspective and orthographic camera snapshot equivalence;
- selection, transforms, groups, layers, history, dirty, and simulation snapshot comparison;
- AppShell viewport inset rendering.

Browser coverage verifies:

- right-panel collapse and reopen change viewport width while preserving panel width;
- real pointer-driven panel-width changes resize the viewport inversely;
- cancelled dirty Library Manager collapse causes no viewport resize;
- accepted collapse causes a committed resize;
- browser/container resize reconciles CSS and backing dimensions;
- all covered resize paths preserve scene lifecycle generation, camera intent, selection, transforms, history, dirty state, and simulation state;
- section expansion with unchanged viewport dimensions does not create a duplicate resize;
- no red console or page errors.

Final local validation:

- `npm.cmd audit`: 0 vulnerabilities
- `npm.cmd run build`: passed
- `npm.cmd run test -- --run`: 87 files / 774 tests passed
- `npm.cmd run test:e2e`: 26 tests passed
- `git diff --check`: passed

## Remaining limitations

- DPR-only changes are reconciled when the browser emits a resize notification; there is no separate cross-browser DPR media-query subscription.
- Orthographic bounds are preserved, not automatically recomputed for a new aspect ratio.
- The Runtime Feature Access closure gate still needs to consume live command, panel, selection, entity, and viewport reachability.
- This package does not mark Phase 0 complete.
