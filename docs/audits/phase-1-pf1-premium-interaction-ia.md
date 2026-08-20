# Phase 1 PF-1 Premium Interaction And Information Architecture Audit

Date: 2026-08-20

Branch: `feat/phase-1-premium-interaction-ia-v01`

Baseline: `8e6cbca9d23a0478fb1a2813df56441504d339cb`

## Decision

PF-1 extends the existing platform authorities into one coherent engineering
interaction model. It adds no competing selection, entity, history, project,
panel, viewport, or scene lifecycle authority. Phase 1 remains open for PF-2,
PF-3, and PF-Exit.

## Canonical Surfaces

- Menu order is exactly File, Edit, View, Insert, Arrange, Tools, Help.
- The engineering command strip is grouped as Project, History, Selection,
  Display, Precision, and Arrange, with one accessible icon button per command,
  compact group captions, and token-governed separators.
- Save/Undo/Redo remain immediately reachable at 640 px; Selection, Display,
  Precision, and Arrange move into one deterministic More surface without
  duplicate command instances or document-level horizontal overflow.
- Serializable command metadata carries `iconId`; the presentation-only icon
  registry resolves Lucide components.
- Save/Undo/Redo/Rename/Duplicate/Delete/Labels/Measurement Helpers/Connection
  Points/Viewpoints/Selection Tools remain reachable through registered
  command surfaces.
- Measurement wording describes the real precision-placement helper and does
  not claim scene dimension graphics.

## Arrange

Align Left/Right/Front/Back/Center X/Center Y, horizontal/vertical distribution,
Equal Gap X/Y, Group, Ungroup, and Selection Tools are registered commands.
The Arrange binding factory delegates to the existing alignment helpers,
Assembly Runtime bridge, and Runtime Panel bridge. It applies two-entity and
three-entity thresholds and rejects the complete selected set when atomic lock
evaluation fails. Existing mutation callbacks retain their one-snapshot
history/dirty behavior.

## Inspector And Selection Tools

The Inspector now reports what the current selection is: identity, primary
selection, selected items, bounds, assembly context, and pair reference-point
measurement. Operational alignment, distribution, equal-gap, duplicate,
delete, clear-selection, and connection-snap stacks are absent from the active
Inspector composition.

One `panel.alignmentTools` Runtime Panel contribution is presented as Selection
Tools in the Bottom Dock. Arrange and the View panel hierarchy reach the same
panel authority. The panel does not auto-open on selection, reuses the existing
alignment and connection-point command callbacks, honors panel visibility and
collapse preferences, and blocks all movement actions when atomic movement
evaluation rejects the selection.

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

## Startup, Recovery, And Help

The empty Editor Host keeps its Babylon canvas mounted and overlays exactly one
startup decision surface. Without recovery it offers Create New Layout and Open
Existing Project. With a valid autosave it instead offers Resume Unsaved Layout,
Open Existing Project, Create New Layout, and Discard Unsaved Recovery. Resume
uses the canonical restore command; create/open retain their Project Manager
entry intents; discard removes only the recovery authority. The former competing
recovery banner is not rendered.

Help is a registered modal panel with Quick Start, actual keyboard shortcuts,
shared application version, dialog semantics, focus trap, Escape close, and
opener focus restoration. It documents startup/recovery, the grouped command
strip, Arrange, Selection Tools, the true Viewpoints toggle, and Explorer F2
rename. The permanent delivery rule requires Help updates in the same pull
request as any future visible command, workflow, or shortcut change.

## Viewpoints Toggle

`view.viewpoints` delegates to the Runtime Panel toggle operation. A collapsed
Bottom Dock opens with Viewpoints active; another active contribution switches
to Viewpoints; an active expanded Viewpoints contribution collapses; a later
activation restores the persisted explicit dock height. Toolbar pressed state
is derived from the same Bottom Dock and active-contribution state.

## Scene Label Lifecycle

The rename ghosting root cause was the Babylon `DynamicTexture.drawText`
background argument: drawing a transparent fill under normal source-over
composition does not erase prior glyph pixels. Machine label updates now clear
the existing texture before drawing the current resolved instance label, while
retaining the same plane and scene lifecycle. Machine label planes carry the
canonical machine instance identity, and diagnostics count actual Babylon label
meshes rather than Explorer or DOM text. Chromium covers rename, Undo, Redo,
Escape cancellation, labels off/on, duplicate, delete, Undo restore, and
autosave recovery with exactly one live label per instance.

## Lifecycle And Domain Invariance

Menu, icon, tooltip, Help, startup/recovery, panel toggles, Selection Tools
visibility, and responsive operations leave camera, selection, transforms,
history, dirty state, and workspace unchanged unless an explicit existing
engineering command is executed. Chromium verifies one EditorHost, one Babylon
canvas, and stable scene lifecycle generation through Help, Viewpoints toggles,
Selection Tools visibility, label rename/history, and 1440x900, 1024x768, and
640x800 resizing.

## Branch Hygiene

Canonical ancestry preflight confirmed this branch at required head was 0
behind and 3 commits ahead of `8e6cbca9d23a0478fb1a2813df56441504d339cb`.
Historical merged Phase 0/1 feature branches contain no unique commits to
recover. The one-ahead `audit/phase-1-final-exit-v01` branch is the intentional
open Draft PR #109 audit head and is excluded from PF-1. No historical merge or
cherry-pick was performed. Normal stale-branch cleanup remains post-PF-1
maintenance evidence.

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

## PF-1A Evidence

Manual findings `5353969284` and topology review `5355685005` define this
correction. Deterministic component and Chromium coverage protects integrated
startup/recovery, grouped command surfaces, property-only Inspector,
registry-backed Selection Tools, truthful Viewpoints toggling, actual Babylon
label identity/lifecycle, Help content, responsive overflow, and EditorHost /
canvas lifecycle invariance.

## Validation Evidence

- Focused PF-1A component/platform tests: PASS, 8 files / 39 tests.
- Focused PF-1A Chromium and migrated-surface regressions: PASS.
- `npm audit --audit-level=low`: PASS, 0 vulnerabilities.
- `npm ls --all`: PASS; platform-specific and toolchain optional dependencies
  remain reported as optional.
- Design-token governance: PASS, 251 maintained files.
- Production build: PASS, 4,123 modules transformed.
- Full unit suite: PASS, 145 files / 1,227 tests.
- Full Chromium suite: PASS, 68 tests.
- `git diff --check`: PASS.
- Exact-head GitHub Quality Gate: required before manual re-acceptance.

The existing Vite large-chunk warning remains visible and non-blocking: the PDF
serializer is approximately 2.66 MB and the main bundle approximately 5.52 MB
before gzip. PF-1A does not perform unrelated bundle splitting.

Decision: **READY FOR FINAL MANUAL ACCEPTANCE AFTER GREEN EXACT-HEAD CI.**

This decision does not mean `PHASE 1 CLOSED`.
