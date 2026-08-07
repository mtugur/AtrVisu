# Phase 1 P1-D2 Workspace Preferences and Controls Audit

## 1. Exact Baseline

- Repository: `mtugur/AtrVisu`
- Base: `main`
- Exact base SHA: `fb077121f2499c337e2e9d97cdd0459e6eb90272`
- Branch: `feat/phase-1-workspace-preferences-controls-v01`
- P1-D1 post-merge gate: `31163841334` - **PASS**
- Baseline: 0 vulnerabilities, 197 scanner files, 117 unit files / 1088 tests,
  49/49 E2E tests.

## 2. Scope

P1-D2 adds the canonical workspace registry, bounded workspace application
runtime, visible Application Bar preference control, theme/density/live-panel
controls, command emphasis, derived Inspector-mode metadata, and automated
accessibility, responsive, persistence, and invariance evidence.

## 3. P1-D1 Authority Reuse

The P1-D1 `UiPreferencesRuntimeStore`, provider, IndexedDB record, normalizer,
and DesignSystemRoot remain authoritative. Workspace operations call that
store and do not access IndexedDB or localStorage directly. Database version 2
and preference schema version 1 are unchanged.

## 4. Workspace Registry

The immutable registry contains exactly Sales Layout and Layout Engineering.
Definitions are callback-free and JSON-safe. Validation covers stable shipping
IDs, unique IDs, schema version, available `layout.3d` editor, current live
right-panel content descriptors, and maintained command definitions. Unknown
lookups are safe and unknown persisted IDs normalize to Current arrangement
with one bounded warning.

## 5. Sales Layout

Sales uses comfortable density, summary Inspector metadata, its exact nine
live content panels, and presentation emphasis for Save, Duplicate, Labels,
and Viewpoints. It includes no shell, modal, planned, diagnostics, performance,
simulation, Layout Explorer, or Status Bar entry.

## 6. Layout Engineering

Engineering uses compact density, engineering Inspector metadata, its exact
fourteen live content panels, and presentation emphasis for Undo, Redo,
Duplicate, Delete, Measurements, and Connection Points. Excluded surfaces
match the package contract.

## 7. Current Arrangement Compatibility

An absent `activeWorkspaceId` displays Current arrangement and preserves the
hydrated P1-D1 record. Chromium seeds non-default theme, density, width,
visibility, and collapse values and proves startup performs no Sales reset.

## 8. Application and Override Semantics

One workspace application produces one store revision and one persistence
write. It opens the compatibility shell, applies density and exact live-panel
visibility, and preserves theme, size, order, dock, and content collapse.
Theme retains workspace identity. A differing density or any panel visibility
override clears it. Collapse and width remain harmless within-workspace
presentation values.

## 9. Visible Controls

One compact Application Bar trigger displays the current workspace. The
non-modal Workspace & View popover uses labelled native radios and checkboxes
for workspace, theme, density, and current live panels. Panel labels derive
from runtime descriptors; no parallel title table exists. Every hidden live
panel remains discoverable and restorable.

The independent review at exact head
`5b1b1085f2ebe5ffba5524f553bff7dd85669089` (comment `5215805384`)
identified two correctness blockers. The corrected projection now uses static
descriptors only for eligibility and maintained labels, then reads `bound`,
`available`, and `reason` from the existing Runtime Panel Registry bridge.
Connection Point Snap and Inspector therefore update in place as their real
selection/property contexts change. Unavailable controls are disabled,
described accessibly, and guarded before any workspace preference mutation.

P1-D1 `future-readonly` is now explicit on the same popover. Its existing
hydration warning describes the surface while every workspace, theme, density,
and visible-panel mutation control is disabled. A real future-version IndexedDB
record remains byte-for-byte unchanged after pointer and keyboard attempts.

Manual review comment `5216944024` accepted the overall P1-D2 visual direction
and requested one bounded polish: replace the nested Visible Panels list with a
CAD-style cascade. The root now shows a dynamic `<visible>/<eligible>`
disclosure row. At desktop geometry, the checkbox controls render in an adjacent
depth-one sibling flyout; if neither horizontal side is viable, the same controls
drill into the root popover with Back navigation. Checkbox changes leave the
child open for multiple updates. The former `.workspace-panel-preferences`
scroll region is removed.

