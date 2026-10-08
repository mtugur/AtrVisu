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
