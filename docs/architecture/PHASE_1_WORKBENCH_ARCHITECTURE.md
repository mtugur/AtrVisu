# Phase 1 Workbench Architecture

## 1. Status and Authority

Status: **Accepted for Phase 1 implementation**

This document is the canonical Phase 1 implementation architecture for
AtrVisu. It freezes the boundaries needed before production workbench-shell
migration begins. Changes to these decisions require a focused ADR and must
preserve all Phase 0 authorities and quality gates.

## 2. Relationship to Master Plan v3.0

`docs/roadmap/ATRVISU_LAYERED_MASTER_PLAN.md` remains the canonical product
roadmap and phase sequence. This document refines its existing Phase 1 without
renumbering or replacing any Master Plan phase.

## 3. Phase 0 Foundations That Remain Authoritative

Phase 1 extends, and does not duplicate or replace:

- Command Registry authority
- Panel Registry authority
- Platform Entity adapters
- ordered Runtime Selection authority
- Runtime Viewport contract and resize invariance
- Feature Access Matrix and runtime closure gate
- transaction-safe Undo/Redo
- atomic lock policy
- no-dead-UI coverage
- no-red-console quality gate

No Phase 1 shell, editor, dock, workspace, or schema may create a parallel
authority for these domains.

## 4. Phase 1 Business Objective

Phase 1 delivers a fast sales and quotation workbench that can produce a
customer-usable layout and output package in a meeting-scale workflow. The
architecture must support layout creation, presentation, commercial metadata,
and measured outputs while keeping engineering domain state stable.

## 5. Nine-Region Workbench Topology

The workbench has nine logical host regions:

1. `application-bar`
2. `menu-bar`
3. `command-bar`
4. `primary-dock`
5. `editor-host`
6. `secondary-dock`
7. `bottom-dock`
8. `status-bar`
9. `overlay-layer`

These are logical hosts, not nine permanently visible rectangles. Visibility,
collapse, resize, tabs, and persisted arrangement are future runtime concerns.
P1-A defines no new DOM or visible surface.

## 6. Region Responsibility Matrix

| Region | Responsibility | May host panels | Domain mutation authority |
| --- | --- | --- | --- |
| application-bar | Application identity and top-level application actions | No | None |
| menu-bar | Discoverable canonical command menus | No | Command Registry only |
| command-bar | Frequent canonical command surfaces | No | Command Registry only |
| primary-dock | General-purpose primary panel host | Yes | Panel content only through existing authorities |
| editor-host | Active editor runtime host | No | Editor binding delegates to existing authorities |
| secondary-dock | General-purpose contextual panel host | Yes | Panel content only through existing authorities |
| bottom-dock | General-purpose lower panel host | Yes | Panel content only through existing authorities |
| status-bar | Read-only status and bounded status actions | No | Command Registry only where actionable |
| overlay-layer | Modal, popover, and transient overlay host | Modal/tool surfaces | Existing panel/command authority only |

`primary-dock`, `secondary-dock`, and `bottom-dock` remain general-purpose.
Viewpoint Strip may later contribute to `bottom-dock`, but does not define it.

## 7. Editor Metadata and Runtime-Binding Separation

`EditorDefinition` is serializable metadata with stable identity, kind, and
localization keys. Supported kinds are `visual`, `document`, `table`, `report`,
and `analysis`. The first runtime editor is `layout.3d`.

Metadata must not contain React components, Babylon scene objects, class
instances, closures, or render callbacks. P1-B will introduce a separate
runtime binding and minimal Editor Host. The Workbench Shell will know the
Editor Host, not `BabylonScene` directly.

Multi-editor tabs, split panes, document history, editor drag/drop, and
specialized simulation or report editors remain later work.

## 8. Workspace Preset Model and Invariance Obligations

A workspace is a presentation and tool-density preset. Initial planned IDs:

- `workspace.sales-layout`
- `workspace.layout-engineering`

A preset may reference a default editor ID, initially visible panel IDs,
emphasized command IDs, Inspector mode, and optional density preference.

Applying a workspace must never mutate entities, transforms, layers, groups,
annotations, connections, saved viewpoints, Runtime Selection, history, dirty
state, project metadata, layout data, or revision data. A workspace is not a
project, layout, revision, editor, entity filter, permission system, or domain
mutation.

## 9. Panel and Dock Relationship

A dock is a general-purpose host region. A panel is a registered surface that
may be assigned to a compatible dock. The dock does not own panel identity,
availability, business state, or command execution.

Existing Panel Registry definitions remain authoritative. Future workbench
layout metadata may reference stable panel IDs and dock IDs, but may not create
a second panel registry or expose seed-only panels as live UI.

