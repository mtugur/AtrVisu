# Phase 0 Platform Foundation Closure Readiness Audit v0.1

Audit date: 2026-07-15  
Repository: `C:\Users\mt_ug\Documents\AtrVisu`  
Branch: `audit/phase-0-closure-readiness-v01`  
Baseline commit: `2deb0f8`  
Audit scope: evidence-only review; no production or test behavior changes

## 1. Executive Decision

**NOT READY TO CLOSE**

Phase 0 has a substantial and well-tested platform metadata foundation, but the required contracts are not yet the runtime authority. The Command Registry and Panel Registry are populated with valid seed metadata, yet the command seeds execute a no-op and the running application does not import the platform layer. Entity, Selection, and Viewport adapters similarly remain isolated from runtime state and behavior. As a result, the current readiness report can return `ready` while user actions, panel visibility, selection, and viewport resizing continue through direct legacy callbacks.

The no-red-console E2E gate, history helpers, Babylon boundary extraction, and audit failure coverage are strong. They reduce migration risk, but they do not close the contract-to-runtime gap required by the Phase 0 master plan.

Status count across the 12 audited acceptance domains:

| Status | Count |
| --- | ---: |
| PASS | 2 |
| PARTIAL | 4 |
| FAIL | 6 |
| NOT PROVEN | 0 |
| OUT OF PHASE 0 | 0 |

## 2. Baseline

### Repository state

- Audit started on branch `audit/phase-0-closure-readiness-v01` at commit `2deb0f8`.
- `2deb0f8` is an ancestor of the audited HEAD.
- Worktree was clean at audit start.
- No mandatory documentation index convention was found, so no index file was changed.
- This audit adds only this report.

### Governing sources

- `AGENTS.md`
- `docs/roadmap/ATRVISU_LAYERED_MASTER_PLAN.md`
- `docs/standards/MASTER_ARCHITECTURE_STANDARD.md`
- `docs/standards/PLATFORM_STANDARD.md`
- `docs/standards/DATA_MODEL_STANDARD.md`
- `docs/standards/UX_STANDARD.md`
- `docs/standards/SIMULATION_STANDARD.md`
- `docs/protocols/CODEX_SYNC_PROTOCOL.md`
- `docs/checklists/FEATURE_ACCESS_MATRIX.md`
- `docs/checklists/PLATFORM_QUALITY_GATE.md`
- `docs/feature-acceptance-checklist.md`
- `docs/ui-standards.md`
- `docs/quality-gate.md`
- `docs/adr/ADR-000-template.md`

The Layered Master Plan defines Phase 0 outputs as Command, Panel, Entity, Selection, and Viewport contracts; legacy adapters; contract tests; a feature access matrix; and a no-red-console E2E gate. The architecture and platform standards additionally require user actions and discoverable surfaces to evolve through the registries rather than remain parallel metadata.

### Evidence method

The audit used:

- direct source inspection;
- symbol and import searches;
- runtime call-path tracing from rendered controls to callbacks;
- unit and E2E test-name inspection;
- platform inventory, audit, readiness, and failure-report inspection;
- the quality commands listed in Section 10.

The original broad path search was:

```text
rg -n "platform/" src -g "!src/platform/**" -g "*.ts" -g "*.tsx"
```

Result: `NO_RUNTIME_PLATFORM_IMPORTS`.

That result is supporting evidence, but is not treated as independently decisive. Two broader searches were also run:

```text
rg -n 'from\s+["''][^"'']*platform(?:/|["''])' src -g "!src/platform/**" -g "*.ts" -g "*.tsx"
```

Result: no matches (`rg` exit code 1, empty stdout).

```text
rg -n "createSeededPlatformCommandRegistry|createSeededPlatformPanelRegistry|createSelectionStateFromIds|createViewportResizeRequest|createPlatformReadinessReport" src -g "!src/platform/**" -g "*.ts" -g "*.tsx"
```

Result: no matches (`rg` exit code 1, empty stdout).

Together, the path search, import-statement search, and key-symbol search show that no application component or runtime utility currently imports or calls the seeded registries, runtime selection adapter entry point, viewport request constructor, or readiness report. This conclusion is limited to the searched TypeScript runtime source under `src` and does not claim that text outside those files was examined by these commands.

## 3. Phase 0 Acceptance Matrix

