# C03 Professional Measure Tool Gate

Status: Stage A benchmark/contract only. Stage B runtime PENDING.

## Stage A source and contract preparation

- [x] Start from exact main `14d6f8086e1d868ea498b0c3f59d93c287843dac`, on separate `docs/p1-close-measure-contract-v01`.
- [x] Read authority chain in order; owner C03 task synchronized into the repository contract before code.
- [x] Product UI Design Spec sections 2.4/5/10/14/18/20 remain unchanged.
- [x] Read Final Exit C03 only at PR #120 head `0a8fb10c857921bfba02e72e89a31bb80b552a5f`; no PR #120 branch sync/edit/merge or Final Exit PASS.
- [x] Official VC, AutoCAD and SOLIDWORKS facts, retrieval limitations, task similarity, adoption and rejection/deviation recorded in `P1_MEASURE_TOOL_EVIDENCE.md`.
- [x] New Interaction Standard section 15 closes the silent Measure gap without rewriting normal selection/Plan Move/Pan contracts.
- [x] ADR-008 records Pick/Navigate arbitration, picking, semantic migration and deviations before implementation.
- [x] `P1_MEASURE_TOOL_CONTRACT.md` freezes all twenty requested outcomes and maps Interaction Change Gate A-J.
- [x] Numerical, real-input, camera, responsive, invalid, transient and evidence oracle M01-M10 is written before tests/runtime.
- [x] Review `5413470723`: Measure-local maximum radial displacement <=4 CSS px (DPR-independent, non-tunable) and exact confirmation/cancel/capture rules frozen in contract section 4.1/ADR-008; no nonexistent shared click authority or Pick-to-Orbit threshold.
- [x] Review `5413470723`: Plan Area Geometry first-A world Z and explicit Level Plane operation-start FFL capture frozen separately; presentation cannot rewrite original Z/Plan XY or follow camera/Level changes. M05/M08 extended before runtime; these are specified oracles, not executed acceptance.
- [x] No production TS/TSX/CSS, dependency, registry, persistence, test or workflow edits; no runtime screenshots or dead Measure UI added.

Stage A exact-head local/CI results belong in the Draft PR Validation section. No later documentation-only PASS commit is required. Do not check a runtime box because the unchanged baseline unit/E2E tests pass.

- Stage A repository/governance Automation Green: PENDING exact-head CI; the PR body records the eventual run/head/result.
- Stage B runtime Automation Green: N/A/PENDING, not tested by this docs package.
- Contract Verified: PENDING independent Stage A governance review.
- Product Accepted: N/A for docs-only Stage A; PENDING for Stage B runtime.
- C03 / Phase-1 Final Exit: PENDING; PR #120 remains read-only Draft authority.

## Stage B gates (not executed in Stage A)

- [ ] Contract/ADR reviewed and merged; separate bounded implementation authorization.
- [ ] `view.measure` live binding, `viewport.measure` Feature Access, Quick Toolbar/View/Palette routes and tool controls use one authority; no dead UI.
- [ ] `view.showMeasurements` remains Precision Placement Helpers with existing persisted compatibility semantics.
- [ ] M01 empty-scene/miss/explicit Level Plane/real entry/exit routes.
- [ ] M02 geometry/GLB/Civil/locked-visible/hidden exclusions and actual world elevations.
- [ ] M03 distance/Plan/signed XYZ arithmetic, zero/reverse/non-finite and real fixture picking within contract tolerances.
- [ ] M04 three-point A-B-C angle, live preview, zero arm invalid and 0/60/90/180-degree cases.
- [ ] M05 Plan polygon live graphics, Enter/Finish, concavity/winding, differing-Z Geometry projected at first-A Z and Level Plane projected at captured FFL; original/projected XYZ and capture/reset evidence, no camera/Level reanchor; invalid duplicate/collinear/crossing/touching and Escape.
- [ ] M06 canonical local Width/Depth/Height plus named pair reference viewport results; existing machine Plan diagnostic equality and unsupported reasons.
- [ ] M07 explicit Pick/Navigate, real LMB/MMB/wheel and ViewCube/Fit/viewpoint paths without changed values or hidden fallback.
- [ ] M08 real stationary/3/4/5 CSS px and out-and-back Pick trajectories at DPR1/2, maximum excursion not accumulated travel, exact once-on-up and cancellation/capture/focus/late-up evidence; selection/order/primary, Escape/command restoration and normal UX after exit.
- [ ] M09 1440x900/1024x768/640x800 DPR1, light/dark, dock/Inspector states and readable live/confirmed graphics with stable lifecycle.
- [ ] M10 no project/history/dirty/schema/transform/Level/layer persistence effects; reload clears session; clean commercial capture excludes tool artifacts.
- [ ] Per-scenario input, points, calculations/units, camera, canvas/lifecycle, selection/domain/history/dirty and projected dock invariants in `p1-close-measure-tool` manifest/JSON.
- [ ] Real screenshots cover every measurement mode, preview/result, invalid/miss and narrow layouts in both themes, not a diagnostic-only numeric claim.
- [ ] Zero red console/page errors, no Maximum update depth/WebGL/DOM exception filtering.
- [ ] Full exact-head Stage B gate; independent Contract Verified review before final Product Owner manual acceptance.
- [ ] One comprehensive genuine final product acceptance, then normal approved merge. No exploratory QA loop or code-first contract rewrite.

## Stop and exclusion checks

No C04 alignment, C05 mixed property editing, C07 Inspector priority, C09 simulation redesign, persistent CAD dimensions, analytic GLB topology, support/contact inference, new Level semantics, camera remapping or body-drag change. Do not mutate existing authorities to make a new tool test pass. Interaction Delivery Protocol correction budget/stop rules apply; further tuning beyond the frozen contract requires review, not another local heuristic.
