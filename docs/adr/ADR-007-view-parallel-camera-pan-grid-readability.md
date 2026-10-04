# ADR-007 - View-Parallel Camera Pan and Grid Readability

## Status

Contract-owner decision frozen by PR #122 review `5407842477`; separate Stage A governance review/merge PENDING. Stage B implementation remains PENDING. This ADR does not certify PR #122 or the existing floor-pan runtime.

## Context and evidence

The accepted diagnostic at PR #122 exact head `124b62a9e4bee879428315794486717f97720d10` reproduced pre-PF3B pan feedback and exact side-view pan unavailability. Stored pre-translation floor picks interact with subsequent translated-camera rays. New Fit/ViewCube routes expose that older limitation; grid geometry/phase stays stable while repeated-texture sampling remains a readability concern.

Constitution sections 3-5/9/11 and Interaction Delivery Protocol sections 3-7 prohibit another tuning pass. The contract owner instead requires this governance-only package from main `b727f4ee59875f9bbfbab7cc9b813486b20b353f` before code. Traceable benchmark facts, binding differences and product choices are in `docs/benchmarks/P1_VIEWPORT_PAN_GRID_EVIDENCE.md`.

## Decision

1. Camera Pan is view-parallel camera translation. It is not floor dragging or entity Plan Move.
2. Retain direct MMB. Any retained secondary binding uses the exact same camera-pan authority, not an alternate floor solver. This preserves AtrVisu familiarity while deliberately differing from VC's two-button and SOLIDWORKS modifier bindings.
3. Perspective scale/reference uses gesture-start camera-target depth; orthographic scale uses current orthographic world span. The reference plane passes through the start target parallel to the viewport. No floor, scene, entity or depth-buffer hit is required.
4. Translate camera position and target together. Preserve orientation, alpha/beta/radius/FOV/projection/ortho span. Camera-target Elevation may change during non-Top vertical pan; domain Elevation never changes.
5. All canonical face/edge/corner views support Pan, including exact horizontal orthographic sides. Event-cadence independence and grab direction are mandatory.
6. The user-observable trajectory/final projection, subdivision equivalence and reverse-return tolerance is <= 1 CSS px at the canonical reference plane. Navigation Standard section 11 owns the exact scenario matrix; tests cannot replace it with solver-local numerical metrics.
7. Fixed world grid spacing, phase, rotated domain bounds, margin and minimum extent remain authoritative. Presentation MAY reduce/fade/suppress sub-pixel minor detail. Visual LOD never changes engineering spacing, snap, world phase, transforms or workplane bounds.
8. No broad false bands, alternating phase or deformation-like temporal popping during normal navigation. Top and temporal oblique/shallow/zoom evidence require independent review, not an implementer-selected pixel score.

## Relationship to existing decisions

- Interaction Standard section 9 and Navigation Standard section 11 are the durable Pan authority. Section 3 / ADR-001 entity body drag and its accepted approximately 20 m limitation are unchanged.
- ADR-004's prohibition on zoom-dependent engineering grid spacing/sizing is preserved. Only its implied ban on camera-dependent **display detail** is clarified by Visual Standard section 4.4; this does not authorize geometry/phase changes or camera-driven rebuilds.
- ADR-006 Fit/ViewCube/pole rule, passive triad, stable dock viewport, saved viewpoint and commercial-capture authority are unchanged. Pan runtime work remains outside PR #122.
- Level/FFL, physical Floor Area depth, Build, materials, labels, theme, selection, command, history and persistence authorities are unchanged.

## Rejected alternatives

- Another stale-floor-pick tuning pass or a floor-only camera Pan reference.
- Scene/depth-buffer/selected-entity hit dependency or horizontal-view dead zone.
- Gain clamps, catch-up, alternating compensation, angle-specific sign repair, hidden fallback planes, smoothing, hysteresis or retry loops.
- Fit target/radius or ViewCube orientation tuning to conceal Pan defects.
- Changing PF-3A object movement to a view-parallel model.
- Rescaling/recentering grid or changing snap cadence when the camera moves.
- Treating normal perspective convergence as geometry distortion or stable geometry as proof that temporal readability is accepted.
- Freezing a GPU filter/shader algorithm, importing vendor button bindings wholesale or adding grid preferences/schema in Stage A.

## Consequences and delivery

The expected camera mental model and observable tolerance exist before implementation. Vertical camera-target changes are explicitly camera-only. Grid display detail can adapt without becoming a second engineering-grid authority.

Stage A changes governance files/checks only and produces no new runtime screenshots. Stage B is a separate bounded implementation task after governance merge; its acceptance includes real MMB trajectories, invariants and temporal grid evidence in both themes. Automation Green for Stage A is repository/governance validation only. Contract Verified requires independent governance review; Product Accepted for the new runtime remains PENDING. No exploratory/manual testing is assigned to the Product Owner in Stage A.
