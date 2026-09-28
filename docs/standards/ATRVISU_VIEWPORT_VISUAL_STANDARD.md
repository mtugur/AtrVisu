# AtrVisu Viewport Visual Standard v1.0

Status: Normative PF-3B Stage A contract; no runtime implementation is certified by this document.

Authority: Product Constitution, ADR-005 theme boundary, ADR-003 physical Floor Area depth, Interaction Standard and `docs/benchmarks/PF3B_VIEWPORT_VISUAL_LANGUAGE_EVIDENCE.md`.

## 1. Purpose

The viewport is a neutral engineering canvas. It must make layout scale, physical geometry, state, selection and annotation legible without looking cinematic, decorative or game-like. Presentation may respond to UI theme; engineering meaning must remain stable.

## 2. Frozen Visual Hierarchy

Back to front, the canonical hierarchy is:

1. neutral background;
2. subdued global workplane and minor/major grid;
3. Build and other physical environment geometry;
4. Machines;
5. status overlays, including collision and clearance;
6. selection;
7. labels, annotations and temporary editor overlays.

Normal depth remains authoritative within physical world geometry. The hierarchy does not authorize always-on-top physical meshes or depth-disabled selection that falsely describes occlusion.

## 3. Viewport Palette Contract

Runtime implementation must expose one immutable, detached typed concept equivalent to:

```ts
interface ViewportVisualPalette {
  readonly background: string;
  readonly workplaneFill: string;
  readonly gridMinor: string;
  readonly gridMajor: string;
  readonly neutralLight: string;
}
```

The values below are sRGB hex values. Babylon conversion is adapter work and must return independent color instances.

| Role | Dark viewport | Light viewport |
| --- | --- | --- |
| Background | `#202326` | `#E7EAEC` |
| Workplane fill | `#2B2F33` | `#D9DEE1` |
| Minor grid | `#454C52` | `#BBC2C7` |
| Major grid | `#707981` | `#858F97` |
| Neutral light chroma | `#F4F5F6` | `#FFFFFF` |

Rules:

- Colors are neutral and low-saturation. Cyan/green cast, beige/brown wash, blue-black voids and saturated grid colors are forbidden.
- No skybox, HDRI, environment image, decorative gradient or horizon effect is part of the Phase-1 viewport.
- Dark/light UI themes select the corresponding viewport presentation palette through the ADR-005 theme boundary.
- `system` resolves to the effective dark or light palette without creating a project preference or a second theme authority.
- Theme switching updates presentation resources only. It must not mutate project data, camera pose/projection/fit, history, dirty state, entities, transforms, selection, collision state or editor lifecycle.
- Warning, collision, clearance, primary selection, secondary selection, labels and annotation colors are theme-stable engineering semantics and are not derived from generic theme accent colors.

## 4. Grid and Global Workplane

### 4.1 Metric cadence

- Minor spacing: exactly `1000 mm`.
- Major cadence: exactly every `5` minor intervals, therefore `5000 mm`.
- Grid is world-aligned to canonical Plan X/Y and remains independent of camera orientation.
- Grid and global workplane are non-pickable, non-collidable and excluded from Platform Entity, selection, history, persistence, export and Plan Move authorities.
- Grid visibility may remain a presentation preference, but changing it is not a project mutation.

### 4.2 Deterministic auto-size

The displayed workplane extent derives from finite current Machine and Civil plan AABBs in canonical millimetres:

1. Union all current Machine and Civil plan bounds. Labels, selection/status overlays, annotations, camera, grid and temporary editor affordances do not contribute.
2. Expand each side by exactly `5000 mm`.
3. Enforce a minimum `40000 mm` width and `40000 mm` depth, centered on the content union. An empty layout uses this centered minimum at world origin.
4. Round each resulting minimum outward and maximum outward to the nearest `5000 mm` boundary.
5. Recompute only from domain bounds. Camera zoom, orbit, projection, fit-view, viewport pixel dimensions and theme changes cannot affect extent.

There is no extent hysteresis or camera-dependent density change in PF-3B. Implementation must use a bounded primitive count independent of world extent, such as one workplane/grid surface plus a bounded axis/edge set. Creating one box/mesh per grid line is forbidden.

### 4.3 Workplane versus Floor Area

- The global workplane is visual context only. It is not a Civil item, Level, persisted geometry or physical floor.
- The invisible pickable horizontal plane used by ADR-001 Plan Move is a separate interaction resource and must remain invisible.
- `floor-area` is physical Civil slab/world geometry governed by ADR-003. It participates in normal world depth with Machine, Wall, Column and Beam.
- The global workplane must not occlude physical geometry from above or below and must not change Floor Area depth/blending.
- The workplane is not moved to Active Level in PF-3B. Active-Level grids, story clipping, level isolation and datum-specific workplanes are explicitly out of scope.

## 5. Lighting Hierarchy

The baseline is deterministic neutral engineering lighting:

1. neutral key: directional, upper-front-right relative to world, intensity ratio `1.00`;
2. neutral fill: broad opposite-side fill, intensity ratio `0.45`;
3. neutral ambient/hemispheric contribution, intensity ratio `0.35`.

The ratios are relative presentation contracts, not a license to change geometry or material data. Lighting must preserve legible faces and silhouette in both themes without colored cast. Camera-attached headlight, cinematic rim lights, animated lights, ray tracing, HDRI, expensive dynamic shadows, bloom and depth-of-field are not part of the PF-3B baseline.

## 6. Material Hierarchy

