# ADR-011: Commercial Output Projection Authority

Status: **Accepted**

## Context

P1-G must produce a genuine equipment workbook, measured layout plan, and
presentation image without adding persistent export state or reinterpreting
the Phase 1 entity/property authorities independently in each serializer.

## Decision

Commercial outputs use one transient, deeply immutable
`CommercialOutputSnapshot`, derived on demand from current project, layout,
and revision identity; canonical placed machines and civil references;
front-left-bottom millimetre transforms and dimensions; layers and groups; and
the P1-E property projection.

The snapshot is not persisted and does not participate in history, dirty state,
selection, camera, workspace, or IndexedDB schemas. Property columns are
resolved only from the P1-E `bom` and `report` export mappings in schema order.
Canonical raw values and projected units are retained. Missing mapped values
are represented as `Unknown`; they are counted and disclosed but do not block
an otherwise meaningful export.

BOM aggregation uses stable definition/library identity. Display names are
presentation only and never determine equivalence. Instance rows retain one
row per placed machine with canonical Plan X, Plan Y, rotation, dimensions,
layer, and group context.

The measured plan is a deterministic A3 landscape document. Its geometry is
derived from canonical domain footprints, including rotated and negative
coordinates, and never from Babylon mesh bounds or metres. Page 1 contains the
fit-to-page top plan, orientation, origin, and overall extents. Page 2 and any
required continuation pages consume the same snapshot's P1-E `report` mappings
for the equipment schedule. Schedule pages have a deterministic 35-row
capacity, repeat their title, project/layout/revision identity, and column
headers, and preserve every equipment instance exactly once.

PDF presentation text uses one embedded Noto Sans font authority with separate
Regular and Bold files. The files are sourced from the official
`notofonts/noto-fonts` repository, are licensed under the SIL Open Font License
1.1 recorded beside the assets, and are bundled into the lazy PDF serializer.
No system font or remote runtime font request participates in output. Turkish
project, layout, equipment, and report text is preserved without
transliteration or ASCII fallback.

The 3D presentation image is captured from the existing Babylon scene and
current camera at 1920 x 1080. The capture does not alter the camera or scene.
Selection, metadata, collision, clearance, connection-point, civil-selection,
and annotation-handle affordances are hidden only for the render operation and
restored in `finally`. Existing presentation labels and annotations remain
subject to the current scene display settings. Application chrome is absent
because the export is rendered from the Babylon scene, not the DOM.

All three filenames use one metadata sanitizer and the same project/layout/
revision identity. `Untitled` and `No revision` are explicit fallbacks.

## Command And Surface Authority

`Commercial Outputs...` is a File-owned command that opens
`panel.commercialOutputs`. The modal's Excel, PDF, and PNG actions are distinct
registered runtime commands. Command enablement prevents meaningless empty
exports and supplies an accessible disabled reason. The Feature Access matrix,
surface inventory, and observed runtime execution gate include all four routes.

## Dependency Decision

`fflate` is used only by the XLSX adapter to create a real OpenXML ZIP package.
It is MIT licensed, dependency-free, client-side, and has no native executable
or runtime service. `pdf-lib` is used only by the PDF adapter for a real A3
document. `@pdf-lib/fontkit` is the minimal MIT-licensed PDF font embedding
adapter. The two Noto Sans TTF assets are covered by the included SIL Open Font
License 1.1. All code is client-side, has no native binary or postinstall
behavior, and the font assets are loaded from the local lazy serializer bundle,
never a remote service. Both serializers are loaded on demand, are isolated
from the domain model, and introduce no storage schema or remote execution
path. The package lock remains npm-owned and the final audit must report zero
vulnerabilities.

## Consequences

- Excel and PDF cannot drift into separate property or coordinate models.
- Commercial gaps remain honest and visible rather than fabricated.
- The genuine ATARA vertical slice groups duplicate conveyors correctly while
  preserving separate instances.
- Serializer dependencies do not enlarge the initial output path because they
  are dynamically imported only when their command executes.
- Commercial PDF schedules grow by continuation pages and never silently omit
  equipment at a page boundary.
- Formal fabrication scale, quotation pricing, proposal templates, CAD output,
  and server-side reporting remain outside P1-G.

## Verification Obligations

- Pure tests cover deterministic snapshot derivation, deep immutability,
  mapping order, Unknown values, stable grouping, canonical instance rows,
  filenames, rotation, negative coordinates, extents, and injected time.
- Serializer tests inspect the XLSX OpenXML package and parse the PDF metadata,
  page count, dimensions, Unicode font path, schedule boundaries, and canonical
  plan model. Turkish content and 0/1/4/35/36/100-row schedules are explicit
  regressions.
- Chromium downloads all three outputs through registered product commands and
  validates file signatures, names, workbook contents, PNG dimensions, state
  invariants, single editor/canvas identity, and no red errors.
- A bounded final manual acceptance reviews the workbook, every generated PDF
  page, and presentation image readability from a genuine ATARA line.

Independent review `5292939994` is closed architecturally by the embedded
Unicode font authority and deterministic schedule continuation policy.
