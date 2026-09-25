# ADR-003 - Project Level Datum and Relative Elevation

## Status

Accepted for P1-BLD2 implementation before runtime changes.

## Context and Authority

The Product Constitution requires a single engineering model and contract-first user interaction. Interaction Standard sections 3, 4 and 11 preserve canonical absolute Elevation, separate it from Plan Move, and require atomic Undo. The task-similar official benchmark record is `docs/benchmarks/P1_BLD2_LEVEL_DATUM_EVIDENCE.md`.

Machines currently store canonical world elevation in `PlacedMachine.elevationMm`; Civil references store it in `CivilReferenceItem.positionMm.zMm`. Users must not manually add a floor datum to every entity elevation, but a second independently editable elevation source would split the domain authority.

## Decision

- `LayoutLevel` is one project/layout datum domain with stable `id`, `name`, non-negative finite `elevationMm`, system identity, and creation/update timestamps.
- The canonical system Ground Level has stable ID `ground`, name `Ground`, datum `0 mm`, cannot be renamed, moved or deleted, and always exists after normalization.
- `AtrVisuLayout.levels` persists Levels. `PlacedMachine`, serialized `LayoutObject`, and `CivilReferenceItem` may persist `levelId`.
- Missing/invalid `levelId` resolves to Ground without changing canonical world elevation. No schema version bump or destructive migration is required.
- Canonical world elevation remains `PlacedMachine.elevationMm` and `CivilReferenceItem.positionMm.zMm`. Rendering, collision, connection transforms, platform Entity transforms and exports continue to read those values.
- Relative elevation is derived: `world elevation - assigned Level datum`. Editing relative elevation writes `Level datum + relative elevation` to the canonical world value.
- A Level datum represents the finished floor/walking surface elevation (FFL), not the structural slab bottom.
- `floor-area` remains Civil geometry and preserves `CivilReferenceItem.positionMm.zMm` as its canonical bottom-world elevation. Its Level-relative editing anchor is the top surface: `topWorldMm = positionMm.zMm + sizeMm.heightMm` and `topRelativeMm = topWorldMm - level.elevationMm`.
- Editing a Floor Area top-relative elevation writes `positionMm.zMm = level.elevationMm + topRelativeMm - sizeMm.heightMm`. Changing Floor Area thickness preserves that top-world elevation and moves only the canonical bottom by the thickness delta.
- New Floor Area placement uses top-relative `0 mm`, so its top surface equals the Active Level datum. A Machine at local elevation `0 mm` independently places its base at the same datum; no support-height, overlap or contact inference connects them.
- Reassigning a Floor Area to another Level preserves its top-relative elevation. Changing its Level datum moves the entire Floor Area rigidly by the datum delta, preserving thickness and top-relative elevation.
- Changing a Civil reference type across the Floor Area boundary preserves the user-visible Level-relative anchor. The source type determines the current anchor world elevation before the type change; the target type and existing height then derive the canonical bottom world elevation from that same anchor. Floor Area uses its top surface as the anchor, while every other Civil type uses its bottom/base. Non-Floor-to-non-Floor type changes retain their existing canonical bottom unchanged.
- Civil type transitions preserve the existing dimensions and style. A Ground Floor Area with `350 mm` height and bottom `-350 mm` therefore becomes a Wall with base `0 mm`; changing that Wall back to Floor Area restores bottom `-350 mm` and top `0 mm`.
- A Ground-attached Floor Area may therefore have a negative finite canonical bottom-world elevation. This bounded signed world coordinate does not permit negative/basement Level datums, which remain out of scope.
- Explicit entity reassignment preserves relative elevation and therefore moves world elevation by the difference between Level datums.
- Changing a Level datum preserves each assigned entity's relative elevation and atomically changes the Level plus all assigned Machine/Civil world elevations in one history transaction.
- Active Level is UI context persisted in the layout as `activeLevelId`. New Machine and Build instances receive that Level and add their asset/default local elevation to the active datum. Asset definitions remain unchanged.
- Ground is the fallback Active Level. Invalid active IDs normalize to Ground.
- A datum edit or entity Level/elevation edit respects item and layer lock authority. If any assigned entity would be blocked, the complete datum change is rejected with a clear reason and no history/dirty mutation.
- Ground cannot be deleted. A user Level with assigned Machine/Civil content cannot be deleted. Unused user Levels may be deleted; active deletion returns Active Level to Ground.
- Levels are managed in one registered Primary Dock panel. Persistent mutations use registered Level commands and the existing App/history authority; there is no competing local persistent store.
- A Floor Area remains Civil geometry only. It does not create, define or infer a Level, and it does not infer Machine support elevation.

