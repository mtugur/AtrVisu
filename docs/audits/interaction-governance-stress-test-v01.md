# AtrVisu Interaction Governance Stress Test v0.2

Status: GOVERNANCE DESIGN PASS; machine enforcement included in Quality Gate
Date: 2026-09-17
Scope: Product Constitution, Master Plan source sync/fingerprint, benchmark evidence, Interaction Standard, delivery protocol, AGENTS, Codex protocol, Interaction Change Gate, PR template, CI governance checks.

## Goal

Test whether the governance prevents the exact PF-3A failure class: a correct high-level CAD/engineering-user-habit principle exists, but an agent invents a local interaction model, tunes it repeatedly, writes tests around the implementation, expands the PR, and treats green automation as proof while real user behavior and runtime evidence remain wrong.

A scenario passes only if the governance forces a different action before another implementation/tuning round.

## Adversarial scenarios

### S1 — Narrow prompt requests another drag-direction fix
Attack: Chat/Codex proposes another horizontal-plane/Jacobian/camera-relative solver without benchmark review.

Required response: Product Constitution + Interaction Standard block the solver; Plan Move already forbids hidden remapping, Jacobian/coherence fallbacks, sign clipping, catch-up and equivalent rescue logic.

Result: PASS.

### S2 — Existing custom code is treated as precedent
Attack: Agent says preserving legacy body drag is safer because code already exists.

Required response: repository constitution/interaction contract outrank existing code; legacy implementation is not a product reason.

Result: PASS.

### S3 — Rendering engine has a ready-made gizmo
Attack: Babylon default gizmo is declared final UX because it works.

Required response: rendering-framework defaults are implementation primitives, not final product language; functional semantics and PF-3 visual acceptance are separate.

Result: PASS.

### S4 — Third tuning round appears to improve tests
Attack: two corrections fail manual use; a third threshold/weight/hysteresis pass is proposed.

Required response: AGENTS, Codex Protocol, Interaction Delivery Protocol and checklist fire the stop rule. Another tuning batch is prohibited until benchmark/contract review.

Result: PASS.

### S5 — CI green but user reports opposite-direction movement
Attack: agent calls the feature technically complete.

Required response: Automation Green, Contract Verified and Product Accepted remain separate states. Green CI alone cannot close the product issue.

Result: PASS.

### S6 — User reports `Maximum update depth`; synthetic E2E does not reproduce
Attack: issue is dismissed as environment-specific.

Required response: the user stack/path becomes a required reproduction path; warning filtering is forbidden; root-cause claim must explain the observed component/workflow stack.

Result: PASS.

### S7 — Visual/iconography PR expands into interaction engine and Inspector state work
Attack: more “necessary fixes” are appended to the same PR.

Required response: PR scope rule stops silent expansion; materially different product/architecture work must be explicitly re-scoped or split into a bounded package.

Result: PASS.

### S8 — Master Plan exists only in Project resources
Attack: ChatGPT knows a rule that Codex/CI cannot read.

Required response: `MASTER_PLAN_SYNC_PROTOCOL.md`, projection map and source fingerprint make Project-only durable decisions non-implementable until projected into repository authority.

Result: PASS.

### S9 — Chat prompt conflicts with frozen contract
Attack: newest prompt is followed literally.

Required response: lower-level prompt cannot silently override repository normative contracts. Intentional durable change requires contract/ADR update first.

Result: PASS.

### S10 — Contract is silent on a new interaction
Attack: agent extrapolates from Babylon/Figma or personal preference.

Required response: code is blocked; task-similar mature engineering benchmarks are researched and the contract is frozen before implementation.

Result: PASS.

### S11 — Tests validate algorithm internals instead of user behavior
Attack: finite deltas, gains or helper return codes pass while pointer semantics remain wrong.

Required response: tests must derive from the user-observable contract: axis/plane semantics, elevation preservation, rigid Group delta, transaction boundaries and realistic runtime behavior.

Result: PASS.

### S12 — Inspector mirrors continuous props into local state
Attack: moving X/Y repeatedly drives prop -> effect -> setState feedback.

Required response: Interaction Standard explicitly defines idle=model value and active-edit=draft behavior and forbids unconditional prop mirroring for continuously changing values; runtime matrix requires zero `Maximum update depth exceeded`.

Result: PASS.

### S13 — User is used as exploratory QA
Attack: user is repeatedly asked to test more camera angles while agents are still discovering the solution.

Required response: routine reproduction, benchmark inspection and automated verification are agent/Codex responsibilities; user is reserved for genuine final product/visual acceptance.

Result: PASS.

### S14 — Master Plan is replaced without version-name change
Attack: a new `AtrVisu_Master_Plan_v3_0.docx` has different content but same filename/title.

Required response: source fingerprint SHA-256 changes; implementation stops until semantic review, projection update and new fingerprint are complete.

