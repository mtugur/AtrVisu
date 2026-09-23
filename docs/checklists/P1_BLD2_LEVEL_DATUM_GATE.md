# P1-BLD2 Level Datum and Relative Elevation Gate

| Gate | State | Evidence |
| --- | --- | --- |
| Exact base | PASS | Branch starts from main `e6c8170407a2d7c602970b02ca180c7a2baa373c`. |
| Benchmark-first contract | PASS | Official Revit/Archicad evidence and ADR-003 committed before runtime implementation. |
| Canonical Level domain | PENDING | One normalized layout Level collection; Ground is stable at 0 mm. |
| Canonical elevation | PENDING | Existing Machine/Civil absolute elevation remains the only rendering/collision/export transform authority. |
| Active Level placement | PENDING | New Machine/Build placement adds existing local/default elevation to Active Level datum. |
| Inspector semantics | PENDING | Level, elevation above Level and read-only world elevation for Machine and Civil. |
| Atomic datum edit | PENDING | Level plus all assigned Machine/Civil elevations update in one Undo/Redo transaction. |
| Lock/deletion policy | PENDING | Any locked assigned entity blocks datum edit; Ground and assigned Levels cannot be deleted. |
| Persistence compatibility | PENDING | Legacy layouts normalize to Ground unchanged; round-trip preserves Levels and assignments. |
| Registered discoverability | PENDING | Level commands, `panel.levels`, Feature Access and Surface Inventory agree. |
| PF-3A freeze | PENDING | ADR-001 body-drag behavior and accepted limitation remain unchanged. |
| Console/runtime | PENDING | 25,000 mm Level and normal workflows remain finite with no blocker console output. |
| Complete local gate | PENDING | Audit, dependency tree, governance, tokens, build, unit, Chromium and diff check. |
| Exact-head CI | PENDING | Draft PR Quality Gate after normal push. |
| Contract Verified | PENDING | Independent review against ADR-003 and runtime evidence. |
| Product Accepted | PENDING | Not requested before independent contract/runtime review. |

Scope exclusions: basement/negative Levels, automatic floor detection, Floor Area inference, plan views, clipping, stairs/elevators, BIM/analysis, PF-3B and any movement-solver change.

## Interaction change gate application

`docs/checklists/INTERACTION_CHANGE_GATE.md` applies. Sections A-D are frozen by Product Constitution, Interaction Standard sections 3/4/11, official benchmark evidence and ADR-003. Existing Entity/Selection/History/Placement authorities remain canonical. Sections E-F require Machine, Civil, locks, Undo/Redo, persistence, 25,000 mm and no-red-console runtime paths. Section G remains within the initial implementation round. Section H requires reviewer-side panel/Inspector visual review before any user acceptance request. Section I starts Automation Green/Contract Verified/Product Accepted as PENDING. No section J stop condition is authorized by this contract.
