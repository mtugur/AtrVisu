# AtrVisu Product Constitution v1.0

**Status:** Normative repository-level product constitution  
**Scope:** Entire AtrVisu product and all future phases  
**Derived from:** `AtrVisu Master Plan v3.0`, `ATRVISU_PREMIUM_PRODUCT_DEFINITION_V1.md`, existing platform standards  
**Authority:** Highest repository product authority below explicit owner decisions

## 1. Purpose

AtrVisu is a professional industrial layout and engineering workbench for packaging and end-of-line systems. It is not a generic web dashboard and not a collection of locally convenient UI solutions.

The product must preserve the mental models and interaction conventions that experienced users already know from mainstream CAD, factory-layout and industrial-engineering tools unless AtrVisu has an explicit, documented reason to differ.

The product north star is:

> One Industrial Model. One Viewport. One Workbench. Familiar Engineering Interaction.

## 2. Authority and conflict resolution

Normative decisions are resolved in this order:

1. `docs/product/ATRVISU_PRODUCT_CONSTITUTION.md`
2. For user-facing interaction, `docs/standards/ATRVISU_INTERACTION_STANDARD.md`
3. Other applicable files under `docs/standards/`
4. Current normative product/phase specifications under `docs/product/`
5. Approved ADRs under `docs/adr/`
6. Checklists, task descriptions, PR comments and implementation notes
7. Code, tests and current runtime behavior

Rules:

- Lower levels may refine a higher-level rule but may not silently contradict it.
- An ADR may change a lower-level standard only when the same change set updates the affected normative standard. A stale contradiction is not allowed.
- A chat instruction, Codex prompt, implementation shortcut, green test or existing code path cannot override a repository-level normative contract.
- If a Project/Library document contains a new normative product decision, that decision must be mirrored into the repository authority chain before implementation. Project memory alone is not an implementation authority.
- When two normative sources conflict and the conflict cannot be resolved mechanically, implementation stops and the conflict is surfaced before code changes.

## 3. Benchmark-first product rule

AtrVisu intentionally follows established user habits from Office/CAD/engineering applications. For interaction behavior, the reference set is not decorative research; it is an input to the product contract.

For each new or changed user interaction:

1. Identify the interaction class.
2. Check the canonical benchmark products listed in `ATRVISU_INTERACTION_STANDARD.md`.
3. Freeze the AtrVisu behavior in the interaction contract.
4. Record any intentional deviation with an ADR.
5. Only then implement code and tests.

If the required interaction is not covered by an existing contract, **implementation is blocked** until the contract is added or amended.

No agent may invent a new interaction merely because the rendering engine or framework makes it convenient.

## 4. Familiarity over local cleverness

When a familiar CAD/engineering convention exists, AtrVisu defaults to that convention.

A custom behavior is permitted only when all of the following are true:

- the benchmark behavior is unsuitable for AtrVisu's actual user task;
- the alternative has a clear usability or engineering benefit;
- the difference is visible and understandable to the user;
- the deviation is documented in an ADR;
- acceptance tests validate the user-visible behavior, not only internal mathematics.

Hidden reinterpretation is prohibited. Examples include silently changing mouse meaning based on camera angle, silently switching coordinate frames, suppressing direction components, adding catch-up motion, or applying heuristic correction that the user cannot predict.

## 5. Product authorities remain canonical

All visible behavior must preserve the established platform authorities:

- Entity authority for domain objects;
- Command Registry for actions;
- Panel Registry for panel lifecycle;
- Selection Manager for scene/explorer/inspector selection;
- History/transaction authority for Undo/Redo;
- Viewport Contract for camera/render/resize boundaries;
- canonical millimetre and front-left-bottom coordinate model;
- project persistence and serialization authorities.

A new interaction may adapt these authorities but may not create a competing source of truth.

## 6. Interaction change rule

A user-visible interaction change includes, but is not limited to:

- select, multi-select, clear selection;
- move, rotate, scale, resize, drag/drop;
- snap, align, distribute, connect;
- camera navigation, orbit, pan, zoom, fit;
- gizmo/manipulator behavior;
- keyboard shortcuts and nudging;
- inspector/property editing;
- group/assembly manipulation;
- hover, focus, active-handle and cursor behavior.

