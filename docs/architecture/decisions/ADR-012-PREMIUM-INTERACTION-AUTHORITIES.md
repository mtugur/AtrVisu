# ADR-012: Premium Interaction Metadata And Instance Naming Authorities

Date: 2026-08-18

Status: Accepted for PF-1

## Context

PF-1 needs recognizable command icons and a project-owned rename capability
without making registries React-specific or changing canonical library assets.
Both decisions cross menu, toolbar, Explorer, Inspector, scene, persistence,
and commercial-output boundaries.

## Decision

### Icon metadata

Serializable command metadata may contain only a stable string `iconId`.
`src/workbench/icons` is the single presentation resolver from `iconId` to a
React icon component. No registry seed stores JSX, React components, SVG nodes,
or callbacks.

PF-1 uses exactly `lucide-react@1.31.0` for recognizable line icons. The
package is ISC licensed, has no runtime dependency or native executable, and
declares no install lifecycle script. Internal engineering-specific glyphs may
be added only through the same resolver and governed visual contract.

### Placed-instance display name

`PlacedMachine.displayName` and its serialized `LayoutObject.displayName` are
optional project-instance presentation data. Name resolution is:

`placed instance displayName ?? canonical MachineDefinition.name`

`edit.renameSelected` is the history-backed mutation entry point for supported
machine, civil, and group entities. Machine rename does not mutate
`MachineDefinition.name`, `machineDefinitionId`, `libraryId`, or definition
snapshot identity. Annotation remains outside rename because its existing
product model has text rather than a separate display-name concept.

Commercial instance rows use the placed display name. BOM grouping and BOM
names continue to use canonical library/definition identity.

All project-facing placed-machine presentation resolves through
`getPlacedMachineDisplayName()`. This includes Explorer and scene labels,
single- and multi-selection Inspector content, precision measurement labels,
connection-snap roles, assembly members, annotation attachment targets,
collision presentation, and delete confirmation. Library, taxonomy,
definition snapshots, serialization identity, and BOM grouping continue to
read canonical definition data directly.

### Precision Placement helper command

`view.showMeasurements` remains the only command authority for the existing
`PlacementSettings.showMeasurementHelpers` value. It is available only with
exactly one supported selected machine. Enabling it opens the existing
`panel.precisionPlacement` contribution and reveals its helper controls;
disabling it hides those controls without requiring the contribution itself to
close. No second panel or measurement state is introduced.

The customer-facing label is `Precision Placement Helpers`. The command is a
Tools/Inspector placement aid, not a viewport Measure command. Until PF-3 adds
actual scene measurement graphics, no Measure command appears in the Quick
Toolbar.

### Compact command navigation and palette

At compact width, toolbar roving focus covers only directly visible Save, Undo,
and Redo commands. The native More disclosure remains an ordinary tab stop,
and its command buttons enter tab order only while the disclosure is open.
Escape closes the disclosure and restores focus to More. Desktop commands are
icon-only with stable accessible names and tooltips.

The Command Palette is a search projection of the existing Command Registry.
It resolves current enablement, disabled reasons, pressed state, metadata, and
execution through the same command-surface adapter as menus and the toolbar.
It introduces no palette-only command authority.

### Arrange and transient panel placement

Common multi-selection alignment, distribution, equal-gap, and grouping
operations are projected into a transient viewport context bar. Exact
compatible machine pairs expose Connect & Snap through the existing Runtime
Panel and command authorities. Premium compatibility means an eligible exact
two-machine selection with a deterministic `product-out -> product-in` pair;
same-type, load-only, and utility-only connectors remain outside the premium
surface. The existing snap mutation authority is unchanged. For two selected
objects the context bar omits distribution and equal-gap controls entirely;
those controls appear at three or more eligible objects. Advanced alignment
remains a registered modal tool surface. These operations are not Bottom Dock
contributions; Viewpoints is the only Phase-1 Bottom Dock utility.

At the 1024-class breakpoint, Inspector collapse is responsive presentation
state rather than a persisted UI preference. The Inspector starts out of the
way, may be opened explicitly for the current responsive presentation, and
restores the actual persisted desktop state when the viewport returns wide.
At 720 px and below, the Primary Dock follows the same authority split: it is
presentation-collapsed by default, may be reopened for the current narrow
session, and never overwrites the persisted desktop dock preference. Returning
wide restores that persisted preference.

The Connect & Snap popover owns a bounded scrolling body and a non-scrolling
action zone. Close and the primary Connect & Snap action remain in the visible
popover geometry while point selectors, gap, compatibility, and summary data
scroll internally when vertical space is limited. The Bottom Dock remains
closed by default and opens only through its existing runtime panel and UI
preference authorities; executed evidence must not pre-open it except for the
canonical Viewpoints state.

Inspector `PanelSection` headers reserve independent disclosure, one-line title,
and bounded badge columns. This presentation rule does not alter generic
expansion accessibility or panel state authority.
The absent-preset presentation label is `Custom Workspace`; the underlying
workspace identity and override policy remain unchanged.

## Consequences

- Command and workbench metadata remains serializable and platform-safe.
- Toolbars can be icon-only while retaining accessible names and tooltips.
- Explorer, scene labels, Inspector, persistence, Undo/Redo, and commercial
  instance output reconcile through one project-owned value; contextual tools,
  collision feedback, annotations, and confirmation copy use the same resolver.
- Older layouts require no migration because the field is optional and retain
  canonical fallback behavior.
- Precision Placement Helpers cannot report a pressed state without a selected-machine
  contribution capable of rendering its visible effect.
- Narrow Primary Dock and Inspector presentation changes do not mutate persisted
  desktop dock preferences or editor lifecycle state.
- Contextual Connect & Snap actions remain keyboard reachable at supported
  desktop and medium viewport sizes.
- PF-2 may extend instance data deliberately, but cannot move definition
  identity into the project display-name authority.
