# P1-CLOSE-NAV Stage B Runtime Audit

## Baseline and scope

Base main: `b727f4ee59875f9bbfbab7cc9b813486b20b353f`.
Branch: `feat/p1-close-nav-runtime-v01`.

This bounded package implements the already-frozen navigation standard: stable
side-dock projection, explicit Fit View, ViewCube, passive world triad and HUD
safe areas. No PF-3A movement, Level, persistence, viewport visual-language or
commercial-output semantics are redesigned. No package dependency changes.

## Frozen authorities

- Product Constitution and Interaction Standard sections 9 (camera navigation),
  11 (Undo/Redo), 12 (visual manipulators) and 13 (runtime console).
- `ATRVISU_VIEWPORT_NAVIGATION_STANDARD.md` sections 1-10 and ADR-006.
- Pre-implementation benchmark record
  `docs/benchmarks/P1_CLOSE_NAV_VIEWPORT_NAVIGATION_EVIDENCE.md`: Autodesk
  ViewCube, Visual Components View Selector/Floating Origin and SOLIDWORKS triad.
- ADR-001 movement, ADR-003 Level/FFL and ADR-004 viewport visuals stay unchanged.

## Runtime architecture

AppShell retains one full-width scene viewport with `left:0; right:0`.
Primary Dock and Inspector overlay it. Their existing preferences and Runtime
Panel bindings remain authoritative. Side-dock changes no longer synthesize
resize requests; actual host/window resize retains the existing engine resize
controller. Bottom-dock/status geometry remains unchanged.

Side insets now describe only HUD presentation. One deterministic safe-inset
helper bounds them. `getInspectorDockPresentation` independently resolves the
Inspector's right overlay versus bottom sheet using the existing shared 720 px
dock breakpoint. Its result drives both the Inspector CSS presentation attribute
and the right HUD inset; Primary Dock responsive state is not Inspector geometry
authority. The bottom sheet claims no side inset. The passive triad clears the
same bottom-sheet presentation attribute, not a separately resolved breakpoint.
Neither HUD movement nor panel operations write camera or domain state.

Fit View is the existing `view.fitView` command, now required-runtime. View,
Quick Toolbar and Command Palette execute the same Runtime Feature Command
binding, which delegates to the Runtime Viewport Bridge and BabylonScene camera
application authority. Empty visible geometry has an explicit disabled reason.

Canonical rotated footprint corners plus physical base/top elevations form
eight 3D corners per visible Machine/Civil entity. Hidden layers and hidden
Civil items are excluded; grid, labels, annotations and editor frames never
enter this geometry source. The bounds center is the target. A single analytic
camera-space calculation fits horizontal and vertical FOV/aspect in perspective,
or a uniform orthographic world span, using total factor 1.20. Orientation and
projection are preserved. There is no iterative zoom loop or implicit fit.

The compact chamfered SVG cube has six faces, twelve edges and eight corners,
not a text-button grid or a second scene. Canonical domain XYZ maps to engine
XZY; presets use the frozen normalized vectors and 0.01-radian pole rule.
Each visible polygon is an accessible click/keyboard zone. Presets preserve
target and framing and explicitly become orthographic.

Babylon publishes detached, frozen camera snapshots to an App-instance-local
read-only subscription source after render. Only the small HUD subscribes via
`useSyncExternalStore`; no per-frame App state or presentation write-back exists.
The triad uses central technical axis colors and has no interactive/pick/snap
authority. Scene cleanup clears telemetry; subscription cleanup removes listeners.
Saved Viewpoint restore continues through the same camera application function.
Commercial PNG remains the existing Babylon render-target capture: DOM HUD is
not part of the exported scene.

## Executable evidence

- `navigationGeometry.test.ts`: all 26 normalized presets, opposite directions,
  canonical mapping/poles, preserved target/span, empty/non-finite fit, Machine,
  Civil, mixed rotated/elevated geometry, 45-degree Beam, signed slab bounds,
  hidden-layer exclusion and both analytic projections at factor 1.20.
- `presentation.test.ts`: read-only detached telemetry, deduplication/unsubscribe,
  polygon semantics/passive triad and left/right/both/collapsed/resized/responsive
  safe areas. AppShell/WorkbenchShell tests protect stable side geometry.
