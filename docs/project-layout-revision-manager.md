# Project / Layout / Revision Manager v0.1

AtrVisu can store customer project work locally in the browser.

## Concept

The v0.1 project hierarchy is:

```text
Customer
  Project
    Layout
      Revision
```

- Project: customer and project metadata.
- Layout: a named layout alternative inside the project.
- Revision: a named checkpoint containing a complete layout snapshot.

Example naming:

- Customer: `ABC Un Fabrikasi`
- Project: `Paketleme Hatti`
- Layout: `Alternatif-1`
- Revision: `R03`

## Storage

v0.1 uses browser `localStorage` only.

Storage key:

```text
atrvisu.projects.v1
```

There is no backend, database, authentication, or cloud sync in v0.1. A future backend can replace the localStorage utility layer without changing the project concept.

## Revisions

A revision is a saved/checkpointed layout snapshot.

Saving a revision stores:

- app name and layout version
- unit system metadata
- all layout objects
- object definitions and snapshots
- positions, rotations, dimensions, collision envelopes, and other layout data already supported by layout export

Revision codes auto-increment simply:

- `R00`
- `R01`
- `R02`

## Autosave vs Revision

Autosave is recovery safety only. It helps restore unsaved browser work after refresh.

A revision is an intentional project checkpoint. Use `Save Current Scene as New Revision` when a layout state should be kept as part of a customer project.

## Export Layout vs Export Project

Export Layout downloads one layout snapshot file. It is useful for moving a single scene state.

Export Project downloads the full project JSON, including:

- project metadata
- layouts
- revisions
- revision snapshots

Import Layout and Import Project remain separate operations.

## Limitations

Project Manager v0.1 is frontend-only and local to the current browser.

Known limitations:

- No user accounts.
- No cloud sync.
- No multi-user conflict handling.
- No approval workflow.
- No backend audit trail.

For production project control, a backend database can later replace localStorage persistence.
