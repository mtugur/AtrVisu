# C03 renewed Stage B - task-level runtime evidence

## Frozen authority and provenance

- Approved main: `b8bba52fefbe550d760f772bf95517beb373012c` (merged Stage A #135).
- Authorization: [6285504650](https://github.com/mtugur/AtrVisu/pull/133#issuecomment-6285504650).
- Historical source: #133 `17763309b532813a7e004d608992073a97c08bb0`.
- Exact 38-file source/base blob inventory: `c03-measure-v2-task-stage-b-provenance.json` beside this audit.
- No merge/cherry-pick of the historical PR history. Its workflow and two old audits were excluded. The workflow change here only carries this branch's C03 evidence.
- Faithful-port implementation checkpoint: `934fecf5aadd2f7f13a682cc2a1bf1b648b7d255`.
- Reproducible pre-fix owner-path checkpoint: `76bac9fac43a3a1ebba1a24285d5c28021c57f00`. Production `src` at that checkpoint is identical to #133; the new failing contract test is the only additional source-tree test.

The approved Product Constitution, Interaction Standard section 15, V2 contract
sections 4.4/4.7/6.2.1/21, ADR-009, benchmark review section 10 and existing gates
are read-only. No C04/C05/C07/C09 or new persistence schema is included.

## Fail-before observations

Three actual pointer/keyboard routes run against the faithful historical port,
not against a synthetic stand-in:

| Task | Observed failure and source cause |
| --- | --- |
| A | Hover resolves an entity/top anchor, but unlocked presentation exposes neither its entity ID nor world XYZ. The old geometry already computes full 3D/Plan/Delta Z correctly for known operands; the owner's original 8628.777 mm cannot be adjudicated without original A/B. |
| B | A simple unobstructed body-to-corner path did **not** reproduce candidate loss. The controlled overlapping Column fixture does: `candidate()` chooses a new raw body hit on every frame and discards the still-visible original corner pool. Baseline JSON records every interpolated sample and first-drop PNG. |
| C | Two canonical preselected Machine IDs are captured correctly, but the exactly-one condition returns an empty dimensions result. Its reason was not rendered. No named per-entity group or active result exists. |

Five contract-derived assertions fail on that checkpoint and pass on the
corrected authority/UI. CI reruns the three browser reproductions and expected
five unit failures in a detached baseline worktree. Those files carry the
**baseline served SHA** separately from the **delivery SHA**; they are explicitly
historical FAIL evidence, not falsely labelled delivery-head screenshots.

## Bounded implementation

### A - engineering reference presentation

One `PointReference` presentation shows confirmed/preview operand identity,
semantic ID/name or explicit Free Geometry Hit/Level, plus world XYZ in mm.
Display rounding does not mutate operands; `<data value>` retains the exact
number. Confirmed A remains beside prospective B. The same presentation is
used for resolved saved references. 3D Distance, Plan Distance and signed Delta Z
are distinguished; the shared scene label explicitly says 3D Distance.

### B - transient candidate context

The existing canonical semantic volume is projected with the existing adapter.
A screen-only convex envelope plus the existing visible 7 CSS px marker regions
owns approach. An intervening raw body hit cannot steal that context. Outside
it, a body hover hands off; an outside miss, leave, confirmation, Restart,
source/kind change and Exit release it. There is no time grace, new world
coordinate model, enlarged marker hit radius or change to 4 CSS px cancellation.
The visibility-tested pool still supplies dots, highlight, cycle and click.
Invisible locked references keep the existing explicit confirmation authority.

### C/D - active named local dimensions

Ordered Runtime Selection/primary are cloned only on tool entry. Named groups
resolve those IDs against the current canonical entity catalog. Eligible primary
is initially active, otherwise first eligible entry. Kind/Restart do not reseed.
An unavailable active entity is not silently replaced. Row activation is a
registered Measure action, transient only: no Runtime Selection/domain/history
mutation. Local dimensions remain canonical rather than rotated aggregate AABB.

`getMeasureResult`, `getMeasureLines`, `measureSessionMatchesDimension`, panel
presentation and App Keep all resolve the same active entity. Keep exposes its
name and creates exactly one existing associative dimensions Annotation with
one history transaction. The existing renderer derives three axis graphics from
that one Annotation; it does not create three persistent entities. Existing
reference resolution, orphan/repair, style, Level and serialization remain in
their original authorities.

## Verification and evidence map

| Gate | Executable evidence |
| --- | --- |
| Renewed A | `A-preview-a/b`, `A-depth/overlay`, `A-oblique`, `A-reload` at 1440/1024/640: real two-height/elevation fixtures; exact XYZ arithmetic, named operands, normal navigation, saved reference identity and resolved XYZ. |
| Renewed B | `B-<four top IDs>` and `B-handoff` at all three sizes: 25 real pointer samples per corner; overlap, one exact confirmation, Tab/Shift lock, outside-context handoff and leave release; unchanged domain/camera/canvas. |
| Renewed C/D | `C-groups`, `D-kept`, `D-reload` at all three sizes: primary/order, per-group W/D/H, real row keyboard activation, one Annotation/history transaction, Undo/Redo and project reload. Unit tests cover empty/invalid/unsupported/missing and rotated Civil/Floor local dimensions. |
| Renewed E | Before/after snapshots and canvas identity/generation in new task routes plus protected T04/T05 tests. Actual open panels are not bypassed. Fixture framing uses explicit real pan/zoom before operands, never production camera compensation. |
| T01/T02 | Existing free distance and Plan Area/Finish/Keep PNG/JSON, unchanged calculations. |
| T03 | Existing four top-corner/Column, visible/occluded/chrome/offscreen lock and grip reference tests. |
| T04 | Existing Depth/Overlay at all three sizes: matched pointer/focus/DOM, zero changed chrome pixels, actual visible-label positive control and hover-only negative control retained. |
| T05 | Existing default/minimum header, real pin/unpin/collapse/reopen, Auto/Pinned at all three sizes. |
| T06 | Existing move/rotate/resize association, orphan/reassociation, Level references, history and hard reload tests. |

`validate-measure-v2-evidence.mjs` validates the protected matrix.
`validate-measure-v2-task-evidence.mjs` fails closed on missing/stale/failing new
cases or baseline proof and produces the combined A-E/T01-T06 matrix.
Artifact: `c03-measure-v2-task-runtime-stage-b` (both directories, PNG/JSON and
matrices). No console filtering, arbitrary sleeps or renderer/GPU bypass.

The 640 px fixture failure was reproduced before Measure operands: the narrow
Library starts collapsed, and existing CSS hides the right machine panel while
the Primary Dock drawer is open. The test helper now opens Library through its
real control for creation, then collapses that drawer before opening Measure or
Inspector. No responsive production rule or breakpoint changed. Mixed
unsupported browser coverage uses the existing Group-plus-Machine selection
route; Annotation-exclusive canonical selection is deliberately not weakened.
PNG inspection also caught a real readout clipping defect in the first local
presentation: at 640 px Reference A ended at 917.375 CSS px while the visible
Measure scrollport ended at 757. The oracle now checks complete reference and
result rectangles, not merely DOM visibility. A bounded controls/readout layout
within the existing bottom sheet keeps A/B and 3D/Plan/Delta Z visible; the same
compact reference table supports shorter desktop panels. It wraps vertically
when space is insufficient, with no new responsive breakpoint, panel height,
visibility authority or measurement behavior.

## Interaction Change Gate evidence

- A: Constitution + section 15 + V2 sections above; pre-existing official Visual Components/Navisworks benchmark facts and approved AtrVisu adaptations in the V2 benchmark review; ADR-009 unchanged.
- B: one authorized clean-port package; no new product decisions or unrelated features.
- C/D: canonical selection/entity/coordinate/Annotation/history and click/navigation authorities preserved; only transient candidate/result ownership added.
- E/F/H: actual entry selection, Machine/Civil/invalid unit cases, real mouse/keyboard, saved/reloaded/current preferences, Auto/Pinned and dock tests; unfiltered page/console checks and lifecycle snapshots. Snap/Group mutation is N/A to this read-only Measure task; the full suite preserves their existing regression coverage.
- G/J: one implementation round against independently accepted #135, with auditable fail-before checkpoint. Stop if single-Annotation persistence or canonical candidate context requires a competing authority. Neither conflict was needed.
- I: Automation is determined by the **exact-head Quality Gate and artifact matrix linked in PR Validation**, not by a historical run or this prose. Contract Verified: **PENDING independent review**. Product Accepted: **NOT REQUESTED**. No manual acceptance request is authorized before reviewer clearance.

PR #129/#130/#133 remain untouched Draft baselines. #133 historical Product
Accepted FAIL is not upgraded by these tests. This PR remains Draft/unmerged.

## Delivery security blocker

The 2026-10-21 delivery audit reports one high-severity Vite finding covering
GHSA-698v-4r3x-3vcv, GHSA-r825-w8mm-5pxw and GHSA-587h-7wmj-h5pm. Approved main
and the implementation checkpoint have the identical lockfile blob
`481642f8e9480e73da826135957961b39237cdd9`, resolving Vite `8.0.16` and Vitest
`4.1.11`. This finding was not introduced by the Measure port. No package change,
audit exception or weakened CI policy is included. Automation Green remains
FAIL until security remediation and a successful exact-head gate; passing local
runtime evidence cannot substitute for that gate or its CI artifact.

The complete local Chromium run passed its 249 parallel cases (one unrelated,
branch-conditional PF-3B case was skipped), then exposed an export-observation
ordering race in the isolated Feature Access test. Its failure snapshot showed
PNG still Preparing, while the five-second receipt assertion was already
running. `executeRuntimeFeatureCommand` records receipts only after the awaited
export returns. An unchanged focused rerun passed. The bounded test correction
keeps observation open through the real download, then checks the same exact
attempt/execution increments and handled result. No runtime binding, assertion,
timeout, retry, worker or export behavior is changed. Final focused results and
the still-required exact-head CI result are recorded in PR Validation.
