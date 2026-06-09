# IndexedDB Project Storage

AtrVisu project data is stored in browser IndexedDB starting with IndexedDB Project Storage v0.1. This moves large Project / Layout / Revision / Snapshot records out of `localStorage`, which is better suited for small settings and recovery flags.

## What Uses IndexedDB

- Projects
- Layouts
- Revisions
- Revision layout snapshots
- Imported Project JSON records

The database is named `atrvisu-db`, version `1`, with a `projects` object store. In v0.1 each full project is stored as one record keyed by `projectId`.

## What Remains In localStorage

Small browser-local UI and safety data remains in `localStorage`, including:

- panel width/collapse preferences
- panel section collapse preferences
- overlay, collision, and placement settings
- layout autosave recovery data
- named layout save/load data where already used by the app
- the project migration flag `atrvisu.projects.indexeddb.migrated.v1`

Autosave remains a recovery feature. It does not replace explicit project revisions or exported backup files.

## Migration Behavior

On app startup, AtrVisu checks the legacy `atrvisu.projects.v1` localStorage key. If legacy projects are present, they are copied into IndexedDB without deleting the original localStorage data.

Migration safeguards:

- Existing IndexedDB projects are not overwritten by older localStorage records with the same `projectId`.
- Corrupted localStorage data is skipped with a console warning.
- Corrupted IndexedDB records are skipped when listing projects so one bad record does not crash the app.
- After migration completes, AtrVisu writes `atrvisu.projects.indexeddb.migrated.v1`.

## Backup Recommendation

IndexedDB is still local browser storage. It is not cloud sync, not a database server, and not a multi-user backup system.

Clearing browser data, changing browser profiles, or using cleanup tools can delete local projects. Use **Export Project JSON** for durable backups and for moving projects between browsers or machines.

## Compatibility

Existing Project JSON export/import remains supported. Existing Layout JSON export/import and autosave recovery remain separate and continue to work independently from project storage.
