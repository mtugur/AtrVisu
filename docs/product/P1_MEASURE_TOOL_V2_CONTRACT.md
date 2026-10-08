# C03 Professional Measure Tool V2 - Product Contract

Status: Stage A V2 contract proposal/freeze package. Runtime implementation is not included.
Base main: `c224a3c4baee811ff3f03869fd82b9ed80d5be13`
Benchmark source: `docs/benchmarks/P1_MEASURE_TOOL_V2_BENCHMARK_REVIEW.md`

## 1. Product decision

C03 V2 is a professional **measurement workspace**, not a transient ruler widget.

The product has two explicit layers:

1. **Measure Session** — transient measurement workflow.
2. **Reference Dimension** — persistent project annotation created explicitly from a completed measurement.

The Measure Session never becomes persistent merely because the user confirms a point. Persistence is an explicit **Keep / Save** action.

The previous C03 Stage A/B contract remains a useful transient-measure baseline, but it is superseded for implementation by this V2 package where this document explicitly differs.

## 2. Authority and existing-platform constraints

The V2 implementation must preserve:

- Command Registry as the command authority.
- Panel Registry as the panel authority.
- Selection Manager as the Runtime Selection authority.
- Entity Manager / Entity Adapter as the entity and canonical transform/dimension authority.
- Viewport Contract as the viewport/camera/layout authority.
- Feature Access Matrix as the access-path authority.
- canonical domain units: mm, mm² and degrees.
- canonical user placement reference: front-left-bottom unless a specific anchor definition says otherwise.
- no geometry mutation from measurement.
- no direct handler routes or competing tool stores.

The Master Plan identifies Annotation as an entity family including dimension/markup concepts and requires the layout model to remain an entity graph rather than a render snapshot. The V2 Reference Dimension therefore belongs to the product Annotation model, not to a UI-only measurement store. fileciteturn471file6

The existing Precision Placement Helpers command `view.showMeasurements` remains separate and is not renamed into Measure.

## 3. Surface contract

### 3.1 Right-side Measure tab

A dedicated `Measure` tab is added to the right-side tool dock.

It is **not** the Properties Inspector.

The right dock may contain the normal Properties Inspector and the Measure tool surface as separate tabs. Switching tabs must not mutate:

- Runtime Selection;
- entity transforms;
- camera;
- measurement operands;
- project dirty state;
- active Level;
- Undo/Redo history.

The scene remains the primary workspace.

### 3.2 Measure panel content

The Measure panel exposes:

- measurement kind;
- point/reference source;
- Pick/Navigate;
- snap/anchor mode;
- active A/B/C operands;
- current result;
- Keep / Save;
- Restart;
- Exit;
- Saved Reference Dimensions list;
- per-dimension visibility;
- global visibility;
- dimension style;
- reference/anchor editing for the selected saved dimension.

The panel must not become a general diagnostics or project-manager surface.

### 3.3 Command and Feature Access

Stage B must use:

- command: `view.measure`;
- feature: `viewport.measure`;
- panel: `panel.measure`.

Quick Toolbar, View and Command Palette enter the same authority. No second Measure store or private route is permitted.

The existing `view.showMeasurements` / `measurements.show` feature remains the Precision Placement Helpers compatibility feature.

## 4. Measure Session

### 4.1 Lifecycle

States:

- Inactive
- Picking
- Preview
- Completed
- Navigating
- Invalid

A session is transient and is never serialized.

The existing frozen Pick confirmation classifier remains authoritative:

- maximum radial displacement: **4 CSS px**;
- measured in CSS `clientX/clientY`;
- inclusive boundary;
- pointer-up confirms once;
- movement beyond 4 px cancels that press;
- pointercancel, pre-up capture loss, focus loss, outside release, tool reset or exit cancels pending confirmation;
- no DPR scaling, time threshold, velocity threshold, smoothing or fallback;
- cancelled Pick does not become Orbit;
- Navigate alone owns LMB orbit;
- MMB Pan and wheel zoom retain the existing camera authority.

### 4.2 Runtime Selection

Runtime Selection is snapshotted read-only at entry for entity-dimension and pair-reference submodes.

Measure operands are a separate transient tool state.

Measurement picking never clears, toggles or rewrites Runtime Selection.

### 4.3 Measurement kinds

V2 retains the existing bounded C03 calculation family:

- Distance;
- Angle;
- Plan Area / Perimeter;
- Selected Machine/Civil local Width/Depth/Height;
- Entity Pair Reference.

The previous numerical definitions, coordinate mapping and Level Plane semantics remain unless explicitly superseded below.

### 4.4 Distance

