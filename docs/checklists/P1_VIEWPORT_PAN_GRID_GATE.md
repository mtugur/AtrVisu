# P1 Viewport Pan and Grid Gate

Status: Stage A governance only. Stage B implementation remains PENDING.

## Stage A delivery

- [x] Base exact main `b727f4ee59875f9bbfbab7cc9b813486b20b353f`; no PR #122 commits incorporated.
- [x] Contract-owner review `5407842477` and accepted diagnostic comment `5983406452` linked in the package.
- [x] Constitution, source-sync, benchmark, interaction and delivery authorities read in order.
- [x] Official task-similar benchmark facts and differing bindings recorded in `docs/benchmarks/P1_VIEWPORT_PAN_GRID_EVIDENCE.md`.
- [x] Interaction section 9 and Navigation section 11 freeze view-parallel Pan, camera-target-depth/span reference and no hit dependency.
- [x] Signed/diagonal/slow real-input paths, <= 1 CSS px residual, subdivision equivalence and reverse-return frozen before code.
- [x] Grid visual LOD distinguished from fixed world phase/spacing/bounds; temporal evidence required in both themes.
- [x] ADR-007 records compatibility, rejected alternatives and separate Stage B boundary.
- [x] `P1_VIEWPORT_PAN_GRID_CONTRACT.md` maps generic Interaction Change Gate applicability without runtime PASS claims.
- [x] Governance tests protect contract clauses and reject removed/weakened Pan/grid/ADR/evidence rules.
- [x] PR #122 head and all production/runtime/package/workflow sources are unchanged.

Automation Green for this package means repository/governance CI only. Exact-head head/run/result is recorded in the Stage A PR body after CI; this checklist is not a self-certification of independent contract review.

- Contract Verified: PENDING independent Stage A governance review.
- Product Accepted: N/A for docs-only Stage A; new runtime Product Accepted remains PENDING Stage B.
- Stage B runtime Automation Green: PENDING.

## Stage B requirements (not executed/certified in Stage A)

- [ ] Governance reviewed/merged before runtime implementation.
- [ ] Real MMB default, wheel-zoomed, oblique/shallow and Fit perspective.
- [ ] Real MMB Top and exact Front/Back/Left/Right; all-face/edge/corner availability.
- [ ] Real MMB representative edge/corner and supported narrow viewport.
- [ ] +120/-120 H/V, 120x80 diagonal, slow 240 px; continuous grab direction without alternating stalls.
- [ ] Reference-plane final projection <= 1 CSS px residual.
- [ ] 1x120 / 8x15 / 24x5 equivalence and reverse-return <= 1 CSS px.
- [ ] Camera position/target translate together; orientation/radius/FOV/projection/ortho span unchanged.
- [ ] Selection/entity/Elevation/lock/snap/history/dirty/lifecycle preserved; empty viewport Pan works.
- [ ] Domain-only rotated bounds, 5000 mm margin, 40000 mm minimum and fixed 1000/5000 mm origin phase preserved.
- [ ] Temporal light/dark grid evidence covers Top, normal/slow oblique/shallow pan/orbit/zoom and representative corner.
- [ ] No broad false bands, alternating phase or deformation-like temporal popping.
- [ ] Zero console/page errors; no blocker filtering or hidden fallback/tuning.
- [ ] Exact-head CI then independent Contract Verified review before genuine final Product Accepted decision.

No Product Owner exploratory/manual test is requested by Stage A. PR #122 remains Draft/unmerged and blocked at Product Accepted; this package does not change its head or acceptance documents.
