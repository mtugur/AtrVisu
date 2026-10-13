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

## Consolidated recovery candidate (PR #129 preserved)

The recovery is prepared on `feat/c03-measure-v2-recovery-v01` from exact
`c8d69bceee1f0307e07ad6299f77ae64dd7cdee9`. PR #129 remains an unchanged Draft.
The pre-implementation correction matrix is
`docs/audits/c03-measure-v2-recovery-plan-v01.md`, committed before runtime edits.

- [x] Registered command/panel/Feature Access route exercised from real UI.
- [x] Inspector registered visibility and Auto/Pinned presentation restored.
- [x] One saved-dimension renderer; legacy labels/leaders exclude dimension annotations.
- [x] Default Depth and explicit Overlay, including actual machine occlusion pixel comparison.
- [x] Selected endpoint grips and independent text drag commit through registered Measure/history.
- [x] Semantic hover, visible marker hit region, Shift lock and deterministic Tab cycling.
- [x] Separate witness segments, arrow/tick fit, label/leader placement and style controls.
- [x] Canonical project style serialized and included in Undo; per-item display mode remains explicit.
- [x] Level identity, captured area plane, full-precision references and text placement serialized.
- [x] Associative move/rotate/dimension changes, orphan visibility and explicit reassociation covered.
- [x] Real project save/hard reload; clean PNG includes saved dimensions and excludes session/grips.
- [x] M20-M30 targeted unit/component/Chromium evidence implemented.
- [ ] Complete local gate and exact-head CI successful (recorded in the recovery PR Validation section).
- [ ] Independent Contract Verification against the frozen contract and exact-head artifact.
- [ ] Product Owner acceptance (must not be requested before independent verification).

PR #130 independent review `6144077908` adds executable checks for semantic
grip reassignment and Free Geometry Hit, retained Tab/Shift candidate choice,
angle and area readability, and Level orphan/repair. These tests first exposed
the candidate-choice race, missing captured-plane presentation, and an angle
label collision; the bounded corrections are in the same PR. Existing semantic
grip and orphan behavior passed the new regression routes without changes.

Visual review `6155647277` reproduced duplicate transient/saved values,
marker/value collisions, clipped selectors and ignored metric area styling on
`750e0fb`. The bounded correction keeps transient data and saved annotations
separate while using the equivalent visible saved graphic once. Hidden/deleted
or changed saved references do not suppress independent transient results.
Shared measured fit avoids marker/label extents; one style formatter governs
area/perimeter units and two-line presentation. Full-text control geometry,
actual text bounds, orbit/zoom and clean capture are asserted in Chromium at
640/1024/1440.

Evidence artifact: `c03-measure-v2-recovery`, 39 PNG/JSON pairs (78 files).
`scripts/validate-measure-v2-evidence.mjs` rejects missing/stale evidence, console
errors, failed dock invariants, failed real occlusion, failed clean capture, and
missing reviewer-route behavior evidence.
Automation Green is determined by the actual exact-head run, not these implementation checkboxes.
Contract Verified: FAIL (BLOCKED until independent visual re-review); Product Accepted remains
PENDING and is not inferred from automation.
