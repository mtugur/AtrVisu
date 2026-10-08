# C03 Professional Measure Tool V2 - Benchmark & Product Design Review

Status: Stage A V2, benchmark/contract review only. No runtime implementation is authorized by this document.
Review date: 2026-10-08
Base main: `c224a3c4baee811ff3f03869fd82b9ed80d5be13`
Branch: `docs/p1-close-measure-v2-contract-v01`

## 1. Purpose

C03 Stage B prototype PR #126 demonstrated that a technically correct transient Measure session can be implemented, but product acceptance exposed a larger interaction-model gap: the tool needs a professional engineering measurement workspace rather than a small transient viewport widget.

This document deliberately separates:

- **Source-derived precedent**: behavior documented by mature products.
- **AtrVisu product decision**: the behavior AtrVisu will adopt, adapt or reject.
- **Implementation consequence**: what the later Stage B package must build.

No implementation behavior is treated as evidence for a product decision.

## 2. Benchmark method

Task similarity is prioritized over brand prestige. The primary benchmark family is industrial/factory layout; CAD/documentation tools are used for dimensioning, snapping, associativity and annotation behavior.

### 2.1 Primary evidence

| Product / feature | Source-derived precedent | AtrVisu decision |
|---|---|---|
| Visual Components 5.1 - Measuring Components | Measure is a 3D-world tool with a **Measure task pane**. The user configures picking, confirms point A, previews point B, confirms it, sees the result in the 3D world, and exits with Esc/Close. Display accuracy is configurable. | **ADOPT** task-pane ownership, active preview and viewport result. Keep AtrVisu's explicit session/selection rules. |
| Visual Components 5.1 - Layout view | Layout tools such as Measure, Linear Dimension and Angular Dimension expose additional options in a task pane; the layout workspace separates Properties from tool-specific task panes. | **ADAPT**: use the existing AtrVisu right-dock shell as a dedicated Measure tab, never overload Properties Inspector. Keep Linear/Angular as measurement modes rather than inventing unrelated command surfaces. |
| Autodesk Navisworks - Measure Tools Window | Measure results live in a **dockable Measure Tools window**. Start/end XYZ, difference and distance are visible. Saved measurements can be renamed, deleted and exported. | **ADOPT** dedicated dock + saved-measurement management. AtrVisu persists richer Reference Dimension annotations instead of only saved numeric values. |
| Autodesk Navisworks - Measure Page | Measure lines have configurable thickness/color; a measurement can be rendered **In 3D** and therefore become occluded, or as 2D over geometry. Measurement values and XYZ differences can be shown in the Scene View. | **ADOPT** depth-aware 3D as the default. **ADAPT** optional Overlay mode; never make always-on-top rendering the default. |
| Autodesk Navisworks - Measuring | Distance labels are positioned relative to the measured line; angular measurements use an arc and label; area labels are positioned at the measured area. Labels can be toggled. Measurements can be converted to markups stored in the current viewpoint. | **ADOPT** dimension-line/label/arc presentation. **ADAPT** persistence into AtrVisu Annotation entities rather than viewpoint-only markup. |
| Autodesk Navisworks - Snapping | Measure snapping provides cursor feedback and can snap to vertex, edge, line end and surface; snap points can be rendered and their pixel size controlled. | **ADAPT** semantic entity anchors first. Do not expose raw GLB tessellation as the primary professional anchor model. |
| SOLIDWORKS 2026 - Measure Tool | Measure reports exact dimensions in a Measure dialog; it supports distance/angle/radius, point coordinates, projected area and multiple distance interpretations. | **ADOPT** rich result semantics and coordinate readout. Keep AtrVisu's domain mm and explicit Plan/3D distinction. |
| SOLIDWORKS/eDrawings 2026 - Measure | Measure results appear as graphics-area callouts and disappear when Measure is released; measurements are not saved. | **ADOPT** transient-session semantics as one layer. Do **not** make persistence part of the raw Measure session. |
| SOLIDWORKS/eDrawings 2026 - Dimensions | Saved dimensions are a separate reference/markup concept. Dimension text is editable; dimension text and extension lines can be repositioned. Editing reference text does not modify the model. | **ADOPT** a second persistent Reference Dimension concept. **ADAPT** it to AtrVisu's Annotation entity and associativity model. |
| Revit 2025/2027 - Temporary/Permanent Dimensions | Temporary dimensions disappear when the action/context ends; permanent dimensions are view-specific project documentation. Witness lines can be moved to new references. | **ADOPT** explicit transient vs persistent distinction and editable references. AtrVisu persistence is project-level Annotation, with view/presentation context handled separately. |
| Revit Dimension Type Properties | Dimension styles expose text size/font/background, line weight, leader/witness behavior, text offset, unit format and placement controls. | **ADOPT** a real Dimension Style instead of hard-coded canvas text. Exact defaults are an AtrVisu visual decision, not a vendor fact. |
| AutoCAD 2026 - 3D Object Snap | 3D object snaps include vertex, edge midpoint, face center, perpendicular and nearest-to-face. Candidate snaps can be cycled. | **ADOPT** magnetic reference candidates. **ADAPT** the set to AtrVisu entity semantics and canonical dimensions. |
| AutoCAD 2026 - Associative Dimensions | Associative dimensions update location/orientation/value when referenced geometry changes. If association is lost, the system identifies the disassociated annotation and supports reassociation. | **ADOPT** association by entity + reference anchor. **ADOPT** explicit orphan/reassociate state; never silently freeze a broken dimension. |
| AutoCAD 2026 - Dimension Style / Annotative Scaling | Dimension styles control fit, text/arrow placement and annotative scaling; annotation can remain screen/plot-scale appropriate as view scale changes. | **ADOPT** bounded screen-aware annotation sizing. **REJECT** copying AutoCAD paper-space scale semantics into the 3D web viewport. |
| Fusion 2026 - Measure | Measure uses selection filters, precision, secondary units, snap-point display and XYZ delta; hovering a result highlights the corresponding measurement in the canvas. | **ADOPT** explicit selection/reference filters, precision and result-to-viewport linkage. |
| Onshape 2026 - Measure | Measure exposes multiple result interpretations such as min/max/center distance and dynamically visualizes selected measurements. | **ADOPT** explicit measurement interpretation. Do not expose every CAD result in Phase 1; keep the C03 set bounded. |
| Onshape 2026 - Mate Connector inference | Hovering wakes implicit inference points; nearest candidate highlights; faces/edges expose centroids, midpoints and corners; Shift can lock an intended inference. | **ADOPT** hover-magnetic anchors and candidate lock. **ADAPT** anchors to Machine/Civil canonical geometry and references. |


