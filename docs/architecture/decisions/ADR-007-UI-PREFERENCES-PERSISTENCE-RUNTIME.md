# ADR-007: UI Preferences Persistence Runtime

Status: **Accepted**

## Context

AtrVisu already persisted right-panel width, shell collapse, and section
expansion independently in `localStorage`. P1-D needs one durable preference
authority before visible workspace or preference controls can be introduced,
without mixing presentation state into projects, revisions, scene entities, or
the Babylon runtime.

## Decision

IndexedDB schema version 2 adds one `uiPreferences` object store beside the
unchanged `projects` store. The store uses the fixed out-of-line key
`workbench` and stores the existing versioned `WorkbenchUiPreferences`
contract. Installation and version-1 upgrade create only missing stores;
project records and indexes are not rewritten.

All external values pass through the maintained architecture validator and a
deterministic normalizer. The normalizer rejects domain-shaped payloads,
removes unknown or duplicate panel entries, restores required compatibility
panels, clamps shell width, and produces stable orders and docks. Future schema
versions remain byte-for-byte untouched and enter read-only compatibility mode.
Corrupt current-version records are also left untouched during hydration while
safe defaults remain active in memory.

The bounded legacy migration reads IndexedDB first. Only when the record is
absent does it translate the owned shell and section `localStorage` keys into
one complete record and one write. Consumed keys are removed only after that
write succeeds. There is no migration marker; retry and React StrictMode
idempotence follow from record existence.

One framework-independent runtime store owns the in-memory snapshot,
hydration status, warning, revision, immutable updates, and serialized writes.
Updates may arrive while hydration is pending. They remain immediately visible,
are recorded as ordered mutations, and are replayed deterministically over the
hydrated or migrated base. Hydration/default/migration writes and subsequent
runtime writes share the same persistence ordering authority, so a stale
initialization completion cannot overwrite a newer accepted state.
One React provider subscribes through `useSyncExternalStore`. It sits above a
preference-bound `DesignSystemRoot`, while App consumes the same authority for
right-panel size/collapse and section state. Defaults render synchronously as
dark and comfortable; hydration updates attributes and panel presentation in
place without keying or replacing App, WorkbenchShell, EditorHost,
BabylonScene, or the canvas.

## Domain Boundary

UI preferences contain theme, density, optional future workspace identity,
and panel presentation only. Projects, layouts, revisions, entities,
transforms, layers, groups, annotations, viewpoints, selection, history,
dirty state, camera state, modal state, and command state remain outside this
store. Project import/export and persistence schemas are unchanged.

## Failure Policy

Storage failures retain the latest in-memory state, expose degraded status,
warn without a red console error, and permit later retry. Persistent updates
are rejected in future-readonly mode. Serialized writes prevent an older
completion from overwriting a newer preference state. A rejected production
database open or upgrade clears only its own cached promise and unusable
instance, rethrows the original error, and allows a later call in the same
application lifecycle to retry. Promise identity checks prevent an older
attempt from clearing or replacing a newer connection.

## Consequences

- Existing compatibility-shell appearance and behavior remain unchanged.
- Controlled `PanelSection` instances no longer access legacy storage.
- Runtime Panel Registry operations delegate presentation changes to the same
  authority; modal state remains ephemeral.
- P1-D2 owns workspace presets, workspace application, and visible theme,
  density, workspace, panel visibility, ordering, and docking controls.

## Rejected Alternatives

- Storing preferences in project or revision records.
- A second database or panel registry.
- Keeping App and individual sections as parallel persistence authorities.
- Downgrading future records or automatically replacing corrupt records.
- Introducing visible preference controls or workspace switching in P1-D1.
