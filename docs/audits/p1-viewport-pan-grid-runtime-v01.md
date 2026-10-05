# P1 Viewport Pan/Grid Stage B Runtime Audit

## Source and bounded objective

Original Stage-B authorization: [review 5407970749](https://github.com/mtugur/AtrVisu/pull/122#pullrequestreview-5407970749).
The one consolidated correction is frozen by authoritative
[review 5408684275](https://github.com/mtugur/AtrVisu/pull/124#pullrequestreview-5408684275).
That review supersedes the earlier acceptance review: `b01d2794bdeecc1ae288082722930426e0edfdc2`
Automation Green is historical only; Contract Verified is REOPENED/PENDING and
Product Accepted is FAIL/PENDING correction. Green automation cannot close the
reported whole-layout jitter by itself.
Stage A PR #123 merged at main `29be0f037b172f3574155f537c2c3cf49d7c1013`.
Parent #122 was synchronized by normal merge `9982ccc81ae6d109b4485290c5e3324a5387dc69`;
its five reviewed implementation/evidence commits remain ancestors. That parent
sync changes only the nine Stage-A governance files. Runtime work is on the
separate `fix/p1-viewport-pan-grid-runtime-v01` branch, stacked on the parent.
Both PRs remain Draft/unmerged.

One objective: implement the merged view-parallel camera Pan and rigid world
grid contract. The rejected derivative renderer is replaced, not tuned.
This is not another floor-pan tuning pass. No PF-3A entity
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
  at 1440x900 and 640x800, with all required faces and representative edge/corner.
  A bounded additional render-frame matrix covers DPR 1/1.25/1.5/2 in default,
  Fit, shallow, exact side and corner states, normal and slow real MMB paths.
- F: console errors/pageerrors and all known blocker warning texts are collected
  without suppression. Identity and lifecycle checks accompany actual pointer
  input, not just pure solver assertions.
- G: review 5408684275 authorizes the one consolidated correction of the
  separately reviewed ADR-007 model. No derivative tuning is permitted.
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

## Whole-scene jitter investigation

`navigationRenderProbe.ts` is installed only on the existing opt-in diagnostics
URL. Its onAfterRender observer records EVERY completed render while explicitly
armed, not a requestAnimationFrame sample after settling. It records the latest
native pointer event/sequence/time, target and derived position, pose/FOV/mode/span,
complete rendered view/projection matrices, three fixed non-collinear anchors,
canvas CSS/render dimensions/DPR, lifecycle/identity and all inertia offsets.
It does not force a camera update, mutate domain state or publish React state.

The original Pan implementation is measured before replacing the grid. Baseline
source is `b01d2794bdeecc1ae288082722930426e0edfdc2`; read-only diagnostic/test
instrumentation is explicitly uncommitted during that investigation, not falsely
described as a clean exact-head delivery. `panGridBaselineReproduction.json`
records the retained measured results; the new CI artifact supplies complete
corrected-head frame trajectories and the DPR summary.
The baseline's 40 cases/80 paths contain 4979 completed renders; worst residual
is 0.00003529555796710533 CSS px, reversal and input-motion stalls are zero.
Full raw baseline is preserved externally; representative default frames at
each width/DPR accompany the committed measured matrix. These results do not
reproduce whole-scene camera jitter and are not a claim that the report is false.

The ArcRotate dual-write hypothesis is tested, not assumed. The actual-render
unit A/B compares existing dual-write against target-only through both projections
and every canonical orientation. Equal rendered matrices/derived positions do
not establish dual-write causality. No speculative Pan compensation, smoothing,
lag model, fallback or changed wheel/orbit authority is introduced.

Frame checks classify pixel residual/lag, reversal, orthogonal wobble, unexplained
jump and stalls against the most recent input at three target-depth anchors.
Final <=1px, subdivision and reverse tests remain separate and necessary.
Absence of a reproduced camera reversal is NOT proof that the Product Owner's
reported whole-layout jitter is resolved; independent temporal evidence review
remains open and no additional exploratory/manual test is assigned to the owner.

## Grid implementation

The previous shader's per-axis `fwidth`/minor fade changed line-family weights
with projected density. Review rejects that apparent morphing regardless of the
historical endpoint oracle. The custom procedural ShaderMaterial and its tests
are removed; no replacement custom shader, tiled texture, fade or angle branch.

Four bounded meshes: existing invisible interaction plane, separate plain unlit
workplane fill, ONE combined Minor LineSystem, ONE combined Major LineSystem.
`workplaneGridGeometry.ts` generates explicit canonical mm endpoints from current
WorkplaneBounds at world-origin multiples of 1000/5000mm. Major positions are
excluded from Minor. Geometry buffers use only the existing mm-to-metre adapter.
Line colors consume the existing typed neutral palette; no camera uniforms drive
phase/density/orientation. Only actual domain bounds changes rebuild the two line
systems; same bounds, Pan/Orbit/Zoom and palette changes do not replace them.
The interaction plane, three lights, world bounds authority and depth writes
remain separate/unchanged. No per-line mesh, new preference/store/dependency.

Diagnostics report actual workplane bounds/transform, fixed cadence, origin
phase, uploaded vertex arrays, canonical line manifest, mesh IDs and rebuild count.
Rotated-domain-AABB/margin/minimum tests remain
the authority for bounds; camera operations cannot influence those inputs.

Discontinuity classification must distinguish the finite workplane edge from
inside-bounds raster loss, depth interference or camera-frame instability. The
finite existing extent remains visible when a view includes its edge. The
40000mm minimum and 5000mm margin are NOT increased to hide it. Whether that
finite boundary is itself a product defect is a separate contract decision;
this correction does not claim permission to change it. Reviewer-accessible
high-frequency frames and rendered world-line/projection telemetry support the
inside-bounds/depth/camera classification rather than an image-similarity score.

## Executable evidence and delivery

- `cameraPan.test.ts`: both projections, 26 presets plus default/shallow,
  actual Babylon projection at each subdivision, same target/position delta,
  event-cadence equivalence, reverse return and fixed pose/framing.
- `workplaneGridGeometry.test.ts` and `visualContext.test.ts`: explicit metric
  world coordinates, palette-only updates, stable uploaded arrays and two line
  identities through camera-only navigation; bounded resources and depth.
- `navigationRenderProbe.test.ts`: actual completed-render matrix/anchor/input
  observation, stop/dispose and no camera mutation.
- `e2e/panGridEvidence.ts`: 26 Pan cases, eight forward/reverse paths each;
  signed 120px H/V, 120x80 diagonal, slow 240px and 1x120/8x15/24x5 equivalence.
  Every step has a <=1 CSS px fixed-world-anchor oracle and before/after camera,
  domain/history/dirty, grid and lifecycle evidence. Same canvas handle checked.
- 40 render-frame cases: five camera states x two widths x four DPR values;
  normal/slow MMB, every-render three-anchor oracle, invariant matrices/lifecycle.
- 20 grid sequences: both themes, Top/default/oblique/shallow/wheel/corner/Fit
  at DPR1 plus shallow at DPR1.25/1.5/2. Each has 13 successive captures per
  normal/slow Pan, orbit and wheel, with NO settling between input captures
  (1040 PNGs). Every rendered frame is recorded throughout these sequences.
  Each PNG records its start/end render-frame window, not a false claim that an
  unsettled pre-screenshot pose is the exact pose of the asynchronously captured PNG.
- `validate-pan-grid-evidence.mjs` fails missing cases, stale heads, console
  failures, out-of-tolerance Pan oracles, missing grid diagnostics or invalid PNGs.
- CI uploads `p1-viewport-pan-grid-runtime`: 1040 PNGs, 86 case JSONs,
  baseline investigation, DPR summary, world-line manifest, exact-head manifest
  and README. Actual final head/run/counts are recorded in
  the stacked PR Validation section and artifact, avoiding invented future SHAs.

Stage-A historical PENDING statements remain historical; this audit does not
self-certify independent contract/product acceptance. Both PRs remain unmerged.
