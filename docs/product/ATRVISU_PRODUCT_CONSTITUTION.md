# AtrVisu Product Constitution v1.0

Status: Normative, repository-level product authority

Purpose: Convert the Master Plan and established product decisions into an implementation-enforced constitution that every human, ChatGPT, Codex task, review, and pull request must follow.

## 1. Product identity

AtrVisu is a professional industrial layout and engineering workbench for packaging and end-of-line systems. It is not a generic web dashboard, not a 3D demo, and not permission to invent novel interaction models where established CAD/engineering conventions exist.

The product must preserve familiar mental models from mature Office/CAD/engineering applications. Relevant reference families include SolidWorks, AutoCAD/Autodesk Factory, Visual Components, Siemens Tecnomatix/RobotExpert, and equivalent professional engineering tools.

Benchmark references are precedents, not visual skins to copy. AtrVisu may simplify or adapt them for its Phase-1 sales/layout use case, but it must not silently replace a familiar convention with an invented behavior.

## 2. Authority order

When sources conflict, use this order:

1. This Product Constitution.
2. `docs/standards/ATRVISU_INTERACTION_STANDARD.md` for user interaction behavior.
3. Other files under `docs/standards/`.
4. Normative product specifications under `docs/product/`.
5. Accepted ADRs under `docs/adr/`.
6. Feature-access, checklist, and protocol files.
7. Existing implementation and tests.
8. A task prompt or chat instruction that does not explicitly amend the higher authority.

Existing code, green CI, historical behavior, or a previous assistant/Codex implementation never overrides a higher-level product contract.

The Master Plan remains the source product plan. This repository constitution is its executable governance projection and must not weaken it.

## 3. Benchmark-first rule

For any user-facing behavior that materially affects the user's mental model, implementation is blocked until one of these is true:

- the behavior is explicitly defined in `ATRVISU_INTERACTION_STANDARD.md`; or
- an accepted ADR defines and justifies an intentional deviation.

This applies at minimum to selection, direct manipulation, move, rotate, resize, drag/drop, snapping, camera navigation, multi-selection, group/assembly behavior, inspector editing, keyboard interaction, Undo/Redo, contextual tools, dialogs, trees, and viewport overlays.

If the standard is silent, agents must not infer permission to invent. They must stop implementation, research the relevant mature engineering precedents, update the interaction contract, and only then implement.

## 4. Deviation rule

A deviation from an established CAD/engineering convention requires all of the following before code:

- named benchmark precedent(s);
- concrete AtrVisu user need that the precedent does not satisfy;
- proposed AtrVisu behavior;
- usability/risk analysis;
- explicit forbidden alternatives;
- deterministic acceptance criteria;
- ADR approval.

"The framework/library makes this easier" is not a product reason.
"The current implementation already does this" is not a product reason.
"Tests are green" is not a product reason.

## 5. Contract-first delivery order

For user-visible behavior, the mandatory order is:

1. Product/interaction contract.
2. ADR if a new or deviating decision is required.
3. Acceptance criteria and adversarial scenarios.
4. Implementation through existing platform authorities.
5. Automated tests that verify the contract rather than implementation internals.
6. Runtime evidence.
7. Product acceptance.
8. Merge.

Code-first discovery loops are prohibited for product behavior unless explicitly marked as a disposable spike on an isolated branch that cannot be merged.

## 6. User mental-model invariants

AtrVisu must behave as one predictable engineering workbench:

- Clicking, dragging, selecting, moving, rotating, editing, snapping, and undoing must have stable semantics.
- Camera angle must not silently change the meaning or direction of a manipulation.
- A visible handle/control must truthfully expose the degree of freedom it controls.
- Hidden mathematical fallbacks must not reinterpret pointer intent.
- Precision behavior must be deterministic and discoverable.
- Direct manipulation must be immediate; artificial lag, catch-up, hysteresis, or smoothing may not be added unless explicitly required by the interaction contract.
- Presentation primitives from a rendering framework are not automatically acceptable product UI.

## 7. No-red-console is a release invariant

Normal valid use must produce zero red runtime errors. `Maximum update depth exceeded`, uncaught exceptions, WebGL runtime errors, invalid DOM lifecycle errors, and equivalent repeated warnings are blockers.

A test that fails to reproduce a user-reported runtime error does not invalidate the report. The report becomes a required reproduction scenario until either reproduced and fixed or disproven with equivalent runtime evidence.

Warnings may not be filtered, suppressed, downgraded, or excluded from collection to make a gate pass.

## 8. Product acceptance is not CI acceptance

Three distinct states are required:

- **Automation Green**: build/unit/E2E/security/static gates pass.
- **Contract Verified**: implementation and runtime evidence conform to the normative product/interaction contract.
- **Product Accepted**: required manual product/visual acceptance is complete for changed visible behavior.

No one may describe a feature as accepted, complete, or merge-ready based solely on Automation Green.

## 9. Pull-request scope discipline

A PR has one primary product objective. If investigation reveals a different architectural/product problem, do not expand the PR indefinitely.

A correction may remain in the PR only when it is necessary to satisfy the original acceptance contract and does not create a new independent product decision. Otherwise create a separate bounded package.

A visual/iconography PR may not become a general interaction-engine redesign without first being explicitly re-scoped and re-reviewed against this constitution.

## 10. Agent obligations

Every agent working on AtrVisu must:

- read the authority chain before implementation;
- identify whether the task changes user interaction;
- cite the applicable interaction contract in the task package;
- stop if the contract is absent or contradictory;
- preserve existing canonical domain authorities;
- challenge a prompt that asks for behavior inconsistent with the contract;
- never substitute its own preferred UX for a frozen product decision;
- never use the user as an exploratory QA loop for problems that can be reproduced, benchmarked, inspected, or automated first.

## 11. Governance failure rule

If an implementation repeatedly requires tuning thresholds, camera-specific exceptions, special-case direction corrections, hidden fallbacks, or repeated manual retesting to make a basic user interaction feel natural, implementation must stop.

The next action is not another tuning pass. The next action is a benchmark/contract review to determine whether the interaction model itself is wrong.

## 12. Definition of done

A user-visible AtrVisu change is done only when:

- applicable product and interaction contracts exist;
- no unapproved deviation exists;
- tests encode user-observable behavior;
- runtime console is clean in realistic workflows;
- implementation preserves canonical authorities and data integrity;
- required visual/product acceptance is complete;
- documentation and Help are consistent with real behavior.
