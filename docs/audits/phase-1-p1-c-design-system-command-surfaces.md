# Phase 1 P1-C Design System And Command Surfaces Audit

## 1. Exact Baseline

- Repository: `mtugur/AtrVisu`
- Base: `main`
- Exact base SHA: `f9f15175718c07541eefd979d15cfe5ce342ea06`
- Branch: `feat/phase-1-design-system-command-surfaces-v01`
- P1-A and P1-B remain authoritative.
- PR #102 and ADR-004 remain the project-command authority.
- Preflight worktree, ancestry, former-branch, audit, and conflicting-work
  checks passed before branch creation.

## 2. Scope

This package adds semantic tokens, dark/light/system theme infrastructure, a
technical rendering palette, raw-color governance, and visible registry-backed
Application, Menu, and Command Bars. It adds no workspace persistence, theme
selector, command palette, editor, project schema, or storage migration.

## 3. Prerequisite Authority

Project save, export, import, and restore remain owned by the existing App
Runtime Feature Command Bridge. Project Manager remains a presentation client.
The persistent import request-token lifecycle from PR #102 is reused unchanged
as the canonical file-acquisition owner.

## 4. Design-System Architecture

`DesignSystemRoot` is a presentational boundary with explicit `themeId`,
`densityId`, and children. It fills the root, sets stable data attributes, and
contains no project, storage, command, panel, selection, or Babylon authority.
`main.tsx` selects dark and comfortable without persistence.

## 5. Token-Family Coverage

The `--av-` token set covers all accepted P1-A families: surface, elevation,
text, border, interaction, focus, selection, spacing, typography, control size,
density, icon size, semantic status, viewport overlay, technical palette, and
z-index. Component CSS consumes responsibility names instead of literal color
names. The exact contract now asserts required surface, text, border,
interaction, focus, selection, spacing, typography, control, density, icon,
status, viewport-overlay, and z-index names. The canonical normal weight is
`--av-font-weight-normal: 400`; the existing regular alias remains compatible.

## 6. Theme Behavior

Dark preserves AtrVisu's restrained green-accent baseline. Light defines a
complete readable palette. System uses CSS `prefers-color-scheme` light and
dark paths without `matchMedia`. Forced-colors focus behavior is retained.
Theme selectors also project the same semantic variables to `:root`, so
body-level modal portals inherit the governed palette. Dark and light Chromium
assertions prove the modal scrim and readable content colors. There is no
visible theme/density control and no persisted preference.

## 7. Technical-Palette Migration

Collision, warning, primary/secondary selection, connection point, clearance,
measurement, annotation, neutral frame, selected collision, axes, diagnostics,
civil, layer, library, and benchmark meanings are centralized. Generic value
records, every RGB/RGBA tuple, and every nested annotation style are frozen at
runtime. Mutation attempts fail without changing governed values. Babylon
factories return independent `Color3`/`Color4` instances, and mutating one
instance cannot affect another or the palette. Current numeric meanings are
retained.

## 8. Raw-Color Governance

`check-design-tokens.mjs` scans maintained production CSS, TS, and TSX. It
rejects raw hex/rgb/hsl and direct Babylon constructors outside three exact,
reasoned authorities. Match types are explicit, stale allowances fail, broad
paths fail, and scanner fixtures cover both direct and `BABYLON.`-qualified
constructors/`FromHexString` calls outside production scan roots. CI runs the
gate between dependency audit and build.

## 9. Application Bar

The named Application landmark shows AtrVisu identity, real Saved/Unsaved
state, read-only active project/layout/revision context, and the canonical Save
command. Save now sits beside Saved/Unsaved inside one project-session group,
with active project context immediately adjacent instead of leaving the action
detached at the far edge. Disabled and pending states come from the adapter;
there is still exactly one `project.save` control and no local mutation path.

## 10. Menu Bar

