# ADR-006: Registry-Backed Command Surfaces

Status: **Accepted**

## Context

P1-B established the workbench runtime boundary and PR #102 made project
commands modal-independent. P1-C needs visible Application, Menu, and Command
Bars without creating another command registry, execution owner, selection
model, panel authority, viewport authority, or project-import implementation.

## Decision

The existing Command Registry remains metadata authority. Existing core and
runtime-feature bridges remain the only execution owners. The
`commandSurfaces` package is a presentation adapter that:

- resolves labels, shortcuts, descriptions, and enablement from authoritative
  command definitions and live bridges;
- projects current Runtime Selection, primary selection, dirty state, and
  read-only pressed state into presentation models;
- routes one invocation to exactly one owning bridge;
- normalizes synchronous and asynchronous outcomes;
- exposes pending state and blocks ambiguous duplicate async execution;
- rejects unknown, unbound, unreachable, and unsupported placements;
- never calls registry seed `execute` functions.

The visible top-level menus are File, Edit, View, and Tools. Insert and Arrange
are absent because P1-C has no complete commands for those surfaces. The
Command Bar uses the accepted canonical order and does not introduce local
mutation callbacks.

## Project Import Boundary

`project.importJson` remains owned by the existing Runtime Feature Command
Bridge and requires `{ file: File }`. Its File-menu presentation reuses the
single persistent App-owned acquisition input established by PR #102. The
provider acquires a file and invokes the canonical bridge. Cancellation invokes
no command, duplicate acquisition is guarded, and no fallback parser, storage
owner, or second input exists.

## Accessibility And State

Menus and the Command Bar use roving focus, directional navigation, Home/End,
disabled reasons, pending state, pressed state, Escape restoration, and stable
named landmarks. Pressed state is derived from existing overlay settings and
is never a new source of truth.

## Consequences

- Toolbar, inspector, keyboard, modal, and new workbench surfaces can coexist
  while sharing canonical command ownership.
- Commands that need unavailable payload acquisition are not rendered.
- Opening menus and executing commands do not remount EditorHost or the Babylon
  scene.
- P1-A and P1-B contracts and PR #102 remain authoritative.

## Rejected Alternatives

- A command registry owned by the workbench chrome.
- Calling seed no-op definitions as runtime behavior.
- Direct state setters from menu or toolbar components.
- A second project import input or payload-inventing fallback.
- Placeholder Insert, Arrange, or coming-soon commands.
