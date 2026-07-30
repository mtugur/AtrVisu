# Feature Access Matrix

Update this checklist whenever a shell, menu, panel, modal, shortcut, or runtime access path changes.

The canonical machine-readable source is:

- `src/platform/featureAccess/featureAccessMatrix.ts`

The runtime evaluator is:

- `src/platform/runtimeFeatureAccess/`

## Classification rules

| Classification | Closure rule |
|---|---|
| `required-runtime` | Must have inventoried current surfaces, live required command/panel/selection/entity/viewport evidence, and authority-owned current-session browser surface-execution evidence for the representative command set. Contextual unavailability is allowed. |
| `declared-planned` | May remain unbound only when excluded from required regression access and not represented as a current live surface. |
| `quality-signal` | Requires explicit external evidence. It must not be represented by a fake user command or runtime panel. |

## Current required access

| Area | Canonical feature coverage | Runtime evidence |
|---|---|---|
| Project | save, export/import JSON, autosave restore | Runtime Feature Command + Project Manager modal |
| Core edit | undo, redo, delete, duplicate | Core Runtime Command + Runtime Selection + Entity snapshot |
| View | labels, viewpoints, connection points, measurements | Runtime Feature Command + panels + viewport where required |
| Library | add machine, Library Manager, Taxonomy Manager | Runtime Feature Command + live panels/modals |
| Selection | single-select, multi-select | Explicit live Runtime Selection capabilities + validated current selection + Entity snapshot |
| Object editing | plan move, vertical rotation, properties | Inspector + Runtime Selection + Entity snapshot |
| Engineering | annotations, collision, rotation snap, connection snap, alignment | Runtime Feature Command + contextual panels |
| Civil | floor, wall, column, walkway, restricted zone, reference zone | Runtime Feature Command + Civil panel + Entity snapshot |
| Assembly | create, add/remove selected, edit/exit edit, ungroup | Assembly Runtime Command + Groups panel + reciprocal Selection/Entity relationships |
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

Production runtime must not self-assert quality evidence. No-red-console evidence
is supplied explicitly by the browser/CI caller and is distinct from
authority-owned surface-execution evidence. The diagnostics-only Feature Access
bridge exists only with `?e2eDiagnostics=1`.

## Surface execution evidence

Static surface inventory declares where a feature is intended to be reachable.
It does not prove that a current callback is live. The canonical representative
command set derives from `platformFeatureAccessMatrix`.

With `?e2eDiagnostics=1`, one current-session
`RuntimeSurfaceExecutionAuthority` observes actual visible canonical UI command
routes. `beginObservation(commandId)` accepts only a command in the canonical
required set, captures its before probe internally from the live runtime command
probe store, and returns an opaque observation token. The browser receives no
raw before probe.

After the real visible UI route executes, `completeObservation(token)` reads the
after probe internally. Verified evidence requires exactly one additional
attempt, exactly one additional execution, `handled: true`, and status
`executed`. The token is session-bound, command-bound, single-use, and consumed
on its first completion attempt, including a rejected completion.

Empty, partial, cancelled, failed, unavailable, disabled, unsupported,
malformed, synthetic, structurally copied, forged, replayed, duplicate, unknown,
or stale evidence cannot satisfy the complete gate. Structurally matching
TypeScript data is not authority proof. The exact canonical verified command set
is required.

The complete gate obtains the current authority-owned surface snapshot
internally from App. The browser caller can supply only explicit quality
evidence, currently `diagnostics.noRedConsole`; it cannot inject probes,
counters, command results, observation arrays, verified command IDs, surface
attestations, or copied snapshots.

Diagnostics observation methods manage evidence observation only. They do not
execute commands, bypass the visible canonical UI route, or expose mutable
business state. Reload or remount creates a new diagnostics session and
invalidates old tokens and evidence. The normal URL exposes no Feature Access
diagnostics global.

## Change checklist

- [ ] Every visible current surface maps to a canonical feature.
- [ ] Every required command resolves to a live non-seed binding.
- [ ] Async command success is reported only after the underlying operation completes.
- [ ] Cancelled, disabled, unavailable, unsupported, and failed operations are not reported as executed.
- [ ] Every required panel resolves to a live surface.
- [ ] Contextual unavailability has an explicit reason.
- [ ] Planned definitions have no current live surface.
- [ ] Quality signals use external evidence.
- [ ] Selection capabilities and Entity adapter families are supplied explicitly by their live authorities.
- [ ] Current selection invariants and reciprocal assembly relationships validate successfully.
- [ ] The representative required command set derives from the canonical Feature Access Matrix.
- [ ] Representative visible controls have current-session authority-owned browser execution evidence.
- [ ] The browser caller cannot inject surface-execution evidence.
- [ ] Observation tokens are session-bound, command-bound, single-use, and validated against the live probe store.
- [ ] The complete gate requires the exact canonical verified command set.
- [ ] No-red-console remains explicit external browser/CI quality evidence.
- [ ] Normal URL exposes no diagnostics-only global.
- [ ] Default E2E owns a current-checkout server; external reuse is explicit and URL-bound.
- [ ] Unit, E2E, no-red-console, and surface audit gates pass.
