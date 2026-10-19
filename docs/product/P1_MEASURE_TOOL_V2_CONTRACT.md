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

### 3.1.1 Shared header and application chrome boundary

The shared right-dock header owns the Inspector/Measure tabs, Inspector
Auto/Pinned indicator, pin/unpin and collapse/reopen access. When these cannot
fit on one row, it uses a controlled two-row composition: tabs and actions have
separate rows. Header height accommodates both rows. No control may overlap,
be clipped/hidden, lose its accessible name or function, or shrink its existing
click target to make the row fit. Existing responsive presentations, panel
visibility/persistence and Auto/Pinned semantics remain unchanged.

All Measure viewport graphics, including candidate dots/text and explicit
Overlay dimensions, belong below application dock/header/modal chrome.
Viewport graphics must not paint over that chrome or intercept its controls.
Shell compositing/clipping owns this boundary; camera compensation, arbitrary
global z-index escalation and blanket candidate hiding are forbidden.

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

The snapshot is taken when Measure becomes active, not when the Kind selector
later changes. Preserve its ordered entity identities and primary identity
through kind changes and Restart. Exit and re-enter to capture a different
normal selection. Results resolve those identities through the existing entity
authority; a result-row activation is transient Measure presentation, never a
Runtime Selection change.

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

Before confirming either operand, the user must be able to inspect its entity
name and canonical ID, semantic anchor name/ID (or explicitly Free Geometry
Hit / Level reference), and resolved world X/Y/Z in domain mm. Confirmed A and
the prospective B remain separately identifiable. Coordinate display precision
does not replace full-precision operands; evidence records the unrounded data.
An unlocked preview needs this information too, not only a deliberate lock.

Show **3D Distance**, **Plan Distance** and signed **Delta Z (B-A)** together
when A and B are available. A viewport distance label must identify its 3D or
Plan interpretation, rather than presenting an ambiguous bare length. Z+ is a
view direction, not a point source or flattening operation. Orbit, projection
mode, Depth/Overlay and dock changes may reproject graphics but cannot change
A/B identity, world coordinates or the numerical interpretation. A sloping line
revealed after orbit is not itself evidence of an incorrect 3D calculation.

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

### 4.7 Selected Entity Dimensions: per-entity results

This subsection explicitly supersedes the inherited exactly-one restriction in
`P1_MEASURE_TOOL_CONTRACT.md` (Selected entity dimensions / M06); it does not
change the local dimension or Entity Pair Reference formulas.

- One or more eligible Machine/Civil identities in the entry snapshot produce
  separate name-and-ID-grouped canonical local Width/Depth/Height results.
  Rotation, view direction and GLB bounds do not redefine those dimensions.
  Floor Area retains Plan Depth and Floor Thickness terminology.
- Keep entry selection ordering. The eligible primary entry is initially active;
  otherwise the first eligible entry in that ordering is active. Activating
  another named result changes only the active Measure visual group.
- Show all eligible named result groups in the panel, but only one active
  entity's transient W/D/H graphic group in the viewport. No automatic combined
  bounds, Group expansion, shortest gap or clearance interpretation.
- Missing/invalid dimensions and unsupported entries have explicit named
  reasons, not invented zeros or a silent empty list. With no eligible entry,
  explain that Machine/Civil objects must be selected before entering Measure.
  No automatic entity selection or hidden reseeding on Kind/Restart.
- Entity Pair Reference remains an explicitly chosen, exactly-two-reference
  mode (section 6.3), not a substitute for multi-entity local dimensions.
- Keep / Save explicitly saves **only the named active entity's W/D/H result**
  as one existing Annotation Reference Dimension, with its entity reference and
  canonical dimension interpretation, in one normal command/history transaction.
  Choosing another result alone saves nothing. Bulk/multi-save is out of scope;
  it cannot be inferred from the number of result rows.
- Saved dimensions re-resolve from current entity geometry, survive serialization,
  and retain existing orphan/reassociation, visibility, style and Undo/Redo
  authorities. No new dimension store, schema or selection authority is implied.

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
- Front Left Top (`front-left-top`);
- Front Right Top (`front-right-top`);
- Back Left Top (`back-left-top`);
- Back Right Top (`back-right-top`);
- Footprint Center;
- Front Edge Midpoint;
- Back Edge Midpoint;
- Left Edge Midpoint;
- Right Edge Midpoint;
- Top/Bottom Face Center where canonical dimensions support it;
- Actual Geometry Hit as a free point.

The anchor point is derived from the canonical entity transform and dimensions. It is not derived from a GLB render bounding box.

The four top corners are first-class associative semantic anchors, not free
geometry hits. The following table illustrates the pre-transform offsets used
by the existing front-left-bottom coordinateReference authority; it does not
define an independent local/world coordinate model:

