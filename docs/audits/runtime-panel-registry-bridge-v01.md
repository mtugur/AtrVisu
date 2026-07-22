# Runtime Panel Registry Bridge v0.1

This implementation binds the existing platform Panel Registry to current AtrVisu React state without changing panel layout, persistence, viewport behavior, or scene ownership.

## Runtime ownership

- One stable runtime registry is created for each `App` lifetime.
- React state remains the only writable source for right-panel, section expansion, contextual availability, and modal state.
- Runtime bindings are replaced through a commit-safe ref; the registry is not rebuilt after panel, selection, modal, or viewport changes.
- `PanelSection` controlled mode uses the same expansion state for user clicks and registry actions while preserving the existing localStorage keys and `expandSignal` behavior.
- Library Manager runtime close delegates to its existing dirty-state-aware close handler and returns an accepted/cancelled result.
- Machine Library section and right-panel shell close/toggle paths run the same manager preflight before changing parent state.
- A cancelled dirty close leaves the manager mounted, keeps its parent open, preserves editor state, and is reported as a non-executed cancelled operation.
- Library Manager and Taxonomy Manager use one exclusive-open coordinator, so switching managers cannot create overlapping backdrops.
- Registry entries contain metadata and operations only; they do not own React components or Babylon resources.
- Reachability reports the current runtime location separately from seed `dock` metadata, making legacy shell mismatches explicit instead of relabeling or duplicating canonical IDs.

## Live bindings

The following canonical IDs have current runtime bindings:

- `panel.rightPanelShell`
- `panel.machineLibrary`
- `panel.layoutControls`
- `panel.viewpoints`
- `panel.layers`
- `panel.civilReferences`
- `panel.groups`
- `panel.projectStatus`
- `panel.performanceBenchmarkLauncher`
- `panel.simulationControls`
- `panel.annotations`
- `panel.precisionPlacement`
- `panel.alignmentTools`
- `panel.connectionPointSnap`
- `panel.displayOverlayControls`
- `panel.collisionCheck`
- `panel.inspector`
- `panel.projectManager`
- `panel.performanceBenchmark`
- `panel.libraryManager`
- `panel.taxonomyManager`

`panel.connectionPointSnap` uses one canonical context predicate for JSX rendering, reachability, open capability, and defensive execution. A valid context contains exactly two authoritative explicit `machine:*` entities. Both must resolve, be visible, selectable, and pass atomic lock evaluation. Normal mode requires both machines to be ungrouped; Edit Group requires both to be explicit children of the matching active group. Any civil reference, annotation, group root, third machine, or unresolved extra selection makes the panel unavailable before mutation, history, or dirty-state callbacks.

`panel.inspector` reports its current no-selection, machine, civil, multi-selection, or assembly context and does not manufacture selection.

## Runtime consistency validation

- Clean manager close permits parent collapse.
- Dirty Library Manager cancellation blocks Machine Library and shell collapse.
- Accepted discard closes the manager before parent collapse.
- Taxonomy Manager closes deterministically before a parent unmount.
- Registry cancellation is reported as `handled: false` with status `cancelled`.
- Browser coverage verifies modal DOM state, parent state, and registry state remain aligned.
- Browser coverage verifies Connection Point Snap disappears for two machines plus civil or a third machine, and reappears for exactly two valid machines.
- Final local validation: 83 unit-test files / 753 tests and 23 E2E tests.

## Known unbound metadata

- `panel.layoutExplorer` is classified as required-runtime by the Phase 0 audit, but no Layout Explorer component exists in the current application. It remains registered and explicitly unbound; Assembly Tree is not relabeled as Layout Explorer.
- `panel.statusBar` is classified as required-runtime by the Phase 0 audit, but no Status Bar component exists in the current application. It remains registered and explicitly unbound.
- `panel.diagnostics` has seed metadata but no single current Diagnostics modal or panel. Existing diagnostics surfaces retain their own canonical runtime IDs.

The reachability report therefore remains not-ready for complete Phase 0 panel closure. This package does not claim that the full Panel Registry blocker is closed.

## Remaining packages

- Viewport isolation must still connect shell resize/collapse intent to the viewport contract and prove camera, selection, and transform invariance.
- Runtime Feature Access must consume live panel reachability, reject stale or falsely bound access, and keep planned definitions distinct from operational surfaces.

The E2E invocation bridge is exposed only with `?e2eDiagnostics=1`; normal production runtime does not publish a panel-control global.