| Domain | Status | Evidence | Closure assessment |
| --- | --- | --- | --- |
| A. Command contract and registry | **FAIL** | `src/platform/contracts/command.ts`; `src/platform/registries/commandRegistry.ts`; `src/platform/registrySeeds/commandSeedDefinitions.ts`; tests in `src/platform/__tests__/commandRegistry.test.ts` and `src/platform/registrySeeds/__tests__/platformRegistrySeeds.test.ts` | Contract validation is sound, including duplicate IDs and undo metadata. However, required-runtime seeds use `noopExecute`, the registry has no authoritative runtime execute path, and `App.tsx` invokes direct callbacks. Declared-planned commands may remain unbound, and quality signals are not required to behave like user commands. |
| B. Panel contract and registry | **FAIL** | `src/platform/contracts/panel.ts`; `src/platform/registries/panelRegistry.ts`; `src/platform/registrySeeds/panelSeedDefinitions.ts`; `src/platform/__tests__/panelRegistry.test.ts` | Panel metadata validates dock and role rules, but required-runtime AppShell/panel rendering is not driven by the registry. Declared-planned and modal/tool-surface definitions do not all need runtime registry bindings for Phase 0 closure. |
| C. Entity foundation | **FAIL** | `src/platform/contracts/entity.ts`; no entity adapter exists under `src/platform/adapters/` | `PlatformEntity` and `PlanTransform` exist, but no legacy entity adapter maps selectable or scene-addressable machines, civil references, annotations, groups, zones, or flow objects into the contract. `layerId` is context on `PlatformEntity`; the contract does not require Layer itself to become an entity. |
| D. Selection contract | **FAIL** | `src/platform/contracts/selection.ts`; `src/platform/adapters/selectionAdapter.ts`; `src/platform/adapters/__tests__/selectionAdapter.test.ts`; runtime states in `src/App.tsx` | Adapter behavior is deterministic and preserves first-selected primary order, but it is not used by runtime. `App.tsx` manually coordinates machine, civil, annotation, group, and generic entity selections. Multi-drag also filters locked members rather than atomically blocking the selected set. |
| E. Viewport and scene contract | **FAIL** | `src/platform/contracts/viewport.ts`; `src/platform/adapters/viewportAdapter.ts`; `src/platform/adapters/__tests__/viewportAdapter.test.ts`; `src/components/AppShell.tsx`; `src/components/babylonScene/sceneLifecycle.ts` | Preserve-only resize requests are tested, and scene lifecycle resize handling is extracted. The runtime panel resize/collapse path in `App.tsx` does not call the adapter, and E2E does not prove camera, selection, or transforms are preserved across dock resize/collapse. |
| F. Feature Access Matrix | **FAIL** | `src/platform/featureAccess/featureAccessMatrix.ts`; `src/platform/integration/featureAccessCoverageDefinitions.ts`; `src/platform/surfaceInventory/currentSurfaceInventory.ts`; surface coverage tests | Coverage checks prove metadata links to seed IDs, not usable runtime access. `object.duplicate` is still marked `requiredForRegression: false` and "not currently exposed" even though Ctrl/Cmd+D and inspector/multi-selection UI are active and inventoried. Runtime dead or disconnected actions can still pass readiness. |
| G. Contract, audit, and failure tests | **PASS** | Registry, adapter, inventory, coverage, readiness, AppShell boundary, Scene Viewport boundary, and Babylon Scene boundary tests under `src/platform/**/__tests__` | Strong deterministic positive and negative coverage exists. Readiness dependency exceptions are converted to controlled `not-ready` results. The limitation is scope: these tests validate metadata and reports, not runtime binding. |
| H. No-red-console runtime stability | **PASS** | `collectPageErrors` and 12 smoke tests in `e2e/app-smoke.spec.ts`; `docs/quality-gate.md` | Each smoke test collects `console.error` and `pageerror` and asserts an empty error list. Major panels and manager modal lifecycles are exercised in a clean browser context. |
| I. Undo/Redo transaction safety | **PARTIAL** | `recordLayoutHistory`, `markLayoutChanged`, `undoLayoutChange`, `redoLayoutChange` in `src/App.tsx`; `src/utils/layoutHistory.ts`; `src/utils/layoutHistory.test.ts`; drag start uses `onBeginObjectDrag` | Snapshot behavior is covered for move, alignment, delete, duplicate, annotations, civil references, and viewpoints. Transactions are not governed through Command Registry execution, and there is no exhaustive mutation audit proving every mutating surface creates exactly one transaction. |
| J. No-dead-UI guarantee | **PARTIAL** | Direct callback paths in `src/App.tsx` and components; 12 E2E smoke tests | Exercised controls are live, including library add, rotation, alignment panel, manager open/close, annotation edit, viewpoints, layers, civil references, and groups. There is no exhaustive control inventory-to-runtime execution test. Metadata coverage cannot detect a visible control with a missing or stale callback. |
| K. Numeric input foundation | **PARTIAL** | `src/components/common/NumericInput.tsx`; `src/components/common/NumericInput.test.ts`; `src/utils/numericFieldRules.ts`; keyboard guard tests | Shared normalization supports temporary negative states and rule-based validation. Raw number inputs remain in Alignment, Precision Placement, Connection Point Snap, Machine Rotation, Library Manager, and Performance Benchmark. Full numeric-field classification is migration debt, not a reason to redesign Phase 0. |
| L. Documentation and governance | **PARTIAL** | Master Plan, architecture/platform/data/UX/simulation standards, sync protocol, quality checklists | Governance is unusually explicit. However, `docs/checklists/FEATURE_ACCESS_MATRIX.md` is a template rather than a maintained feature-access artifact, and only `docs/adr/ADR-000-template.md` exists; no accepted ADR records the major platform migration decisions. |

