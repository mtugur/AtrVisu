# Phase 1 P1-BLD1 Build Library and Properties Audit

Date: 2026-09-21

Baseline main: `397571bd26aea5c2503a1c76705a860b313d7c29`

## Contract and declaration

This package changes visible creation and Civil property interaction. Product Constitution, Interaction Standard sections 3 and 6, `docs/building-civil-reference.md`, the task-similar official benchmark record and ADR-002 were reviewed before implementation. ADR-002 is the frozen cross-entity Asset Browser contract. It preserves the PF-3A picked-elevation, single fixed-plane Plan Move contract and its accepted approximately 20 m camera limitation.

## Authority and behavior

- The existing Library projects tagged `machine` and `civil` records through common Search, All/Recent/Favorites and filters. Machine records retain `LibraryMachineItem`; eight immutable Build template records contain Civil types and dimensions, not `MachineDefinition`.
- Existing machine source order, Add/variant/manager/import paths remain. Build cards dispatch `civil.addPrimitive` with a validated Civil type, then App uses canonical `createCivilReference`. Recent records only after an executed Add.
- The normal legacy Civil add panel and per-type Insert actions are removed. Six bound per-type commands remain a programmatic compatibility surface and are declaratively excluded from Command Palette discovery by command ID; `civil.addPrimitive` remains the visible Library Build route. Runtime Feature Access and surface inventory distinguish visible Build Library from this compatibility API.
- Beam is a rectangular solid Civil item, defaults to 6000 x 300 x 500 mm at 3000 mm Elevation, and inherits Civil selection, layer, lock, alignment, history and serialization. It is a layout reference, not structural analysis.
- Color and opacity use only `CivilReferenceItem.style`, with RGB-hex validation, opacity clamping and type defaults on old data. Inspector mutation follows the existing lock/history path. Babylon updates the existing Civil material color and alpha without rebuilding the mesh for style-only edits. The opt-in E2E diagnostic exposes rendered material values, not a new style authority.

## Evidence

- Catalog, machine Library, Civil defaults/normalization, collision, layout history/serialization and Inspector tests cover the typed split and style round trip.
- Chromium uses visible Build cards and Inspector controls to verify registered command execution, Beam selection, Plan body drag with unchanged Elevation, rendered style, Undo/Redo, lock state, scene lifecycle stability and no red console.
- Existing runtime Feature Access complete-gate and PF-3A body-drag tests remain part of the full E2E gate.
- Review `5275545907` identified a Door / Opening metadata omission. `civil.doorOpening` now uses the existing `civil.addPrimitive` and `panel.machineLibrary` authorities; `surface.buildLibrary` lists the same feature. A platform-boundary test compares all eight frozen Build catalog types to their required-runtime Feature Access and Build Library surface links. No placement route or visible creation surface changed.
- Review `5278343627` identified that compatibility-bound per-type Civil commands leaked into Command Palette. ID-based surface exclusion now hides only those six palette entries; registry/runtime bindings and ordinary palette commands stay live. Focused adapter and Chromium regressions cover the compatibility/palette split and Library Build Add.

## Release state

Local gate passed on 2026-09-22 after review correction `5275545907`: `npm audit --audit-level=low` found 0 vulnerabilities; `npm ls --all` exited 0; design-token governance checked 268 files; interaction governance and governance-policy tests passed; build passed; unit tests passed (161 files, 1352 tests); E2E passed (99 parallel plus 1 isolated, 100 total); `git diff --check` is part of delivery verification.

For correction `5278343627`, audit, dependency tree, token and interaction governance, build, and unit tests passed (161 files, 1353 tests). The new Chromium compatibility/Palette/Library Build regression passed both focused and in the complete suite. The complete local E2E did not pass: 99/100 parallel tests passed and the isolated runtime-feature-access test timed out at its PNG export step. Focused reruns showed that the isolated test passes without the earlier suite load, while the existing commercial-output PNG test still exceeds its 30-second limit on this host. This export timing issue remains explicit local gate evidence, not a claimed product-code correction in the P1-BLD1 command-surface scope.

Automation Green: local E2E blocked on the current correction, exact-head CI pending. Contract Verified: pending independent review. Product Accepted: pending final manual acceptance. P1-BLD2 Levels and PF-3B remain separate.
