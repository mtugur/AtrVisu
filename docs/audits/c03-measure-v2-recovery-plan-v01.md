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

- Automation Green: prior head `750e0fb` passed run `38412604769`; the visual
  correction's final exact-head result is recorded in the PR Validation section.
- Contract Verified: FAIL (BLOCKED by visual review `6155647277`, pending re-review).
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
same exact head and uploads `c03-measure-v2-recovery` (39 PNG/JSON pairs).
Contract Verification is an independent review gate, not an implementation-agent assertion.

## PR #130 independent verification response

Review `6144077908` requires four concrete user routes, beyond the original
M20-M30 matrix. The focused tests were added before the bounded fixes:

| Route | Baseline observation | Corrected executable evidence |
| --- | --- | --- |
| M24/M25 semantic grip | Real machine-corner reassignment already worked. | `review-m24-m25-grip-preview` and `review-m24-m25-semantic-edit`: corner identity, other endpoint unchanged, move/rotate association, Undo/Redo, project save and hard reload. `review-m24-free-hit` proves non-associative world references after machine movement. |
| M24 Tab/Shift choice | Releasing Shift after pointer movement changed the committed corner. | `review-m24-cycle-selection`: visible chosen candidate survives pointer movement and Shift release; commit uses that exact semantic anchor. |
| M22/M23 angle/area | Saved angle label overlapped the transient label; saved area omitted named perimeter in scene and captured-plane source in panel. | `m22-angle`, `review-m22-angle-orbit-zoom`: B-vertex arms/arc, separated labels and stable values under orbit/zoom. `m22-area`: both area and perimeter in scene/panel, captured Level Plane metadata in panel; unit coverage also checks Geometry-plane metadata and normalized persistence. |
| M27 orphan/repair | Deleted Level remained orphaned and explicit repair already worked. | `review-m27-level-orphan` and `review-m27-level-orphan-repair`: unresolved reference stays listed, does not render falsely, both Level endpoints explicitly reassociate to Ground. |

This follow-up produced 21 pairs on `750e0fb`. The visual correction below
extends the validator to 39 pairs. Contract Verification remains an independent
decision and is currently BLOCKED; Product Accepted remains pending.

## Bounded visual correction plan - review 6155647277

Baseline `750e0fbb0103c7c71e5c8e57a089da5d909d479a` was tested before runtime
edits. Chromium reproduced clipped Kind/Reference controls at 1440/1024, area
text overlapping A, duplicate angle values after Keep at all three widths, and
the 640 distance/XYZ label collision. The unit regression also reproduced the
ignored metric area style. Contract Verification is BLOCKED pending re-review.

One consolidated presentation correction under frozen contract sections 3, 9
and 11 will:

1. Share dimension value formatting and measured label fit between transient
   and saved graphics, with explicit marker/label exclusion and safe-area fit.
2. Present a completed session through its equivalent visible saved dimension
   once Keep succeeds, without clearing the session, hiding persistent
   annotations, changing references, or changing Depth/Overlay policy. Hiding,
   deleting, or editing the saved reference restores independent transient
   presentation when it no longer represents that result.
3. Present area/perimeter as separate style-controlled lines; canonical mm2
   calculations stay unchanged. Use full-width selector rows in the Measure
   panel so every complete option is readable.
4. Assert actual text/control geometry and one value presentation at
   640/1024/1440, including angle orbit/zoom, area and unchanged clean export.
   Regenerate exact-head PNG/JSON evidence and run one final complete gate.

No normative contract, picking/camera authority or other tool is changed.

### Implementation and evidence

- `dimensionPresentation.ts` owns shared unit formatting, multiline label
  measurement and fit against marker/label rectangles. Metric area presentation
  converts canonical mm2 to m2 without changing calculation or stored operands.
- `measureSessionMatchesDimension` requires completed state and equivalent kind,
  references and captured plane. The live scene manager only exposes a match for
  a visible, resolved graphic; it does not clear the session or promote Overlay.
- Transient values use the project style through a committed latest ref. Saved
  values keep their annotation style, Depth/Overlay and editable world placement.
  Neither style updates nor representation matching recreates the scene.
- `visual-controls-{1440,1024,640}` records actual selected text widths.
  `visual-{angle,area}-{width}-{transient,saved}` records actual text/marker
  rectangles, canonical session result, saved references and display mode.
  `visual-angle-{width}-orbit-zoom` records camera change, stable endpoints and
  the single fitted label. Existing dock captures and clean export are regenerated.
- The artifact validator requires all 39 PNG/JSON pairs from the current source
  head and validates the visible-result match, no duplicate value, unit style,
  controls, safe bounds and retained session data in addition to prior oracles.

Automation results belong to the delivered exact-head Quality Gate in PR #130.
Contract Verified remains BLOCKED pending independent re-review; no Product
Owner acceptance has been requested or declared.

The delivery declaration uses `Contract Verified: FAIL` with the review's
BLOCKED explanation, matching the existing Quality Gate state vocabulary.
Run `38478592184` stopped at this declaration check before build/unit/E2E;
the corrected declaration is validated with a fresh PR event, without changing
the governance checker or product implementation.
