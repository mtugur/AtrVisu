# ADR-009: Smart Asset Property Projection Authority

Status: **Accepted**

## Context

ADR-003 established Property Schema as the shared source for Inspector, BOM,
and report metadata. AtrVisu already stores typed smart-machine information in
`AtaraMachineData`, normalizes it through `normalizeAtaraMachineData`, and
preserves it in `MachineDefinition.ataraMachineData` and placed definition
snapshots. P1-E must make that data available generically without introducing
a second machine model, executable schema paths, or output-specific readings.

## Decision

The versioned Property Schema contract remains serializable metadata. Stable
field IDs declare localization keys, primitive value types, units, read/write
intent, declarative validation, and future BOM/report mappings. `text` joins
the existing number, string, boolean, and enum types. Optional description and
help keys are localization references. Schema content cannot contain React,
callbacks, expressions, an interpreter, or executable validation.

One runtime registry validates schemas before use. It rejects malformed current
schemas and gives unsupported future versions a distinct failure code. Every
runtime field must reference a registered accessor. Every custom validator,
unit, and localization key must also be registered. Duplicate schema,
property, accessor, or validator identities fail deterministically. After a
schema passes those checks, the registry creates and stores a detached,
recursively frozen canonical snapshot. Caller-owned arrays and objects are
never retained, and registry readers cannot mutate nested section, field,
validation, allowed-value, applicability, or export metadata after validation.

Accessors are explicit pure functions. The schema `path` remains descriptive
and export-facing metadata; it is never traversed or assigned dynamically.
The canonical projection combines a registered schema, a selected entity
source, registered accessors, current typed values, units, localization, and
validation into normalized section and field view models. Those view models,
including export mappings, are the single interpretation for the Inspector and
future P1-G commercial consumers. Validation remains structured and
presentation-neutral until projection; the projection resolves each issue's
presentation message with the same locale used for labels, values, and units.
Presentation components render that projected message and do not consult the
localization catalog independently.

The initial ATARA schema sits above the existing typed/normalized data. It
contains Identity, Physical, Capacity, Electrical, Pneumatic, Network, and
Maintenance Clearance groups. Known generic machine dimensions remain valid
source values. Absent ATARA values remain explicitly `Not available`; they are
never replaced with zero or plausible engineering data.

All initial smart-asset fields are read-only because AtrVisu does not yet have
a canonical smart-asset property mutation command/history path. Existing Plan
X, Plan Y, elevation, rotation, layer, duplicate, and delete controls retain
their existing authorities. A future writable property may become editable
only after its mutation path is registered through the relevant domain,
command, validation, history, and dirty-state authority.

## Unit and Validation Policy

Stored domain values remain in their existing canonical units. Formatters add
registered labels without conversion. Parsing accepts only explicit decimal
syntax and never strips unit text, accepts locale punctuation silently, or
coerces arbitrary strings through JavaScript number conversion.

Declarative validation produces structured issues with stable codes, severity,
property ID, and localization message key. The projected issue retains those
stable fields and adds its resolved presentation message. Complex rules may
call a pure registered validator by `validatorId`; unknown validator IDs
prevent schema registration.

## Compatibility Boundary

No project, layout, IndexedDB, or UI-preference schema version changes. Existing
libraries and snapshots continue through the current ATARA normalizer and
snapshot-first resolution policy. Babylon, selection, Editor Host, panels,
commands, history, and workspace authorities are unchanged. P1-F retains final
dock composition ownership; P1-G will consume the existing projected export
mappings rather than create independent BOM/report property metadata.

## Consequences

- One safe projection supplies localized Inspector and future commercial data.
- Registered schemas are detached immutable authority snapshots rather than
  caller-owned mutable metadata.
- Machine-family-specific property components remain prohibited.
- Missing engineering values are visible and auditable.
- Schema registration fails early for unsafe or incomplete metadata.
- Smart-asset writes remain staged until a correct mutation authority exists.
- The right Inspector gains semantic content without becoming the final P1-F
  workbench composition.

## Rejected Alternatives

- A second smart-machine data model beside `AtaraMachineData`.
- Reflection or writable dotted-string paths.
- Schema-embedded JavaScript, expressions, or a validation DSL.
- Separate Inspector, BOM, and report field definitions.
- Direct mutation of placed definitions or Babylon meshes from the Inspector.
- Invented fallback engineering values for missing data.

## Verification Obligations

- Contract, version, localization, unit, validation, registry, accessor, and
  projection tests remain deterministic.
- Caller and nested registered metadata mutation tests prove that successful
  registration cannot later bypass accessor, unit, localization, validation,
  applicability, or export-mapping checks.
- Projection and Inspector tests prove that validation presentation text is
  resolved once by projection while stable issue metadata remains intact.
- The ATARA schema has globally unique field IDs and valid export mappings.
- Chromium proves selection projection updates without App, Editor Host,
  Inspector, canvas, or scene lifecycle reconstruction.
- Read-only inspection changes neither history nor dirty state.
- Existing editable transform fields reject invalid input and continue through
  the existing history path for valid input.
- Console and page error collectors remain empty.
