# ADR-013: Native Asset Persistence and Custom Variants

Status: Implemented; visual acceptance remains a separate delivery gate.

## Decision

Native import accepts self-contained GLB 2.0 only. The four-step wizard owns
temporary file/preview/calibration state, not project entities. Its isolated
Babylon scene is disposed on close and never replaces the editor scene.
`library.importAsset` opens the wizard from Library and Insert. The registered
`library.createCustomVariant` command owns the Library copy action.

Project Custom Library remains the existing `MachineLibraryDocument` stored
under `atrvisu.projectCustomLibrary.v1`. Its items keep the same validated
`LibraryMachineItem` / `MachineDefinition` projection and canonical Add path.
No binary is embedded in that JSON or in project snapshots.

IndexedDB v4 additively introduces `importedModels`. Existing projects,
uiPreferences and assetBrowserPreferences records are not rewritten. A model
record contains an ArrayBuffer and original filename under a random UUID.
The existing visualModel.modelPath holds `atrvisu-model:<UUID>`, never a blob
URL. The rendering adapter validates and resolves the binary on demand,
releases its temporary URL after loading, and reports unavailable/corrupt
models through the existing fallback diagnostics.

Calibration preserves aspect ratio and maps supported perpendicular forward/up
axes to Babylon +Z/+Y. Domain dimensions are millimeters. Both preview and
imported rendering use the same calibration calculation. Existing standard GLB
and placeholder rendering is unchanged.

## Write and Delete Ownership

Import, variant creation and existing Library Manager saves share one serialized
Custom Library write service. Web Locks serialize browser tabs where supported;
the local queue always serializes one runtime. Stale whole-library editor saves
are rejected. Binary creation precedes metadata publication; failed metadata
publication compensates by deleting the newly allocated binary.

Variants deeply copy editable metadata, allocate a new custom ID, and remove
standard commercial identity claims without discarding engineering properties.
They may share the source's persisted model. Removing an asset/group, replacing
or resetting the custom library deletes only binaries no longer referenced by
the resulting custom library. Placed definition snapshots are not library
references: deleting their final library asset may make the stored visual
unavailable after reload, with the existing placeholder fallback rather than a
scene crash.

## Boundaries

- No standard definition mutation, invented ATARA codes or new asset domain.
- No GLTF external-resource compatibility claim.
- Imported files are browser-local; JSON export does not bundle their binaries.
- No project/layout schema, scene authority, PF-2A ranking or PF-3 changes.
- Test GLBs are constructed in tests/fixtures, absent from release libraries.

## Evidence

`nativeAssets.test.ts`, `modelRendering.test.ts`, IndexedDB migration tests and
`e2e/native-assets.spec.ts` cover persistence, validation, calibration, sharing,
compensation, source immutability, reload, editor reuse and responsive preview.
Exact-head CI publishes `pf2b-native-asset-import`.

## Manual-Acceptance Correction

Review `5099293463` identified contradictory native file text and a pre-existing
machine elevation/render mismatch. The wizard now presents one application-owned
filename/size status, with a keyboard-accessible picker button and a hidden native
input that resets solely to allow same-file reselection. Cancellation preserves
the selected state; native browser-localized filename text is not displayed.

Machine creation and updates share the vertical render projection:
`centerY = mmToMeters(elevationMm ?? 0) + heightMeters / 2`.
The separate machine label receives the same elevation offset. Existing GLB,
placeholder and affordance children keep their box parent and inherit movement.
This corrects rendering for imported, Standard and legacy machines without
changing Plan X/Y, collision semantics, project serialization or Civil/Build.
The added picker/elevation acceptance cases run at the end of `app-smoke.spec.ts`,
sequentially with its long shell scenarios. The original five native import cases
remain in `native-assets.spec.ts`; both use `nativeAssetHelpers.ts` without a new
test execution policy or altered timeout/worker settings.
