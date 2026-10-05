# C03 Professional Measure Tool - Stage A Contract

## 1. Source, authority and boundary

Base exact main: `14d6f8086e1d868ea498b0c3f59d93c287843dac`.
Branch: `docs/p1-close-measure-contract-v01`.
Primary objective: freeze a professional transient Measure tool before runtime implementation.

Authority order: AGENTS; Product Constitution sections 2-9; Master Plan Sync Protocol; Benchmark Evidence Standard sections 2-6; Interaction Standard section 15; Interaction Delivery Protocol; Product UI Design Spec sections 2.4/5/10/14/18/20; Final Exit Gate section G/C03. Navigation Standard sections 1/2/6/11 and Visual Standard sections 8-10 remain authoritative for presentation/navigation/capture/lifecycle.

The explicit attached C03 owner task is projected here before code. No new Master Plan resource/fingerprint is claimed. Benchmark facts are in `docs/benchmarks/P1_MEASURE_TOOL_EVIDENCE.md`; deviations/rationale in `docs/adr/ADR-008-phase-1-professional-measure-tool.md`.

Final Exit Gate provenance: read-only [PR #120 exact-head file](https://github.com/mtugur/AtrVisu/blob/0a8fb10c857921bfba02e72e89a31bb80b552a5f/docs/checklists/PHASE_1_FINAL_EXIT_GATE.md). The file is absent from this approved main. PR #120 is not synchronized, changed, merged or marked PASS. Stage A closes a silent interaction-contract gap, not the C03 runtime or Phase-1 exit gate.

## 2. Observed baseline (not new acceptance)

- No real transient viewport Measure exists. Quick Toolbar must not expose dead Measure UI (Design Spec section 2.4).
- `view.showMeasurements` in `commandSeedDefinitions.ts` means Precision Placement Helpers; App toggles existing `placementSettings.showMeasurementHelpers`. This is not real Measure.
- `MultiSelectionProperties.tsx` uses `calculateReferencePointMeasurementBetweenMachines` in `src/utils/placement.ts`: two machines, ordered B-A Plan deltas and Plan reference-point distance. It is not a 3D minimum-surface-distance calculation.
- Legacy Entity Adapter exposes canonical Machine/Civil dimensions and transforms; coordinates/units adapters own Babylon metres to domain millimetres and axis mapping.
- Camera setup exposes LMB orbit; the current viewport Pan authority handles MMB and retained secondary Pan routes. Measure must not redesign their camera math or ADR-001 body drag.
- There is no reusable app-level click confirmation classifier in this baseline: BabylonScene begins body-drag ownership on POINTERDOWN; selectionPicking resolves targets/selection, not click-versus-drag intent. The Measure-local classifier below is a new pre-runtime contract, not an existing runtime authority.

Stage A changes none of these runtime sources, registry records, preferences or schemas.

## 3. Registered route and semantic migration

Stage B must add one canonical registered viewport tool command `view.measure` and Feature Access record `viewport.measure`. The live command routes Quick Toolbar, View menu and Command Palette to the same transient tool authority. Default invocation toggles enter/exit. Tool controls dispatch typed actions through that command binding (kind, point source, Pick/Navigate, Restart, Finish, Exit); no private alternative tool store/creation route. Payload-dependent controls belong to the tool surface, not separate unparameterized palette entries. No new shortcut is frozen.

Feature Access and Surface Inventory must truthfully name the actual Quick Toolbar/viewport tool and live binding in the same Stage B package. No always-visible Inspector or Bottom Dock ownership. Tool activation requires a ready viewport; disabled reasons must be truthful. No geometry is required for Level Plane point measurement.

Migration decision: **retain** `view.showMeasurements`, its Tools placement, compatibility bindings, preference data and Precision Placement Helpers semantics. It never becomes an alias for Measure. `view.measure` is a new transient route, not a rename/reuse of a persisted placement toggle. Stage A performs no registry or data migration. Stage B Help/tooltips distinguish both and document only implemented functionality. Measure UI appears only with all required live behavior; no placeholder/no-op toolbar item.

## 4. Transient ownership and interaction state

- One viewport-owned transient session: inactive; active Pick or Navigate; measurement kind; explicit point source; confirmed operands; hover preview; result/invalid reason. No project/IndexedDB/UI-preference serialization, dirty transition, revision or Undo entry.
- Entry defaults: Distance, Pick, Geometry. Snapshot Runtime Selection IDs/order/primary read-only; do not clear, replace or toggle it. Tool operands/highlights are distinct from selection and disappear on exit.
- LMB in Pick confirms a valid preview point/entity only through the Measure-local confirmation classifier in section 4.1. LMB drag has no orbit or entity-move meaning in Pick; it cannot confirm a point. No browser `click`/Babylon pick default or normal body-drag classifier substitutes for this authority.
- Visible Pick/Navigate segmented control suspends/resumes picking without losing confirmed operands/result. In Navigate LMB uses unchanged orbit and cannot pick, select or body-drag. MMB Pan and wheel zoom remain available in both, with current camera authority/gesture semantics. Retained secondary Pan routes remain Pan, never measurement clicks.
- ViewCube, Fit and viewpoints may deliberately navigate through their existing commands. Navigation does not clear operands or change computed engineering values. No camera restore/compensation or Fit is triggered by tool entry/exit.
- Exiting preserves Runtime Selection and domain state. Camera equals its pre-entry state if the user did not navigate; after deliberate navigation, exit preserves that current camera rather than unexpectedly rewinding it. Measure itself causes no camera change.
- Switching kind or point source clears only transient operands/result/preview and starts that requested operation. Restart does the same without exiting; Navigate does not clear it. One completed result remains visible until one of these explicit actions or exit. A completed result cannot be silently overwritten by another click.
- Escape while the viewport/tool owns focus exits immediately in every partial/completed/invalid/Navigate state, discards all tool graphics/state, releases capture and returns focus to the invoking control. Exit button and command toggle use exactly that path. Blur/pointer cancellation cannot confirm a point; navigation capture releases without losing confirmed operands. Leaving the editor/project also clears the session.
- Modal/text-input keyboard ownership remains unchanged: do not steal Enter/Escape from another modal/editor. Domain-mutating commands are unavailable while the active Measure session owns the viewport, with a truthful tool-active reason; exiting restores their existing enablement. This includes Undo/Redo, placement, entity edits and Level/layer visibility edits. Camera/read-only commands remain usable. No command/lock/history authority is weakened.

### 4.1 Frozen Measure Pick confirmation classifier

This is an AtrVisu product decision for Measure only, not a vendor fact, shared selection rule or Pick-versus-Orbit heuristic. Stage B implements it without tuning:

- `MEASURE_PICK_CLICK_TOLERANCE_CSS_PX = 4`. Track the maximum Euclidean displacement from the original primary LMB pointer-down using `clientX/clientY` CSS coordinates, including the pointer-up position. A maximum displacement **<= 4 CSS px** permits confirmation; any observed displacement **> 4 CSS px** permanently cancels confirmation for that press, even if the pointer returns to its starting position. No DPR/render-pixel scaling, elapsed-time threshold, velocity, accumulated path-length threshold, smoothing or fallback is permitted.
- A stationary press/release and small human jitter inside the inclusive boundary confirm exactly once on pointer-up, never pointer-down. Use the same pointer ID and primary LMB press/release, both inside the viewport, with uninterrupted Measure Pick ownership. Recompute the valid preview candidate at that pointer-up position/current camera; an unavailable candidate confirms nothing. Existing operands/results are not removed by a rejected press.
- Capture the initiating pointer for this press. `pointercancel`, capture loss **before** a processed pointer-up, window/editor focus loss, release outside the viewport, tool exit, kind/source change, Restart or switching to Navigate cancels the pending confirmation and releases its resources. A later pointer-up cannot revive it. Normal capture release **after** the processed pointer-up does not undo its one successful confirmation. Cancellation leaves confirmed operands intact unless the explicit tool action independently resets/exits the operation.
- Movement beyond the boundary is a cancelled Pick press, not a camera gesture: it neither orbits nor selects/body-drags an entity. Navigate alone owns LMB orbit; MMB/secondary Pan never enters this classifier. There is no timeout/double-click shortcut or hidden handoff to navigation. Normal selection and ADR-001 Plan Move are unchanged outside Measure.
- M08 records real pointer paths, maximum CSS displacement, pointer identity, cancellation/release order, DPR, confirmed count and camera/domain invariants. Tests assert both sides and equality of the fixed boundary, not merely a helper boolean.

## 5. Picking and coordinate authority

Two visible, mutually exclusive sources; changing one is an explicit reset, not a per-hit fallback:

| Source | Valid operand | Miss/invalid behavior |
| --- | --- | --- |
| Geometry (default) | Nearest eligible visible Machine/Civil rendered surface hit; resolve its canonical entity key and actual world hit position, including imported GLB child transforms | No point/confirmation on empty viewport; visible unavailable preview. Never replace a miss with ground, camera-target depth or entity origin. |
| Level Plane | Ray intersection with the horizontal plane at the active Level's canonical FFL world elevation; capture Level ID/name/world mm once when an operation starts with this source (explicit source selection, Restart or kind change while Level Plane is selected) | Parallel/behind-camera/non-finite ray intersection unavailable; no alternate plane. Geometry does not intercept this explicitly chosen plane. |

Locked but visible geometry is readable; hidden entities/layers are excluded. Labels, selection boxes, collision/clearance envelopes, grid, HUD, annotation leaders, measurement graphics and proxy/helper meshes are not geometry operands. Planning Civil geometry may be picked as its actual visible geometry, but is not inferred as physical support. World-point measurements do not promise exact CAD edge/vertex/face topology or imported-model analytic accuracy.

Domain X=Plan X (Right), Y=Plan Y (Back), Z=world Elevation (Top). Babylon `(x,y,z)` metres adapt once to domain `(1000*x,1000*z,1000*y)` mm. Geometry hit elevation is actual world elevation; never snap it to Level/Floor. Level Plane is FFL, not physical Floor Area top/bottom inference; Floor thickness, machine support, negative-Level creation and contact solving are out of scope. Existing signed Floor bottoms remain valid geometry hits.

No placement grid, rotation, alignment or connection-point snap changes a Measure operand. Point confirmation uses the previewed valid world point at click time, not a stale camera ray. Camera changes clear/recompute only unconfirmed hover preview; confirmed world points stay fixed. Source/type/units and operand order are visible. Empty misses do not deselect normal selection.

The captured Level Plane is immutable for that operation. Navigation, camera/projection/theme changes and subsequent active-Level/datum observations cannot silently recapture it. Only the explicit operation reset paths named above capture the then-current active Level again; unavailable Level data produces an unavailable source, never Ground/geometry/camera-target fallback. Measure does not enable otherwise blocked Level edits to exercise this rule.

## 6. Measurement modes and calculation rules

### Distance

Confirm A, then preview B continuously; click B freezes the result. `Delta X/Y/Z = B-A`, signed; total `sqrt(dx^2+dy^2+dz^2)`. Also show explicitly named Plan distance `sqrt(dx^2+dy^2)` to reconcile C03 Plan/XYZ readout. A=B is valid zero, not NaN. Swapping order reverses deltas, never totals. Point markers, segment and axis-delta graphics/callout are genuine viewport presentation, not an Inspector-only diagnostic.

### Angle

Confirm A then B (vertex); preview C and click to finish. Angle between A-B and C-B is the interior 3D angle in `[0,180]` degrees, including collinear 0/180 when both arms are nonzero. Zero-length arm or non-finite input is invalid with a readable reason, no misleading 0/NaN result and no final confirmation. Show ordered A/B/C markers, two arms and angle arc/callout.

### Plan Area / Perimeter

LMB appends confirmed points; after the first point show a rubberband to the valid hover candidate, and after sufficient corners a projected polygon/closing edge. Calculate on **domain Plan XY**, not camera/screen coordinates or a tilted 3D surface. Retain every original picked Z in operand evidence. Explicitly label quantities Plan Area/Plan Perimeter, not surface area.

Freeze one horizontal **presentation** plane per Plan Area operation, with a visible source/elevation label:

- **Geometry:** capture `presentationElevationMm = A.zMm` from the first successfully confirmed geometry operand A. Before A there is no polygon/rubberband plane; a valid hover marker is only the actual geometry-hit preview. Project A, later vertices, live rubberband and closing edges to `(xMm, yMm, presentationElevationMm)`. Later differing-Z hits do not move the plane. Do not consult active Level, Ground, Floor support or camera-target depth to choose it.
- **Level Plane:** use exactly the explicit picking plane's FFL elevation captured at operation start under section 5, not a second capture at A. Project all polygon/rubberband vertices to that same captured elevation. Display the captured Level identity and elevation, not a silently updated active-Level label.
- For both sources the elevation remains fixed through camera/navigation/projection changes and later Level-context observations until explicit Restart, kind/source change or exit discards the operation. Restart under Geometry captures a new plane only at its next confirmed A; under Level Plane it recaptures the then-current active FFL at Restart. This is presentation only: Plan XY arithmetic, original operand XYZ and source evidence stay unchanged. Original-hit markers/leaders remain distinguishable from projected polygon vertices; no replacement operand Z or hidden fallback plane.

Enter with tool/viewport focus or visible Finish closes last-to-first exactly once after at least three distinct, non-collinear XY points. Do not overload double-click (which could append duplicates) or first-point snapping as completion. Fewer points, repeated vertices, zero-length edges, zero area, crossing edges or non-adjacent edge touches are invalid and Finish is unavailable with a reason. A final point equal to the first is not appended; use Finish. Simple concave polygons are valid; winding changes do not change positive area/perimeter. Use absolute shoelace area and closed XY edge-length sum. No holes, curves, subtract-area or arbitrary tessellated-surface promises. Restart clears an invalid sequence; Escape exits rather than committing it. No history Undo of tool points.

### Selected entity dimensions

Use the entry canonical Runtime Selection, not a second selection store. Exactly one eligible Machine/Civil supports Width/Depth/Height (mm), canonical **local** dimensions from existing adapters/helpers, independent of rotation, visual GLB bounding noise and camera. Show entity name/key and dimension lines/callouts oriented with that canonical footprint/height. Floor Area Plan Depth and Floor Thickness retain their existing meanings; do not reinterpret depth as thickness. Missing height is unavailable, not invented zero. Empty/multiple selection, annotation or Group makes this submode unavailable with a reason; Group derived bounds are not mislabelled as local entity dimensions. Re-enter with the desired normal selection; Measure picking never rewrites it.

### Entity pair reference measurement

Provide a viewport pair result for exactly two eligible entry-selected Machine/Civil entities, preserving Runtime Selection order A then B. Use their canonical front-left-bottom/reference transforms, with displayed names/keys and **Reference Point** label. Show signed XYZ, 3D distance and separately Plan reference-point distance; never call it minimum clearance, shortest GLB distance or collision separation.

For Machine/Machine, Plan deltas/distance must use the existing `calculateReferencePointMeasurementBetweenMachines` authority and equal its unrounded values. Any shared point-distance primitive must be reused/adapted, not implemented as competing Inspector vs viewport formulas. Mixed/Civil reference projection uses existing Entity/coordinate adapters; Floor reference Z is its canonical bottom, not its top-relative Inspector anchor. Existing machine-only diagnostic remains intact, honestly labelled and is not itself claimed as the viewport tool. Invalid selection count/type disables this submode, with no inference of another operand. No C04 alignment or C05 mixed editing work.

## 7. Numerical and presentation oracle

- Canonical values remain finite full-precision mm, mm2 and degrees; rounding is presentation only. World coordinates must never be reconstructed from rounded callout text.
- Show mm distances/deltas/dimensions/perimeter to 3 decimals, angle to 3 decimals, area mm2 to 3 decimals plus m2 to 6 decimals (`mm2/1,000,000`). Fixed deterministic decimal formatting, explicit units/axis labels, and normalize displayed negative zero only.
- Degeneracy tolerance: coincident point/arm/edge <= `0.001 mm`; zero polygon area <= `0.001 mm2`. Polygon intersection predicates must reject crossings/touches consistently within the same length tolerance, not camera-pixel thresholds.
- Deterministic numeric fixtures: error <= `0.001 mm` length/delta/dimension, `0.001 degree` angle, `0.001 mm2` area. Real rendered-surface picking vs analytically projected fixture coordinates: <= `1 mm` point/length, `0.05 degree` angle, `100 mm2` area; all captured operand coordinates and analytic expected results are recorded. Arithmetic on those captured points must still meet the stricter calculation tolerance. These allowances are not permission to round/scale the domain or hide a solver defect.
- Confirmed values under orbit/pan/zoom/projection/dock/theme changes: calculation tolerances above, never recompute picks from screen pixels. Graphics reproject every rendered camera update, without scene/canvas recreation or stale labels. Offscreen/occluded points have honest leaders/edge indicators; do not move the engineering point to make a label fit.
- Neutral engineering lines/markers and restrained contrast backing per Visual Standard, legible in both themes. No collision-warning/category reuse, large opaque cards, selectable annotations or saved dimensions. Preview and confirmed result are distinguishable.
- Callouts use existing viewport HUD safe-area authority. At 640x800 use a compact wrapping result strip/leader layout inside that safe area, not clipped/offscreen labels or document horizontal overflow. Tool controls/results stay keyboard/ARIA named; valid/invalid state is not color-only. HUD relocation never changes camera/projection/domain.
- Clean commercial PNG/export excludes tool markers/callouts/controls using existing capture authority, without altering session/domain or PNG resolution. No measurement result is serialized into commercial/project schemas.

## 8. Frozen Stage B acceptance/evidence

Real pointer/keyboard controls must drive critical paths; read-only diagnostics can observe world/camera/state but cannot manufacture tool operands or directly mutate Babylon. Observe tool state/results, geometry hits, true rendered callouts and invariants together; helper-only green tests are insufficient.

| ID | Required real route and result |
| --- | --- |
| M01 | Empty scene enter via Quick Toolbar and View/Palette registered routes; Geometry miss commits nothing; choose Level Plane, pick two points, preview then confirm; Escape removes all tool artifacts. |
| M02 | Geometry Distance over real Machine/Civil/imported GLB, elevated Level and signed Ground slab bottom. Negative Plan coordinates and mixed world elevations retain mm/XYZ signs; locked visible is readable, hidden excluded. |
| M03 | Fixtures A=(0,0,0), B=(3000,4000,12000): XYZ=(3000,4000,12000), Plan=5000, total=13000 mm. Reverse, zero and non-finite cases. Real fixture hits complement pure calculations. |
| M04 | Angle with A=(1000,0,0), B=(0,0,0), C=(0,1000,0): 90 degrees; also 60, 0, 180 and zero-arm invalid. Capture ordered markers/arc and live C preview. |
| M05 | 4000x3000 Plan rectangle: 12,000,000 mm2 / 12 m2, perimeter 14,000 mm. Geometry fixture A=(0,0,1200), B=(4000,0,6000), C=(4000,3000,-350), D=(0,3000,2500) retains all original Z; every projected polygon/rubberband vertex is Z=1200 mm captured at A. The same XY fixture on explicit Level 2 FFL=6000 has operand/presentation Z=6000 mm captured at operation start. Record source, captured plane authority/time, original XYZ and projected XYZ; navigation/Level-context observations cannot move either plane. Reversing subsequent winding with A fixed preserves plane/area/perimeter; choosing a different first A under Geometry intentionally captures that A's Z. Verify Restart recapture for both sources without enabling blocked Level mutation; real clicks+Enter and clicks+Finish, concavity, duplicate/crossing/touching/collinear invalid and Escape at partial/invalid/completed phases. |
| M06 | Single rotated Machine and Civil dimensions equal canonical adapters before/after navigation. Floor dimension semantics intact; missing/unsupported selection gives reasons. Two machines match existing Plan pair diagnostic; mixed Machine/Civil pair records named canonical reference points, not surface distance. |
| M07 | Pick LMB cannot select/body-drag/orbit. Navigate LMB orbits without adding operands; back to Pick resumes intact. MMB Pan and wheel work in both. ViewCube/Fit/viewpoint routes preserve points/results; default, wheel-zoomed and oblique perspective plus Top and Front/Right orthographic. Side-parallel Level Plane correctly unavailable, with no fallback. |
| M08 | Real primary-LMB Pick presses over valid geometry: stationary (0), small jitter (3), boundary (4), beyond boundary (5 CSS px), and >4 excursion followed by return to origin. First three confirm exactly once on pointer-up; last two confirm nothing, never orbit/body-drag/select. Repeat at DPR 1 and 2 with the same CSS trajectories/outcomes; record render size separately, never scale tolerance. Include a multi-step path wholly within radius 4 despite total travel >4, valid release-point preview, invalid/miss and outside-viewport release. Exercise pointercancel and lost capture before release, focus loss, switching Navigate/reset/exit while pressed, and late pointer-up: no confirmation; normal post-up capture release cannot retract a confirmation. If the platform cannot naturally generate pointercancel/lost capture, use real press/move plus browser PointerEvent/capture cancellation only (never diagnostic operand/state mutation), paired with deterministic event-sequence coverage and truthful provenance. Existing Escape/Exit/toggle/re-entry, focus/modal ownership and command enablement remain required. No history/dirty/camera mutation, prior selection IDs/order/primary intact; normal body drag/selection/keyboard/camera work after exit. |
| M09 | 1440x900, 1024x768, 640x800 at DPR1 in light/dark, docks open/collapsed and Inspector Auto/Pinned; neutral legible live/confirmed callouts, no dead control/document overflow. Same canvas/engine/scene generation, no remount; graphics follow actual camera frames. |
| M10 | Save/reload current and migrated preferences: transient session absent, existing Precision Placement Helpers compatibility unchanged. Clean commercial PNG has no tool graphics and retains capture authority. Project/layout bytes/schema, transforms/Elevation, Level/layer state, selection, history count/index and dirty remain invariant for every tool-only route. |

M01-M10 evidence must include exact source head/CI run, viewport CSS/render size and DPR, input trajectory/command route, point source/Level/world positions, result/unit text, before/after Runtime Selection, domain transforms, history/dirty, camera/projection and engine/scene/canvas identity. M08 additionally records the section 4.1 classifier observations; M05 records captured presentation elevation/authority/time and original versus projected XYZ. Camera differences are permitted **only** for explicitly exercised navigation; compare exit against the latest navigated pose. For dock/presentation-only actions require world-anchor projection delta <=1 CSS px under existing Navigation Standard.

Stage B exact-head reviewer artifact `p1-close-measure-tool` must contain a manifest/JSON linking each M01-M10 scenario to its real-input test and observations, screenshots of Distance preview/result, angle, area, dimensions/pair, invalid/miss, and narrow layouts in both themes. Every mode must have visible evidence, not numeric-only assertions. No Stage A runtime artifact is manufactured.

Zero console.error/pageerror/uncaught/Maximum update depth/GL_INVALID_VALUE/removeChild in valid flows; no known-warning filtering. Preserve atomic lock, snap, Group/history, Floor/FFL, native asset, camera and panel authorities. Tests cover clean/current/migrated preferences and rejected interactions, not only the happy path.

## 9. Interaction Change Gate applicability and delivery

Mapping `INTERACTION_CHANGE_GATE.md` A-J without a runtime PASS claim:

- A: authority order, official evidence, task similarity/differences, frozen section 15, ADR and observable oracle exist before code; independent contract review PENDING.
- B: one docs-only C03 objective, no runtime/package/schema/workflow changes, no C04/C05/C07/C09 or PR #120 edits.
- C: Selection/Entity/coordinate/placement/history/camera/panel authorities preserved; transient tool cannot become domain truth or mutation transaction.
- D: Pick/Navigate/plane/geometry/finish/exit are explicit; the fixed Measure-only 4 CSS px confirmation boundary cannot choose Orbit or be tuned in Stage B. Geometry first-A Z and operation-start Level FFL own Plan Area presentation separately; no hidden fallback, movement solver or camera remapping.
- E: runtime scenarios M01-M10 are required Stage B, N/A as executed Stage A evidence; baseline CI cannot certify them.
- F: no source/console suppression change; Stage B no-red-console/state-loop evidence PENDING.
- G: governance review/merge before separately authorized Stage B; normal one implementation plus at most one consolidated frozen-contract correction budget; reviewer owns Contract Verified.
- H: no new Stage A screenshots or manual test; Stage B mixed-scene and responsive visual acceptance required.
- I: Stage A repository/governance Automation Green awaits exact-head CI recorded in PR body; Contract Verified PENDING independent review; Product Accepted N/A for docs-only Stage A, PENDING for future runtime. Runtime Automation Green N/A/PENDING, never inferred from baseline tests.
- J: stop on contract conflict, tuning/hidden fallback, code-first benchmark backfill, user-error masking or scope expansion. Do not rewrite standards merely to bless implementation.

Only after Stage B CI and independent realistic contract review may the Product Owner perform one comprehensive final manual acceptance: all modes/preview/cancel, both themes, navigation, dimensions/pair and narrow readability in the canonical mixed industrial scene. No exploratory QA is delegated now. C03 and Final Exit remain PENDING until actual required acceptance; this Stage A Draft PR is not merged by the implementer.