## 4. Runtime Command Trace

### Phase 0 command binding classification

The classification below is an audit classification for closure scope; it does not modify the current `CommandDefinition` type.

| Classification | Meaning | Current definitions |
| --- | --- | --- |
| `required-runtime` | Existing user or system behavior that must resolve to a live, non-no-op runtime binding before Phase 0 closes | `project.save`, `project.exportJson`, `project.importJson`, `project.restorePrompt`, `edit.undo`, `edit.redo`, `edit.deleteSelected`, `edit.duplicateSelected`, `view.toggleLabels`, `view.viewpoints`, `view.toggleConnectionPoints`, `view.showMeasurements`, `library.addMachine`, `annotations.create`, all five `civil.add*` definitions, `alignment.alignSelection`, `snap.rotation`, `snap.connectionPoint`, `library.manager`, `library.taxonomyManager`, `collision.check`, `performance.benchmark` |
| `declared-planned` | A declared capability without proven current runtime behavior; it may remain unbound when explicitly classified and excluded from required regression access | `view.fitView` |
| `quality-signal` | A validation or quality-gate signal, not a user command; it needs trustworthy test/report evidence rather than command execution | `diagnostics.noRedConsole` |

Only `required-runtime` commands require live non-no-op registry bindings for Phase 0 closure. A planned definition is not a blocker merely because it is unbound, provided the classification is explicit and readiness does not report it as live. `diagnostics.noRedConsole` remains mandatory as a quality gate, but is not required to execute like a user command.

The following table distinguishes seed metadata from the actual current runtime path.

| Command ID | Seed evidence | Current runtime path | Result |
| --- | --- | --- | --- |
| `project.save` | `platformCommandSeedDefinitions`; `execute: noopExecute` | `ProjectManager` async repository methods and `onSavedRevision` callback in `src/components/ProjectManager.tsx`; modal orchestration in `src/App.tsx` | Direct legacy path; registry not used |
| `project.exportJson` | No-op seed | `exportProject()` in `src/components/ProjectManager.tsx` | Direct legacy path |
| `project.importJson` | No-op seed | `importProjectFile()` -> `importProject()` in `src/components/ProjectManager.tsx` | Direct legacy path |
| `project.restorePrompt` | No-op seed | autosave state/effects in `src/App.tsx` | Direct legacy path |
| `edit.undo` | No-op seed | toolbar `onClick={undoLayoutChange}` and keyboard action switch in `src/App.tsx` | Direct legacy path |
| `edit.redo` | No-op seed | toolbar `onClick={redoLayoutChange}` and keyboard action switch in `src/App.tsx` | Direct legacy path |
| `edit.deleteSelected` | No-op seed | `deleteSelectedMachines` and generic keyboard delete orchestration in `src/App.tsx`; direct props to inspector panels | Direct legacy path |
| `edit.duplicateSelected` | No-op seed | `duplicateSelectedMachines` in `src/App.tsx`; direct props to `MachineProperties` and `MultiSelectionProperties`; keyboard action from `src/utils/keyboardShortcuts.ts` | Direct legacy path; feature matrix stale |
| `view.fitView` | No-op seed | no registry execution path found | Runtime binding not proven |
| `view.toggleLabels` | No-op seed | overlay state callbacks rendered directly from `src/App.tsx` | Direct legacy path |
| `view.viewpoints` | No-op seed | direct Viewpoints panel callbacks in `src/App.tsx` | Direct legacy path |
| `library.addMachine` | No-op seed | `MachineLibrary.onAddMachine` -> `addMachine` in `src/App.tsx` | Direct legacy path |
| `annotations.create` | No-op seed | `AnnotationsPanel.onAddAnnotation` -> `addAnnotation` in `src/App.tsx` | Direct legacy path |
| `civil.add*` | No-op seeds | `CivilReferencePanel.onAddCivilReference` -> `addCivilReference` in `src/App.tsx` | Direct legacy path |
| `alignment.alignSelection` | No-op seed | `MultiSelectionProperties.onAlign` -> alignment callbacks in `src/App.tsx` -> `src/utils/alignment.ts` | Direct legacy path |
| `snap.rotation` | No-op seed | placement settings state and direct control callbacks | Direct legacy path |
| `snap.connectionPoint` | No-op seed | connection-point snap panel state/callbacks | Direct legacy path |
| `library.manager` | No-op seed | local/modal state in `MachineLibrary` and `App.tsx` | Direct legacy path |
| `library.taxonomyManager` | No-op seed | local/modal state in `MachineLibrary` and `App.tsx` | Direct legacy path |
| `collision.check` | No-op seed | direct collision panel state/callbacks | Direct legacy path |
| `performance.benchmark` | No-op seed | direct modal state/callbacks | Direct legacy path |
| `diagnostics.noRedConsole` | No-op seed | Playwright listener assertions only | Quality signal, not runtime command |

