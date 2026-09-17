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
Visual Components / Autodesk Factory / Siemens placement manipulators and CAD triad conventions: explicit world-axis and plane handles for constrained placement; direct/free drag is a separate semantic and is not silently reinterpreted.

### AtrVisu behavior
- Phase-1 canonical precision Plan movement uses an explicit Move Manipulator.
- World Plan axes are AtrVisu Plan X and Plan Y. Rendering-engine axis names are adapter details only.
- X handle changes Plan X only.
- Y handle changes Plan Y only.
- Plane handle changes Plan X and Plan Y together.
- Plan movement preserves Elevation.
- The manipulator is attached to a presentation/proxy transform; domain mutation still flows through canonical Entity/Selection/History authorities.
- Multi-selection and Group movement apply one rigid Plan delta to all eligible members.
- Snap is applied by the canonical placement authority in domain units, not by an independent rendering-engine snap authority.
- One continuous gesture produces one Undo transaction.
- Manipulator placement uses a predictable working datum: combined Plan footprint center and the minimum selected base Elevation unless a later Level contract explicitly supersedes that datum.

### Direct body drag
Body drag is not a second hidden Plan-move implementation. Until an explicit free-drag contract is approved, body pointer interaction is selection/picking only. A future body-drag mode requires its own benchmark precedent and ADR if its semantics differ from established CAD free-drag behavior.

### Forbidden behavior
- Camera-relative remapping of world Plan axes without an explicit mode.
- Jacobian/conditioning/coherence heuristics that alter pointer intent.
- Hidden fallback between horizontal-plane drag and screen-space drag.
- Sign clipping, catch-up, direction preservation hacks, acceleration clamps, hysteresis or smoothing added to make an ill-conditioned body drag appear usable.
- A gesture in which the object reverses relative to the chosen handle direction because of camera angle.
- Moving Elevation during Plan move.
- Framework-default gizmo appearance being accepted as final visual language without PF-3 visual review.

### Acceptance
Run the same handle gesture in clearly-above, moderate, shallow, near-horizontal and below-target camera views. X/Y/plane semantics remain identical, Elevation is unchanged, Group members receive equal deltas, snap is deterministic, and one Undo restores the complete gesture.

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
Professional 3D engineering workbenches separate camera gestures from object manipulation modes/handles.

### AtrVisu behavior
- Camera orbit/pan/zoom never changes domain transforms.
- During an active entity manipulation gesture, camera controls are detached only for the gesture and restored deterministically.
- Camera angle changes presentation only; it does not alter the semantic meaning of a Move/Rotate handle.

### Forbidden behavior
Camera pitch changing movement direction, panel resize changing drag math, or camera controls competing with an active manipulator.

### Acceptance
The same entity operation before and after orbit/pan/zoom yields the same domain-axis semantics and no scene lifecycle reset.

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
