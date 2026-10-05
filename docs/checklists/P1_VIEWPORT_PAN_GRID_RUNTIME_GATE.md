# P1 Viewport Pan/Grid Stage B Runtime Gate

Source: PR #122 review `5407970749`; frozen ADR-007 and Navigation section 11.
One consolidated correction: PR #124 authoritative review `5408684275`.
Historical b01d279 Automation Green is not current product/contract acceptance.
Evidence mapping: `docs/audits/p1-viewport-pan-grid-runtime-v01.md`.

- [x] Stage-A #123 governance merged before implementation.
- [x] Parent normal main-sync only; separate stacked runtime branch.
- [x] Same camera authority for MMB/RMB/Shift+LMB, no floor/scene hit dependency.
- [x] Gesture-start target-depth/span; immutable total pointer displacement.
- [x] No compensation/fallback/sign repair/gain/smoothing/hysteresis.
- [x] Existing wheel/orbit/Fit/ViewCube/PF-3A routes preserved.
- [x] World-origin 1000/5000mm cadence, rotated bounds, 5000mm margin and 40000mm minimum preserved.
- [x] Rejected derivative renderer removed; separate fill/interaction + two rigid world LineSystems, existing palette/depth authority.
- [x] Real-input signed/diagonal/slow/cadence/reverse projected-anchor tests.
- [x] Empty space and mixed Machine/Civil/Group; all faces/edge/corner; wide/narrow.
- [x] Position/target translation; orientation/radius/FOV/projection/span fixed.
- [x] Selection/domain/Elevation/history/dirty/lifecycle/canvas identity assertions.
- [x] Every-render Pan telemetry, three anchors, native input sequence/time and complete rendered matrices/inertia; no forced camera updates.
- [x] Default/Fit/shallow/side/corner, wide/narrow, DPR1/1.25/1.5/2, normal/slow real MMB.
- [x] ArcRotate dual-write hypothesis tested with actual-render A/B, not assumed causal.
- [x] Light/dark Top/default/oblique/shallow/wheel/corner/Fit high-frequency PNGs and every-render telemetry.
- [x] World-origin line coordinates/uploaded vertices and mesh identity/rebuild counters invariant through camera-only navigation.
- [x] Finite boundary remains a separately identified contract decision; no minimum/margin changes to conceal it.
- [x] Exact-head artifact validation and CI upload installed.
- [ ] Final exact-head Quality Gate verified (actual head/run belongs to PR Validation and artifact manifest).
- [ ] Independent Contract Verified review.
- [ ] Product Accepted decision.

Automation Green: PENDING final exact-head CI at authoring; record actual result
in PR Validation, not a docs-only PASS closure commit. Contract Verified and
Product Accepted remain FAIL/PENDING correction/review. The reported jitter is
not dismissed solely by green numeric tests. No Product Owner exploratory/manual request.
Do not merge the parent or stacked runtime PR.