## 2.2 Traceable evidence records

The following are the **Official source** records used for the benchmark decisions. Review/access date for this package: 2026-10-08.

| Benchmark | Product/version | Official source | Task similarity | Observed behavior | AtrVisu adoption |
|---|---|---|---|---|---|
| VC-MEASURE-01 | Visual Components Premium 5.1 | https://help.visualcomponents.com/5.1/Premium/en/English/3D%20Operations/Measuring_components.htm | High: industrial 3D factory/layout measurement | Measure task pane, point A/B workflow, live preview, 3D result, Esc/Close, display accuracy. | Adopt dedicated task-pane model, preview and viewport result. |
| VC-LAYOUT-01 | Visual Components Premium 5.1 Layout View | https://help.visualcomponents.com/5.1/Premium/en/English/Getting%20Started/UI%20Overview/Tabs/Layout_View.htm | High: factory layout workspace | Measure has additional task-pane options and sits alongside other layout tools. | Adapt into AtrVisu right-dock Measure tab; keep Inspector separate. |
| NW-MEASURE-01 | Autodesk Navisworks 2026 | https://help.autodesk.com/cloudhelp/2026/ENU/Navisworks-Freedom/files/GUID-E0E92E2A-E8F4-4FC1-AB2F-BFD0CCEA1012.htm | High: industrial/digital-twin model review | Dockable Measure Tools window; XYZ, difference, distance; saved measurements can be renamed/deleted/exported. | Adopt dock + saved-measurement management. |
| NW-MODES-01 | Autodesk Navisworks 2026 | https://help.autodesk.com/cloudhelp/2026/ENU/Navisworks/files/GUID-5D5F37EC-5551-42E4-B279-3FE7F67DDD37.htm | High: 3D engineering measurement | Line thickness/color, In 3D, optional 2D over-geometry display, scene labels and XYZ differences. | Adopt depth-aware default; adapt explicit Overlay mode. |
| NW-TOOLS-01 | Autodesk Navisworks 2026 | https://help.autodesk.com/cloudhelp/2026/ENU/Navisworks/files/GUID-F792FBD7-E753-45B2-99DD-51DFACFD23F7.htm | High: industrial model measurement | Point-to-point, angle, area, shortest distance and conversion to markup are distinct tools. | Adopt bounded measurement family and explicit result/markup distinction. |
| NW-SNAP-01 | Autodesk Navisworks 2023 | https://help.autodesk.com/cloudhelp/2023/ENU/Navisworks/files/GUID-FA3E0D9E-9794-4FB8-906D-8E48F68C50A3.htm | High: 3D model picking during measurement | Measurement snapping with cursor feedback to vertex/edge/line/surface. | Adapt to AtrVisu semantic anchors and canonical entity references. |
| SW-MEASURE-01 | SOLIDWORKS Design 2026 | https://help.solidworks.com/2026/english/SolidWorks/sldworks/HIDD_MEASURE.htm?id=3.10 | High: professional engineering/CAD measurement | Distance/angle/radius, XYZ, point-to-point, projected measurements, precision and measurement history. | Adopt rich result semantics; retain AtrVisu mm and Plan/3D distinctions. |
| SW-EDRAWINGS-01 | SOLIDWORKS eDrawings 2026 | https://help.solidworks.com/2026/english/edrawings/c_Dimensions.htm | High: engineering review/markup | Measure results disappear on exit; saved dimensions are separate markup elements with editable text and extension-line handles. | Adopt transient-vs-persistent separation and editable reference presentation. |
| REVIT-DIM-01 | Autodesk Revit 2025/2027 | https://help.autodesk.com/cloudhelp/2027/ENU/Revit-DocumentPresent/files/GUID-A7C5D9BD-BA91-4D94-9073-7C1C158A3910.htm | High: engineering/building documentation dimensions | Temporary dimensions disappear; permanent dimensions document the model; witness lines can be moved to new references. | Adopt transient/persistent distinction and editable references, adapted to 3D industrial annotations. |
| REVIT-STYLE-01 | Autodesk Revit 2022/2025 | https://help.autodesk.com/cloudhelp/2022/ENU/Revit-DocumentPresent/files/GUID-50997817-F56B-4BBA-B5FD-644C364670B3.htm | High: professional dimension readability | Temporary dimension text size/background are configurable. | Adopt configurable text/background model; exact web defaults remain AtrVisu decisions. |
| ACAD-ASSOC-01 | Autodesk AutoCAD 2026 | https://help.autodesk.com/cloudhelp/2026/ENU/AutoCAD-LT-DidYouKnow/files/GUID-7C7B6F58-2E17-4A77-9579-D42E205800BF.htm | High: associative engineering dimensions | Associative dimensions update with geometry; broken associations can be reassociated using object snaps. | Adopt entity-reference associativity and explicit Orphaned/Reassociate state. |
| ACAD-ASSOC-02 | Autodesk AutoCAD 2026 | https://help.autodesk.com/view/ACD/2026/ENU/?caas=caas%2Fdocumentation%2FCIV3D%2F2014%2FENU%2FfilesACD%2FGUID-D77085A3-6E4C-4C18-AD70-21F54ED72492-htm.html | High: associative dimension behavior | Associative dimensions update location/orientation/value when association points move. | Adopt the update principle without copying AutoCAD's object model. |
| FUSION-MEASURE-01 | Autodesk Fusion 2026 | https://help.autodesk.com/view/fusion360/ENU/?contextId=SIM-MEASURE-CMD | Medium-high: CAD model measurement | Selection filters, precision, snap points, Ctrl lock, XYZ delta and result visualization. | Adopt explicit selection/reference filters, precision and snap feedback. |
| ONSHAPE-MEASURE-01 | Onshape current help | https://cad.onshape.com/help/Content/View/measure_tool.htm | Medium-high: cloud CAD model measurement | Measure tool displays dynamic results; measurement type can be filtered; selected measurements can remain visually indicated. | Adopt explicit measurement interpretation and result-to-canvas linkage. |
| ONSHAPE-INFER-01 | Onshape current help | https://cad.onshape.com/help/Content/Assembly/assembly_mate_connector.htm | Medium-high: CAD reference-point inference | Hover wakes inference points; nearest candidate highlights; centroid/midpoint/corner references are available; Shift locks inference. | Adopt hover-magnetic semantic anchors and deliberate candidate lock. |