- Confirm A.
- Preview B continuously.
- Confirm B.
- `Delta X/Y/Z = B-A`, signed.
- 3D distance = Euclidean norm.
- Plan distance = XY norm and explicitly named.
- A=B is valid zero.
- Full precision is retained internally.

Viewport presentation contains the two reference markers, measurement line, dimension label and optional axis deltas.

### 4.5 Angle

- Confirm A.
- Confirm B as the vertex.
- Preview/confirm C.
- Interior 3D angle in [0, 180] degrees.
- Zero-length arm is invalid.
- Presentation uses two reference arms and an angle arc/label.

### 4.6 Plan Area / Perimeter

- Confirm a point sequence.
- Preview the next point with a rubberband.
- Minimum valid polygon: three distinct non-collinear XY points.
- Enter/Finish closes the polygon exactly once.
- No double-click completion.
- Simple concave polygons are valid.
- Self-intersection, non-adjacent touch, duplicate point, zero edge and zero area are invalid.
- Calculation uses domain Plan XY.
- Original point Z values remain part of operand evidence.

Presentation-plane semantics from the previous contract remain:

- Geometry source: capture first confirmed A world Z.
- Level Plane source: capture the active Level FFL at operation start.
- Navigation and later Level-context changes do not move the captured presentation plane.
- Reset is the only recapture path.

## 5. Point sources

### 5.1 Geometry

A Geometry point is the actual world hit on the nearest eligible visible Machine/Civil rendered surface.

Excluded:

- hidden entities/layers;
- labels;
- selection boxes;
- collision/clearance envelopes;
- grid;
- HUD;
- annotation leaders;
- measurement graphics;
- helper/proxy meshes.

A geometry miss does not become a Ground, camera-target or Level point.

### 5.2 Level Plane

An explicit Level Plane source intersects the canonical active-Level FFL plane.

The captured Level identity/elevation remains fixed for the operation.

Geometry does not intercept an explicitly selected Level Plane source.

## 6. Reference anchors

### 6.1 Anchor principle

A professional persistent dimension must reference meaningful engineering points, not arbitrary render tessellation.

For Machine/Civil entities, the initial semantic anchor vocabulary is:

- Front Left Bottom;
- Front Right Bottom;
- Back Left Bottom;
- Back Right Bottom;
- Footprint Center;
- Front Edge Midpoint;
- Back Edge Midpoint;
- Left Edge Midpoint;
- Right Edge Midpoint;
- Top/Bottom Face Center where canonical dimensions support it;
- Actual Geometry Hit as a free point.

The anchor point is derived from the canonical entity transform and dimensions. It is not derived from a GLB render bounding box.

### 6.2 Magnetic inference

When Measure is picking an entity anchor:

- relevant candidates become available on hover;
- the nearest candidate is highlighted;
- the cursor/visual state identifies the candidate kind;
- a deliberate modifier may lock the highlighted candidate before confirmation;
- candidate cycling is deterministic if multiple candidates occupy the same screen region.

The implementation must not create a hidden tolerance that changes the engineering meaning of the chosen anchor.

### 6.3 Entity Pair Reference

Entity Pair Reference continues to start from exactly two eligible Machine/Civil Runtime Selection entries.

However, V2 adds explicit editable A/B anchor references.

The user can change:

- A entity anchor;
- B entity anchor.

The measurement value recomputes immediately after a valid reference change.

The result remains labelled **Reference Point** / **Reference Distance** and is never presented as minimum clearance, collision distance or shortest GLB distance.

## 7. Reference Dimension

### 7.1 Creation

A completed Measure result remains transient until the user chooses **Keep / Save**.

Keep / Save creates one Annotation entity of dimension/reference type.

Creation is a normal command transaction and is therefore Undoable.

Transient point confirmations are not history entries.

### 7.2 Persistence

A Reference Dimension:

- is serialized with the project;
- survives save/reload;
- has a stable identity;
- has a user-visible name;
- has visibility state;
- has reference state;
- has style data or a style reference;
- does not mutate the measured geometry.

### 7.3 Endpoint reference types

Each dimension endpoint uses one of:

**EntityAnchorRef**
- entity ID;
- semantic anchor kind;
- canonical local parameters;
- resolved world position derived from current entity state.

**WorldPointRef**
- exact domain-mm world point;
- explicitly non-associative.

**LevelPointRef**
- Level ID;
- Plan X/Y;
- canonical Level FFL relationship.

Rounded display values are never persisted as calculation input.

### 7.4 Associativity

EntityAnchorRef dimensions are associative.

When the referenced entity:

