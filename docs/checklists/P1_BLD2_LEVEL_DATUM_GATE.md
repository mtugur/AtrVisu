# P1-BLD2 Level Datum and Relative Elevation Gate

| Gate | State | Evidence |
| --- | --- | --- |
| Exact base | PASS | Branch starts from main `e6c8170407a2d7c602970b02ca180c7a2baa373c`. |
| Benchmark-first contract | PASS | Official Revit/Archicad evidence and ADR-003 committed before runtime implementation. |
| Canonical Level domain | PASS | `LayoutLevel` plus `normalizeLevels()` provide one serialized collection; Ground is stable at 0 mm. |
| Canonical elevation | PASS | Machine base and Civil bottom remain canonical world geometry. Floor Area alone projects its Level-relative anchor from the canonical top surface; no second elevation authority exists. |
| Active Level placement | PASS | Chromium proves Ground Floor Area 350 -> bottom -350/top 0/Machine base 0; Level 2 Floor Area -> bottom 5650/top 6000/Machine base 6000; Beam remains base-relative. |
| Inspector semantics | PASS | Machine/non-floor Civil retain base-relative wording. Floor Area exposes read-only Top and canonical Bottom Surface World Elevation projections. |
| Atomic datum edit | PASS | Domain/history and Chromium Undo/Redo cover Level plus assigned Machine/Civil movement in one snapshot. |
| Lock/deletion policy | PASS | Pure lock tests and exact Machine -> assigned Layer -> lock -> datum Chromium reject the complete mutation with no Undo transaction. |
| Persistence compatibility | PASS | Legacy layouts normalize to Ground unchanged; JSON export/import preserves signed Floor Area bottom, Level assignment and top relationship. |
| Floor thickness/reassignment | PASS | Thickness preserves top; Level reassignment preserves top-relative elevation; datum delta moves bottom/top rigidly. |
| Civil Type transition | PASS | Floor Area top and non-Floor base are the user-visible anchor across Type changes; dimensions/style persist and non-Floor-to-non-Floor canonical bottoms remain unchanged. |
| World depth | PASS | Floor Area, Machine, Wall, Column and Beam share physical-world group 0. Planning/reference group 1 preserves prior depth; true Beam-over-Floor top/below/transparent evidence covers physical occlusion and blending. |
| Registered discoverability | PASS | Five Level commands, `panel.levels`, Feature Access and Surface Inventory share the same runtime authority. |
| PF-3A freeze | PASS | BabylonScene changed only to install the rendering-depth policy. Plan drag, snap and movement-solver semantics were not changed; ADR-001 movement behavior remains frozen. |
| Console/runtime | PASS | Focused Chromium proves 25,000 mm Level finite and console-clean; existing movement, native-asset and commercial-output regressions also pass when run in their focused phases. |
| Complete local gate | PARTIAL | Audit/dependency/governance/token/build and 163 files / 1376 unit tests pass. Aggregate E2E passed 102/103 parallel scenarios before a commercial PNG timing boundary, then the isolated runtime-access route timed out; focused commercial-output and P1-BLD2 Floor workflows pass. |
| Exact-head CI | DELIVERY | The Draft PR exact-head Quality Gate records the final aggregate result without a post-CI source mutation. |
| Contract Verified | PENDING | Independent review against ADR-003 and runtime evidence. |
| Product Accepted | FAIL | Focused manual re-acceptance remains pending after independent contract/runtime review. |

Scope exclusions: basement/negative Levels, automatic floor detection, Floor Area inference, plan views, clipping, stairs/elevators, BIM/analysis, PF-3B and any movement-solver change.

## Interaction change gate application

`docs/checklists/INTERACTION_CHANGE_GATE.md` applies. Sections A-D are frozen by Product Constitution, Interaction Standard sections 3/4/11, official benchmark evidence and ADR-003. Existing Entity/Selection/History/Placement authorities remain canonical. Sections E-F require Machine, Civil, locks, Undo/Redo, persistence, 25,000 mm and no-red-console runtime paths. Section G remains within the initial implementation round. Section H requires reviewer-side panel/Inspector visual review before any user acceptance request. Section I starts Automation Green/Contract Verified/Product Accepted as PENDING. No section J stop condition is authorized by this contract.
