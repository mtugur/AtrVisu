# Runtime Viewport Isolation v0.1

Audit date: 2026-07-23

Branch: `feat/viewport-isolation-resize-invariance-v01`

Status: automated runtime viewport evidence ready; focused orthographic manual acceptance pending; Phase 0 remains open

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

Coalesced resize reasons use deterministic precedence:

1. `dock-collapse`
2. `dock-resize`
3. `window`
4. `splitter`
5. `manual`

A generic observer notification cannot replace an already pending explicit dock or window reason. A later explicit reason can upgrade a pending generic reason. The initial reconciliation remains `manual`, pending intent is cleared after reconciliation or cancellation, and unchanged dimensions do not advance resize generation merely to change the reported reason.

The general Babylon scene lifecycle no longer owns a separate window-only resize listener. Viewport resizing does not dispose or recreate the Engine, Scene, Camera, meshes, pointer handlers, or render loop.

## Camera and application invariance

The diagnostics-only bridge returns a serializable camera snapshot containing:

- camera mode;
- alpha, beta, and radius;
- target and position coordinates;
- FOV;
- orthographic bounds when present;
- resolved orthographic center, horizontal and vertical world spans, viewport aspect ratio, and horizontal/vertical world-units-per-pixel.

Pure resize never calls camera home/reset. Perspective intent remains unchanged while Babylon updates projection internals.

Perspective-to-orthographic activation no longer interprets render pixels as world units. When no explicit framing is supplied, AtrVisu uses the requested ArcRotate `radius` as the effective target distance and derives the vertical world span with `2 * radius * tan(fov / 2)`. The initial center is deterministic at `(0, 0)`, and the horizontal span comes from the committed CSS viewport aspect ratio. A legacy orthographic viewpoint without framing uses this same world-space fallback. If the camera is already orthographic, applying a legacy state preserves its current valid center and vertical span.

`ViewpointCameraState` now carries optional serializable orthographic framing with `centerX`, `centerY`, and `verticalWorldSpan`. Orthographic capture and update persist those scalar values; apply restores explicit framing after finite/positive validation and clamps vertical span to `0.5` through `500` world units. Perspective viewpoints omit the optional field. Existing projects and legacy viewpoints remain valid, and the normal layout export/import normalization path preserves the optional data without a persistence migration.

Orthographic wheel input is handled in a narrow non-passive capture listener so Babylon's perspective radius-only wheel path cannot compete with explicit orthographic bounds. Pixel wheel delta uses an exponential base of `1.0015`; zoom-in reduces and zoom-out increases vertical span within the same `0.5` to `500` limits. Where a stable floor intersection is available, the orthographic center is adjusted in camera view space to preserve the point under the pointer; otherwise zoom remains centered deterministically. Perspective wheel handling continues through the existing Babylon input path.

After `engine.resize()`, AtrVisu preserves the current orthographic center and user-selected vertical span and recomputes only the horizontal span from the committed CSS aspect ratio. This keeps horizontal and vertical world-units-per-pixel equal without changing target, alpha, beta, radius, camera mode, or scene lifecycle. Panel collapse/reopen, panel-width dragging, and browser aspect-ratio changes therefore retain the orthographic zoom selected before resize.

The opt-in `?e2eDiagnostics=1` bridge provides a read-only invariant snapshot for:

- Runtime Selection IDs and primary selection;
- active group edit ID;
- machine, civil, and annotation transforms;
- group membership;
- layer visibility and lock state;
- complete serialized undo and redo stacks plus their depths;
- project dirty state;
- simulation running state and speed.

The invariant snapshot builder itself is gated by the diagnostics flag. Without `?e2eDiagnostics=1`, AtrVisu does not build diagnostics-only entity fingerprints, serialize history snapshots for viewport diagnostics, or expose a global viewport debug API. Diagnostics dependencies use the actual undo/redo array references so same-length history replacement cannot leave an enabled snapshot stale.

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
- deterministic resize-reason precedence and pending-reason reset;
- explicit and Babylon default/null orthographic bound resolution;
- perspective radius/FOV world-span derivation without render-pixel fallback;
- explicit framing validation, clamping, bounds conversion, capture, and tolerance comparison;
- legacy orthographic framing preservation and deterministic fallback;
- orthographic wheel delta normalization, zoom direction, finite repetition, and minimum/maximum clamping;
- deterministic zoom-to-pointer center translation;
- center and vertical-span preservation across aspect-ratio changes;
- equal horizontal and vertical world-units-per-pixel after orthographic resize;
- perspective no-write behavior and orthographic camera intent equivalence;
- diagnostics-disabled lazy snapshot suppression and diagnostics-enabled complete snapshots;
- same-length history replacement and machine movement diagnostics updates;
- selection, transforms, groups, layers, history, dirty, and simulation snapshot comparison;
- AppShell viewport inset rendering.

Browser coverage verifies:

- right-panel collapse and reopen change viewport width while preserving panel width;
- real pointer-driven panel-width changes resize the viewport inversely;
- panel collapse/reopen reports `dock-collapse`, panel-width dragging reports `dock-resize`, and browser resizing reports `window`;
- perspective-to-orthographic activation preserves a practical projected object scale and does not use viewport pixel height as world span;
- real orthographic wheel input changes vertical span and projected machine size without changing target, radius, selection, transforms, history, dirty state, or scene lifecycle;
- orthographic viewpoint capture, update, and apply restore center, vertical span, target, and orbit state through the real Viewpoints UI;
- orthographic zoom survives panel collapse/reopen and a materially different browser aspect ratio without visual-scale distortion;
- cancelled dirty Library Manager collapse causes no viewport resize;
- accepted collapse causes a committed resize;
- browser/container resize reconciles CSS and backing dimensions;
- all covered resize paths preserve scene lifecycle generation, camera intent, selection, transforms, history, dirty state, and simulation state;
- section expansion with unchanged viewport dimensions does not create a duplicate resize;
- no red console or page errors.

Final local validation:

- `npm.cmd audit`: 0 vulnerabilities
- `npm.cmd run build`: passed
- `npm.cmd run test -- --run`: 89 files / 813 tests passed
- `npm.cmd run test:e2e`: 27 tests passed
- `git diff --check`: passed

## Remaining limitations

- DPR-only changes are reconciled when the browser emits a resize notification; there is no separate cross-browser DPR media-query subscription.
- Focused manual acceptance of orthographic activation and wheel zoom remains required before the usability blocker is declared closed.
- The Runtime Feature Access closure gate still needs to consume live command, panel, selection, entity, and viewport reachability.
- This package does not mark Phase 0 complete.