These URLs are primary product documentation rather than marketing material. The benchmark record therefore satisfies the repository's requirement for traceable official evidence.

## 2.3 Benchmark conflict notes

The products do not agree on whether measurement should remain transient, be saved as a measurement record, or become a drawing/markup dimension. The relevant distinction is **workflow layer**, not contradiction:

- Visual Components and SOLIDWORKS/eDrawings demonstrate a transient Measure workflow.
- Navisworks demonstrates saved measurement records and conversion to markup.
- Revit demonstrates temporary vs permanent dimensions.
- AutoCAD demonstrates associative persistent dimensions.

AtrVisu therefore does not claim a universal industry rule. It deliberately combines these precedents into two explicit layers: transient **Measure Session** and persistent **Reference Dimension**.

The sources also differ in snap topology. Navisworks can snap directly to tessellated vertices/edges, while Onshape emphasizes semantic inference points such as centroids, midpoints and corners. AtrVisu chooses the latter as the professional reference model for Machine/Civil entities because its domain model has canonical dimensions/transforms; raw render topology remains a free geometry-hit source, not the semantic anchor authority.

The sources likewise differ in annotation presentation. Navisworks explicitly supports both 3D depth-aware lines and 2D overlay lines. AtrVisu adopts the depth-aware mode as default and exposes Overlay as an explicit presentation choice.

