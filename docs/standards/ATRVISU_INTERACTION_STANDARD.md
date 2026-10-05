# AtrVisu Interaction Standard v1.0

Status: Normative user-interaction contract

This standard exists to prevent ad-hoc UX invention. It defines the expected user mental model before implementation. When this file is silent on a material interaction, implementation must stop and the contract must be extended before code is written.

## 1. Benchmark policy

AtrVisu uses mature CAD/engineering conventions as default precedents. Reference families include SolidWorks, AutoCAD/Autodesk Factory, Visual Components, Siemens Tecnomatix/RobotExpert, and comparable professional engineering workbenches.

A benchmark is chosen by task similarity, not brand preference. Factory/layout placement behavior should prefer factory/layout tools over unrelated creative 3D editors. Generic rendering-engine defaults are never a benchmark by themselves.

For each interaction below:

- **Benchmark precedent** names the established interaction family.
- **AtrVisu behavior** is normative.
- **Forbidden behavior** blocks known failure modes.
- **Acceptance** defines user-observable verification.

## 2. Selection

### Benchmark precedent
CAD/engineering viewport selection + tree/explorer synchronization.

### AtrVisu behavior
- Click selects one eligible entity.
- Ctrl/Cmd-click toggles an entity in multi-selection.
- Selection is shared by Viewport, Explorer, Inspector, Arrange and Group authorities.
- First selected entity remains primary unless an explicit user action changes primary.
- Locked entities may be selected but not mutated by operations that their lock blocks.
- Hidden entities are not viewport-pickable.

### Forbidden behavior
- Entity-type-based silent selection priority that changes order.
- Separate local selection stores for Viewport/Explorer/Inspector.
- Drag starting merely because the user intended to select.

### Acceptance
Same selection IDs/order/primary are observable across Viewport, Explorer and Inspector after click, Ctrl/Cmd-click, clear, hide, lock and reload scenarios.

## 3. Plan Move

### Benchmark precedent
Visual Components / Autodesk Factory / Siemens placement manipulators and SOLIDWORKS component movement distinguish explicit constrained manipulation from direct component dragging. AtrVisu Phase 1 intentionally adopts a bounded direct-drag deviation for rapid industrial layout placement; `docs/adr/ADR-001-phase-1-direct-plan-body-drag.md` records the decision and its accepted limitation.

### AtrVisu behavior
- Phase-1 canonical pointer Plan movement is direct Machine/Civil body drag.
- Pointer-down captures the actual finite picked-point Elevation and creates one fixed horizontal working plane parallel to the floor at that Elevation.
- Every pointer frame in the gesture derives one Plan X/Y delta from the pointer ray intersection with that same captured plane.
- The working plane, picked-point anchor and start positions remain immutable for the gesture.
- A frame without a finite forward ray/plane intersection produces no movement update. It does not switch movement model or reinterpret pointer intent.
- Plan movement preserves Elevation exactly.
- Domain mutation still flows through canonical Entity/Selection/Placement/History authorities; Babylon meshes do not become movement authority.
- Multi-selection and Group movement apply one rigid Plan delta to all eligible members.
- Snap is applied by the canonical placement authority in domain units, not by an independent rendering-engine snap authority.
- A snapped no-op keeps the active gesture alive so movement can continue across later snap cells without release/re-click.
- One continuous gesture produces one Undo transaction.
- Camera controls detach only while the body-drag gesture is active and restore deterministically on completion or rejection.

### Known limitation
- At approximately 20 m Elevation, when the camera is near or below the captured working plane, horizontal-plane ray geometry can become singular or make forward/back pointer movement feel reversed.
- This is an accepted Phase-1 limitation, not permission to add a fallback solver.
- If a valid forward intersection is unavailable, the affected frame does not update movement and the runtime remains finite and error-free.
- Future Level work may improve usability by changing the user's spatial context or datum. It must not silently change the pointer mathematics defined here.