Key symbols:

- `noopExecute` and `createCommandSeed` in `src/platform/registrySeeds/commandSeedDefinitions.ts`
- `createCommandRegistry` in `src/platform/registries/commandRegistry.ts`
- `createSeededPlatformCommandRegistry` in `src/platform/registrySeeds/platformRegistrySeeds.ts`
- `createPlatformReadinessReport` in `src/platform/readinessReport/platformReadinessReport.ts`
- direct action callbacks in `src/App.tsx`: `addMachine`, `duplicateSelectedMachines`, `deleteSelectedMachines`, `undoLayoutChange`, `redoLayoutChange`, `addAnnotation`, and `addCivilReference`

The registry currently proves that command metadata is internally valid. It does not prove that a command can execute, is enabled consistently, reaches history, or is discoverable from every runtime surface.

## 5. Panel and Viewport Stability Evidence

### Phase 0 panel binding classification

The classification below is an audit classification for closure scope; it does not modify the current `PanelDefinition` type.

| Classification | Meaning | Current definitions |
| --- | --- | --- |
| `required-runtime` | Persistent application surfaces whose current availability must be represented by a live Panel Registry binding | `panel.machineLibrary`, `panel.layoutExplorer`, `panel.inspector`, `panel.statusBar`, `panel.annotations`, `panel.layers`, `panel.groups` |
| `declared-planned` | Declared panel metadata without a required current live surface; it may remain unbound when explicitly classified | None in the current seed set; retained as an allowed classification for future declarations |
| `modal/tool-surface` | Existing manager, diagnostics, or tool lifecycle that remains covered by direct modal/tool behavior and E2E; it is not required to become a docked Panel Registry binding in Phase 0 | `panel.collisionCheck`, `panel.performanceBenchmark`, `panel.diagnostics`, `panel.projectManager`, `panel.libraryManager`, `panel.taxonomyManager` |

Only `required-runtime` panel definitions must resolve to live Panel Registry surfaces before Phase 0 closes. Declared-planned definitions may remain unbound when readiness reports that state honestly. Modal/tool surfaces must remain reachable and regression-tested, but are not forced into the persistent panel binding model by this audit.

### Positive evidence

- `AppShell` provides stable `data-app-shell-zone` anchors in `src/components/AppShell.tsx`.
- `src/components/AppShell.test.ts` verifies the presentational render contract without importing `App.tsx` or Babylon.
- E2E test `app shell zone anchors are rendered without red console errors` verifies deterministic initial anchors.
- `src/platform/adapters/viewportAdapter.ts` always sets `preserveCamera`, `preserveSelection`, and `preserveEntityTransforms` to `true`.
- `src/platform/adapters/__tests__/viewportAdapter.test.ts` covers dock resize/collapse request semantics and invalid dimensions.
- `src/components/babylonScene/sceneLifecycle.ts` owns render loop, resize listener, cleanup, and engine disposal.
- Scene and Babylon boundary inventories/audits have deterministic positive and failure tests.

### Missing closure proof

- `panelWidth`, `isPanelCollapsed`, `startPanelResize`, and persistence effects in `src/App.tsx` operate directly and do not issue a `ViewportResizeRequest`.
- Panel visibility and modal state are not resolved from `createSeededPlatformPanelRegistry()`.
- No E2E test collapses/reopens or resizes the dock and then verifies unchanged camera, selection, Plan X/Plan Y, rotation, dimensions, and drag behavior.
- The initial zone-anchor E2E checks only `app-root`, `machine-properties`, and `top-toolbar`; it does not prove every conceptual boundary is present in all relevant states.
- Inventory readiness therefore represents declared intent, not runtime isolation.