## Command and Surface Contract

P1-BLD2 registers `level.add`, `level.rename`, `level.setDatum`, `level.delete`, and `level.setActive`. The dedicated `panel.levels` Primary Dock surface exposes those commands. Feature Access and Surface Inventory link the same command/panel authorities.

Entity Level and relative-elevation property edits use the canonical entity update/history authority. They do not add a second command family or elevation store.

## Interaction Contract

- Machine and non-Floor Civil Inspector labels remain `Level`, `Elevation above Level (mm)`, and read-only `World Elevation (mm)`.
- Floor Area Inspector labels are `Level`, `Top Elevation above Level (mm)`, and read-only `Top Surface World Elevation (mm)`. The canonical bottom remains the serialized/rendered geometry authority, not a second editable elevation.
- Changing the entity Level preserves its displayed elevation above Level.
- Changing a Floor Area Level preserves its displayed top elevation above Level. Changing Floor Area thickness preserves its top surface world elevation.
- Changing Civil Type from Floor Area to a non-Floor type preserves the former top-relative value as the target base-relative value. Changing from a non-Floor type to Floor Area preserves the former base-relative value as the target top-relative value.
- Changing the Level datum preserves every assigned entity's elevation above Level.
- Level datum and user-entered relative elevation are non-negative finite millimetre values in P1-BLD2. A Floor Area canonical bottom may be signed only as the derived consequence of its top-surface anchor. Basement/negative Levels are out of scope.
- Plan/body drag remains exactly ADR-001: one fixed picked-elevation horizontal plane, unchanged Elevation, rigid Group delta, continuous snap and one Undo transaction. No Level operation changes pointer mathematics.

## Forbidden Alternatives

No Level-as-Library-asset, Level-as-Civil-item, Floor-Area-to-Level inference, Machine support-height inference, overlap/contact solver, automatic Floor Area Level creation, Z-position inference, Layer reuse, second relative-elevation store, visual-only offset, partial movement of locked content, silent reassignment on deletion, schema fork, BIM hosting, story visibility, clipping, basement Levels, movement fallback or PF-3B redesign.

## Acceptance

Legacy layouts retain exact world elevations and normalize to Ground. New Machine/Build placement uses Active Level plus existing local/default elevation, except Floor Area whose top surface defaults to the Active Level datum. Ground `0 mm` with a `350 mm` Floor Area yields bottom `-350 mm`, top `0 mm`, and Machine base `0 mm`; Level 2 `6000 mm` yields Floor bottom `5650 mm`, top `6000 mm`, and Machine base `6000 mm`. Machine/non-Floor Civil relative elevation and Floor Area top-relative elevation remain derived from canonical world geometry. Reassignment, datum change, and Civil type transitions preserve the applicable relative anchor. A Floor Area at top-relative `0 mm` and height `350 mm` transitions to a Wall at base-relative `0 mm`, and the reverse transition restores the Floor Area bottom to `-350 mm` on Ground. Floor Area thickness edits preserve its top surface. Datum change is one atomic Undo/Redo transaction and rejects any locked assigned content. Assigned Level deletion is blocked. Save/reload/export/import preserve Levels, assignments, signed Floor Area bottoms and canonical world geometry. A 25,000 mm Level remains finite and console-clean without changing ADR-001's accepted limitation.
