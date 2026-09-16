# AtrVisu Interaction Standard v1.0

**Status:** Normative  
**Applies to:** All user-facing interaction in AtrVisu  
**Parent authority:** `docs/product/ATRVISU_PRODUCT_CONSTITUTION.md`

## 1. Purpose

This standard converts the AtrVisu requirement to preserve familiar Office/CAD/engineering user habits into explicit, testable interaction contracts.

It exists to prevent local algorithms, framework defaults or agent inference from redefining user interaction.

If a user-facing interaction is not defined here, implementation must stop at contract/ADR work. It must not invent behavior.

## 2. Canonical benchmark set

AtrVisu uses task-appropriate benchmark precedence rather than cherry-picking whichever product happens to justify a local implementation.

### 2.1 Factory-layout / industrial placement — primary

1. **Autodesk Factory Design Utilities** — factory-floor component repositioning, triad, plane/axis translation, Honor Floor.
   - Official reference: https://help.autodesk.com/cloudhelp/2021/ENU/FDU/files/Inventor-Factory-Help/About-Placing-Factory-Assets/FDU_Inventor_Factory_Help_About_Placing_Factory_Assets_To_Reposition_Components_html.html
2. **Visual Components** — layout manipulation, component Move manipulator, axis/plane move, grid snap, properties.
   - Official reference: https://help.visualcomponents.com/4.8/Premium/en/English/Getting%20Started/Moving_and_rotating_components.htm
   - Layout reference: https://help.visualcomponents.com/4.10/Premium/en/English/Getting%20Started/UI%20Overview/Tabs/Layout_View.htm

### 2.2 General CAD precision — secondary

3. **SOLIDWORKS** — direct component drag only within defined degrees of freedom; triad for constrained movement and exact values.
   - Official reference: https://help.solidworks.com/2024/english/solidworks/sldworks/t_Moving_a_Component_SWassy.htm
4. **AutoCAD** — explicit 3D Move gizmo; axis/plane constraints are visibly selected; free move and constrained move are distinct semantics.
   - Official reference: https://help.autodesk.com/cloudhelp/2022/ENU/AutoCAD-Core/files/GUID-D9FB6012-7BE2-49AC-8BDB-C02097A5366B.htm

### 2.3 Digital manufacturing — secondary

5. **Siemens Tecnomatix / RobotExpert** — Placement Manipulator with highlighted active axes, plane handles, focused visual feedback and nearby numeric entry.
   - Official reference: https://blogs.sw.siemens.com/tecnomatix/tecnomatix-15-whats-new/

### 2.4 Benchmark decision rule

When benchmark products differ:

1. Prefer the product closest to the AtrVisu task domain.
2. Prefer visible, explicit degrees of freedom over hidden reinterpretation.
3. Prefer deterministic engineering behavior over clever but surprising convenience.
4. If a meaningful ambiguity remains, stop implementation and create an ADR that freezes the AtrVisu choice.

An agent may not cite one benchmark while ignoring a closer benchmark that materially contradicts the proposed behavior.

## 3. Required interaction-contract fields

Every new interaction or material interaction change must define these fields before implementation:

- **Interaction class**
- **User goal**
- **Benchmark precedent**
- **AtrVisu behavior**
- **Degrees of freedom**
- **Visible feedback**
- **Forbidden behavior**
- **Keyboard / accessibility behavior where relevant**
- **History/transaction behavior**
- **Failure behavior**
- **Automated acceptance scenarios**
- **Manual product acceptance scenario when visual/runtime feel matters**

A task that does not provide these fields is incomplete for interaction implementation.

## 4. Selection

### Benchmark precedent

CAD/engineering applications distinguish selection from manipulation and provide a visible selected state.

### AtrVisu behavior

- Clicking an entity body selects it.
- Ctrl/Cmd modifies selection according to the canonical shared Selection Manager.
- Scene, Explorer and Inspector project the same selection authority.
- First selected entity remains primary unless an explicit command changes primary semantics.
- Locked entities may be selected but may not be moved or edited where the lock contract forbids it.
- Hidden entities are not scene-pickable.

### Forbidden behavior

- Body click may not secretly enter a different manipulation mode based on camera angle.
- Entity type may not reorder selection.
- Scene, Explorer and Inspector may not own separate selection truths.

## 5. Plan Move — Phase 1 frozen contract

This section is intentionally explicit because Plan Move is a core Sales Layout interaction.

### 5.1 User goal

Move one or more placed Machine/Civil entities predictably in the layout plane while preserving Elevation unless the user explicitly chooses an elevation control.

### 5.2 Benchmark precedent