### Forbidden behavior
- An explicit PositionGizmo or proxy manipulator replacing Phase-1 body drag.
- Camera-facing or camera-relative drag planes.
- Screen-space movement mapping or camera-relative sign correction.
- Jacobian, conditioning or coherence solvers.
- Hidden fallback from the captured horizontal plane to another plane or mapping.
- Sign clipping, catch-up, gain/acceleration clamps, hysteresis or smoothing added to conceal ill-conditioned geometry.
- Changing the captured working plane during a gesture.
- Moving Elevation during Plan move.
- Partial Group/multi-selection movement, per-frame history entries or a snapped no-op ending the gesture.

### Acceptance
Drag a Machine and Civil item from a real high picked point and verify one fixed floor-parallel working plane is used while Elevation remains unchanged. Drag a Group/multi-selection and verify every member receives the same Plan delta. With snap enabled, cross multiple snap cells without release/re-click and verify one Undo restores the complete gesture. At the accepted approximately 20 m near-plane limitation, verify the runtime remains finite and console-clean without fallback, remapping or a rendered Plan manipulator.

## 4. Elevation / vertical movement

### Benchmark precedent
CAD triad single-axis constrained translation and property-grid numeric editing.

### AtrVisu behavior
- Elevation is a separate degree of freedom from Plan move.
- In Phase 1, exact Elevation editing remains available through the Inspector.
- A future Z/elevation manipulator must be visually and behaviorally distinct from Plan movement and must not be introduced implicitly.
- Level-relative editing, when implemented, follows the Level standard while canonical absolute Elevation remains the domain source of truth unless explicitly migrated by an approved ADR.

### Forbidden behavior
Plan handles changing Elevation or camera orientation changing whether a Plan drag becomes vertical.

### Acceptance
Every Plan manipulation preserves Elevation exactly; every vertical manipulation changes only the documented vertical authority.

## 5. Rotate

### Benchmark precedent
CAD rotation ring/triad + numeric property edit.

### AtrVisu behavior
- Rotation is an explicit operation with visible rotational affordance or exact numeric editing.
- Rotation snap uses the canonical placement authority.
- Rotation center/pivot must be deterministic and documented for single, multi and Group selections before implementation.

### Forbidden behavior
- Rotation inferred from arbitrary body dragging.
- Camera orbit gestures accidentally rotating entities.
- New pivot semantics introduced without updating this standard.

### Acceptance
Same pointer direction produces the same signed rotation semantics across camera orientations; one gesture is one Undo transaction.

## 6. Library add / drag-drop placement

### Benchmark precedent
Industrial asset browsers and CAD insert/place workflows.

### AtrVisu behavior
- Library answers “What can I add?” and creates canonical placed instances from canonical asset definitions.
- Explicit Add and drag/drop may both exist if they resolve to the same placement authority.
- Initial placement is predictable, immediately adjustable, Undoable, and preserves definition identity.
- Drag/drop is an insertion workflow, not permission to create a second movement engine after placement.

### Forbidden behavior
Raw model-path entry as the normal add workflow; duplicate placement authorities; silent definition mutation.

### Acceptance
Add and drag/drop produce equivalent entity identity/metadata/placement semantics and one Undo removes the inserted instance.

## 7. Snap and precision placement

### Benchmark precedent
CAD grid/object snap mental model.

### AtrVisu behavior
- Snap state is visible and discoverable.
- Grid snap and rotation snap are canonical domain settings.
- Snap never requires releasing and re-clicking during a valid continuous gesture.
- A snapped no-op is not treated as a blocked gesture.
- Exact numeric placement and pointer placement resolve to the same canonical transform model.

### Forbidden behavior
Competing snap engines, hidden snap thresholds with contradictory behavior, snap that changes coordinate conventions, and snap-induced loss of pointer capture.

### Acceptance
Continuous drag across multiple snap cells remains one gesture; toggling snap changes only quantization, not movement semantics or transaction boundaries.

## 8. Multi-selection and Group / Assembly

### Benchmark precedent
CAD assembly/group rigid manipulation and selection hierarchies.