Reviewed source fingerprint: `0ff97ed5c07213b1a875cd3ebdd498cc739c0f07eb35c48b9777cacf9bd58da7`.

Result: PASS procedurally; external-source auto-detection limitation remains below.

### S15 — Governance files are later weakened/deleted
Attack: stop rule, authority link or delivery-state separation is removed.

Required response: `scripts/check-interaction-governance.mjs` fails closed on missing files, missing invariants and incorrect authority ordering; Quality Gate runs it before product tests.

Result: PASS, machine-enforced.

### S16 — Benchmark name is claimed without evidence
Attack: PR says “SolidWorks/Siemens does this” without traceable source.

Required response: benchmark evidence path must exist under `docs/benchmarks/`, contain review date, official source, task-similarity reasoning and AtrVisu adoption. PR declaration cannot pass on product-name claims alone.

Result: PASS, machine-enforced by PR governance plus benchmark standard.

### S17 — Benchmark is selected after code to justify the implementation
Attack: implementation is complete, then sources are cherry-picked to rationalize it.

Required response: PR template/checklist require evidence-before-implementation or explicit governance/contract package; Delivery Protocol forbids post-hoc normative-file backfill.

Result: PASS; adversarial fixture intentionally leaves the pre-implementation evidence checkbox unchecked and the PR checker rejects it.

### S18 — PR declares “No interaction change” while changing interaction contracts
Attack: interaction standard/benchmark files are modified but PR avoids the stricter interaction declaration.

Required response: `scripts/check-pr-governance.mjs` inspects changed files; changes to Interaction Standard, Benchmark Standard or `docs/benchmarks/` require `Interaction declaration = Yes`.

Result: PASS, machine-enforced on real pull-request events.

### S19 — PR body omits stop-rule/runtime gates
Attack: author leaves blocker-console or scope-stop checkboxes unchecked.

Required response: PR governance check fails before build/test acceptance. Known blocker suppression and unchecked stop rules cannot pass.

Result: PASS, adversarial fixtures cover both cases.

### S20 — Governance checker itself is weakened
Attack: future PR removes PR checker, stress tests, workflow steps, package scripts or benchmark baseline.

Required response: static interaction-governance checker requires those enforcement files/tokens; governance policy tests clone the authority set into a temporary fixture and deliberately remove/modify invariants to prove fail-closed behavior.

Result: PASS by design; exact-head CI is the execution proof for each PR.

## Machine-enforcement layer

Quality Gate now requires, before normal build/unit/E2E:

1. `npm run check:interaction-governance` — validates authority files, source fingerprint, benchmark baseline, stop rules, PR declaration machinery and CI wiring.
2. `npm run test:governance-policies` — runs positive and adversarial PR-declaration scenarios and destructive temporary-fixture tests that verify the static checker fails when critical governance is removed or weakened.
3. `npm run check:pr-governance` on pull requests — validates the real PR body, changed-file declaration, benchmark evidence path, runtime gates and stop-rule acknowledgements.

These checks are intentionally independent of the product implementation tests. A product test cannot make a missing contract or benchmark declaration pass.

## Benchmark evidence stress result

The frozen baseline uses official vendor sources for Visual Components, Autodesk Factory Design Utilities, Siemens Tecnomatix/RobotExpert, SOLIDWORKS and AutoCAD. The evidence record states observed behavior, task similarity and what AtrVisu adopts. Rendering-engine documentation is explicitly excluded as product-behavior precedent.

This closes the earlier loophole where an agent could say “CAD-like” or name a competitor without proving what the competitor actually does.

## Structural limitation

GitHub CI cannot independently fetch or inspect a ChatGPT Project-only attachment. It cannot discover an unknown external Master Plan edit by itself.

Mitigation is layered:
1. `MASTER_PLAN_SYNC_PROTOCOL.md` blocks implementation after a known source change until projection is updated.
2. `MASTER_PLAN_SOURCE_FINGERPRINT.md` identifies the exact reviewed DOCX bytes by SHA-256.
3. `MASTER_PLAN_PROJECTION.md` records the durable decisions projected into repository authority.
4. AGENTS/Codex protocol require source-sync review before work.
5. PR declaration requires source-sync status.
6. CI protects the projection/fingerprint/governance chain against silent removal.

This limitation can only be fully eliminated if the Project source itself becomes programmatically available to repository CI. The governance does not pretend otherwise.

## Stress-test conclusion

The PF-3A failure path is now blocked by independent layers: source identity/projection, authority order, traceable benchmark evidence, frozen interaction contract, normative-file protection, correction budget, PR scope controls, user-runtime evidence rules, separate delivery states, fail-closed PR declaration and machine-tested CI governance.

Verdict: **GOVERNANCE DESIGN PASS**.

This verdict certifies the governance system, not the current implementation in PR #113. PR #113 must be reconciled against these standards only after this governance package is merged into `main`; it is not grandfathered as compliant.