Autodesk Factory Design Utilities, Visual Components, SOLIDWORKS triad movement, AutoCAD 3D Move and Siemens Placement Manipulator all expose explicit axis/plane manipulation for constrained placement.

### 5.3 AtrVisu behavior

For Phase 1 editing of an already placed object:

- **Entity body click = selection.**
- **Plan translation authority = explicit Move manipulator.**
- X handle moves only canonical Plan X.
- Plan-Y handle moves only canonical Plan Y.
- Plan plane handle moves X and Plan Y together.
- Plan Move does not change Elevation.
- Elevation is a separate degree of freedom and is not inferred from Plan movement.
- Inspector numeric X/Y/Elevation editing remains a deterministic precision path.
- Arrange commands remain deterministic command-driven movement paths.

Direct body free-drag is **not** a Phase 1 Plan Move authority for already placed Machine/Civil entities. It may be introduced later only through a contract change and, if semantics differ from the benchmark family, an ADR.

### 5.4 Manipulator frame and pivot

- Manipulator axes are world/canonical Plan aligned unless a future contract explicitly introduces another coordinate mode.
- The default Plan pivot X/Y is the combined selected Plan footprint center.
- The working-plane elevation is the minimum selected base Elevation so the manipulator remains associated with the layout working plane rather than the visual center of tall geometry.
- Moving the manipulator must not mutate entity Elevation.

### 5.5 Camera independence

Camera position, pitch, azimuth or whether the camera is above/below the plan may change screen projection, but may **not change the semantic meaning of the active handle**.

The system must never secretly:

- swap axes;
- reverse an input component;
- suppress a direction component;
- change from Plan movement to camera-plane movement;
- apply catch-up movement;
- reinterpret the pointer through a hidden fallback solver.

The active handle defines the degree of freedom. Camera angle does not.

### 5.6 Failure behavior

If a framework limitation makes a requested direct gesture unreliable:

- do not invent a heuristic fallback;
- preserve selection;
- keep the explicit manipulator available;
- fail visibly and predictably rather than moving in an unexpected direction;
- surface the limitation for contract/implementation review.

### 5.7 History

One continuous manipulator gesture is one history transaction.

A snapped no-op remains a no-op and does not create a history entry. The gesture must remain usable without forcing a re-click unless the user releases/cancels it or the operation becomes invalid/blocked.

## 6. Rotate

### AtrVisu behavior

- Rotation is an explicit operation: rotate handle, Rotate command or numeric Inspector value.
- Rotation around an axis is visually distinguishable from translation.
- Rotation snap is applied through the canonical placement authority.
- One continuous rotate gesture is one history transaction.

### Forbidden behavior

- Body Plan drag may not unexpectedly rotate an object.
- Camera orbit may not mutate entity rotation.
- A translation handle may not silently become a rotation handle.

## 7. Snap and precision placement

### AtrVisu behavior

- Grid snap and rotation snap are canonical placement settings, not rendering-engine private state.
- Snap may quantize a valid active degree of freedom but may not change which degree of freedom is active.
- Turning snap on/off takes effect predictably for the next valid movement frame/gesture according to the placement contract.
- Snap must not require repeated grabbing merely because a current frame quantizes to the same value.
- Numeric Inspector placement is exact and independent of camera projection.

### Forbidden behavior

- Snap may not introduce accumulated catch-up drift.
- Snap may not modify Elevation during Plan movement.
- Framework gizmo `snapDistance` or equivalent may not become a second independent snap authority if AtrVisu already owns snap semantics.

## 8. Multi-selection and Group movement

### AtrVisu behavior

- Multi-selection movement applies one common Plan delta to all eligible selected entities.
- A Group moved outside Edit Group behaves as a rigid composite for movement.
- Group movement preserves member relative positions and Elevations.
- The manipulator pivot derives from the effective movement selection, not from one arbitrary member.
- One gesture is one atomic history transaction for the whole effective movement selection.
- Locked/invalid partial movement must not silently move only a subset of an atomic Group.

### Forbidden behavior

- Partial rigid-group movement without an explicit Edit Group context.
- Duplicate movement caused by both group and member authority being applied.
- A group-specific hidden transform that competes with canonical member positions unless a future group-transform contract explicitly introduces one.

## 9. Library drag/drop and insertion

Insertion is distinct from editing an already placed object.

### AtrVisu behavior

- Library drag/drop or Add inserts an entity through the canonical asset/entity/command pipeline.
- Initial placement uses an explicit placement surface/landing rule.
- A newly inserted object may enter a placement/reposition mode if the product contract makes that state visible and cancellable.
- Cancel restores the pre-insert/pre-move state according to command/history rules.

### Forbidden behavior

- Reusing insertion drag semantics as an undocumented editing body-drag mode.
- Raw mesh movement that bypasses entity position authority.