Any PR touching one of these behaviors must cite the exact section of `ATRVISU_INTERACTION_STANDARD.md` in its task/PR contract.

If the requested behavior is absent from the standard, the PR must stop at contract/ADR work. It must not continue into implementation by inference.

## 7. Scope containment

A bounded PR may not silently absorb a different product contract domain.

Examples:

- an iconography/density PR may not become a drag-engine redesign PR;
- a visual-language PR may not introduce a new selection authority;
- a bug fix may not redefine move semantics without an interaction-contract change;
- a console-loop fix may not change product interaction to avoid the loop.

When work crosses into a new normative domain, one of two things must happen before implementation continues:

1. the package is explicitly re-scoped and the relevant contract is updated; or
2. the new work is moved to a separate bounded package.

Changed-file count alone does not determine scope drift. Crossing a new product authority or interaction contract does.

## 8. Acceptance-state vocabulary

The following states are intentionally separate:

### Automation Green
Build, audit, unit and E2E automation pass on the exact head.

### Contract Verified
The implementation has been reviewed against the applicable product, interaction, architecture and data contracts. No known contradiction remains.

### Product Accepted
The real runtime behavior and visual result meet the intended user experience. Known user-reported blockers are resolved or explicitly reclassified as accepted product behavior by the owner.

Rules:

- `Automation Green` is necessary but never sufficient for `Product Accepted`.
- A test written to match an experimental algorithm does not prove product correctness.
- A known real-runtime failure overrides a green test until the discrepancy is explained and resolved.
- User fatigue or a desire to stop testing is not acceptance of a known broken behavior.
- "Technical PASS" must never be used as shorthand for product acceptance.

## 9. No-red-console is constitutional

Normal valid use must produce no red console errors or React/runtime warning loops.

Blockers include, at minimum:

- `Maximum update depth exceeded`;
- uncaught exceptions;
- invalid WebGL/runtime operations;
- repeated React state/update warnings;
- DOM lifecycle errors such as invalid `removeChild` operations.

A user-provided real-runtime stack trace is first-class evidence. It cannot be dismissed because an automated console collector passed a different route.

The regression test must reproduce the user workflow that exposed the error, including relevant Inspector state, selection, persistence and repeated interaction.

## 10. Visual primitives are not product design

A framework or rendering-engine default control is a technical primitive, not automatically an AtrVisu product surface.

Default Babylon gizmos, browser controls, native-looking debug widgets or test overlays may be used during implementation, but they are not considered visually accepted unless the product visual-language contract explicitly accepts them.

Functional correctness and visual-product quality are separate gates.

## 11. Contract-first implementation order

For any persistent product change the order is:

1. product/interaction contract;
2. ADR when a deviation or new architectural decision exists;
3. registry/authority integration;
4. implementation;
5. automated tests against user-visible contract behavior;
6. runtime evidence;
7. documentation/help update;
8. final product acceptance.

Tests do not define product behavior. Tests protect behavior already defined by the contract.

## 12. Stop conditions

An agent must stop implementation and surface the issue when any of the following is true:

- the interaction contract is missing or ambiguous;
- two reference products materially disagree and AtrVisu has no frozen choice;
- a proposed implementation requires hidden reinterpretation of user input;
- a new behavior contradicts a known user habit without an approved deviation;
- the requested fix crosses into a new contract domain outside package scope;
- a real runtime blocker remains despite green automation;
- a framework limitation prevents the frozen behavior and no explicit fallback has been approved.

The correct response to a stop condition is not heuristic tuning. It is a contract or scope decision.

## 13. Canonical source bridge

The original `AtrVisu Master Plan v3.0` remains the strategic source document. This constitution is the repository-native enforcement bridge for its product principles, especially:

- industrial-engineering workbench rather than generic web UI;
- Office/CAD/engineering user habits;
- contract-first development;
- no-red-console;
- predictable viewport behavior;
- feature-access preservation;
- bounded Codex tasks;
- documentation of new architectural decisions.

Future strategic updates from the Master Plan must be reflected here or in the relevant normative standard before implementation work begins.
