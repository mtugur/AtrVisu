# Phase 0 Final Exit Audit v0.1

## 1. Final Decision

**NOT READY TO CLOSE PHASE 0**

The merged Phase 0 platform foundation is materially stronger than the 2026-07-15
baseline: live command, panel, entity, selection, assembly, viewport, and Feature
Access authorities are present; the complete local quality gate passes; and the
current clean-browser suite reports no red console or page errors.

Phase 0 nevertheless cannot close because two mandatory truthfulness invariants
are not satisfied:

1. A user-cancelled `edit.deleteSelected` or `assembly.ungroup` operation can be
   returned and recorded as handled/executed even though its domain callback
   performs no mutation.
2. The Runtime Feature Access complete-gate browser test supplies the entire
   required command ID list as external execution evidence before those commands
   are observed on that page. Separate tests do exercise all 19 routes, but the
   closure gate is not causally bound to their probe outcomes and can therefore
   accept fabricated surface-execution evidence.

These are evidence and authority defects, not Phase 1 work. They require bounded
Phase 0 correction packages followed by a new final exit audit.

## 2. Audit Baseline

| Field | Value |
| --- | --- |
| Date | 2026-07-28 |
| Repository | `C:\Users\mt_ug\Documents\AtrVisu` |
| Audit branch | `audit/phase-0-final-exit-v01` |
| Exact audited baseline | `d39e3ff2bfa0a463c1ca440c7feb8d12a824566f` |
| PR #90 merge SHA | `d39e3ff2bfa0a463c1ca440c7feb8d12a824566f` |
| PR #90 state | Merged into `main` |
| Opening worktree | Clean |
| Scope | Evidence-only; this report is the only repository change |

The opening workflow fetched `origin`, fast-forwarded local `main`, proved the
PR #90 head and merge commit were ancestors of `origin/main`, safely removed the
fully merged previous local and remote feature branch, and created this audit
branch from the exact merge SHA. No Phase 1 branch was created.

## 3. Governing Sources

The audit read and reconciled the current repository versions of:

- `AGENTS.md`
- `docs/roadmap/ATRVISU_LAYERED_MASTER_PLAN.md`
- `docs/audits/phase-0-closure-readiness-v01.md`
- `docs/audits/runtime-feature-access-closure-v01.md`
- `docs/audits/runtime-viewport-isolation-v01.md`
- `docs/audits/runtime-panel-registry-bridge-v01.md`
- `docs/standards/ATRVISU_MASTER_ARCHITECTURE_STANDARD.md`
- `docs/standards/ATRVISU_PLATFORM_STANDARD.md`
- `docs/standards/ATRVISU_DATA_MODEL_STANDARD.md`
- `docs/standards/ATRVISU_UX_STANDARD.md`
- `docs/standards/ATRVISU_SIMULATION_ARCHITECTURE_STANDARD.md`
- `docs/standards/platform-standards-v0.3.md`
- `docs/standards/command-panel-selection-viewport-contracts-v0.3.md`
- `docs/standards/quality-gates-v0.3.md`
- `docs/protocols/CODEX_SYNC_PROTOCOL.md`
- `docs/checklists/FEATURE_ACCESS_MATRIX.md`
- `docs/checklists/PLATFORM_QUALITY_GATE.md`
- `docs/feature-acceptance-checklist.md`
- `docs/ui-standards.md`
- `docs/quality-gate.md`
- `docs/adr/ADR-000-template.md`

The prompt used shorter standard filenames for several documents. The prefixed
filenames above are the actual current repository paths and were treated as
authoritative.

## 4. Evidence Method

Evidence was weighted in this order:

1. Current source and rendered-action call paths.
2. Deterministic unit and component tests, including negative assertions.
3. Current E2E behavior through a runner-owned server.
4. GitHub Actions Quality Gate results for merged Phase 0 packages.
5. Explicitly recorded focused manual acceptance.
6. Historical reports and PR descriptions.

Static seed rows, types, PR prose, and inventory entries were used only to locate
and classify behavior. They were not accepted as runtime proof without a live
binding, state projection, test assertion, or browser path.

### Required searches

The following commands, or PowerShell-safe equivalents, were run:

