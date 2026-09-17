# AtrVisu Interaction Benchmark Baseline v1.0

Status: Normative evidence record for currently frozen interaction conventions
Review date: 2026-09-17

Purpose: provide traceable, task-similar benchmark evidence behind the interaction families frozen in `docs/standards/ATRVISU_INTERACTION_STANDARD.md`. This file satisfies `docs/standards/ATRVISU_BENCHMARK_EVIDENCE_STANDARD.md` for the behaviors listed below.

## Evidence quality rule

Only official product help/documentation or official vendor material is used in this baseline. Babylon.js or another rendering framework is not treated as product-behavior precedent.

## B1 — Industrial layout / Plan Move manipulator

### Visual Components 4.8/4.10
- Product/workflow: Visual Components — moving and rotating components / Layout Move.
- Official sources:
  - https://help.visualcomponents.com/4.8/Premium/en/English/Getting%20Started/Moving_and_rotating_components.htm
  - https://help.visualcomponents.com/4.10/Premium/en/English/Getting%20Started/UI%20Overview/Tabs/Layout_View.htm
- Factual behavior: selected components are moved with a manipulator; an axis arrow constrains translation to one axis, a plane handle constrains translation to the plane defined by two axes, axis rings rotate, and Grid Snap applies while using the manipulator. The Properties panel also exposes exact XYZ/RxRyRz values.
- Task similarity: direct match to industrial/factory 3D layout placement.
- AtrVisu adoption: explicit Plan X / Plan Y / Plan-plane handles, canonical snap, separate exact numeric placement.

### Autodesk Factory Design Utilities
- Product/workflow: Factory Design Utilities — Reposition Components.
- Official source: https://help.autodesk.com/cloudhelp/2021/ENU/FDU/files/Inventor-Factory-Help/About-Placing-Factory-Assets/FDU_Inventor_Factory_Help_About_Placing_Factory_Assets_To_Reposition_Components_html.html
- Factual behavior: a triad repositions one or multiple factory components by axial translation, planar translation, or axial rotation. `Honor Floor` is enabled by default and pins the triad/component to the factory floor during dragging.
- Task similarity: direct match to factory-equipment layout placement and floor-constrained movement.
- AtrVisu adoption: explicit constrained Plan movement and floor/elevation separation; working datum remains deterministic.

### Siemens Tecnomatix / RobotExpert 15
- Product/workflow: Placement Manipulator.
- Official source: https://blogs.sw.siemens.com/tecnomatix/robotexpert-15-whats-new/
- Factual behavior: axis and rotation affordances highlight when targeted; during drag the active axis remains emphasized while other manipulator components hide; a plane handle moves the object along the selected plane; numeric adjustment is available close to the selected axis/arc.
- Task similarity: direct match to industrial placement/manipulation in a manufacturing-engineering tool.
- AtrVisu adoption: visible degree-of-freedom handles, explicit axis/plane semantics, clear active-state feedback; final visual language is reviewed separately from engine-default gizmo appearance.

### AutoCAD 3D Move
- Product/workflow: AutoCAD 3DMOVE / 3D Move gizmo.
- Official sources:
  - https://help.autodesk.com/cloudhelp/2026/ENU/AutoCAD-Core/files/GUID-35FD374D-CD9F-4EC6-B50E-7C368B67DFB5.htm
  - https://help.autodesk.com/cloudhelp/2026/ENU/AutoCAD-MAC-Core/files/GUID-BB806D37-2ABB-446B-A4BD-72067462189D.htm
- Factual behavior: selected 3D objects may move freely or be explicitly constrained to an axis or plane via the 3D Move gizmo; the gizmo can align to a work coordinate system or face.
- Task similarity: general professional CAD direct manipulation; secondary to industrial-layout precedents above.
- AtrVisu adoption: constrained move is explicit; free drag is a distinct semantic, not a hidden fallback for constrained Plan move.

## B2 — Free drag is separate from constrained triad movement

### SOLIDWORKS 2025
- Product/workflow: Moving Components in assemblies.
- Official source: https://help.solidworks.com/2025/english/SolidWorks/sldworks/t_Moving_a_Component_SWassy.htm
- Factual behavior: direct component dragging is a distinct mode governed by assembly degrees of freedom and can be disabled in options. Triad movement is separate: an arm constrains along an axis, a plane/ring affordance constrains motion, and exact XYZ/delta entry is available.
- Task similarity: mature mechanical CAD component manipulation.
- AtrVisu adoption: body/free drag cannot be silently repurposed as the same semantic as constrained Plan Move. Phase-1 body interaction remains selection/picking until an explicit free-drag contract is approved.

