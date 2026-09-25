# P1-BLD2 Level Datum Benchmark Evidence

Status: Pre-implementation evidence for the P1-BLD2 Level Datum and Relative Elevation contract.

Review date: 2026-09-23

## Autodesk Revit 2025 - Levels

- Product/workflow: Autodesk Revit, Levels and level-constrained elements.
- Official source: https://help.autodesk.com/cloudhelp/2025/ENU/Revit-Model/files/GUID-075B9A47-69AB-44D2-8A05-6136EFF26946.htm
- Official essential-skill source: https://help.autodesk.com/cloudhelp/2022/ENU/Revit-GetStarted/files/GUID-F91EB292-28CE-4849-82FE-AA45992A3148.htm
- Observed behavior: a Level is a horizontal datum with a name and elevation. Elements may use a Level as their base constraint; moving the Level moves constrained elements. Revit deletion can also delete hosted content.
- Task similarity: AtrVisu needs a project-owned vertical datum that positions Machine and Civil instances without changing asset definitions.
- AtrVisu adoption: named project datum, explicit element association, relative offset, and datum edits moving assigned content.
- AtrVisu simplification/rejection: no generated plan views, top constraints, BIM hosting, or destructive cascade delete. An assigned Level is blocked from deletion instead.

## Graphisoft Archicad 27 - Stories and Home Story

- Product/workflow: Graphisoft Archicad 27, Home Story and Story elevation.
- Official sources:
  - https://help.graphisoft.com/START/27/INT/_AC27_Help/040_ElementsVB/040_ElementsVB-4.htm
  - https://help.graphisoft.com/AC/27/INT/_AC27_Help/050_ViewsVB/050_ViewsVB-5.htm
- Observed behavior: new elements are placed at their Home Story plus an offset; elements are linked to that Story and move with it. Changing an element's Home Story normally moves it to the new Story while preserving the offset. Story elevations are project settings.
- Task similarity: the Home Story plus offset model directly matches `Level datum + elevation above Level = canonical world elevation`.
- AtrVisu adoption: Active Level for new placement, explicit `levelId`, preservation of relative elevation on reassignment, and preservation of each assigned entity's relative elevation when a Level datum changes.
- AtrVisu simplification/rejection: no automatic Story inference from elevation, no story-based visibility, no top linking, no floor-plan generation, and no deletion of assigned entities with their Level.

## Frozen AtrVisu Choice

AtrVisu adopts the convergent datum-plus-relative-offset model. A Level is project context, never a Library asset, Layer, Civil geometry item, or visual-only offset. Existing absolute Machine/Civil elevation remains canonical for rendering, collision, export and platform transforms. Relative elevation is derived and edited through that canonical value.

Ground is a stable non-deletable 0 mm system Level. Existing layouts and entities without Level data normalize to Ground without changing world elevation. Assignment is explicit; AtrVisu does not infer Levels from elevation or Floor Area geometry.

P1-BLD2 deliberately keeps ADR-001 Plan body-drag mathematics unchanged, including the accepted approximately 20 m camera limitation.
