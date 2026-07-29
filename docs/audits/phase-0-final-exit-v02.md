# Phase 0 Final Exit Audit v0.2

## 1. Final Decision

**NOT READY TO CLOSE PHASE 0**

P0-B1 is closed: cancelled Delete and Ungroup operations now return explicit
non-executed outcomes and preserve zero-mutation/zero-history behavior.

P0-B2 is not closed. The merged runtime surface-execution evidence model rejects
raw copied command IDs, but it still trusts caller-supplied probe counters. In a
fresh diagnostics browser session, the audit supplied synthetic before/after
probes for all 19 matrix-derived required commands without executing any visible
route. `validateSurfaceExecutionAttestation()` returned `passed: true`, and the
Runtime Feature Access gate returned `passed: true`, while
`listCommandExecutions()` remained empty before and after.

This violates the mandatory requirement that observed browser evidence cannot
be fabricated and that readiness rejects falsely bound runtime access.

## 2. Audit Baseline

- Date: **2026-07-29**
- Repository: `mtugur/AtrVisu`
- Branch: `audit/phase-0-final-exit-v02`
- Exact audited baseline: `a345ab296ae11e023c8c73bc21548f12625ef195`
- Local `main` and `origin/main` at audit start:
  `a345ab296ae11e023c8c73bc21548f12625ef195`
- PR #92 merge:
  `5e26b7f2db6dcbdc3cc75aab18b370541d1af15e`
- PR #93 merge:
  `a345ab296ae11e023c8c73bc21548f12625ef195`
- Opening worktree: clean
- Scope: evidence-only repeat exit audit after the P0-B1 and P0-B2 packages
- Allowed repository change:
  `docs/audits/phase-0-final-exit-v02.md`

The opening workflow confirmed PR #93 was merged, synchronized `main` by
fast-forward, proved the former PR #93 branch was contained in `origin/main`,
safely removed the merged local and remote branch, and created this audit branch
from the exact merged baseline.

## 3. Governing Sources

Primary governing sources:

- `AGENTS.md`
- `docs/roadmap/ATRVISU_LAYERED_MASTER_PLAN.md`
- `docs/checklists/FEATURE_ACCESS_MATRIX.md`
- `docs/checklists/PLATFORM_QUALITY_GATE.md`
- `docs/feature-acceptance-checklist.md`
- `docs/quality-gate.md`
- `docs/ui-standards.md`
- architecture, platform, data, UX, and simulation standards under
  `docs/standards/`
- `docs/protocols/CODEX_SYNC_PROTOCOL.md`

Historical and package evidence:

- `docs/audits/phase-0-closure-readiness-v01.md`
- `docs/audits/phase-0-final-exit-v01.md`
- `docs/audits/runtime-command-cancellation-outcomes-v01.md`
- `docs/audits/runtime-feature-access-observed-evidence-v01.md`
- `docs/audits/runtime-feature-access-closure-v01.md`
- `docs/audits/runtime-viewport-isolation-v01.md`
- all other current Phase 0 reports under `docs/audits/`

Current source and tests were treated as authoritative over historical prose.
PR descriptions and prior audits were supporting evidence only.

## 4. Evidence Method

Evidence was evaluated in this order:

1. Current source and actual call paths.
2. Deterministic unit, component, integration, and failure tests.
3. Current browser behavior.
4. GitHub CI for merged packages.
5. Explicitly recorded manual acceptance.
6. Historical reports and PR descriptions.

The required searches were run and interpreted:

- Seed no-op/seeded registry references remain limited to platform metadata,
  audits, readiness construction, and seed tests. Runtime command bridges replace
  seed execution with live bindings.
- Operation-result searches trace cancellation status and attempt/execution
  counters from command bindings through App diagnostics and browser assertions.
- Surface-evidence searches show the canonical set is derived from
  `requiresSurfaceExecutionEvidence`; no raw 19-command E2E constant exists.
- Observation/attestation searches identify the browser bridge and its validator.
- Diagnostics-global searches show globals are created only behind the
  `e2eDiagnostics=1` guard and are absent on the normal URL.
- History searches trace the single App snapshot boundary and persisted mutation
  handlers.
- Visible handler searches were reconciled with canonical command routes, panel
  routes, persisted mutation handlers, and non-mutating local controls.
