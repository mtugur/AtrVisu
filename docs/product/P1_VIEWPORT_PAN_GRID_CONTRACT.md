# P1 Viewport Pan and Grid - Stage A Contract Package

## Source and boundary

Authoritative source: [review 5407842477](https://github.com/mtugur/AtrVisu/pull/122#pullrequestreview-5407842477). Base exact main: `b727f4ee59875f9bbfbab7cc9b813486b20b353f`. PR #122 head `124b62a9e4bee879428315794486717f97720d10` is untouched, Draft/unmerged.

One objective: freeze view-parallel camera Pan and temporal engineering-grid readability before code. This is not a runtime fix, navigation redesign, PF-3A movement change or certification of existing implementation. Stage B implementation remains PENDING.

## Authority and synchronized decision

- Product Constitution sections 3-5/9/11: benchmark-first, contract-first, independent scope and stop rule.
- Master Plan Sync Protocol: explicit owner clarification is projected into repository contracts before implementation; no new Master Plan source/fingerprint is claimed.
- Benchmark Evidence Standard sections 2-6: official facts, task similarity, binding differences and owner choice are recorded before Stage B.
- Interaction Standard section 9: view-parallel Pan, no hit dependency, camera-only translation, invariant preservation and event independence. Sections 3/7/8/10/11/13 remain unchanged.
- Navigation Standard section 11: target-depth/span reference and <= 1 CSS px real-input oracle; sections 1-10 retain existing camera/preset/Fit/dock authorities.
- Visual Standard sections 4.1/4.2/4.4/10: fixed cadence/phase/rotated content bounds with presentation-only LOD and bounded stable resources.
- ADR-007: rationale, rejected alternatives, compatibility and Stage A/B boundary.
- Benchmark record: `docs/benchmarks/P1_VIEWPORT_PAN_GRID_EVIDENCE.md`.
- Gate: `docs/checklists/P1_VIEWPORT_PAN_GRID_GATE.md`.

## Existing evidence, not new certification

Accepted diagnostics: [comment 5983406452](https://github.com/mtugur/AtrVisu/pull/122#issuecomment-5983406452). Four detached checkpoints reproduced alternating Pan feedback; approximately 120 px pointer motion produces 60 px reference movement. Floor-only Pan cannot start in a horizontal orthographic side view. World grid bounds/phase stayed stable; repeated-texture sampling observations are distinct from camera step/stall. New Fit/ViewCube states expose historical problems rather than introducing those source paths.

The diagnostic artifact is local, not an uploaded CI artifact; this package does not claim its PNGs as Stage B acceptance. Official CAD/factory evidence and the owner's new tolerance, not the defective response curve, define the contract.

## Stage B acceptance and preservation

Real-input acceptance is exactly Navigation Standard section 11: default/zoomed/oblique/shallow/Fit perspective, Top and all horizontal side orthographic views, representative edge/corner, signed/diagonal/slow paths, 1x120 versus 8x15 versus 24x5, reverse-return and <= 1 CSS px residual. Include 1440x900 DPR1 and supported narrow viewport where applicable. No direct diagnostic camera mutation.

Grid evidence pairs fixed-phase/bounds/resource checks with start/25/50/75/end normal/slow pan/orbit/zoom captures in light/dark Top, perspective, oblique/shallow and zoom states. Independent review checks deformation-like bands/popping, not a solver/filter-specific acceptance score.

Preserve camera authority, orbit/wheel behavior, Fit algorithm, ViewCube mapping/pole epsilon, dock pixel invariance, selection, domain Elevation/transforms, Group/snap/lock/history, dirty state, commercial capture, Floor depth, theme and scene/canvas lifecycle. View-parallel camera Pan is not permission to change the ADR-001 entity drag plane. Do not suppress console warnings.

## Interaction Change Gate evidence

This maps the generic `INTERACTION_CHANGE_GATE.md` without claiming runtime PASS:

- A Contract/benchmark: source, exact sections, official evidence, binding differences, forbidden behavior, oracle and ADR are recorded before Stage B. Review approval remains PENDING.
- B Scope: one governance objective; all src/runtime/UI/package/workflow changes excluded; PR #122 unaffected.
- C Authority: existing camera/domain/selection/placement/history remain normative; no runtime code or competing authority is added.
- D Semantics: view-parallel Pan is separated from entity Plan Move; no hidden fallback/tuning permitted. Observable trajectories are frozen, not implemented.
- E Realistic verification: N/A for Stage A runtime conformance; required Stage B scenarios are listed above and in section 11. Baseline CI does not satisfy new Pan tests.
- F Console/state loops: no suppression or production change; diagnostic red-error count was 0 but Pan usability remains blocked. New runtime no-red-console verification is PENDING Stage B.
- G Budget/review: prior investigation stopped; this separate contract-owner governance decision precedes implementation. Independent review/merge is required before Stage B. Product Owner exploratory testing is NOT REQUIRED.
- H Visual/product: no new affordance/screenshots or visual acceptance in Stage A. Grid temporal acceptance remains PENDING Stage B and independent review.
- I Labels: Stage A repository/governance Automation Green awaits exact-head CI; Contract Verified PENDING independent governance review; Stage B Automation Green/Contract Verified/Product Accepted PENDING.
- J Stop: no new tuning/fallback/model implementation; Stage B cannot begin merely because Stage A CI is green.

## Validation and exit

Existing governance scripts enforce the protected Pan/grid/ADR/evidence clauses and negative mutations without importing production/runtime code. Full repository CI remains unchanged; baseline unit/E2E green results do not certify the new contract. Exact-head run/results belong in the Stage A PR Validation section to avoid manufacturing a later docs-only PASS commit.

Exit from this task: separate Draft PR, docs/governance checks only, exact-head repository/governance CI, no merge, no Stage B and no Product Owner manual/exploratory request. Historical Pan interaction and grid temporal-readability acceptance remain runtime blockers.