- moves;
- rotates;
- changes canonical dimensions;

the dimension re-resolves its reference point and recalculates its displayed value.

The dimension does not move the entity.

### 7.5 Orphan state

If an associated entity is deleted or the reference cannot be resolved:

- the dimension becomes **Orphaned**;
- the saved item remains in the Measure list;
- the UI clearly identifies the broken reference;
- the last valid resolved presentation may be retained for review, but it is never used as a silently frozen engineering reference;
- the user may delete or reassociate it.

There is no silent fallback from associative reference to world point.

## 8. Editing Reference Dimensions

Selecting a saved dimension activates its edit affordances.

### 8.1 Text/presentation edit

Dragging dimension text changes only presentation placement.

It does not change the measured endpoints.

If text is moved far enough from its normal position, a leader may be displayed according to the dimension style.

### 8.2 Reference edit

Dragging an endpoint/reference grip enters reference-edit mode.

The user can select a new semantic anchor.

The dimension value and graphics recompute from the new references.

Reference replacement is Undoable.

### 8.3 Delete

Delete removes the Reference Dimension entity through the canonical command/history authority.

Hide never deletes.

## 9. Professional dimension graphics

### 9.1 Linear

A linear/reference distance uses:

- reference endpoint markers when selected/editing;
- extension/witness lines;
- dimension line;
- arrowheads or tick marks;
- centered value;
- optional XYZ/Plan secondary values in the panel.

### 9.2 Angular

An angular reference uses:

- A/B/C reference markers when selected/editing;
- two reference arms;
- angle arc;
- angle value.

### 9.3 Plan Area

A saved area uses:

- projected polygon boundary;
- optional closing line;
- area label;
- perimeter label;
- captured source/elevation metadata in the panel.

### 9.4 Fit behavior

Dimension graphics must remain legible when the projected distance is short.

Fit is based on actual rendered text/arrow extents, not a fixed world-distance threshold:

1. use normal inside placement when the available span is sufficient;
2. move arrow/tick treatment outside when required;
3. move text outside with a leader when required;
4. never overlap the value with itself or silently clip it.

The exact visual constants belong to the Dimension Style, not to measurement calculation.

## 10. Occlusion and render mode

### 10.1 Default: Depth

Reference Dimensions are rendered as real 3D scene graphics by default.

They participate in depth/occlusion with scene geometry.

A dimension can therefore be partially or fully occluded by a machine/civil object.

This is intentional.

### 10.2 Optional: Overlay

The Measure panel exposes an explicit Overlay display mode.

Overlay places the dimension graphic above scene geometry.

Overlay is:

- opt-in;
- visible in the panel/list state;
- never enabled as a hidden fallback;
- never triggered by camera angle.

No special renderer may silently switch from Depth to Overlay to keep a label visible.

## 11. Dimension Style

The project has one canonical Measure Dimension Style for V2.

The style controls:

- Font Family;
- Text Size Mode: Adaptive / Fixed;
- Adaptive Min Text Size (CSS px);
- Adaptive Max Text Size (CSS px);
- line weight;
- arrow/tick style;
- arrow/tick size;
- text offset;
- text background/halo;
- text placement/fit;
- numeric precision;
- unit presentation;
- dimension/leader visibility.

### 11.1 Adaptive sizing rule

Adaptive mode keeps the annotation within the configured screen-space bounds while the camera zoom changes.

The rule is deterministic:

`renderedTextPx = clamp(zoomDerivedTextPx, minTextPx, maxTextPx)`

The measurement value never changes because of annotation scaling.

### 11.2 6 px decision

**6 CSS px is not frozen as the professional maximum.**

No benchmark establishes 6 px as an engineering-dimension target. Mature tools instead expose configurable/annotative dimension sizing. Therefore V2 freezes the adaptive bounded-sizing model and the style controls, while the initial default values are subject to the dedicated visual acceptance of the new dimension renderer.

The implementation may not hard-code a hidden 6 px cap.

## 12. Visibility and management

The Measure panel provides:

- Show All Reference Dimensions;
- Hide All Reference Dimensions;
- per-item visibility;
- saved dimension list;
- rename;
- delete;
- select/focus;
- status: Healthy / Orphaned;
- type: Distance / Angle / Area / Entity Dimension / Pair Reference;
- source/reference summary.

Visibility is presentation state and does not delete the Annotation entity.

A visible persistent dimension is eligible for normal project presentation/capture unless an explicit export surface excludes annotations.

Transient Measure graphics are never captured as persistent project geometry.

## 13. Camera and viewport invariants

Opening, closing, collapsing or resizing the Measure panel must not:

