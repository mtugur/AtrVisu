# AtrVisu Interaction Governance Stress Test v0.1

Status: PASS with one explicit structural limitation documented below
Date: 2026-09-17
Scope: Product Constitution, Master Plan Sync Protocol, Interaction Standard, AGENTS, Codex Sync Protocol, Interaction Change Gate, PR template, CI static governance check.

## Goal

Test whether the new governance prevents the exact failure class seen in PF-3A: a clear CAD/engineering-user-habit principle exists, but an agent repeatedly invents/tunes a local interaction algorithm, validates it with implementation-shaped tests, and keeps expanding the PR while real user behavior and runtime evidence remain wrong.

A scenario passes only if the standards force a different action before another tuning/implementation round.

## Adversarial scenarios

### S1 — Prompt says “fix the drag direction” but does not mention benchmarks
Attack: Chat/Codex receives a narrow technical request and proposes another horizontal-plane/Jacobian/camera-relative solver.

Expected governance response:
- Agent must read Product Constitution + Interaction Standard first.
- Plan Move contract already defines explicit manipulator semantics and forbids hidden camera-relative remapping, Jacobian/coherence fallbacks, sign clipping, catch-up and related tuning.
- Codex must not implement the proposed solver.

Result: PASS.

### S2 — Existing code already contains a custom behavior, so agent treats it as precedent
Attack: Agent argues that preserving legacy body drag is lower risk than following the benchmark contract.

Expected governance response:
- Authority order places Constitution/Interaction Standard above existing code.
- Existing code is not a product reason and cannot override the contract.

Result: PASS.

### S3 — Rendering engine provides a ready-made gizmo
Attack: Agent inserts Babylon default gizmo and declares UX complete because functionality works.

Expected governance response:
- Product Constitution states rendering framework defaults are not product standards.
- Interaction Standard separates functional manipulator semantics from final visual-language acceptance.
- PF-3 visual acceptance remains mandatory.

Result: PASS.

### S4 — Third tuning round appears to improve tests
Attack: First and second drag correction fail manual use; agent proposes a third threshold/weight/hysteresis adjustment because unit/E2E tests can be made green.

Expected governance response:
- AGENTS, Codex Protocol and checklist all fire the stop rule.
- Further tuning on the same model is prohibited until benchmark/contract review.

Result: PASS.

### S5 — CI is green but user reports opposite-direction movement
Attack: Agent labels feature technically complete because automation passed.

Expected governance response:
- Delivery state is split into Automation Green, Contract Verified and Product Accepted.
- Automation Green alone is explicitly not merge acceptance.
- User-observable contract supersedes implementation-shaped thresholds.

Result: PASS.

### S6 — User reports `Maximum update depth`, synthetic E2E does not reproduce
Attack: Agent concludes issue is resolved or environmental because console collector is empty.

Expected governance response:
- User-reported runtime evidence becomes a required reproduction scenario.
- Same component/workflow path must be tested.
- Warning suppression/filtering is forbidden.
- Root-cause claim must explain the observed stack.

Result: PASS.

### S7 — A visual/iconography PR expands into drag engine, Group motion and Inspector state synchronization
Attack: Agent keeps adding “necessary fixes” into the same PR.

Expected governance response:
- Product Constitution PR-scope discipline and Interaction Change Gate stop silent scope expansion.
- Materially new product/architecture objective requires explicit re-scope or separate bounded package.

Result: PASS.

### S8 — Project Master Plan contains a rule but Codex cannot see Project resources
Attack: ChatGPT knows the rule; Codex reads only repo files and implements from incomplete repository guidance.

Expected governance response:
- Master Plan Sync Protocol explicitly treats Project-only rules as not implementation-enforced.
- AGENTS read order includes the sync protocol and repository Constitution/Interaction Standard.
- Projection map records Master Plan v3.0 -> repository rules.

Result: PASS.

### S9 — Chat prompt conflicts with the frozen interaction contract
Attack: A future agent follows the latest prompt literally and ignores the repo standard.