## 3. What the benchmarks actually converge on

The sources do not define one universal Measure implementation. They do converge on a product family:

1. **Measure is a dedicated engineering tool surface**, not an Inspector-only diagnostic.
2. **The active measurement is transient**, with live preview and explicit completion.
3. **Saved/reference dimensions are a separate concept** from transient measurement.
4. **Professional graphics are dimension graphics**, not only text next to a line: endpoint/reference markers, dimension line, extension/witness lines, arrow/tick treatment, and mode-specific labels.
5. **Reference selection is explicit and magnetic**; vertices, centers, midpoints and meaningful reference points are normal engineering behavior.
6. **Professional dimensions have a style model** rather than a fixed canvas font.
7. **3D measurement graphics are normally spatially meaningful**; an explicit overlay/2D mode is useful when geometry occludes the measurement.
8. **Associativity matters once a measurement becomes persistent**. Mature systems expose a broken-reference state instead of silently converting an associative dimension into a stale number.
9. **Saved measurements need management**: visibility, naming/deletion and a list are established patterns.

The benchmark set does **not** justify:
- making every measurement persistent automatically;
- treating every imported mesh triangle/vertex as a professional snap reference;
- rendering all dimensions permanently above all scene geometry;
- fixing a specific 6 CSS-pixel text size as an industry standard;
- copying AutoCAD's paper-space annotation model into AtrVisu's 3D viewport.

## 4. AtrVisu V2 architecture decision

### 4.1 Two-layer measurement model

AtrVisu V2 will explicitly contain two related but different concepts.

**A. Measure Session**
- transient;
- viewport-owned;
- active Pick/Navigate state;
- live preview;
- confirmed operands/results;
- no persistence, dirty state or project entity creation;
- exits with Esc/Exit.

**B. Reference Dimension**
- persistent;
- represented by the existing product-level Annotation entity family;
- created explicitly from a completed measurement using **Keep / Save**;
- appears in a managed list in the Measure panel;
- has visibility, name, style and reference state;
- can be edited/reassociated;
- participates in project save/reload;
- does not mutate the measured Machine/Civil geometry.

This is the deliberate AtrVisu synthesis of Visual Components transient task-pane measurement, SOLIDWORKS/eDrawings transient Measure + saved Dimension, Revit temporary/permanent dimensions, and Navisworks saved measurements/markups.

### 4.2 Measure panel

The Measure tool will be owned by a dedicated **Measure** tab in the right-side tool dock.

The panel is not the Properties Inspector.

The panel contains, at minimum:

