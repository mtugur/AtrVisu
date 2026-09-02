# PF-2B Native Asset Import Audit

Base: `e3fd3ae396c68739ea993c34b7ff68fc86b21ae3`.
Branch: `feat/phase-1-native-asset-import-v01`.

## Authority Review

- Two registered Library commands; one existing Runtime Feature Command bridge.
- Existing Project Custom Library metadata and canonical Add/Recent authority.
- Additive IndexedDB v3 -> v4 imported-model store, with untouched old records.
- Persistent model locator in existing visualModel; ephemeral URLs stay in adapters.
- Shared serialized writes, failed-import compensation, reference-aware deletion.
- Standard definitions remain immutable; variants retain engineering metadata,
  receive independent IDs and do not claim copied ATARA commercial identities.
- Existing library validation and editing remain the metadata authority.
- Main App, EditorHost, scene/canvas and project/history/selection are not replaced
  by the import preview. The temporary preview intentionally owns a second canvas
  only while the import modal is open.

## Executed Focused Evidence

- Native asset unit tests: malformed/external GLB, bounds, units, orientation,
  metadata, collision retry, URL release, missing/corrupt binary, compensation,
  shared/final reference cleanup, immutable standard, concurrent/stale writes.
- Real v3 database migration retains project, UI and asset-browser records.
- Render calibration tests transform all supported perpendicular axis pairs and
  check the resulting dimensions, +Z forward, floor and footprint center.
- Five Chromium cases cover native import/Add, hard reload, malformed and
  non-renderable files, editing a Standard-derived Custom variant, 1024 and 640.
- Preview canvas pixel checks run after unit/orientation changes. These
  checks include an offset, unindexed GLB with centering/floor calibration off.
  The preview keeps the actual model framed rather than assuming an origin.
  Main canvas
  identity stays connected. Saved-model diagnostics count real loaded geometry,
  and a projected-footprint pixel check waits for the GLB's filled surface after
  Add and reload. A loaded mesh or selection-box-only frame is insufficient.
- Runtime feature-access completion observes both new visible command routes.
- Existing PF-2A projection/search/favorites/recent and release-hygiene tests
  remain in the full gate; their ranking/domain behavior is unchanged.

## Reviewer Evidence

Conditional exact-head artifact: `pf2b-native-asset-import`.
It includes the ten requested captures plus `11-import-1024.png`.
CI checks out the PR's real head and verifies provenance before running the
complete gate and uploading the captures. The E2E server header is also checked.

The delivery commit's Quality Gate run is the final validation authority for
audit, token governance, build, all unit tests and Chromium. Local complete-gate
counts and exact run URL are recorded in the PR delivery description, not
manufactured as future results in this report.

## Acceptance Boundary

Ready for bounded visual/manual acceptance only after exact-head CI succeeds.
Review a real customer GLB at 1440/1024/640, units/axes/floor calibration, save,
hard reload and Add, then create/edit a custom variant. Browser-local imported
models do not travel with JSON exports. No product decision is required to keep
that explicitly bounded PF-2B storage behavior.
