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
- The Application Bar contains context, command search, units, and saved state;
  it has no duplicate Save projection. Quick Toolbar and File route the same
  registered Save command.
- The Quick Toolbar is a flat, icon-only projection of Save, Undo, Redo,
  Duplicate, Delete, Labels, Connection Points, and Viewpoints. Permanent group
  captions, Selection Tools, and false Measure controls are absent. Fit View is
  omitted because no safe live camera-command authority exists yet.
- Save, Undo, and Redo remain immediately reachable at 640 px; the remaining
  frequent commands move into one deterministic More surface without duplicate
  command instances or document-level horizontal overflow.
- Compact roving focus covers only visible direct commands. More remains a
  native keyboard-reachable disclosure; enabled overflow commands enter tab
  order only while open, and Escape restores focus to More.
- Serializable command metadata carries `iconId`; the presentation-only icon
  registry resolves Lucide components.
- Save/Undo/Redo/Duplicate/Delete/Labels/Connection Points/Viewpoints remain
  reachable in the Quick Toolbar. Rename and all less-frequent commands remain
  reachable through registered menus and the Command Palette.
- Precision Placement wording describes the real placement helper and does
  not claim scene dimension graphics.
- Precision Placement Helpers is disabled without exactly one supported machine and
  exposes the reason `Select one machine to use Precision Placement helpers.`. Enabling
  it expands the existing Placement Settings contribution and disabling it
  hides the helpers through the same PlacementSettings authority.
- Ctrl/Cmd+K and the Application Bar search affordance open an accessible search
  projection of existing registered commands; disabled commands retain their
  canonical unavailable reason.

## Arrange

Align Left/Right/Front/Back/Center X/Center Y, horizontal/vertical distribution,
Equal Gap X/Y, Group, Ungroup, and Advanced Alignment are registered commands.
The Arrange binding factory delegates to the existing alignment helpers,
Assembly Runtime bridge, and Runtime Panel bridge. It applies two-entity and
three-entity thresholds and rejects the complete selected set when atomic lock
evaluation fails. Existing mutation callbacks retain their one-snapshot
history/dirty behavior.

## Inspector And Contextual Arrange

The Inspector now reports what the current selection is: identity, primary
selection, selected items, bounds, assembly context, and pair reference-point
measurement. Operational alignment, distribution, equal-gap, duplicate,
delete, clear-selection, and connection-snap stacks are absent from the active
Inspector composition.

Selection Tools is retired from normal Bottom Dock presentation. Viewpoints is
the only Phase-1 Bottom Dock contribution. Two or more alignable entities expose
one compact viewport context bar whose Align, Distribute, Equal Gap, and Group
actions delegate to existing runtime commands. An exact compatible machine pair
adds Connect & Snap and reuses the existing selectors and snap command in a
transient popover; the action is absent for mixed or three-plus selection.
Advanced pair/anchor controls remain available through Arrange > Advanced
Alignment in the registered modal tool surface. Keyboard Nudge settings remain
in Precision Placement using the same `NudgeSettings` state and unchanged
keyboard behavior.

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

Menu, icon, tooltip, Help, startup/recovery, panel toggles, contextual Arrange
visibility, and responsive operations leave camera, selection, transforms,
history, dirty state, and workspace unchanged unless an explicit existing
engineering command is executed. Chromium verifies one EditorHost, one Babylon
canvas, and stable scene lifecycle generation through Help, Viewpoints toggles,
Arrange/Connect popovers, label rename/history, and 1440x900, 1024x768, and
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

## Canonical v3 Reconciliation Evidence

The reconciliation package is governed by
`docs/product/ATRVISU_PHASE1_PRODUCT_UI_DESIGN_SPEC_V1.md` and the exact reuse
decision in `docs/audits/ATRVISU_PR110_REUSE_DELTA_AUDIT_V1.md`.

- The grouped Engineering Command Strip and duplicate Application Bar Save are
  retired. The Quick Toolbar is icon-only and responsive; no false Measure or
  Selection Tools command is present.
