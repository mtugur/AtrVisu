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
| XLSX default readability | PASS | Deterministic widths, wrapped headers, frozen header/identity panes, BOM/Instances filters |
| XLSX numeric presentation | PASS | Canonical mm/degree values remain numeric; `0.###` display format |
| Stable BOM grouping | PASS | Definition/library identity; duplicate conveyor quantity 2 |
| Canonical instance rows | PASS | One machine row with mm transforms, dimensions, layer, group |
| Real measured PDF | PASS | A3 landscape Page 1 plan + paginated Page 2+ schedule |
| Unicode PDF authority | PASS | Embedded Noto Sans Regular/Bold; offline OFL assets via fontkit |
| Turkish commercial text | PASS | Metadata, equipment, report values, filename, and Chromium download |
| Schedule continuation | PASS | 35 rows/page; repeated context/header; no silent truncation |
| Schedule boundary coverage | PASS | 0/1/4/35/36/100 rows; every instance exactly once |
| Canonical 2D geometry | PASS | Front-left-bottom mm footprints, rotation and negative coordinates |
| Plan label/orientation separation | PASS | Orientation first, opaque center knockout, then Unicode label |
| Generated timestamp presentation | PASS | Canonical ISO retained; shared locale-independent `YYYY-MM-DD HH:mm UTC` display |
| Current-camera PNG | PASS | Babylon render-target capture at 1920 x 1080 |
| Clean capture restoration | PASS | Transient affordances restored in success/failure tests |
| Genuine ATARA flow | PASS | Flow Pack, two Conveyors, Robot Palletizer through normal Library path |
| Runtime invariants | PASS | No camera, selection, history, dirty, workspace, or lifecycle mutation |
| Feature Access evidence | PASS | Commands/panel/surface inventory and observed execution gate |
| Dependency policy | PASS | MIT `fflate`, `pdf-lib`, `@pdf-lib/fontkit`; OFL Noto Sans; dynamic serializers |
| Independent review | PASS | Correctness blockers from `5292939994` covered in one batch |
| Manual artifact polish | PASS | Readability blockers from `5293547482` corrected without output-contract changes |
| Focused validation | PASS | Initial 13/99 plus correction 5/24 and focused Chromium download |
| Dependency audit | PASS | 0 vulnerabilities at `--audit-level=low` |
| Design-token governance | PASS | 239 maintained files |
| Build | PASS | TypeScript and Vite production build; serializers lazy-loaded |
| Full unit suite | PASS | 136 files / 1203 tests |
| Full Chromium suite | PASS | 64 tests |
| Diff check | PASS | `git diff --check` |
| Exact-head GitHub Quality Gate | PR GATE | Evaluated against the pushed exact head before manual acceptance |
| Manual output acceptance | BLOCKED | Re-review polished XLSX and PDF after green exact-head CI; accepted PNG behavior is unchanged |

Decision: **READY FOR EXACT-HEAD CI; FINAL OUTPUT MANUAL RE-ACCEPTANCE REQUIRED AFTER GREEN CI.**
