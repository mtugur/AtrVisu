# PF-2A Asset Browser Discovery Gate

| Gate | Status | Evidence |
| --- | --- | --- |
| Required baseline | PASS | Branch created from `be61aa7196bc7d50e0f6f053a03af22e329f3399` |
| Existing asset authority | PASS | Derived records reference validated `LoadedMachineLibrary` / `LibraryMachineItem`; no second definition model |
| Stable browser identity | PASS | `libraryId::item.id` utility and regression |
| Canonical browse order | PASS | Child-before-root hierarchy/order regression |
| Search contract | PASS | Normalization, exact/prefix/partial/semantic/group ranking, token-AND, and 1,000-record deterministic coverage |
| Real filters | PASS | Source/category/family options and combined filter regressions use loaded data only |
| All / Recent / Favorites | PASS | One projection; truthful empty states; stale keys ignored safely |
| Explicit Add authority | PASS | Existing `library.addMachine`; Recent records only an executed add |
| Non-domain invariance | PASS | Chromium compares camera, selection, transforms, history, dirty state, and lifecycle before/after preference operations |
| Favorite persistence | PASS | IndexedDB hydration/save and hard-reload Chromium regression |
| Recent policy | PASS | Most-recent-first, unique, repeat-to-front, maximum 12 |
| IndexedDB migration | PASS | Additive v2 -> v3 store migration preserves projects and workbench UI preferences |
| Persistence concurrency | PASS | Successful hydration replays pending mutations; failed hydration preserves already-accepted in-memory mutations without replay; serialized writes prevent stale overwrite |
| Storage failure | PASS | In-memory degraded state; no uncaught or red-console path |
| Card semantics | PASS | Thumbnail-or-icon fallback, identity/context/mm/source, sibling Favorite/Add controls, accessible names |
| Hierarchy accessibility | PASS | Truthful `aria-expanded`; keyboard-reachable search, scopes, filters, Favorite, and Add |
| Manager cleanup | PASS | Permanent footer removed; Tools and Command Palette retain both registered manager commands |
| Release hygiene | PASS | Actual release index/library validation and identity/duplicate regressions |
| Help | PASS | Search, browse, filters, Favorites, Recent, and Add guidance; no internal terminology |
| Responsive | PASS | Chromium at 1440x900, 1024x768, and 640x800; no document horizontal overflow |
| Primary Dock density | PASS | Canonical horizontal Library / Explorer / Layers / Groups / Viewpoints tabs are fully visible at the 292 px default width; no permanent vertical rail or duplicate active title |
| Primary Dock collapse | PASS | Zero editor inset and zero reserved dock width; floating `Open <active tab>` affordance restores the existing active contribution and persisted width |
| Runtime evidence | PASS | Conditional ten-capture artifact `pf2a-asset-browser-discovery` |
| Dependency audit | PASS | `npm audit --audit-level=low`: 0 vulnerabilities |
| Dependency tree | PASS | `npm ls --all`: valid; expected platform-optional packages absent |
| Design-token governance | PASS | 260 maintained files checked |
| Build | PASS | 4,130 modules transformed |
| Full unit suite | PASS | 154 files / 1,290 tests |
| Full Chromium suite | PASS | 78 tests |
| Diff check | PASS | `git diff --check` |
| Exact-head GitHub Quality Gate | PASS | PR checkout uses the actual head SHA and a PR-only provenance assertion; the final exact-head run is the delivery authority |

Decision: **READY FOR DRAFT PR DELIVERY AFTER THE COMPLETE LOCAL GATE.**