## 10. Camera navigation

### AtrVisu behavior

- Orbit, pan, zoom and Fit View are view operations.
- Camera navigation never mutates entity transform, selection ordering, dimensions or engineering data.
- Manipulation temporarily suppresses camera capture only when necessary for the active gesture, then restores it deterministically.

### Forbidden behavior

- Camera pitch or azimuth changing object movement semantics.
- Panel resize/collapse causing camera auto-fit unless the user invoked a documented Fit behavior.
- Camera controls and object manipulation fighting for the same pointer during an active gesture.

## 11. Numeric editing and live external updates

Numeric fields are precision engineering controls and must remain stable while domain values may also change from viewport manipulation.

### AtrVisu behavior

- When not actively editing, the field displays the current domain value.
- While focused and editing, the user's local draft is preserved until commit/cancel according to the field rule.
- External domain updates must not create a React feedback loop or repeatedly overwrite an active user draft.
- Prop/domain synchronization must not perform uncontrolled effect-driven state writes on every external movement frame.
- Commit creates the intended domain change through canonical mutation/history authority.
- Validation, units, min/max and invalid-input behavior remain explicit.

### Failure rule

Any `Maximum update depth exceeded` or repeated React update warning during valid numeric/viewport interaction is a release blocker, regardless of green automation elsewhere.

## 12. Undo / Redo

- One user gesture = one undoable transaction unless the interaction contract explicitly defines another model.
- Continuous pointer frames are not separate user transactions.
- Undo restores the complete atomic selection/group state affected by that gesture.
- Redo restores the same transaction deterministically.
- UI-only hover/focus/selection-presentation state does not pollute domain history.

## 13. Visible manipulation feedback

A precision manipulation surface must make the active degree of freedom obvious.

Required principles:

- hovered/active axis or plane is visibly emphasized;
- inactive controls do not compete visually during a committed drag when hiding/dimming improves clarity;
- cursor state reflects selectable/dragging state;
- the manipulator does not visually dominate the equipment/layout;
- visual appearance follows the AtrVisu visual-language contract, not an engine default merely because it functions.

The raw Babylon `PositionGizmo` appearance is an implementation primitive, not automatically final product styling.

## 14. Forbidden hidden-heuristic family

The following patterns are prohibited for core interaction unless an explicit future contract and ADR approve them:

- camera-relative sign clamping;
- Jacobian/correction blending that changes user intent;
- invisible fallback coordinate frames;
- delayed catch-up movement after pointer/object separation;
- gain changes that make identical pointer motion represent materially different semantic motion without user-visible mode change;
- threshold tuning used to hide an undefined interaction contract;
- warning suppression in place of resolving runtime update loops.

Mathematics may implement a frozen interaction. Mathematics may not define the interaction after the fact.

## 15. Required regression matrix for Plan Move

Any PR changing selection/move/snap/group/camera/numeric synchronization must cover, at minimum:

1. Standard Machine — X handle, Plan-Y handle, plane handle.
2. Imported GLB — same semantics.
3. Civil Column — normal height and tall geometry (including 50 m class geometry).
4. Elevated Civil/Machine — Plan Move preserves Elevation.
5. Rigid Group — common delta and one Undo.
6. Mixed Machine + Civil selection — common delta where eligible.
7. Snap OFF and Snap ON — no re-grab requirement on snapped no-op.
8. Locked/blocked selection — no partial mutation.
9. Camera clearly above, shallow/near-horizontal and below the working plane — handle semantics unchanged.
10. Inspector open during continuous movement — numeric values update without React update-depth warnings.
11. Persisted UI preference state + hard reload — no interaction or console regression.
12. Long-lived repeated movement — no accumulated drift, stale camera capture or console loop.

These tests validate contract behavior. Internal helper metrics such as finite delta, condition number or gain may supplement them but may never replace them.

## 16. Manual acceptance boundary

Manual acceptance is reserved for aspects automation cannot reliably judge, especially feel, visual hierarchy and professional polish.

Manual acceptance must not be used to discover basic contract violations that deterministic tests or code review should have caught.

The owner should never be asked to repeat broad exploratory testing merely because implementation is uncertain. The implementation/review agent must narrow manual acceptance to a small final product check.

## 17. Change procedure

To change this standard:

1. State the user problem.
2. Identify benchmark evidence.
3. State current contract and proposed contract.
4. Explain why the benchmark/default is insufficient if deviating.
5. Add/update ADR when the change is a meaningful deviation or architectural decision.
6. Update regression scenarios.
7. Only then implement product code.

No implementation PR may redefine the interaction first and update this document afterward as retrospective justification.
