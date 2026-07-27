# Runtime Feature Access Closure v0.1

Audit date: 2026-07-27

Branch: `feat/runtime-feature-access-closure-gate-v01`

Status: automated Runtime Feature Access gate ready; Final Phase 0 Exit Audit still required

## Purpose

This package replaces metadata-only feature readiness with a deterministic evaluation over the live Runtime Command, Panel, Selection, Entity, and Viewport authorities. It does not create independently writable feature state and does not begin Phase 1.

## Classifications

### Required runtime

Current user-facing behavior is classified `required-runtime`. A required feature passes when its declared surface is inventoried and every referenced runtime authority is registered, live-bound, and reachable. A valid binding may be `contextually-unavailable` without blocking closure.

Examples:

- Delete and Duplicate remain reachable with an empty selection but report their missing-selection prerequisite.
- Connection Point Snap remains reachable when the authoritative selection is not exactly two eligible machines.
- Inspector and contextual panels remain bound when no matching entity is selected.

`object.duplicate` is now required for regression and maps to `edit.duplicateSelected` through inspector and shortcut surfaces. Runtime selection features consume the authoritative Runtime Selection bridge rather than metadata-only coverage.

### Declared planned

The following definitions have no current production surface and are explicitly `declared-planned`:

- `view.fitView`
- `panel.layoutExplorer`
- `panel.statusBar`
- `panel.diagnostics`

They remain registered definitions, are excluded from required regression access, have no live surface mapping, and are reported as `planned-unbound`.

### Quality signal

`diagnostics.noRedConsole` is a `quality-signal`. It has no fake command or diagnostics panel. The complete gate requires explicit external browser or CI evidence. Production runtime does not self-assert this evidence.

## Runtime evidence

### Commands

The live report reads core editor, assembly, and current feature command bridges without executing commands. It distinguishes registration, live binding, reachability, and current enablement.

Existing behavior is now routed through live command bindings for:

- project save, JSON export/import, and autosave restore;
- label, connection-point, and measurement display settings;
- machine add, Library Manager, and Taxonomy Manager;
- annotation and civil reference creation;
- alignment, rotation snap, connection-point snap, collision access, and benchmark access;
- Create Group, Add Selected, Remove Selected, Edit Group, Exit Group Edit, and Ungroup.

Core Undo, Redo, Delete, and Duplicate continue through the existing core runtime bridge. Bridge execution evaluates enablement once, invokes a live operation once, never falls back to seed no-op execution, and propagates operation errors.

### Panels

The report consumes `RuntimePanelRegistryBridge.getRuntimePanel()`. Required panels must be registered and bound. Modal state, right-panel shell state, contextual availability, capabilities, and manager guards remain owned by their existing runtime bindings.

### Selection

The report reads the current authoritative Runtime Selection snapshot and verifies canonical IDs, primary selection, replace/toggle/clear support, reconciliation, stale/unselectable removal, and group-root/edit-child semantics. Empty selection is valid.

### Entities

The report consumes the current legacy adapter snapshot for machines, civil references, annotations, and rigid groups. It verifies canonical identity, duplicate rejection, parent/child relationships, visibility, selectability, lock context, and layer association. Layers remain context rather than entities. An empty project is valid.

### Viewport

The report consumes `viewport.main` from the Runtime Viewport Bridge, including live binding, availability, committed CSS dimensions, camera resolvability, resize support, scene lifecycle generation, resize generation, and contextual reason.

## Gate semantics

The complete gate passes only when:

- every required runtime feature is `ready` or validly `contextually-unavailable`;
- all required command and panel references are live-bound;
- required selection, entity, and viewport authorities are live;
- every current inventory surface maps to a canonical feature;
- no required feature is metadata-only;
- no duplicate feature ID or unknown command, panel, or feature reference exists;
- declared-planned features remain unbound and have no current runtime surface;
- all quality signals have explicit passing external evidence.

Failure reasons and blocked feature IDs are sorted deterministically.

## Diagnostics isolation

`window.__atrvisuRuntimeFeatureAccess` exists only with `?e2eDiagnostics=1`. It exposes read-only report, feature lookup, gate evaluation with supplied quality evidence, blocked-required listing, and planned-feature listing.

It does not expose mutable registries, React setters, Babylon objects, unrestricted command execution, or destructive APIs. The normal URL exposes no Feature Access diagnostics global.

## Surface inventory

Current user controls, shortcuts, panels, modals, assembly actions, civil tools, display controls, and viewport access map to canonical features. Planned Fit View, Layout Explorer, Status Bar, and Diagnostics panel definitions no longer masquerade as current runtime surfaces. No-red-console is represented by an external quality evidence surface.

## Validation

- `npm.cmd audit`: 0 vulnerabilities
- `npm.cmd run build`: passed
- `npm.cmd run test -- --run`: 92 files / 847 tests passed
- `npm.cmd run test:e2e`: 30 tests passed
- Normal URL diagnostics isolation: passed
- Complete gate with explicit no-red-console evidence: passed
- Complete gate without evidence: blocked as designed

AtrVisit occupied preferred port 5173 during local validation and was not stopped. The E2E runner now verifies an existing server is AtrVisu before reuse and otherwise starts its own AtrVisu instance on the first available fallback port. The exact standard command passed on port 5174 and stopped only the server it owned.

`npm audit fix` updated only transitive lockfile entries for `postcss` and `nanoid`; no direct dependency or `package.json` entry changed.

## Remaining work

- Review GitHub Quality Gate results for this package.
- Perform concise user-facing manual acceptance after code and CI review.
- Run a separate Final Phase 0 Exit Audit.
- Do not mark Phase 0 complete from this package alone.