```text
rg -n "platform/" src -g "!src/platform/**" -g "*.ts" -g "*.tsx"
rg -n 'from\s+["''][^"'']*platform(?:/|["''])' src -g "!src/platform/**" -g "*.ts" -g "*.tsx"
rg -n "from.*platform" src -g "!src/platform/**" -g "*.ts" -g "*.tsx"
rg -n "noopExecute|createSeededPlatformCommandRegistry|createSeededPlatformPanelRegistry" src
rg -n "createRuntimeCommand|RuntimeCommand|executeCommand|canExecuteCommand" src
rg -n "RuntimePanel|runtimePanel|openPanel|closePanel|togglePanel" src
rg -n "RuntimeSelection|runtimeSelection|selectedMachine|selectedCivil|selectedAnnotation|selectedGroup" src
rg -n "PlatformEntity|createLegacyPlatformEntity|parseRuntimeSelectionEntityId" src
rg -n "viewport.main|RuntimeViewport|sceneLifecycleGeneration|resizeGeneration" src e2e
rg -n "__atrvisuRuntime" src e2e
rg -n "required-runtime|declared-planned|quality-signal|planned-unbound|contextually-unavailable" src docs
rg -n "recordLayoutHistory|markLayoutChanged|undoLayoutChange|redoLayoutChange" src
rg -n "onClick=|onChange=|onSubmit=|addEventListener\(\"keydown\"|addEventListener\('keydown'" src
```

Meaningful results:

- The broad non-platform import search now finds live platform imports in
  `App.tsx`, `BabylonScene.tsx`, `ProjectManager.tsx`, keyboard, snap,
  serialization, and viewport helpers. The older statement that no application
  runtime imports platform code is no longer true.
- The quote-heavy expression returned no matches under this PowerShell quoting
  context. It is not treated as independent evidence. The simpler equivalent
  `from.*platform` returned the actual imports, including 12 platform import
  groups in `App.tsx` and the Babylon, keyboard, snap, project, and viewport
  integration points.
- `noopExecute` remains only in
  `src/platform/registrySeeds/commandSeedDefinitions.ts`. Seeded command and
  panel registries are used by platform validation/report code and tests; live
  execution resolves runtime bindings instead of the seed no-op.
- Command searches located the three live bridges:
  `coreEditorRuntimeCommands.ts`, `assemblyRuntimeCommands.ts`, and
  `runtimeFeatureCommands.ts`, plus the canonical App execution functions.
- Panel searches located the live `runtimePanelRegistryBridge`, App bindings,
  manager lifecycle guard, and diagnostics-only browser bridge.
- Selection and entity searches located one writable `runtimeSelection` in
  `App.tsx`; machine, civil, annotation, alignable, and group selections are
  projections from canonical platform IDs.
- Viewport searches located canonical `viewport.main`, committed dimensions,
  lifecycle/resize generations, orthographic framing, and E2E invariants.
- Diagnostics searches found globals only behind `?e2eDiagnostics=1`; the normal
  URL test proves those globals are absent.
- Classification searches confirmed explicit `required-runtime`,
  `declared-planned`, and `quality-signal` entries.
- History searches located the single App-owned history boundary and the shared
  atomic mutation helpers.
- UI-handler searches were classified by canonical command route, live panel
  route, shared persisted mutation handler, non-mutating local UI behavior, or
  declared-planned status. Raw search counts were not used as proof.

### GitHub package evidence

| Package | PR | Merge SHA | Quality Gate | Focused manual evidence |
| --- | --- | --- | --- | --- |
| Core Runtime Command bridge | #83 | `cc45f6b55e314428bc0928d560683d36bc844115` | Run 154: success | Not required by the PR record |
| Direct command execution guard | #84 | `b1b308192d41f2cc0660b0b563e031699b696144` | Run 156: success | Not required by the PR record |
| Legacy Entity Adapter | #85 | `676d2244f5f8ae09d742aff7ae7df63aacb73f2d` | Run 158: success | Not required by the PR record |
| Runtime Selection and Atomic Lock | #86 | `744899ebc3930835c5eb100e5b321ba92274b88e` | Run 162: success | Requested; no explicit PASS record found |
| Assembly Group Runtime Entity | #87 | `04fe9cf29c77c74efb665e8b8d9a0212c87b3a6f` | Run 166: success | A focused session was requested; no explicit PASS record found |
| Runtime Panel Registry | #88 | `3baefec70086571d89c208b381742bd6d330b667` | Run 170: success | Passed; explicitly recorded in the task history |
| Runtime Viewport | #89 | `37344ff9d4a56c43c8db6255faab3b7d4b7b10ed` | Run 174: success | Orthographic acceptance recorded as passed in the maintained closure audit |
| Runtime Feature Access | #90 | `d39e3ff2bfa0a463c1ca440c7feb8d12a824566f` | Run 177: success | Requested; no explicit PASS record found |

Missing manual records are not silently converted to PASS. The current source,
unit, E2E, and CI evidence is sufficient for the gates marked PASS below; the
manual-record limitation remains explicit in section 17.

## 5. Historical Baseline

The 2026-07-15 Phase 0 closure-readiness audit remains historical evidence:

