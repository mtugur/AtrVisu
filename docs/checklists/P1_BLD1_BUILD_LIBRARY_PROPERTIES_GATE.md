# P1-BLD1 Build Library and Properties Gate

| Gate | State | Evidence |
| --- | --- | --- |
| Exact base | PASS | Branch starts from main `397571bd26aea5c2503a1c76705a860b313d7c29`. |
| Benchmark-first contract | PASS | `docs/benchmarks/P1_BLD1_BUILD_LIBRARY_EVIDENCE.md` and ADR-002 were committed before runtime implementation. |
| Shared discovery | PASS | One Asset Browser indexes discriminated machine and Civil template records; existing machine source order and Add class remain intact. |
| Canonical placement | PASS | Machine Add uses `library.addMachine`; Build Add uses `civil.addPrimitive` and existing `createCivilReference`. No fake machine or second Build store. |
| Build hierarchy | PASS | Structure: Column, Beam, Wall, Door / Opening. Planning: Floor Area, Walkway, Restricted Area, Reference Zone. |
| Build feature access | PASS | Review `5275545907`: `civil.doorOpening` joins the seven existing required-runtime Build features on `surface.buildLibrary`; platform regression test enforces the eight catalog types and canonical command/panel links. |
| No competing creation UI | PASS | Legacy Civil add panel and per-type Insert actions removed. Six per-type commands stay registry/runtime-bound for compatibility but are declaratively excluded from Command Palette; Library Build uses `civil.addPrimitive`. Review `5278343627` adapter and Chromium regressions protect this split. |
| Beam domain | PASS | Canonical Civil type, 6000 x 300 x 500 mm, 3000 mm Elevation, hard collision, standard entity/layer/selection/alignment/history path. |
| Style authority | PASS | `CivilReferenceItem.style` only; arbitrary safe RGB color and opacity `[0.05, 1]`; existing Babylon material updates in place. |
| Old data | PASS | Missing style resolves to existing per-type defaults; no schema migration. |
| Interaction regression | PASS | Existing PF-3A direct body-drag modules unchanged; focused Beam Chromium path verifies Plan drag and unchanged Elevation. |
| No-red-console | PASS | Focused Chromium paths collect console/page errors, including maximum update depth. |
| Complete local gate | BLOCKED | Current correction: audit low 0, `npm ls --all`, token and interaction governance, build, and 161 unit files / 1353 tests pass. New Chromium regression passes, but complete E2E has a repeatable existing commercial PNG export timeout on this host; the isolated runtime-feature-access PNG step also timed out under full-suite load. Previous 100-test gate was green at the preceding correction head. |
| Exact-head CI | PENDING | Draft PR Quality Gate after normal push. |
| Contract Verified | PENDING | Independent review against ADR-002 and runtime evidence. |
| Product Accepted | PENDING | Final manual acceptance after review; automation green alone does not accept visible behavior. |

Scope exclusions: Levels, level-relative elevation, BIM/analysis, PF-3B, and any PF-3A movement solver change.

## Interaction change gate application

The generic `docs/checklists/INTERACTION_CHANGE_GATE.md` is applied to this package without changing that normative template. Sections A and B pass through the pre-implementation benchmark/ADR checkpoint and bounded Build Library scope. Section C passes through the registered Civil command, canonical Civil item, existing selection/history authority and opt-in diagnostics. Section D is N/A for new movement semantics: the accepted PF-3A body-drag model was not changed; existing and Beam pointer E2E paths protect it. Sections E and F cover persisted/migrated preference, Inspector, dock, Civil drag, Undo/Redo, import/serialization and no-red-console paths; the current complete local E2E is blocked at commercial PNG export timing. Section G remains review-pending for Contract Verified and final manual acceptance. Section H is N/A for new viewport affordances; Build card and Inspector visual acceptance remains Product Accepted pending. Section I: Automation Green local E2E BLOCKED / exact-head CI pending; Contract Verified PENDING; Product Accepted PENDING. No section J stop condition fired.
