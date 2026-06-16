# Coordinate System

AtrVisu user-facing coordinates describe a factory plan, not raw Babylon.js axes.

## User-Facing Labels

- `Plan X`: horizontal plan coordinate.
- `Plan Y`: plan-depth coordinate.
- `Elevation`: vertical height above the level floor.
- `Rotation Angle`: rotation around the vertical axis, shown in degrees.

The UI should not expose raw technical labels such as `Z`, `Rotate Y`, or `rotationY` to factory layout users.

## Babylon.js Mapping

Babylon.js uses an X/Z floor plane with Y as the vertical axis.

- Babylon `X` = `Plan X`.
- Babylon `Z` = `Plan Y`.
- Babylon `Y` = `Elevation`.
- Rotation around Babylon `Y` = `Rotation Angle`.

## Internal Convention

Target engineering coordinates should be stored in millimeters:

- `positionMm.xMm`
- `positionMm.yMm`
- `elevationMm`
- `rotationDeg`

Rendering code converts millimeters to Babylon meters before drawing objects.

## Reference Point Standard

Layout entities that have a footprint use a front-left-bottom reference point.

- Machines store `positionMm` as the front-left-bottom footprint corner at the base.
- Civil references store `positionMm` as the front-left-bottom footprint corner at the base.
- User-facing `Plan X`, `Plan Y`, and `Elevation` fields refer to this reference point.
- Babylon box meshes remain center-origin meshes. Rendering derives the mesh center from the stored reference point, dimensions, and rotation.
- Resizing width, depth, or height must keep the stored reference point stable.
- Rotation must keep the stored reference point stable.
- Dragging updates the stored reference point.
- Alignment and distribution use footprint bounds computed from the stored reference point.

New exported layouts use:

- `coordinateReferenceVersion: "front-left-bottom-v1"`
- `referencePoint: "front-left-bottom"`

Older layouts without `coordinateReferenceVersion` are treated as legacy center-based layouts during import. The importer converts legacy center positions to front-left-bottom references so the visual scene does not jump.

Annotations remain point anchors rather than footprint entities. Their `positionMm` is the annotation anchor position.

## Connection Points

Connection point `positionMm.zMm` is elevation from the machine bottom/floor. Existing connection point `xMm` and `yMm` values are center-relative local coordinates for the current v0.1 model, so visualization and snapping convert them through the machine render center. A future migration can move connection point local coordinates to front-left-bottom once the library schema is versioned for that change.

