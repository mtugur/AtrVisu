# C03 Professional Measure Tool V2 - Stage A Gate

Status: Stage A contract/benchmark gate
Base main: `c224a3c4baee811ff3f03869fd82b9ed80d5be13`

## Authority

- `docs/benchmarks/P1_MEASURE_TOOL_V2_BENCHMARK_REVIEW.md`
- `docs/product/P1_MEASURE_TOOL_V2_CONTRACT.md`
- `docs/adr/ADR-009-c03-professional-measure-v2-architecture.md`
- `docs/standards/ATRVISU_INTERACTION_STANDARD.md` §15
- Product Constitution / Interaction Delivery Protocol

## Stage A acceptance

- [x] Official benchmark research performed before V2 runtime work.
- [x] Benchmark facts separated from AtrVisu decisions.
- [x] Adopt / Adapt / Reject decisions recorded.
- [x] Transient Measure Session separated from persistent Reference Dimension.
- [x] Dedicated right-dock Measure surface defined.
- [x] Semantic Machine/Civil anchor model defined.
- [x] Editable reference / reassociation model defined.
- [x] Orphan state defined.
- [x] Professional dimension graphics defined.
- [x] Depth-aware vs explicit Overlay policy defined.
- [x] Dimension Style model defined.
- [x] Persistence and visibility model defined.
- [x] Runtime Selection / camera / viewport invariants preserved.
- [x] Stage B acceptance families M20-M30 defined.
- [x] C04/C05/C07/C09 scope explicitly excluded.

## Stage B implementation entry criteria

Do not start runtime implementation until the implementation package points to this gate and includes:

- [ ] `view.measure` command route.
- [ ] `viewport.measure` Feature Access route.
- [ ] `panel.measure` Panel Registry route.
- [ ] Annotation persistence/schema integration.
- [ ] Measure Session authority.
- [ ] semantic anchor/inference authority.
- [ ] dimension graphics renderer.
- [ ] Dimension Style authority.
- [ ] reference editing/reassociation lifecycle.
- [ ] persistence/reload tests.
- [ ] M20-M30 adversarial/runtime evidence plan.

## PR governance declaration

The PR body carries the mandatory Scope, Authority, Interaction declaration, Runtime/console, Validation and Stop-rule sections. The next exact-head Quality Gate run must validate this declaration against the frozen benchmark record.

## Product acceptance boundary

Stage A is not Product Accepted for runtime behavior.

PR #126 remains a rejected runtime prototype/baseline and must not be merged as the V2 implementation.

The next bounded package is C03 Stage B V2 runtime implementation. It must be implemented against the frozen V2 contract rather than incrementally tuned from PR #126.

## Post-stop-rule Stage A governance - T03/T04/T05

Base main: `2bbee57b100bb12162c703440c9241e4c1428727`.
Auditable runtime baseline: PR #130
`e9afacba48467ec9caac8a9f74c2772e444d22d5`; PR #129 unchanged.
Decision provenance: manual review `6188819499`, independent stop-rule review
`6189493355`, and subsequent explicit Product Owner approval. No runtime edit
or new implementation branch is authorized by this documentation package.

- [x] Top-corner identity, canonical coordinates, persistence/association and repair specified.
- [x] Visible discovery and semantic lock identity distinguished.
- [x] Invisible lock cannot be confirmed accidentally by viewport click/generic completion; explicit named confirmation and unavailable state specified.
- [x] Depth/Overlay isolated from application chrome without camera changes.
- [x] Shared header controlled two-row behavior preserves all existing controls.
- [x] Existing benchmark facts and approved AtrVisu adaptations separately mapped.
- [x] T03/T04/T05 future runtime oracles and T01/T02/T06 preservation recorded below.
- [ ] Independent governance review of this exact-head delta.
- [ ] Explicit Stage B authorization from an approved synchronized exact baseline.

Stage A Automation Green is recorded by the exact-head Quality Gate linked in
the governance PR Validation section, not inferred from these checkboxes.
Stage A Contract Verified: PENDING independent review. Product Accepted: N/A
for documentation only. PR #130 runtime T03/T04/T05 remain FAIL; affected
Contract Verification is REOPENED and Product Accepted remains FAIL. Existing
CI is not evidence that these newly frozen runtime oracles pass.