- Runtime Panel, Selection, Entity, and Viewport searches were traced through
  current App bindings and browser probes.

Raw search counts were not used as proof.

GitHub package evidence:

| PR | Merge SHA | Quality Gate | Explicit manual acceptance used |
| --- | --- | --- | --- |
| #86 | `744899ebc3930835c5eb100e5b321ba92274b88e` | Success, run `29741146839` | None claimed |
| #87 | `04fe9cf29c77c74efb665e8b8d9a0212c87b3a6f` | Success, run `29831149690` | Passed |
| #88 | `3baefec70086571d89c208b381742bd6d330b667` | Success, run `29924286031` | None claimed |
| #89 | `37344ff9d4a56c43c8db6255faab3b7d4b7b10ed` | Success, run `30084435883` | Focused orthographic acceptance passed |
| #90 | `d39e3ff2bfa0a463c1ca440c7feb8d12a824566f` | Success, run `30271814956` | User explicitly reported manual PASS |
| #91 | `0f6324d3ca3d2aba4f3a83e9358129ccc33b44e6` | Success, run `30362545268` | None claimed |
| #92 | `5e26b7f2db6dcbdc3cc75aab18b370541d1af15e` | Success, run `30366641801` | Exhaustive browser automation; manual not required |
| #93 | `a345ab296ae11e023c8c73bc21548f12625ef195` | Success, run `30434667920` | Exhaustive browser automation; manual not required |

PR #93 also has an unresolved, non-outdated P1 review thread on the merged head
`02ef9a87c21eefadf13fe0d0281684f36c02c43a`: "Bind attestations to the live
probe store." The audit independently reproduced that finding against the
merged `main` baseline.

## 5. Historical Baseline

The 2026-07-15 closure-readiness audit concluded that Phase 0 was not ready and
defined seven bounded closure packages. Those packages established live command,
entity, selection, panel, viewport, and Feature Access authorities.

Final Exit Audit v0.1 independently re-evaluated the merged result, found Phase
0 not ready to close, and recorded two blockers:

- P0-B1: cancelled Delete/Ungroup operations were reported as executed.
- P0-B2: Feature Access accepted a copied complete command-ID list instead of
  observed route execution.

PR #92 addressed P0-B1. PR #93 replaced the copied-ID handoff with structured
session observations, but did not bind those observations to the internal live
probe store. This repeat audit therefore closes P0-B1 but retains a narrower
P0-B2 integrity blocker.

Historical audits remain unchanged and baseline-specific.

## 6. Current Acceptance Matrix

| Domain | Status | Current evidence | Closure assessment | Exit-gate blocking |
| --- | --- | --- | --- | --- |
| A. Command contract and registry | **PASS** | Core, assembly, and feature bridges use live bindings, enablement, normalized outcomes, exactly-once callbacks, awaited async results, and observable failures. P0-B1 unit/E2E paths now distinguish cancellation. | Required command authority is live and outcome-aware. | No |
| B. Panel contract and registry | **PASS** | Runtime Panel bridge tests and browser flows prove registration, current bindings, contextual availability, dirty Library Manager guards, manager exclusivity, persistent sections, shell control, and modal/tool surfaces. | Required panels are live; planned panels remain explicitly unbound. | No |
| C. Entity foundation | **PASS** | Legacy adapters cover machine, civil, annotation, and rigid group entities with canonical IDs, millimeter transforms, layer context, parent/child relationships, duplicate rejection, unresolved-member preservation, and empty-group suppression. | Every current selectable or scene-addressable family has a stable adapter. | No |
| D. Selection contract | **PASS** | One ordered `runtimeSelection` state drives projections. Tests cover primary, replace/toggle/clear/reconcile, annotation exclusivity, stale/unselectable removal, group promotion, Edit Group semantics, and stable scene callbacks. | Runtime Selection is authoritative. | No |
| E. Viewport and scene contract | **PASS** | `viewport.main`, committed dimensions, resize controller, camera snapshots, orthographic framing, lifecycle generation, diagnostics isolation, and browser resize paths are live and tested. | Viewport and scene invariants satisfy Phase 0. | No |
| F. Feature Access Matrix | **FAIL** | Classification and live authority evidence are correct, and the required command set is matrix-derived. However, synthetic caller-supplied counters can still create a complete passing attestation with an empty live probe store. | Runtime Feature Access can falsely pass fabricated browser evidence. | Yes |
| G. Contract, audit, and failure tests | **FAIL** | Broad positive/negative coverage passes, including raw copied-ID rejection, but no test rejects synthetically valid counters that are absent from the live probe store. | The mandatory observed-evidence integrity failure is not protected. | Yes |
| H. No-red-console runtime stability | **PASS** | Runner-owned 34-test Chromium suite captured no `console.error` or `pageerror`; the normal URL exposes no diagnostics globals. | Current tested workflows satisfy the quality signal. | No |
| I. Undo/Redo transaction safety | **PASS** | `markLayoutChanged` is the shared persisted mutation boundary; atomic preflight occurs before history; continuous drag records on first accepted frame; cancellation/rejection records zero. History tests and browser undo/redo paths pass. | Accepted mutations are one transaction; rejected/cancelled paths are zero. | No |
| J. No-dead-UI guarantee | **PASS** | The canonical browser scenario executes all 19 current matrix-derived representatives through visible routes, builds observations from those actions, compares the exact set, and would miss a new matrix ID without a new route. Surface inventories reject unknown links. | No visible required surface with a missing live route was found. | No |
| K. Numeric input foundation | **PARTIAL** | Shared `NumericInput` covers signed coordinates and explicit rule-based normalization in machine, civil, annotation, and library editors; rotation and negative-coordinate browser paths pass. Some legacy numeric fields remain locally implemented. | Explicitly accepted non-blocking maintenance debt. | No |
| L. Documentation and governance | **PASS** | Maintained standards, checklists, package audits, historical decisions, P0-B1/P0-B2 reports, and this contradiction audit record the current state. | Governance evidence is adequate; no new ADR is required. | No |

