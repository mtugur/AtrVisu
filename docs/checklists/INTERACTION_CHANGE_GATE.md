# AtrVisu Interaction Change Gate v1.1

Status: Mandatory checklist for any PR that changes user interaction or interaction-adjacent state synchronization.

A PR may not be declared Contract Verified until every applicable item is PASS or explicitly N/A with a reason.

## A. Contract and benchmark

- [ ] The task cites `docs/product/ATRVISU_PRODUCT_CONSTITUTION.md`.
- [ ] The task cites the exact section(s) of `docs/standards/ATRVISU_INTERACTION_STANDARD.md`.
- [ ] A traceable benchmark evidence record satisfying `docs/standards/ATRVISU_BENCHMARK_EVIDENCE_STANDARD.md` is linked.
- [ ] A named mature benchmark precedent is recorded for changed behavior.
- [ ] Benchmark evidence existed before implementation; it was not selected after coding to rationalize the implementation.
- [ ] The benchmark is task-similar, not merely a familiar brand or rendering framework.
- [ ] If credible benchmarks differ, the difference and AtrVisu choice are recorded.
- [ ] If the interaction standard is silent, implementation was stopped until the standard was extended.
- [ ] If AtrVisu intentionally deviates from the benchmark, an ADR exists and explains why.
- [ ] The proposed behavior is written in user-observable terms before implementation details.
- [ ] Forbidden behaviors/regressions are listed.

## B. Scope control

- [ ] The PR still has one primary product objective.
- [ ] New product decisions discovered during implementation have not been smuggled into the PR.
- [ ] A correction is demonstrably necessary for the original acceptance contract.
- [ ] No unrelated visual, data-model, state, camera, or interaction redesign has been added.
- [ ] If the PR scope changed materially, the PR title/body and acceptance contract were explicitly re-frozen before further implementation.
- [ ] A visual/iconography PR has not silently become a general interaction-engine project.

## C. Authority integrity

- [ ] Selection uses the canonical Selection authority.
- [ ] Domain mutation uses canonical Entity/command/history authorities.
- [ ] Snap uses canonical placement settings/units.
- [ ] UI presentation/proxy state does not become a competing domain truth.
- [ ] Group/multi-selection mutation is atomic where required.
- [ ] One continuous user gesture maps to one meaningful Undo transaction.
- [ ] The implementer did not modify Product Constitution / Interaction Standard / Benchmark Standard merely to make existing code compliant.

## D. Interaction semantics

- [ ] Click, drag, hover, handles, keyboard and camera gestures have non-overlapping documented meanings.
- [ ] Camera angle cannot silently change the semantic axis or direction of an explicit manipulator.
- [ ] Degrees of freedom are visible/discoverable.
- [ ] No hidden fallback changes the interaction model mid-gesture.
- [ ] No threshold-tuning workaround is being used to compensate for a wrong interaction model.
- [ ] Direct manipulation is immediate and does not add uncontracted lag/catch-up/hysteresis/smoothing.
- [ ] Framework-default visual primitives are not being treated as proof of final product UX quality.

## E. Realistic runtime verification

- [ ] Clean-state scenario passes.
- [ ] Persisted-current-preferences scenario passes.
- [ ] Migrated-preferences scenario passes when applicable.
- [ ] Inspector Auto/Pinned states pass when applicable.
- [ ] Relevant docks expanded/collapsed pass.
- [ ] Single Machine passes when applicable.
- [ ] Single Civil passes when applicable.
- [ ] Group/multi-selection passes when applicable.
- [ ] Snap on/off passes when applicable.
- [ ] Undo/Redo passes.
- [ ] Save/reload or hard reload passes when state/persistence is relevant.
- [ ] Real pointer/keyboard interaction is used for at least one critical E2E path; diagnostics-only mutation is not sufficient.
- [ ] Tests assert user-observable direction/axis/transaction semantics, not only internal helper values or bounded numerical metrics.

## F. Console and state-loop gate

- [ ] Zero `Maximum update depth exceeded` in valid runtime workflows.
- [ ] Zero uncaught runtime exceptions.
- [ ] Zero blocker WebGL/DOM lifecycle errors.
- [ ] Console collectors do not suppress or filter known blocker text.
- [ ] If the user reported a stack trace, an E2E reproduction covers the same component/workflow path.
- [ ] Claimed root cause explains the observed stack/path; unrelated fixes do not close the issue.
- [ ] Continuously changing domain values do not trigger prop -> effect -> local-state feedback loops in Inspector controls.

## G. Correction budget / reviewer independence

- [ ] The frozen interaction contract existed before implementation.
- [ ] This package is within the normal budget of one implementation round plus at most one consolidated correction batch.
- [ ] If another tuning round would be needed, implementation stopped and returned to benchmark/contract review.
- [ ] The implementer reports Automation Green; Contract Verified is decided by review against the frozen contract and runtime evidence.
- [ ] User final acceptance is requested only after reviewer-side contract/runtime inspection is complete.

