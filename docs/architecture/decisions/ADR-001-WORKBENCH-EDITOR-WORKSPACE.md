# ADR-001: Workbench, Editor, and Workspace Boundaries

Status: **Accepted**

## Context

AtrVisu needs a professional workbench without repeating a monolithic shell
rewrite or coupling UI layout directly to Babylon scene ownership. Phase 1 also
needs editor and workspace concepts before runtime migration starts.

## Decision

The workbench has nine logical regions: application bar, menu bar, command bar,
primary dock, editor host, secondary dock, bottom dock, status bar, and overlay
layer. Docks are general-purpose panel hosts; a panel is not a dock.

A minimal serializable Editor metadata contract is introduced now. The first
runtime editor is `layout.3d`; P1-B adds a separate runtime Editor Host binding.
No multi-editor tab UI is introduced yet.

Workspace presets are declarative presentation/tool-density metadata. Initial
IDs are `workspace.sales-layout` and `workspace.layout-engineering`. Applying a
workspace must preserve domain data, Runtime Selection, history, dirty state,
and saved viewpoints.

## Alternatives Considered

- Keep `BabylonScene` as the permanent shell center.
- Implement nine fixed visible rectangles.
- Specialize the bottom dock for viewpoints.
- Ship multi-editor tabs immediately.
- Treat workspaces as project or entity filters.

## Rejected Alternatives

These alternatives either couple shell composition to rendering, narrow a
general host prematurely, expand P1-A into visible runtime work, or allow a
presentation preset to mutate domain state.

## Consequences

- Workbench metadata and runtime bindings remain separate.
- P1-B can migrate the shell by strangler steps without changing AppShell in
  P1-A.
- Docks can evolve independently from panel identity.
- Workspace application requires explicit invariance tests.
- Tabbed/multi-editor behavior remains future scope.

## Migration Implications

P1-B introduces the minimal Editor Host and binds `layout.3d` to the existing
viewport/scene path. It must preserve current AppShell anchors and all Phase 0
authorities. P1-C owns the Design System & Command Surfaces foundation:
semantic token implementation, light/dark/system theme infrastructure,
technical-palette governance, and registry-backed application/menu/command
surfaces. These foundations precede or accompany broader shell UI migration.
Later workbench regions and workspaces consume stable IDs only.

## Verification Obligations

- Canonical workbench metadata contains exactly nine unique regions.
- Editor metadata remains JSON-safe and callback-free.
- Workspace presets reference only editor, panel, command, Inspector, and
  density metadata.
- Runtime workspace tests prove no domain, selection, history, or dirty-state
  mutation before workspace switching ships.