- PASS: 2
- PARTIAL: 4
- FAIL: 6

That matrix is not rewritten here. Subsequent PRs #83 through #90 added live
runtime packages and superseded several historical technical findings. This
document creates a new current matrix and does not alter the historical totals.

## 6. Current Acceptance Matrix

| Domain | Status | Current evidence | Closure assessment | Exit-gate blocking |
| --- | --- | --- | --- | --- |
| A. Command contract and registry | **FAIL** | Core, assembly, and feature bridges are live; direct core registry execution enforces enablement; E2E proves canonical routing. `deleteSelectedMachines` and `ungroupAssembly` return `void` on user cancellation, while their bridges still return handled/executed. | Runtime authority exists, but final outcome truth is incorrect for two required commands. | Yes |
| B. Panel contract and registry | **PASS** | `runtimePanelRegistryBridge.test.ts` covers stable registration, replacement bindings, missing bindings, cancellation, contextual unavailability, and exactly-once operations. E2E covers section, manager, dirty guard, and exclusivity behavior. | Required surfaces are live; planned panels remain honest. | No |
| C. Entity foundation | **PASS** | `legacyEntityAdapter.ts` and its tests cover machine, civil, annotation, and group identities, layer context, relationships, unresolved members, empty groups, and duplicates. | Every current selectable/scene-addressable family has an adapter. | No |
| D. Selection contract | **PASS** | `runtimeSelectionBridge.ts` and tests cover ordered IDs, primary, replace/toggle/clear/reconcile, group promotion/edit semantics, annotation exclusivity, and stale/hidden removal. E2E verifies scene synchronization and lifecycle stability. | One authoritative ordered selection model is live. | No |
| E. Viewport and scene contract | **PASS** | `runtimeViewportBridge`, resize controller, orthographic helpers, diagnostics isolation tests, and E2E tests 8-11 and 27 prove committed viewport, camera, framing, resize, and lifecycle behavior. | `viewport.main` is live and isolated. | No |
| F. Feature Access Matrix | **FAIL** | Classifications and live authority checks are present, but the complete E2E gate accepts a caller-supplied full command list rather than observed probe results. | Gate can falsely pass fabricated surface execution evidence. | Yes |
| G. Contract, audit, and failure tests | **FAIL** | Broad negative coverage is meaningful, but the complete surface-evidence test duplicates the production required-command list and passes it back as proof before page-local execution. | One mandatory closure assertion is tautological and not independently linked to the 19 probes. | Yes |
| H. No-red-console runtime stability | **PASS** | Runner-owned clean-browser E2E: 32/32 pass; `collectPageErrors` captures `console.error` and `pageerror`; no red error was captured. | Current tested workflows satisfy the quality signal. | No |
| I. Undo/Redo transaction safety | **PASS** | One App history boundary, atomic mutation preflight, deterministic snapshot tests, and E2E drag/lock tests prove accepted-once and rejected-zero behavior. Cancellation occurs before history for delete/ungroup. | Persisted mutations are transactionally protected in current traced routes. | No |
| J. No-dead-UI guarantee | **PASS** | All 19 representative command IDs have independent `expectOneRuntimeCommandExecution` browser paths; remaining controls resolve through shared command/panel/mutation handlers or are local non-mutating controls. | No visible required surface with a missing or seed-only route was found. | No |
| K. Numeric input foundation | **PARTIAL** | Shared numeric patterns and current rotation/position tests are stable; full migration remains incomplete. | Explicitly accepted non-blocking maintenance debt outside the exit gate. | No |
| L. Documentation and governance | **PASS** | Standards, checklists, runtime audit records, quality policy, and this final contradiction report record current decisions. No rule requires a separate ADR for these already maintained decisions. | Governance is adequate; only the ADR template existing is not itself a blocker. | No |

Current totals:

- PASS: **8**
- PARTIAL: **1**
- FAIL: **3**
- NOT PROVEN: **0**
- OUT OF PHASE 0: **0**

Blocking rows: **A, F, G**.

## 7. Phase 0 Exit Gate

