# P1 Viewport Pan/Grid Stage B Runtime Audit

## Source and bounded objective

Authoritative [review 5407970749](https://github.com/mtugur/AtrVisu/pull/122#pullrequestreview-5407970749).
Stage A PR #123 merged at main `29be0f037b172f3574155f537c2c3cf49d7c1013`.
Parent #122 was synchronized by normal merge `9982ccc81ae6d109b4485290c5e3324a5387dc69`;
its five reviewed implementation/evidence commits remain ancestors. That parent
sync changes only the nine Stage-A governance files. Runtime work is on the
separate `fix/p1-viewport-pan-grid-runtime-v01` branch, stacked on the parent.
Both PRs remain Draft/unmerged.

One objective: implement the merged view-parallel camera Pan and bounded grid
sampling contract. This is not another floor-pan tuning pass. No PF-3A entity
movement, Fit algorithm, ViewCube vectors/pole rule, UI shell, Level/FFL,
selection, snap, lock, history, persistence or dependency change is authorized.

## Frozen authority and Interaction Change Gate mapping

- A: AGENTS, Product Constitution, Master Plan Sync and CODEX Sync protocols were
  read in order. Interaction section 9, Navigation section 11, Visual section
  4.4, ADR-007 and `P1_VIEWPORT_PAN_GRID_CONTRACT.md` were merged before code.
  Benchmark evidence is `docs/benchmarks/P1_VIEWPORT_PAN_GRID_EVIDENCE.md`:
  Visual Components, AutoCAD, SOLIDWORKS and Autodesk Inventor/Factory official
  precedents, with differing bindings explicitly distinguished from owner choice.
- B: one separately authorized Stage-B package, one stacked PR. No normative
  standard, benchmark or ADR is edited to bless implementation.
- C: BabylonScene/Runtime Viewport remain the only camera authority. Camera Pan
  never calls domain mutation, selection, command/history or snap callbacks.
  Entity movement remains ADR-001 fixed horizontal picked-elevation body drag.
- D: MMB, RMB and Shift+LMB retain one shared Pan authority. Production Pan has
  no floor/scene pick requirement, hidden fallback, gain clamp, compensation,
  smoothing, hysteresis, sign repair or angle-specific model.
- E: real MMB entry/trajectories use actual wheel, orbit, Fit and accessible
  ViewCube controls; reset uses a real captured Viewpoint. Read-only projection
  probes never change camera state. Existing preference, Inspector, docks,
  selection, body-drag, snap/history, save/reload and export E2E remain intact.
  Pan-specific acceptance includes empty and mixed Machine/Civil/Group contexts
  at 1440x900 and 640x800 DPR1, with all required faces and representative edge/corner.
- F: console errors/pageerrors and all known blocker warning texts are collected
  without suppression. Identity and lifecycle checks accompany actual pointer
  input, not just pure solver assertions.
- G: this is the first implementation of the separately reviewed ADR-007 model.
  Independent Contract Verified review remains required; the Product Owner is
  not assigned exploratory/manual testing.
- H: grid temporal PNGs are review evidence, not implementer-certified universal
  GPU conformance. No new viewport affordance, palette or material authority.
- I/J: Automation Green requires the final exact-head Quality Gate. Contract
  Verified and Product Accepted remain PENDING. Another heuristic tuning round
  is forbidden; contract gaps are blockers, not reasons to alter standards.

## Camera Pan implementation

`cameraPan.ts` snapshots the gesture-start view basis, projection coefficients,
target and position. Perspective coefficients are evaluated at camera-target
depth; orthographic coefficients encode the current span. Total client-pointer
displacement resolves one view-plane translation against that immutable start.
Position and target move together. The existing target vector is updated without
ArcRotateCamera's target setter rebuilding spherical orientation.

The historical `lastFloorPoint` feedback loop is removed only from camera Pan.
Floor/plane picking used by the existing wheel and PF-3A entity paths is unchanged.
Existing attach/detach and pointer-up release paths remain authoritative.

`probeProjection` is diagnostics-only/read-only: intersect the initial pointer
ray with the start target-depth view plane, then project that same fixed world
point using the actual rendered scene matrix at every input step. Normal URLs
still expose no diagnostic bridge. No direct camera diagnostic writes are used
by the new acceptance matrix.

## Grid implementation

The existing two-mesh context, invisible interaction plane, lights and workplane
transform are retained. One analytical ShaderMaterial replaces the tiled
512px RawTexture. Line phase is computed directly from transformed world X/Z,
at exactly 1m/5m (1000/5000mm). Screen derivatives analytically integrate periodic
line coverage over each pixel footprint. Continuous per-axis fade suppresses
only the minor family as its projected period becomes sub-pixel; major coverage
remains analytically filtered without fade. No camera-dependent geometry rebuild, bounds change, engineering
spacing change, texture phase, mesh-per-line architecture or persisted LOD state.
Existing typed light/dark palettes supply all colors. Depth policy is unchanged.

Diagnostics report actual workplane bounds/transform, fixed cadence, origin
phase and sampling parameters. Rotated-domain-AABB/margin/minimum tests remain
the authority for bounds; camera operations cannot influence those inputs.

## Executable evidence and delivery

- `cameraPan.test.ts`: both projections, 26 presets plus default/shallow,
  actual Babylon projection at each subdivision, same target/position delta,
  event-cadence equivalence, reverse return and fixed pose/framing.
- `workplaneGridMaterial.test.ts` and `visualContext.test.ts`: fixed metric
  uniforms/world phase, palette-only updates, bounded stable resources and depth.
- `e2e/panGridEvidence.ts`: 26 Pan cases, eight forward/reverse paths each;
  signed 120px H/V, 120x80 diagonal, slow 240px and 1x120/8x15/24x5 equivalence.
  Every step has a <=1 CSS px fixed-world-anchor oracle and before/after camera,
  domain/history/dirty, grid and lifecycle evidence. Same canvas handle checked.
- 12 grid sequences: both themes, Top/default/oblique/shallow/wheel/corner;
  normal/slow Pan, orbit and wheel at start/25/50/75/end (240 PNGs).
- `validate-pan-grid-evidence.mjs` fails missing cases, stale heads, console
  failures, out-of-tolerance Pan oracles, missing grid diagnostics or invalid PNGs.
- CI uploads `p1-viewport-pan-grid-runtime`: 240 PNGs, 38 case JSONs,
  exact-head manifest and README. Actual final head/run/counts are recorded in
  the stacked PR Validation section and artifact, avoiding invented future SHAs.

Stage-A historical PENDING statements remain historical; this audit does not
self-certify independent contract/product acceptance. Both PRs remain unmerged.
