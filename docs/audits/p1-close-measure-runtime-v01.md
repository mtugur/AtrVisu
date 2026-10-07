# C03 Professional Measure Tool Stage B Runtime Audit

## Baseline and frozen authority

Exact approved main: `64032007691f32b8d7feb8fe54765bef8d2e96d3`.
Bounded branch: `feat/p1-close-measure-runtime-v01`.

Product Constitution, Interaction Standard section 15, the merged
`P1_MEASURE_TOOL_CONTRACT.md`, pre-implementation
`docs/benchmarks/P1_MEASURE_TOOL_EVIDENCE.md` and ADR-008 are unchanged.
Visual Components Measure workflow, Autodesk MEASUREGEOM and SOLIDWORKS Measure
are the task-similar official documentation precedents. Their retrieval limits
and AtrVisu deviations remain explicit in the benchmark record. The Stage A
four-CSS-pixel classifier and first-A/captured-FFL presentation-plane correction
preceded this runtime, not a retrospective benchmark or threshold decision.

## Runtime architecture

App creates one transient external Measure authority. Selection context is a
detached entry snapshot of canonical Runtime Selection order/primary, platform
entities, machine references and active Level. No project, history or UI
preference serializer includes Measure. Only the small tool subscribes to
operands/projection; App observes active/inactive, not per-frame graphics.
The stable authority installs once with the existing Babylon lifecycle and
cleans its own listeners/capture on disposal. No Engine, scene, canvas or
camera is created by the tool.

`view.measure` is a live Runtime Feature Command; `viewport.measure` is a
required-runtime Feature Access record with a real inventory surface. Toolbar,
View and Palette, as well as typed tool controls, use that same binding.
`view.showMeasurements` remains the existing Precision Placement Helpers.

Pick captures primary LMB. Maximum radial client-coordinate displacement is
inclusive <=4 CSS px; an excursion >4 latches cancellation even after return.
Only valid same-pointer up can confirm. There is no timer, total-travel,
velocity, DPR scaling, fallback or intent heuristic. Capture loss before up,
pointercancel, blur, outside up and tool ownership/reset/exit cancel; late up
cannot resurrect the press. Post-confirmation capture loss does not retract it.
Navigate leaves the original LMB Orbit live. Both modes retain the existing
MMB Pan/wheel, ViewCube, Fit View and saved Viewpoint camera authority.

Geometry picks the nearest eligible visible Machine/Civil mesh, including
native GLB children with actual world transforms. Locked visible objects are
readable; hidden, label/helper/annotation/grid surfaces are not operands.
Geometry miss confirms nothing. Explicit Level Plane uses an operation-start
FFL snapshot and the canonical forward ray/plane intersection; parallel,
behind and non-finite intersections are unavailable, never Ground fallback.

All quantities are canonical domain mm: Babylon X/Z/Y maps to domain X/Y/Z.
Distance exposes signed XYZ, 3D and Plan; Angle is A-B-C with B as vertex;
Plan Area uses XY shoelace/closed perimeter with duplicate, degenerate,
crossing, touching and overlapping edges rejected. Geometry presentation Z is
first confirmed A.Z; Level Plane presentation Z is captured FFL. Original
world operands are retained. Canonical local dimensions do not become rotated
world AABBs; Floor Plan Depth and Floor Thickness remain distinct. Ordered
Machine/Machine Plan reference calculation delegates to the existing placement
helper; mixed references retain canonical base/bottom identity, not clearance.

DOM/SVG points, preview lines, XYZ, angle arc, Plan polygon, dimension and pair
graphics reproject on actual after-render frames. Neutral semantic theme tokens,
wrapped numeric callouts and existing HUD safe areas bound presentation only.
When a bottom sheet leaves less space than those floating callouts occupy,
the complete numeric readout remains in the tool; floating repetitions do not
stack over the HUD. Markers/segments and actual world geometry remain unchanged.
Offscreen/occluded/leader text is explicit; no world point/camera compensation.
Existing commercial render-target capture excludes these editor-only DOM
elements without changing session or resolution.

Live command enablement rejects mutations/history/context replacement with a
truthful Exit Measure reason. Domain fieldsets and persisted Viewpoint mutation
controls mirror that authority; camera, read-only outputs and panel presentation
remain usable. Exit restores invoker/canvas focus and normal input. Modal/text
Escape/Enter ownership is not hijacked. No lock, snap, body-drag, Group/history,
FFL, native asset or navigation algorithm is rewritten.

## Executable evidence map