Conclusion: the AppShell extraction is a useful boundary, but shell redesign is not yet safe under the Phase 0 rule that panel operations must not mutate viewport or entity state.

## 6. Feature Access Regression Evidence

### What is proven

- `platformFeatureAccessMatrix` is non-empty and typed as `FeatureAccessEntry[]`.
- `criticalRegressionFeatureIds` and matrix tests verify critical IDs and non-empty surfaces.
- `validateFeatureAccessCoverage()` checks that coverage definitions reference existing feature, command seed, and panel seed IDs.
- Surface inventory tests enforce unique IDs, source files, labels, and command/panel/feature links.
- Surface coverage failure tests detect missing command, panel, and required feature metadata.
- Readiness report failure tests prove controlled `not-ready` behavior for seed, coverage, inventory, boundary, and thrown-dependency failures.

### What is not proven

- Coverage definitions do not resolve rendered controls or execute callbacks.
- `selection.singleSelect` and `selection.multiSelect` are explicitly `metadata-only`; their notes state runtime selection manager integration is outside the platform branch.
- Required features can be "covered" by a command seed whose `execute` function is `noopExecute`.
- Required panel features can be "covered" by a panel seed that does not control runtime visibility.
- `createPlatformReadinessReport()` has a current happy-path test named `returns ready status for current valid platform data`, even though the runtime import search finds no platform integration.
- `object.duplicate` is an observed metadata regression:
  - `src/platform/featureAccess/featureAccessMatrix.ts` says API-only, non-required, and not exposed;
  - `src/platform/integration/featureAccessCoverageDefinitions.ts` links it to `edit.duplicateSelected`;
  - `src/platform/surfaceInventory/currentSurfaceInventory.ts` documents inspector and keyboard surfaces;
  - E2E `multi-selection alignment panel actions render without red console errors` executes `Control+d`.

This mismatch shows that the current readiness gate can remain green while feature access documentation drifts from product reality.

## 7. Phase 0 Blockers

### B1. Required-runtime commands are not bound through the Command Registry

Evidence:

- all 28 command seeds use `noopExecute`, including every definition classified `required-runtime`;
- the broad path, import-statement, and key-symbol searches find no runtime registry integration outside `src/platform`;
- toolbar, keyboard, panels, and modals invoke direct callbacks;
- registry tests validate registration metadata but do not execute commands by ID.

Impact: shell/menu/shortcut changes can bypass enablement, undo requirements, and feature access while readiness remains green. The unbound `declared-planned` `view.fitView` definition and the `quality-signal` `diagnostics.noRedConsole` definition are not independently blockers.

### B2. Required-runtime panels are not bound through the Panel Registry

Evidence:

- 13 panel seeds exist, but the required-runtime definitions do not render or resolve their current surfaces through the registry;
- no runtime source outside `src/platform` imports `createSeededPlatformPanelRegistry`;
- direct App/component rendering and local modal state remain authoritative.

Impact: a shell change can make a required panel unreachable while metadata-only readiness remains green. Explicitly planned future definitions may remain unbound, and modal/tool surfaces are not forced into a persistent panel binding merely to close Phase 0.

### B3. Viewport resize/collapse isolation is not runtime-bound or regression-proven

Evidence:

- right dock width/collapse state is local to `App.tsx`;
- viewport preserve requests are tested only in `viewportAdapter.test.ts`;
- runtime resize/collapse does not call `createViewportResizeRequest` or the safe adapter;
- no E2E proves camera, selection, and entity transform invariance across resize/collapse.

Impact: panel layout changes can disturb scene state without violating the current platform readiness checks.

### B4. Selectable and scene-addressable objects lack legacy entity adapters

Evidence:

- `PlatformEntity` exists in `src/platform/contracts/entity.ts`;
- `src/platform/adapters/` contains command, feature access, selection, and viewport adapters only;
- selectable or scene-addressable machines, civil references, annotations, groups, zones, and flow objects remain separate runtime shapes;
- `PlatformEntity.layerId` already represents layer context, and the contract does not require Layer itself to be adapted as an entity.

Impact: generic selection, command enablement, visibility/lock context, and feature access cannot rely on stable platform identities. No schema or persistence migration is required to close this blocker.

### B5. Selection contract is not runtime authoritative, and locked multi-drag is non-atomic

Evidence:

- `createSelectionStateFromIds()` is well tested but unused by runtime;
- `App.tsx` coordinates multiple selection IDs/states manually;
- `getMachineDragInstanceIds()` in `src/components/babylonScene/dragPlacement.ts` filters locked selected machines and moves the remaining set;
- test `filters locked machines out of the drag set` codifies partial movement.

