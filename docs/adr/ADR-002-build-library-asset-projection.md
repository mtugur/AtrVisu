# ADR-002 - Heterogeneous Build Library Asset Projection

## Status

Accepted for P1-BLD1 implementation, before runtime changes.

## Context and Authority

The Product Constitution distinguishes reusable Library Assets from placed project instances. The Phase-1 UI spec defines Library as the answer to "What can I add?" Interaction Standard section 6 requires a canonical definition-to-instance placement route. The task-similar official evidence is recorded in `docs/benchmarks/P1_BLD1_BUILD_LIBRARY_EVIDENCE.md`.

The current browser indexes `LoadedMachineLibrary` records only, while Civil references use a separate type and creation function. Presenting Civil as a fake MachineDefinition would compromise persistence, BOM and rendering identity. A second normal Build-add panel would split discovery.

## Decision

- The existing Library browser projects a discriminated `machine` or `civil` asset record. Machine records continue to reference validated machine library items. Civil records reference a small immutable built-in primitive catalog, never a persisted machine definition.
- The Build catalog has one source key and the hierarchy `Build > Structure > Column, Beam, Wall, Door / Opening` and `Build > Planning > Floor Area, Walkway, Restricted Area, Reference Zone`. It is a creation template, not a second placed domain model or storage schema.
- Search, filter, Favorites and Recent operate over the combined browser index. Machine Add and Custom Variant continue their existing command paths. Build Add dispatches a registered civil creation command to the existing `createCivilReference` placement authority. The resulting entity is `CivilReferenceItem` with canonical millimetres and front-left-bottom reference point.
- The old CivilReferencePanel add-button stack is not a normal creation surface. Insert-menu per-type Build add shortcuts are removed from the normal menu; registered legacy command IDs may remain as compatibility bindings but do not establish another placement authority.
- `beam` is a rectangular solid Civil reference, not a BIM or structural-analysis object. Its default dimensions and style are declared in the canonical Civil defaults. Existing layout data remains readable without a schema migration.
- Civil color and opacity use only `CivilReferenceItem.style`. New items get type defaults; absent legacy style resolves to existing type defaults. Valid user colors are opaque `#RRGGBB`; opacity is finite in `[0.05, 1]`. Inspector edits respect item/layer lock, participate in Undo/Redo, and update the existing Babylon material.
- P1-BLD1 does not change Plan drag, snap, camera, selection, history or Group semantics. Interaction Standard section 3 and ADR-001 remain frozen, including the approximately 20 m limitation.

## Forbidden Alternatives

No fake machine records, second persistent Build definition store, competing Build-add panel, presentation-only style state, level-relative elevation, structural calculations, DXF/DWG/BIM import, or movement solver change.

## Acceptance

Machine and Build assets are distinguishable in the same Library. All eight Build types add canonical Civil instances; Beam persists and collides as a solid reference. Search/filter/hierarchy and existing machine Add remain intact. Civil style edits round-trip, render immediately, undo/redo, and reject locked items/layers. Old Civil data loads with its former defaults. Existing PF-3A direct body drag, alignment, group, lock and no-red-console behavior remains green. Visible changes require final manual product acceptance after independent review.
