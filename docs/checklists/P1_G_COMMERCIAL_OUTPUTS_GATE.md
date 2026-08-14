# P1-G Presentation And Commercial Outputs Gate

| Gate | Status | Evidence |
| --- | --- | --- |
| Canonical baseline | PASS | Branch created from `acd01dde98f4611129c111eed39616127a953a4e` |
| One derived output snapshot | PASS | Deeply immutable, transient `CommercialOutputSnapshot` |
| No persistence/schema change | PASS | No project/layout/IndexedDB/export-store version change |
| P1-E mapping authority | PASS | BOM/report properties resolved from projection `exportMappings` |
| Unknown policy | PASS | Explicit Unknown values, counted warning, non-blocking export |
| File-owned product surface | PASS | Registered `Commercial Outputs...` modal route |
| Registry-routed export actions | PASS | Separate Excel, PDF, PNG runtime commands |
| Empty-output enablement | PASS | Command rules and accessible disabled reasons |
| Shared filename authority | PASS | Sanitized project/layout/revision identity for all outputs |
| Real XLSX | PASS | Valid OpenXML package; Summary, BOM, Instances |
| Stable BOM grouping | PASS | Definition/library identity; duplicate conveyor quantity 2 |
| Canonical instance rows | PASS | One machine row with mm transforms, dimensions, layer, group |
| Real measured PDF | PASS | A3 landscape Page 1 plan + Page 2 schedule |
| Canonical 2D geometry | PASS | Front-left-bottom mm footprints, rotation and negative coordinates |
| Current-camera PNG | PASS | Babylon render-target capture at 1920 x 1080 |
| Clean capture restoration | PASS | Transient affordances restored in success/failure tests |
| Genuine ATARA flow | PASS | Flow Pack, two Conveyors, Robot Palletizer through normal Library path |
| Runtime invariants | PASS | No camera, selection, history, dirty, workspace, or lifecycle mutation |
| Feature Access evidence | PASS | Commands/panel/surface inventory and observed execution gate |
| Dependency policy | PASS | Isolated MIT `fflate` and `pdf-lib`; dynamic serializers |
| Focused validation | PASS | 13 files / 99 tests plus two focused Chromium tests |
| Dependency audit | PASS | 0 vulnerabilities at `--audit-level=low` |
| Design-token governance | PASS | 235 maintained files |
| Build | PASS | TypeScript and Vite production build; serializers lazy-loaded |
| Full unit suite | PASS | 136 files / 1191 tests |
| Full Chromium suite | PASS | 64 tests |
| Diff check | PASS | `git diff --check` |
| Exact-head GitHub Quality Gate | PR GATE | Evaluated against the pushed exact head before manual acceptance |
| Manual output acceptance | BLOCKED | Review XLSX, both PDF pages, and PNG after green exact-head CI |

Decision: **READY FOR EXACT-HEAD CI; MANUAL OUTPUT ACCEPTANCE REQUIRED AFTER GREEN CI.**
