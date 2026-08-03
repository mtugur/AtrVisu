# Phase 1 P1-B Workbench Runtime Foundation Audit

## 1. Exact Baseline

- Repository: `mtugur/AtrVisu`
- Branch: `feat/phase-1-workbench-runtime-foundation-v01`
- Base SHA: `2eae4ae01019a0bf7c555834e6917238ce8791b7`
- Authority: merged PR #99, P1-A architecture freeze
- Opening worktree: clean

PR #99 remains authoritative. The feature branch was created directly from the
current local and remote `main` at the exact base SHA after merge ancestry and
the absence of conflicting open Phase 1 work were verified.

## 2. Scope

P1-B adds the smallest runtime path needed to host the existing 3D layout
editor behind the Phase 1 contracts. It adds no editor chooser, new product
surface, workspace state, persistence, theme, command surface, or redesign.

## 3. Implemented Runtime Path

The production composition is:

`App -> WorkbenchShell -> EditorHost -> layout.3d runtime binding -> BabylonScene`

Only `layout.3d` is registered. Its active ID is explicit and is not user state.
The runtime binding owns React rendering while its Editor Definition remains
serializable metadata.

## 4. Changed Files

- `src/App.tsx`
- `src/components/AppShell.tsx`
- `src/components/EditorHost.tsx`
- `src/components/EditorHost.test.ts`
- `src/components/WorkbenchShell.tsx`
- `src/components/WorkbenchShell.test.ts`
- `src/platform/editorDefinitionRegistry.ts`
- `src/platform/editorDefinitionRegistry.test.ts`
- `src/workbench/editorRuntimeRegistry.tsx`
- `src/workbench/editorRuntimeRegistry.test.ts`
- `src/workbench/layout3dEditorDefinition.ts`
- `src/workbench/workbenchArchitecture.test.ts`
- `e2e/app-smoke.spec.ts`
- `docs/checklists/P1_B_WORKBENCH_RUNTIME_GATE.md`
- `docs/audits/phase-1-p1-b-workbench-runtime-foundation.md`

No package, lockfile, configuration, workflow, CSS, storage, schema, public
library, command ID, panel ID, or Feature Access classification changed.

## 5. Registry Behavior

The Editor Definition Registry validates with the P1-A validator, preserves
input order, rejects duplicate or invalid definitions, returns immutable
snapshots, and provides deterministic lookup with stable error codes.

The Runtime Editor Registry is a separate React-aware layer. It rejects unknown
or duplicate bindings and requires a binding for every available definition.
Unavailable and disabled definitions may remain unbound. Registry construction
never invokes render callbacks and creates no global mutable singleton.

## 6. EditorHost Behavior

EditorHost resolves the active definition and matching runtime binding and
renders only that binding. Unknown, unavailable, disabled, and missing-binding
states produce a small accessible `role="alert"` fallback without console
errors or unrelated binding execution.

The measurable host boundary fills the existing scene viewport so the current
Babylon parent-size contract remains valid. Component tests prove that a new
runtime binding object with the same active editor and rendered element type
does not remount the editor child.

## 7. WorkbenchShell and AppShell Relationship

WorkbenchShell exposes all nine accepted logical region slots. Only
`editorHost` is required; absent regions produce no placeholder or visible UI.
It does not import or reference BabylonScene.

WorkbenchShell is now the application composition boundary. AppShell remains
its internal compatibility adapter and retains the existing shell class,
viewport host, right inset normalization, machine-properties path, modal path,
diagnostics path, children behavior, DOM order, and AppShell zone anchors.
Non-invasive workbench region attributes reuse existing roots where practical.

## 8. App.tsx Migration Boundary

App no longer imports or instantiates AppShell. It creates the immutable
definition registry deterministically, supplies one `layout.3d` runtime binding,
passes EditorHost to WorkbenchShell, maps the current right panel to
`secondaryDock`, and maps existing modals to `overlayLayer`.

The BabylonScene ref, props, callbacks, and application business logic remain
in App and are functionally unchanged. The existing right-panel JSX remains in
App. No unrelated state or effect was moved.

## 9. Viewport Lifecycle Evidence

Unit/component lifecycle tests prove:

- same active editor plus a replaced binding object does not remount its child;
- changing secondary dock content or inset does not remount the editor;
- right inset normalization still delegates to AppShell.

The real Chromium scenario proves exactly one EditorHost and one canvas, then
retains `viewport.main` and the same scene lifecycle generation through right
panel collapse, reopen, width drag, machine selection, annotation creation, and
accepted pointer drag. Console-error and page-error collection remain active.
All existing perspective, orthographic, resize, modal, selection, and scene
interaction E2E scenarios also pass.

## 10. Preserved Phase 0 Authorities

P1-B adds no second command, panel, entity, selection, viewport, Feature Access,
history, dirty-state, or persistence authority. WorkbenchShell and EditorHost
contain no ResizeObserver, storage access, or runtime authority bridge. Existing
Runtime Viewport resize ownership and diagnostics remain unchanged.

Project/layout/revision storage, autosave, selection precedence, atomic lock
safety, history transactions, manager dirty guards, camera behavior, and all
existing visible routes remain under their Phase 0 owners.

## 11. Validation Evidence

- Focused new tests: passed, 5 files / 26 tests
- Focused E2E lifecycle and diagnostics: passed, 2 tests
- `npm.cmd audit`: passed, 0 vulnerabilities
- `npm.cmd run build`: passed, 2,093 modules transformed
- `npm.cmd run test -- --run`: passed, 103 files / 989 tests
- `npm.cmd run test:e2e`: passed, 34 Chromium tests
- `git diff --check`: passed before documentation commit and required again at handoff
- Browser console/page errors: none in maintained E2E assertions

The existing Vite warning for a generated chunk larger than 500 kB remains
non-blocking and unchanged in nature. The E2E runner owned its temporary Vite
process; port 5173 is checked again before handoff.

## 12. Explicit Non-Goals

This package does not implement application/menu/command/status bars, docks,
new Inspector UI, workspace switching or persistence, themes or tokens, command
palette, editor tabs, multiple editors, split panes, panel drag/drop, schema
Inspector, BOM/PDF/Excel output, presentation mode, or new product features.

It does not reduce App.tsx by moving business logic and does not address bundle
size or NumericInput debt.

## 13. Residual Risk

- The measurable EditorHost boundary intentionally preserves BabylonScene's
  current parent-size assumption; a later viewport-host refactor must retain or
  explicitly replace that contract.
- Runtime registry objects may be reconstructed by App renders, while React
  child identity is protected by stable editor ID, element type, component
  tests, and real lifecycle E2E evidence.
- Only one editor is supported. Editor switching and editor history remain
  deliberately absent.
- Browser evidence is Chromium smoke coverage, not full visual regression or
  every graphics driver.

These are non-blocking for this narrow foundation.

## 14. Decision

**READY FOR REVIEW**

All mandatory P1-B gates are proven. The intended visible delta is zero: no CSS
or visible control was added, the real application shell and modal flows pass,
and viewport/editor identity remains stable. Manual acceptance is not required
unless independent review detects an unintended visual delta.