### AtrVisu behavior
- Normal Group selection presents the Group as one derived spatial/operational entity where the feature contract requires it.
- Group movement is rigid: every resolved member receives the exact same Plan delta.
- Edit Group exposes members for independent selection/editing without creating a second persisted Group transform unless an approved architecture decision introduces one.
- Independent multi-selection and Group selection have distinct, predictable semantics.

### Forbidden behavior
Partial Group moves, duplicate movement of a member, hidden persisted Group transforms competing with member transforms, or selection expansion that changes based on rendering order.

### Acceptance
Mixed machine/civil Groups remain rigid through move, Undo/Redo, save/reload and snap scenarios; Edit Group permits intentional member operations without contaminating normal Group behavior.

## 9. Camera navigation vs entity manipulation

### Benchmark precedent
Professional 3D engineering workbenches separate camera gestures from object manipulation modes/handles. Visual Components pans along viewport horizontal/vertical axes; AutoCAD preserves viewing direction and magnification; 3ds Max documents view-parallel pan. Mouse bindings differ, including SOLIDWORKS Ctrl+MMB. The traceable facts and AtrVisu choice are recorded in `docs/benchmarks/P1_VIEWPORT_PAN_GRID_EVIDENCE.md`; ADR-007 freezes the reference-model decision before Stage B code.

### AtrVisu behavior
- Camera orbit/pan/zoom never changes domain transforms.
- During an active entity manipulation gesture, camera controls are detached only for the gesture and restored deterministically.
- Camera angle changes presentation only; it does not alter the semantic meaning of a Move/Rotate handle.
- Canonical camera Pan is view-parallel camera translation, not floor dragging and not entity dragging.
- Direct middle-mouse drag is the required Phase-1 binding. Existing secondary pan bindings may remain only through the same canonical pan authority.
- Pan MUST NOT require a floor hit, scene hit, selected entity, depth-buffer hit or ray intersection with domain Z=0.
- Pan means grab and move the view: pointer right/down moves viewed content right/down at the canonical reference depth.
- Perspective pan scale uses camera-target depth; orthographic pan scale uses the current orthographic world span. The reference plane is viewport-parallel through the gesture-start camera target, not a domain working plane.
- Pan translates camera position and target together in the viewport plane. It preserves alpha/beta/orientation, radius, FOV, projection mode and orthographic span.
- Vertical pan in a non-Top view may change camera-target Elevation; domain Elevation MUST NOT change.
- Pan remains available in every canonical face/edge/corner view, including exact Front/Back/Left/Right orthographic views, without floor-ray singularities.
- Pan is event-cadence independent: one pointer path and subdivisions of that same path produce the same final view within the acceptance tolerance below.

These rules are a governance-only Stage A contract. Stage B implementation remains PENDING. They do not certify the historical floor-based runtime or authorize a fix in PR #122. Interaction Standard section 3 / ADR-001 Plan Move remains unchanged: its fixed horizontal picked-elevation plane is for entity movement only.

### Forbidden behavior
Camera pitch changing entity movement direction, panel resize changing drag math, or camera controls competing with an active manipulator. Camera Pan must not use floor/scene/entity picking as a prerequisite or gain clamps, catch-up, alternating compensation, angle-specific sign repair, hidden fallback planes, smoothing, hysteresis or retry loops to rescue a wrong model.

### Acceptance
The same entity operation before and after orbit/pan/zoom yields the same domain-axis semantics and no scene lifecycle reset.

For camera Pan, real middle-mouse paths in the camera-state matrix of `ATRVISU_VIEWPORT_NAVIGATION_STANDARD.md` section 11 must satisfy final screen residual <= 1 CSS px at the gesture-start reference plane. One 120 px move, 8x15 px and 24x5 px subdivisions must agree within <= 1 CSS px; a reverse path must return within <= 1 CSS px. Camera orientation/framing, selection, transforms, history, dirty state and scene/canvas lifecycle remain unchanged. Tests observe projected world points and the visible trajectory, not a solver formula. Zero console/page errors. Stage A records this oracle; only Stage B can demonstrate runtime conformance.

## 10. Inspector numeric editing

