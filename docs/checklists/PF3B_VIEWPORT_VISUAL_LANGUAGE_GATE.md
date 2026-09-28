# PF-3B Viewport Visual Engineering Language Gate

Stage: A - contract, benchmark and acceptance freeze only.

| Gate | State | Evidence |
| --- | --- | --- |
| Exact base | PASS | Branch starts from main `aa248dc1d7be3ea14242668c93c3a32c9dd172a9`. |
| Official benchmark record | PASS | `docs/benchmarks/PF3B_VIEWPORT_VISUAL_LANGUAGE_EVIDENCE.md` records Visual Components, Autodesk Factory and SOLIDWORKS official sources with fact/decision separation. |
| Normative viewport standard | PASS | `docs/standards/ATRVISU_VIEWPORT_VISUAL_STANDARD.md` freezes hierarchy, palettes, grid, lighting, materials, selection, performance and acceptance. |
| Architecture decision | PASS | ADR-004 freezes the authority split and rejected alternatives before runtime implementation. |
| Runtime scope | PASS | No `src/**`, E2E, package, storage, schema or runtime visual file changes are allowed in Stage A. |
| Dark/light palette | PASS | Exact neutral sRGB values are recorded; no cyan/green cast, HDRI or skybox is accepted. |
| Grid contract | PASS | 1000 mm minor, major every five, 5000 mm content margin, 40000 mm minimum and 5000 mm outward rounding are frozen. |
| Workplane/Floor distinction | PASS | Visual workplane, ADR-001 drag plane and ADR-003 physical Floor Area are three separate authorities. |
| Lighting/material hierarchy | PASS | Neutral key/fill/ambient and authored/material ownership are frozen without cinematic rendering. |
| Selection hierarchy | PASS | Primary/secondary selection is distinct from warning/collision and respects physical depth. |
| Performance boundary | PASS | Primitive count is extent-independent; no scene/canvas remount, per-frame React publication or expensive shadow/post-process baseline. |
| Acceptance matrix | PASS | Ten exact capture IDs and deterministic industrial-scene requirements are defined below. |
| Automation Green | N/A/PENDING | Stage A has governance checks only; runtime automation belongs to Stage B. |
| Contract Verified | PENDING | Independent review must verify evidence, standard, ADR and authority consistency. |
| Product Accepted | PENDING | Product acceptance requires Stage B runtime implementation, exact-head CI and manual visual review. |

## Stage B Acceptance Matrix

| Capture ID | Required contents |
| --- | --- |
| `01-dark-empty-perspective` | Dark empty minimum workplane/grid in perspective. |
| `02-light-empty-perspective` | Light equivalent at identical camera state. |
| `03-dark-industrial-perspective` | Dark loaded/native Machine, placeholder Machine, Floor, Wall, Column, Beam and planning/reference Civil. |
| `04-light-industrial-perspective` | Identical industrial scene/camera in light theme. |
| `05-dark-industrial-orthographic-plan` | Deterministic plan view with legible major/minor hierarchy. |
| `06-primary-secondary-selection` | Distinct primary and secondary Machine/Civil selection. |
| `07-selected-collision-distinction` | Selection and collision visible as separate simultaneous facts. |
| `08-floor-area-physical-depth` | Real Machine/Beam overlap with Floor Area verifies physical top/below depth. |
| `09-theme-switch-same-camera` | Camera, fit, transforms, selection and canvas lifecycle unchanged across theme switch. |
| `10-presentation-clean-capture` | Existing display authority produces a clean commercial capture without domain mutation. |

## Mandatory Stage B Checks

- Dark and light palettes match the exact standard values.
- Grid extent follows Machine+Civil bounds and is unchanged by orbit, zoom, projection, fit or viewport resize.
- Zero/one/large extents retain bounded primitive count.
- Grid/workplane are not selectable, pickable, collidable, persisted or exported.
- Floor Area remains physical ADR-003 geometry; visual workplane never occludes it.
- GLB authored materials and Civil user color/opacity remain intact.
- Primary/secondary selection, collision and warning remain distinguishable.
- Theme switching creates no history, dirty, camera, selection, transform or lifecycle mutation.
- Existing PNG/commercial capture remains valid.
- No console error, page error, `Maximum update depth`, engine/scene/canvas remount or document overflow.

## Explicit Rejections

No runtime screenshots are accepted from Stage A. No cyan/green cast, neon grid, HDRI/skybox, camera-sized grid, Active-Level grid, per-line mesh architecture, always-on-top physical geometry, selection-as-warning, theme-driven project mutation, Level/story clipping, ADR-001 drag redesign or PF-3B-adjacent feature work is authorized.
