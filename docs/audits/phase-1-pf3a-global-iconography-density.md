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
- Quick Toolbar retains its registered command set and existing 32 pixel geometry.
- Inspector engineering labels and workflow decision text remain visible.

## Governance Evidence

- Registry tests require unique IDs, resolution of every declared semantic ID, defined unknown-ID behavior and decorative SVG semantics.
- Source governance rejects direct `lucide-react` imports outside the registry, standalone pseudo-glyph disclosure controls across maintained surfaces and text regressions in the Library clear/reset actions.
- Component tests protect the shared action primitive, disclosure semantics, Primary Dock labels/counts, Group actions, Viewpoint actions and Library reset behavior.
- Chromium coverage exercises the real Primary Dock, Library, Explorer, Layers, Groups, Viewpoints, Inspector and Native Import surfaces with no red console/page errors.
- Responsive evidence covers 1440 by 900, 1024 by 768 and 640 by 800 without document-level horizontal overflow.

## Preserved Boundaries

- No command, panel, selection, history or domain authority was introduced.
- PF-2A discovery/ranking/preferences and PF-2B import/persistence/Add semantics are unchanged.
- Viewport rendering, grid, floor, lighting, materials, camera and selection visual language are unchanged and remain PF-3B scope.
- Project and storage schemas are unchanged; no dependency was added.

## Acceptance State

- Automated technical acceptance: exact-head Quality Gate required.
- Evidence artifact: `pf3a-global-iconography-density` with eleven named runtime captures, including Workspace preference disclosure evidence.
- Manual visual acceptance: required after green exact-head CI.
- PF-3 overall: not complete; PF-3B remains open.