| Stable anchor identity | Local Plan X | Local Plan Y | Local Z |
| --- | --- | --- | --- |
| `front-left-top` | 0 | 0 | heightMm |
| `front-right-top` | widthMm | 0 | heightMm |
| `back-left-top` | 0 | depthMm | heightMm |
| `back-right-top` | widthMm | depthMm | heightMm |

The authoritative mapping is the existing bottom semantic corner mapping in
`getSemanticAnchorPoints`, through `getFootprintCornersFromReferenceMm` in
`src/utils/coordinateReference.ts`. Preserve the established placement reference
(`front-left-bottom-v1`), rotation direction, translation and corner ordering:
front-left index 0, front-right index 1, back-right index 2, back-left index 3.
For each matching name, top.xy equals bottom.xy exactly and top.z equals
bottom.z + canonical heightMm. Derive top corners from those resolved bottom
corners, not by implementing a second transform, re-centering the footprint or
shifting the user placement reference. World Z is the canonical bottom
elevation plus heightMm; this does not change Floor Area's canonical bottom or
FFL rules. Positive finite canonical dimensions are
required. No GLB bounds, topology, support-height inference or new coordinate
authority is introduced. Existing anchor identities/coordinates stay unchanged;
top-edge midpoints and other anchor families are not added by this delta.

Top corners use the existing EntityAnchorRef model and sections 7.3-7.5 / 8.2:
persist entity ID and semantic identity, resolve against current canonical
transforms/dimensions, support reference editing and Undo/Redo, and retain
Orphaned/reassociation behavior. Never replace an unresolved top anchor with a
world point. Existing saved references remain compatible.

### 6.2 Magnetic inference

When Measure is picking an entity anchor:

- relevant candidates become available on hover;
- the nearest candidate is highlighted;
- the cursor/visual state identifies the candidate kind;
- a deliberate modifier may lock the highlighted candidate before confirmation;
- candidate cycling is deterministic if multiple candidates occupy the same screen region.

The implementation must not create a hidden tolerance that changes the engineering meaning of the chosen anchor.

### 6.2.1 Visible candidate discovery

Normal hover/highlight/cycling offers only currently visible, resolvable
candidates: finite projection in the open viewport, not covered by application
chrome and not occluded by intervening scene geometry. Hidden entities/layers
are not normal discovery sources. Visible silhouette/top corners remain
eligible; a projected visible corner must not disappear merely because its
exact marker center has no interior surface hit. Raw mesh vertices are not
promoted to semantic anchors.

Visibility applies to discovery, not anchor identity or saved engineering data.
Candidate dots and text must not show hidden back-face points through geometry.
Use the same eligible set for rendering, nearest highlight and deterministic
cycling; keep the existing visible-marker hit contract. No new camera-specific
tolerance, density workaround, fallback plane or geometry mutation is allowed.

#### Candidate continuity and target handoff

Offering a visible semantic marker promises that it is reachable, not just that
it can be drawn on one frame. Establish a transient active entity context on
eligible body hover. Retain its visibility-tested candidate pool while the
pointer moves from that body towards its offered corners, including silhouette
gaps with no raw mesh hit. Re-evaluate visibility, not semantic identity, on
render frames. A mesh miss alone must not empty that context.

For deterministic overlapping bodies, the active context owns approach inside
the screen projection of its canonical volume and its visible marker hit
regions. A different body's raw hit there does not silently steal it. An offered
visible marker hit wins over an underlying body hit. Outside that context's
projected envelope/marker regions, an eligible body hover can hand off to the
new entity; a miss clears the offered context. Pointer leave, operand
confirmation, Restart, source/kind change and Exit also release that context.
This is a presentation-only ownership rule, not a new world bounds/coordinate
authority, timed grace period, enlarged pick tolerance or hidden lock.

Rendering, nearest highlight, cycling and pointer confirmation use the same
stable `(entity ID, anchor ID)` eligible set and deterministic existing tie
ordering. If overlap makes an anchor genuinely occluded, remove its normal
marker/hit/cycle eligibility together and explain any deliberate lock through
section 6.2.2. Never retain a through-geometry/chrome hit target to rescue a
path. The existing visible-marker hit region and the **4 CSS px press-cancel**
classifier are separate contracts; neither may be tuned to mask pool loss.

### 6.2.2 Locked reference becoming invisible

A deliberately locked anchor retains its entity ID and anchor identity when
orbit, occlusion, offscreen projection or dock presentation makes it invisible.
It must not silently unlock, switch candidate, or become a world point. Do not
draw its marker through geometry or application chrome.