### Benchmark precedent
CAD property grids: prop/model value when idle; local draft while actively editing; commit/validation on defined edit events.

### AtrVisu behavior
- Numeric controls show canonical model values when not actively editing.
- Local draft state exists only while needed for user editing, temporary numeric text, or validation feedback.
- External model updates while the field is not being edited must not cause a prop -> effect -> local-state feedback loop.
- `onChange` and `onCommit` responsibilities must be explicit for each field family.
- Units, min/max, temporary states, invalid states and commit behavior are governed by numeric rules.

### Forbidden behavior
- Mirroring every prop update into local state via an unconditional effect when the model may update continuously.
- Repeated domain writes caused solely by prop synchronization.
- Suppressing React warnings instead of eliminating the update cycle.

### Acceptance
With Inspector open on a moving Civil/Machine entity, valid external X/Y updates may occur continuously with zero `Maximum update depth exceeded`, zero render feedback loop, and no corruption of a focused user's draft.

## 11. Undo / Redo

### Benchmark precedent
Desktop CAD/engineering transaction history.

### AtrVisu behavior
- One user gesture/command corresponds to one meaningful history transaction unless the command contract explicitly states otherwise.
- Undo restores all members of an atomic multi-entity operation.
- UI-only presentation changes do not create domain history entries.

### Forbidden behavior
One history entry per pointer frame, partial Group Undo, or mixing UI preference changes with domain mutation history.

### Acceptance
Move/rotate/arrange/group operations undo and redo atomically with no intermediate pointer-frame states exposed.

## 12. Visual manipulator language

### Benchmark precedent
Professional CAD/engineering manipulators: compact, legible, unambiguous axis/plane affordances with strong hover/active feedback.

### AtrVisu behavior
- Functional manipulator semantics and final visual treatment are separate acceptance gates.
- Rendering-engine default colors/geometries may be temporary implementation scaffolding but cannot be declared premium final UX without explicit visual acceptance.
- Axis/plane meaning must remain legible against machine, civil, grid and selection visuals.
- Manipulators must not visually dominate the viewport.

### Forbidden behavior
Adding more default engine gizmos/overlays merely because they are available, inconsistent state colors, or visually noisy helpers that obscure the industrial scene.

### Acceptance
PF-3 visual review evaluates manipulator, selection, grid, civil, lighting and state colors together in the canonical mixed scene.

## 13. Runtime console contract

### AtrVisu behavior
Normal valid workflows produce zero red runtime errors/warnings classified as blockers. User-reported console stacks are treated as first-class acceptance evidence.

### Mandatory reproduction matrix for interaction changes
At minimum when relevant:
- clean state;
- persisted current preferences;
- migrated legacy preferences;
- Inspector Auto and Pinned;
- dock expanded/collapsed;
- single Machine;
- single Civil;
- Group/multi-selection;
- real manipulation;
- Undo/Redo;
- hard reload.

### Forbidden behavior
Filtering known warning text from collectors, accepting CI because the synthetic route did not reproduce the user's route, or claiming a root cause before the observed stack/path is explained.

## 14. Contract-change procedure

A proposed change to an interaction in this file must include:

1. Existing contract.
2. Named benchmark precedent.
3. User problem with reproducible evidence.
4. Proposed behavior.
5. Why existing benchmark behavior is insufficient, if deviating.
6. Forbidden regressions.
7. Automated acceptance scenarios.
8. Required manual/visual acceptance.
9. ADR when the change is a new/deviating product decision.

No code for the changed interaction is merged before this procedure is satisfied.

## 15. Professional Measure viewport tool (C03)

Status: Stage A proposed contract delta; independent governance review/merge and separate Stage B runtime instruction required. Existing runtime is not certified by this section.

Benchmark: official Visual Components Measuring Components, AutoCAD MEASUREGEOM and SOLIDWORKS Measure. Traceable facts/adoption/deviations: `docs/benchmarks/P1_MEASURE_TOOL_EVIDENCE.md`. Decision: `docs/adr/ADR-008-phase-1-professional-measure-tool.md`. Full frozen behavior/tolerances/evidence: `docs/product/P1_MEASURE_TOOL_CONTRACT.md`, sections 3-8; gate: `docs/checklists/P1_MEASURE_TOOL_GATE.md`.

