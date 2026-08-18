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

The frequent command bar is icon-led. It preserves Save, Undo, Redo,
Duplicate, Delete, Measurement Helpers, Labels, Connection Points, and
Viewpoints. Textual project, layout, revision, and dirty-state context remains
in the Application Bar.

Arrange exposes common alignment, distribution, equal-gap, grouping, and
ungrouping commands. Pair alignment and other detailed settings remain in
Alignment Tools. Help is a real registered product surface with Quick Start,
real keyboard shortcuts, and restrained product/version information.

## Semantic Decisions

- `Measurement Helpers` is the truthful Phase 1 label for the existing
  precision-placement measurements. Scene dimension graphics are not implied.
- Renaming a placed machine changes its optional project-instance display name,
  never `MachineDefinition.name` or its stable library/BOM identity.
- Explorer, scene labels, Inspector, persistence, and commercial instance rows
  resolve the same placed-instance name with canonical definition fallback.
- A genuinely empty editor offers Create New Layout and Open Existing Project
  through the existing `project.manager` command and Project Manager authority.
  Their ephemeral entry intent focuses the relevant create or existing-project
  workflow without mutating project data; neutral Project Manager entry remains
  available and no second project model or demo entity is created.

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