The Measure panel must explicitly show the locked entity, anchor name, resolved
world coordinates and current visibility/unavailability reason. Resolution and
semantic eligibility come from the existing Entity/semantic-reference authority,
not viewport visibility, Runtime Selection or a new panel-owned reference store.
The explicit confirmation action is enabled if and only if the locked entity
resolves and its semantic identity is eligible with finite resolved coordinates.
Being offscreen, covered by dock chrome or occluded by scene geometry does not
disable that action or require the user to expose the point. Deleted/unresolved
entities, unsupported anchors or invalid canonical dimensions disable it with
an explicit reason; hidden/unlocked points remain excluded from discovery.

The reason uses the same read-only current presentation observations that govern
candidate visibility: projection/viewport bounds for **Not in viewport**, actual
shell panel/chrome coverage for **Covered by chrome**, and scene-geometry
occlusion for **Scene-occluded**. These are presentation explanations, not new
reference eligibility or camera thresholds. If categories overlap, report the
first applicable one in that order. If an exact category cannot be determined,
show the truthful **Not currently visible** instead of guessing a specific
cause. Reference resolution/eligibility failures are separately labelled
unavailable, never inferred merely from these visibility categories.

When the locked anchor is invisible, ordinary viewport clicks and generic completion
keys must not confirm it. A separately named, accessible **Confirm Locked
Anchor** action allows deliberate confirmation after reviewing that reference.
Only activation of that named panel control (pointer, or keyboard while that
control is focused) invokes explicit confirmation; the viewport pointer path
and generic keyboard completion path cannot invoke it indirectly.
It uses the existing Measure command/session or reference-edit authority, not
a second selection source or direct mutation route. It confirms exactly the
displayed locked identity once; transient confirmation does not create history,
while a persistent reference replacement uses its existing Undo transaction.

An unresolved/deleted reference is not confirmable and remains explicitly
identified; there is no substitute anchor. Once the same locked anchor becomes
visible again, ordinary visible-anchor confirmation retains the existing 4 CSS
px classifier and cancellation rules. Restart/reset/exit retain their existing
lock-clearing semantics. This exception does not permit discovery of hidden
unlocked points or change Navigate/MMB/wheel behavior.

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

### 10.3 Scene overlay is not application overlay

Depth and explicit Overlay differ only in scene-geometry occlusion. Both obey
section 3.1.1's application chrome boundary, including responsive side panels
and bottom sheets. Neither mode authorizes candidate discovery through hidden
geometry; discovery and invisible-lock confirmation follow section 6.2.

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

The compositing boundary and header reflow must preserve the same camera,
canvas/scene lifecycle, canonical selection, entity transforms/dimensions,
confirmed operands, history and dirty state. Safe-area presentation does not
move engineering points or fit/zoom the scene.

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

## 20. Post-stop-rule Stage A delta (T03/T04/T05)

Decision provenance: PR #130 manual review `6188819499`, independent governance
review `6189493355`, and the Product Owner's subsequent explicit acceptance of
four top semantic corners, visible-only discovery, deliberate invisible-lock
confirmation, controlled two-row header and viewport/chrome isolation.

This is a governance-only amendment, not certification of PR #130. The detailed
future runtime oracles and preservation routes are in
`docs/checklists/P1_MEASURE_TOOL_V2_GATE.md` under Post-stop-rule acceptance.
Benchmark mapping is recorded in the existing V2 benchmark review; ADR-009
records the decisions and forbidden alternatives. Stage B remains stopped until
independent governance review and an explicitly authorized implementation
package from the approved exact baseline. PR #129/#130 remain auditable Draft
baselines; this amendment does not merge or edit them.

## 21. Renewed Stage A: complete measurement task