Current totals:

- PASS: **9**
- PARTIAL: **1**
- FAIL: **2**
- NOT PROVEN: **0**
- OUT OF PHASE 0: **0**

Blocking rows: **F, G**.

## 7. Phase 0 Exit Gate

| Gate | Result | Evidence | Blocker |
| --- | --- | --- | --- |
| 1. Runtime Command authority | **PASS** | Live core/assembly/feature bridges; seed no-op replacement; enable-once and execute-once tests; async normalization; cancellation and failure outcomes; canonical visible/keyboard routing. | No |
| 2. Undo/Redo transaction safety | **PASS** | One history boundary; source trace for creation, movement, drag/nudge, alignment/distribution/gap, snap, duplicate/delete, groups, properties, layers, and viewpoints; accepted-once and rejected-zero tests. | No |
| 3. Runtime Panel authority | **PASS** | Required bindings and actual rendered state; contextual Connection Point Snap; manager dirty guards/exclusivity; shell and modal browser tests. | No |
| 4. Runtime Entity foundation | **PASS** | Machine/civil/annotation/group adapters; canonical family agreement; lock/visibility/layer context; reciprocal ownership checks; no empty selectable group; layers remain context. | No |
| 5. Runtime Selection authority | **PASS** | Single ordered authority, primary, reconciliation, scene/inspector synchronization, annotation exclusivity, group root promotion, and Edit Group child semantics. | No |
| 6. Atomic lock safety | **PASS** | All-or-nothing move, drag, nudge, alignment, distribution, equal gap, duplicate, snap, and group movement; eligible-unlocked Delete remains explicit and tested. | No |
| 7. Runtime Viewport and scene isolation | **PASS** | Registered/mounted `viewport.main`; committed resize, camera, lifecycle, perspective/orthographic, wheel zoom, serialized framing, zero-size deferral, unchanged suppression, and diagnostics isolation. | No |
| 8. Runtime Feature Access closure | **FAIL** | Matrix-derived exact set and structured observations exist, but current-session synthetic counters pass validation and the full gate without any live execution record. | Yes |
| 9. No-dead-UI and surface reachability | **PASS** | Exact 19-command browser scenario exercises visible routes and compares observations to the matrix-derived set; panel/surface audit links are valid. | No |
| 10. Contract and failure-test protection | **FAIL** | Missing, partial, duplicate, unknown, stale, cancelled, failed, attempted-only, malformed, and raw copied-ID cases fail. The live-store mismatch/synthetic-counter case is absent and demonstrably passes. | Yes |
| 11. No-red-console quality gate | **PASS** | Runner-owned current-checkout server; 34 browser tests; `console.error` and `pageerror` capture; normal URL diagnostics isolation; no red error observed. | No |
| 12. Documentation and governance | **PASS** | Current maintained standards and reports describe runtime authorities, cancellation, panels, entities, selection, lock policy, viewport, Feature Access, quality evidence, planned items, and debt. | No |

