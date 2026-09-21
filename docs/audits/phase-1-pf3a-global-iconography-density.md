# PF-3A Global Iconography and UI Density Audit

## Decision

PF-3A establishes one Workbench icon authority and a bounded compact-action grammar. The package is ready for manual product acceptance only after the exact-head Quality Gate and `pf3a-global-iconography-density` evidence artifact succeed. PF-3B remains open.

## Baseline

- Base: reconciled with governance authority from `main` at `d6ca5981207bd02b19223a8393c5bad2d00945fc`
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
- Phase-1 Plan movement follows Interaction Standard §3 and ADR-001: direct Machine/Civil body pointer-down captures the real finite picked-point elevation, then the entire gesture uses only that fixed floor-parallel plane. No PositionGizmo, proxy, adaptive camera mapping, Jacobian, fallback solver, hysteresis or smoothing remains in production Plan movement.
- The drag helper snapshots canonical millimetre starts and derives each frame's Plan delta from the original same-plane intersection. Group and multi-selection movement remains atomic and rigid; Elevation does not change. `applied`, valid snapped `noop` and `blocked` remain distinct. A no-op keeps the gesture alive; only the first applied frame records Undo history, so one drag is one transaction.
- At approximately 20 m with camera geometry near/below the picked plane, a finite forward ray intersection may be unavailable or poorly conditioned. This is an accepted known limitation, not a solved feature; the runtime does not switch to a second solver or silently remap movement. P1-BLD1, P1-BLD2 and PF-3B remain separate future scopes.

## Governance Evidence

- Registry tests require unique IDs, resolution of every declared semantic ID, defined unknown-ID behavior and decorative SVG semantics.
- Source governance rejects direct `lucide-react` imports outside the registry, standalone pseudo-glyph disclosure controls across maintained surfaces and text regressions in the Library clear/reset actions.
- Component tests protect the shared action primitive, disclosure semantics, Primary Dock labels/counts, Group actions, Viewpoint actions and Library reset behavior.
- Chromium coverage exercises the real Primary Dock, Library, Explorer, Layers, Groups, Viewpoints, Inspector and Native Import surfaces with no red console/page errors.
- Chromium coverage exercises persisted current and migrated UI-preference states across Inspector Auto/Pin, open/collapsed right-panel combinations, Primary Dock open/collapsed combinations, Machine, Civil and Group selection, floor clear, Groups edit completion, Arrange, direct body drag and hard reload. The shared console guard fails every relevant PF-3A runtime scenario on `Maximum update depth exceeded`, unexpected console errors or page errors without filtering or suppression.
- Correction B unit coverage protects composite Group bounds, mixed/group alignment, rigid atomic movement and Edit Group member projection.
- Fixed-plane helper unit coverage protects picked elevation, same-plane intersection, rigid original-position delta, negative coordinates, snapped no-op continuity, atomic locked/unresolved refusal and the accepted no-forward-intersection limitation. Boundary audit rejects reclassification away from direct body drag.
- Chromium covers the accepted Correction B route: Group body drag crosses a snap no-op and then applies in one gesture, both members receive the same delta, and one Undo/Redo restores/reapplies the group. High picked-point Machine and Civil drags preserve Elevation; a mixed rigid Group shares the delta. Imported GLB body drag preserves Elevation and scene lifecycle. A near-plane 20 m route remains finite and console-clean without a manipulator or hidden remap. Locked Group drag/nudge are rejected atomically.
- The remaining React feedback edge was reproduced from the live runtime loop: `BabylonScene` published performance metrics into App state on every render frame even while Performance Benchmark was closed. That unintended App-wide render clock amplified commit-lagged command availability and focus reconciliation. Metrics now have no consumer while the benchmark surface is closed and publish at a bounded 250 ms cadence while it is open. Command surfaces receive one post-commit notification only when their semantic availability projection changes, so Undo/Redo and other enablement no longer depend on incidental animation-frame renders. The Inspector Auto effect also compares the canonical ordered selection-ID signature rather than recreated Runtime Selection identity. Chromium verifies zero closed-benchmark publications, bounded live publication, publication stop after close, stable Babylon lifecycle and no maximum-depth/console/page errors through the persisted preference and body-drag matrix.
- Responsive evidence covers 1440 by 900, 1024 by 768 and 640 by 800 without document-level horizontal overflow.

## Preserved Boundaries

- No command, panel, selection, history or domain authority was introduced.
- PF-2A discovery/ranking/preferences and PF-2B import/persistence/Add semantics are unchanged.
- Viewport rendering, grid, floor, lighting, materials, camera and selection visual language are unchanged and remain PF-3B scope.
- Project and storage schemas are unchanged; no dependency was added.
- PF-3B, Building and Levels are explicitly out of scope.

## Acceptance State

- Automated technical acceptance: exact-head Quality Gate required.
- Evidence artifact: `pf3a-global-iconography-density` retains accepted iconography captures and includes `33-console-clean-persisted-state.png`, `34-body-drag-machine.png`, `35-body-drag-civil.png`, `36-body-drag-group.png`, `37-body-drag-imported-glb.png` and `38-console-clean-migrated-current-session.png`.
- Manual visual acceptance: required after green exact-head CI.
- PF-3 overall: not complete; PF-3B remains open.
