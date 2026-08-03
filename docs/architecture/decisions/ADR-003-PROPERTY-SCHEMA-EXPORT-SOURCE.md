# ADR-003: Property Schema as Inspector and Export Source

Status: **Accepted**

## Context

AtrVisu needs a scalable Inspector and consistent commercial outputs across
machine families. Family-specific property components and separate BOM/report
metadata would drift and multiply validation logic.

## Decision

A versioned, serializable Property Schema is the shared definition source for
future Inspector, BOM, and report paths. It contains localized section/field
metadata, stable data paths, supported primitive data types, units,
editability, requirements, declarative validation, and export mappings.

Complex engineering rules reference a registered `validatorId`. A schema may
not contain executable functions, `eval`, JavaScript expressions, embedded
interpreters, or React components. User-facing metadata uses localization keys.

Machine-family-specific Inspector components such as `RobotProperties`,
`FillerProperties`, or `PalletizerProperties` are prohibited. Family schemas
may differ in data while using the same generic renderer and validation model.

## Alternatives Considered

- One Inspector component per machine family.
- Independent metadata for Inspector, BOM, and reports.
- Validation functions serialized with schemas.
- A free-form expression or embedded rules DSL.

## Rejected Alternatives

Family components and duplicated metadata create drift. Serialized functions
are not portable or safe. A new expression language adds a security and
maintenance surface that is unnecessary for Phase 1.

## Consequences

- One definition can feed editing and commercial outputs.
- Schema validators are deterministic and runtime-independent.
- Complex logic requires an explicit validator registry in a later package.
- Schema versioning and migration become required governance.

## Migration Implications

P1-E will introduce the runtime validator registry and generic Inspector
contribution path. Existing property components migrate incrementally through
adapters; no current Inspector is replaced in P1-A. P1-G consumes the same
export mappings for BOM and report generation.

## Verification Obligations

- Duplicate section IDs, field IDs, and field paths fail validation.
- Invalid min/max, step, regex, allowed-values, and export mappings fail with
  stable paths and codes.
- Functions and other executable schema values are rejected without execution.
- Two machine-family fixtures validate through the same contract.
- BOM and report mappings validate without a second metadata definition.