Mandatory result: **10 PASS, 2 FAIL**.

## 8. P0-B1 Closure Verification

**Result: PASS**

Delete cancellation:

- `executeConfirmedRuntimeCommandOperation()` evaluates confirmation before its
  mutation callback.
- Rejection returns `{ handled: false, status: "cancelled" }`.
- The execution probe increments `attemptCount` by one and leaves
  `executedCount` unchanged.
- Machine/civil state, history availability, dirty state, and selection remain
  unchanged in the browser cancellation path.
- Toolbar/inspector and keyboard Delete share `edit.deleteSelected`.

Ungroup cancellation:

- `ungroupAssembly()` resolves the group before confirmation.
- Rejection returns `{ handled: false, status: "cancelled" }`.
- Mutation, `markLayoutChanged`, active group edit state, and Runtime Selection
  changes exist only inside the accepted callback.
- Unit tests preserve the non-executed result and exactly-once callback contract.

Accepted paths:

- Accepted Delete and Ungroup return `{ handled: true, status: "executed" }`.
- Each accepted mutation calls `markLayoutChanged()` once before applying one
  state result.
- Browser probes require attempt `+1`, execution `+1`, handled true, and executed
  status.
- Errors remain observable at bridge level; App feature execution records failed
  results rather than successful execution.

Evidence:

- `src/platform/runtimeCommands/runtimeCommandOperation.ts`
- `src/platform/runtimeCommands/coreEditorRuntimeCommands.ts`
- `src/platform/runtimeCommands/assemblyRuntimeCommands.ts`
- `src/App.tsx` Delete/Ungroup bindings and probe recording
- `runtimeCommandOperation.test.ts`
- `coreEditorRuntimeCommands.test.ts`
- `assemblyRuntimeCommands.test.ts`
- `e2e/app-smoke.spec.ts` cancellation and canonical command tests

## 9. P0-B2 Closure Verification

**Result: FAIL**

Proven improvements:

- Required representative command IDs derive from the Feature Access Matrix
  entries classified `required-runtime`, required for regression, and marked
  `requiresSurfaceExecutionEvidence`.
- The current canonical set contains 19 sorted command IDs.
- E2E contains no copied canonical 19-command array.
- Duplicate canonical IDs and unknown command seeds throw.
- Planned and quality-signal features are excluded.
- Observation construction requires a matching current session, matching
  command IDs, attempt `+1`, execution `+1`, handled true, and executed status.
- Attestation validation rejects empty, partial, duplicate, unknown, stale,
  cancelled, failed, attempted-only, malformed, and raw copied-ID-only inputs.
- No-red-console remains separate browser-owned evidence.
- The dedicated positive E2E scenario executes all 19 visible routes and passes
  an exact complete observed set.

Unresolved integrity defect:

- `window.__atrvisuRuntimeFeatureAccess.createCommandExecutionObservation()`
  accepts caller-supplied before and after probe objects.
- It adds only the current session ID from App; it does not compare those probes
  with `runtimeCommandExecutionProbesRef`.
- `validateRuntimeSurfaceExecutionAttestation()` validates only the attestation's
  supplied counters and final result.
- The gate consumes that validator result without independently consulting the
  live probe store.

Audit browser reproduction on a clean diagnostics page:

1. Read the current diagnostics session and the matrix-derived required IDs.
2. Confirm `listCommandExecutions()` was `[]`.
3. For each required ID, submit synthetic before `0/0` and after `1/1` probes
   with `{ handled: true, status: "executed" }`.
4. Build an attestation from the returned observations.
5. Supply explicit no-red-console quality evidence.
6. Observe:
   - required IDs: 19
   - live probes before: `[]`
   - live probes after: `[]`
   - attestation validation: `passed: true`
   - verified IDs: all 19
   - complete gate: `passed: true`
   - blocked features: `[]`
   - browser red errors: none