### Post-stop-rule acceptance (future Stage B; not executed here)

| Oracle | Required interaction/assertions and evidence |
| --- | --- |
| T03 vocabulary / coordinates | Unit/contract: all four exact top IDs; positive finite canonical sizes; existing bottom/center IDs unchanged. For every matching top/bottom pair assert identical XY and top Z = bottom Z + heightMm using existing getFootprintCornersFromReferenceMm/coordinateReference. Cover non-origin placement and nonzero positive/negative Plan rotation for Machine/Civil including Column, not only nominal offsets. Preserve front-left-bottom-v1 placement and corner order; no re-centering, render bounds or second coordinate authority. |
| T03 visible discovery | Chromium: rectangular vertical Column, comparable top/bottom visibility and camera angles; each visible top corner/center reachable by actual hover/click, deterministic Tab cycling and deliberate lock. Occluded back-face/hidden-layer/chrome-covered candidates absent from normal discovery. Visible silhouette marker remains usable without an exact interior surface hit. Record eligible IDs, world/screen coordinates, occlusion and real interaction result. |
| T03 invisible lock | Acquire a visible lock, then separately make it offscreen, chrome-covered and scene-occluded. Identity retained; no through-geometry/chrome dot/text. Panel names entity/anchor/coordinates/reason; valid resolved eligible references remain explicitly confirmable in all three states without exposing the point. Reason comes from the existing read-only projection/shell/occlusion observations, in that precedence order, or truthful Not currently visible when the precise category is unavailable. Ordinary viewport clicks and generic completion keys cannot invoke explicit confirmation. Activate only the named panel control by pointer/focused keyboard in separate fixtures: the displayed identity confirms once. Deleted/unresolved/unsupported/non-finite references disable confirmation with reason; no substitute. Restore visibility and verify existing 4 CSS px/cancel behavior. |
| T03 persistence / reference edit | Grip replacement and editor selection use top-anchor identity. Keep, move/rotate/canonical dimension change, Undo/Redo, save/hard reload, delete/orphan and explicit reassociation preserve authority and exact references. Test reference edits without mutating measured entities. |
| T04 compositing | Chromium at 1440x900, 1024x768 and 640x800, side-panel/bottom-sheet and dock resize/collapse/reopen. Bring candidate dots/text and dimension graphics behind real open panels. No Measure pixels paint over application chrome in Depth or Overlay; panel pointer/keyboard controls work without confirming an operand. Open viewport candidates remain usable; no blanket hiding. Include actual compositing/occlusion assertions plus PNG, not only DOM bounding boxes. |
| T05 header | Same sizes, default and minimum permitted panel widths, Inspector Auto/Pinned and Inspector/Measure switching. Assert every tab/indicator/control pair does not overlap, full header containment, no clipping/hiding and preserved click-target sizes. Real pin/unpin/collapse/reopen pointer and keyboard actions retain correct state. Two rows get sufficient header height; no new responsive breakpoint or shell redesign. |
| T01 / T02 / T06 protection | Real free two-point distance; Plan Area Finish/Keep; saved associative dimension follows move/rotate/resize through history and save/reload. Existing canonical values/units/references and capture policy unchanged. |
| Shared invariants / evidence | Presentation-only operations preserve camera, canvas identity/scene generation, selection, transforms/dimensions, confirmed operands, history/dirty and Level. Every route collects unfiltered console/page errors (zero), source-head provenance, geometry/state before/after and results in PNG/JSON. No diagnostic-only state mutation or arbitrary sleeps as acceptance. |

Map T03 to M24-M27, T04 to M20/M28/M30, T05 to M20/M29/M30. Runtime unit,
contract and Chromium tests must implement these oracles only in a separately
authorized Stage B package. Independent Contract Verification precedes any
Product Owner manual re-acceptance; CI alone cannot supply either decision.

Review `6191963586` clarifies the two T03 oracles above without executing them.
The PR declaration must state **N/A for new delta; unchanged-main regression CI
successful** for the prior completed run, never check a new-delta runtime console
acceptance claim. New exact-head CI and any declaration-policy incompatibility
are reported separately in PR Validation; runtime/CSS/tests stay unchanged.

## Renewed Stage A task-design gate - PR #133 acceptance failure

