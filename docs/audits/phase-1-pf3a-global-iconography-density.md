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
- Direct Plan drag uses one hybrid solver. Pointer-down captures the real finite Babylon picked point, frozen camera-relative Plan right/forward basis, local screen Jacobian and projected target scale. Horizontal picked-height projection is used only while determinant, condition number, world gain and orientation checks remain healthy; those frames preserve grab lock within two CSS pixels. Unsafe or perceptually inverted mappings switch once per gesture to a regularized, gain-bounded screen-stable continuation whose coherence limit derives from projected object size. The transition continues from the last applied Plan delta, so it cannot chatter, jump or reverse merely as camera pitch crosses the working plane. Only Plan X/Y changes, every domain Elevation value remains unchanged and rigid Group members receive one identical delta from the picked member surface.

## Governance Evidence

- Registry tests require unique IDs, resolution of every declared semantic ID, defined unknown-ID behavior and decorative SVG semantics.
- Source governance rejects direct `lucide-react` imports outside the registry, standalone pseudo-glyph disclosure controls across maintained surfaces and text regressions in the Library clear/reset actions.
- Component tests protect the shared action primitive, disclosure semantics, Primary Dock labels/counts, Group actions, Viewpoint actions and Library reset behavior.
- Chromium coverage exercises the real Primary Dock, Library, Explorer, Layers, Groups, Viewpoints, Inspector and Native Import surfaces with no red console/page errors.
- Chromium coverage exercises persisted current and migrated UI-preference states across Inspector Auto/Pin, open/collapsed right-panel combinations, Primary Dock open/collapsed combinations, machine and Group selection, floor clear, Groups edit completion, Arrange, real drag and hard reload. The shared console guard fails every relevant PF-3A runtime scenario on `Maximum update depth exceeded`, unexpected console errors or page errors.
- Correction B unit coverage protects composite Group bounds, mixed/group alignment, rigid atomic movement, Edit Group member projection and no-op drag continuation.
- Correction F unit coverage verifies the hybrid conditioning contract across multiple azimuth headings and a continuous pitch sweep through clearly above, moderate above, shallow above, near level, shallow below, moderate below and clearly below. It protects finite Plan deltas, frozen-basis direction, bounded gain, transition continuity, exact-mode two-pixel grab lock, fallback coherence and unchanged Standard Machine/imported GLB/Civil/Group elevation.
- Correction F Chromium coverage repeats the same pointer gesture through the seven machine camera pitches, sweeps 20 and 50 metre Civil columns, and exercises a mixed-elevation rigid Group from machine and Civil member surfaces. Runtime diagnostics expose solver mode, determinant, condition number, world gain, orientation classification, coherence limit and frozen Plan basis. Elevation, one-step Undo, rigid member deltas, Babylon lifecycle and no-red-console/page-error guarantees remain protected.
- The repeated React warning was traced to Runtime Panel reachability publishing a fresh derived array from a layout effect even when every semantic panel field was unchanged. The effect now preserves the existing state reference for equal projections, preventing the panel preference/hydration/selection dependency chain from feeding itself without timers, warning suppression or another state authority.
- Responsive evidence covers 1440 by 900, 1024 by 768 and 640 by 800 without document-level horizontal overflow.

## Preserved Boundaries

- No command, panel, selection, history or domain authority was introduced.
- PF-2A discovery/ranking/preferences and PF-2B import/persistence/Add semantics are unchanged.
- Viewport rendering, grid, floor, lighting, materials, camera and selection visual language are unchanged and remain PF-3B scope.
- Project and storage schemas are unchanged; no dependency was added.

## Acceptance State

- Automated technical acceptance: exact-head Quality Gate required.
- Evidence artifact: `pf3a-global-iconography-density` with thirty-two named exact-head runtime captures. The prior artifact actually contained twenty-eight files, not the previously documented twenty-nine. Correction F retains that set and adds `30-drag-stable-moderate-camera.png`, `31-drag-stable-shallow-camera.png`, `32-drag-stable-camera-below.png` and `33-console-clean-persisted-state.png`.
- Manual visual acceptance: required after green exact-head CI.
- PF-3 overall: not complete; PF-3B remains open.