The raw `verifiedCommandIds` shortcut is closed, but equivalent fabricated
execution evidence remains possible through synthetic probe transitions.

## 10. Runtime Command and Transaction Trace

Runtime command authority is split into bounded bridges:

- Core editor: Undo, Redo, Delete Selected, Duplicate Selected.
- Assembly: Create Group, Add/Remove Selected, Enter/Exit Edit, Ungroup.
- Runtime features: project actions, display controls, viewpoints, machine and
  civil insertion, managers, annotations, alignment/snap, collision, and
  benchmark.

Required live bindings read current committed App state. Registry definitions do
not execute the seed no-op. Enablement is evaluated once per bridge request,
callbacks execute at most once, disabled/unavailable/unsupported/cancelled/failed
outcomes are non-executed, and Promise results are awaited.

Persisted transaction trace:

| Action family | Preflight/confirmation | History boundary | Mutation result |
| --- | --- | --- | --- |
| Add machine, annotation, civil item | Valid creation context | One `markLayoutChanged` | One insertion |
| Move, pointer drag, keyboard nudge | Complete atomic selection | First accepted frame/action only | One batch delta; relative offsets preserved |
| Alignment, distribution, equal gap, pair alignment | Selection/group/lock eligibility | One | One batch position update |
| Connection Point Snap | Exact context plus atomic lock preflight | One when a different result exists | One machine batch |
| Duplicate | Complete selected machine set and atomic lock preflight | One | One batch insertion and selection replacement |
| Delete | Confirmation; eligible-unlocked policy | One accepted, zero cancelled | One eligible batch |
| Group create/add/remove/ungroup | Ownership and group resolution; Ungroup confirmation | One accepted | One immutable group result |
| Machine/civil/annotation properties and layer assignment | Entity/layer lock checks | One committed edit; continuous annotation edit records first frame only | One entity update |
| Layer create/rename/visibility/lock/isolate/delete/show-all | Valid layer/system-layer checks and delete confirmation | One | One layer/layout result |
| Viewpoint capture/update/rename/delete | Existing viewpoint and delete confirmation | One | One persisted viewpoint result |

Camera, panel, selection-only, viewport-only, and modal-only actions do not enter
layout history. Rejected atomic operations call neither the history callback nor
the mutation callback. Undo/Redo restores complete machine, civil, annotation,
viewpoint, layer, and group snapshots.

## 11. Panel and Surface Reachability

Required live panel/tool surfaces include the right-panel shell, Machine Library,
Inspector, Layout Controls, Viewpoints, Layers, Building/Civil, Assembly Tree,
Project Status, Simulation Controls, Annotations, Precision Placement,
Alignment, contextual Connection Point Snap, Display/Overlay, Collision, and
manager/benchmark modal surfaces.

The Runtime Panel Registry distinguishes registered, bound, visible, open,
available, contextually unavailable, cancelled, unsupported, and unbound states.
Binding refs are updated after commit without rebuilding the stable registry.

Dirty Library Manager close guards:

- block parent Machine Library section collapse;
- block right-panel shell collapse;
- preserve the dirty editor on cancellation;
- permit the accepted discard path;
- guard navigation to Taxonomy Manager;
- preserve Library/Taxonomy mutual exclusivity.

`PanelSection` state remains persistent. Connection Point Snap is available only
for the authoritative exact-two-explicit-machine context.

Explicitly planned and unbound:

- `panel.layoutExplorer`
- `panel.statusBar`
- `panel.diagnostics`
- `view.fitView`

`diagnostics.noRedConsole` remains a quality signal rather than a user command or
runtime panel.

## 12. Entity, Selection, Assembly, and Lock Safety

Canonical identities:

- `machine:<instanceId>`
- `civil:<id>`
- `annotation:<id>`
- `group:<groupId>`

Adapters preserve type/family agreement, canonical millimeter transforms,
subtype/source metadata, visibility, selectability, effective object/layer lock,
layer association, and group parent/child relationships. Duplicate identities
fail explicitly. Group normalization maintains one owning group per child;
unresolved persisted members remain visible to validation; empty groups are not
selectable runtime entities. Layers remain visibility/lock/ownership context,
not PlatformEntity objects.

