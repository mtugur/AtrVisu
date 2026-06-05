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

