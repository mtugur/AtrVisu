# Precision Placement v0.1

AtrVisu precision placement provides practical mm-based layout controls for engineering sales and early layout work.

This is not a full CAD system and is not final manufacturing approval.

## Grid Snap

Grid snap aligns object Plan X and Plan Y positions to a millimeter step.

Default:

- Grid Snap: on
- Grid Snap Step: `100 mm`

When enabled, dragging or moving an object snaps its center position to the nearest configured step. For example:

```text
2876 mm with a 100 mm step -> 2900 mm
```

When disabled, objects keep free movement precision.

## Rotation Snap

Rotation snap aligns object rotation angle to a degree step.

Default:

- Rotation Snap: on
- Rotation Snap Step: `15 deg`

Selected object controls include quick rotation actions:

- `0 deg`
- `90 deg`
- `180 deg`
- `270 deg`
- rotate `-90 deg`
- rotate `+90 deg`

User-facing rotation is shown as `Rotation Angle`; raw Babylon `rotationY` is not shown.

## Measurement Helpers

Measurement v0.1 lets users choose Object A and Object B from dropdowns.

It shows:

- center-to-center Plan distance in mm and meters
- delta Plan X in mm
- delta Plan Y in mm
- approximate edge-to-edge gap

The approximate gap uses simple envelope/dimension extents. It is useful for quick layout judgement, not CAD-grade clearance approval.

## Coordinate Labels

AtrVisu user-facing coordinate labels are:

- Plan X
- Plan Y
- Elevation
- Rotation Angle

Internal Babylon axes still use X/Z floor coordinates and Y as vertical, but those raw labels are hidden from layout users.

## Limitations

Precision Placement v0.1 is intentionally foundational.

Known limitations:

- No multi-select alignment yet.
- No interactive 3D dimension lines yet.
- No wall or column snapping yet.
- No floor/level-aware measurement yet.
- Measurements are not CAD-grade.

Future work can add multi-select alignment, dimension line overlays, wall/column snapping, and level-aware measurement.