`runtimeSelection` is the sole writable ordered authority. Machine, civil,
annotation, group, alignable, and inspector selections are projections. It
supports replace/toggle/clear, deterministic primary selection, reconciliation,
stale/hidden/non-selectable removal, annotation exclusivity, root promotion, and
Edit Group child semantics. Babylon meshes carry pick metadata but do not own
selection.

All-or-nothing lock policy:

- move
- pointer drag
- keyboard nudge
- alignment
- distribution
- equal gap
- duplicate
- Connection Point Snap
- rigid group movement

Any locked, hidden, unresolved, or non-selectable participant rejects the whole
operation before history and state mutation. Delete separately preserves the
documented eligible-unlocked policy.

## 13. Viewport and Scene Invariance

`viewport.main` is registered, bound, mounted, dimension-reporting,
camera-resolvable, resize-capable, and lifecycle-observable.

The current resize path:

- observes committed non-zero viewport size;
- coalesces requests through one frame;
- uses deterministic resize reasons;
- defers zero-size observations;
- suppresses unchanged dimensions;
- resizes the existing engine without scene reconstruction;
- removes owned listeners/observers during disposal.

Right-panel collapse/reopen, width drag, and browser/container resize preserve
Runtime Selection, entity transforms, rigid group membership, layers, history,
dirty state, simulation state, camera intent, and scene lifecycle generation.

Perspective state preserves pose, target, FOV, and orbit intent. Orthographic
transition derives world span from camera framing rather than pixel dimensions;
wheel zoom uses finite clamped spans; serialized framing survives viewpoint
capture/apply; aspect changes preserve center and vertical span while maintaining
uniform world-units-per-pixel.

Normal URL diagnostics globals are absent. Diagnostics are opt-in and read-only.
Focused PR #89 orthographic manual acceptance is explicitly recorded as passed.

## 14. Runtime Feature Access Gate

Classification remains correct:

- `required-runtime`: must have live current authority and runtime surface.
- `declared-planned`: may remain explicitly unbound.
- `quality-signal`: requires external evidence and is not treated as a command.

The runtime report correctly consumes Command, Panel, Selection, Entity, and
Viewport evidence, rejects metadata-only required features, and distinguishes
contextual unavailability from missing authority. Surface inventory and coverage
audits reject unknown and stale links.

The external surface-execution evidence boundary is not trustworthy because its
observation counters are caller-authored and not reconciled with the internal
probe store. The positive E2E scenario is genuine, but the production validator
can be made to pass independently of that scenario. Therefore the complete
Runtime Feature Access closure gate is **FAIL**.

## 15. Validation Results

Local validation on baseline
`a345ab296ae11e023c8c73bc21548f12625ef195`:

| Command/check | Result |
| --- | --- |
| `npm.cmd audit` | Passed; 0 vulnerabilities |
| `npm.cmd run build` | Passed; TypeScript build and Vite 8.0.16 production build |
| `npm.cmd run test -- --run` | Passed; 96 files / 911 tests |
| `npm.cmd run test:e2e` | Passed; 34 Chromium tests / 1 worker |
| Synthetic live-store integrity browser check | Reproduced blocker; gate passed with 19 synthetic observations and zero live probes |
| `git diff --check` | Passed after report creation |

Warnings:

- Vite reported the existing large-chunk advisory for the approximately
  5.37 MB minified main bundle.
- The first E2E invocation exceeded the audit tool's four-minute command window;
  its owned process exited. A rerun with an adequate window passed all 34 tests
  in approximately 3.8 minutes.
- No current browser workflow emitted a captured red console or page error.

Server ownership:

- A temporary audit server was started on port 5173 for the synthetic-attestation
  reproduction and only its owned Vite process was stopped afterward.
- The successful E2E runner selected port 5173, started the current checkout with
  strict-port behavior, and stopped its owned child.
- Port 5173 was not listening after validation.
- A pre-existing AtrVisu server on port 5174 was not reused, stopped, or changed.

GitHub evidence:

- PRs #86-#93 each have a completed successful Quality Gate on their exact head.
- PR #93's successful CI does not include the synthetic/live-store mismatch case.
- This audit branch's GitHub Quality Gate is pending until the report commit is
  pushed and must be inspected before handoff.

## 16. Residual Non-Blocking Debt

1. **Full NumericInput migration**
   - Non-blocking because required signed-coordinate and rotation paths are
     explicit, tested, and stable.
   - Track: Phase 1 UX maintenance.

