# PF-3B Viewport Visual Engineering Language Runtime Audit

## Decision

PF-3B Stage B implements the merged viewport visual standard without changing camera, movement, project, storage or domain authorities. The package is ready for independent contract review only after its exact-head Quality Gate succeeds. Manual product acceptance remains pending.

## Baseline

- Base: exact `main` at `4c569c149cef6b9558ce8f75c3bb402b69c368aa`.
- Branch: `feat/phase-1-pf3b-viewport-visual-runtime-v01`.
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
- Presentation capture continues through the existing commercial-output authority, hides editor affordances through the existing helper and composites transparent render-target pixels over the active viewport background without changing scene state.

## Preserved Boundaries

- ADR-001 Plan movement, fixed drag plane, snapping and history semantics are unchanged.
- ADR-003 Floor Area FFL math and the P1-BLD2 physical/reference rendering-group policy are unchanged.
- Authored GLB materials, placeholder identity color, Civil style, collision, warning, connection-point and annotation semantics remain separate from theme presentation.
- No HDRI, skybox, shadows, post-processing, material editor, grid settings, Active-Level grid, schema migration or dependency is added.

## Automated Evidence

- Pure tests cover explicit/system effective theme resolution and listener cleanup, exact palettes, rotated world bounds, exact margins/rounding, world grid phase and huge finite coordinates.
- NullEngine tests prove two constant visual-context meshes, separate pick/presentation resources, three exact lights and no resource growth across repeated theme or extent updates.
- Selection tests protect global mixed primary/secondary roles and collision-only machine emissive behavior.
- Chromium system-theme coverage proves effective dark-to-light changes preserve camera, selection, transforms, history, dirty state and scene/canvas identity.
- Artifact `pf3b-viewport-visual-language` contains ten required PNGs and one JSON record. Its industrial scene contains one loaded GLB Machine, one placeholder Machine, Floor Area, Wall, Column, Beam and a planning Reference Zone. Claimed collision, viewport presence and Floor overlap are asserted before capture.
- The JSON records effective theme, camera, lifecycle, selection, transforms, dirty/history depth, workplane bounds, grid cadence, visual-context mesh/light counts and console/page-error count for each capture.

## Local Validation

- Design-token governance: PASS across 276 maintained files.
- Interaction governance and governance policy stress tests: PASS.
- Build: PASS.
- Unit: PASS, Vitest `4.1.11`, 167 files / 1392 tests.
- E2E: PASS, 105 parallel Chromium scenarios plus one isolated Runtime Feature Access scenario (106 total).
- Artifact payload: PASS, ten required PNGs plus one JSON evidence record.
- Dependency security audit: BLOCKED by one moderate transitive `undici@7.29.0` advisory (`GHSA-3wwx-pv8p-q78v`). This runtime package does not change package manifests or the lockfile.

## Acceptance State

- Automation Green: PENDING final exact-head Quality Gate; dependency-security remediation is an explicit external blocker for this package.
- Contract Verified: PENDING independent review.
- Product Accepted: PENDING manual visual acceptance after contract review.