## 10. Project, Layout, Revision, UI Preference, and Session Boundaries

Domain/document data includes:

- project metadata, layouts, and revisions
- entities and transforms
- layers and groups
- annotations and connections
- saved viewpoints
- commercial-output source metadata

The existing `projects` aggregate store remains intact. Projects, layouts, and
revisions are not normalized into separate stores in Phase 1 architecture.

UI preferences include theme, density, active workspace ID, and panel
visibility, size, collapsed state, dock, and ordering. The future physical
storage direction is a separate `uiPreferences` store, but P1-A does not change
the IndexedDB schema or database version.

Ephemeral session state includes hover, active drag gesture, open menu, open
transient popover, temporary focus, uncommitted command interaction, and
transient pointer state. Selection and unsaved camera movement also remain
session/runtime state unless a separate explicit domain action persists them.
Saved viewpoints remain domain data inside layout/revision content.

## 11. Design Token Families

The semantic design-system contract defines:

- surface
- elevation
- text
- border
- interaction
- focus
- selection
- spacing
- typography
- control-size
- density
- icon-size
- semantic-status
- viewport-overlay
- technical-palette
- z-index

Components must eventually consume semantic tokens rather than owning
arbitrary raw presentation values.

## 12. Theme and Technical-Palette Policy

Theme IDs support `light`, `dark`, and `system`. Density IDs support `compact`
and `comfortable`. P1-A does not choose a final default theme, define CSS
variables, or implement switching.

Technical viewport colors are centrally governed. Safety, collision, axis,
warning, connection, and diagnostics colors may use a documented technical
palette. Generated assets, SVG source, fixtures, and explicitly allowlisted
technical constants may remain exceptions. A future color lint must support an
allowlist instead of blindly requiring zero hexadecimal strings.

## 13. Property Schema and Validation Model

The Inspector evolves toward generic schema contributions. A property schema
contains ordered sections with localization keys, applicability metadata, and
fields. Fields define stable IDs and paths, localized labels, data type, unit,
editability, requirement state, declarative validation, and export mappings.

Supported field types are `string`, `number`, `boolean`, and `enum`. Validation
supports required, min, max, positive step, regex pattern syntax,
allowed-values, and registered `validatorId` references.

Schema content is serializable. It contains no function, `eval`, JavaScript
expression, embedded interpreter, or executable validation body. Complex
engineering validation resolves through a separately registered validator ID.

Section IDs are schema-unique, field IDs are section-unique, and field paths
are globally unique. The same field definition may map to future Inspector,
BOM, and report paths. A second independent BOM metadata model is prohibited.

## 14. Localization Readiness

New user-facing metadata uses `titleKey`, `labelKey`, and `tooltipKey` where
applicable. IDs remain stable, language-neutral machine identifiers. P1-A does
not implement an i18n runtime or hardcode user-facing English labels into the
new metadata contracts.

## 15. Accessibility and Focus Ownership

Accessibility is implemented with each future component, not postponed to one
retrofit package. Component delivery must own the relevant semantics:

- menubar: menu roles, arrow navigation, Escape, and focus restoration
- toolbar: named controls, roving tabindex where appropriate, and shortcuts
- command palette: dialog semantics, search focus, Escape, and restoration
- tree: tree semantics, arrow navigation, expansion, and separate selection
- dialog: focus trap, initial focus, Escape policy, and opener restoration
- form/property grid: labels, errors, keyboard editing, and predictable order

Focus and domain selection are separate states. P1-A creates no UI and changes
no current accessibility behavior.

## 16. Commercial Output Obligations

Phase 1 cannot close without:

- BOM/Excel output
- customer-ready 3D snapshot
- basic measured 2D PDF

The measured PDF must include a top orthographic layout view,
project/customer/revision identity, millimetre units, layout bounding
dimensions, selected critical dimensions where supported, a title block, and a
scale or explicit "not to scale" declaration. It is not a complete CAD
dimensioning engine. Line-Flow is optional and cannot replace measured 2D
output. P1-A implements none of these outputs.

## 17. Future Extension Map

| Extension | Editor kind or host direction | Dependency boundary |
| --- | --- | --- |
| 2D Plan | visual/document editor | Viewport and domain adapters |
| BOM | table editor | Shared Property Schema export mappings |
| Report Preview | report editor | Shared Property Schema and project metadata |
| Simulation Results | analysis editor | Future deterministic simulation authority |
| Replay Timeline | bottom-dock panel or analysis editor | Future replay state |
| IO Matrix | table editor | Future connector/signal contracts |
| Signal Mapping | table/analysis editor | Future bridge contracts |
| Diagnostics | registered panel or analysis editor | Explicit diagnostic authority |