2. **`App.tsx` size and deeper orchestration extraction**
   - Non-blocking because runtime authorities and lifecycle boundaries are
     explicit and protected.
   - Track: controlled architecture maintenance after Phase 0.

3. **Vite main-bundle large-chunk advisory**
   - Non-blocking because the production build succeeds and no Phase 0 runtime
     invariant fails.
   - Track: performance/package optimization.

4. **DPR-only viewport compatibility**
   - Non-blocking because committed panel/browser/container resize paths pass;
     a dedicated cross-browser DPR subscription is not a current exit invariant.
   - Track: viewport compatibility maintenance.

5. **Deeper geometry/GLB and visual-pixel coverage**
   - Non-blocking because representative loading, diagnostics, selection,
     transform, and no-red-console behavior pass.
   - Track: later engineering QA.

6. **Planned product surfaces and later capabilities**
   - Layout Explorer, Status Bar, Diagnostics panel, Fit View, professional shell
     redesign, BOM/PDF/Excel/reporting/quotation/presentation, simulation
     expansion, backend/cloud, authentication, and digital twin work are not
     Phase 0 requirements.
   - Track: roadmap phases 1-6 as applicable.

## 17. Blocking Findings

### P0-B2R - Surface execution attestations are not bound to the live probe store

- Evidence:
  - `createRuntimeCommandExecutionObservation()` validates caller-supplied probe
    objects but does not read the internal probe store.
  - `validateRuntimeSurfaceExecutionAttestation()` validates only caller-supplied
    observation fields.
  - App exposes current session, required IDs, observation creation, and
    attestation validation through the diagnostics bridge.
  - A fresh browser session passed all 19 synthetic observations and the complete
    gate while `listCommandExecutions()` remained empty.
  - PR #93's unresolved, non-outdated P1 review thread describes the same defect
    on the merged head.
- Impact:
  - Required browser route execution can be falsely attested.
  - Runtime Feature Access can report ready with no representative commands
    executed.
  - The gate cannot reject stale or falsely bound runtime access as required.
- Smallest coherent follow-up package:
  - Mint opaque observations from internally captured before/after transitions,
    or verify every submitted observation against an immutable current-session
    record owned by the live probe store.
  - Consume each transition at most once.
  - Preserve the matrix-derived exact set, no-red-console separation, diagnostics
    isolation, and existing genuine 19-route E2E scenario.
- Proposed branch:
  - `fix/runtime-feature-access-live-probe-attestation-v01`
- Forbidden scope:
  - No new command or panel IDs.
  - No feature reclassification.
  - No UI, shell, Babylon, selection, entity, viewport, history, persistence,
    package, workflow, roadmap, or Phase 1 changes.
- Acceptance criteria:
  - Synthetic counters with an empty live probe store fail.
  - Replayed/duplicate observations fail.
  - Stale-session observations fail.
  - Missing, partial, cancelled, failed, attempted-only, malformed, unknown, and
    raw copied-ID evidence continue to fail.
  - The genuine visible-route scenario passes all matrix-derived representatives.
  - Normal runtime exposes no diagnostics bridge.
  - Audit, build, unit, E2E, and GitHub Quality Gate pass.

## 18. Phase Transition Decision

Phase 0 remains open.
Phase 1 must not begin.

Required bounded follow-ups:

1. `fix/runtime-feature-access-live-probe-attestation-v01`
2. A repeat Final Phase 0 Exit Audit after that package is independently reviewed
   and merged.

No Phase 1 branch or task has been created.
The user must be explicitly warned before the first Phase 1 task begins.

## 19. Evidence Limitations

- This audit did not alter implementation, tests, E2E, configuration, packages,
  lockfiles, workflows, standards, roadmap, ADRs, historical audits, or runtime
  behavior.
- Browser coverage is representative rather than exhaustive visual/pixel
  verification.
- Explicit manual evidence was recorded only where the user or maintained package
  record stated it; no manual result was inferred for other PRs.
- Successful CI proves the committed checks passed, not that an untested
  attestation-integrity invariant holds.
- The synthetic-attestation reproduction used only the opt-in diagnostics URL,
  did not execute user routes, did not mutate repository files, and removed its
  temporary generated log.
- This audit does not declare Phase 0 closed, does not begin Phase 1, and does not
  merge its own pull request.
