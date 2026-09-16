# AtrVisu Interaction Governance Gate v1.0

**Status:** Mandatory for any PR that changes user-facing interaction  
**Parent:** `docs/product/ATRVISU_PRODUCT_CONSTITUTION.md`  
**Behavior contract:** `docs/standards/ATRVISU_INTERACTION_STANDARD.md`

## Gate rule

If any required item is `NO`, `UNKNOWN` or undocumented, the interaction implementation is not ready for product acceptance.

A green Quality Gate does not override a failed governance item.

## A. Classification

- [ ] Does the PR state whether it changes selection, move, rotate, snap, drag/drop, camera, gizmo, multi-selection/group, numeric editing, keyboard interaction or Undo/Redo?
- [ ] Is the bounded product/module scope stated?
- [ ] If work crossed into a new normative domain, was the package explicitly re-scoped or split before implementation continued?

**Hard fail:** a PR declared as visual/iconography/density silently changes movement, selection, camera or history semantics.

## B. Authority

- [ ] `AGENTS.md` was read.
- [ ] `ATRVISU_PRODUCT_CONSTITUTION.md` was read.
- [ ] Exact applicable section(s) of `ATRVISU_INTERACTION_STANDARD.md` are cited.
- [ ] Relevant architecture/data/product standards are cited.
- [ ] Existing Command/Selection/History/Viewport/Entity authorities to preserve are named.

**Hard fail:** behavior is inferred from current code or framework defaults because the contract is missing.

## C. Benchmark precedent

- [ ] Official benchmark documentation is cited for the interaction class.
- [ ] The closest task-domain benchmark was considered first.
- [ ] Conflicting benchmark behavior was not cherry-picked away.
- [ ] Any intentional AtrVisu deviation is documented by ADR and reflected in the standard.

**Hard fail:** implementation begins with "Babylon supports X" or "the framework makes Y easy" without first defining the product interaction.

## D. User-visible behavior

- [ ] User goal is stated in observable terms.
- [ ] Degrees of freedom are explicit.
- [ ] Visible feedback is explicit.
- [ ] Failure/cancel behavior is explicit.
- [ ] Locked/blocked behavior is explicit.
- [ ] History/transaction behavior is explicit.
- [ ] Forbidden behavior is explicit.

**Hard fail:** camera angle, threshold, gain, fallback or hidden coordinate-frame logic changes what the same user gesture means.

## E. Implementation integrity

- [ ] No competing selection/history/placement authority was introduced.
- [ ] Framework/render-engine primitive is treated as an implementation mechanism, not automatically as final product design.
- [ ] No hidden heuristic was added to compensate for an undefined interaction.
- [ ] Numeric/property synchronization cannot create effect-driven update loops.
- [ ] UI state changes do not mutate domain geometry unless the contract explicitly says so.

## F. Contract-driven automated tests

Where applicable:

- [ ] Standard Machine interaction covered.
- [ ] Imported GLB interaction covered.
- [ ] Civil/tall geometry covered.
- [ ] Elevated entity behavior covered.
- [ ] Multi-selection/Group atomic behavior covered.
- [ ] Snap ON/OFF covered.
- [ ] Locked/blocked behavior covered.
- [ ] Clearly-above, shallow/near-horizontal and below working-plane camera states covered.
- [ ] Inspector open during continuous manipulation covered.
- [ ] Persisted UI state + reload covered.
- [ ] Long-lived/repeated interaction covered.
- [ ] One gesture = one Undo transaction covered.
- [ ] Console collection fails on `Maximum update depth exceeded`, uncaught runtime errors and repeated React update warnings.

**Hard fail:** tests prove only helper mathematics while the user-visible interaction remains untested.

## G. Runtime contradiction rule

- [ ] Any user-provided real-runtime error/stack trace has a regression scenario.
- [ ] A green automated route has not been used to dismiss a contradictory real-runtime failure.
- [ ] Known reported blockers are resolved or explicitly accepted as intended behavior by the owner.

**Hard fail:** "tests pass" is used as closure while the reported runtime failure still reproduces.

## H. Visual/product quality

- [ ] Manipulators, cursors, hover/active states and overlays follow the applicable visual-language contract.
- [ ] Raw engine/default debug appearance is not presented as final merely because it functions.
- [ ] The viewport remains visually subordinate to the engineering task, not to controls/overlays.

## I. Acceptance states

Record separately:

- **Automation Green:** `YES / NO`
- **Contract Verified:** `YES / NO`
- **Product Accepted:** `YES / NO / NOT YET REQUIRED`

Rules:

- Automation Green cannot auto-fill Contract Verified.
- Contract Verified cannot auto-fill Product Accepted.
- User fatigue is not Product Accepted.
- A known blocker means Product Accepted = `NO`.

## J. Manual acceptance boundary

- [ ] Manual acceptance asks only for final feel/visual confirmation that automation cannot reliably determine.
- [ ] The user is not being asked to rediscover broad technical failures.
- [ ] Previously accepted scenarios are not repeated unless the changed code can actually regress them.

## Final gate outcome

Use exactly one:

- `BLOCKED — CONTRACT MISSING/AMBIGUOUS`
- `BLOCKED — SCOPE DRIFT`
- `BLOCKED — RUNTIME FAILURE`
- `AUTOMATION GREEN — CONTRACT REVIEW PENDING`
- `CONTRACT VERIFIED — PRODUCT ACCEPTANCE PENDING`
- `PRODUCT ACCEPTED — READY FOR MERGE DECISION`

Do not use an ambiguous `PASS` label without the acceptance state.