- change camera target;
- fit/zoom the scene;
- change Runtime Selection;
- move entities;
- change entity dimensions;
- alter drag mathematics;
- alter measurement values.

Orbit/Pan/Zoom reproject measurement graphics without mutating confirmed world references.

A panel resize is a shell/layout event, not an engineering operation.

## 14. Selection invariants

- Runtime Selection remains the single normal entity-selection authority.
- Measure operands are separate.
- Selecting a measurement for editing does not replace Runtime Selection with its endpoint entities.
- If a user explicitly asks to focus an endpoint entity, the existing Selection Manager command is used.
- Explorer and Inspector continue to report Runtime Selection, not Measure's internal operand state.

## 15. History and dirty state

Transient Measure Session actions:

- do not dirty the project;
- do not create Undo entries;
- do not create persistent entities.

Persistent Reference Dimension actions:

- Create;
- Rename;
- Edit Reference;
- Edit Style override where supported;
- Move Text/Leader;
- Hide/Show if defined as persistent presentation state;
- Delete;

must use the canonical command/history authority where the underlying state is project-persistent.

## 16. Export / capture

- Transient Measure Session graphics are excluded from clean commercial capture.
- Saved Reference Dimensions are project annotations and are included when visible on an export surface that includes annotations.
- Export behavior must be deterministic and documented; no capture-specific re-rendering may change engineering values or reference anchors.

## 17. Forbidden behavior

The following are blockers:

- Measure implemented only in Inspector;
- bottom-dock-only tool surface when the registered Measure panel is required;
- every transient measurement automatically persisted;
- raw GLB tessellation used as the primary semantic anchor authority;
- hidden always-on-top renderer;
- camera-angle-specific measurement fallback;
- measurement values reconstructed from rounded text;
- persistent dimension silently losing associativity and becoming static;
- editing a reference dimension mutating Machine/Civil geometry;
- Measure picking mutating Runtime Selection;
- a second selection/entity/coordinate authority;
- panel resize changing camera/selection/scene state;
- dead Measure toolbar commands;
- console suppression or warning filtering.

## 18. Acceptance families

### M20 - Surface
- Measure opens in the right Measure tab.
- Inspector remains context-only.
- Viewport remains the primary workspace.
- All canonical entry routes reach the same Measure authority.

### M21 - Session
- Pick/Navigate;
- live preview;
- A/B/C confirmation;
- Restart;
- Finish;
- Esc;
- pointercancel/capture-loss/focus-loss behavior.

### M22 - Professional graphics
- extension/witness lines;
- dimension line;
- arrow/tick;
- readable value;
- angle arc;
- area label;
- active endpoint markers;
- no clipping/overflow.

### M23 - Style
- font actually changes;
- Adaptive/Fixed mode works;
- configured min/max bounds are respected under zoom;
- line weight changes;
- arrow/tick style changes;
- text background/halo changes;
- precision changes without changing underlying value.

### M24 - Anchors
- corners;
- edge midpoints;
- center;
- hover feedback;
- candidate lock;
- deterministic candidate choice;
- no raw-mesh-only anchors.

### M25 - Reference editing
- A/B anchor can be changed;
- dimension recomputes;
- text movement changes presentation only;
- editing is Undoable.

### M26 - Persistence
- Keep/Save;
- save/reload;
- list;
- rename;
- per-item visibility;
- global visibility;
- delete.

### M27 - Associativity
- entity transform updates dimension;
- canonical dimension change updates dimension;
- entity deletion creates Orphaned state;
- reassociation repairs it;
- no silent fallback.

### M28 - Occlusion
- Depth is default;
- geometry can occlude dimension graphics;
- explicit Overlay works;
- no hidden overlay fallback.

### M29 - Selection/history
- Runtime Selection remains unchanged during measurement;
- transient actions do not dirty/undo;
- persistent annotation changes use command/history authority.

### M30 - Viewport/export
- panel resize/collapse preserves scene/camera/selection;
- hard reload preserves saved dimensions;
- transient graphics are absent from clean capture;
- visible saved annotations obey capture policy;
- no red console.

## 19. Stage B boundary

Stage B is authorized only after this V2 contract and the V2 benchmark review are accepted as the frozen source of truth.

Stage B must include the corresponding:

- Command Registry route;
- Panel Registry route;
- Feature Access Matrix update;
- Annotation persistence/schema integration;
- Dimension graphics renderer;
- semantic anchor/inference service;
- Measure session authority;
- tests and evidence.

No C04/C05/C07/C09 work may be folded into the implementation.

No runtime implementation from the rejected #126 product state is accepted merely because it is already green.