## B3 — Numeric property editing alongside graphical manipulation

### Visual Components
- Source: https://help.visualcomponents.com/4.8/Premium/en/English/Getting%20Started/Moving_and_rotating_components.htm
- Factual behavior: position/orientation can be edited numerically in Properties (`XYZ`, `RxRyRz`) in addition to using the manipulator.

### SOLIDWORKS
- Source: https://help.solidworks.com/2025/english/SolidWorks/sldworks/t_Moving_a_Component_SWassy.htm
- Factual behavior: exact coordinates or delta values can be entered from the triad workflow.

AtrVisu adoption: pointer manipulation and Inspector numeric editing are two presentations of the same canonical transform authority. Numeric controls must not create a second domain truth or a prop/effect feedback loop.

## B4 — Snapping during manipulator movement

### Visual Components 4.10
- Product/workflow: Layout / Modeling manipulation.
- Official sources:
  - https://help.visualcomponents.com/4.10/Premium/en/English/Getting%20Started/UI%20Overview/Tabs/Layout_View.htm
  - https://help.visualcomponents.com/4.10/Premium/en/English/Getting%20Started/UI%20Overview/Tabs/Modeling_View.htm
- Factual behavior: selected objects move along axes/planes with the manipulator; snap interval controls apply to manipulator movement; dedicated snap/align commands coexist with Move.
- Task similarity: direct industrial layout manipulation.
- AtrVisu adoption: snap quantizes the canonical move authority and must not create an independent pointer/movement engine.

## B5 — Rotation as an explicit constrained affordance

### Siemens Tecnomatix / RobotExpert
- Source: https://blogs.sw.siemens.com/tecnomatix/robotexpert-15-whats-new/
- Factual behavior: rotation arcs are explicit manipulator elements with active-state highlighting and numeric adjustment.

### AutoCAD
- Source: https://help.autodesk.com/cloudhelp/2025/ENU/AutoCAD-Core/files/GUID-C8A768F6-AC8B-457B-A2F4-CE3BC3A76E18.htm
- Factual behavior: the 3D Rotate gizmo constrains change to a specific axis and may align to world/current UCS or face.

AtrVisu adoption: rotation is an explicit operation; arbitrary body drag or camera orbit must never rotate an entity.

## B6 — Undo/Redo after direct interaction

### Visual Components 4.10
- Product/workflow: interactive component manipulation.
- Official source: https://help.visualcomponents.com/4.10/Premium/en/English/Getting%20Started/Interacting_with_parts_of_components.htm
- Factual behavior: interaction changes can be undone with Ctrl+Z and redone with Ctrl+Y.
- AtrVisu adoption: meaningful manipulation gestures are transactionally Undoable/Redoable; pointer-frame updates are not exposed as separate user history steps.

## B7 — Camera and object manipulation are different interaction classes

Evidence basis across Visual Components, Autodesk Factory, AutoCAD, SOLIDWORKS and Siemens sources above: object manipulation is entered through dedicated Move/Reposition/triad/manipulator affordances with explicit axes/planes, rather than camera orientation redefining world-axis semantics.

AtrVisu adoption: camera orbit/pan/zoom changes presentation only. It cannot silently remap Plan X/Y, reverse the chosen manipulation direction, or switch movement model mid-gesture.

## Current conclusions frozen from evidence

1. Industrial layout placement should prefer explicit axis/plane manipulator semantics.
2. Free/body drag, where supported by a product, is a separate interaction semantic rather than a fallback implementation of constrained Plan move.
3. Floor/elevation constraints are explicit product concepts, not camera-angle heuristics.
4. Numeric placement and manipulator placement coexist but must resolve to one canonical transform authority.
5. Framework-default gizmo graphics are implementation primitives, not proof of final product UX quality.

## Re-review trigger

Re-review this evidence record when:
- the Interaction Standard changes one of the behaviors above;
- a new task-similar benchmark materially contradicts this baseline;
- AtrVisu intentionally deviates from one of these conventions;
- benchmark source URLs become unavailable or materially change meaning.

A changed implementation alone is not a reason to rewrite benchmark evidence.