Decision: [PR #133 manual acceptance / stop rule 6267144838](https://github.com/mtugur/AtrVisu/pull/133#issuecomment-6267144838).
Source inspected read-only at `17763309b532813a7e004d608992073a97c08bb0`;
this documentation branch starts from main
`55e9e58d4761c765c16c834e3b0a322e5dc67bd6`, not the rejected runtime branch.
This bounded delta changes only preview clarity, candidate continuity and
per-entity multi-selection dimensions. It does not certify or patch PR #133.

### Read-only findings (source facts, not a new runtime reproduction)

- [Coordinate adapter / picking](https://github.com/mtugur/AtrVisu/blob/17763309b532813a7e004d608992073a97c08bb0/src/components/measure/measureViewportAdapter.ts#L38)
  converts Babylon `(x,y,z)` metres to domain `(x,z,y)` mm. Semantic points use
  [canonical footprint, rotation, bottom and height](https://github.com/mtugur/AtrVisu/blob/17763309b532813a7e004d608992073a97c08bb0/src/measure/measureReferences.ts#L35),
  not camera Z+. [Result dispatch](https://github.com/mtugur/AtrVisu/blob/17763309b532813a7e004d608992073a97c08bb0/src/measure/measureAuthority.ts#L128)
  sends confirmed/preview points to
  [distanceResult](https://github.com/mtugur/AtrVisu/blob/17763309b532813a7e004d608992073a97c08bb0/src/measure/measureGeometry.ts#L40):
  signed B-A XYZ, Euclidean XYZ length and XY Plan length. No camera flattening
  occurs in that calculation. The reported 8628.777 mm screenshot does not
  supply exact A/B IDs/XYZ; its numerical correctness or the actual picked
  top/bottom/free identities cannot be reconstructed from projection alone.
  The normal unlocked panel shows only source/snap kind, not the full identity
  and coordinates available for a lock
  ([MeasureTool](https://github.com/mtugur/AtrVisu/blob/17763309b532813a7e004d608992073a97c08bb0/src/components/measure/MeasureTool.tsx#L107)).
- [candidate()](https://github.com/mtugur/AtrVisu/blob/17763309b532813a7e004d608992073a97c08bb0/src/components/measure/measureViewportAdapter.ts#L66)
  clears anchors/observations/highlight before deriving entity from current
  mesh hit. A miss outside the visible 7 CSS px marker region yields no entity;
  an adjacent body hit switches entity without that fallback. Invalid/hidden
  entities, offscreen/chrome coverage and per-anchor depth occlusion also remove
  eligibility. A chosen candidate is discarded if absent from the new pool.
  Pointer leave/mode/source/kind reset clears it; frame preview repeats the
  same discovery. Thus drawing a distant corner does not guarantee a stable
  body-to-corner path. These are verified loss conditions, not a claim that
  every manual failure had an identical pointer trace. Visibility loss remains
  legitimate; loss solely from raw-hit context churn is the design gap.
- [Entry snapshot / result gate](https://github.com/mtugur/AtrVisu/blob/17763309b532813a7e004d608992073a97c08bb0/src/measure/measureAuthority.ts#L174)
  clones selection on activation; kind/Restart do not recapture it. Result
  requires exactly one selection ID and one resolved entity (lines 128-144).
  App supplies current canonical Runtime Selection/primary and entities at
  [command entry](https://github.com/mtugur/AtrVisu/blob/17763309b532813a7e004d608992073a97c08bb0/src/App.tsx#L3800).
  The inherited V1 Selected entity dimensions rule explicitly rejects multiple
  selection. The session result's unavailable reason is not rendered by the
  values-only result list, explaining misleading emptiness rather than bad W/D/H
  math. [Keep](https://github.com/mtugur/AtrVisu/blob/17763309b532813a7e004d608992073a97c08bb0/src/App.tsx#L3454)
  creates one Annotation with one entity-anchor reference for dimensions;
  [saved resolution](https://github.com/mtugur/AtrVisu/blob/17763309b532813a7e004d608992073a97c08bb0/src/measure/measureReferences.ts#L145)
  re-reads canonical dimensions. Preserve those identities, normalizer,
  serialization and annotation history cloning, not a panel-owned result store.

### Single user-journey / design card

| User task | Required observable experience | Proof in future Stage B |
| --- | --- | --- |
| Select a real 3D reference while viewing Z+ | Hover a named entity, approach an offered top corner, inspect entity/anchor ID and XYZ before clicking. A stays identified while B previews. Read separately labelled 3D Distance, Plan Distance and Delta Z. | Two different-height entities with independently known world A/B and differing 3D/Plan lengths; PNG plus full-precision operand/result JSON. |
| Reach the corner already offered | Follow a continuous face-to-corner path, including silhouette/overlap, without the visible target being replaced by a raw pick miss/adjacent body. Lock/cycle operate on the same eligible pool. | Path samples record offered IDs, active context, visibility, highlight and confirmed ID; no final-point teleport substituted for the path. |
| Check several selected objects' sizes | Select one or more Machine/Civil objects before opening Measure; choose Selected Entity Dimensions; inspect named local W/D/H groups and activate one graphic group. Use explicit Pair Reference only for reference distance. | Entry selection/primary/order recorded before activation; one/two/mixed fixtures, unavailable reasons and no Runtime Selection mutation. |
| Keep a useful reference, then review another view | Keep the named result; orbit top/plan/oblique, switch Inspector/Measure, resize, save/reload. Association and meaning stay unchanged. | A/B/reference identity and exact values before/after, one Undo per Keep, no transient history/dirty change, stable canvas/lifecycle and no console errors. |

Sections 4.4, 4.7 and 6.2.1 are the normative deltas; all other C03 authorities
remain. No C04/C05/C07/C09, camera/navigation redesign, alternate coordinate
model, clearance solver or new save schema. Existing T01/T02/T06 must still pass.
Future task acceptance and evidence are specified in the existing V2 gate.
Stage A Contract Verified is PENDING independent review; PR #133 task-level
Contract Verified is REOPENED and Product Accepted is FAIL. A green repository
gate cannot change either result. No Stage B or manual re-acceptance request
until independent governance review and explicit implementation authorization.
