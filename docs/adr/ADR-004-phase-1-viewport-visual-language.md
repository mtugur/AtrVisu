# ADR-004 - Phase 1 Viewport Visual Engineering Language

## Status

Accepted as the PF-3B Stage A pre-implementation decision. Runtime conformance remains unimplemented and unaccepted.

## Context

AtrVisu has stable project, selection, camera, Level, physical Civil depth and theme authorities, but its viewport presentation still reflects an early Babylon setup: a cyan/green emissive grid, one box mesh per grid line, a dark cast and a single ambient light. PF-3A deliberately left grid, workplane, lighting, materials and selection visual language to PF-3B.

The benchmark evidence is `docs/benchmarks/PF3B_VIEWPORT_VISUAL_LANGUAGE_EVIDENCE.md`. Official Visual Components, Autodesk Factory and SOLIDWORKS sources consistently separate engineering layout content from floor/grid, background, lighting/rendering and selection concerns. They do not dictate AtrVisu's exact values.

ADR-005 already separates UI theme from stable technical engineering meanings. ADR-003 makes Floor Area physical Civil slab geometry. ADR-001 freezes Phase-1 Plan body drag and its invisible picked-elevation interaction plane.

## Decision

### Neutral engineering canvas

AtrVisu adopts the exact dark/light viewport palettes in `ATRVISU_VIEWPORT_VISUAL_STANDARD.md`. Both are neutral, low-saturation engineering canvases. No skybox, HDRI or cinematic rendering enters the Phase-1 baseline.

### Theme-aware and theme-stable split

Background, visual workplane, minor grid and major grid are theme-aware presentation resources owned below the ADR-005 theme boundary. One read-only resolver derives `EffectiveThemeId = "light" | "dark"`: explicit themes resolve to themselves and `system` resolves from current `prefers-color-scheme`. UI presentation and the typed Babylon palette consume this same resolved value; Babylon does not read arbitrary CSS literals. Only `ThemeId` persists. Effective theme changes cannot mutate project, camera, fit, history, dirty state, entities, transforms or selection and cannot remount EditorHost/Babylon/canvas.

### Grid architecture

The grid is world-aligned and metric: minor lines are phase-anchored to world origin at integer 1000 mm multiples and major lines are the subset at integer 5000 mm multiples. Extent/center changes never slide that phase. Its deterministic extent is derived only from rotation-applied Machine and Civil world-space Plan AABBs: 5000 mm margin per side, minimum 40000 x 40000 mm, rounded outward to 5000 mm boundaries. Raw unrotated width/depth bounds are invalid. Empty layouts use the centered minimum at world origin. Camera and viewport pixels do not participate.

Grid rendering must use a bounded primitive count independent of extent. The current box-mesh-per-line architecture is rejected for PF-3B implementation.

### Workplane versus Floor Area

The global workplane is a non-pickable visual context surface. It is not a Level, Civil item, persisted entity, collision surface, physical slab or movement authority. ADR-001's invisible pickable drag plane remains separate. ADR-003 Floor Area remains physical Civil world geometry and normal depth authority.

### Selection is not warning

Selection is a dedicated frame/outline/silhouette layer. Primary and secondary selection remain distinct from one another and from collision/warning. The treatment applies consistently to placeholder, GLB and Civil geometry, respects physical occlusion and does not recolor entities yellow/brown or make them always-on-top.

### Lighting and materials

The baseline uses deterministic neutral key/fill/ambient lighting at relative intensity ratios 1.00/0.45/0.35. GLB authored materials remain authoritative; placeholder identity treatment remains restrained; physical Civil preserves user color/opacity; planning/reference Civil remains subordinate. Expensive shadows, per-entity lights and post-processing are rejected.

### Acceptance and performance

The ten-capture matrix in the visual standard is mandatory for Stage B. Grid primitive count, theme switching and presentation changes must preserve scene/canvas lifecycle and avoid per-frame React publication. Existing commercial capture and display authorities are preserved.

## Consequences

- PF-3B implementation has exact palettes, hierarchy, grid geometry rules and evidence IDs before code changes.
- Dark/light theme changes can update the viewport without becoming domain state.
- Floor Area, global workplane and drag plane cannot be conflated.
- Existing PF-3A interaction, P1-BLD2 Level/FFL and rendering-depth contracts remain unchanged.
- The approximately 20 m ADR-001 Plan-drag limitation remains accepted and outside PF-3B.
- Stage A does not prove runtime conformance or product acceptance.

## Alternatives Considered

- **Keep the current cyan/green emissive grid:** rejected because it dominates entity state and creates a saturated cast.
- **Use an HDRI/skybox or cinematic lighting:** rejected because it adds visual noise, unstable reflections and avoidable performance cost to an engineering layout surface.
- **Scale grid spacing from camera zoom:** rejected because camera state would alter engineering scale cues and evidence reproducibility.
- **Generate one mesh per line:** rejected because draw/mesh count grows with extent.
- **Place the visual workplane at Active Level:** rejected because it introduces story/workplane semantics outside PF-3B.
- **Use Floor Area as the global grid surface:** rejected because Floor Area is persisted physical Civil geometry.
- **Use selection material recoloring or always-on-top geometry:** rejected because selection would obscure authored identity and physical depth.
- **Repair high-elevation Plan drag in this package:** rejected because ADR-001 explicitly freezes that limitation.

## Tests / Validation

Stage A validation is documentation/governance only: official-source traceability, authority consistency, required-file checks and repository governance checks. Runtime unit, Chromium and visual artifact validation belong to Stage B and must implement the exact acceptance matrix without weakening existing tests.
