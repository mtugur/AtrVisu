# Runtime Panel Registry Bridge v0.1

This implementation binds the existing platform Panel Registry to current AtrVisu React state without changing panel layout, persistence, viewport behavior, or scene ownership.

## Runtime ownership

- One stable runtime registry is created for each `App` lifetime.
- React state remains the only writable source for right-panel, section expansion, contextual availability, and modal state.
- Runtime bindings are replaced through a commit-safe ref; the registry is not rebuilt after panel, selection, modal, or viewport changes.
- `PanelSection` controlled mode uses the same expansion state for user clicks and registry actions while preserving the existing localStorage keys and `expandSignal` behavior.
- Library Manager runtime close delegates to its existing dirty-state-aware close handler.
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

`panel.connectionPointSnap` remains registered while unavailable and explains that exactly two explicit machines outside a rigid group root are required. `panel.inspector` reports its current no-selection, machine, civil, multi-selection, or assembly context and does not manufacture selection.

## Known unbound metadata

- `panel.layoutExplorer` is classified as required-runtime by the Phase 0 audit, but no Layout Explorer component exists in the current application. It remains registered and explicitly unbound; Assembly Tree is not relabeled as Layout Explorer.
- `panel.statusBar` is classified as required-runtime by the Phase 0 audit, but no Status Bar component exists in the current application. It remains registered and explicitly unbound.
- `panel.diagnostics` has seed metadata but no single current Diagnostics modal or panel. Existing diagnostics surfaces retain their own canonical runtime IDs.

The reachability report therefore remains not-ready for complete Phase 0 panel closure. This package does not claim that the full Panel Registry blocker is closed.

## Remaining packages

- Viewport isolation must still connect shell resize/collapse intent to the viewport contract and prove camera, selection, and transform invariance.
- Runtime Feature Access must consume live panel reachability, reject stale or falsely bound access, and keep planned definitions distinct from operational surfaces.

The E2E invocation bridge is exposed only with `?e2eDiagnostics=1`; normal production runtime does not publish a panel-control global.
