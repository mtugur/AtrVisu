# Phase 1 P1-BLD2 Level Datum Audit

Date: 2026-09-24

Baseline main: `e6c8170407a2d7c602970b02ca180c7a2baa373c`

## Contract and benchmark

P1-BLD2 follows the Product Constitution, Interaction Standard sections 3, 4 and 11, ADR-001 Plan Move, ADR-002 Build Library projection, official Level/Story evidence in `docs/benchmarks/P1_BLD2_LEVEL_DATUM_EVIDENCE.md`, and ADR-003. The benchmark and ADR were committed before runtime implementation. Plan/body-drag mathematics and the accepted approximately 20 m camera limitation are unchanged.

## Domain authority

- `LayoutLevel` is the one serialized project datum model. Ground has stable ID `ground`, name `Ground`, datum `0 mm`, system identity and cannot be renamed, moved or deleted.
- Machine `elevationMm` and Civil `positionMm.zMm` remain canonical world elevation. Level-relative elevation is projected and is never stored independently. Level datum is the Finished Floor Level.
- Floor Area remains ordinary Civil geometry. Its canonical `positionMm.zMm` is the bottom world elevation, while its Level-relative Inspector anchor is the top surface. A Ground slab may therefore persist a negative bottom without enabling negative Levels.
- Missing Level collections, active IDs and entity assignments normalize to Ground without changing physical coordinates. Floor Area never infers or creates a Level, and Machines never infer support height from Floor Area overlap.
- Active Level is serialized layout context. New Machines use active datum plus local zero; new Floor Areas place their top at active datum; other Build primitives retain their existing base-relative defaults, including Beam at `+3000 mm`.
- Explicit reassignment preserves each entity's defined relative anchor. Datum changes rigidly move all assigned Machine/Civil geometry by one delta. Floor Area thickness edits preserve top world elevation. Each accepted operation remains within the existing complete history snapshot authority.
- Civil Type transitions preserve the user-visible anchor across the Floor Area boundary: Floor Area top becomes the target non-Floor base, and a non-Floor base becomes the target Floor Area top. Existing dimensions and style remain unchanged; non-Floor-to-non-Floor canonical bottoms remain unchanged.
- Any assigned item lock or locked layer rejects the complete datum change. Ground deletion and assigned user-Level deletion are rejected without history or dirty mutation.

## Runtime surfaces

`panel.levels` is a registered Primary Dock surface. `level.add`, `level.rename`, `level.setDatum`, `level.delete`, and `level.setActive` are registered runtime commands and are linked by Feature Access and Surface Inventory. Machine and non-floor Civil Inspectors expose Level, Elevation above Level, and read-only World Elevation. Floor Area exposes Level, Top Elevation above Level, read-only Top Surface World Elevation, and read-only Bottom Surface World Elevation projected directly from canonical `positionMm.zMm`. No second store, direct Babylon authority, or Library Level asset was added.

## Evidence

- Pure Level/Civil tests cover legacy Ground migration, top-relative Floor Area reassignment, signed canonical floor bottom, top-preserving thickness, rigid datum movement, and item/Layer lock rejection.
- Serialization tests cover legacy physical invariance, Level/assignment/world-elevation round trip, and Ground Floor Area bottom `-350 mm` surviving JSON export/import with top at `0 mm`.
- History tests cover Level datum movement and Floor Area thickness/anchor restoration through Undo/Redo.
- Inspector tests cover Floor Area top-relative wording/projection, top-preserving thickness, and canonical top-world readout while retaining non-floor semantics.
- Pure Civil, Inspector and Chromium regressions cover Floor Area -> Wall -> Floor transitions, finite canonical geometry and preservation of the Level-relative anchor.
- The exact UI Machine -> non-default Layer -> locked Layer -> Level datum route rejects atomically, preserves all assigned world elevations and creates no Undo transaction.
- Chromium proves Ground `0` plus Floor Area `350` gives bottom `-350`, top `0`, and Machine base `0`; reassignment to Level 2 `6000` gives bottom `5650` and top `6000`; horizontal Floor Area drag preserves its vertical anchor.
- Floor Area, Machine, Wall, Column and Beam share physical-world rendering group 0. Planning/reference Civil geometry remains in group 1, which explicitly preserves group-0 depth. Top/oblique, below-view and transparent evidence positions Beam fully inside the Floor footprint and demonstrates physical occlusion plus retained blending.
- BabylonScene changed only to install the rendering-depth policy. Plan drag, snap and movement-solver semantics were not changed; ADR-001 movement behavior remains frozen. Existing Build, PF-3A body drag, dock density, command, panel and runtime-access regressions remain in the complete gates.

## Release state

Correction review `5315526016`: focused rendering-depth/Inspector tests and the exact Floor Area browser workflow pass with three true Beam-over-Floor evidence frames. Local audit, dependency-tree, governance, token, build and 163-file/1376-test unit gates pass. The aggregate local E2E run passed 102/103 parallel scenarios before the commercial PNG timing boundary and then timed out in the isolated runtime-access route; both the commercial output and P1-BLD2 Floor workflows pass focused. The exact-head GitHub gate records the final aggregate result without a post-CI source mutation.

Automation Green: PENDING exact-head CI. Contract Verified: PENDING independent review. Product Accepted: FAIL; focused manual re-acceptance remains pending.
