# Data Model

## ATARA Machine Data

Machine definitions can optionally include `ataraMachineData`, described in [ATARA Machine Data Schema](./atara-machine-data-schema.md). This layer stores ATARA-specific engineering metadata such as identity fields, physical data, maintenance clearances, connection points, utility requirements, operational capacity, and engineering envelopes.

Generic `MachineDefinition` dimensions remain required for library compatibility and rendering. `ataraMachineData` enriches those definitions; it does not replace project/layout/revision storage or GLB visual model metadata.

This document describes the target future AtrVisu data model. The current app has not fully migrated to this model yet.

## Project

A project is the top-level container for a customer, site, or engineering study.

Target fields may include:

- `projectId`
- `name`
- `createdAt`
- `updatedAt`
- `layouts`

## Layout

A layout represents a factory arrangement within a project.

Target fields may include:

- `layoutId`
- `name`
- `revisionId`
- `levels`
- `objects`

## Revision

Revisions preserve layout history.

Target fields may include:

- `revisionId`
- `name`
- `createdAt`
- `objects`
- `notes`

## Levels

Levels describe floors or elevation planes.

Target fields:

- `levelId`
- `name`
- `elevationMm`
- `floorHeightMm`
- `visible`
- `locked`

## LayoutObjects

Layout objects are placed instances of machine definitions.

Future layout objects should support:

- `id`
- `levelId`
- `elevationMm`
- `positionMm`
- `rotationDeg`
- `machineDefinitionId`
- `definitionSnapshot`
- `collisionEnvelope`
- `clearance`
- `connectionPoints`

Selection state is not part of the layout data model. Multi-select state is transient UI state and should be cleared when loading/importing layouts or project revisions.

## MachineDefinition

Machine definitions describe reusable machines in a library.

Target fields include:

- `id`
- `name`
- `category`
- engineering dimensions in millimeters
- simplified visual model references
- `collisionEnvelope`
- `clearance`
- `connectionPoints`
- capabilities

## Definition Snapshot

Placed layout objects should keep a `definitionSnapshot` so old layouts remain stable if a library definition changes later.

## Envelopes And Connections

Engineering envelopes and connection points should be metadata-driven:

- `collisionEnvelope`
- `clearance`
- `connectionPoints`

Visual meshes are not the authoritative source for engineering dimensions or collisions.

