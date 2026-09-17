## Scope

- Primary product objective:
- Phase / product layer:
- Bounded module:
- Explicit out of scope:

## Authority

- [ ] Read `AGENTS.md`
- [ ] Read `docs/product/ATRVISU_PRODUCT_CONSTITUTION.md`
- Relevant standards / exact sections:
- Existing canonical authorities preserved:
- Master Plan / Project source sync status:

## Interaction declaration

Does this PR change user-facing interaction semantics (selection, move, rotate, resize, drag/drop, snap, camera navigation, Group/multi-selection, Inspector editing, keyboard, Undo/Redo, gizmo/manipulator, viewport tools)?

- [ ] No
- [ ] Yes

Interaction impact rationale (required for either answer):

If **Yes**, complete all:

- Interaction Standard section(s):
- Benchmark evidence record path:
- Named benchmark precedent(s):
- Authoritative source(s):
- Desired user-observable behavior:
- Forbidden behavior / regressions:
- [ ] Benchmark evidence satisfies `docs/standards/ATRVISU_BENCHMARK_EVIDENCE_STANDARD.md`.
- [ ] Benchmark evidence existed before implementation or this PR is explicitly a governance/contract package.
- [ ] The standard already defines this behavior, OR the contract delta was frozen before implementation.
- [ ] Any intentional benchmark deviation has an ADR.
- [ ] `docs/checklists/INTERACTION_CHANGE_GATE.md` is completed/evidenced.
- [ ] `docs/protocols/INTERACTION_DELIVERY_PROTOCOL.md` correction budget is respected.

## Runtime / console

- User-reported reproduction path, if any:
- [ ] No blocker console errors in realistic runtime path.
- [ ] Known blocker text is not suppressed/filtered.
- [ ] If a user supplied a stack trace, tests cover the same component/workflow path.

## Validation

- Automation Green: PASS / FAIL / PENDING
- Contract Verified: PASS / FAIL / PENDING / N/A
- Product Accepted: PASS / FAIL / PENDING / N/A

Tests/evidence:

## Stop-rule check

- [ ] This is not a third tuning round for the same basic interaction.
- [ ] No hidden fallback, camera-specific sign correction, catch-up, gain clamp, hysteresis or smoothing is being added merely to make a wrong interaction model feel usable.
- [ ] The PR has not silently expanded into a different product/architecture objective.
- [ ] Normative contract/benchmark files are not being changed post-hoc merely to bless implementation already written.
- [ ] User is not being used as exploratory QA before reviewer-side runtime/contract verification.

If any checkbox above is false, implementation/review must stop and return to benchmark + contract review.
