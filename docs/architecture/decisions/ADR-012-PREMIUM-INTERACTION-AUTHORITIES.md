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

## Consequences

- Command and workbench metadata remains serializable and platform-safe.
- Toolbars can be icon-only while retaining accessible names and tooltips.
- Explorer, scene labels, Inspector, persistence, Undo/Redo, and commercial
  instance output reconcile through one project-owned value.
- Older layouts require no migration because the field is optional and retain
  canonical fallback behavior.
- PF-2 may extend instance data deliberately, but cannot move definition
  identity into the project display-name authority.
