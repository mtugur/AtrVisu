# ADR-004: Project Command Runtime Authority

Status: **Accepted**

## Context

The existing Runtime Feature Command Bridge registered `project.save`,
`project.exportJson`, and `project.importJson`, but their live bindings delegated
to a controller published by `ProjectManager`. Because that modal is mounted
only while open, command enablement and execution disappeared with the modal.
This prevented required workbench command surfaces from safely reusing the
canonical commands.

## Decision

The existing App-level Runtime Feature Command Bridge is the single execution
owner for project save, export, import, and restore commands. Save, export, and
import bindings use persistent App state and existing project storage APIs;
they do not depend on `ProjectManager` mounting.

`ProjectManager` is a presentation client. It requests commands through the
required runtime route, supplies its transient selected project ID for export,
and displays normalized operation results. It does not register a controller or
retain local save, export, or import implementations.

## Save Semantics

`project.save` resolves `currentProjectId` and `currentLayoutId` from the active
scene context. It is available only when both IDs resolve in the current project
list. The existing revision-code and notes prompts remain unchanged, including
the generated next revision code. A successful save creates a revision through
existing storage, refreshes projects, updates the active revision IDs, and
clears project dirty state. Modal list selection is never used as the save
target.

## Export Semantics

`project.exportJson` accepts the narrow optional payload
`{ projectId: string }`. A valid explicit ID wins; otherwise the active scene
project is exported. Existing JSON serialization, filename normalization,
browser download, and object URL cleanup are preserved.

## Import And Payload Acquisition

`project.importJson` requires `{ file: File }`. Its live binding reads and parses
the file, invokes the existing `importProject` storage function, refreshes the
App project list, and returns normalized operation evidence.

One visually hidden, always-mounted App input acquires the file. It performs no
storage access, JSON parsing, or project mutation. `ProjectManager` requests
this provider; the provider then invokes the canonical runtime command. Payload
acquisition therefore does not become a second execution owner.

Import does not load a revision, replace the scene, change active project IDs,
mutate Runtime Selection or history, or mark the current scene dirty.

## Rejected Alternatives

- Keeping command implementations in a modal lifecycle controller.
- Registering a second command bridge for Project Manager.
- Retaining local fallback save, export, or import implementations.
- Moving file parsing or storage mutation into the file-input provider.
- Automatically loading an imported project into the scene.

## Consequences

- Project commands remain contextually available while Project Manager is
  closed.
- Current and future command surfaces share one canonical runtime path.
- Project Manager keeps its transient browsing and management state without
  owning command execution.
- Project, layout, revision, export, import, and IndexedDB schemas remain
  unchanged.
- The persistent file provider can be reused by a future File menu without an
  additional command implementation.

## Verification Obligations

- Static tests reject lifecycle controller and local fallback patterns.
- Save tests prove active project/layout targeting and normalized failures.
- Export tests prove explicit-target precedence and active-project fallback.
- Import tests prove payload validation, failure normalization, and state
  invariance.
- Chromium tests execute save and export with the modal absent, verify selected
  modal export payloads, and verify one persistent import input without scene,
  selection, history, viewport, console, or page-error regressions.
