# ADR-008: Workspace Preset Application and Control Staging

Status: **Accepted**

## Context

P1-D1 established one persisted `WorkbenchUiPreferences` authority for theme,
density, optional workspace identity, and compatibility-panel presentation.
P1-D2 must make real workspace and preference operations visible without
committing AtrVisu to the final Phase 1 dock composition before P1-E and P1-F.

## Decision

AtrVisu ships exactly two canonical Phase 1 workspace presets:

- `workspace.sales-layout`
- `workspace.layout-engineering`

Definitions are immutable, JSON-safe metadata in one registry. They reference
the maintained editor, current live compatibility panels, and maintained
command definitions. The registry rejects duplicate IDs, invalid schema data,
unknown editors, unavailable panels, and unknown commands.

`Current arrangement` is the compatibility state represented by an absent
`activeWorkspaceId`. Missing workspace identity never implicitly applies Sales
Layout. Existing P1-D1 users therefore retain their stored panel composition,
theme, density, dimensions, collapse state, order, and dock metadata.

Explicit workspace application uses one P1-D1 runtime transaction. It sets the
active workspace ID and preset density, opens the compatibility shell, and
changes only the `visible` flag of current live content panels. Theme and panel
size, order, dock, and content-panel collapse state are preserved. Hydrating a
valid workspace ID activates derived metadata without reapplying factory
visibility.

Theme changes retain workspace identity. A panel visibility override clears
workspace identity. A density override clears workspace identity only when it
differs from the active preset. Shell collapse and width changes do not clear
workspace identity.

Inspector mode, emphasized command IDs, and default editor ID are derived from
the active preset. They are not separately persisted. Command emphasis is
presentation-only and cannot change command ordering, availability, routing,
or execution. Inspector mode is exposed as shell metadata only; P1-E owns its
future semantic behavior.

The Application Bar contains one compact workspace trigger. Its non-modal
Workspace & View popover exposes native workspace, theme, density, and current
live content-panel controls. Panel labels come from the runtime panel
descriptors. Modal, planned/unbound, and shell entries are excluded.

Static workspace panel descriptors define only which compatibility content
panels are eligible for this surface and provide maintained labels. The
existing Runtime Panel Registry bridge remains authoritative for each eligible
panel's current binding, availability, and unavailable reason. Contextually
unavailable panels remain discoverable as disabled controls with an accessible
reason. Their persisted visibility, collapse, order, and dock values remain
unchanged until the live runtime context makes them available again.

ADR-007's `future-readonly` hydration status also governs this surface. The
Workspace & View trigger and popover remain inspectable, but every workspace,
theme, density, and panel preference control is disabled and described by the
existing P1-D1 warning. No second read-only state is introduced and the stored
future-version record is never rewritten, downgraded, or reset.

## Authority Boundary

ADR-007 remains authoritative for persistence, hydration, normalization,
failure policy, and the React provider. P1-D2 creates no second preference,
command, panel, editor, project, selection, history, viewport, or design-system
authority.

Workspace application cannot mutate projects, layouts, revisions, entities,
transforms, annotations, connections, groups, layers, viewpoints, Runtime
Selection, history, dirty state, camera state, editor identity, or Babylon
scene lifecycle.

## Staged Dock Composition

Persisted panel `order` and `dock` values remain valid future-facing metadata.
P1-D2 does not expose arbitrary ordering or docking controls because final
hosts do not yet exist. P1-F owns the Primary Dock, Secondary Dock, Bottom Dock,
Layout Explorer, and panel composition. P1-E owns schema-driven Inspector
semantics. Keeping these controls staged prevents dead UI and premature shell
commitment.

## Consequences

- Existing users start in Current arrangement without a reset.
- Workspace switching is explicit, deterministic, persisted, and reversible.
- Every hidden live panel remains recoverable from the same popover.
- Contextually unavailable panel options cannot create preference overrides.
- Future-version preference records produce an explicit read-only surface.
- Theme and density continue updating the single DesignSystemRoot in place.
- The compatibility right-panel shell remains the real current host.
- Manual visual acceptance is required because P1-D2 adds visible controls.

## Rejected Alternatives

- Automatically applying Sales Layout when workspace identity is absent.
- Storing workspace-derived Inspector or command metadata separately.
- Direct App state or localStorage writes from the control.
- A second panel-title or workspace persistence table.
- Shipping final dock/order controls before P1-F.
- Implementing the P1-E Inspector in this package.
