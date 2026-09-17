# AtrVisu Interaction Delivery Protocol v1.0

Status: Mandatory delivery protocol for user-facing interaction changes

## 1. Purpose
Prevent the same agent/implementation loop from inventing an interaction, encoding tests around it, tuning it repeatedly, and then using green CI as evidence that the product decision was correct.

## 2. Roles
For interaction work, the workflow has distinct responsibilities:
- **Product/contract owner:** freezes the user-observable behavior and benchmark rationale before implementation. In the current workflow this is ChatGPT with the user retaining final product authority.
- **Implementer:** applies the frozen contract in code. In the current workflow this is normally Codex.
- **Reviewer:** verifies the implementation against the frozen contract and real runtime evidence before asking the user for final acceptance. In the current workflow this is ChatGPT.
- **User:** makes genuine product/visual acceptance decisions; the user is not the exploratory debug loop.

One actor may technically perform more than one role, but no implementation may self-authorize a new interaction decision after coding has begun.

## 3. Contract freeze before code
Before Codex or any implementation agent changes user-facing interaction code, the task package must contain:
- exact Product Constitution section(s);
- exact Interaction Standard section(s);
- benchmark evidence record satisfying `ATRVISU_BENCHMARK_EVIDENCE_STANDARD.md`;
- desired user-observable behavior;
- forbidden behavior/regressions;
- canonical authorities to preserve;
- acceptance scenarios;
- explicit out-of-scope work.

If any item is missing, implementation stops.

## 4. Normative-file protection
An implementation agent may not change `ATRVISU_PRODUCT_CONSTITUTION.md`, `ATRVISU_INTERACTION_STANDARD.md`, or the benchmark standard merely to make its current implementation compliant.

A normative interaction file may change in the same pull request only when:
1. the package is explicitly a governance/contract change, not an implementation-first correction; or
2. the exact contract delta was frozen and reviewed before implementation work in that PR.

If an implementation reveals that the contract is incomplete or wrong, the agent stops and reports the gap. It does not backfill the standard to bless the code.

## 5. Benchmark evidence before implementation
The benchmark record must exist before the first implementation commit for a new/deviating interaction. Post-hoc benchmark selection is prohibited.

If sources conflict, implementation does not choose silently. The contract owner resolves the conflict using task similarity and records the decision before coding resumes.

## 6. Correction budget and stop rule
A bounded interaction implementation gets one normal implementation round and, if review finds defects within the same frozen contract, one consolidated correction batch.

The following immediately return the work to contract/benchmark review instead of another tuning batch:
- a third correction/tuning round for the same basic interaction;
- camera-angle-specific exceptions or sign/direction repair logic;
- hidden fallback modes, catch-up, hysteresis, gain clamps or smoothing added to rescue basic usability;
- repeated disagreement between manual user behavior and green tests;
- a user-reported blocker console error continuing after a claimed root-cause fix;
- a visual/UX PR becoming a different interaction-engine project.

## 7. Test independence
Tests are derived from the frozen user-observable contract, not from the chosen algorithm.

Forbidden acceptance patterns include:
- asserting only finite deltas, condition numbers, internal gains or helper return codes while not checking user direction/axis semantics;
- changing tests merely because implementation changed, without a corresponding approved contract change;
- suppressing or filtering known runtime blocker text.

## 8. Runtime evidence
Before final user acceptance, the reviewer must independently inspect:
- exact-head diff;
- contract compliance;
- realistic E2E/runtime scenarios;
- console evidence for the user-reported path when applicable;
- visual evidence when the interaction creates or changes an affordance.

Only after this review may the user be asked for final product/visual acceptance.

## 9. Delivery states
Report separately:
- `Automation Green`;
- `Contract Verified`;
- `Product Accepted`.

The implementer may report Automation Green. Contract Verified requires review against the frozen contract. Product Accepted requires the user where manual product/visual acceptance is applicable.

## 10. Existing non-compliant work
When an existing PR predates this protocol and has accumulated interaction redesign/tuning, do not grandfather it as compliant. First merge governance, then reconcile the old PR against the frozen contracts. If reconciliation cannot remain bounded, close/supersede the old PR with a clean bounded implementation branch rather than continuing the historical loop.