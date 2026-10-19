# C03 V2 Stage B - bounded clean-port delivery

Baseline: `55e9e58d4761c765c16c834e3b0a322e5dc67bd6`.
Source: PR #130 `e9afacba48467ec9caac8a9f74c2772e444d22d5`.
Authorization: https://github.com/mtugur/AtrVisu/pull/130#issuecomment-6214355719.
Provenance: `c03-measure-v2-stage-b-provenance.json`, one reviewed record per
transferred file with exact source and initial-transfer blob hashes.

## Consolidated implementation plan

1. Preserve T01/T02/T06 and prior M20-M30 through selective reuse of 35 C03
   runtime/registry/persistence/history/style/test/evidence files. No historical
   PR merge, rebase or aggregate cherry-pick; old governance/audit/workflow
   files are excluded. Approved main governance and policy remain unchanged.
2. T03: derive four persistent top corners from the existing bottom corners;
   make candidate drawing/highlight/cycling share read-only viewport/chrome/depth
   eligibility. Preserve silhouette marker access without an interior surface
   hit. Move explicit locked semantic identity into the existing Measure
   authority; re-resolve current context and expose deliberate panel confirmation
   when invisible. No ordinary invisible viewport confirmation or new selection
   authority. Retain the frozen 4 CSS px classifier and canonical coordinates.
3. T04: establish a real viewport stacking/compositing boundary under shell
   chrome for SVG/live/saved dimension graphics in Depth and Overlay. No camera
   compensation, global stacking escalation or blanket candidate hiding.
4. T05: controlled shared-header reflow with retained tab/action target sizes,
   sufficient header height and actual pointer/keyboard functional coverage.
5. Extend the existing 39 PNG/JSON cases with the merged post-stop-rule matrix;
   validate exact-head evidence in explicitly adapted C03 workflow wiring.
   Cover 1440x900, 1024x768, 640x800 and the prescribed state invariants.

## Initial migrated-source findings

- T03 source has no top-corner enum/resolver entries. Candidate discovery requires
  interior `scene.pick`; all projected anchors are exposed without per-anchor
  depth/chrome eligibility. Lock lives only inside the viewport adapter and
  Shift release clears it. These are the frozen contract's specific gaps.
- T04 source Measure layer can escape the viewport host's missing stacking
  context and compete with application chrome. Renderer visibility and camera
  authorities must not be repurposed to compensate for shell ownership.
- T05 source tabs and actions share a fixed-height flex header without a stable
  two-row allocation; narrow/minimum panel composition requires regression proof.
- Executable migrated-baseline reproduction and final results are recorded below
  during implementation; no PASS is inferred from source inspection.

## Executed focused investigation

- Audited initial transfer: existing C03 focused unit 4 files / 33 tests PASS;
  build PASS; existing three default-width dock Chromium tests PASS. The first
  sandboxed Vitest attempt could not create its temporary cache (EPERM); the
  same tests passed with normal process permissions, without source changes.
- T03: ten new Machine/Civil positive/negative-rotation, non-origin top-corner
  cases FAIL on the migrated resolver (missing top identities), then PASS with
  bottom-derived top coordinates and serialization/orphan assertions.
- T04 controlled source-policy ablation: with the old viewport/header CSS,
  real Top-view + MMB Pan places an SVG dimension stroke behind the actual
  Inspector header. Showing versus exiting Measure changes 496 header pixels
  at 1440, reproducing over-chrome painting. Saved Babylon labels alone did not
  reproduce it; the live SVG route is essential. Restore the isolated viewport
  compositing boundary, not a camera or global z-index workaround.
- T05: migrated default/minimum-width checks were not independently failing in
  the reproduced Chromium fixture. The implementation nevertheless makes header
  row accommodation explicit and adds default/minimum/Pinned containment plus
  pointer/keyboard controls at all required viewports. Owner-reported T05 is
  not dismissed merely because a baseline fixture passed; independent final
  review remains required.
- Existing Auto behavior is preserved: unpinning with empty selection closes
  Inspector; explicit reopen restores it. Tests use that real authority rather
  than forcing Auto to remain open. Hidden-reference setup uses in-window Pan
  and a second elevated machine with proven overlapping canonical footprints;
  a non-overlapping automatically placed machine was not valid occlusion proof.

## Delivery states

- Automation Green: exact-head complete gate is recorded in the delivery PR's
  Validation section. Local focused regression evidence is not a substitute.
- Contract Verified: PENDING independent review.
- Product Accepted: NOT REQUESTED.

## Implemented authority and acceptance mapping

- Semantic identities and labels extend only the existing Measure reference
  vocabulary. Bottom-corner mapping remains `getFootprintCornersFromReferenceMm`;
  top Z is its canonical bottom Z plus positive finite canonical height.
- Discovery uses one visible pool for draw/highlight/Tab, including reachable
  projected silhouette markers. Read-only ray depth and actual shell hit coverage
  explain visibility; reference resolution remains independent. Offscreen,
  chrome and scene reasons have the frozen precedence. Pointer leave does not
  erase an explicit semantic lock.
- Locked identity and any persistent reference-edit target live in the existing
  Measure authority. The registered `view.measure` named confirmation resolves
  current canonical entities; invisible viewport/Enter cannot confirm it. The
  panel exposes identity, coordinates/reason and disables unresolved references.
  A completed saved dimension can acquire a grip-edit lock; explicit replacement
  makes one history transaction and is Undoable/Redoable.