Required operation policy:

- all-or-nothing when any selected movable entity is locked: move, drag, nudge, align, distribute, equal gap, and duplicate;
- delete may retain the current eligible-unlocked behavior, but only when that behavior is explicitly documented and tested.

Impact: the current drag filter can deform the selected group when one selected member is locked. It also makes command enablement and primary-selection semantics vulnerable during shell migration. The current locked multi-drag behavior remains a blocker even if delete intentionally uses a different policy.

### B6. Feature access and readiness validate metadata, not runtime reachability

Evidence:

- coverage is satisfied by seed IDs and inventory links;
- selection coverage is metadata-only;
- no-op required-runtime commands and unbound required-runtime panels can satisfy coverage;
- declared-planned and quality-signal definitions are not represented as distinct binding expectations;
- stale `object.duplicate` classification passes the current matrix and readiness tests;
- the readiness happy path reports ready despite zero runtime platform imports.

Impact: the advertised platform gate can produce a false-ready result and cannot yet protect against dead UI or lost feature access.

## 8. Non-Blocking Technical Debt

1. **Full numeric input migration.** Shared `NumericInput` and rule infrastructure exist, but raw number inputs remain in several panels. Classify and migrate them incrementally in Phase 1; completing every migration is non-blocking for Phase 0.
2. **Mutation inventory completeness.** History tests cover major workflows, but there is no generated or maintained list mapping every mutating runtime action to one transaction boundary.
3. **Feature access documentation drift.** The checklist file is a template and the runtime matrix has at least the `object.duplicate` mismatch.
4. **ADR record gap.** The repository contains only the ADR template. Accepted platform migration decisions should be recorded before larger architectural changes.
5. **Deeper geometry and GLB E2E.** The smoke suite is broad but intentionally does not verify pixel-level drag, complete collision geometry, GLB fidelity, or every keyboard action. These are documented limitations in `docs/quality-gate.md` and are non-blocking for Phase 0.
6. **`App.tsx` size.** `App.tsx` still owns substantial cross-domain state. Its size is non-blocking transitional debt; extraction should follow, not substitute for, runtime command/entity/selection boundaries.
7. **Boundary reports are declaration-heavy.** AppShell, Scene Viewport, and Babylon audits are valuable guardrails, but most assertions verify structured metadata rather than live module ownership.
8. **Professional shell/UI redesign.** A polished shell, menus, generalized inspectors, and broader visual redesign are Phase 1+ product work and are not closure requirements.
9. **Output products.** BOM, PDF, Excel, and 2D output are later product capabilities and do not affect the Phase 0 platform decision.
10. **Simulation and digital twin work.** Advanced simulation, PLC/physics behavior, commissioning, backend/cloud/authentication, and digital twin capabilities are outside Phase 0.

These classifications are intentionally non-blocking and must not be used to soften the six Phase 0 FAIL conclusions.

## 9. Proposed Closure Packages

These are the smallest coherent packages that close the blockers without combining unrelated themes.

### Package 1: Runtime Command Registry Bridge

- Proposed branch: `feat/runtime-command-registry-bridge-v01`
- Mission: make required-runtime command IDs invoke existing behavior without changing user-facing behavior.
- Scope:
  1. codify `required-runtime`, `declared-planned`, and `quality-signal` command classifications;
  2. add a narrow runtime binding layer for required-runtime callbacks;
  3. replace `noopExecute` for required-runtime execution while preserving seed metadata validation;
  4. expose deterministic execute/enable APIs by command ID;
  5. route toolbar and keyboard actions through the same command execution path;
  6. prove mutating commands open exactly one existing history transaction.
- Forbidden: UI redesign, callback behavior changes, new command semantics, treating quality signals as user commands, package changes.
- Acceptance: required-runtime toolbar and shortcut paths resolve the same live command ID; disabled reasons are consistent; planned definitions may remain explicitly unbound; no-op required-runtime commands cannot satisfy readiness.
- Dependency order: 1.
- Risk: high because it touches central action orchestration; migration should be command-by-command behind a legacy adapter.

### Package 2: Legacy Entity Adapter Foundation

- Proposed branch: `feat/runtime-entity-adapters-v01`
- Mission: give selectable or scene-addressable domain objects stable platform identities without replacing domain models.
- Scope:
  1. define stable entity-key mapping and parsing for current selectable or scene-addressable object types;
  2. adapt front-left-bottom plan transforms without changing units;
  3. expose visibility, lock, ownership, and `layerId` context needed by commands and selection;
  4. test machines, civil references, annotations, selectable groups, zones/flow objects where currently scene-addressable, and missing/stale objects;
  5. keep Layer as visibility/lock/ownership context unless a later contract decision explicitly makes it an entity;
  6. keep Babylon meter conversion outside the domain contract.
