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
- The Application Bar owns visible Save Project and File retains the same
  command route; the Engineering Command Strip does not duplicate Save.
- The strip is grouped as History, Selection, Display, Precision, and Arrange,
  with accessible icon-plus-concise-label desktop controls, compact group
  captions, shared group chrome, and token-governed separators.
- History remains immediately reachable at 640 px; Selection, Display,
  Precision, and Arrange move into one deterministic More surface without
  duplicate command instances or document-level horizontal overflow.
- Compact roving focus covers only visible History commands. More remains a
  native keyboard-reachable disclosure; enabled overflow commands enter tab
  order only while open, and Escape restores focus to More.
- Serializable command metadata carries `iconId`; the presentation-only icon
  registry resolves Lucide components.
- Save/Undo/Redo/Rename/Duplicate/Delete/Labels/Measurement Helpers/Connection
  Points/Viewpoints/Selection Tools remain reachable through registered
  command surfaces.
- Measurement wording describes the real precision-placement helper and does
  not claim scene dimension graphics.
- Measurement Helpers is disabled without exactly one supported machine and
  exposes the reason `Select one machine to use Measurement Helpers.`. Enabling
  it expands the existing Placement Settings contribution and disabling it
  hides the helpers through the same PlacementSettings authority.

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
Tools in the Bottom Dock. Arrange and the View panel hierarchy toggle the same
panel authority. A second activation collapses the active contribution; switching
with Viewpoints preserves truthful pressed state and the explicit dock height.
The panel does not auto-open on selection. Fewer than two alignable objects show
one compact context state. Two or more expose common alignment; distribution is
disabled with a reason below three objects; pair alignment and gap/anchor controls
are collapsed under Advanced. Connection Point Snap is rendered only for an
eligible exact-two-machine context and is absent for mixed, one, or three-plus
selection. Keyboard Nudge settings moved to Precision Placement / Measurement
Helpers using the same `NudgeSettings` state and unchanged keyboard behavior.

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

Precision measurement selectors/readouts, Connection Point Snap roles,
assembly members, annotation attachment targets, collision footprints, and
delete confirmation now use that same placed-instance helper. The bounded
source audit preserves direct definition-name reads only where canonical
Library/BOM/definition identity or non-customer diagnostics require them.

## Startup, Recovery, And Help

The empty Editor Host keeps its Babylon canvas mounted and overlays exactly one
startup decision surface only until the session accepts a working layout.
Recovery availability remains a separate persisted fact and cannot keep Start
mounted after successful create, revision load, or resume. Without recovery the
surface offers New Layout and Open Project. With valid recovery it offers Resume,
Open Project, New Layout, and a separated Discard recovery action. Resume uses
the existing restore command; create/open retain Project Manager entry intents;
discard removes only recovery. Cancelling Project Manager without loading keeps
Start available.

Help is one registered modal panel with Quick Start, Workbench, Arrange & Snap,
Measurements, Viewpoints, Outputs, Keyboard Shortcuts, and About. It uses task
cards, semantic keycaps, real product behavior, the shared application version,
dialog semantics, focus trap, Escape close, and opener focus restoration. No
development or governance terminology is exposed. The permanent delivery rule
remains in product documentation only.

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

## PF-1B Evidence

Manual review `4991067599` identified the final bounded shell and semantic
corrections. The implementation separates startup decision state from persisted
recovery, removes duplicate Save from the frequent strip, uses concise desktop
labels and shared group chrome, makes Selection Tools a canonical toggle with
progressive content, relocates Nudge settings to Measurement Helpers, and turns
Help into a customer-facing eight-section product center. All changes reuse the
accepted Project, Panel, Command, Selection, History, UI Preference, EditorHost,
and scene lifecycle authorities.

## PF-1C Evidence

Independent exact-head review `4992891484` identified the final semantic and
keyboard consistency gaps. The correction routes every confirmed
project-facing placed-machine surface through the existing display-name
authority, makes Measurement Helpers a truthful selected-machine contextual
command, progressively discloses Connection Point Snap only for eligible
exact-two-machine selection, removes customer-facing version terminology, and
keeps compact keyboard focus out of closed overflow content. It introduces no
new naming, measurement, selection, panel, command, or scene authority.

Follow-up review `4993793573` identified a legacy persistence path that could
restore Measurement Helpers as visible before its contextual command was used.
Placement-setting load now preserves grid and rotation preferences while
forcing helper visibility off for every new session, and rewrites legacy
stored `true` values to `false`. Saving placement preferences likewise stores
the transient visibility field as false. Explicit command activation remains
the only way to reveal helpers during the current session.

## Validation Evidence

- Focused PF-1C component regressions: PASS, 8 files / 62 tests, covering
  placed-instance naming, contextual measurement defaults, exact-two
  connection disclosure, collision presentation, and compact command focus.
- Focused PF-1C Chromium regressions: PASS, including Measurement Helpers
  enable/open/toggle/lifecycle behavior, two-versus-three-machine connection
  disclosure, delete confirmation naming, 640 px keyboard overflow, runtime
  feature observation, and live command-surface execution.
- Focused legacy visibility migration regressions: PASS, 2 files / 20 unit
  tests plus Chromium coverage for preserved 250 mm grid and 30 degree rotation
  preferences, initial inactive state, explicit activation, and reload reset.
- `npm audit --audit-level=low`: PASS, 0 vulnerabilities.
- `npm ls --all`: PASS; platform-specific and toolchain optional dependencies
  remain reported as optional.
- Design-token governance: PASS, 251 maintained files.
- Production build: PASS, 4,123 modules transformed.
- Full unit suite: PASS, 149 files / 1,243 tests.
- Full Chromium suite: PASS, 72 tests.
- `git diff --check`: PASS.
- Exact-head GitHub Quality Gate: required before manual re-acceptance.

The existing Vite large-chunk warning remains visible and non-blocking: the PDF
serializer is approximately 2.66 MB and the main bundle approximately 5.53 MB
before gzip. PF-1C does not perform unrelated bundle splitting.

Decision: **READY FOR FINAL MANUAL VISUAL ACCEPTANCE AFTER GREEN EXACT-HEAD CI.**

This decision does not mean `PHASE 1 CLOSED`.
