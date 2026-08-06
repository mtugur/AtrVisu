# Phase 1 P1-D1 UI Preferences Runtime Foundation Audit

## 1. Exact Baseline

- Repository: `mtugur/AtrVisu`
- Base branch: `main`
- Exact base SHA: `ea4a06586f5aa77063fa92d87d8b5c7f22535765`
- Branch: `feat/phase-1-ui-preferences-runtime-foundation-v01`
- Independent review comment: `5203394076`
- Original reviewed head: `6dec96bfe1da9ba020b14c1d669bcbdb69c4650d`
- P1-A, P1-B, P1-C, and PR #102 remain authoritative.

## 2. Scope

P1-D1 adds versioned UI-preference persistence, migration, normalization, one
runtime store, one provider, design-system binding, and existing compatibility
panel integration. It introduces no visible control or workspace application.

## 3. Existing Authorities

Command, Panel, Runtime Selection, entity, history, viewport, editor runtime,
design token, and project-storage authorities remain unchanged. Preference
runtime owns presentation values only and delegates panel operations through
the existing Runtime Panel Registry bridge.

## 4. IndexedDB Version-2 Migration

`ATRVISU_DB_VERSION` is 2. Fresh installation creates `projects` and
`uiPreferences`; version-1 upgrade creates only the missing preference store;
version-2 reopen is idempotent. A rejected production opener clears only its
own cached attempt; a second call in the same application lifecycle completes
the upgrade and subsequent calls reuse the live connection.

## 5. Projects-Store Preservation

The `projects` key path and `updatedAt`, `customerName`, and `projectName`
indexes are unchanged. A real version-1 record survives upgrade by deep
equality, proving no project rewrite. Project JSON and import/export schemas
were not modified.

## 6. Preference-Record Model

The separate `uiPreferences` store has no index or key path. One
`WorkbenchUiPreferences` record uses the out-of-line key `workbench`; no
persistence-only ID enters the platform contract.

## 7. Defaults

The fresh factory returns schema 1, dark, comfortable, no active workspace,
and the current right-panel shell plus 16 live sections in displayed order.
Width is 360, all sections are visible, and expansion defaults match the
pre-P1-D1 shell.

## 8. Normalization And Validation

Reads use `validateWorkbenchUiPreferences`. Normalization rejects domain data,
removes malformed, duplicate, unknown, modal, and non-compatibility panels,
restores required defaults, clamps width to 280-600, and emits unique
non-negative order values with supported docks only.

## 9. Legacy Migration

IndexedDB wins when valid or future-version. An absent record translates both
shell keys and all 16 maintained section keys, including assembly/groups,
project/status, performance launcher, overlay controls, and Inspector aliases.
Initialization prepares the migration without writing independently. The
runtime persistence authority writes the migrated base and any updates accepted
during hydration in order; only consumed keys are removed after a successful
ordered write.

## 10. Future-Version Policy

A schema version above 1 is not normalized, downgraded, or overwritten.
Runtime uses safe defaults with `future-readonly`, exposes a stable warning,
rejects later persistent updates, and resolves updates accepted while loading
as not persisted without touching the future record.

## 11. Corruption And Degraded-Mode Policy

Invalid current-version data remains stored untouched while defaults run in
memory unless an explicit update is accepted during hydration. Such an update
is replayed over safe defaults and persisted as the user's replacement.
Storage/read/write failures produce degraded status and `console.warn`, retain
the complete latest memory, and permit a later update to retry without red
console output.

## 12. Runtime Store

The framework-independent external store owns an immutable snapshot, hydration
status, warning, and monotonic revision. Concurrent hydration shares one
promise. Updates accepted while loading commit immediately to memory and are
replayed in their original order over the hydrated base. Unchanged hydrated
fields survive, last accepted changes win, and hydration/migration plus runtime
writes use one ordered queue. Deferred valid, absent, legacy, corrupt, failure,
retry, and future-version tests close the races identified by independent
review comment `5203394076`.

