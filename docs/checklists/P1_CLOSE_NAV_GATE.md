# P1-CLOSE-NAV Gate

Status after corrected runtime exact-head verification:
- Automation Green: PASS
- Contract Verified: PENDING
- Product Accepted: PENDING

## Contract
- [x] Benchmark evidence reviewed.
- [x] Canonical domain axis mapping frozen.
- [x] ViewCube face/edge/corner semantics frozen.
- [x] ViewCube does not imply Fit View.
- [x] Passive triad semantics frozen.
- [x] Fit View inclusion/exclusion and framing algorithm frozen.
- [x] Side-dock exact screen-space stability contract frozen.
- [x] PF-3A movement explicitly untouched.

## Runtime
- [x] `view.fitView` required-runtime and reachable.
- [x] Quick Toolbar + View menu + Command Palette reach Fit View.
- [x] ViewCube uses Runtime Viewport camera authority.
- [x] Triad reads camera orientation and never writes it.
- [x] Side docks overlay stable viewport.
- [x] HUD safe areas prevent dock occlusion.
- [x] Commercial capture excludes ViewCube/triad.

## Automation
- [x] Unit tests: orientation vector/preset conversion.
- [x] Unit tests: Fit View bounds/framing.
- [x] Unit tests: HUD safe-area layout.
- [x] E2E: six faces + representative edge/corner.
- [x] E2E: mixed/elevated/rotated Fit View.
- [x] E2E: left/right open/collapse/resize pixel stability.
- [x] E2E: camera/selection/entity/history/dirty invariants.
- [x] E2E: real 1024 side Inspector and 640 bottom-sheet Inspector opening,
  panel/HUD geometry, projected anchor and unchanged runtime invariants.
- [x] Inspector presentation independently owns its HUD geometry; existing
  shared breakpoint is reused without new breakpoint literals.
- [x] E2E: clean snapshot excludes navigation HUD.
- [x] no-red-console.
- [x] exact-head Quality Gate PASS: corrected runtime head
  `1fc08add0f4fe25c2492fa113dfc93acecfe002e`,
  [run 36852063846](https://github.com/mtugur/AtrVisu/actions/runs/36852063846).

## Visual evidence
Required artifact:
`p1-close-nav-viewport-navigation`

Minimum:
- 01-viewcube-default.png
- 02-viewcube-top.png
- 03-viewcube-front.png
- 04-viewcube-right.png
- 05-viewcube-axonometric-corner.png
- 06-axis-triad-orbit.png
- 07-fit-view-perspective.png
- 08-fit-view-orthographic.png
- 09-left-dock-open-stable.png
- 10-right-dock-open-stable.png
- p1-close-nav-evidence.json

Evidence JSON must include:
- exact head SHA;
- camera before/after;
- projection mode;
- projected anchor screen point before/after dock operation;
- scene/canvas lifecycle;
- selection/entity/history/dirty invariants;
- Fit View included entity IDs;
- viewport dimensions;
- console/page-error counts.
- responsive Inspector evidence at 1024 and 640: actual panel/HUD rectangles,
  side/bottom-sheet presentation, safe insets, anchor before/after/delta and
  camera/canvas/lifecycle/domain/history/dirty invariants.

Additional correction captures:
- 15-inspector-1024-side-overlay.png
- 16-inspector-640-bottom-sheet.png

## Rejection conditions
FAIL if:
- panel open/close visibly shifts world geometry;
- panel stability is achieved by camera mutation;
- ViewCube performs implicit Fit View;
- a face maps to wrong domain axis;
- cube/triad use Babylon axis naming;
- Fit View includes global workplane or editor overlays;
- Fit View loses elevated/rotated geometry;
- ViewCube/triad appear in commercial PNG;
- camera operation changes project history/dirty state;
- PF-3A Plan Move changes;
- red console or lifecycle regression appears.


## Stage B evidence

Implementation and Interaction Change Gate A-J evidence:
`docs/audits/p1-close-nav-runtime-v01.md`.

The corrected runtime head passed 169 unit files / 1441 tests and 110 Chromium
tests (one additional branch-conditional PF-3B test skipped). Audit reported zero
vulnerabilities. Artifact `11155929782` contains 16 PNGs plus evidence JSON;
both responsive Inspector routes recorded zero projected-anchor delta and
unchanged camera/canvas/lifecycle/domain/history/dirty snapshots.

The 640 Inspector-open PNG verifies panel/HUD geometry but its exposed scene
area appears blank; it is not evidence of nonblank scene rendering. This visual
evidence limitation remains open, without a camera or runtime workaround.
The documentation-delivery exact-head run/artifact are recorded in PR Validation.
Contract Verified and Product Accepted remain PENDING.
The navigation standard, ADR-006 and benchmark record are unchanged.
