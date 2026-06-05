# UI Standards

AtrVisu UI should stay clear, practical, and factory-layout oriented.

## Panel And Modal Use

- The right panel is for quick controls, inspection, and frequent layout actions.
- Modals are for larger management screens.
- Large management UIs should not be constrained by the right panel.
- Management modals should avoid horizontal scrolling during normal use.

## Coordinate Labels

The UI should use user-facing labels:

- `Plan X`
- `Plan Y`
- `Elevation`
- `Rotation Angle`

The UI should not show raw technical labels such as `Z`, `Rotate Y`, or `rotationY`.

## Safety And Destructive Actions

Dangerous actions require confirmation, including object deletion, group deletion, item deletion, library reset, and layout replacement.

Primary, secondary, and dangerous actions should be visually distinct.

