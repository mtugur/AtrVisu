# AtrVisu Interaction Change Gate v1.0

Status: Mandatory checklist for any PR that changes user interaction or interaction-adjacent state synchronization.

A PR may not be declared Contract Verified until every applicable item is PASS or explicitly N/A with a reason.

## A. Contract and benchmark

- [ ] The task cites `docs/product/ATRVISU_PRODUCT_CONSTITUTION.md`.
- [ ] The task cites the exact section(s) of `docs/standards/ATRVISU_INTERACTION_STANDARD.md`.
- [ ] A named mature benchmark precedent is recorded for changed behavior.
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

## C. Authority integrity

- [ ] Selection uses the canonical Selection authority.
- [ ] Domain mutation uses canonical Entity/command/history authorities.
- [ ] Snap uses canonical placement settings/units.
- [ ] UI presentation/proxy state does not become a competing domain truth.
- [ ] Group/multi-selection mutation is atomic where required.
- [ ] One continuous user gesture maps to one meaningful Undo transaction.

## D. Interaction semantics

- [ ] Click, drag, hover, handles, keyboard and camera gestures have non-overlapping documented meanings.
- [ ] Camera angle cannot silently change the semantic axis or direction of an explicit manipulator.
- [ ] Degrees of freedom are visible/discoverable.
- [ ] No hidden fallback changes the interaction model mid-gesture.
- [ ] No threshold-tuning workaround is being used to compensate for a wrong interaction model.
- [ ] Direct manipulation is immediate and does not add uncontracted lag/catch-up/hysteresis/smoothing.

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

## F. Console and state-loop gate

- [ ] Zero `Maximum update depth exceeded` in valid runtime workflows.
- [ ] Zero uncaught runtime exceptions.
- [ ] Zero blocker WebGL/DOM lifecycle errors.
- [ ] Console collectors do not suppress or filter known blocker text.
- [ ] If the user reported a stack trace, an E2E reproduction covers the same component/workflow path.
- [ ] Claimed root cause explains the observed stack/path; unrelated fixes do not close the issue.
- [ ] Continuously changing domain values do not trigger prop -> effect -> local-state feedback loops in Inspector controls.

## G. Visual/product quality

- [ ] Framework-default gizmos/controls are not declared final merely because they function.
- [ ] New viewport affordances are reviewed in the canonical mixed industrial scene.
- [ ] State colors and visual hierarchy follow AtrVisu visual semantics.
- [ ] The new affordance does not obscure equipment/civil context or dominate the viewport.
- [ ] Manual product acceptance is requested only after automated/contract review is complete.

## H. Gate labels

Record all three independently:

- Automation Green: PASS / FAIL
- Contract Verified: PASS / FAIL
- Product Accepted: PASS / FAIL / N/A

A PR is merge-ready only when all required labels are PASS.

## I. Stop conditions

Stop implementation and return to benchmark/contract review immediately if any of these occur:

- the same basic interaction needs a third tuning round;
- camera-angle-specific exceptions accumulate;
- direction-sign fixes, hidden fallback modes, gain clamps or hysteresis are introduced to preserve intuitive behavior;
- user manual testing repeatedly finds behavior that contract tests consider acceptable;
- a visual/UI PR grows into an interaction-engine redesign;
- a user-reported red-console error remains reproducible after the claimed fix;
- green CI conflicts with direct product evidence.

When a stop condition fires, another local tuning pass is prohibited until the interaction contract and benchmark precedent are re-reviewed.
