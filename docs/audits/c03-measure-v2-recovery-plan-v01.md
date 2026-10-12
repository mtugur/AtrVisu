# C03 V2 consolidated recovery plan

Baseline: PR #129, `c8d69bceee1f0307e07ad6299f77ae64dd7cdee9` (Draft, unchanged).
Independent review: `5490196358`.
Recovery branch: `feat/c03-measure-v2-recovery-v01`.

## Authority and scope

Product Constitution sections 5-8; Interaction Standard section 15; frozen
`P1_MEASURE_TOOL_V2_CONTRACT.md`; ADR-009; existing V2 benchmark review;
Interaction Delivery Protocol sections 3-10. No normative changes are authorized.
This superseding bounded package preserves the rejected implementation for audit
instead of continuing its iterative patch history. C04/C05/C07/C09 are excluded.

## Consolidated correction matrix (before runtime edits)

| Review | Correction | Contract oracle / verification |
| --- | --- | --- |
| A1 | Derive both right-dock tabs' visibility from their registered preference and actual presentation. | M20: hide/reopen via real workspace controls; registry and DOM agree. |
| A2 | Restore Inspector Auto/Pinned indicator in the shared dock header. | M20/M29: pin/auto remains visible and selection remains canonical. |
| A3 | Explicitly include Measure in command-bar acceptance. | M20: ten commands including the registered Measure route, no weakened assertion. |
| A4 | Execute and observe Measure from the visible command route in Feature Access. | M20/M30: one registered execution, one dock/session lifecycle, complete authority evidence. |
| B5 | Depth and explicit Overlay share the same resolved dimension graphic; Overlay differs only in depth policy. | M28: actual occluder, default depth, explicit overlay visible; no fallback. |
| B6 | Exclude dimension annotations from legacy annotation labels/leaders. | M22/M26: one renderer, hide hides all dimension graphics, ordinary annotations preserved. |
| B7 | Use the existing Measure authority for selected dimension, endpoint grip editing and independent text drag; commit persistent edits through the command/history route. | M25/M29: endpoints recompute; text leaves references unchanged; cancel is inert; one Undo transaction. |
| B8 | Expose screen-projected semantic candidates plus explicit free hit; deterministic cycling and deliberate lock, with visible kind/lock feedback. | M24: corner/midpoint/center, free hit, lock/cycle; selection unchanged; no mesh topology authority. |
| B9 | Separate witness segments, center labels, projected-extents fit/outside arrows/leaders, actual CSS-sized strokes and all advertised style controls. | M22/M23: angle/area/linear graphics and each style control observable under zoom. |
| B10 | Preserve captured Level identity in LevelPointRef; resolve against live Level state, never downgrade broken references. | M26/M27: serialization, datum changes, deletion/orphan/reassociation; transformed canonical anchors. |
| B11 | Add targeted unit/contract/Chromium coverage and reviewer-accessible exact-head evidence. | M20-M30: persistence, move/rotate/resize, orphan repair, grips/text, Depth/Overlay, 640/1024/1440, camera/canvas/history/dirty and clean capture/console. |

## Implementation and delivery order

1. Reference, presentation and editing helpers with focused deterministic tests.
2. One saved-dimension renderer and viewport interaction adapter using those helpers.
3. Right-dock, command/panel and Feature Access integration; preserve existing authorities.
4. Targeted Chromium scenarios and evidence; local build and targeted tests before full gate.
5. One complete local gate and one exact-head GitHub Quality Gate on the stable package.
6. Independent Contract Verification, then (and only then) Product Owner acceptance.

## Current evidence state

- Automation Green: PENDING (recovery not yet validated).
- Contract Verified: PENDING independent review.
- Product Accepted: NOT REQUESTED.

Green automation will not be presented as independent Contract Verification.

## Implementation evidence / authority mapping

- Right tabs derive actual visibility from their registered preference and shared dock presentation. Explicit reopening restores that tab's preference; Auto/Pinned remains owned by the existing Inspector state.
- `referenceDimensionScene.ts` is the sole saved-dimension renderer. Depth is group 0 with normal depth testing; explicit Overlay is group 3 with retained world references and explicit depth policy. No camera-angle fallback exists. Legacy annotation nodes skip saved dimensions.
- CSS-sized line quads, measured font extents, separate witness segments, inside/outside arrows/ticks, angle arcs, captured-plane area boundaries and label leaders use the same resolver. Automatic labels use existing viewport safe-area presentation; manually placed text remains explicit world presentation data.
- Selected dimension is ephemeral state in the existing Measure authority. Viewport grips/text edits dispatch `view.measure` payloads into existing Annotation/history transactions. Capture hides separate grip meshes, not the saved graphic.
- Semantic candidates use canonical transforms/dimensions, not GLB tessellation. The visible marker radius is the explicit hit region; outside it the actual hit remains free. Shift locks a highlighted candidate; Tab cycles a deterministic ordering. Restart/source/mode/exit clear inference state.
- `MeasurePoint.levelId` becomes a LevelPointRef, never a world-point substitute. Annotation normalization preserves captured area plane and text placement. Resolution remains live and missing references remain orphaned; explicit entity/Level selectors repair them.
- Optional `AtrVisuLayout.measureDimensionStyle` stores the canonical project style with backward-compatible defaulting. Existing dimension style snapshots remain serializable; project style controls update dimensions while retaining each explicit Depth/Overlay choice. History, import/load, benchmark restore and project snapshot paths preserve this field; no version/schema migration is introduced.
- Annotation-only presentation capture now uses the same live resolved/visible dimension eligibility as the scene. It does not change the PNG algorithm, resolution or filenames.

## Executable acceptance coverage

| Family | Executed oracle |
| --- | --- |
| M20 | Right Measure tab at 640/1024/1440, existing Inspector Auto/Pinned and visibility regressions; explicit toolbar and isolated Feature Access route. |
| M21 | 0/3/4/4.01 CSS-px confirmation, cancel/capture/focus loss, outside release; real cancelled grip gesture; angle/area confirmation. |
| M22 / M23 | Separate witnesses, measured fit and arrows/ticks, bounded/fixed size, precision/units; real line weight, visibility and Overlay controls; all three entity axes; angle and area PNGs. |
| M24 / M25 | Real semantic hover/Tab/Shift feedback, canonical stored anchor; real endpoint and text drags, cancellation and Undo/Redo. |
| M26 | Real project creation/save/hard reload; stable Level references and values; style and text serialization/history unit regression. |
| M27 | Move/rotation/dimension resolution units; real moved entity, delete/orphan and explicit reassociation to another machine. |
| M28 | Actual top-view machine occluder; same references in Depth/Overlay; observed screenshot pixel difference, not only a displayMode flag. |
| M29 / M30 | Transient state invariants, one edit transaction, dock resize/collapse and stable canvas/lifecycle/camera; actual 1920x1080 PNG before/after exiting Measure. |

Focused validation is recorded in the recovery PR. The final complete local gate
is run once on the stable implementation checkpoint; the Quality Gate checks the
same exact head and uploads `c03-measure-v2-recovery` (14 PNG/JSON pairs).
Contract Verification is an independent review gate, not an implementation-agent assertion.
