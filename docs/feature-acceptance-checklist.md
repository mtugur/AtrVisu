# Feature Acceptance Checklist

Use this checklist before closing every AtrVisu feature branch.

## Data Model

- Is the data persisted in the correct storage layer?
- Is it safe in project save/load?
- Is it safe in export/import?
- Is it backward compatible with older snapshots where practical?

## Scene Rendering

- Is the feature visible in the scene when enabled?
- Is it readable at normal working zoom levels?
- Does it update when data changes?
- Does it avoid hiding or clipping labels inside objects where practical?
- Does every visible/editable entity define whether it supports layers, visibility, and locking?
- If the feature adds reference geometry, is collision behavior clearly implemented or documented as a limitation?
- If layers are involved, do new entities default predictably without hidden active-layer state?

## Scene Selection

- Can the user select the item from the scene if it is visible and selectable?
- Does the right panel reflect scene selection?
- Does scene selection use the same state helper as panel/list/card selection?
- Does mixed entity multi-selection preserve actual selection order across entity types?
- Does Align to Primary use the first selected visible entity rather than prioritizing one entity type?
- Does empty-space click clear selection consistently?
- Does every new selectable entity define panel selection, persistence, undo/redo, and layer/group interaction?

## Right Panel Editing

- Can the user edit the expected properties?
- Do visible fields have real effect?
- Are units clear?
- Are unsupported controls hidden or clearly marked as future/limited?
- If the item is hidden or locked by layer state, is the panel state clear and safe?
- If a system/default layer exists, are hide, lock, rename, and delete controls blocked or hidden?

## Numeric Input

- Does every numeric field have an explicit `NumericFieldRule`?
- What is the unit?
- What is the `numericKind`?
- Can it be negative?
- Can it be zero?
- Can it be decimal?
- Is it optional?
- What is displayed when empty?
- What happens when invalid?
- Is save blocked on invalid input?
- Is the rule tested?
- Are negative values allowed where logical, such as Plan X, Plan Y, local coordinates, offsets, and deltas?
- Are invalid negative values blocked for physical quantities such as dimensions, weight, power, pressure, capacity, and positive-only gaps?
- Are temporary typing states like `-`, `.`, `-.`, and empty string supported while typing?
- Does blur or Enter normalize, clamp, or safely revert?
- Are optional empty physical fields treated as `Not assigned` without treating invalid negative values as empty?

## Drag / Direct Manipulation

- Can the item be moved if users naturally expect it to move?
- Does movement use the correct plane?
- Is movement synchronized with the mouse at normal and deep zoom levels?
- Does visual scale or label scale stay out of engineering drag math?

## Undo / Redo

- Are layout-changing operations reversible?
- Does Ctrl+Z / Ctrl+Y avoid firing while the user is typing?
- Does dragging create one reasonable history entry instead of one entry per pointer move?

## Persistence

- Save/load revision works.
- Export/import project works.
- Refresh behavior is safe.
- Autosave or recovery behavior remains separate from named/project save flows.
- If the feature is part of layout review or presentation, saved viewpoints preserve the relevant camera/display state.

## Theme / Readability

- Dark theme text is readable.
- Dropdown options are readable without hover.
- Disabled states are clear.
- Labels and overlays are not noisy or clipped.

## E2E And Tests

- Unit tests cover the reusable helper or component behavior where practical.
- E2E tests do not rely on local browser data.
- E2E tests are safe in a clean CI browser context.
- The no-red-console/page-error checks remain meaningful.
- `npm.cmd run build`, `npm.cmd run test`, and `npm.cmd run test:e2e` pass before closing.
