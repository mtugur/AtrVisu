# PF-3B Viewport Visual Engineering Language Gate

Stage: B - runtime implementation and automated evidence delivery.

| Gate | State | Evidence |
| --- | --- | --- |
| Exact base | PASS | Runtime branch starts from main `4c569c149cef6b9558ce8f75c3bb402b69c368aa`. |
| Official benchmark record | PASS | `docs/benchmarks/PF3B_VIEWPORT_VISUAL_LANGUAGE_EVIDENCE.md` records Visual Components, Autodesk Factory and SOLIDWORKS official sources with fact/decision separation. |
| Normative viewport standard | PASS | `docs/standards/ATRVISU_VIEWPORT_VISUAL_STANDARD.md` freezes hierarchy, palettes, grid, lighting, materials, selection, performance and acceptance. |
| Architecture decision | PASS | ADR-004 freezes the authority split and rejected alternatives before runtime implementation. |
| Runtime scope | PASS | Changes are bounded to the effective-theme boundary, typed viewport palette, Babylon visual context/presentation, deterministic tests and exact-head evidence automation. Package, storage, schema, camera and movement authorities are unchanged. |
| Dark/light palette | PASS | Exact neutral sRGB values are recorded; no cyan/green cast, HDRI or skybox is accepted. |
| Effective system theme contract | PASS | One read-only `EffectiveThemeId` resolver drives UI and typed Babylon presentation; only user `ThemeId` persists. |
| Grid contract | PASS | World-origin-phased 1000 mm minor/5000 mm major lines, rotation-applied world-space Plan AABBs, 5000 mm content margin, 40000 mm minimum and 5000 mm outward rounding are frozen. |
| Workplane/Floor distinction | PASS | Visual workplane, ADR-001 drag plane and ADR-003 physical Floor Area are three separate authorities. |
| Lighting/material hierarchy | PASS | Neutral key/fill/ambient and authored/material ownership are frozen without cinematic rendering. |
| Selection hierarchy | PASS | Primary/secondary selection is distinct from warning/collision and respects physical depth. |
| Performance boundary | PASS | Primitive count is extent-independent; no scene/canvas remount, per-frame React publication or expensive shadow/post-process baseline. |
| Acceptance matrix | PASS | Ten exact capture IDs and deterministic industrial-scene requirements are defined below. |
| Local governance checks | PASS | Design-token governance covers 276 maintained files; interaction governance and governance policy stress tests pass; `git diff --check` is clean. |
| Stage A repository/governance CI | PASS | Exact-head Quality Gate `36392043730` passed for the reviewed Stage A baseline. |
| Stage B focused runtime evidence | PASS | The conditional Chromium matrix produces the ten required PNGs plus `pf3b-viewport-evidence.json`, verifies a loaded GLB, placeholder Machine, required Civil geometry, mixed selection, active collision, physical Floor overlap, system-theme invariance and clean presentation capture. |
| Local runtime validation | PASS | Build passed; Vitest `4.1.11` passed 167 files / 1392 tests; Chromium passed 105 parallel scenarios plus the isolated Runtime Feature Access scenario (106 total). |
| Dependency security audit | BLOCKED | `npm audit --audit-level=low` reports one moderate transitive `undici@7.29.0` advisory (`GHSA-3wwx-pv8p-q78v`). Package/lockfile remediation is outside this bounded runtime package. |
| Automation Green | PENDING | Runtime automation is green locally, but PASS requires a successful final exact-head GitHub Quality Gate; the dependency-security advisory is an explicit blocker. |
| Contract Verified | PENDING | Independent review must verify runtime conformance to the merged Stage A standard and ADR-004. |
| Product Accepted | PENDING | Manual visual acceptance begins only after independent contract review and exact-head automation. |

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
| `09-theme-switch-same-camera` | Explicit and `system` effective theme changes preserve camera, fit, transforms, selection, history, dirty state and editor/Babylon/canvas lifecycle. |
| `10-presentation-clean-capture` | Existing display authority produces a clean commercial capture without domain mutation. |

## Mandatory Stage B Checks

- Dark and light palettes match the exact standard values.
- One effective-theme resolver updates UI and typed Babylon presentation on `system` OS changes; effective theme is not persisted.
- Grid extent follows Machine+Civil bounds and is unchanged by orbit, zoom, projection, fit or viewport resize.
- Grid lines remain phase-anchored to world origin when content movement changes extent or center.
- Rotated Machine/Civil world-space Plan AABBs remain fully enclosed with the exact 5000 mm margin; raw unrotated bounds are not accepted.
- Zero/one/large extents retain bounded primitive count.
- Grid/workplane are not selectable, pickable, collidable, persisted or exported.
- Floor Area remains physical ADR-003 geometry; visual workplane never occludes it.
- GLB authored materials and Civil user color/opacity remain intact.
- Primary/secondary selection, collision and warning remain distinguishable.
- Theme switching creates no history, dirty, camera, selection, transform or lifecycle mutation.
- Existing PNG/commercial capture remains valid.
- No console error, page error, `Maximum update depth`, engine/scene/canvas remount or document overflow.

## Explicit Rejections

No cyan/green cast, neon grid, HDRI/skybox, camera-sized grid, Active-Level grid, per-line mesh architecture, always-on-top physical geometry, selection-as-warning, theme-driven project mutation, Level/story clipping, ADR-001 drag redesign or PF-3B-adjacent feature work is authorized.
