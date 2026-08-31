# AtrVisu Premium Product Definition v1

Status: Normative Phase 1 exit contract

Date: 2026-08-18

## Product Standard

AtrVisu is a professional industrial-engineering workbench. Technical task
completion and green automation are necessary, but they do not by themselves
constitute premium product acceptance.

Phase 1 exit requires all of the following principles to hold:

1. Task completion alone does not equal premium UX.
2. Visible controls match the result a user naturally expects from their label,
   icon, tooltip, state, and placement.
3. The shell follows familiar CAD and engineering conventions.
4. Frequent actions are compact, icon-led, keyboard reachable, and
   discoverable; their accessible names never depend on the icon.
5. Advanced behavior uses progressive disclosure instead of crowding the main
   command surfaces.
6. A Library Asset is a canonical reusable definition. A Placed Instance is a
   project-owned occurrence and may carry project-specific presentation data.
7. Scene and entity actions execute through the existing canonical Command,
   Selection, Entity, History, Panel, Project, and Viewport authorities.
8. Developer and test surfaces do not leak into normal release UX.
9. Premium visual-language acceptance is mandatory before Phase 1 closure.
10. Final Phase 1 exit requires Technical, Semantic, Professional UX, and
    Visual Presentation gates to pass together.

## Information Architecture

The canonical application menu is:

`File / Edit / View / Insert / Arrange / Tools / Help`

The Application Bar is context-oriented: product identity, workspace,
project/layout/revision, command search, units, and saved state. Save Project is
projected once in the compact Quick Toolbar and remains available from File.
The toolbar is icon-only at desktop width, uses accessible names and tooltips,
and separates frequent commands without permanent group captions or card
chrome. At narrow widths Save, Undo, and Redo remain direct while the remaining
frequent commands move into one deterministic More surface. Escape closes the
surface and restores focus to its opener.

Arrange exposes common alignment, distribution, equal-gap, grouping, and
ungrouping commands. With two or more eligible entities selected, common
operations appear in a compact viewport context bar. An exact compatible pair
adds Connect & Snap and opens its existing selectors in a transient popover.
Advanced pair/anchor operations remain available through Arrange > Advanced
Alignment. Viewpoints is a first-class Primary Dock tab; Phase 1 renders no
Bottom Dock contribution or empty dock chrome. Keyboard
Nudge and placement-helper settings live with Precision Placement while
retaining the existing placement authority. The Inspector remains property and context oriented;
it does not own operational alignment, distribution, snap, duplicate, delete,
or clear-selection button stacks. Help is a real registered product surface
with Quick Start, real keyboard shortcuts, and restrained product/version
information.

## Semantic Decisions

- `Precision Placement Helpers` is the truthful label for the existing
  placement assistance. It is reached through Tools/Inspector and does not
  imply scene dimension graphics. A real viewport Measure tool remains PF-3
  work and is absent from the Quick Toolbar.
- `Ctrl+K` / `Cmd+K` opens a search projection of the existing Command Registry;
  the palette owns no commands or execution authority of its own.
- Renaming a placed machine changes its optional project-instance display name,
  never `MachineDefinition.name` or its stable library/BOM identity.
- Explorer, scene labels, Inspector, persistence, and commercial instance rows
  resolve the same placed-instance name with canonical definition fallback.
- A genuinely empty editor offers New Layout and Open Project
  through the existing `project.manager` command and Project Manager authority.
  Their ephemeral entry intent focuses the relevant create or existing-project
  workflow without mutating project data; neutral Project Manager entry remains
  available and no second project model or demo entity is created.
- Startup and autosave recovery share one central decision surface. Recovery
  availability and the current-session startup decision are separate concerns:
  persisted recovery may remain available after a project or layout is loaded,
  but it cannot re-overlay an accepted working layout. A valid recovery changes
  the surface to Resume, Open Project, New Layout, and the visually separated
  destructive action Discard recovery. No second recovery banner may compete.
- Viewpoints is a truthful panel toggle: it opens or activates the Viewpoints
  Primary Dock tab and collapses Primary Dock when repeated while active. Its
  pressed state is derived from actual Primary Dock and active-tab state.
- Machine scene-label identity is the placed machine instance. Renaming,
  Undo/Redo, cancellation, visibility changes, duplicate, delete, and restore
  must leave exactly one live label representation per labeled instance.
- Help is a living product contract. Every pull request that changes a visible
  command, workflow, or shortcut updates Help in the same change set. This is
  an engineering delivery rule and must not appear in customer-facing Help.

## Product Finish Sequence

1. PF-1 Interaction & Information Architecture
2. PF-2 Asset & Editing Experience
3. PF-3 Visual Engineering Language
4. PF-Exit Premium Phase-1 Exit Audit

PF-1 does not close Phase 1. PF-2 owns Asset Browser search, filtering,
favorites, recent assets, library import, custom variants, and release-library
hygiene. PF-3 owns scene dimensions and the final engineering visual language,
including grid, civil, lighting, material, hover, selection, and presentation
polish.
