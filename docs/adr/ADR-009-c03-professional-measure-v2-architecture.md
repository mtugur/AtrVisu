# ADR-009: C03 Professional Measure V2 Architecture

- Status: Proposed for governance review
- Date: 2026-10-08
- Scope: Phase 1 / C03 Professional Measure Tool
- Supersedes for implementation: ADR-008 where this ADR explicitly changes the Measure product model
- Runtime implementation: none in this ADR package

## Context

C03 Stage B PR #126 implemented a technically verified transient Measure tool. Product acceptance found that the interaction model was not yet at the professional engineering-workbench level.

The observed gap is architectural rather than cosmetic:

- the Measure control is a transient viewport widget instead of a dedicated task/workspace surface;
- confirmed measurements have no professional persistent reference-dimension layer;
- reference points cannot be edited through semantic anchors;
- dimension graphics do not provide a mature dimension-style system;
- measurement graphics require an explicit depth/overlay policy;
- there is no associative/orphan model for persistent references.

The benchmark review was therefore performed before authorizing any runtime correction.

## Decision

AtrVisu C03 V2 uses a two-layer measurement architecture:

### 1. Measure Session

Transient viewport-owned state:

- measurement kind;
- point source;
- Pick/Navigate;
- preview;
- confirmed operands;
- calculated result;
- active graphics.

It does not persist, dirty the project or create history entries.

### 2. Reference Dimension

Persistent Annotation entity:

- created explicitly by Keep/Save;
- visible in a dedicated Measure panel list;
- has a name and visibility state;
- has semantic references;
- has a dimension style;
- supports text/leader placement;
- supports reference reassociation;
- can become Orphaned without being silently converted to a stale point;
- survives project save/reload.

## Why this decision

### Dedicated task pane

Visual Components places Measure settings in a Measure task pane; Navisworks exposes a dockable Measure Tools window; SOLIDWORKS/eDrawings exposes a Measure pane. This establishes that measurement controls belong to a dedicated tool surface rather than the normal Properties Inspector.

AtrVisu therefore uses a right-dock Measure tab, while keeping the Inspector context-only.

### Transient vs persistent distinction

SOLIDWORKS/eDrawings separates transient Measure results from saved Dimensions. Revit distinguishes temporary and permanent dimensions. Navisworks supports both saved measurement data and conversion to persistent markups.

AtrVisu therefore does not automatically persist every measurement. Persistence is an explicit Keep/Save action.

### Semantic anchors

AutoCAD 3D object snaps and Onshape inference points expose meaningful engineering references such as vertices, edge midpoints, centers and nearest meaningful locations. Onshape also provides a hover-highlighted nearest inference and a deliberate lock.

AtrVisu adopts semantic anchors but derives them from canonical Machine/Civil dimensions and transforms, not arbitrary GLB tessellation.

### Associativity

AutoCAD associative dimensions update when referenced geometry changes and expose reassociation when a reference is lost. Revit allows permanent dimension references/witness lines to be changed.

AtrVisu therefore stores entity ID + semantic anchor definition for persistent references and explicitly models an Orphaned state.

### Dimension graphics and style

Navisworks, Revit and SOLIDWORKS document dimension lines, extension/witness lines, arrows/ticks, labels, text positioning and configurable style properties.

AtrVisu therefore replaces hard-coded canvas labels with a Dimension Style and a professional dimension graphics layer.

### Occlusion

Navisworks explicitly supports both depth-aware 3D measurement lines and 2D overlay lines.

AtrVisu adopts depth-aware 3D as the default and makes Overlay an explicit user choice. There is no hidden always-on-top fallback.

## Alternatives rejected

### A. Continue tuning PR #126

Rejected because the user-facing model is incomplete. More CSS/position/label tuning would be implementation-first iteration against an unfrozen interaction model.

### B. Make every measurement persistent automatically

Rejected because mature products commonly separate transient measurement from intentionally saved documentation/markup. Automatic persistence would create clutter and change the mental model without benchmark support.

### C. Store only world-space coordinates

Rejected because persistent entity measurements would become stale after entity movement or dimension changes. It also prevents meaningful reassociation.

### D. Use GLB mesh vertices as the professional anchor system

Rejected because render tessellation is an implementation representation, not a stable engineering reference vocabulary.

### E. Always render measurement graphics above geometry

Rejected because mature 3D engineering software provides depth-aware measurement graphics and an explicit overlay alternative.

### F. Freeze a 6 CSS-pixel text cap

Rejected as a benchmark claim. Sources support configurable/annotative sizing, not a 6 px engineering standard.

## Consequences

### Positive

- Measure becomes a reusable professional workspace rather than a one-off widget.
- Persistent dimensions become part of the product's existing Annotation model.
- Entity movement can update saved dimensions correctly.
- Reference points become editable and discoverable.
- Graphics can become consistent across distance/angle/area/entity dimensions.
- The scene remains primary while the right dock provides control and management.
- Occlusion is treated as a rendering policy rather than a hidden interaction workaround.

### Negative / cost

