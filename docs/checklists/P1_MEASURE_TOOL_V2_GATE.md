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