## 18. Dependency Rules

- Domain models must not import Workbench UI preferences.
- UI preferences may reference stable IDs but must not embed domain snapshots.
- Property schemas may describe paths but must not import React components.
- Editor metadata must not import `BabylonScene` or rendering components.
- Workbench contracts may reference stable IDs but not `App.tsx` state.
- Workspace presets may reference panel, editor, command, and density IDs only.
- Workspace presets must not contain entity, selection, transform, history,
  dirty-state, viewpoint, project, layout, or revision payloads.
- Existing Command, Panel, Entity, Selection, and Viewport systems remain the
  sole authorities for their domains.
- No duplicate registry or visible surface is introduced by P1-A.

## 19. Prohibited Patterns

- Workbench metadata containing React nodes or runtime callbacks
- Editor metadata importing or constructing Babylon scene objects
- UI preferences embedding project, layout, revision, entity, or viewpoint data
- workspace application mutating domain or transaction state
- machine-family-specific Inspector components such as `RobotProperties`
- executable functions, free-form expressions, or interpreters in schemas
- independent BOM metadata that diverges from Property Schema
- new ad-hoc command, panel, selection, entity, or viewport authority
- dead seed/placeholder controls exposed as current UI

## 20. P1-B Through P1-H Delivery Sequence

1. **P1-B Workbench Runtime Foundation**: minimal Editor Host, `layout.3d`
   runtime binding, and strangler shell boundary using these contracts.
2. **P1-C Workbench Navigation Surfaces**: registry-backed application/menu/
   command surfaces and accessibility behavior.
3. **P1-D Workspace and UI Preferences Runtime**: preset application with
   invariance checks and versioned `uiPreferences` persistence migration.
4. **P1-E Schema-Driven Inspector Foundation**: validator registry and generic
   Inspector contributions from Property Schema.
5. **P1-F Layout Exploration and Asset Workflow**: Layout Explorer and
   workbench panel composition without replacing existing authorities.
6. **P1-G Commercial Output Foundation**: shared BOM/Excel, measured 2D PDF,
   and customer-ready 3D snapshot paths.
7. **P1-H Phase 1 Integration and Exit Hardening**: end-to-end quotation flow,
   accessibility, performance, no-dead-UI, no-red-console, and exit audit.

Each package is independently reviewed and may be split further when risk
requires. The sequence does not authorize UI work in P1-A.

## 21. Phase 1 Exit Gates

- A sales-layout workspace supports the fast quotation workflow.
- Existing Phase 0 authorities remain singular and live.
- Workbench surfaces have no dead visible routes.
- Workspace switching preserves all domain, selection, history, and dirty state.
- UI preferences are versioned separately from project aggregates.
- Editor Host owns runtime editor bindings without embedding render callbacks
  in serializable metadata.
- Schema-driven Inspector and registered validators are operational.
- BOM/Excel, customer-ready 3D snapshot, and basic measured 2D PDF pass their
  output acceptance criteria.
- Accessibility and focus obligations are tested per delivered component.
- Build, unit, E2E, no-red-console, and exact-head CI gates pass.

## 22. Explicit Non-Goals for P1-A

P1-A does not modify AppShell, App, CSS, current panels, commands, selection,
viewport, Babylon behavior, IndexedDB schema, project models, Feature Access,
Undo/Redo, or any visible feature. It does not create Editor Host, menus,
command palette, themes, workspaces, UI preference storage, schema-driven
Inspector, or commercial outputs.

## 23. Migration Risks and Mitigations

| Risk | Mitigation |
| --- | --- |
| Parallel shell or registry authority | P1-B must adapt through existing Command, Panel, Selection, Entity, and Viewport authorities. |
| Domain data leaks into UI preferences | Contracts reference stable IDs only; validation rejects unknown domain-shaped fields where specified. |
| Editor metadata becomes runtime code | Metadata excludes render callbacks; runtime bindings are a separate P1-B concern. |
| Workspace changes mutate the layout | Invariance is a mandatory runtime and E2E gate before workspace switching ships. |
| Property metadata fragments by output | Inspector, BOM, and report share one schema and export mappings. |
| Storage migration corrupts projects | Current aggregate remains unchanged; future `uiPreferences` migration is separately versioned and tested. |
| Accessibility is deferred | Each UI package owns its keyboard/focus obligations and acceptance tests. |
| Phase 0 regressions during shell migration | Existing quality, authority, no-dead-UI, viewport, and no-red-console gates remain mandatory. |