- Forbidden: schema rewrite, persistence migration, adapting Layer as an entity without a contract decision, coordinate behavior changes, UI changes.
- Acceptance: every selectable or scene-addressable domain object has a stable platform ID and adapter; Layer remains context; serialization and persistence schemas remain unchanged.
- Dependency order: 2, after Package 1 or in parallel only if runtime orchestration files do not overlap.
- Risk: medium.

### Package 3: Runtime Selection Bridge and Atomic Lock Safety

- Proposed branch: `feat/runtime-selection-contract-bridge-v01`
- Mission: make the platform selection shape the canonical read model and enforce operation-specific lock behavior.
- Scope:
  1. adapt existing machine/civil/annotation/group selection events into one ordered selection snapshot;
  2. preserve first-selected primary semantics;
  3. keep scene, explorer, inspector, and group selection synchronized;
  4. reject stale IDs deterministically;
  5. enforce all-or-nothing locked-selection behavior for move, drag, nudge, align, distribute, equal gap, and duplicate;
  6. preserve delete's eligible-unlocked behavior only if explicitly documented and covered by deterministic tests;
  7. add focused unit and E2E coverage for replace/toggle/clear/primary and each operation policy.
- Forbidden: new selection UX, marquee selection, alignment algorithm redesign, entity schema migration.
- Acceptance: one canonical selection read model drives command enablement and inspector choice; locked group operations follow the explicit per-operation policy; current partial locked multi-drag is removed.
- Dependency order: 3, after Package 2.
- Risk: high.

### Package 4: Runtime Panel Registry Bridge

- Proposed branch: `feat/runtime-panel-registry-bridge-v01`
- Mission: bind required-runtime panel identities to existing surfaces without redesigning the shell.
- Scope:
  1. codify `required-runtime`, `declared-planned`, and `modal/tool-surface` panel classifications;
  2. map required-runtime panels to current rendered surfaces;
  3. use registry metadata for discoverability and initial visibility policy without changing markup order;
  4. keep declared-planned panels explicitly unbound and honestly reported;
  5. preserve existing manager/modal/tool lifecycle and E2E reachability;
  6. fail panel coverage when a required-runtime panel has no live surface.
- Forbidden: new shell, dock redesign, CSS rework, forcing planned or modal/tool definitions into persistent panel slots.
- Acceptance: every required-runtime panel resolves to a live surface; planned definitions may remain explicitly unbound; modal/tool surfaces remain reachable and regression-tested.
- Dependency order: 4, after Package 3.
- Risk: medium-high.

### Package 5: Viewport Isolation and Resize Invariance

- Proposed branch: `feat/viewport-resize-invariance-v01`
- Mission: connect panel resize/collapse events to the viewport contract and prove scene-state preservation.
- Scope:
  1. issue preserve-only viewport resize intent from right-panel resize and collapse/reopen paths;
  2. keep the existing Babylon resize lifecycle and camera controls unchanged;
  3. verify camera, selection, transforms, dimensions, and drag math remain unchanged;
  4. add deterministic dock resize/collapse component and E2E coverage;
  5. verify localStorage width/collapse restoration does not mutate scene data;
  6. expose a readiness signal for tested runtime viewport isolation.
- Forbidden: panel registry work, shell redesign, CSS redesign, camera behavior changes, scene transform changes.
- Acceptance: resize/collapse/reopen passes camera, selection, and entity-state invariance tests and produces no red console errors.
- Dependency order: 5, after Package 4.
- Risk: medium-high.

### Package 6: Runtime Feature Access Closure Gate

- Proposed branch: `feat/runtime-feature-access-gate-v01`
- Mission: make readiness prove classified runtime command/panel reachability rather than metadata links alone.
- Scope:
  1. distinguish declared, bound, exercised, planned, and quality-signal access;
  2. fail readiness for no-op required-runtime commands or unbound required-runtime panels;
  3. allow explicitly classified planned definitions to remain unbound without being reported live;
  4. replace metadata-only selection coverage with runtime contract evidence;
  5. correct `object.duplicate` surfaces and regression requirement;
  6. add failure tests for stale, false, and missing runtime bindings;
  7. update the maintained feature access evidence and required ADR records in the package's own documentation scope.