| Gate | Result | Source evidence | Test evidence | Runtime/browser evidence | Blocker |
| --- | --- | --- | --- | --- | --- |
| 1. Runtime Command authority | **FAIL** | `coreEditorRuntimeCommands.ts:144-173`, `assemblyRuntimeCommands.ts:100-112`, `App.tsx:2264-2279`, `App.tsx:2612-2638`, `App.tsx:3272-3317` | Core tests prove enable-once and direct-registry safety; assembly tests prove enable-once, but neither represents callback cancellation outcomes. | Accepted routes execute once, but cancelled delete/ungroup are recorded as executed. | Yes |
| 2. Undo/Redo transaction safety | **PASS** | `App.tsx:958-986` owns history; persisted mutations call `markLayoutChanged` before mutation; atomic routes use `executeAtomicSelectionMutation`. | `layoutHistory.test.ts`, `runtimeSelectionBridge.test.ts`, `connectionPointSnap.test.ts`, and alignment tests cover accepted/rejected snapshots. | E2E tests 18, 20-24 exercise undo/redo, locked rejection, and accepted drag without duplicate history. | No |
| 3. Runtime Panel authority | **PASS** | App live bindings feed `runtimePanelRegistryBridge`; manager lifecycle is centralized. | Panel bridge and manager lifecycle tests include missing binding, cancellation, contextual unavailable, stable binding replacement, and exclusivity failures. | E2E tests 7, 12-15, 25, 31, and 32 prove actual surfaces and dirty guards. | No |
| 4. Runtime Entity foundation | **PASS** | `legacyEntityAdapter.ts` adapts machine/civil/annotation/group and preserves layers as context. | Adapter tests reject duplicates, empty groups, invalid ownership, and unresolved members while preserving canonical identity. | Feature Access browser evidence validates live family authority and current entity snapshots. | No |
| 5. Runtime Selection authority | **PASS** | `App.tsx` owns one `runtimeSelection`; all legacy selections are projections; stable refs prevent stale scene callbacks. | Selection tests cover every required replace/toggle/reconcile/group invariant and lock-selectability distinction. | E2E tests 20-24 prove scene selection, group promotion/edit behavior, drag stability, and atomic rejection. | No |
| 6. Atomic lock safety | **PASS** | `evaluateAtomicMovement` and `executeAtomicSelectionMutation` preflight complete sets. Delete intentionally uses eligible-unlocked policy. | Atomic tests prove zero partial movement/history/dirty, group expansion, unresolved rejection, and snap rejection. History tests prove duplicate/delete restoration. | Locked multi-selection and locked assembly E2E paths show no partial movement. | No |
| 7. Runtime Viewport and scene isolation | **PASS** | `viewport.main`, runtime bridge, shell resize requests, RAF controller, camera framing, and diagnostics guard are live. | Viewport bridge, invariant, diagnostics, resize, camera, and orthographic tests exercise failure-sensitive values. | E2E proves panel/browser resize, perspective/orthographic invariance, wheel zoom, viewpoint framing, and stable lifecycle. | No |
| 8. Runtime Feature Access closure | **FAIL** | Live command/panel/selection/entity/viewport evidence and classification checks are real. `runtimeFeatureAccessReport.ts:576-582` trusts caller-provided IDs. | Negative structural tests are meaningful; `app-smoke.spec.ts:98-111` and `401-440` supply the complete list as proof rather than deriving it from probes. | All 19 paths are exercised elsewhere, but their observations are not the input consumed by the passing gate. | Yes |
| 9. No-dead-UI and surface reachability | **PASS** | Surface inventory maps current command/panel IDs; planned surfaces have no runtime links. Rendered controls trace to canonical bridges or shared local domain handlers. | Surface inventory/coverage tests reject unknown and missing links. | Independent E2E probes cover every ID in the representative 19-command set and assert real state/DOM outcomes. | No |
| 10. Contract and failure-test protection | **FAIL** | Contract modules expose strict registries and validation reports. | Duplicate, unknown, stale, unbound, lock, lifecycle, and missing-evidence failures are tested. The complete browser evidence handoff remains tautological, allowing a false closure result if route tests are removed or stop corresponding to the duplicated list. | Current suite passes but does not make the gate consume observed probe counts. | Yes |
| 11. No-red-console quality gate | **PASS** | `collectPageErrors` listens to `console.error` and `pageerror`; the runner owns its child by default. | Runner helper tests protect owned/external modes and teardown ownership. | 32 clean-browser tests passed. Only a teardown `console.warn` reported Babylon WebGL context loss; it was not captured as a red console/page error and affected no workflow. | No |
| 12. Documentation and governance | **PASS** | Current standards, checklists, package audits, historical audit, and this final audit document authority and residual debt. | Documentation is indirectly guarded by matrix, inventory, coverage, and readiness tests. | GitHub merge/CI evidence reconciles current implementation packages. | No |

Mandatory result: **9 PASS, 3 FAIL**. Phase 0 remains open.

## 8. Runtime Command and Transaction Trace

### Command coverage

The current runtime command architecture has three bounded live bridges:

- `coreEditorRuntimeCommands.ts`: Undo, Redo, Delete Selected, Duplicate Selected.
- `assemblyRuntimeCommands.ts`: Create Group, Add Selected, Remove Selected,
  Enter Edit, Exit Edit, Ungroup.