- Runtime Viewport Bridge tests verify one call to the current navigation binding,
  replacement bindings and unavailable navigation without an installed callback.
- Chromium `P1-CLOSE-NAV real navigation controls...`: actual cube polygon clicks
  for all six faces plus edge/corner, real orbit, all three Fit View surfaces,
  all included 3D corners inside framing margins, six real dock operations,
  unchanged camera/lifecycle/canvas/domain/history/dirty state and clean PNG.
  Visible/hidden DOM HUD exports are byte-identical through the existing PNG path.
  The existing Layers route also proves hidden geometry disables/excludes Fit
  View, showing restores it, and annotations are not Fit View geometry.
- Chromium responsive HUD tests: 1440/1024/640 in light and dark; no horizontal
  overflow. The real navigation route additionally selects a real Machine in
  Explorer and opens Inspector through Expand Inspector at 1024 and 640 px.
  At 1024 the side overlay clears ViewCube while the open left dock clears the
  triad. At 640 the Primary Dock is explicitly closed before opening the bottom
  sheet; the right HUD inset is zero, ViewCube remains upper-right and the triad
  clears the sheet vertically. Both routes compare projected world anchors,
  camera, canvas identity/geometry, lifecycle, resize generation, selection,
  transforms, history and dirty state before/after actual Inspector opening.
  Existing Viewpoint restoration now asserts HUD orientation and no
  implicit Fit View. Existing orthographic resize and panel tests retain real
  browser-resize coverage but reject synthetic side-dock resize.
  Legacy toolbar/Feature Access expectations include the newly live Fit View;
  empty-scene clicks prove they hit the canvas between the overlaid side docks.
  Inspector pinning, deselect, Group and body-drag assertions remain intact.
- Exact-head artifact `p1-close-nav-viewport-navigation`: ten required captures,
  four additional Left/Back/Bottom/edge captures and `p1-close-nav-evidence.json`.
  JSON records provenance, camera/vector dot products, included/excluded geometry,
  projected corner margins, each dock anchor/delta, HUD insets, effective theme,
  lifecycle/canvas identity, selection, transforms, history, dirty and errors.
  Two additional Inspector-open captures and `responsiveInspector` JSON entries
  include the actual panel/Primary Dock/ViewCube/triad rectangles, presentation,
  HUD insets, projected anchor before/after/delta and full invariant snapshots.

## Interaction Change Gate evidence (A-J)

A: authorities/traceable precedents above existed in merged Stage A before code.
B: one navigation closeout package; no movement tuning or unrelated feature.
C: canonical selection/entity/history/snap authorities remain untouched;
camera writes use the existing Runtime Viewport authority only.
D: cube means orientation, Fit means framing, triad means passive feedback;
existing click/deselect/orbit/pan/wheel semantics remain intact.
E: focused mixed-scene and dock routes above plus the complete existing
preferences, selection, snap, Undo/Redo and persistence regression suite.
F: unfiltered console-error/pageerror collectors, including Maximum update depth.
No new user-reported stack trace; stack-specific reproduction is N/A.
G: one implementation round plus the consolidated correction authorized by
review comment 5929033364 under the frozen Stage A contract. Independent
contract review and product acceptance are not claimed by the implementer.
H: compact theme-aware engineering HUD; actual mixed-scene captures, no default
framework gizmo, no additional canvas. Reviewer visual inspection remains open.
I: separate delivery states below. J: no contract rewrite, solver threshold,
camera-angle fallback, smoothing or movement redesign.

## Validation and acceptance

