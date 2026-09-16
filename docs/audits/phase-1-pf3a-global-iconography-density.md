# PF-3A Global Iconography and UI Density Audit

## Decision

PF-3A establishes one Workbench icon authority and a bounded compact-action grammar. The package is ready for manual product acceptance only after the exact-head Quality Gate and `pf3a-global-iconography-density` evidence artifact succeed. PF-3B remains open.

## Baseline

- Base: `main` at `cc8afef2818871e71dba085b95e0b07bba7faa55`
- Branch: `feat/phase-1-global-iconography-density-v01`
- Existing command, panel, selection, history, layer, group, viewpoint and asset authorities remain unchanged.

## Implemented Contract

- `src/workbench/icons/iconRegistry.tsx` is the only product source importing `lucide-react`.
- The semantic registry covers shell navigation, assets, layer/group/viewpoint actions, state toggles, navigation and local close controls.
- `WorkbenchActionButton` owns icon-only and icon-plus-short-text presentation without owning execution.
- Primary Dock keeps the canonical order and 292 pixel default while rendering five icon-only tabs with separate non-focusable count badges.
- Library asset metadata stays textual; Favorite, Add and Custom Variant are target-specific icon actions; Import 3D Asset remains icon plus text.
- Library hierarchy, Inspector sections, contextual contributions, Library Manager groups and Workspace preference navigation use registered disclosure icons; Library filter reset actions use the canonical compact clear action.
- Layers, Groups and Viewpoints retain their domain handlers while replacing repeated text-button walls and pseudo-glyph controls with compact action rails.
- Group membership, edit, completion, rename and ungroup actions use distinct package, assembly-edit, check, text-rename and danger semantics without changing their handlers.
- Inspector visibility has one shell-owned Auto/Pinned mode: Auto follows Runtime Selection while Pinned leaves open/collapse control entirely manual. Same-value preference updates do not publish or persist another snapshot.
- Library sources render their identity once, omit an equivalent semantic root row and expose real category/family children in a compact hierarchy with 90-100 pixel asset rows and a fixed action rail.
- Quick Toolbar retains its registered command set and existing 32 pixel geometry.
- Inspector engineering labels and workflow decision text remain visible.
- Correction B promotes a selected Group to one derived spatial Arrange entity outside Edit Group mode. Its canonical bounds are the rotation-aware union of machine and civil member footprints, and Arrange results translate every resolved member by one atomic center delta without persisting a Group transform.
- Arrange uses a projection derived from Runtime Selection: selected Group roots suppress duplicate member entities in normal mode, while explicitly selected members remain independent inside Edit Group mode. Group, machine and civil entities share the existing alignment, pair-gap, distribution and equal-gap engine.
- Scene drag mutation now distinguishes `applied`, valid snapped `noop` and safety `blocked` outcomes. A no-op frame keeps the gesture and camera-detach state active without writing domain state or history; a later frame in the same gesture can cross the next snap threshold and apply normally.
- Plan Move uses Babylon's world-aligned PositionGizmo through a presentation-only selection proxy. Babylon X maps only to domain X, Babylon Z maps only to domain Y and the XZ plane handle moves both; vertical Y is disabled. Each gesture snapshots canonical Runtime Selection positions and derives one absolute delta from the immutable start, applies AtrVisu millimetre snap and atomic lock policy, and records history only on the first accepted frame. Standard Machines, imported GLB assets, Civil references, rigid Groups and independent multi-selection share the same authority without a persistent Group transform.
- Body free-drag remains a bounded convenience path: it captures the real picked surface and intersects pointer rays with one fixed horizontal plane at the picked elevation. Near-parallel, invalid or behind-camera geometry is unavailable and leaves selection valid; it never activates screen-space continuation, Jacobian inversion, conditioning, gain limiting, direction remapping or fallback-mode transitions. Elevation is invariant in both movement paths.

## Governance Evidence

- Registry tests require unique IDs, resolution of every declared semantic ID, defined unknown-ID behavior and decorative SVG semantics.
- Source governance rejects direct `lucide-react` imports outside the registry, standalone pseudo-glyph disclosure controls across maintained surfaces and text regressions in the Library clear/reset actions.
- Component tests protect the shared action primitive, disclosure semantics, Primary Dock labels/counts, Group actions, Viewpoint actions and Library reset behavior.
- Chromium coverage exercises the real Primary Dock, Library, Explorer, Layers, Groups, Viewpoints, Inspector and Native Import surfaces with no red console/page errors.
- Chromium coverage exercises persisted current and migrated UI-preference states across Inspector Auto/Pin, open/collapsed right-panel combinations, Primary Dock open/collapsed combinations, machine and Group selection, floor clear, Groups edit completion, Arrange, real drag and hard reload. The shared console guard fails every relevant PF-3A runtime scenario on `Maximum update depth exceeded`, unexpected console errors or page errors.
- Correction B unit coverage protects composite Group bounds, mixed/group alignment, rigid atomic movement, Edit Group member projection and no-op drag continuation.
- Correction G unit coverage protects Machine, Civil, Group and independent-selection proxy derivation; world-axis mapping; identical member deltas; absolute-from-start frames; snap on/off including off-grid starts; elevation invariance through 20 and 50 metre Civil cases; atomic locked/hidden/unresolved rejection; one gesture/one history transaction; and fixed-plane body-drag rejection without any production fallback solver.
- Correction G Chromium coverage drives the real PositionGizmo colliders for world X, Plan-Y and XZ movement across above, shallow, near-horizontal and below-camera states. It covers Standard Machine, imported GLB, 20/50 metre Civil, mixed rigid Group and independent mixed selection, plus snap, one-step Undo/Redo, locked rejection, camera/cursor recovery and unchanged scene lifecycle.
- The remaining React feedback edge was reproduced from the live runtime loop: `BabylonScene` published performance metrics into App state on every render frame even while Performance Benchmark was closed. That unintended App-wide render clock amplified commit-lagged command availability and focus reconciliation. Metrics now have no consumer while the benchmark surface is closed and publish at a bounded 250 ms cadence while it is open. Command surfaces receive one post-commit notification only when their semantic availability projection changes, so Undo/Redo and other enablement no longer depend on incidental animation-frame renders. The Inspector Auto effect also compares the canonical ordered selection-ID signature rather than recreated Runtime Selection identity. Chromium verifies zero closed-benchmark publications, bounded live publication, publication stop after close, stable Babylon lifecycle and no maximum-depth/console/page errors through the persisted preference and Plan Move matrix.
- Responsive evidence covers 1440 by 900, 1024 by 768 and 640 by 800 without document-level horizontal overflow.

## Preserved Boundaries

- No command, panel, selection, history or domain authority was introduced.
- PF-2A discovery/ranking/preferences and PF-2B import/persistence/Add semantics are unchanged.
- Viewport rendering, grid, floor, lighting, materials, camera and selection visual language are unchanged and remain PF-3B scope.
- Project and storage schemas are unchanged; no dependency was added.

## Acceptance State

- Automated technical acceptance: exact-head Quality Gate required.
- Evidence artifact: `pf3a-global-iconography-density` retains the accepted iconography captures and adds focused Correction G evidence: `33-console-clean-persisted-state.png`, `34-plan-move-machine.png`, `35-plan-move-civil.png`, `36-plan-move-group.png`, `37-plan-move-imported-glb.png` and `38-console-clean-migrated-current-session.png`.
- Manual visual acceptance: required after green exact-head CI.
- PF-3 overall: not complete; PF-3B remains open.
