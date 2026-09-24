# P1-BLD2 Level Datum and Relative Elevation Gate

| Gate | State | Evidence |
| --- | --- | --- |
| Exact base | PASS | Branch starts from main `e6c8170407a2d7c602970b02ca180c7a2baa373c`. |
| Benchmark-first contract | PASS | Official Revit/Archicad evidence and ADR-003 committed before runtime implementation. |
| Canonical Level domain | PASS | `LayoutLevel` plus `normalizeLevels()` provide one serialized collection; Ground is stable at 0 mm. |
| Canonical elevation | PASS | Machine/Civil absolute elevation remains rendering/collision/export authority; relative elevation is derived only. |
| Active Level placement | PASS | Chromium proves Machine local 0 -> world 6000 and Beam local 3000 -> world 9000 on active Level 2. |
| Inspector semantics | PASS | Machine and Civil show Level, elevation above Level and read-only world elevation. |
| Atomic datum edit | PASS | Domain/history and Chromium Undo/Redo cover Level plus assigned Machine/Civil movement in one snapshot. |
| Lock/deletion policy | PASS | Pure lock tests reject datum mutation atomically; Chromium rejects deletion while assigned. |
| Persistence compatibility | PASS | Legacy layouts normalize to Ground unchanged; serialization round-trip preserves Levels, assignments and world elevation. |
| Registered discoverability | PASS | Five Level commands, `panel.levels`, Feature Access and Surface Inventory share the same runtime authority. |
| PF-3A freeze | PASS | No BabylonScene, drag, snap or movement-solver source was changed; existing PF-3A regressions remain in the gate. |
| Console/runtime | PASS | Focused Chromium proves 25,000 mm Level finite and console-clean; existing movement, native-asset and commercial-output regressions also pass when run in their focused phases. |
| Complete local gate | PARTIAL | Audit 0, dependency tree, governance, 270-file token check, build, 162-file/1361-test unit suite and Level-focused Chromium pass. The aggregate local Chromium run remained bounded by pre-existing commercial-output/runtime-access timing under local GPU load; exact-head CI is the delivery authority. |
| Exact-head CI | DELIVERY | The Draft PR exact-head Quality Gate records the final aggregate result without a post-CI source mutation. |
| Contract Verified | PENDING | Independent review against ADR-003 and runtime evidence. |
| Product Accepted | PENDING | Not requested before independent contract/runtime review. |

Scope exclusions: basement/negative Levels, automatic floor detection, Floor Area inference, plan views, clipping, stairs/elevators, BIM/analysis, PF-3B and any movement-solver change.

## Interaction change gate application

`docs/checklists/INTERACTION_CHANGE_GATE.md` applies. Sections A-D are frozen by Product Constitution, Interaction Standard sections 3/4/11, official benchmark evidence and ADR-003. Existing Entity/Selection/History/Placement authorities remain canonical. Sections E-F require Machine, Civil, locks, Undo/Redo, persistence, 25,000 mm and no-red-console runtime paths. Section G remains within the initial implementation round. Section H requires reviewer-side panel/Inspector visual review before any user acceptance request. Section I starts Automation Green/Contract Verified/Product Accepted as PENDING. No section J stop condition is authorized by this contract.