## 13. React Provider

One provider instance owns one store and subscribes with
`useSyncExternalStore`. Hydration begins after mount. The context exposes only
the bounded store and contains no domain, project, selection, history,
viewport, command, or Babylon authority.

## 14. Design-System Integration

`UiPreferencesProvider` wraps a preference-bound design-system boundary in
`main.tsx`. Dark/comfortable renders synchronously; persisted theme/density
hydrates in place. `DesignSystemRoot` remains a single instance.

## 15. Panel Preference Integration

App derives shell width/collapse and section visibility/expansion from the
runtime snapshot. It no longer reads or writes migrated localStorage keys.
Controlled `PanelSection` accepts no storage key and performs no legacy access.

## 16. Runtime-Panel Bridge Behavior

Section open makes it visible and expanded; close collapses without hiding;
toggle opens hidden/collapsed values or closes an open section. Shell close
still runs manager guards first. Resize writes clamped width. Modal state is
not persisted.

## 17. Domain And Runtime Invariance

Chromium captures Runtime Viewport invariants and camera state before panel
preference changes. Selection, transforms, groups, layers, history, dirty
state, active IDs, simulation state, and camera are unchanged. Scene lifecycle
generation remains stable; only expected viewport geometry/resize may change.

## 18. Storage Tests

The focused storage and migration set proves installation, indexes, v1 record
preservation, rejected production-opener retry without module reset,
same-connection reuse, absence, save/reload/delete, clone safety, invalid
values, domain rejection, future/corrupt preservation, every legacy mapping,
ordered cleanup, idempotence, precedence, and failed-write retry.

## 19. Component And Architecture Tests

Seven focused files provide 31 tests for defaults, hydration transitions,
ordered update replay, valid/absent/legacy/corrupt/future races, degraded retry,
production opener recovery, immutability, revisions, provider binding, one
design-system root, legacy-access removal, and forbidden dependency boundaries.

## 20. E2E Evidence

Six preference scenarios cover first-run defaults, full legacy persistence,
reload, theme/density hydration, identity, domain/camera/lifecycle invariance,
corrupt-storage degradation, diagnostics-only bridge exposure, and a real panel
section plus shell-collapse interaction while hydration is deliberately held.
The race scenario proves persisted theme/density/width and accepted interactions
merge into one IndexedDB record, survive reload, and do not remount App,
EditorHost, or the scene canvas. The new focused Chromium test passes 1/1; the
full suite passes 49/49 with no `console.error` or `pageerror`.

## 21. Changed Files

Changes are limited to IndexedDB schema, the bounded
`workbench/uiPreferences` area, root composition, minimal App/PanelSection
delegation, focused storage/component/E2E tests, and these three documents.
`package.json` and `package-lock.json` are unchanged.

The correction package addresses only hydration/update ordering and production
database-open retry. It adds no visible control and leaves the original P1-D1
scope intact.

## 22. Explicit Non-Goals

No workspace registry/preset/application, visible theme/density/workspace
selector, panel visibility/order/dock UI, command emphasis, Inspector redesign,
primary/bottom dock UI, editor tabs, project migration, output feature, package
change, or App decomposition is included.

## 23. Residual Risks

P1-D2 must define canonical workspace presets and visible preference controls.
The compatibility record intentionally models the current right-panel shell,
not final dock composition. The existing Vite large-chunk warning remains
non-blocking and outside this package.

## 24. Manual Visual Acceptance Classification

**NOT REQUIRED.** Defaults preserve the exact existing composition, no visible
control or text is added, and automated responsive geometry, EditorHost/canvas
identity, camera, and scene lifecycle evidence passes.

## 25. Decision

**READY FOR INDEPENDENT RE-REVIEW.** P1-D1 correction gates pass and the package
remains Draft-only pending corrected-head independent review and GitHub Quality
Gate. This does not mark P1-D1 closed, P1-D complete, or Phase 1 complete.
