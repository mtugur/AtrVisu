# P1-CLOSE-NAV Gate

Status at contract stage:
- Automation Green: PENDING
- Contract Verified: PENDING
- Product Accepted: PENDING

## Contract
- [ ] Benchmark evidence reviewed.
- [ ] Canonical domain axis mapping frozen.
- [ ] ViewCube face/edge/corner semantics frozen.
- [ ] ViewCube does not imply Fit View.
- [ ] Passive triad semantics frozen.
- [ ] Fit View inclusion/exclusion and framing algorithm frozen.
- [ ] Side-dock exact screen-space stability contract frozen.
- [ ] PF-3A movement explicitly untouched.

## Runtime
- [ ] `view.fitView` required-runtime and reachable.
- [ ] Quick Toolbar + View menu + Command Palette reach Fit View.
- [ ] ViewCube uses Runtime Viewport camera authority.
- [ ] Triad reads camera orientation and never writes it.
- [ ] Side docks overlay stable viewport.
- [ ] HUD safe areas prevent dock occlusion.
- [ ] Commercial capture excludes ViewCube/triad.

## Automation
- [ ] Unit tests: orientation vector/preset conversion.
- [ ] Unit tests: Fit View bounds/framing.
- [ ] Unit tests: HUD safe-area layout.
- [ ] E2E: six faces + representative edge/corner.
- [ ] E2E: mixed/elevated/rotated Fit View.
- [ ] E2E: left/right open/collapse/resize pixel stability.
- [ ] E2E: camera/selection/entity/history/dirty invariants.
- [ ] E2E: clean snapshot excludes navigation HUD.
- [ ] no-red-console.
- [ ] exact-head Quality Gate PASS.

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
