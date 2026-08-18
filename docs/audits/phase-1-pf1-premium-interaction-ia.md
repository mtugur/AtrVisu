# Phase 1 PF-1 Premium Interaction And Information Architecture Audit

Date: 2026-08-18

Branch: `feat/phase-1-premium-interaction-ia-v01`

Baseline: `8e6cbca9d23a0478fb1a2813df56441504d339cb`

## Decision

PF-1 extends the existing platform authorities into one coherent engineering
interaction model. It adds no competing selection, entity, history, project,
panel, viewport, or scene lifecycle authority. Phase 1 remains open for PF-2,
PF-3, and PF-Exit.

## Canonical Surfaces

- Menu order is exactly File, Edit, View, Insert, Arrange, Tools, Help.
- The command bar is icon-only at desktop and medium widths while its visible
  text remains available to assistive technology.
- Serializable command metadata carries `iconId`; the presentation-only icon
  registry resolves Lucide components.
- Save/Undo/Redo/Duplicate/Delete/Labels/Measurement Helpers/Connection
  Points/Viewpoints remain directly reachable.
- Measurement wording describes the real precision-placement helper and does
  not claim scene dimension graphics.

## Arrange

Align Left/Right/Front/Back/Center X/Center Y, horizontal/vertical distribution,
Equal Gap X/Y, Group, Ungroup, and Alignment Tools are registered commands.
The Arrange binding factory delegates to the existing alignment helpers,
Assembly Runtime bridge, and Runtime Panel bridge. It applies two-entity and
three-entity thresholds and rejects the complete selected set when atomic lock
evaluation fails. Existing mutation callbacks retain their one-snapshot
history/dirty behavior.

## Rename

F2 and Edit > Rename select inline Explorer editing. Enter commits, Escape
cancels, and blur cancels. The runtime command rejects locked, missing, blank,
unsupported, or non-current targets. Successful rename records one layout
snapshot and uses the optional machine instance `displayName` or existing civil
and group names.

Machine definition identity remains immutable. Layout JSON round-trip,
PlatformEntity projection, scene label text, Inspector identity, and commercial
instance name use the same fallback helper. BOM grouping and name remain
canonical.

## First Run And Help

The empty Editor Host keeps its Babylon canvas mounted and overlays a restrained
welcome only while project storage is ready and the scene has no active layout
or entity. Both actions open the existing Project Manager authority. Help is a
registered modal panel with Quick Start, actual keyboard shortcuts, shared
application version, dialog semantics, focus trap, Escape close, and opener
focus restoration.

## Lifecycle And Domain Invariance

Menu, icon, tooltip, Help, welcome, and responsive operations leave camera,
selection, transforms, history, dirty state, workspace, and viewpoints
unchanged. Chromium verifies one EditorHost, one Babylon canvas, and stable
scene lifecycle generation through Help and 1440x900, 1024x768, and 640x800
resizing.

## Release Surface Hygiene Inventory For PF-2

- Performance Benchmark remains a visible engineering diagnostic launcher and
  requires a later release-role decision.
- Simulation Controls remains an existing technical surface; it is not evidence
  of finished Phase 2 simulation UX.
- Library Manager and Taxonomy Manager remain separate manager tools; PF-2 owns
  their relationship to the premium Asset Browser.
- E2E runtime bridges remain query-guarded by `?e2eDiagnostics=1`; PF-1 adds no
  normal-URL diagnostics control or fixture.

## Dependency Evidence

`lucide-react@1.31.0` is the only icon dependency. It is ISC licensed,
dependency-free at runtime apart from its React peer, has no native executable
or install script, and is lockfile-pinned. No unrelated package was upgraded.

## Validation Evidence

- Focused unit/component/platform tests: PASS, 23 files / 192 tests.
- Focused Chromium PF-1 scenarios: PASS, 3 tests.
- Focused Runtime Feature Access complete gate: PASS, 1 test.
- `npm audit --audit-level=low`: PASS, 0 vulnerabilities.
- `npm ls --all`: PASS; platform-specific and toolchain optional dependencies
  remain reported as optional.
- Design-token governance: PASS, 248 maintained files.
- Production build: PASS, 4,120 modules transformed.
- Full unit suite: PASS, 142 files / 1,224 tests.
- Full Chromium suite: PASS, 67 tests.
- `git diff --check`: PASS.
- Existing Vite large-chunk warning remains non-blocking: the generated PDF
  serializer is approximately 2.66 MB and the main bundle approximately 5.52
  MB before gzip. PF-1 records the warning without unrelated code splitting.

Decision: **READY FOR BOUNDED MANUAL ACCEPTANCE AFTER GREEN EXACT-HEAD CI.**

This decision does not mean `PHASE 1 CLOSED`.