## H. Visual/product quality

- [ ] Framework-default gizmos/controls are not declared final merely because they function.
- [ ] New viewport affordances are reviewed in the canonical mixed industrial scene.
- [ ] State colors and visual hierarchy follow AtrVisu visual semantics.
- [ ] The new affordance does not obscure equipment/civil context or dominate the viewport.
- [ ] Manual product acceptance is requested only after automated/contract review is complete.

## I. Gate labels

Record all three independently:

- Automation Green: PASS / FAIL
- Contract Verified: PASS / FAIL
- Product Accepted: PASS / FAIL / N/A

A PR is merge-ready only when all required labels are PASS.

## J. Stop conditions

Stop implementation and return to benchmark/contract review immediately if any of these occur:

- the same basic interaction needs a third tuning round;
- camera-angle-specific exceptions accumulate;
- direction-sign fixes, hidden fallback modes, gain clamps or hysteresis are introduced to preserve intuitive behavior;
- user manual testing repeatedly finds behavior that contract tests consider acceptable;
- a visual/UI PR grows into an interaction-engine redesign;
- a user-reported red-console error remains reproducible after the claimed fix;
- green CI conflicts with direct product evidence;
- the contract is being rewritten after implementation to bless the current code.

When a stop condition fires, another local tuning pass is prohibited until the interaction contract and benchmark precedent are re-reviewed.

## C03 V2 post-stop-rule Stage A evidence

This is a governance-only contract delta after PR #130 reviews `6188819499`
and `6189493355`, with explicit Product Owner authorization of the decisions.
It does not reset the runtime correction budget, approve PR #130, or start
another tuning round. Product Constitution/protocol authority is unchanged.

| Gate | Stage A evidence / boundary |
| --- | --- |
| A | Interaction Standard section 15, V2 contract sections 3.1.1/6/10.3/13, ADR-009 and the existing V2 benchmark review's post-stop-rule mapping. Vendor facts are separate from approved AtrVisu decisions. |
| B | Only top semantic corners, visible discovery/invisible lock safeguards, application chrome isolation and shared header acceptance. No runtime, C04/C05/C07/C09, package, schema or workflow changes. |
| C / D | Existing command/panel/entity/selection/history/coordinate authorities and frozen click/camera behavior retained in the contract. Invisible reference requires explicit confirmation, never an accidental viewport click. |
| E / F / H | Future runtime matrix in P1_MEASURE_TOOL_V2_GATE.md; T01/T02/T06 preservation and unfiltered no-red-console evidence required. Runtime conformance for the delta is NOT EXECUTED/N/A in this docs-only package, not PASS. |
| G / J | Stop honored. Submit governance for independent review, synchronize the accepted contract, then require explicit authorization and exact baseline for a new bounded implementation branch. PR #129/#130 stay unchanged Draft baselines. |
| I | Stage A Automation Green belongs to the exact-head Quality Gate in PR Validation. Contract Verified PENDING independent review; Product Accepted N/A for docs. PR #130 runtime acceptance remains FAIL/REOPENED, not upgraded by Stage A CI. |

## Issue #139 integrated recovery evidence

This is the single owner-authorized successor to rejected #136, not another
threshold/weight tuning round. The pre-runtime checkpoint is
`c59e81bfbd7455b00ce02cafff535e2980f4dfb2`; V2 section 22, ADR-009 and benchmark
section 11 freeze the task flows before implementation.

| Gate | Recovery evidence |
| --- | --- |
| A/B | Issue #139 professional operator tasks; official VC/Navisworks/Fusion/Factory sources checked before code. No C04/C05/C07/C09, new store, package, camera solver or historical PR change. |
| C/D | Existing Entity/Runtime Selection/Annotation/Level/Command/history. Explicit A-anchored world projection, manual operands, repeatable fan-out/chain and explicit one-result Keep. Same 4 CSS px classifier and semantic visibility/lock authority. No fallback, smoothing, hysteresis or widened hit radius. |
| E/F | R1-R7 UI routes plus unchanged A-E/T01-T06. Migrated collapsed profile distinguished from clean control; real elevation/Undo/Redo, save/reload, Auto/Pinned/locked layer, all three widths, actual/projected XYZ, unfiltered console and canvas generation. `e2e/measureRecoveryEvidence.ts` and the three artifact validators provide executable oracles. |
| G/J | One integrated implementation package under the explicit recovery mandate. Independent review and correction budget remain required; old Product Accepted FAIL is not relabelled. |
| H/I | Exact-head artifact/CI decides automated evidence only. Contract Verified PENDING; Product Accepted PENDING; non-author normal Windows Chrome witness NOT VERIFIED by this implementer. No user exploratory QA or premature acceptance request. |