- `runtimeFeatureCommands.ts`: project save/export/import/restore; labels,
  viewpoints, connection points, measurements; add machine and managers;
  annotation creation; floor/wall/column/walkway/restricted/reference civil
  creation; alignment; rotation and connection snap; collision; benchmark.

Feature operations return normalized final results and await Promises.
Panel-backed operations translate `cancelled`, `unavailable`, and `unsupported`
to `handled: false`. Errors are returned as failed results by the App caller and
are not left as unhandled Promise rejections. Direct core registry execution
resolves the latest binding, checks enablement once, and cannot use the seed
no-op.

### Blocking command outcome trace

`edit.deleteSelected`:

1. Toolbar/inspector/keyboard resolves the canonical command.
2. `executeCoreEditorCommand` calls the core bridge.
3. The bridge checks enablement and invokes `deleteSelectedEntities`.
4. Machine and civil delete callbacks may receive `false` from
   `window.confirm` and return without mutation.
5. The binding type is `execute: (...) => void`; the bridge has no cancellation
   result and returns `{ handled: true }`.
6. `recordRuntimeCommandExecution` increments `executedCount`.

`assembly.ungroup` follows the same shape:

1. Assembly UI resolves `assembly.ungroup`.
2. The bridge invokes `ungroupAssembly`.
3. A rejected confirmation returns without mutation.
4. The bridge returns `true`; App records `executed`.

Enablement is still evaluated exactly once and the callback is invoked exactly
once. The defect is final outcome authority after callback invocation.

### Transaction conclusions

The persisted mutation boundary is `markLayoutChanged`, which records one full
layout snapshot and sets project dirty state. Current traced actions:

- Machine add, annotation creation, all civil creation actions: one history
  record before one state insertion.
- Move, pointer drag, and keyboard nudge: complete selection preflight; the first
  accepted continuous frame records history, subsequent frames use
  `recordHistory:false`; rejected movement records zero.
- Alignment, distribution, equal gap, pair alignment: eligibility check, one
  history record, one batch position update.
- Connection Point Snap: context and atomic lock preflight before history; one
  update when accepted, zero when rejected.
- Duplicate: all-or-nothing lock preflight, one history record, one batch add.
- Delete: eligible-unlocked policy; confirmation precedes history; one record
  for the accepted deletion, zero for cancellation.
- Group create, add/remove members, and ungroup: compute one immutable group
  result and record once before applying; cancelled ungroup records zero.
- Viewpoint capture/update/rename/delete: one record for each persisted display
  state mutation; confirmation precedes viewpoint delete history.
- Machine/civil/annotation property edits and persisted layer assignment:
  shared handlers call `markLayoutChanged` once before one state update.

`layoutHistory.test.ts` proves multi-machine movement, mixed machine/civil
nudge, alignment, single and multi-delete, duplicate batch, and viewpoint
restoration. `runtimeSelectionBridge.test.ts` proves rejected drag creates no
history/dirty transition and accepted mixed nudge creates exactly one.

## 9. Panel and Surface Reachability

Required live surfaces include:

- Right-panel shell and Machine Library.
- Inspector and Multi-Selection context.
- Layout Controls, Viewpoints, Layers, Building/Civil, Assembly Tree,
  Project Status, Simulation Controls, Annotations, Precision Placement,
  Alignment, Connection Point Snap, Display/Overlay, and Collision.
- Project Manager, Library Manager, Taxonomy Manager, and Performance Benchmark
  modal/tool surfaces.

The Runtime Panel Registry distinguishes actual runtime location from seed dock
metadata, and distinguishes:

- missing/unbound,
- contextually unavailable,
- visible but closed,
- open and available,
- cancelled operation.

Library Manager dirty close, parent section/shell collapse, guarded library
navigation, and Taxonomy Manager exclusivity use the same manager lifecycle
authority. E2E tests 12-15 prove rejection and accepted-discard paths against
the actual DOM.

The following remain explicitly `declared-planned`, unbound, and absent from the
current visible runtime:

- `panel.layoutExplorer`
- `panel.statusBar`
- `panel.diagnostics`

`view.fitView` is likewise planned. `diagnostics.noRedConsole` is an external
quality signal, not a command or panel.

### Visible-control classification

- Canonical command route: toolbar Undo/Redo; inspector and keyboard
  Delete/Duplicate; machine add; managers; annotation/civil creation; display
  toggles; alignment/snap; collision/benchmark; assembly actions.
- Canonical panel route: section and shell state, contextual panels, manager and
  benchmark modal lifecycle.
