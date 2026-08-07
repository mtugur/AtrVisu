# P1-D1 UI Preferences Runtime Gate

| Gate | Status | Evidence |
| --- | --- | --- |
| Exact P1-C baseline `ea4a06586f5aa77063fa92d87d8b5c7f22535765` | PASS | Branch ancestry and preflight |
| IndexedDB schema version 2 | PASS | `indexedDb.ts`; installation tests |
| Existing projects store and indexes preserved | PASS | Real v1-to-v2 upgrade test |
| Separate `uiPreferences` store and fixed out-of-line key | PASS | Storage constants and repository tests |
| Version-1 project records preserved without rewrite | PASS | Upgrade equality assertion |
| Rejected production opener recovery and same-lifecycle retry | PASS | Injected opener failure, normal retry, and live-connection reuse test |
| Fresh canonical defaults | PASS | Defaults and runtime tests |
| Strict validation and deterministic normalization | PASS | Storage/normalizer tests |
| Domain-shaped payload rejection | PASS | Normalizer/runtime negative tests |
| Future-version record preserved and read-only | PASS | Repository/runtime tests |
| Corrupt record preserved with safe defaults | PASS | Repository and Chromium tests |
| Legacy shell and every section key mapped | PASS | Migration table tests |
| Legacy cleanup only after successful write | PASS | Success/failure migration tests |
| Unrelated localStorage values preserved | PASS | Migration unit and Chromium tests |
| One runtime authority and shared hydration operation | PASS | Runtime concurrency tests |
| Updates during hydration replay over the hydrated base | PASS | Deferred valid-read and ordered same-field update tests |
| Migration/default and runtime writes share one ordering authority | PASS | Deferred absent-record and legacy-write race tests |
| Corrupt record plus explicit pending update recovers safely | PASS | Corrupt-record deferred runtime test |
| Future record plus pending update remains untouched | PASS | Future-readonly deferred runtime test |
| Serialized persistence and retry | PASS | Deferred-write, failed-final-write, and complete-state retry tests |
| Provider uses stable external-store subscription | PASS | Provider implementation/tests |
| DesignSystemRoot consumes runtime theme/density | PASS | Provider and Chromium tests |
| App contains no migrated localStorage access | PASS | Architecture test |
| Controlled PanelSection contains no legacy persistence | PASS | Component test |
| Runtime panel open/close/toggle semantics preserved | PASS | Existing and updated Chromium tests |
| Right-panel resize persists through runtime | PASS | Panel persistence Chromium test |
| Domain, camera, and scene lifecycle invariant | PASS | Runtime viewport Chromium evidence |
| One EditorHost and one canvas through hydration | PASS | Identity Chromium evidence |
| No visible selector or workspace application | PASS | Architecture inspection |
| Project persistence/import/export unchanged | PASS | Scope and full regression suite |
| Package lock unchanged and no dependency added | PASS | Git diff and npm install state |
| Audit and low-level audit | PASS | 0 vulnerabilities |
| Design-token scanner | PASS | 197 maintained files |
| Build | PASS | TypeScript and Vite build |
| Unit suite | PASS | 117 files / 1088 tests |
| Chromium suite | PASS | 49 tests including real delayed-hydration interaction |
| No red console or page errors | PASS | Chromium collectors |
| Manual visual acceptance | NOT REQUIRED | Zero intentional visible delta and geometry/lifecycle evidence |
| Corrected exact-head Quality Gate | PASS | Code head `5711b4f5f1018206db08f874bb497acf2cc7b5df`; run `31096265954`; dependency security audit, design-token governance, build, 117 files / 1088 unit tests, and 49/49 E2E passed |
| Independent corrected-head re-review | PASS | PR comment `5204363538`; hydration/update race, migration/runtime write ordering, and production opener retry accepted; no implementation blocker remains |

Independent review comment `5203394076` at original head
`6dec96bfe1da9ba020b14c1d669bcbdb69c4650d` identified the hydration/update
and production-opener retry blockers now covered above.

Decision: **READY FOR MERGE**. All P1-D1 automatic gates passed, corrected-head
independent review passed, manual visual acceptance is not required, and the
P1-D1 acceptance gates are complete. PR #104 may be marked Ready for Review and
merged only after the new documentation-only exact-head Quality Gate passes and
final scope verification confirms that its commit changes only the two allowed
files. P1-D remains incomplete and P1-D2 remains required. This does not mark
Phase 1 complete.
