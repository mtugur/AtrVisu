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