- Shared persisted mutation handler: numeric/property editors, layer/group and
  viewpoint editors. These local controls do not create competing command
  authorities; they use the same history and lock boundaries.
- Non-mutating local UI: selection cards, disclosure controls, editor draft
  inputs, camera controls, and modal-local navigation.
- Declared planned: Fit View, Layout Explorer, Status Bar, Diagnostics panel.

No visible required control with a missing or seed-only route was found. The
outcome truth defect for cancelled Delete/Ungroup is recorded under command
authority rather than described as dead UI.

## 10. Entity, Selection, Assembly, and Lock Safety

### Entity adapters

Canonical identities are:

- `machine:<instanceId>`
- `civil:<id>`
- `annotation:<id>`
- `group:<groupId>`

The adapter preserves millimeter transforms, source identity, subtype metadata,
layer association, effective visibility and lock context, group parent/child
links, and deterministic ordering. It rejects duplicate platform identity.
Unresolved persisted group members remain represented so atomic movement can
reject them. Empty groups are not exposed as selectable entities.

No current scene-addressable flow family exists outside these adapters. Floor,
wall, column, walkway, restricted zone, and reference zone are current civil
reference subtypes. Future Phase 3 flow/simulation objects are not treated as
current Phase 0 entities. Layers remain context, not entities.

### Selection and assembly

`runtimeSelection` is the sole writable ordered selection authority. It carries
canonical IDs and explicit primary selection. Projections derive selected
machines, civil reference, annotation, group, and alignable IDs.

Accepted assembly semantics are enforced:

- A group root can be selected alone.
- In active Edit Group mode, explicit children can be selected without the root.
- Root and child do not coexist.
- A child of another group promotes to that group root.
- Annotation selection remains exclusive.
- Empty selection is valid.

Babylon meshes provide pick metadata and interaction surfaces but do not own
selection state. Stable App-boundary refs let scene callbacks read the current
selection and entities without recreating the scene on selection or drag frames.

### Operation-specific lock policy

All-or-nothing operations:

- move
- pointer drag
- keyboard nudge
- alignment
- distribution
- equal gap
- duplicate
- Connection Point Snap
- rigid group movement

Any locked, hidden, unresolved, or non-selectable participating movable entity
rejects the complete mutation before history and state change.

Delete intentionally preserves eligible-unlocked behavior. Its enablement and
tests document that unlocked eligible entities may be deleted while locked
machine selections are retained. Reconciliation removes deleted IDs and leaves
no stale active selection. This accepted policy is not changed by the command
outcome blocker.

## 11. Viewport and Scene Invariance

`viewport.main` is registered and live-bound to the committed AppShell viewport
host. The live bridge reports CSS dimensions, camera resolvability,
resize capability, scene lifecycle generation, and resize generation.

The resize controller:

- selects a committed non-zero size,
- coalesces requests in one RAF,
- applies deterministic reason precedence,
- defers zero-size observations,
- suppresses unchanged dimensions,
- invokes one accepted `engine.resize`,
- removes its observer/listener on disposal.

Right-panel collapse/reopen, real width dragging, stored width restoration, and
browser aspect changes preserve scene lifecycle, Runtime Selection, transforms,
dimensions, group/layer state, history, dirty state, and simulation state.

Perspective camera pose, target, and orbit intent remain invariant. Orthographic
transition derives vertical world span from radius and FOV instead of render
pixel height. Explicit framing serializes; legacy viewpoints remain compatible;
wheel zoom changes a finite clamped span; resize preserves center and vertical
span while horizontal span follows committed aspect ratio. Horizontal and
vertical world-units-per-pixel remain uniform.

Normal runtime does not build/expose viewport diagnostics. The diagnostics URL
is read-only and opt-in. E2E test 1 verifies normal URL isolation; tests 8-11
and 27 verify actual browser behavior. The maintained closure audit records
focused PR #89 orthographic manual acceptance as passed.

## 12. Runtime Feature Access Gate

The matrix explicitly classifies:

- `required-runtime`
- `declared-planned`
- `quality-signal`

Required-runtime report rows consume live Command, Panel, Selection, Entity, and
Viewport evidence. Contextual unavailability remains valid only for a bound
current feature. Planned definitions must be `planned-unbound`. No-red-console
requires explicit external quality evidence.

The report deterministically rejects:

- duplicate feature IDs,
- unknown command and panel references,
- metadata-only required features,
- stale feature/surface links,
- unmapped runtime surfaces,
- missing Selection/Entity/Viewport authority,
- invalid current selection/entity relationships,
- missing no-red-console evidence,
- missing representative surface command IDs.

`object.duplicate` is required for regression, links
`edit.duplicateSelected`, and maps to inspector and shortcut surfaces.

