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
- Explicit entity reassignment preserves relative elevation and therefore moves world elevation by the difference between Level datums.
- Changing a Level datum preserves each assigned entity's relative elevation and atomically changes the Level plus all assigned Machine/Civil world elevations in one history transaction.
- Active Level is UI context persisted in the layout as `activeLevelId`. New Machine and Build instances receive that Level and add their asset/default local elevation to the active datum. Asset definitions remain unchanged.
- Ground is the fallback Active Level. Invalid active IDs normalize to Ground.
- A datum edit or entity Level/elevation edit respects item and layer lock authority. If any assigned entity would be blocked, the complete datum change is rejected with a clear reason and no history/dirty mutation.
- Ground cannot be deleted. A user Level with assigned Machine/Civil content cannot be deleted. Unused user Levels may be deleted; active deletion returns Active Level to Ground.
- Levels are managed in one registered Primary Dock panel. Persistent mutations use registered Level commands and the existing App/history authority; there is no competing local persistent store.
- A Floor Area remains Civil geometry only. It does not create, define or infer a Level.

## Command and Surface Contract

P1-BLD2 registers `level.add`, `level.rename`, `level.setDatum`, `level.delete`, and `level.setActive`. The dedicated `panel.levels` Primary Dock surface exposes those commands. Feature Access and Surface Inventory link the same command/panel authorities.

Entity Level and relative-elevation property edits use the canonical entity update/history authority. They do not add a second command family or elevation store.

## Interaction Contract

- Inspector labels are unambiguous: `Level`, `Elevation above Level (mm)`, and read-only `World Elevation (mm)`.
- Changing the entity Level preserves its displayed elevation above Level.
- Changing the Level datum preserves every assigned entity's elevation above Level.
- Level datum and relative elevation are non-negative finite millimetre values in P1-BLD2. Basement/negative Levels are out of scope.
- Plan/body drag remains exactly ADR-001: one fixed picked-elevation horizontal plane, unchanged Elevation, rigid Group delta, continuous snap and one Undo transaction. No Level operation changes pointer mathematics.

## Forbidden Alternatives

No Level-as-Library-asset, Level-as-Civil-item, Floor-Area inference, Z-position inference, Layer reuse, second relative-elevation store, visual-only offset, partial movement of locked content, silent reassignment on deletion, schema fork, BIM hosting, story visibility, clipping, basement Levels, movement fallback or PF-3B redesign.

## Acceptance

Legacy layouts retain exact world elevations and normalize to Ground. New Machine/Build placement uses Active Level plus existing local/default elevation. Machine and Civil Inspectors derive and edit relative elevation. Reassignment and datum change preserve relative elevation. Datum change is one atomic Undo/Redo transaction and rejects any locked assigned content. Assigned Level deletion is blocked. Save/reload/export/import preserve Levels, assignments and canonical world elevation. A 25,000 mm Level remains finite and console-clean without changing ADR-001's accepted limitation.
