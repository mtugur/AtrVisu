# UI Standards

AtrVisu UI should stay clear, practical, and factory-layout oriented.

## AtrVisu UX / Interaction Standards

AtrVisu is an engineering layout tool. Interactions should feel predictable to users who know tools such as AutoCAD, SolidWorks, Excel, Windows, and modern CAD/layout editors.

### Predictability

- If something is visible and clickable, clicking it should do the expected thing.
- If an item can be selected in the scene, its properties must become editable in the right panel.
- Scene selection and panel selection must use the same state path. Avoid separate unsynchronized states such as `visualSelection` versus `editingSelection`.
- Selection highlight, active panel card, and properties editor should derive from the same selected id.

### Consistency

- Similar controls behave the same everywhere.
- Numeric fields use the shared `NumericInput` behavior unless there is a documented reason not to.
- Select/dropdown controls must remain readable in the dark theme without relying on hover.
- Delete, Escape, Ctrl+Z, and Ctrl+Y behavior should be consistent across layout features.

### Engineering Correctness

- Coordinate, offset, delta, local position, and Plan X/Y inputs must support negative values.
- Physical dimensions, weight, power, pressure, diameter, airflow, capacity, and similar physical quantities must reject invalid negative values unless a feature explicitly supports negative values.
- Units must be visible near editable fields.
- Visible fields must have actual effect. Hide controls that are not implemented in the current feature version.
- Elevation is non-negative by default. Below-floor features require an explicit feature decision before negative elevation is allowed.

### Direct Manipulation

- If an object, annotation, connection point, or similar item is visible in the scene, the user should be able to select it directly from the scene when practical.
- The right panel must reflect scene selection, and panel selection must reflect scene selection.
- Drag behavior must use world-coordinate math, not visual mesh or label size.
- Visual scale and label scale must not affect engineering drag math.

### Reversibility

- Layout-changing operations should be undoable.
- Ctrl+Z and Ctrl+Y must not fire while typing in inputs, textareas, selects, or editable text.
- Drag operations should create one reasonable history entry, not hundreds of history entries during pointer move.

### Readability

- Text, labels, dropdown options, and overlays must be readable in the dark theme.
- Hover should not be required just to read an option.
- Labels should not be clipped or hidden inside objects where avoidable.
- Overlay labels should be non-blocking for primary object picking unless the overlay itself is intentionally selectable.

### Minimal Surprise

- Do not introduce UI controls that do nothing.
- Do not create hidden assumptions.
- If behavior is limited in v0.1, show concise helper text or hide unsupported controls.

## Numeric Field Rules

Use `src/components/common/NumericInput.tsx` for editable engineering numbers where practical. Use `src/utils/numericFieldRules.ts` as the shared rule map for whether a field logically allows negative values.

## Numeric Field Classification Standard

Every numeric field must have explicit metadata before it can be rendered, edited, validated, or saved. No unclassified numeric field is allowed.

Do not infer behavior from label text or key names. Field names such as `Water Requirement`, `Steam Consumption`, `Vacuum Level`, `Floor Offset`, or `Signed Velocity` are examples where guessing would be unsafe. Validation must come from an explicit `NumericFieldRule`, not string matching.

Each numeric rule must define:

- `key`
- `label`
- `unit`
- `numericKind`
- `optional`
- `allowDecimal`
- `zeroPolicy`
- `invalidInputBehavior`
- `allowNegative` only when required by the kind, such as `context-signed` or `angle`
- `min` / `max` when applicable
- `reason` for context-signed fields

Supported `numericKind` values:

- `signed-coordinate`: Plan coordinates, local coordinates, offsets, deltas, and position adjustments. Negative and zero values are allowed.
- `non-negative-physical`: Physical quantities where zero may be meaningful, such as water requirement, air consumption, flow rate, clearance, and pressure magnitude. Negative values are invalid.
- `positive-physical`: Assigned values that must be greater than zero, such as width, depth, height, diameter, weight, operating weight, motor power, voltage, current, frequency, and nominal capacity.
- `context-signed`: Signed values only when explicitly justified, such as Celsius temperature, signed velocity, signed torque, gauge pressure/vacuum, or future below-floor level offsets. Requires `allowNegative` and `reason`.
- `percentage`: Percentage fields such as efficiency, utilization, and load percentage. Default bounds are 0 to 100.
- `angle`: Rotation and orientation angles. Signed or unsigned behavior must be explicit.
- `integer-count`: Counts, quantities, lanes, axes, and indices. Decimals and negative values are invalid.

Empty and invalid are different states:

- Optional empty physical fields mean intentionally `Not assigned`.
- Invalid negative physical values must remain invalid and must not be converted to `undefined`, `null`, blank, or `Not assigned`.
- Save-time validation must use the same rule as the input component and must block invalid values.

Negative values are allowed for:

- Plan X
- Plan Y
- local xMm
- local yMm
- offsets where physically meaningful
- delta movement
- rotation angles when the rotation workflow supports them

Negative values are not allowed by default for:

- width
- depth
- height
- diameter
- weight
- power kW
- pressure bar
- air consumption
- capacity
- speed where negative speed is not meaningful
- gap unless explicitly intended
- elevation unless a below-floor feature is introduced

Numeric inputs must support temporary typing states such as `-`, `.`, `-.`, and an empty string while the user is still typing. Normalize, clamp, or safely revert on blur or Enter.

## Scene Selection State Pattern

Scene clicks and right-panel list/card clicks must call the same selection helper for the feature.

Recommended pattern:

- `selectObjectForEditing(id)`
- `selectAnnotationForEditing(id)`
- `selectConnectionPointForEditing(objectId, pointId)`

The helper should set the active selected id, clear incompatible selections, open or reveal the relevant panel section, and leave rendering/highlighting to shared state. Do not set a visual-only selection that the properties panel cannot read.

## Drag And Coordinate Standards

- Object drag uses the floor/plan plane and updates Plan X / Plan Y.
- Annotation drag uses the annotation elevation plane and updates Plan X / Plan Y without changing elevation.
- Connection point editing uses machine-local coordinates: local X and local Plan Y from machine center, elevation from machine bottom.
- Connection point visualization must convert local engineering coordinates through the machine transform. Babylon box local Y is centered, so bottom-based elevation requires conversion before marker placement.
- Pointer-plane intersection and delta calculations should be helper-based when shared across features.

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

## Connection Point UI

- Connection point overlays should be opt-in to avoid clutter.
- Markers must be compact, readable, and non-blocking for object selection.
- Selected Object Properties should separate connection point diagnostics from compact ATARA Machine Data diagnostics.