### Required behavior

- Measure is a transient viewport tool, not Precision Placement, Inspector visibility or a persistent dimension/annotation. It never mutates geometry, Runtime Selection, history, dirty state or persistence.
- New registered `view.measure` / `viewport.measure` route owns Quick Toolbar and viewport controls. Existing `view.showMeasurements` retains Precision Placement Helpers semantics/compatibility; no Stage A runtime migration or dead toolbar UI.
- Explicit Pick/Navigate arbitrates LMB: Pick confirms measurement operands, never selects/body-drags/orbits; Navigate suspends picking and uses unchanged LMB orbit. MMB Pan and wheel work in both through existing camera authority. No global binding redesign or hidden click/drag solver.
- Pick confirmation has one Measure-local frozen boundary, not a claimed existing selection classifier: maximum radial pointer displacement from down <=4 CSS px (including up), DPR-independent, confirms once on same-pointer primary LMB up inside the viewport with a valid current candidate. Any >4 excursion cancels even after return; pointercancel/pre-up lost capture/focus loss/outside release/ownership reset or exit cancels. Post-up normal capture release does not retract confirmation. No time/velocity tuning; cancellation never chooses Orbit. Contract section 4.1/M08 owns event details and real-input/DPR oracle; ordinary selection/Plan Move is untouched.
- Geometry and displayed active-Level FFL Plane are explicit point sources. Geometry misses do not become plane points; overlays/helpers are excluded; locked visible geometry is readable. Actual world-hit elevation and canonical mm/domain-axis mapping are preserved, with no Floor support inference or placement snap mutation.
- Distance confirms A/B with live B preview, signed B-A XYZ, total 3D and named Plan distance. Angle confirms A-B-C with B vertex and live C preview. Plan XY polygon shows rubberband/closed preview; Enter/Finish completes a valid simple polygon, invalid/degenerate/self-intersecting input gives a reason rather than NaN/fake results.
- Plan Area graphics use a fixed source-specific presentation plane: Geometry captures first confirmed A's world Z; explicit Level Plane uses its operation-start captured active-Level FFL. Camera or later Level-context changes cannot move either plane. Explicit operation reset discards/recaptures under the same rule. Original operand XYZ and Plan XY calculations never change; no inferred or fallback plane. Contract sections 5/6/M05 freeze capture timing and projected-versus-original evidence.
- Canonical selected Machine/Civil local Width/Depth/Height and named entity-pair reference measurements appear in the viewport. Reuse existing dimensions/coordinate/diagnostic authority; no minimum-GLB-clearance/topology claim or competing selection source.
- Escape/Exit/toggle deterministically clears all transient tool state/graphics and restores normal input ownership. Entry/exit never changes camera implicitly: no navigation means prior pose unchanged; intentional navigation is preserved, not rewound. Selection IDs/order/primary and domain/history/dirty stay unchanged.
- Confirmed points/results remain fixed under orbit/pan/zoom; only graphics reproject. Both themes and narrow viewport use restrained readable safe-area callouts, no geometry/panel/camera compensation, remount or overflow. Clean commercial capture excludes tool artifacts through existing authority.

### Forbidden behavior and acceptance

No implicit miss fallback, snap relocation, fake CAD topology, persistent measurements, dead UI, Inspector-only substitute, movement/camera redesign or console suppression. No C04/C05/C07/C09 scope expansion. Product UI Design Spec section 10 remains fully required.

Contract M01-M10 freezes real pointer/keyboard routes, numeric fixtures/tolerances, camera/viewport states, lifecycle/selection/history/dirty invariants and exact-head evidence. Baseline CI does not satisfy new Measure acceptance. Stage A is docs-only; runtime Automation Green/Contract Verified/Product Accepted remain PENDING until separately implemented, independently reviewed and genuinely accepted. PR #120 Final Exit status is not changed.