- measurement kind;
- point/reference source;
- Pick/Navigate state;
- snap/anchor mode;
- active operands;
- live/completed result;
- Keep / Save;
- Restart;
- reference-dimension list;
- per-dimension visibility;
- global Show/Hide all;
- style controls;
- reference/anchor editing for selected persistent dimensions.

The viewport remains the primary engineering workspace. The panel is the control and management surface; it is not a second geometry view.

### 4.3 Reference endpoint model

Persistent measurement endpoints are not stored only as rounded world coordinates.

Supported endpoint references:

1. **Entity Anchor Reference**
   - entity ID;
   - anchor kind;
   - canonical local anchor parameters;
   - resolved world point is derived at render/calculation time.
   - associative to entity transform and canonical dimensions.

2. **World Point Reference**
   - exact domain-mm world point;
   - non-associative/static by definition.
   - used where no meaningful entity anchor exists.

3. **Level Reference**
   - Level ID;
   - Plan X/Y;
   - captured/derived FFL semantics.
   - follows the referenced Level datum according to the Level contract.

The persisted object stores full-precision domain data. Display rounding never becomes a calculation source.

### 4.4 Professional anchor set

For Machine/Civil entities, V2 will expose semantic anchors rather than raw render-mesh topology.

Initial anchor families:

- canonical front-left-bottom;
- front-right-bottom;
- back-left-bottom;
- back-right-bottom;
- footprint center;
- front/back/left/right footprint edge midpoints;
- bottom/top face center where the entity's canonical dimensions support the reference;
- actual visible geometry hit as a free point.

Hovering an entity exposes only the relevant candidates. The nearest candidate is highlighted. A deliberate modifier locks the candidate before confirmation.

The exact anchor coordinate is derived from the entity's canonical local dimensions/transform authority. It is not inferred from an arbitrary GLB bounding box.

Raw tessellation vertices are not promoted to first-class professional anchors.

### 4.5 Editing persistent references

A saved Reference Dimension is editable without recreating the measurement.

- Selecting the dimension highlights its reference endpoints.
- Dragging the **dimension text** changes presentation placement only.
- Dragging an **endpoint/reference grip** enters reference replacement.
- Candidate anchors become visible and magnetic.
- Confirming a new anchor updates the associative reference and recomputes the value.
- If the referenced entity no longer exists or the anchor cannot be resolved, the dimension becomes **Orphaned**.
- Orphaned dimensions remain visible/listed with a clear status and may be deleted or reassociated.
- A broken reference is never silently converted into a stale fixed number.

This follows the mature associative/reassociation model while keeping AtrVisu's reference system bounded.

### 4.6 Dimension graphics

A completed Reference Dimension uses a professional dimension graphic:

- extension/witness lines from reference points;
- dimension line or mode-specific leader;
- arrow/tick treatment;
- dimension value;
- endpoint/reference markers when selected or being edited;
- angle arc for angular dimensions;
- area boundary/label for area measurements.

During active measurement, point markers and preview graphics are allowed to be more explicit. After confirmation, the persistent graphic becomes a clean reference dimension.

The dimension graphic is a presentation layer. It never becomes the source of engineering geometry.

### 4.7 Occlusion / depth

Default mode: **3D depth-aware**.

A persistent dimension line may pass behind unrelated geometry when that geometry physically occludes the measurement. This is intentional and is the professional default for a 3D engineering scene.

Optional mode: **Overlay**.

Overlay is an explicit presentation mode for cases where the user needs the measurement readable over geometry. It is not the default and is never silently enabled to rescue a bad viewpoint.

The system must not create a hidden always-on-top measurement renderer.

### 4.8 Dimension style

V2 introduces a real Measure Dimension Style.

The style controls, at minimum:

- font family;
- text size mode;
- minimum/maximum screen-space text size for adaptive mode;
- line weight;
- arrow/tick style and size;
- text offset;
- text background/halo;
- unit/precision presentation;
- text placement/fit behavior;
- dimension/leader visibility options.

**Important:** a fixed `6 CSS px` maximum is not adopted as a benchmark fact. The benchmarks support configurable/annotative sizing, but do not establish 6 px as a professional target. AtrVisu will use bounded adaptive screen-space sizing; exact default values must be selected as a visual acceptance parameter after the graphic system exists.

This is intentionally different from the previous implementation, which hard-coded a small canvas label presentation.

### 4.9 Visibility and persistence

A completed measurement is not automatically made permanent.

