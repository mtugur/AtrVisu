# AtrVisu Benchmark Evidence Standard v1.0

Status: Normative for user-facing interaction and UX decisions

## 1. Purpose
AtrVisu follows mature Office/CAD/engineering user habits where task-equivalent precedents exist. Naming a product is not sufficient evidence. This standard prevents an agent from claiming “SolidWorks/Siemens/Visual Components does this” without a traceable source or from cherry-picking a behavior that is not task-similar.

## 2. Required evidence record
Before a new or changed interaction contract is frozen, record:
- product and feature/workflow name;
- product/version or documentation generation when available;
- authoritative source URL or repository/document reference;
- access/review date;
- concise factual behavior observed in the source;
- why this precedent is task-similar to AtrVisu;
- which part AtrVisu adopts, simplifies, or rejects.

Do not rely on memory, screenshots without provenance, marketing copy when product documentation exists, or a rendering-framework default as benchmark evidence.

## 3. Evidence strength
Preferred order:
1. official product documentation/help;
2. official training/demo material that shows the behavior;
3. repeatable observation in the product itself;
4. reputable third-party documentation only when primary material is unavailable.

For a material interaction decision, use either one direct authoritative source that clearly covers the same task or two independent credible sources that converge on the same interaction family. If mature products differ, record the difference instead of pretending there is consensus.

## 4. Task-similarity rule
Choose precedents by workflow similarity, not brand prestige.
- Factory/layout placement: prefer Visual Components, Autodesk Factory, Siemens Tecnomatix/RobotExpert and comparable industrial layout tools.
- Parametric/assembly editing: SolidWorks/Inventor-class CAD may be more relevant.
- Generic creative 3D editors are secondary unless the task itself matches them.
- Babylon.js or another framework documents implementation capability, not the product mental model.

## 5. Conflict rule
When credible benchmarks differ:
- state each relevant behavior;
- identify the AtrVisu target user and task;
- choose the precedent with the strongest task similarity;
- record the choice in `ATRVISU_INTERACTION_STANDARD.md`;
- use an ADR when the choice creates a durable deviation from another frozen AtrVisu convention.

## 6. Anti-laundering rule
Benchmark research must precede implementation for a new interaction decision. It is forbidden to implement first and then select evidence that rationalizes the existing code.

If implementation already exists and exposes a contract gap, stop the implementation branch, perform benchmark/contract review, freeze the decision, and only then reconcile code.

## 7. Acceptance
A benchmark-dependent interaction is not Contract Verified unless the PR/audit contains traceable evidence satisfying this standard. “Industry standard”, “CAD-like”, “familiar”, or a product name without source evidence is insufficient.