Authority: [review/product decisions 6267144838](https://github.com/mtugur/AtrVisu/pull/133#issuecomment-6267144838).
Read-only source head: `17763309b532813a7e004d608992073a97c08bb0`.
Governance base: main `55e9e58d4761c765c16c834e3b0a322e5dc67bd6`.
Earlier sections record earlier packages, not acceptance of this delta.

- [x] Read-only coordinate/calculation, candidate-loss and entry-selection findings linked to exact source in V2 section 21; unknown manual A/B data explicitly identified, not labelled a proven calculation defect.
- [x] One complete user-journey card in V2 section 21; preview identity/height, continuous corner approach, per-entity dimensions and Keep/review task defined before code.
- [x] Existing official VC/Navisworks facts rechecked and separated from AtrVisu adaptations in benchmark section 10.
- [x] §15, V2 contract and ADR-009 agree on the bounded delta; inherited exactly-one restriction explicitly superseded without changing local dimension math.
- [x] Canonical Entity/Runtime Selection/coordinates/Annotation/Level/history preserved; no bulk-save/schema or unrelated feature work.
- [ ] Independent review accepts this exact Stage A design delta.
- [ ] A separate bounded Stage B implementation package is explicitly authorized.

Stage A Automation Green: exact-head repository Quality Gate result belongs in
the new governance PR Validation section. Runtime evidence: N/A - governance-only
/ not executed. Stage A Contract Verified: PENDING independent review.
Stage A Product Accepted: N/A. PR #133 task-level Contract Verified: REOPENED;
Product Accepted: FAIL. PR #129/#130/#133 remain unchanged Draft baselines.
Do not solicit another owner exploratory test or infer acceptance from CI.

### Task acceptance matrix (future Stage B, NOT EXECUTED here)

| Task / mapping | User route and independent oracle | Required evidence |
| --- | --- | --- |
| A - real 3D references (M21/M24/M26/M27) | Start with two differently elevated/height Machine/Civil fixtures with independently calculable canonical top/bottom anchors. In Z+ hover and inspect A and B name/ID, anchor/source and XYZ before each confirmation. Compare signed B-A XYZ, 3D norm and Plan XY norm; use a fixture where Delta Z is nonzero. Switch top/plan/oblique and perspective/orthographic, Depth/Overlay, then Keep/save/hard reload. Same references/XYZ/values persist when only view changes; no flattening or anonymous bare length. Move/rotate/resize geometry separately and verify associative recomputation/history, not invariance to real geometry change. | Exact source SHA; entry fixture dimensions/transforms/Level; unrounded A/B entity+anchor IDs/XYZ and result tuple before preview, confirmation, orbit and reload; paired PNGs showing readable identities/3D/Plan/Delta Z. Do not substitute a sloping screenshot for an arithmetic oracle. |
| B - offered-corner continuity (M21/M24/M25) | Real interpolated pointer paths from body to each of the four offered visible top corners, including silhouette and overlapping-neighbour fixtures. An intermediate mesh miss or adjacent body hit inside active context cannot erase/replace the still-visible offered target. Test intentional outside-context body handoff, pointer leave/reset release, nearest highlight, Tab cycle and Shift lock. Same draw/cycle/hit set; each visible target clicks exactly once. Occluded/chrome-covered/hidden-layer points remain unavailable; invisible deliberate locks retain only the explicit panel confirmation route. | Per-path samples with pointer CSS coordinates, active entity, offered stable IDs, screen/world positions, visibility reasons, highlighted/locked/confirmed IDs; PNG sequence and JSON. Test 4 CSS px press cancellation separately; no enlarged hit radius, timeout/grace/hysteresis tuning, final-position teleport or suppressed missed click. |
| C - per-entity dimensions (M20/M26/M27/M29) | Select one, then two Machines before Measure activation; repeat with Civil and mixed eligible/unsupported entries. Record ordered Runtime Selection/primary at entry, choose Selected Entity Dimensions, inspect all named local W/D/H groups; primary eligible group initially active, otherwise first eligible entry. Activate each group: only its transient viewport graphics change. Verify canonical rotated dimensions, Floor Plan Depth/Thickness, unsupported/missing-data reasons and explicit zero-eligible guidance. Switching Kind/Restart does not reseed. Explicit Pair Reference still requires exactly two and labels reference distance, not clearance. | Before-entry selection/primary, grouped entity IDs/names/dimensions/reasons, active visual-group ID and unchanged Runtime Selection. Real panel/keyboard interaction and PNG/JSON, not fabricated panel-local selection. Two eligible objects cannot yield an unexplained empty result. |
| D - explicit Keep and saved authority (M25-M27/M29) | From two result groups, Keep the named active entity only: exactly one existing associative dimensions Annotation and one Undo transaction. Activating another row creates no entity/history/dirty change. Undo/Redo and save/reload preserve the saved entity identity, style/visibility and full-precision authority. Change geometry, delete/orphan and reassociate through current routes; no world-point fallback or bulk save. Repeat distance and Plan Area T01/T02/T06 routes unchanged. | Annotation/reference identities and transaction/history/dirty counts before/after each operation, reload and geometry change; existing LevelPointRef behavior retained. PNG+JSON prove actual saved reference, not an independent numeric snapshot. |
| E - integration invariants (M20/M28-M30; T04/T05) | Run tasks A-D at 1440x900, 1024x768 and 640x800 with Inspector Auto/Pinned, Measure switching and panel resize/collapse. Depth/Overlay remain below application chrome; shared header remains usable. Presentation-only actions retain entity transforms/dimensions, Level, selection/primary, history/dirty, camera and same canvas/scene lifecycle. Explicit navigation may change camera only, never confirmed A/B. | Before/after invariant snapshots; screenshots with controls and real offered points; matched pointer/focus/DOM conditions for chrome pixel tests. Unfiltered console/page errors and WebGL context/lifecycle observations. No test-only mutation, arbitrary sleeps or renderer bypass masquerading as normal product acceptance. |

New task outcomes are PENDING runtime implementation/reviewer verification, not
PASS from the existing T01-T06 matrix. Keep the earlier T01/T02/T06 protection
and T04/T05 oracles alongside this matrix. Exact-head PNG/JSON and realistic
user routes precede independent Contract Verification; only then may final
Product Owner acceptance be requested. No Stage B work is part of this PR.

## Issue #139 integrated recovery - independent oracle before code

Baseline #136: `dc1ac534eff517410f41ebe390ec513b494ebd8b`, Product Accepted FAIL.
Authority: V2 section 22 / ADR-009 / benchmark section 11 / Issue #139.

| Task | Independent required user oracle |
| --- | --- |
| R1 | Saved nonempty Sales Layout and clean entry; actual selection, persisted collapsed/Measure-tab and Auto/Pinned; visible identity/elevation, genuine edit to 1400, lock reason. Old-head literal empty state must be isolated, not assumed. |
| R2 | Real interpolated pointer picks different-height semantic A/B, previews identities/XYZ and deltas; Z+ to Y+ to oblique and camera projection do not reinterpret them. |
| R3 | A=(0,0,0), B=(3000,4000,1200): 3D sqrt(26440000), XY 5000, XZ sqrt(10440000), YZ sqrt(17440000), X 3000, Y 4000, Z 1200. Actual/projected XYZ, scene treatment, keyboard and serialization. |
| R4 | Two selected objects, manual desired A/B, replace either before/after Keep, associative recompute; diagnostic origins distinct, NOT READY clearance never returns fake length. |
| R5 | Same A to B1/B2, individually Keep, reuse old corner in new Point to Point; chain retains preceding B and totals route. No consumed point, auto persistence or duplicate Keep. |
| R6 | Readable Inspector while picking; explicit pause/edit, actual elevation change, resume, saved recompute, one Undo per action, save/reopen and orphan/reassociation. |
| R7 | All at 1440/1024/640, persisted preferences, overlap/occlusion, saved label near corner, Auto/Pinned, keyboard, locked layers, clean console and stable canvas/chrome. Old A-E/T01-T06 preserved. |

- [ ] Genuine old-head input/PNG/JSON failure evidence, with truthful Inspector reproduction conditions.
- [ ] New exact-head seven-task input/video/PNG/JSON and fail-closed validator.
- [ ] Full previous suite and both Chromium phases / old validators.
- [ ] Independent non-author normal Windows Chrome check (NOT VERIFIED if unavailable).
- [ ] Independent Contract Verification.
- [ ] Owner Product Acceptance.

No assertion, behavior or feature may be silently weakened to claim completion.