- `scene-viewport-host` owns a local isolated compositor context beneath dock
  chrome. SVG and Babylon stay inside that viewport; saved Depth/Overlay retain
  their existing scene-depth semantics. Header flex rows cannot shrink and the
  shared header accommodates wrapped tabs/actions without a new breakpoint.
- Registry/Feature Access use `view.measure`, `panel.measure`, `viewport.measure`
  and one `surface.measure` workspace; the obsolete transient-only duplicate
  source inventory entry is not retained. No second state or creation surface.

| Oracle | Executable evidence |
| --- | --- |
| T01 | Existing real Free Geometry Hit / two-point distance route and saved world references. |
| T02 | Existing Finish/Keep Plan Area, Geometry/Level captured-plane checks and all three visual widths. |
| T03 | Rotated/non-origin Machine/Civil unit matrix; four Column top pointer selections; shared visible candidates; real Tab/Shift; offscreen/chrome/overlapping scene-occluder named pointer/keyboard confirmations; invalid reference unit/component rejection; saved grip explicit history edit. |
| T04 | Actual live SVG stroke and saved Babylon label positioned behind header; PNG header pixels unchanged in Depth/Overlay at 1440x900, 1024x768, 640x800; real panel controls remain usable. |
| T05 | Default/minimum/Pinned control containment and pairwise separation; actual tab/pin/unpin/collapse/reopen pointer and keyboard routes; canvas/generation/camera/domain/history invariants. |
| T06 | Original associative/Level/orphan/repair/history/reload/capture tests retained; additional saved top reference translation/rotation, measured history Undo/Redo and hard reload. |

Focused unit/contract/component: 5 files / 54 tests PASS. Original 25 C03
Chromium scenarios remain; 19 new Stage B scenarios cover the approved delta.
The CI artifact `c03-measure-v2-stage-b` retains all original 39 PNG/JSON cases
and adds 26 cases plus a derived T01-T06 acceptance matrix. The validator checks
exact source head, images, actual state/pixel/geometry oracles and clean console;
it does not declare independent Contract Verified or Product Accepted.

Approved main contracts, ADR, standards, benchmark, checklists, governance policy,
dependency manifests/lock and all unrelated workflow paths remain unchanged.
Only explicit new-branch C03 evidence validation/upload is added to the workflow.

PR #129/#130 remain unchanged Draft baselines. No C04/C05/C07/C09 work,
normative contract edits or manual acceptance request belongs to this package.

## Consolidated T04 correction - review 6261495259

The original exact-head run 38908193890 remains auditable: 236 Chromium PASS,
4 T04 FAIL, 1 branch-scoped skip. Each wide-screen failure compared a header
with the pointer over a tab against a header after checkbox activation moved
the pointer/focus into the dock. The incomplete 61-pair CI artifact is not
accepted as complete evidence.

Controlled local experiment, before correcting the comparison:

- Keep the saved dimension, references, position and runtime snapshot unchanged.
  Focus stays on the canvas. Only hover the Measure tab versus a neutral pointer.
- This produces 2262 changed pixels in the Windows renderer, exactly the same
  count and rectangle as the deliberately mismatched shown/hidden comparison:
  x=1182, y=122, width=74, height=32, entirely within the Measure tab.
- The tab background alone changes from transparent to
  rgba(168, 201, 120, 0.16). No saved-dimension state change is needed. The old
  Linux CI count was 2588; the new exact-head JSON records the actual count and
  bounds in that environment rather than hardcoding a platform's font metrics.
- Two initial normal workstation attempts lost/restored WebGL context before
  reaching this experiment. Focused diagnosis used an external, uncommitted
  software-renderer configuration; collectors were not filtered or suppressed.
  Repository Playwright configuration and normal CI remain unchanged.

The correction changes only test controls, evidence validation and this audit:

- Compare saved shown/hidden with the same neutral pointer, canvas focus,
  header DOM/geometry, dock scroll pose and settled animations. Checkbox actions
  can scroll the dock; normalize that presentation-only scroll before capture.
- Retain the exact original RGB-difference rule and zero changed-header-pixel
  assertions. Capture a positive control outside application chrome proving the
  saved label really changes pixels when shown/hidden; reject a blank-frame or
  always-zero oracle.
- Retain a no-dimension-change hover control and reproduce the mismatched
  comparison in every width/mode fixture. Require identical counts/bounds and
  localization to the actual Measure tab. Matched saved/live comparisons require
  identical chrome state and zero changed pixels in Depth and Overlay at all
  three sizes.
- Existing T04 JSON pairs include exact hovered/focused/hit elements, computed
  styles, rectangles, scroll/DOM state, difference counts/bounds and PNG crops
  for each control. The artifact manifest stays 65 PNG + 65 JSON plus the
  validator-derived acceptance matrix; no old evidence is silently dropped.

No runtime, CSS, normative contract, authority or workflow change is made in
this correction. T01/T02/T03/T05/T06 remain regression requirements. Final
exact-head gate/artifact results are recorded in PR #133 Validation, separately
from pending independent Contract Verification and unrequested Product Acceptance.
