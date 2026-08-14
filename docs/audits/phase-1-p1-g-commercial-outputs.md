# Phase 1 P1-G Presentation And Commercial Outputs Audit

Date: 2026-08-14

Branch: `feat/phase-1-commercial-outputs-v01`

Baseline: `acd01dde98f4611129c111eed39616127a953a4e`

## Decision

P1-G adds three real, client-side outputs through one derived commercial
projection and existing runtime command/panel authorities. It adds no export
store, persistence version, pricing model, second property interpretation,
camera authority, selection authority, or scene lifecycle.

## Output Authority Evidence

| Output | Runtime authority | Result |
| --- | --- | --- |
| BOM / Equipment Excel | Immutable snapshot + P1-E `bom` mappings | Real XLSX with Summary, BOM, Instances |
| Measured 2D Layout Plan | Same snapshot + canonical mm footprints + P1-E `report` mappings | Real two-page A3 landscape PDF |
| 3D Snapshot | Existing Babylon scene/current camera | Presentation-clean 1920 x 1080 PNG |

The snapshot contains project/layout/revision identity, equipment instances,
stable BOM groups, layer/group context, canonical transforms/dimensions,
visible plan footprints, mapped commercial values, data-gap count, warnings,
and deterministic generated timestamp. It is deeply frozen and transient.

## Genuine ATARA Evidence

Chromium uses the normal Library path to place:

- Flow Pack Machine (`packaging-flowpack-01`)
- Belt Conveyor (`conveyor-belt-01`), twice
- Robot Palletizer (`robot-palletizer-01`)

The workbook contains three BOM groups and four Instances rows. Both conveyors
share stable identity `atara-standard:conveyor-belt-01`, producing BOM quantity
2 without grouping by display name. Repository asset metadata that is absent
remains explicit `Unknown` and appears in the modal warning and output cells.

## Plan And Snapshot Evidence

The plan model covers zero-degree, 90-degree, arbitrary-angle, and negative
coordinate footprints through front-left-bottom millimetre utilities. Overall
X/Y extents come from rotated corners. Hidden domain geometry is excluded from
the plan while BOM quantities remain independent of panel and selection state.

PNG capture uses the current camera and a render-target screenshot. It hides
only transient editor affordances, restores every visibility value after
success or failure, preserves labels/annotations supported by current display
settings, and does not capture application chrome.

## Dependencies

- `fflate@0.8.3`: dependency-free MIT OpenXML ZIP adapter.
- `pdf-lib@1.17.1`: MIT client-side PDF document adapter.

Both are dynamically loaded at export time. No unrelated package was upgraded.
The npm lockfile is the sole dependency-resolution record.

## Runtime Surface Evidence

The File menu opens `panel.commercialOutputs` through
`project.commercialOutputs`. The modal invokes
`commercial.exportBomExcel`, `commercial.exportLayoutPdf`, and
`commercial.exportScenePng`. Command seeds, panel seed/runtime bridge, Feature
Access matrix, surface inventory, and observed execution evidence all use those
same IDs.

## Validation Evidence

- Focused commercial/platform tests: PASS, 13 files / 99 tests.
- Focused Chromium commercial download: PASS, 1 test.
- Focused runtime Feature Access observed gate: PASS, 1 test.
- Dependency audit: PASS, 0 vulnerabilities at `--audit-level=low`.
- Design-token governance: PASS, 235 maintained files.
- Build: PASS; XLSX and PDF serializers split into on-demand chunks.
- Full unit: PASS, 136 files / 1191 tests.
- Full Chromium: PASS, 64 tests.
- Diff check: PASS.

Decision: **READY FOR EXACT-HEAD CI; MANUAL OUTPUT ACCEPTANCE REQUIRED AFTER GREEN CI.**
