# Phase 1 P1-F ATARA Vertical Slice and Workbench Audit

Date: 2026-08-11

Branch: `feat/phase-1-atara-vertical-slice-workbench-v01`

Baseline: `4dbd1c73413ac8af3237f819bec1230ce3899af7`

## Decision

The P1-F implementation composes existing Phase 1 authorities into the final
workbench geometry. It does not introduce a new editor, entity, selection,
viewpoint, property, preference, workspace, project, or scene lifecycle store.

## Composition Evidence

| Region | Runtime result |
| --- | --- |
| Application/Menu/Command Bars | Registry-backed commands retain their live routes |
| Primary Dock | Library, Explorer, Layers, and Groups; one active contribution |
| Editor Host | Existing `layout.3d` host and Babylon canvas remain mounted |
| Secondary Dock | Context-only Inspector and P1-E schema projection |
| Bottom Dock | Generic contribution host with Viewpoints |
| Status Bar | Selection, primary entity, mm, snap, and dirty projections |
| Modal layer | Project, library, taxonomy, collision, simulation, benchmark, layout, and View-owned display/overlay tools |

The old right-side tool accumulation is not rendered. Its JSX remains behind a
disabled compatibility boundary solely as a bounded rollback reference.

## Authority Evidence

- Explorer rows are projections of canonical `PlatformEntity` values.
- Explorer and Babylon scene actions update the existing Runtime Selection.
- Primary selection order remains the selection authority's order.
- Smart Asset Properties continue through the P1-E schema projection.
- Primary and Bottom Dock operations route through the Runtime Panel Registry.
- Display and overlay controls route from the registered View menu to
  `panel.displayOverlayControls` and update the existing persisted
  `overlaySettings` authority.
- Inspector contributions for Annotations, Precision Placement, Alignment
  Tools, and Connection Point Snap honor the existing UI Preferences and
  Runtime Panel visibility/collapse state.
- Layout Explorer projects the same entities and selection through native
  navigation/list semantics rather than an incomplete ARIA tree declaration.
- UI preference hydration, hidden-panel restoration, workspace application,
  viewport resize, camera, history, dirty state, and editor identity invariants
  retain their existing tests.

## Actual ATARA Assets

Repository audit found these genuine entries in
`public/library/libraries/atara-standard.library.json`:

- `Flow Pack Machine` (`packaging-flowpack-01`)
- `Belt Conveyor` (`conveyor-belt-01`)
- `Robot Palletizer` (`robot-palletizer-01`)

No canonical VBF entry exists, so no VBF or commercial metadata was fabricated.
The E2E slice uses the three entries above through the normal Library,
Inspector, Explorer, Layers, Groups, Viewpoints, Status Bar, and Tools paths.

## Feature Preservation

Save, Undo/Redo, Duplicate/Delete, labels, measurements, connection points and
snap, annotations, civil references, precision placement, alignment, collision
check, Project Manager, Library Manager, Taxonomy Manager, benchmark,
simulation controls, viewpoints, Layers, Groups, and Smart Asset Properties
remain reachable through registered product surfaces. Runtime feature evidence
continues to reject unbound required features; planned `view.fitView` and
quality-signal `diagnostics.noRedConsole` retain their explicit classifications.

The correction batch restores every legacy display capability through the
View-owned global tool: selection box, metadata box, collision envelope,
clearance envelope, annotations, annotation leader lines, and connection-point
display mode. Chromium changes each control through the product surface,
observes the persisted authority, and proves that Editor Host, Babylon scene,
and canvas lifecycle identity do not change.

Workspace and Visible Panels now agree with contextual Inspector rendering.
Hiding a currently valid contribution removes its DOM and closes its Runtime
Panel state; re-enabling restores it. Manual overrides clear the active
workspace identity, while the Sales and Layout Engineering preset definitions
continue to produce their exact declared compositions.

## Responsive Evidence

The shell preserves the editor as the dominant surface at 1440x900, 1024x768,
and 640x800. Narrow layout avoids three permanent columns, preserves one canvas,
keeps Inspector and Bottom Dock controls reachable, and avoids horizontal root
overflow.

Manual review comment `5263363104` identified two bounded ergonomics gaps:
Primary Dock sizing/collapse discoverability and an oversized sparse Bottom
Dock. The correction keeps the existing architecture and addresses them as
follows:

- Primary Dock exposes an accessible right-edge resize separator on desktop
  and medium layouts, with 260-480 px static bounds and a viewport-dominance
  maximum. The rail uses a visible focused chevron control, collapse retains
  navigation, and expansion restores the prior width.
- Layout Explorer rows expand with the dock, keep entity identity, type and
  context visible, truncate only when constrained, expose the full row context
  in a tooltip, and do not add horizontal scrolling.
- Bottom Dock starts at a content-driven 136 px on desktop, adapts to 150 px
  at medium geometry when its two-row strip needs it, and exposes an accessible
  top-edge resize separator with a viewport-relative maximum.
- Primary width and Bottom height persist only through existing UI Preferences
  `PanelPreference.size`; the normalizer accepts and bounds those existing
  schema-compatible fields. No IndexedDB version or sizing store was added.
- At 640x800 desktop resize handles are absent, the Bottom Dock retains the
  one-context responsive composition, and document/dock content has no
  horizontal or nested-scroll regression.
- Chromium resizes both docks, collapses/reopens them, reloads persisted sizes,
  and proves one App, one Editor Host, one canvas, unchanged camera, selection,
  history/dirty state, and scene lifecycle generation.

## Validation Evidence

- Dependency audit: 0 vulnerabilities at low severity.
- Design-token governance: passed for 224 maintained files.
- Build: passed; known bundle-size warning only.
- Unit: 131 files / 1167 tests passed.
- Chromium: 62/62 tests passed, including the real ATARA slice, ergonomics resize/persistence, and responsive regressions.
- Diff check: passed after generated test artifacts were removed.

## P1-G Boundary

P1-F does not implement BOM, Excel, PDF, quotation, pricing, throughput
simulation, or commercial output. P1-G must consume the existing P1-E schema
projection and export mappings rather than create a parallel property source.

Decision: **READY FOR FINAL BOUNDED MANUAL RE-ACCEPTANCE.**
