# Feature Access Matrix

Update this checklist whenever a shell, menu, panel, modal, shortcut, or runtime access path changes.

The canonical machine-readable source is:

- `src/platform/featureAccess/featureAccessMatrix.ts`

The runtime evaluator is:

- `src/platform/runtimeFeatureAccess/`

## Classification rules

| Classification | Closure rule |
|---|---|
| `required-runtime` | Must have inventoried current surfaces and live required command, panel, selection, entity, or viewport evidence. Contextual unavailability is allowed. |
| `declared-planned` | May remain unbound only when excluded from required regression access and not represented as a current live surface. |
| `quality-signal` | Requires explicit external evidence. It must not be represented by a fake user command or runtime panel. |

## Current required access

| Area | Canonical feature coverage | Runtime evidence |
|---|---|---|
| Project | save, export/import JSON, autosave restore | Runtime Feature Command + Project Manager modal |
| Core edit | undo, redo, delete, duplicate | Core Runtime Command + Runtime Selection + Entity snapshot |
| View | labels, viewpoints, connection points, measurements | Runtime Feature Command + panels + viewport where required |
| Library | add machine, Library Manager, Taxonomy Manager | Runtime Feature Command + live panels/modals |
| Selection | single-select, multi-select | Authoritative Runtime Selection + Entity snapshot |
| Object editing | plan move, vertical rotation, properties | Inspector + Runtime Selection + Entity snapshot |
| Engineering | annotations, collision, rotation snap, connection snap, alignment | Runtime Feature Command + contextual panels |
| Civil | floor, wall, column, walkway, restricted zone, reference zone | Runtime Feature Command + Civil panel + Entity snapshot |
| Assembly | create, add/remove selected, edit/exit edit, ungroup | Assembly Runtime Command + Groups panel + Selection/Entity |
| Platform panels | shell, library, inspector, tools, managers | Runtime Panel Registry reachability |
| Viewport | main scene viewport | Runtime Viewport Bridge `viewport.main` |
| Performance | benchmark | Runtime Feature Command + launcher/modal |

## Explicitly planned

| Feature | Current status | Rule |
|---|---|---|
| `view.fitView` | `planned-unbound` | No current user-facing control |
| `panel.layoutExplorer` | `planned-unbound` | Assembly Tree is not relabeled as Layout Explorer |
| `panel.statusBar` | `planned-unbound` | No current Status Bar surface |
| `panel.diagnostics` | `planned-unbound` | No single production Diagnostics panel |

## Quality signals

| Feature | Evidence |
|---|---|
| `diagnostics.noRedConsole` | Explicit browser/CI evidence supplied to the complete gate |

Production runtime must not self-assert quality evidence. The diagnostics-only Feature Access bridge exists only with `?e2eDiagnostics=1`.

## Change checklist

- [ ] Every visible current surface maps to a canonical feature.
- [ ] Every required command resolves to a live non-seed binding.
- [ ] Every required panel resolves to a live surface.
- [ ] Contextual unavailability has an explicit reason.
- [ ] Planned definitions have no current live surface.
- [ ] Quality signals use external evidence.
- [ ] Selection, entity, and viewport requirements use their authoritative bridges.
- [ ] Normal URL exposes no diagnostics-only global.
- [ ] Unit, E2E, no-red-console, and surface audit gates pass.
