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

Core Undo, Redo, Delete, and Duplicate continue through the existing core runtime bridge. Runtime Feature Command operations now return deterministic `executed`, `cancelled`, `disabled`, `unavailable`, `unsupported`, or `failed` results. The bridge evaluates enablement once, invokes a live operation at most once, awaits asynchronous completion before reporting success, never falls back to seed no-op execution, and keeps rejected operations observable.

Project Manager save, export, and import controller operations are awaitable. Existing status and validation messages remain the UI authority, while completion or failure is also returned to the command caller. Panel-backed commands translate the actual Runtime Panel Registry result, so a dirty Library Manager cancellation cannot be reported as a successful Taxonomy Manager open.

### Panels

The report consumes `RuntimePanelRegistryBridge.getRuntimePanel()`. Required panels must be registered and bound. Modal state, right-panel shell state, contextual availability, capabilities, and manager guards remain owned by their existing runtime bindings.

### Selection

The report consumes explicit capabilities from the live Runtime Selection authority. No capability defaults to true. It verifies canonical and resolved IDs, visibility, selectability, primary membership, annotation exclusivity, reconciliation, stale/unselectable removal, and active Edit Group identity.

An active group root may be selected alone, or explicit active-group children may be selected without the root. Root and child coexistence is rejected. A child from another group must follow the existing root-promotion rule. Empty selection remains valid when the explicit authority capabilities are complete.

### Entities

The report consumes explicit live adapter authority and adapter-family declarations for machines, civil references, annotations, and rigid groups. No authority or family defaults to present. Canonical IDs must exactly match entity type, source IDs must be nonempty, IDs must be unique, and unsupported families are rejected.

Assembly relationships must be reciprocal in both directions, with one owning group per child and no empty selectable group. Visibility, selectability, lock context, and layer association remain reported. Layers remain context rather than entities. An empty project is valid only with explicit bound authority and all required adapter families.

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
- all quality signals have explicit passing external evidence;
- all representative required surfaces have explicit external browser-execution evidence.

Failure reasons and blocked feature IDs are sorted deterministically.

## Diagnostics isolation

`window.__atrvisuRuntimeFeatureAccess` exists only with `?e2eDiagnostics=1`. It exposes read-only report, feature lookup, gate evaluation with supplied quality and surface evidence, blocked-required listing, planned-feature listing, and read-only command route probes.

The route probes count actual UI command attempts and executed outcomes; they cannot invoke commands. The bridge does not expose mutable registries, React setters, Babylon objects, unrestricted command execution, or destructive APIs. The normal URL exposes no Feature Access diagnostics global.

## Surface inventory

Current user controls, shortcuts, panels, modals, assembly actions, civil tools, display controls, and viewport access map to canonical features. This static inventory proves declared mapping, not execution. Browser tests separately execute representative visible controls, verify their canonical command route once, and assert real state or DOM outcomes. The complete test gate receives that explicit external surface evidence; production runtime never self-asserts it.

Planned Fit View, Layout Explorer, Status Bar, and Diagnostics panel definitions no longer masquerade as current runtime surfaces. No-red-console remains external quality evidence.

## Validation

- `npm.cmd audit`: 0 vulnerabilities
- `npm.cmd run build`: passed
- `npm.cmd run test -- --run`: 94 files / 869 tests passed
- `npm.cmd run test:e2e`: 32 tests passed
- Normal URL diagnostics isolation: passed
- Complete gate with explicit no-red-console and surface-execution evidence: passed
- Complete gate without either external evidence set: blocked as designed

An existing server occupied preferred port 5173 during local validation and was not stopped. The E2E runner did not inspect or reuse it. By default the runner starts the current checkout on the first free port in 5173-5177, passed on port 5174, and stopped only its owned child after success and failure. External reuse requires both `ATRVISU_E2E_REUSE_EXISTING=1` and an explicit `ATRVISU_E2E_BASE_URL`; code identity is then the caller's responsibility.

`npm audit fix` updated only transitive lockfile entries for `postcss` and `nanoid`; no direct dependency or `package.json` entry changed.

## Remaining work

- Review GitHub Quality Gate results for this package.
- Perform concise user-facing manual acceptance after code and CI review.
- Run a separate Final Phase 0 Exit Audit.
- Do not mark Phase 0 complete from this package alone.
