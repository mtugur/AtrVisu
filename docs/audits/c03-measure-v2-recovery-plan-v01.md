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