1. Loaded GLB/native assets preserve authored materials unless a documented status overlay temporarily composes above them.
2. Placeholder Machines use restrained identity color, restrained specular response and no self-illuminated/emissive appearance; they do not acquire warning or selection color as their base material.
3. Physical Civil geometry preserves user-authored color and opacity and participates in normal world depth. Its defaults remain restrained industrial reference colors.
4. Planning/reference Civil geometry remains visually subordinate through its existing transparency/depth policy.
5. Background, workplane and grid never overwrite entity material authority.
6. Theme switching cannot mutate persisted color/opacity or authored GLB material data.

## 7. Selection Hierarchy

- Selection is an overlay/frame/silhouette treatment, not entity recoloring.
- Primary selection uses the strongest continuous selection frame/outline and the existing primary-selection ordering authority.
- Secondary selection uses a visibly lighter/thinner frame or segmented outline; it cannot be mistaken for the primary frame.
- Collision without selection uses only the canonical collision envelope/status grammar and never the selection frame.
- Selected plus collision renders both independent treatments concurrently: selection remains readable at the entity silhouette while the collision envelope/status remains readable outside it.
- The same semantics cover placeholder Machines, imported GLB Machines and Civil geometry.
- A selected entity in collision must show both facts simultaneously; neither may masquerade as the other.
- Yellow/brown whole-object recoloring, warning-color selection and always-on-top selected geometry are forbidden.
- Selection respects normal occlusion. Visible outline segments may be emphasized, but the treatment cannot falsify physical depth.

The exact final selection colors and stroke geometry remain implementation-level values only if they preserve existing theme-stable technical meanings and pass the acceptance matrix. Stage A does not authorize a palette rewrite outside viewport presentation.

## 8. Labels and Overlays

- Labels, annotations and temporary editor overlays remain readable against both palettes and visually subordinate to selected/physical geometry.
- Collision/clearance, connection-point and diagnostic overlays retain their current domain authorities.
- PF-3B does not redesign annotation content, leader rules, metadata boxes or editor workflows.
- Temporary overlays must not become persisted geometry or affect capture data unless the existing display-state contract includes them.

## 9. Commercial Capture

Existing PNG/commercial capture authority is preserved. A normal engineering capture uses the active viewport theme/presentation. A presentation-clean capture hides editor-only selection frames and temporary editor affordances through existing display authorities; grid/labels follow the existing requested display state. No selection frame leaks into a clean capture unless the existing output request explicitly includes it. Capture cannot alter camera, entities, transforms or material data. No new capture schema or image persistence is introduced.

## 10. Performance and Lifecycle

- Grid primitive count is bounded independently of extent.
- Theme and grid presentation updates reuse the existing Babylon scene and canvas; no EditorHost, engine, scene or canvas remount is allowed.
- No per-frame React state publication is introduced for static visual context.
- No per-entity dynamic light, unbounded line mesh generation, live expensive shadow map, post-processing stack or camera-driven grid rebuild is allowed.
- Large extents and theme changes must remain finite and console-clean.

## 11. Rejection List

The following fail the PF-3B contract:

- cyan/green viewport cast or saturated neon grid;
- skybox, HDRI, cinematic gradient, bloom, depth-of-field or decorative fog;
- one mesh/box per grid line or any primitive count proportional to world extent;
- camera/fit/viewport-pixel-driven grid sizing;
- grid at Active Level, story clipping or Level visibility scope;
- visual workplane used as physical floor, Civil item, Level or drag plane;
- Floor Area removed from physical depth or replaced by the workplane;
- selection represented as warning/collision or yellow/brown entity recolor;
- selected physical objects rendered always-on-top;
- theme switch mutating camera/project/history/entity/selection state;
- GLB authored materials overwritten by theme;
- dynamic cinematic lighting or expensive real-time shadows;
- attempts to solve ADR-001's accepted approximately 20 m Plan-drag limitation;
- any red console error, `Maximum update depth exceeded` or `GL_INVALID_VALUE`;
- screenshot evidence generated before runtime implementation and claimed as product acceptance.

## 12. Runtime Acceptance Matrix

Stage B implementation must produce reviewer-accessible deterministic captures with exactly these IDs:

| ID | Required state and assertion |
| --- | --- |
| `01-dark-empty-perspective` | Empty layout, dark palette, centered 40000 mm minimum grid, perspective camera. |
| `02-light-empty-perspective` | Same camera/layout with light palette; presentation changes only. |
| `03-dark-industrial-perspective` | Dark canonical industrial scene with one loaded/native Machine, one placeholder Machine, Floor Area, Wall, Column, Beam and one planning/reference Civil item. |
| `04-light-industrial-perspective` | Exact same industrial data and camera in light palette. |
| `05-dark-industrial-orthographic-plan` | Same scene in deterministic orthographic plan; grid cadence and physical hierarchy remain legible. |
| `06-primary-secondary-selection` | Primary and secondary selections are distinct across Machine/Civil representation without material recolor. |
| `07-selected-collision-distinction` | One selected colliding entity exposes selection and collision as simultaneous distinguishable states. |
| `08-floor-area-physical-depth` | Machine and Beam above opaque Floor Area remain visible from above; slab may occlude geometry behind it from below. |
| `09-theme-switch-same-camera` | Before/after theme switch proves identical camera pose/projection/target/fit, entity transforms, selection and canvas lifecycle. |
| `10-presentation-clean-capture` | Clean commercial capture using existing display authority; no project or camera mutation. |

The industrial scene and camera state must be deterministic and serialized by existing authorities. Captures must cover desktop and the existing supported narrow viewport where relevant, report no document overflow, and produce zero console errors/page errors. Stage A creates no screenshots and makes no claim that these runtime captures already pass.
