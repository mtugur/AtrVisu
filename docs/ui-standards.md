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

## Multi-Selection Controls

- Multi-selection should show a compact summary instead of the full single-object editor.
- Alignment tools should stay grouped by action type: edge alignment, distribution, pair alignment, and keyboard nudge.
- Keyboard nudging must not interfere with typing in inputs, textareas, selects, or editable text.
- Undo/redo controls should be visible but secondary, and keyboard shortcuts must not run while the user is typing.
- Pair snap labels should state that the primary object moves and the secondary object stays fixed.