| Oracle | Executable evidence |
| --- | --- |
| M01 | Real toolbar/menu/Palette entry and exit, empty Geometry miss, explicit plane preview/result and Escape. |
| M02 | Native GLB public import and actual child-surface pick; visible locked vs hidden geometry; real negative slab bottom hit from below. |
| M03 | Pure exact signed 3000/4000/12000 fixture plus rendered distance, reverse and zero. |
| M04 | Pure and real 0/60/90/180 A-B-C angle, hover preview, zero-arm rejection. |
| M05 | Real differing-Z four-point Geometry, captured Level2 FFL, Enter/Finish, reverse winding, different first A, concavity and invalid paths; unit touching/overlap/non-finite cases. |
| M06 | Canonical adapter dimensions and ordered references; pure and actual two-Machine Plan diagnostic equality, Floor dimension semantics, unsupported/missing entry; real selected viewport graphics. |
| M07 | Actual Pick/Navigate LMB, MMB Pan/wheel, Top/Front/Right ViewCube/Fit/saved Viewpoint; confirmed values and entry selection invariant even when saved selection differs; explicit parallel-plane miss. |
| M08 | Real 0/3/4/5/out-return/within-radius multi-jitter at DPR1/2; native cancellation/capture/focus/outside/reset/mode/exit and late up; disabled Undo during Measure, restored selection/body-drag/Undo after exit. |
| M09 | 1440/1024/640, light/dark, real docks and Inspector Auto/Pinned; bounds/overflow, projected anchor <=1 CSS px, canvas/lifecycle/domain invariants. |
| M10 | Public JSON export bytes invariant, public clean 1920x1080 PNG before/after tool exit, current/migrated preferences and transient reload. |

`src/measure/*.test.ts`, `src/components/measure/*.test.ts` and bounded
Help/Viewpoints tests supply deterministic focused coverage. Chromium evidence
uses real pointer/keyboard/public controls; diagnostic camera fixtures and
world projection only position/observe those gestures, never create operands.
Test collectors report all console.error/pageerror and known blocker text.
The native capture cancellation path uses the contract-permitted real press
plus browser capture/PointerEvent cancellation, not a fake authority result.

`scripts/validate-measure-evidence.mjs` rejects stale head/run, missing scenario,
domain/elevation/lifecycle mutation, red console, wrong distance arithmetic,
incorrect Plan presentation, incomplete classifier/cancel coverage and missing
dock geometry. Negative policy tests execute in CI. The artifact manifest maps
M01-M10 to JSON/PNG, source/run and per-file SHA256; observed values and displayed
text retain actual render precision. Pure tolerances are not falsely applied to
GPU picked coordinates.

## Interaction Change Gate A-J

- A: Product Constitution, section 15, benchmark and ADR-008 existed before
  implementation; vendor fact vs AtrVisu decision attribution stays frozen.
- B: C03 only. No C04/C05/C07/C09, persistent dimensions, schema/dependency or
  PR #120 branch changes. Help and command/surface records are necessary live
  tool reachability, not a shell redesign.
- C: Entry Runtime Selection is read-only; command/history/lock/entity/snap and
  pair helper remain canonical. No tool gesture mutates a domain transaction.
- D: Explicit Pick/Navigate/source/Finish/Restart/Exit. Fixed classifier, no
  hidden fallback, camera exception, smoothing, lag or manipulator retuning.
- E: M01-M10 covers clean/current/migrated, Machine/Civil/mixed/unsupported
  selection, dock/Inspector states, real input and post-exit normal Undo.
  Snap/movement is unchanged and protected by the full existing suite.
- F: Unsuppressed no-red-console collectors and stable single lifecycle;
  projection store cannot become App domain state or Inspector write-back.
- G: One authorized implementation package. No independent-review correction
  batch has been consumed. Reviewer owns Contract Verified; no exploratory
  Product Owner request is made.
- H: Responsive screenshots and real mixed geometry supplement numerical
  assertions. Automation cannot substitute for final visual product acceptance.
- I: Automation Green is PENDING until the complete exact-head Quality Gate
  succeeds. Actual head/run/counts are the same-PR Validation and validated CI
  artifact, not an invented self-referential commit hash. Contract Verified and
  Product Accepted remain PENDING independent review/acceptance.
- J: No stop-rule trigger is waived. A contract conflict or further interaction
  tuning would stop implementation rather than rewriting frozen authority.

## Delivery and acceptance

Risk-based focused gates precede one complete local gate: audit low, dependency
tree, tokens, governance/policies, build, unit, full Chromium and evidence
validation plus diff check. Exact-head GitHub Quality Gate includes real-input
capture and strict evidence validation before artifact upload.

Final counts, run URL, exact head and artifact identity/digest belong in the
Draft PR Validation section and delivery response. Artifact-validation PASS is
not whole-CI PASS, Contract Verified or Product Accepted. Stage B is Draft and
unmerged; C03/Phase-1 Exit is not closed and no manual acceptance is requested.

The complete local checkpoint gate passed audit (zero vulnerabilities),
dependency tree, 289-file token governance, interaction governance/policies,
build and 179 unit files / 1539 tests. Chromium reported 209 passed, one failed
and one conditional evidence skip: the existing PF-1 toolbar assertion still
expected nine commands rather than the required Measure-inclusive ten. The
bounded test correction uses the canonical command list and preserves ordered
labels, icons, ARIA and responsive assertions; its focused Chromium rerun passed.
All 14 Measure Chromium tests passed the complete checkpoint run. Evidence
validation passed 31 observations / 31 PNGs, including DPR 2 device-pixel
screenshots; 13 policy regressions protect provenance, invariants and DPI sizing.
The corrected exact-head complete GitHub gate remains the delivery authority.
