# Phase 1 P1-BLD2 Level Datum Audit

Date: 2026-09-23

Baseline main: `e6c8170407a2d7c602970b02ca180c7a2baa373c`

## Contract and benchmark

P1-BLD2 follows the Product Constitution, Interaction Standard sections 3, 4 and 11, ADR-001 Plan Move, ADR-002 Build Library projection, official Level/Story evidence in `docs/benchmarks/P1_BLD2_LEVEL_DATUM_EVIDENCE.md`, and ADR-003. The benchmark and ADR were committed before runtime implementation. Plan/body-drag mathematics and the accepted approximately 20 m camera limitation are unchanged.

## Domain authority

- `LayoutLevel` is the one serialized project datum model. Ground has stable ID `ground`, name `Ground`, datum `0 mm`, system identity and cannot be renamed, moved or deleted.
- Machine `elevationMm` and Civil `positionMm.zMm` remain canonical world elevation. Relative elevation is projected as world minus assigned Level datum and is never stored independently.
- Missing Level collections, active IDs and entity assignments normalize to Ground without changing physical coordinates. Floor Area remains ordinary Civil geometry and never infers or creates a Level.
- Active Level is serialized layout context. New Machines use active datum plus their existing local zero elevation; Build primitives use active datum plus their existing Civil default elevation, including Beam at `+3000 mm`.
- Explicit reassignment preserves relative elevation. Datum changes move all assigned Machine/Civil world elevations by one delta and are recorded through one complete history snapshot.
- Any assigned item lock or locked layer rejects the complete datum change. Ground deletion and assigned user-Level deletion are rejected without history or dirty mutation.

## Runtime surfaces

`panel.levels` is a registered Primary Dock surface. `level.add`, `level.rename`, `level.setDatum`, `level.delete`, and `level.setActive` are registered runtime commands and are linked by Feature Access and Surface Inventory. Machine and Civil Inspectors expose Level, Elevation above Level, and read-only World Elevation. No second store, direct Babylon authority, or Library Level asset was added.

## Evidence

- Pure Level tests cover legacy Ground migration, reassignment, relative preservation, atomic datum movement and lock rejection.
- Serialization tests cover legacy physical invariance and Level/assignment/world-elevation round trip.
- History tests cover one transaction restoring Level datum plus assigned Machine/Civil elevations through Undo/Redo.
- Inspector tests cover Level-relative projection and canonical world readout.
- Chromium creates Level 2 at 6000 mm, uses it as Active Level, places Machine at 6000 mm and Beam at 9000 mm, reassigns Machine through Ground while preserving relative elevation, changes datum with Undo/Redo, verifies 25000 mm finite rendering, rejects assigned-Level deletion, and records no blocker console error.
- Existing Build, PF-3A body drag, dock density, command, panel and runtime-access regressions remain in the complete gates.

## Release state

Local validation: dependency audit reports 0 vulnerabilities; the dependency tree, interaction governance, governance policy tests, 270 maintained design-token files, production build, 162 unit files / 1361 tests, focused Level Chromium and diff checks pass. The aggregate local Chromium run encountered the existing commercial-output/runtime-access timing boundary under local GPU load; each affected route passes in focused execution. The Draft PR exact-head Quality Gate is the final aggregate delivery authority and is recorded externally to avoid a post-CI source mutation.

Automation Green: PENDING exact-head CI. Contract Verified: PENDING independent review. Product Accepted: PENDING and intentionally not requested before review.
