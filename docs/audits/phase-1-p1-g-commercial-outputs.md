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
| Measured 2D Layout Plan | Same snapshot + canonical mm footprints + P1-E `report` mappings | Real paginated A3 landscape PDF |
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

The workbook opens with deterministic presentation metadata rather than
requiring manual column repair. Summary stays compact. BOM and Instances keep
all existing columns and raw values while declaring wider identity/equipment
columns, wrapped header rows, frozen header and leading identity panes, and
autofilters over their populated ranges. Millimetre and degree values remain
numeric and use the locale-neutral `0.###` display format. Wide mapped property
sets continue to use horizontal worksheet scrolling.

## Plan And Snapshot Evidence

The plan model covers zero-degree, 90-degree, arbitrary-angle, and negative
coordinate footprints through front-left-bottom millimetre utilities. Overall
X/Y extents come from rotated corners. Hidden domain geometry is excluded from
the plan while BOM quantities remain independent of panel and selection state.

The schedule begins on page 2 and continues at a deterministic 35 rows per A3
landscape page. Every continuation repeats schedule context, project/layout/
revision identity, and column headers. Tests preserve every instance exactly
once at 0, 1, 4, 35, 36, and 100 rows; 100 rows produce three schedule pages
plus the measured plan page.

PDF text embeds local Noto Sans Regular and Bold assets from the official Noto
repository. The assets carry the included SIL Open Font License 1.1 and are
bundled into the lazy PDF serializer. `@pdf-lib/fontkit` provides the
MIT-licensed embedding adapter. There is no remote runtime font fetch or system
font dependency. Turkish strings including `İstanbul Şişeleme Hattı`,
`Ürün Besleme Konveyörü`, `Görüş / Ölçüm`, and `Müşteri Çözümü` serialize and
reload without transliteration or failure.

Plan equipment labels are rendered after the front/orientation line over a
small opaque knockout that covers the indicator origin. The deterministic
presentation command order is tested for normal, narrow, and rotated footprints,
including a Turkish equipment label, without removing orientation geometry.

The snapshot's canonical ISO `generatedAt` value remains unchanged and supplies
PDF creation/modification metadata. A shared formatter presents it as
`YYYY-MM-DD HH:mm UTC` in the XLSX Summary and visible PDF title block without
browser locale dependence.

Vendored asset SHA-256 evidence:

- NotoSans-Regular.ttf: `B85C38ECEA8A7CFB39C24E395A4007474FA5A4FC864F6EE33309EB4948D232D5`
- NotoSans-Bold.ttf: `C976E4B1B99EDC88775377FCC21692CA4BFA46B6D6CA6522BFDA505B28FF9D6A`

PNG capture uses the current camera and a render-target screenshot. It hides
only transient editor affordances, restores every visibility value after
success or failure, preserves labels/annotations supported by current display
settings, and does not capture application chrome.

## Dependencies

- `fflate@0.8.3`: dependency-free MIT OpenXML ZIP adapter.
- `pdf-lib@1.17.1`: MIT client-side PDF document adapter.
- `@pdf-lib/fontkit@1.1.1`: MIT custom-font embedding adapter.
- Noto Sans Regular/Bold TTF: SIL Open Font License 1.1, vendored with license.

Serializer code and font assets are loaded only with the export path. No
unrelated package was upgraded. The npm lockfile is the sole
dependency-resolution record. Its correction scope adds only the direct
`@pdf-lib/fontkit@1.1.1` node; the required `pako` range is satisfied by the
existing PDF dependency graph.

Independent review `5292939994` is addressed by the Unicode font and no-row-loss
pagination regressions. Manual artifact review `5293547482` is addressed by the
bounded workbook-readability, UTC timestamp, and plan-label presentation
corrections without changing output data or PNG capture.

## Runtime Surface Evidence

The File menu opens `panel.commercialOutputs` through
`project.commercialOutputs`. The modal invokes
`commercial.exportBomExcel`, `commercial.exportLayoutPdf`, and
`commercial.exportScenePng`. Command seeds, panel seed/runtime bridge, Feature
Access matrix, surface inventory, and observed execution evidence all use those
same IDs.

## Validation Evidence

- Focused commercial/platform tests: PASS, 13 files / 99 tests.
- Focused correction regression: PASS, 5 files / 24 tests.
- Focused final presentation regression: PASS, 4 files / 24 tests, including
  OpenXML/PDF/timestamp coverage and deterministic label separation.
- Focused Chromium commercial download: PASS, 1 test.
- Focused runtime Feature Access observed gate: PASS, 1 test.
- Dependency audit: PASS, 0 vulnerabilities at `--audit-level=low`.
- Design-token governance: PASS, 239 maintained files.
- Build: PASS; XLSX and Unicode PDF serializers split into on-demand chunks.
- Full unit: PASS, 136 files / 1203 tests.
- Full Chromium: PASS, 64 tests.
- Diff check: PASS.

Decision: **READY FOR EXACT-HEAD CI; FINAL OUTPUT MANUAL RE-ACCEPTANCE REQUIRED AFTER GREEN CI.**