### Blocking closure-evidence defect

`requiredRuntimeSurfaceExecutionCommandIds` contains 19 IDs. The E2E file
duplicates the same 19 strings in `requiredSurfaceExecutionCommandIds`.
`getRuntimeFeatureAccessGate` passes that complete constant as
`verifiedCommandIds`; the baseline gate test invokes it before executing any
route on that page. The gate checks membership only.

Separate E2E tests do call `expectOneRuntimeCommandExecution` for all 19 IDs and
assert real state or DOM outcomes, so current surface reachability itself is
strongly evidenced. However, the gate result does not consume those observed
probe records. It would still pass if the independent route probes were deleted,
stale, or no longer corresponded to the duplicated constant. This violates the
closure requirement that Runtime Feature Access reject stale or falsely bound
runtime access.

Current Runtime Feature Access closure result: **FAIL**.

## 13. Validation Results

Local validation on baseline `d39e3ff2bfa0a463c1ca440c7feb8d12a824566f`:

| Command | Result |
| --- | --- |
| `npm.cmd audit` | Passed; 0 vulnerabilities |
| `npm.cmd run build` | Passed; TypeScript build and Vite 8.0.16 production build |
| `npm.cmd run test -- --run` | Passed; 94 files / 869 tests |
| `npm.cmd run test:e2e` | Passed; 32 Chromium tests / 1 worker |
| `git diff --check` | Run after report creation and again before commit |

Warnings:

- Vite reported the existing large-chunk advisory for the approximately
  5.37 MB minified main bundle. This is documented non-blocking packaging debt.
- After the successful E2E run, Vite emitted
  `BJS - [14:45:24]: WebGL context lost.` as `console.warn` during teardown.
  The suite captured no `console.error` or `pageerror`; all 32 workflows had
  completed, so this matches the documented teardown-only allowance.
- No new or unexplained build, unit, or browser warning was observed.

Server ownership:

- No listener existed on ports 5173-5177 before validation.
- `scripts/run-e2e.mjs` selected port 5173, spawned the current checkout's Vite
  child with `--strictPort`, ran Playwright, and stopped only its owned child.
- No listener remained on ports 5173-5177 after validation.
- Existing-server reuse remains opt-in only when both
  `ATRVISU_E2E_REUSE_EXISTING=1` and `ATRVISU_E2E_BASE_URL` are supplied.

Diagnostics:

- Normal URL exposes none of `__atrvisuRuntimePanels`,
  `__atrvisuRuntimeViewport`, or `__atrvisuRuntimeFeatureAccess`.
- `?e2eDiagnostics=1` exposes read-only test interfaces.

GitHub package evidence:

- Quality Gate runs 154, 156, 158, 162, 166, 170, 174, and 177 completed with
  `success` for PRs #83-#90.
- The audit branch's GitHub Quality Gate is pending until this immutable report
  commit is pushed. Its final status must be inspected in the Draft PR handoff;
  a local result is not represented as CI.

## 14. Residual Non-Blocking Debt

1. **Full NumericInput migration**
   - Non-blocking because current shared numeric behavior and required placement,
     negative-coordinate, and rotation paths are tested and stable.
   - Track: Phase 1 UX maintenance.

2. **`App.tsx` size and deeper orchestration extraction**
   - Non-blocking because current authorities are explicit and lifecycle tests
     protect the existing boundaries.
   - Track: controlled architecture maintenance after Phase 0.

3. **Vite main-bundle large-chunk advisory**
   - Non-blocking because production build succeeds and no runtime failure is
     caused by the advisory.
   - Track: performance/package optimization.

4. **DPR-only viewport changes depend on browser resize notification**
   - Non-blocking because committed width/height/aspect flows and observed DPR
     changes are covered; no Phase 0 invariant currently requires a separate
     cross-browser media-query subscription.
   - Track: viewport compatibility maintenance.

5. **Deeper geometry/GLB and visual pixel coverage**
   - Non-blocking because current E2E protects representative loading,
     diagnostics, selection, transforms, and no-red-console behavior; exhaustive
     visual fidelity is outside the Phase 0 contract gate.
   - Track: later engineering QA.

6. **Professional shell redesign, Layout Explorer, Status Bar, Diagnostics panel,
   Fit View, BOM/PDF/Excel/output products, simulation expansion, backend/cloud,
   authentication, and digital twin**
   - Non-blocking because they are planned Phase 1+ or product-layer capabilities,
     not missing Phase 0 runtime authorities.
   - Track: roadmap phases 1-6 as applicable.

## 15. Blocking Findings

### P0-B1 - Cancelled core and assembly commands report executed