The reusable `workbench/cascading` primitive is business-neutral and supports
root -> depth 1 -> depth 2 open-path state. Pure tests cover right placement,
left fallback, viewport clamping, non-viable side-by-side geometry, and a
hypothetical depth-two anchor. P1-D2 renders only depth 1. File, Edit, View, and
Tools are explicitly unchanged; they may reuse the primitive only in a future
bounded package.

## 10. Command and Inspector Projection

Save and canonical Command Bar buttons receive
`data-workspace-emphasized="true"` only when listed by the active preset. No
command is duplicated, hidden, reordered, enabled, or executed differently.
The AppShell exposes contextual, summary, or engineering Inspector mode as
stable metadata. Current Inspector content is unchanged.

## 11. Domain and Runtime Invariance

Real Chromium captures active project context plus Runtime Viewport invariant
and camera snapshots before the sequence Current arrangement -> Sales ->
Engineering -> Sales. Project context, selection, primary selection, machine,
civil and annotation transforms, groups, layers, undo/redo stacks and depths,
dirty state, simulation state, and camera remain equal. Scene lifecycle
generation is unchanged. One App, EditorHost, DesignSystemRoot, and canvas
remain mounted.

## 12. Persistence

Store tests prove active workspace, theme, density, and panel visibility use
the existing serialized persistence authority. Reload activates derived
workspace metadata without reapplying factory visibility. Chromium proves
Sales identity, Current arrangement overrides, and restored panel visibility
survive reload.

## 13. Accessibility and Responsive Behavior

The trigger is named and exposes expanded/control/dialog relationships. Native
groups are labelled; Escape closes and restores trigger focus; outside pointer
closes; normal Tab order is retained; and events inside the popover do not leak
to editor shortcuts. At 1440x900, 1024x768, and 640x800 the popover remains
inside the viewport, stays below 80 percent viewport height, and creates no
horizontal document overflow. Visible Panels opens by click or ArrowRight,
ArrowLeft/Escape closes only the child and restores branch focus, a second
Escape closes the root, and outside pointer closes the whole cascade. An
all-disabled future-readonly child remains focusable and inspectable. At
1440x900 the child is a viewport-contained sibling flyout with no overlapping
root surface; 640x800 deterministically drills in with one scroll context and
Back navigation. 1024x768 follows actual available geometry. Save, project
context, and the existing three workbench rows remain integrated.

## 14. P1-E and P1-F Boundaries

P1-E retains ownership of schema-driven Inspector semantics. P1-F retains
ownership of final dock hosts, Layout Explorer, ordering, docking, and panel
composition. P1-D2 exposes no dead order/dock controls and keeps the current
right-panel shell as the compatibility host.

## 15. Tests and Validation

- Focused workspace registry/application/runtime/persistence: 4 files / 19
  current tests after final test refinement.
- Focused correction unit tests: 3 files / 30 tests, passed.
- Focused cascade geometry/state/surface and preference-control tests: 4 files /
  19 tests, passed.
- Focused flyout Chromium: 5/5 passed after the responsive geometry correction.
- `npm.cmd ci`: passed.
- `npm.cmd audit`: 0 vulnerabilities.
- `npm.cmd audit --audit-level=low`: 0 vulnerabilities.
- Design-token governance: 207 maintained files, passed.
- Build: passed; existing large-chunk warning remains non-blocking.
- Full unit: 125 files / 1128 tests, passed.
- Full E2E: 57/57, passed.
- Console/page error collectors: passed. The corrupt-record scenario emits only
  its expected bounded warning.

## 16. Scope Integrity

No dependency, package lock, project schema, UI preference database version,
Babylon rendering behavior, final dock host, Inspector semantics, editor tab,
or project/domain persistence behavior changed.

## 17. Residual Risks

The final visual judgment for placement, theme presentation, compact density,
command emphasis, and 640px behavior belongs to the user. Final P1-E Inspector
and P1-F dock composition are intentionally deferred. The existing Vite large
chunk warning remains outside this package.

## 18. Manual Visual Acceptance

The overall P1-D2 visual direction is accepted in comment `5216944024`. Final
manual re-acceptance remains bounded to the Visible Panels root row, desktop
side flyout, absence of the nested scrollbar, and 640x800 drill-in behavior.

## 19. Decision

**READY FOR BOUNDED MANUAL RE-ACCEPTANCE.** Automatic gates pass and the final
polish is limited to the accepted review concern. This is not READY FOR MERGE;
P1-D remains open until exact-head GitHub Quality Gate and explicit bounded
manual visual re-acceptance pass.
