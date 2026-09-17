# AtrVisu Master Plan Projection Map

Status: Normative source-projection record

Reviewed source: `AtrVisu Master Plan v3.0 - Endüstriyel Mühendislik Platformu`
Projection review date: 2026-09-17

Purpose: make the Project-level Master Plan decisions visible and durable inside the repository authority chain used by ChatGPT, Codex, CI, and reviewers.

## Master Plan -> repository projection

| Master Plan durable decision | Repository enforcement |
|---|---|
| AtrVisu is a layered industrial engineering platform; random UI/state/panel/data-model decisions are forbidden. | `docs/product/ATRVISU_PRODUCT_CONSTITUTION.md`; `AGENTS.md` |
| Visual Components-like usable industrial platform core; selective Siemens Tecnomatix capability; Phase-1 must stay fast/simple for non-CAD sales users. | Product Constitution; normative Phase-1 product specs |
| Office/CAD/engineering user habits are the UI basis. | Product Constitution benchmark-first rule; `docs/standards/ATRVISU_INTERACTION_STANDARD.md` |
| UI should behave as a predictable engineering cockpit, not a website. | `docs/standards/ATRVISU_UX_STANDARD.md`; Interaction Standard |
| Viewport/camera/pointer behavior must remain separate from engineering data. | Existing Viewport Contract + Interaction Standard camera/manipulation sections |
| Normal use must have no red console; `Maximum update depth` is a blocker. | Product Constitution; Interaction Standard runtime-console contract; Interaction Change Gate; CI governance |
| Every new task must name contract, desired behavior, prohibitions, tests and closure criteria. | `docs/protocols/CODEX_SYNC_PROTOCOL.md`; PR template |
| New architecture decisions require ADR/standard documentation. | Product Constitution deviation rule; Codex protocol |
| Development order is contract -> registry -> UI -> test -> documentation. | Product Constitution contract-first delivery order; AGENTS; Codex protocol |
| Existing behavior cannot disappear during shell/UI changes. | Existing Feature Access Matrix governance + Interaction Change Gate scope/authority checks |
| User-facing behavior must be stable and predictable. | Interaction Standard with benchmark precedent / AtrVisu behavior / forbidden behavior / acceptance for each interaction class |

## Critical gap closed by this projection

The Master Plan states that AtrVisu follows Office/CAD/engineering user habits, but the Master Plan intentionally does not contain benchmark implementation detail. Before this projection, repository standards also lacked a concrete Move/Rotate/drag/camera/manipulator contract. That gap allowed local technical implementations to satisfy tests while violating the intended user mental model.

The gap is now closed by `ATRVISU_INTERACTION_STANDARD.md`. A general principle such as “follow CAD habits” is no longer sufficient authority to invent a specific interaction.

## Sync obligation

If the Project Master Plan is revised after v3.0, this map must be reviewed before implementation based on that revision. Any durable changed decision must be projected into the relevant repository constitution/standard/ADR according to `docs/protocols/MASTER_PLAN_SYNC_PROTOCOL.md`.

A chat-only clarification is not durable governance until this projection chain is updated.

## Current source-sync status

- Master Plan v3.0 reviewed against repository governance: YES
- Product Constitution projection created: YES
- Concrete interaction contract created: YES
- Agent read order updated: YES
- Codex protocol updated: YES
- Interaction PR checklist created: YES
- Pull-request declaration surface created: YES
- CI static governance check created: YES

This status concerns governance projection only. It does not retroactively certify pre-existing implementation PRs against the new interaction contract.