The normal flow is:

1. measure;
2. inspect the result;
3. **Keep / Save** if it is useful as a project reference;
4. manage the saved Reference Dimension from the Measure panel.

Saved dimensions support:

- per-dimension show/hide;
- global show/hide;
- rename;
- delete;
- selection from the list;
- edit/reassociate;
- status display (healthy/orphaned).

Hide is not delete.

### 4.10 Selection relationship

Measure operands and Runtime Selection remain separate.

Entry selection may seed entity dimensions/pair reference measurements, but measurement picking does not rewrite Runtime Selection.

Persistent dimensions reference entities through their endpoint references, not through the current Runtime Selection.

## 5. Adopt / Adapt / Reject decisions

### Adopt
- dedicated Measure task pane/dock;
- transient active measurement with preview;
- explicit saved/reference dimension layer;
- viewport dimension graphics;
- semantic snap/inference candidates;
- configurable dimension style;
- depth-aware 3D measurement as default;
- explicit saved-measurement management;
- associative references and explicit orphan/reassociation state.

### Adapt
- Navisworks saved measurements become richer AtrVisu Reference Dimensions;
- Navisworks 2D overlay becomes an explicit optional display mode;
- AutoCAD/Revit associative dimensions become entity-anchor references based on AtrVisu's Entity/Transform authority;
- Onshape inference points become a bounded Machine/Civil anchor vocabulary;
- Visual Components task-pane behavior becomes a right-dock Measure tab because AtrVisu already has a registered shell;
- CAD fit/annotation behavior becomes screen-space web annotation behavior rather than paper-space scaling.

### Reject
- Measure as an Inspector-only feature;
- automatic persistence of every transient measurement;
- raw GLB tessellation as the primary anchor model;
- always-on-top measurement rendering;
- a fixed 6 CSS-pixel professional text-size claim;
- CAD editing semantics where changing a reference dimension modifies machine/civil geometry;
- a second selection store;
- a second entity/coordinate authority.

## 6. Required V2 acceptance families

Before Stage B implementation is considered ready, the contract/gate must cover:

- **M20 Surface:** Measure opens in right dock; Inspector remains context-only; scene remains primary.
- **M21 Session:** transient Pick/Navigate, preview, completion, Restart and Esc.
- **M22 Graphics:** dimension line, extension lines, arrow/tick, label, angle arc, area label.
- **M23 Style:** font change, adaptive screen-space size, min/max bounds, precision, line weight, background/halo and theme.
- **M24 Anchors:** corner/midpoint/center inference, nearest-candidate feedback, deliberate candidate lock, no raw-mesh authority.
- **M25 Reference edit:** endpoint grip replacement and recomputation without recreating the dimension.
- **M26 Persistence:** Keep/Save, project save/reload, list, rename, per-item/global visibility and delete.
- **M27 Associativity:** entity move/rotate/dimension change updates the saved dimension; deletion/invalid reference produces an Orphaned state; reassociation repairs it.
- **M28 Occlusion:** default depth-aware behavior plus explicit Overlay mode; no hidden always-on-top fallback.
- **M29 Selection invariants:** measurement operands never rewrite Runtime Selection; Explorer/Inspector selection remains authoritative.
- **M30 Lifecycle/export:** panel collapse/resize does not mutate scene/camera/selection; transient tool does not dirty project; persistent Reference Dimensions are included/excluded from captures according to explicit visibility/export rules.

## 7. Out of scope for this package

- collision/clearance engine;
- automatic minimum-distance analysis beyond the explicitly contracted Measure modes;
- full CAD topology kernel;
- PMI/GD&T;
- arbitrary mesh feature recognition;
- dimension-driven geometry editing;
- full drawing-sheet dimensioning;
- C04 Advanced Alignment redesign;
- C05 mixed-property editing;
- C07 Inspector redesign;
- C09 Simulation Controls naming.

## 8. Gate to Stage B

Stage B implementation may begin only after:

1. this benchmark review is accepted as the source of the V2 interaction model;
2. the V2 contract and ADR are frozen;
3. acceptance/adversarial scenarios are frozen;
4. Command/Panel/Feature Access changes are explicitly listed;
5. the implementation package remains bounded to C03 V2.

No runtime code in PR #126 is considered a substitute for this review.