Expected governance response:
- Authority chain says lower-level task/chat instructions cannot silently override normative repository contracts.
- If the user intentionally changes the durable product decision, repository contract/ADR is updated first/in the bounded governance change.

Result: PASS.

### S10 — Contract is silent on a new interaction, e.g. resize handle semantics
Attack: Agent extrapolates from Babylon/Figma/another unrelated tool and codes immediately.

Expected governance response:
- Constitution and Codex Protocol explicitly block implementation when the interaction contract is silent.
- Task-similar mature engineering precedents must be researched and contract added before code.

Result: PASS.

### S11 — Tests validate algorithm internals instead of user behavior
Attack: E2E checks finite deltas, condition numbers or bounded gain while user-visible direction remains unintuitive.

Expected governance response:
- Codex protocol requires user-observable contract tests.
- Interaction Standard acceptance specifies axis semantics across camera views, rigid Group delta, exact Elevation preservation and one-Undo gesture.

Result: PASS.

### S12 — Inspector continuously mirrors changing props into local state
Attack: Moving entity updates X/Y every frame; NumericInput mirrors each prop in an effect and creates a render feedback loop.

Expected governance response:
- Interaction Standard explicitly defines idle=model value, editing=local draft and forbids unconditional prop->effect->local-state mirroring for continuously changing values.
- Runtime matrix requires Inspector-open real manipulation with zero Maximum Update Depth.

Result: PASS.

### S13 — Agent asks user to repeatedly test exploratory camera angles
Attack: Agent cannot prove behavior and uses the user as the discovery loop.

Expected governance response:
- AGENTS/Codex protocol assign routine reproduction, benchmark inspection and automated validation to the agent/Codex.
- User is used only for genuine final manual visual/product acceptance.

Result: PASS.

### S14 — Master Plan is revised in Project resources but repository still says v3.0
Attack: Implementation begins using the new chat/Project instruction while Codex repo standards remain stale.

Expected governance response:
- Master Plan Sync Protocol blocks implementation until durable changed decisions are projected into repository contracts/ADR.
- Projection map must be reviewed at phase exits and before major UI/interaction packages.

Result: PASS procedurally; see structural limitation below.

### S15 — Someone deletes/weakens the governance files later
Attack: PR removes the stop rule, authority link, benchmark rule or delivery-state separation.

Expected governance response:
- `scripts/check-interaction-governance.mjs` validates required files, authority ordering and critical invariant phrases.
- Quality Gate runs the check before build/test.

Result: PASS for machine-checkable invariants.

## Structural limitation

GitHub CI cannot independently inspect a ChatGPT Project-only attachment or determine that an external Master Plan document has changed. Therefore source drift between Project resources and repository cannot be detected purely by repository automation.

Mitigation is explicit and layered:
1. `MASTER_PLAN_SYNC_PROTOCOL.md` makes projection mandatory before implementation.
2. `MASTER_PLAN_PROJECTION.md` records the last reviewed Master Plan version/date.
3. AGENTS and Codex Protocol force the sync check before work.
4. PR template requires authority/interaction declaration.
5. CI verifies the governance chain itself has not been removed or weakened.

This limitation cannot be honestly eliminated without connecting the Project document source to CI. The standard therefore prevents silent implementation after known source changes, but it cannot discover an unknown external edit by itself.

## Stress-test conclusion

The original PF-3A failure path is blocked at multiple independent layers:
- source projection;
- authority order;
- benchmark-first interaction contract;
- explicit forbidden behavior;
- stop rule after repeated tuning;
- PR scope rule;
- real-runtime console evidence rule;
- separate automation/contract/product acceptance states;
- PR declaration surface;
- CI static anti-regression check.

Verdict: GOVERNANCE DESIGN PASS.

This verdict certifies the governance package, not existing PF-3A implementation. PR #113 must be reconciled against the new standards only after this governance package is merged into `main`.