Only File, Edit, View, and Tools render, with the exact accepted commands.
Each menu has a stable localization key and English fallback. Command labels,
shortcuts, descriptions, enablement, and disabled reasons still come from
authoritative metadata/live bindings. The ARIA model now uses menubar,
top-level menuitems, stable trigger/popup IDs, labelled menus, and
menuitemcheckbox for projected toggles. Contextually disabled menu commands use
focusable `aria-disabled`, expose their reason, traverse with every menu item,
and guard click/Enter/Space activation. An all-disabled Edit menu opens on its
first item and preserves switching, Tab, and Escape behavior. Menu rows now
have explicit label and shortcut regions, a bounded 360px popup width, and
content-driven minimum height so the complete Redo shortcut remains readable
without colliding with its command label.

## 11. Command Bar

The command toolbar uses the accepted eight-command order, one-row horizontal
overflow, roving focus, disabled skipping, semantic pressed state, and adapter
execution. Arrow/Home/End handling stops before the editor shortcut layer.
Roving focus retains a still-enabled command, chooses the next nearest enabled
command when disabled, chooses the first enabled command after removal, exposes
no tab stop when all commands are disabled, and restores keyboard entry when an
enabled command returns. Execution does not move focus. It adds no icons or
local mutation callbacks.

## 12. Project-Import Acquisition Path

File-menu import requests the one App-owned persistent input. Cancellation
executes no runtime command. Pending acquisition blocks duplicate pickers. A
selected file reaches `project.importJson` with its canonical payload. Import
does not replace the scene or alter active project/layout/revision context,
selection, history, dirty state, viewport identity, or canvas count.

## 13. Command Execution Path

Command Registry definitions remain metadata authority. Core and runtime
bridges remain execution owners. The presentation adapter resolves live
context and routes exactly one call. Unknown, unbound, unreachable, unsupported,
and duplicate-pending requests have stable controlled results. Seed no-op
execution is impossible through the adapter.

## 14. Accessibility Behavior

Bars use semantic landmarks and labels. Toolbar controls remain native disabled
buttons; menu commands remain focusable `aria-disabled` menuitems with explicit
activation guards. Toggle menu state uses `aria-checked`; toolbar toggle state
continues to use `aria-pressed`. Disabled reasons, pending state, strong focus
styling, roving tabindex, directional/Home/End traversal, and predictable focus
restoration are covered. State is not communicated by color alone.

## 15. Workbench Geometry

WorkbenchShell slots own all three chrome rows. One tokenized top inset combines
36px Application, 32px Menu, and 44px Command rows. WorkbenchShell supplies one
canonical `--av-shell-top-inset`; desktop CSS applies it to viewport and right
panel without inline panel top/height. The <=720px rule restores the right panel
as a bottom sheet with `top: auto`, `bottom: 0`, and `min(44vh, 360px)` height.
E2E proves non-overlap, positive dimensions, no horizontal body overflow at
1280x720 and 1024x768, and correct bottom-panel geometry/collapse/reopen with a
stable EditorHost, canvas, and scene generation at 640x800. Menu popovers use
the governed popover layer and do not sit beneath the Command Bar. The right
panel utility strip now reserves separate title and action rows; Undo, Redo,
and Collapse remain distinct existing controls with no overlap or clipping.

## 16. Preserved Phase 0/P1-B Authorities

Runtime Selection, entity adapters, atomic lock behavior, panels, viewport,
EditorRuntime, history, project persistence, IndexedDB schemas, keyboard
priority, Babylon scene lifecycle, and existing modal/inspector surfaces remain
authoritative. No second command, selection, viewport, panel, editor, import,
or storage owner was added.

## 17. Surface Inventory And Feature Access

Inventory now includes `surface.workbenchApplicationBar`,
`surface.workbenchMenuBar`, and `surface.workbenchCommandBar`, with source,
command, feature, ownership, and import-provider notes. Existing surfaces remain
present. Feature Access live-command and observed-surface gates pass in the
Chromium suite.

## 18. Changed Files

The bounded change covers:

