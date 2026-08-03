# ADR-002: Domain, UI Preference, and Session-State Boundaries

Status: **Accepted**

## Context

Phase 1 needs persistent workbench preferences without destabilizing the
existing IndexedDB project aggregate or silently persisting runtime-only state.

## Decision

The current `projects` aggregate store remains authoritative for projects,
layouts, revisions, entities, transforms, layers, groups, annotations,
connections, saved viewpoints, and commercial-output source metadata.

The future physical direction adds a separately versioned `uiPreferences`
store for theme, density, active workspace ID, and panel visibility, size,
collapsed state, dock, and order. P1-A does not change the database schema or
version.

Hover, gestures, open menus/popovers, temporary focus, transient pointers,
uncommitted command interactions, Runtime Selection, and unsaved camera
movement remain ephemeral. Saved viewpoints remain domain data.

## Alternatives Considered

- Normalize projects, layouts, revisions, and UI preferences into four stores.
- Put UI preferences inside every project or revision.
- Persist the complete App session automatically.
- Treat saved viewpoints as UI preferences.

## Rejected Alternatives

Immediate normalization creates unnecessary migration risk. Embedding UI
preferences in projects couples user presentation choices to shared domain
documents. Persisting the whole session promotes transient authority state.
Saved viewpoints are intentional layout/revision content and must remain domain
data.

## Consequences

- Existing project import/export and revision compatibility stay intact.
- UI preferences require their own future schema/version lifecycle.
- Session restoration must be explicit about what is durable.
- Contracts must prevent domain snapshots from entering UI preferences.

## Migration Implications

A later P1-D package may increment the IndexedDB version and create
`uiPreferences` through an idempotent migration. It must preserve all existing
project records, support defaults for absent preferences, and test rollback/
failure behavior before release.

## Verification Obligations

- P1-A changes no IndexedDB schema or database version.
- UI preference contracts import no project/revision types.
- Tests prove entity, transform, viewpoint, history, and dirty-state fields are
  outside the preference contract.
- Future migration tests prove existing project aggregates remain readable.