- Evidence:
  - `src/platform/runtimeCommands/coreEditorRuntimeCommands.ts:20-23` defines a
    void callback and `:144-173` reports handled after invocation.
  - `src/App.tsx:2612-2625` returns from cancelled machine delete.
  - `src/platform/runtimeCommands/assemblyRuntimeCommands.ts:15-18` defines a
    void callback and `:100-112` reports true after invocation.
  - `src/App.tsx:2264-2269` returns from cancelled ungroup.
  - `src/App.tsx:3059-3072` counts handled results as executed.
- Impact:
  - Required command outcome authority is false for user cancellation.
  - Keyboard `preventDefault` and diagnostics execution evidence can treat a
    cancelled operation as handled/executed.
- Smallest coherent follow-up package:
  - Introduce explicit final operation outcomes for cancellation-capable core
    Delete and assembly Ungroup bindings; preserve enable-once, execute-once,
    direct-registry safety, history behavior, and current UI confirmations.
- Proposed branch:
  - `fix/runtime-command-cancellation-outcomes-v01`
- Forbidden scope:
  - No new command IDs, panel/entity/selection/viewport changes, UI redesign,
    history redesign, package changes, or Phase 1 work.
- Acceptance criteria:
  - Cancelled Delete/Ungroup return `handled:false`, `status:"cancelled"`;
    mutation/history/dirty remain zero; accepted callbacks run once; errors stay
    observable; toolbar/inspector/keyboard/assembly surfaces retain canonical IDs;
    deterministic unit and browser cancellation tests pass.

### P0-B2 - Feature Access complete gate is not bound to observed browser probes

- Evidence:
  - `src/platform/runtimeFeatureAccess/runtimeFeatureAccessReport.ts:576-582`
    trusts caller-provided command ID membership.
  - `e2e/app-smoke.spec.ts:3-23` duplicates the required list.
  - `e2e/app-smoke.spec.ts:98-111` passes the duplicated list as verified.
  - `e2e/app-smoke.spec.ts:401-440` obtains a passing complete gate before
    page-local representative command execution.
  - Other tests independently exercise all 19 IDs, but their probe records are
    not the evidence consumed by the passing gate.
- Impact:
  - Runtime Feature Access can pass stale or fabricated surface execution
    evidence, and the closure test is tautological at the evidence handoff.
- Smallest coherent follow-up package:
  - Build external evidence from observed successful route probes, or add a
    deterministic aggregation/attestation helper that rejects attempted-only,
    cancelled, failed, missing, duplicate, or stale outcomes before invoking the
    complete gate.
- Proposed branch:
  - `fix/runtime-feature-access-observed-evidence-v01`
- Forbidden scope:
  - No production UI, new feature, new panel/command, metadata reclassification,
    shell redesign, package change, or Phase 1 work.
- Acceptance criteria:
  - Complete gate cannot pass from a copied constant alone; each required
    representative ID has an observed accepted outcome; missing/stale/cancelled/
    failed evidence blocks deterministically; no-red-console remains external;
    diagnostics stay opt-in/read-only; all quality gates pass.

## 16. Phase Transition Decision

- Phase 0 remains open.
- Phase 1 must not begin.
- Required bounded follow-up packages:
  1. `fix/runtime-command-cancellation-outcomes-v01`
  2. `fix/runtime-feature-access-observed-evidence-v01`
  3. A repeat Final Phase 0 Exit Audit after both packages are reviewed and merged.
- No Phase 1 branch or feature was created by this audit.
- The user must be explicitly warned before the first Phase 1 task begins.

## 17. Evidence Limitations

- No explicit focused manual PASS record was found for PRs #86, #87, or #90.
  This report does not infer manual PASS from CI, PR descriptions, or a later
  branch starting. Current source, deterministic tests, E2E, and CI independently
  support the gates marked PASS.
- PR #88 manual acceptance is explicitly recorded in the task history. PR #89
  orthographic manual acceptance is explicitly recorded in the maintained
  closure-readiness audit.
- Browser evidence covers the current representative 19-command set and all 32
  current smoke scenarios, not every possible value combination, GLB asset, or
  pixel-level rendering outcome.
- Static searches locate candidate paths but do not prove runtime behavior; every
  conclusion above also cites inspected source, tests, or browser evidence.
- The quote-heavy import regex produced no match under PowerShell quoting and was
  not used to claim absence. The broader equivalent search produced the live
  runtime imports.
- The audit branch GitHub Quality Gate cannot be current-head evidence inside the
  same immutable commit that triggers it. The Draft PR handoff must report the
  actual final-head result separately.
- This audit intentionally makes no corrective implementation change. Its two
  blockers remain unresolved until separate bounded packages are reviewed and
  merged.
