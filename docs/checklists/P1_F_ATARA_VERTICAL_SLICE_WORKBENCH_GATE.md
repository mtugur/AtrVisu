# P1-F ATARA Vertical Slice and Workbench Gate

| Gate | Status | Evidence |
| --- | --- | --- |
| Exact canonical baseline | PASS | Branch created from `4dbd1c73413ac8af3237f819bec1230ce3899af7` |
| Nine-region workbench mapping | PASS | WorkbenchShell/AppShell tests and ADR-010 |
| Primary Dock ownership | PASS | Library, Explorer, Layers, Groups registry-backed contributions |
| One active Primary panel | PASS | Workbench composition unit and Chromium tests |
| Layout Explorer uses PlatformEntity | PASS | `LayoutExplorer` typed contract and composition tests |
| Layout Explorer accessibility semantics | PASS | Native navigation/nested-list semantics; no incomplete ARIA tree declaration |
| Bidirectional Runtime Selection | PASS | Scene/Explorer Chromium vertical slice |
| Rename safety | PASS | Disabled explanatory note; no direct mutation |
| Context-only Inspector | PASS | Context tests; no global tool controls in Inspector |
| Contextual panel authority | PASS | Annotations, Precision Placement, Alignment Tools, Connection Point Snap, and Inspector DOM follow UI Preferences / Runtime Panel state |
| Contextual collapse authority | PASS | Controlled contribution disclosure updates the same Runtime Panel state |
| P1-E Smart Asset Properties | PASS | Existing schema tests plus vertical-slice Inspector assertion |
| Generic Bottom Dock | PASS | Contribution contract and Viewpoints lifecycle tests |
| Persistent Status Bar | PASS | Live selection, primary, mm, snap, dirty tests |
| Workspace preset integration | PASS | Registry/application tests and Chromium persistence tests |
| Hidden panel restoration | PASS | Runtime availability correction and Chromium reload test |
| Global tool routing | PASS | File/View/Insert/Tools command and modal smoke coverage |
| Display/overlay reachability | PASS | Registered View route exercises all persisted overlay capabilities without restoring the compatibility stack |
| Workspace/manual override policy | PASS | Presets retain exact composition; manual contextual visibility overrides clear active workspace identity |
| Feature Access preservation | PASS | Matrix, surface inventory, coverage audit, and runtime evidence tests |
| Genuine ATARA assets | PASS | Flow Pack Machine, Belt Conveyor, Robot Palletizer repository records |
| Normal product vertical slice | PASS | Library -> scene -> Explorer -> Inspector -> Layers/Groups -> Viewpoint E2E |
| No editor/scene remount | PASS | Lifecycle generation and single App/EditorHost/canvas assertions |
| Viewport invariants | PASS | Panel collapse/resize, orthographic, camera, selection, history, dirty tests |
| Responsive geometry | PASS | 1440x900, 1024x768, 640x800 Chromium coverage |
| No red console/page errors | PASS | E2E collectors |
| Build | PASS | TypeScript + Vite; known chunk warning only |
| Unit suite | PASS | 130 files / 1161 tests |
| Full Chromium suite | PASS | 60/60 tests, including the real ATARA vertical slice and correction regressions |
| Dependency audit | PASS | 0 vulnerabilities at low severity |
| Design-token governance | PASS | 222 maintained files |
| Diff check | PASS | Final whitespace/error scan |
| Manual visual acceptance | OPEN | Bounded desktop/medium/narrow composition review |
| P1-G outputs excluded | PASS | No BOM/Excel/PDF/quotation implementation |

Decision: **AUTOMATIC IMPLEMENTATION GATE PASSED; MANUAL VISUAL ACCEPTANCE REMAINS OPEN.**