The final local gate is run once after focused implementation validation:
`npm ci`, low-severity audit, dependency tree, design tokens, interaction
governance, policy stress tests, build, full unit, full Chromium and diff-check.
Corrected runtime head `1fc08add0f4fe25c2492fa113dfc93acecfe002e` passed
[Quality Gate 36852063846](https://github.com/mtugur/AtrVisu/actions/runs/36852063846):
provenance, governance/policies/PR declaration, install, audit (zero vulnerabilities),
tokens (280 files), build, 169 unit files / 1441 tests and 110 Chromium tests
(109 parallel plus one isolated Feature Access; one branch-conditional PF-3B skip).
The same complete local gates passed; Vitest remains 4.1.11, dependencies unchanged.

Downloaded artifact `11155929782` contains exactly 16 PNGs and evidence JSON,
with that exact source head, zero console/page errors and responsive Inspector
records for 1024 right overlay and 640 bottom sheet. Both measured anchor deltas
are exactly zero CSS pixels. Camera, canvas identity/geometry, lifecycle/resize
generation, selection, transforms, history and dirty snapshots remain unchanged
across real Inspector opening. At 1024 the right HUD inset is 410 px and the left
inset is 294 px; at 640 both side insets are zero and the triad clears the sheet.

### Review 5379882289: renderer versus compositor investigation

Before any runtime modification, detached exact base `b727f4e` and reviewed
head `f2b8e06` were started with verified HTTP source-head provenance. Both used
640x800, real Level 2/Flow Pack Machine/Beam/Floor UI creation, Explorer Machine
selection, Primary Dock collapse, closed Inspector then real Expand Inspector.
The base View menu has no live Fit View: its existing camera was retained and no
diagnostic camera substitute was injected. Current head invoked real View Fit View.
This is an explicit limit to identical base/head framing, not fabricated base Fit.

Both ordinary page captures show Machine pixels before opening and omit them
after opening, while associated framebuffer samples remain filled:

| Source | Machine sample | Framebuffer before/after | Page before/after |
| --- | --- | --- | --- |
| exact base `b727f4e` | x341 y219, 23x14 | 322/322, 322/322 | 322/322, 0/322 |
| reviewed head `f2b8e06` | x386 y278, 25x15 | 375/375, 375/375 | 375/375, 0/375 |

Effective clear RGB is (32,35,38); GL error is zero, context is not lost and
camera/canvas/lifecycle/domain/history/dirty state stays unchanged. The same
composited-layer omission occurs on the exact pre-runtime base: it was not
introduced by PR #122. Classification is a pre-existing headless Chromium
compositor/evidence limitation on bottom-sheet opening, not missing entity rendering.
No assertion about Chromium's internal implementation or a real-user browser
defect is inferred beyond the measured framebuffer/page discrepancy.
The initial informal global "64 sampled colors" is superseded by this entity proof.

The strengthened real navigation E2E projects all eight canonical Machine corners
and derives a central 30%-by-30% integer sampling region inside those bounds.
The elevated Flow Pack fixture's interior is separated from ground Civil geometry;
the central inset excludes its label, selection border and empty AABB corners.
At least 64 samples and 75% filled pixels with RGB channel distance >=24 from
effective WebGL clear color are required. This proves a filled interior, not sparse
grid/outline pixels, without hardcoding cyan or any Machine material color.
Pure negative tests reject background-only, near-black compositor background,
sparse lines, incomplete data, transparent pixels and undersized regions.

Focused 640 real Fit evidence: bounds x376.501/y199.135, width55.958/height92.516,
sample x397/y232, 15x27. Framebuffer before/after is 405/405 filled (ratio1), page
before is 405/405 and after is 0/405. All bounds lie above sheet y423; pixel region
hit-testing still resolves CANVAS, opacity1/displayblock/visibilityvisible.
The test fails if projected-visible Machine framebuffer pixels are missing.
There is no pixel retry, timeout, camera/Fit compensation or scene remount.

Artifact additions: ordinary before/after captures 17/18 and exact, vertically
flipped WebGL readback PNGs 19/20. Ordinary after PNG remains truthful about the
compositor limitation; direct readback visibly renders the selected Machine.
`baseVsHeadReproduction` and per-route `machinePixelEvidence` record provenance,
eight projected corners, bounds/region/counts/clear color, page and framebuffer
results and unchanged snapshots. No production source changed in this correction.

The final evidence-correction exact-head run and artifact are recorded in the
PR Validation section. Artifact provenance uses the checked-out head, not a merge ref.

- Automation Green: preceding runtime PASS is recorded above; the evidence-only
  correction requires its own final exact-head PASS, recorded in PR Validation.
- Contract Verified: PENDING independent reviewer inspection.
- Product Accepted: PENDING.

The Draft PR must remain unmerged; no manual acceptance is requested by this task.
