# PF-3B Viewport Visual Engineering Language Runtime Audit

## Decision

PF-3B Stage B implements the merged viewport visual standard without changing camera, movement, project, storage or domain authorities. The package is ready for independent contract review only after its exact-head Quality Gate succeeds. Manual product acceptance remains pending.

## Baseline

- Base: exact `main` at `4c569c149cef6b9558ce8f75c3bb402b69c368aa`.
- Branch: `feat/phase-1-pf3b-viewport-visual-runtime-v01`.
- Bounded correction source: independent exact-head review `5352908847`.
- Normative authorities remain `ATRVISU_VIEWPORT_VISUAL_STANDARD.md`, ADR-004, ADR-001 and ADR-003; this implementation does not modify them.

## Implemented Authorities

- `EffectiveThemeId` is a read-only `light | dark` presentation value resolved once inside the Design System boundary. Explicit preferences resolve directly; `system` observes `prefers-color-scheme`. Only the existing `ThemeId` preference persists.
- `DesignSystemRoot` and `BabylonScene` consume the same effective value. Theme updates mutate bounded presentation resources in place and do not remount App, EditorHost, Babylon scene or canvas.
- `ViewportVisualPalette` is an immutable typed five-role authority with the exact merged dark and light values. Babylon receives typed palette data and does not parse CSS variables.
- The visible workplane and invisible Plan interaction plane are separate meshes. The workplane is non-pickable and non-collidable; the interaction plane remains the existing drag/pick authority.
- One repeated dynamic grid texture preserves 1000 mm minor and 5000 mm major world-origin phase. One visual mesh and one interaction mesh keep primitive count constant for empty and large extents.
- Workplane bounds are the union of canonical rotation-applied Machine and Civil Plan AABBs, with exact 5000 mm margin, 40000 by 40000 mm minimum and outward 5000 mm rounding.
- Neutral world-stable lighting uses directional key `1.00`, directional fill `0.45` and hemispheric ambient `0.35`, all sourced from the active viewport palette.
- Selection uses only primary/secondary technical frames. Machine base material emissive state is collision-only, Civil color/opacity remains user-owned and mixed Machine/Civil primary presentation follows Runtime Selection `primaryId`.
- Canonical camera-state application writes the ArcRotateCamera target before explicit mode/alpha/beta/radius. This preserves a request that changes target and orientation together without changing orbit, pan, wheel or movement semantics.
- One shared scene-label presentation authority draws the existing Machine, Civil and connection-point text on a tight translucent neutral backplate. Effective-theme changes redraw those presentation textures in place without scene lifecycle or persistence mutation.
- Presentation capture continues through the existing commercial-output authority, hides editor affordances through the existing helper and composites transparent render-target pixels over the active viewport background without changing scene state.

## Preserved Boundaries

- ADR-001 Plan movement, fixed drag plane, snapping and history semantics are unchanged.
- ADR-003 Floor Area FFL math and the P1-BLD2 physical/reference rendering-group policy are unchanged.
- Authored GLB materials, placeholder identity color, Civil style, collision, warning, connection-point and annotation semantics remain separate from theme presentation.
- No HDRI, skybox, shadows, post-processing, material editor, grid settings, Active-Level grid, schema migration or dependency is added.

## Automated Evidence

- Pure tests cover explicit/system effective theme resolution and listener cleanup, exact palettes, rotated world bounds, exact margins/rounding, world grid phase, huge finite coordinates and immutable dark/light label presentation.
- NullEngine tests prove two constant visual-context meshes, separate pick/presentation resources, three exact lights and no resource growth across repeated theme or extent updates.
- NullEngine camera regressions prove that a changed target plus explicit perspective or orthographic alpha/beta/radius survives camera matrix evaluation.
- Selection tests protect global mixed primary/secondary roles and collision-only machine emissive behavior.
- Chromium camera regression applies changed target/orientation payloads through the runtime bridge and checks the resulting snapshot after render. Capture 05 asserts a true plan camera before screenshot and records `alpha=-PI/2`, `beta=0.01`, radius `32` and orthographic vertical span `28`.
- Chromium system-theme coverage proves effective dark-to-light changes preserve camera, selection, transforms, history, dirty state and scene/canvas identity.
- Artifact `pf3b-viewport-visual-language` contains ten required PNGs and one JSON record. Its industrial scene contains one loaded GLB Machine, one placeholder Machine, Floor Area, Wall, Column, Beam and a planning Reference Zone. Claimed collision, viewport presence and Floor overlap are asserted before capture.
- Captures 04, 09 and 10 show the shared restrained neutral label contrast treatment at normal screenshot scale in the light viewport and clean commercial capture; dark capture 03 uses the same label content and authority.
- The JSON records effective theme, camera, lifecycle, selection, transforms, dirty/history depth, workplane bounds, grid cadence, visual-context mesh/light counts and console/page-error count for each capture.

## Local Validation

- Design-token governance: PASS across 276 maintained files.
- Interaction governance and governance policy stress tests: PASS.
- Build: PASS.
- Unit: PASS, Vitest `4.1.11`, 167 files / 1396 tests.
- E2E: PASS, 106 parallel Chromium scenarios plus one isolated Runtime Feature Access scenario (107 total).
- Artifact payload: PASS, ten required PNGs plus one JSON evidence record.
- Dependency security audit: PASS, zero vulnerabilities with the merged `undici@7.30.0` lock resolution. This runtime correction does not change package manifests or the lockfile.

## Acceptance State

- Automation Green: PENDING final exact-head Quality Gate for the correction head; the complete local gate is green.
- Contract Verified: PENDING independent review.
- Product Accepted: PENDING manual visual acceptance after contract review.
