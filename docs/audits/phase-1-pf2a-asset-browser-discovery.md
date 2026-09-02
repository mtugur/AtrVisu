# Phase 1 PF-2A Asset Browser Discovery Audit

Date: 2026-08-31

Branch: `feat/phase-1-asset-browser-discovery-v01`

Baseline: `be61aa7196bc7d50e0f6f053a03af22e329f3399`

## Decision

PF-2A replaces the status-oriented Library projection with a real asset browser
over the existing validated `LoadedMachineLibrary` hierarchy. It introduces no
second asset definition, scene-add, project, history, selection, or manager
authority. PF-2B model import and PF-3 viewport visual-language work remain out
of scope.

## Discovery Projection

- Browser identity is the deterministic `libraryId::item.id` key.
- Curated child-before-root item order remains the no-query order.
- Search is normalized, diacritic-tolerant, token-AND, deterministic, and ranks
  names before semantic metadata and hierarchy/source matches.
- Source, category, and family options are derived only from loaded canonical
  data. Family uses `productFamilyCode` when present and otherwise the nearest
  non-root group name without writing it back to the domain model.
- All, Recent, Favorites, search, and filters compose through the same pure
  projection.

## Product Surface

The Primary Dock Library exposes Search, All/Recent/Favorites, a compact filter
disclosure, hierarchy or flattened results, restrained semantic fallback
visuals, source and mm dimensions, Favorite, and explicit Add. Loading, empty,
warning, storage-degraded, and retryable load-error states use customer-facing
copy. Cards contain sibling controls and no nested buttons.

Successful Add delegates to the existing `library.addMachine` command and only
then records Recent. Search, filter, and Favorite operations leave project,
selection, transforms, camera, history, dirty state, EditorHost, and Babylon
lifecycle unchanged.

Library Manager and Taxonomy Manager remain registered modal authorities and
are reachable from Tools and Command Palette. Their permanent Library footer
projections are removed.

The shared Primary Dock presents its canonical Library, Explorer, Layers,
Groups, and Viewpoints contributions as one compact horizontal tab strip. It
does not repeat the active tab as a second title. Collapsing reserves zero
layout width and exposes one floating `Open <active tab>` control; reopening
uses the existing active panel authority and restores the persisted dock width.
At the canonical 292 px default width, all five full tab labels remain visible
without scrolling or overlap; narrower user-resized widths retain horizontal
scrolling as a fallback.

Collapsed Primary Dock and Inspector reopen affordances share one structural
dock grammar: mirrored 32 x 32 edge controls at the same shell-relative top
inset. Their existing panel authorities, persisted collapse state, responsive
rules, and reopen targets remain unchanged.

## Persistence

AtrVisu IndexedDB version 3 adds only `assetBrowserPreferences` / `browser`.
The version-1 preference schema stores favorite and most-recent-first asset
keys; recents are unique and capped at 12. Hydration races replay accepted
mutations only when stored state was read successfully. Failed reads preserve
mutations already accepted into the current in-memory snapshot without replay,
and all writes share one serialization queue. Failure retains an in-memory
session without a red-console path. Real version-2 migration tests prove
project and workbench preference bytes survive unchanged.

## Release And Runtime Evidence

- Actual release JSON has unique enabled library IDs, no release debug/test/
  fixture/demo identity, no exposed diagnostic group identity, and no duplicate
  surviving canonical asset ID.
- Chromium covers Search/Add/Recent, hard-reload Favorites, unfavorite empty
  state, combined filters, manager command reachability, non-domain invariance,
  and 1440x900 / 1024x768 / 640x800 overflow resilience.
- Conditional exact-head CI capture produces twelve real-runtime screenshots in
  artifact `pf2a-asset-browser-discovery`.
- Help explains search, category/family browsing, filters, Favorites, Recent,
  and explicit Add using current customer-facing behavior only.

## Validation

Focused regressions passed for 7 files / 24 tests and the bounded PF-2A plus
manager Chromium routes. The complete local gate passed with zero audit
vulnerabilities, a valid dependency tree with expected platform-optional
packages absent, design-token governance across 260 maintained files, a
4,130-module build, 154 unit files / 1,290 tests, and 78 Chromium tests. The
final diff check passed. Exact-head GitHub Quality Gate remains the delivery
authority.