- design-system root, token/theme authorities, technical palette, and tests;
- command-surface adapter/configuration, three workbench components, and tests;
- minimal App/WorkbenchShell/AppShell integration and semantic CSS migration;
- technical-color call-site migration and surface inventory metadata;
- dependency-free scanner, fixtures, workflow, and quality-gate documentation;
- this ADR/checklist/audit evidence and focused E2E updates.

`package-lock.json` is unchanged and no npm dependency was added.

## 19. Validation Evidence

- Independent review identified and this package corrects menubar semantics,
  all-disabled discovery, toolbar isolation/reconciliation, palette depth,
  scrim inheritance, exact token names, mobile geometry, and scanner namespace
  coverage.
- Previous focused review set: 9 files, 63 tests passed, including the two
  focused project-import authority files.
- Visual-correction component set: 1 file, 12 tests passed.
- Visual-correction focused Chromium regression: 1 test passed.
- `npm.cmd ci`: passed, 101 packages installed from lockfile.
- `npm.cmd audit`: passed, 0 vulnerabilities.
- `npm.cmd audit --audit-level=low`: passed, 0 vulnerabilities.
- Design-token scanner: passed, 190 maintained files.
- Build: passed; existing large-chunk warning remains non-blocking.
- Full unit: 111 files, 1058 tests passed.
- E2E: 43 Chromium tests passed with no console/page errors.
- Correction code head: `e45c9efefeab430e1ed6b09ca8bddf51a3f4d6e4`.
- Quality Gate run `30984288422`: passed.
- GitHub Dependency security audit: passed.
- GitHub Design token governance: passed.
- GitHub Build: passed.
- GitHub Unit tests: 111 files, 1056 tests passed.
- GitHub Chromium E2E: 42 of 42 tests passed.
- Independent code review: code corrections accepted; the only identified
  follow-up was this committed documentation-state correction.
- `package-lock.json`: unchanged.
- New dependencies: none.
- Initial manual visual acceptance: failed because the Edit/Redo shortcut,
  right-panel title/actions, and Application Bar Save placement were not
  production-ready.
- Visual corrections: implemented and covered by deterministic component and
  Chromium geometry/lifecycle regressions.
- Visual-correction exact head:
  `ab330bb5263487490dfad9c3bc651e1e037f97e2`.
- Visual-correction Quality Gate run `31013964812`: passed.
- GitHub Dependency security audit: passed.
- GitHub Design token governance: passed.
- GitHub Build: passed.
- GitHub Unit tests: 111 files, 1058 tests passed.
- GitHub Chromium E2E: 43 of 43 tests passed.
- Independent review: visual corrections accepted; no code-level blocker
  remains.
- `package-lock.json`: unchanged for the visual-correction range.
- New dependencies in the visual-correction range: none.
- Manual visual re-acceptance: required and pending.

## 20. Manual Visual Acceptance Status

**REQUIRED AND PENDING RE-ACCEPTANCE.** The initial manual round failed on the
three chrome-layout findings recorded in section 19. Automated evidence and
independent review now cover those corrections but do not claim visual
acceptance. A reviewer must repeat the compact industrial workbench inspection
before merge.

## 21. Explicit Non-Goals

No visible theme/density selector, preference persistence, workspace runtime,
command palette, dock redesign, editor tabs, Inspector redesign, schema-driven
properties, BOM/PDF/Excel output, presentation mode, Line-Flow, Layout Explorer,
asset workflow, project schema, cloud, authentication, analytics, or new scene
tool is included.

## 22. Residual Risks

- The corrected Edit menu, right-panel utility strip, and Save placement still
  need human re-acceptance.
- Dark, light, and system visual quality still needs human acceptance.
- System theme infrastructure is not user-selectable until P1-D owns UI
  preferences.
- The existing Vite large-chunk warning remains outside this package.
- The command-surface adapter intentionally renders only configured commands;
  future placements require explicit governance and tests.

## 23. Decision

**READY FOR MANUAL RE-ACCEPTANCE.** The bounded visual corrections, automatic
gates, and independent review pass. Manual visual re-acceptance is the only
remaining blocker. PR #103 remains Draft, P1-C is not complete, and merge is
prohibited until manual visual re-acceptance passes.