- Forbidden: new product features, UI redesign, broad audit-system rewrite, treating quality signals as user commands.
- Acceptance: readiness is green only when required runtime features resolve to live bindings; stale or falsely bound access fails deterministically; planned definitions remain visibly planned.
- Dependency order: 6, after Packages 1-5.
- Risk: medium.

### Package 7: Final Phase 0 Exit Audit

- Proposed branch: `audit/phase-0-final-exit-v01`
- Mission: rerun this evidence model against the completed runtime bridges and issue the final closure decision.
- Scope:
  1. rerun the broad path, import-statement, and key-symbol runtime searches;
  2. trace every required-runtime command and panel to a live surface/binding;
  3. verify selectable/scene-addressable entity adapters and canonical selection;
  4. verify each lock-policy operation and viewport invariance signal;
  5. verify feature access rejects stale or falsely bound definitions;
  6. run audit, build, full unit, and E2E quality gates;
  7. publish a report-only final decision and residual non-blocking debt list.
- Forbidden: production fixes, test changes, scope expansion, UI redesign inside the audit branch.
- Acceptance: every exit-gate item has exact source, symbol, test, and runtime evidence; no unresolved Phase 0 blocker remains.
- Dependency order: 7, after Package 6.
- Risk: low implementation risk; high governance importance.

## 10. Phase 0 Exit Gate

Phase 0 may close only when all of the following are true:

- [ ] Every `required-runtime` command has a live, non-no-op runtime binding.
- [ ] `declared-planned` command definitions may remain unbound only when explicitly classified and not reported as live.
- [ ] Quality signals remain trustworthy quality gates and are not required to behave like user commands.
- [ ] Toolbar, shortcut, menu/panel actions for the same behavior execute through one command path.
- [ ] Mutating commands prove one undo transaction per user action.
- [ ] Every `required-runtime` panel has a live runtime surface.
- [ ] `declared-planned` panel definitions may remain unbound only when explicitly classified; modal/tool surfaces remain reachable and regression-tested without being forced into persistent panel bindings.
- [ ] Right-panel resize/collapse emits preserve-only viewport intent and passes camera/selection/transform invariance tests.
- [ ] Every selectable or scene-addressable domain object has a stable legacy `PlatformEntity` adapter; Layer remains visibility/lock/ownership context unless the contract changes.
- [ ] Runtime selection uses one ordered selection read model with explicit primary selection.
- [ ] Lock behavior is tested per operation policy: move, drag, nudge, align, distribute, equal gap, and duplicate are all-or-nothing; delete may use documented and tested eligible-unlocked behavior.
- [ ] Feature access readiness checks live command/panel bindings, rejects stale or falsely bound runtime access, and does not confuse planned or quality-signal definitions with live user access.
- [ ] `object.duplicate` and all other active features match their actual surfaces and regression requirement.
- [ ] Contract/audit failure tests remain green.
- [ ] No-red-console E2E remains green in a clean browser context.
- [ ] `npm.cmd audit`, build, unit tests, and E2E pass.
- [ ] Relevant platform decisions are recorded in maintained documentation/ADRs.

### Validation result for this audit

| Command | Result |
| --- | --- |
| `npm.cmd audit` | PASS - 0 vulnerabilities |
| `npm.cmd run build` | PASS - TypeScript build and Vite production build completed; Vite emitted only the existing large-chunk advisory |
| `npm.cmd run test -- --run` | PASS - 74 test files, 615 tests |
| `npm.cmd run test:e2e` | PASS - 12 Chromium tests, including no-red-console assertions |

## 11. Phase 1 Entry Baseline

Phase 1 should begin only after the exit gate above is satisfied. The safe baseline is:

1. required-runtime command IDs are executable runtime authorities, while planned definitions and quality signals retain explicit non-runtime classifications;
2. required-runtime panels are discoverable through the Panel Registry without forcing planned or modal/tool definitions into persistent panel slots;
3. selectable and scene-addressable domain objects are reachable through stable legacy entity adapters, with Layer retained as visibility/lock/ownership context;
4. one canonical ordered selection read model is shared by scene, explorer, inspector, and commands;
5. lock behavior is proven for each all-or-nothing operation and for the separately documented delete policy;
6. viewport resize/collapse is proven state-preserving;
7. feature access readiness fails on unbound, stale, or falsely bound required runtime surfaces;
8. current AppShell zone anchors, Babylon helper boundaries, history behavior, and no-red-console E2E remain protected;
9. numeric input migration, `App.tsx` size, professional UI redesign, output products, simulation/digital twin work, and deeper geometry/GLB tests remain planned debt rather than hidden blockers.

Only from that baseline should AtrVisu proceed with larger shell redesign, command menus, generalized inspectors, advanced alignment/snap UX, or broader platform extraction.