- V2 is materially larger than the rejected PR #126.
- It requires a persistent Annotation representation for dimensions.
- It requires semantic anchor generation.
- It requires a real dimension graphics renderer.
- It requires orphan/reassociation lifecycle.
- It requires panel/command/feature-access integration.
- Acceptance must cover persistence, reload, entity mutation, reference repair and visual graphics.

These are intentional costs of reaching a professional engineering-workbench mental model.

## Scope boundary

This ADR does not authorize:

- collision/clearance calculation;
- CAD/PMI/GD&T;
- arbitrary mesh topology recognition;
- dimension-driven geometry editing;
- C04 Advanced Alignment redesign;
- C05 mixed-property editing;
- C07 Inspector redesign;
- C09 Simulation Controls rename.

## Governance

Stage B runtime implementation may begin only after:

1. the benchmark review is accepted;
2. this ADR and the V2 contract are frozen;
3. acceptance/adversarial scenarios are frozen;
4. the implementation package remains C03-only.

Automation Green will not imply Product Accepted.

## Post-stop-rule governance amendment - T03/T04/T05

Date: 2026-10-15. Scope: Stage A only; no runtime implementation.
Provenance: PR #130 manual review `6188819499` and independent stop-rule review
`6189493355`, followed by explicit Product Owner approval of the bounded
decisions below. The earlier absent top-corner vocabulary is not retrospectively
classified as a literal enumeration bug; the vocabulary is now deliberately
extended before any further implementation.

### Decisions

1. Four top corners are stable associative EntityAnchorRefs. V2 contract section
   6.1 specifies their IDs and illustrative offsets. Each top corner derives
   from the matching existing bottom semantic corner resolved through
   getFootprintCornersFromReferenceMm/coordinateReference: identical XY and
   bottom Z + heightMm, including non-origin placement and nonzero rotation.
   Preserve the front-left-bottom-v1 convention; no second transform or footprint
   re-centering. Canonical bottom plus height and the existing Plan mapping
   remain the only geometry authority. Existing
   reference identities, editing, full-precision serialization and orphan repair
   remain unchanged. No top-edge family or schema migration is authorized here.
2. Normal discovery/render/highlight/cycling shares a visible eligible set.
   Occluded or chrome-covered candidates are not discovered. Visible silhouette
   corners remain accessible without requiring an exact interior surface hit.
3. Explicit lock preserves identity through invisibility. The panel exposes the
   locked reference and reason; ordinary viewport clicks cannot silently confirm
   it. Explicit Confirm Locked Anchor is the deliberate path through the existing
   Measure authority. It is enabled exactly for a resolved entity and eligible
   finite semantic reference, irrespective of offscreen/chrome/scene occlusion;
   it is disabled only for unresolved/ineligible references. Only activation of
   the named panel control invokes it, never viewport clicks/generic completion.
   Visibility reason comes from read-only projection, shell coverage and scene
   occlusion observations, in that order if multiple apply; use Not currently
   visible when a precise category is unavailable, not a guessed cause or a new
   selection authority. This corrects the earlier review
   proposal that ordinary clicks could confirm invisible locks; that proposal is
   not the approved contract. No through-geometry marker or world-point fallback.
4. Measure viewport graphics remain below application chrome in both Depth and
   Overlay. Repair ownership/compositing at the shell boundary, not camera math
   or a global stacking escalation. Overlay remains opt-in over scene geometry.
5. The shared right-dock header owns tabs/actions and may use two controlled rows
   with accommodating height. Auto/Pinned/persistence, accessible controls and
   click targets remain intact; no tab removal or responsive-shell redesign.

### Benchmark rationale and risk

The existing V2 benchmark records ONSHAPE-INFER-01 and NW-SNAP-01 support
corner/center inference and deliberate reference choice; ACAD-ASSOC-01/02 support
associative update and repair. VC-LAYOUT-01/NW-MEASURE-01 support a separate dock;
NW-MODES-01 distinguishes scene Depth/Overlay. The exact four IDs, invisible-lock
confirmation safeguard, chrome isolation and two-row web layout are AtrVisu
product decisions, not claims that those vendors implement identical controls.
See the benchmark review's post-stop-rule traceability section.

The primary risks are accidentally confirming an invisible reference, revealing
hidden geometry, breaking old reference identities, and allowing dock layout to
mutate camera/domain state. The acceptance matrix explicitly tests these risks
and preserves T01/T02/T06. Tuning camera tolerances, raw GLB vertex identity,
hidden fallback, duplicate stores and unrelated C04/C05/C07/C09 work are rejected.

### Delivery gate

The implementation stop remains in force. Submit this governance-only package
for independent review; do not continue patching PR #130 under this amendment.
Only after the accepted contract is synchronized and a Stage B package is
explicitly authorized may a new bounded implementation branch be created from
an approved exact baseline. Preserve PR #129/#130 and their histories. Runtime
Contract Verified remains pending re-review and Product Accepted remains FAIL
for the reported PR #130 state. Stage A CI validates repository compatibility,
not the future T03/T04/T05 runtime oracles.

Independent Stage A review `6191963586` requested these coordinate-mapping and
explicit-confirmation clarifications. They preserve the original canonical
placement authority and approved product decisions; no runtime change or new
coordinate model is authorized. Delta runtime reproduction remains NOT EXECUTED.