- Selection Tools is no longer registered as a Bottom Dock contribution.
  Viewpoints remains the sole persistent Phase-1 Bottom Dock utility.
- Common Arrange operations use the temporary viewport bar. Exact compatible
  pairs expose Connect & Snap through the existing command/panel authority, and
  Advanced Alignment remains a registered modal tool surface.
- Precision Placement Helpers remain a transient projection of existing
  placement settings. PF-3 owns the true viewport Measure product.
- Command Palette searches and executes the existing Command Registry through
  the command-surface adapter; no palette-local command or state authority was
  introduced.
- Primary Dock, Inspector, and Bottom Dock use one shared collapse component.
- Shell reference sizes are token-governed at 38/28/42/25 px with 292 px left,
  326 px right, and a 132 px default Viewpoints dock.
- Fit View remains omitted because the current product has no safe registered
  camera command binding. Presentation Mode remains later Phase-1 work; no dead
  control is shown.

## Validation Evidence

### Executed evidence correction

Independent screenshot review `5449251603` identified three bounded semantic
gaps and two responsive presentation gaps. The corrected premium Connect &
Snap route now requires an eligible exact-two-machine selection with an actual
`product-out -> product-in` pair, automatically resolves the moving/fixed
orientation, and rejects load-only, same-type, utility-only, or missing-flow
pairs through the existing snap guard. Two-object Arrange hides Distribute and
Equal Gap; three-plus selection reveals them.

At 1024 px the Inspector is collapsed by presentation state without writing to
the persisted desktop panel preference. Explicit responsive open remains
available, returning wide restores the persisted state, and the stable callback
boundary preserves one EditorHost, Babylon scene, and canvas. Application Bar
search uses a single-line compact label at this breakpoint. The user-facing
absent-preset label is `Custom Workspace`, while Sales Layout and Layout
Engineering remain the two canonical presets.

Executed evidence uses Flow Pack Machine, Belt Conveyor, Robot Palletizer,
Floor Area, Wall, and Walkway. The compatible connection screenshot uses Flow
Pack Machine Product Out to Belt Conveyor Product In. Ten exact-branch captures
cover recovery, Sales, Engineering single selection, contextual Arrange,
compatible snap, Command Palette, Viewpoints, Help, 1024, and 640 layouts under
`C:/Users/mt_ug/.codex/visualizations/2026/06/03/019e8c85-ed6c-7db2-8cda-21319567ec63/pf1-reconciliation-evidence/`.

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
- Focused canonical v3 reconciliation regressions: PASS, 8 files / 54 tests,
  covering the registry-projected Command Palette, contextual Arrange and
  Connect & Snap surfaces, compact Quick Toolbar, runtime panel authority,
  workspace presets, shared dock collapse contract, and status-bar inset.
- Executed real-runtime evidence: PASS, recovery/start, normal workbench,
  single selection, contextual Arrange, Connect & Snap, Command Palette,
  Viewpoints, Help, 1024x768, and 640x800 captured under
  `C:/Users/mt_ug/.codex/visualizations/2026/06/03/019e8c85-ed6c-7db2-8cda-21319567ec63/pf1-reconciliation/`;
  no document-level overflow was observed at the responsive evidence sizes.
- `npm audit --audit-level=low`: PASS, 0 vulnerabilities.
- `npm ls --all`: PASS; platform-specific and toolchain optional dependencies
  remain reported as optional.
- Design-token governance: PASS, 255 maintained files.
- Production build: PASS, 4,126 modules transformed.
- Full unit suite: PASS, 151 files / 1,261 tests.
- Full Chromium suite: PASS, 73 tests.
- `git diff --check`: PASS.
- Exact-head GitHub Quality Gate: required before manual re-acceptance.

The existing Vite large-chunk warning remains visible and non-blocking: the PDF
serializer is approximately 2.66 MB and the main bundle approximately 5.53 MB
before gzip. PF-1C does not perform unrelated bundle splitting.

Decision: **READY FOR FINAL MANUAL VISUAL ACCEPTANCE AFTER GREEN EXACT-HEAD CI.**

This decision does not mean `PHASE 1 CLOSED`.
