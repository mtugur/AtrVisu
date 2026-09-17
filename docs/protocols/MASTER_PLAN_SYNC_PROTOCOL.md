# AtrVisu Master Plan Sync Protocol v1.0

Status: Mandatory bridge between Project-level planning sources and repository implementation authority.

## Problem this protocol prevents

The AtrVisu Master Plan may exist in ChatGPT Project resources or other planning documents while Codex and CI operate only from repository files. A rule that exists only outside the repository cannot reliably constrain implementation.

Therefore no Project-only instruction is considered implementation-enforced until its normative consequence is projected into the repository authority chain.

## Source model

- The Master Plan is the strategic/product planning source.
- `docs/product/ATRVISU_PRODUCT_CONSTITUTION.md` is the repository-level implementation constitution.
- `docs/standards/*` convert constitutional principles into enforceable domain/UX/interaction contracts.
- ADRs record intentional changes/deviations.
- Tests/CI enforce machine-checkable parts of those contracts.

These are not competing sources. They are a projection chain.

## Required sync when Master Plan changes

Before implementation based on a changed Master Plan decision:

1. Identify the changed product principle/decision.
2. Classify it as Constitution, Interaction, Architecture/Data, Product Specification, or Roadmap-only.
3. Update the corresponding repository authority file in the same governance package.
4. If it changes an established decision, add/update an ADR.
5. Update machine-checkable governance/tests when possible.
6. Only after repository sync is merged may implementation PRs rely on the changed decision.

## Interaction-specific rule

If the Master Plan says AtrVisu follows familiar Office/CAD/engineering user habits, that principle is insufficient by itself to implement a specific interaction. The concrete behavior must exist in `ATRVISU_INTERACTION_STANDARD.md` before code.

## Drift check

At each Phase exit and before any large UI/interaction package:

- compare relevant Master Plan decisions with Product Constitution and standards;
- record any missing projection as a blocker;
- do not compensate for drift with a one-off Codex/chat prompt.

## Emergency clarification

A user may explicitly clarify or change a product decision in chat. If that clarification affects durable behavior, the agent must update the repository contract/ADR before or in the same bounded governance change. The chat itself is not the durable enforcement mechanism.

## Definition of synchronized

A Master Plan decision is implementation-synchronized only when:

- the repository authority file contains the durable rule;
- agent reading order reaches that file before implementation;
- the Codex protocol points to it;
- relevant acceptance/checklist coverage exists;
- no lower-level file contradicts it.
