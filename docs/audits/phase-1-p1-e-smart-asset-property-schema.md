# Phase 1 P1-E Smart Asset and Property Schema Audit

## 1. Exact Baseline

- Repository: `mtugur/AtrVisu`
- Base: `main`
- Exact base SHA: `b2ae1eff0c75c5a4f294a1559629960d6b7fae27`
- Branch: `feat/phase-1-smart-asset-property-schema-v01`
- Package: one implementation PR; no micro-PR or separate documentation
  closure package.

## 2. Permanent Delivery Protocol

The root `AGENTS.md` now records the repository-wide one-package/one-PR norm,
logical commit policy, implement/review/correction/manual/merge loop,
agent-owned routine Git and validation, risk-based local gates, same-PR
documentation, exact-head CI, security-only visual acceptance boundary,
accepted-history protection, and preservation of existing platform
authorities.

## 3. Contract and Registry

The existing P1-A Property Schema contract is extended rather than replaced.
It supports schema version 1, stable sections and fields, localization and
optional description/help keys, number/string/boolean/enum/text values, unit
IDs, editability and required intent, min/max/step/pattern/allowed-values/custom
validator metadata, and BOM/report mappings.

Runtime registration rejects unsupported future versions distinctly from
malformed current metadata. Invalid static metadata, duplicate schema or field
IDs, missing accessors, unknown validators, unknown units, and missing
localization messages fail with stable codes. The registry executes no schema
path and no schema value is executable.

## 4. Projection Authority

`projectPropertySchema` is the only property interpretation. It accepts a
registered schema, selected entity source, accessor registry, validator
registry, localization, and unit metadata, then emits normalized schema,
section, and field view models. Raw values, formatted values, explicit missing
state, accessibility issues, editability, and export mappings remain together.

The generic `SchemaPropertyInspector` renders this projection. Future P1-G BOM
and report work must consume the same projection/export mappings rather than
introduce a second field table.

## 5. Existing Authority Reuse

- `AtaraMachineData` remains the smart-machine data model.
- `normalizeAtaraMachineData` remains the normalization authority.
- `MachineDefinition.ataraMachineData` and placed definition snapshots remain
  storage sources.
- Snapshot-first behavior and the existing newer-library warning are retained.
- Known dimensions use `getMachineDimensionsMm`.
- Existing transform, layer, lifecycle, command, history, dirty-state,
  selection, panel, viewport, Editor Host, and Babylon authorities are
  unchanged.
- No IndexedDB, project aggregate, layout serialization, package, or dependency
  version changed.

## 6. Canonical ATARA Coverage

The schema contains seven groups and 29 fields:

| Group | Fields | Source behavior |
| --- | ---: | --- |
| Identity | 7 | Manufacturer, ATARA flag, ATR ID, machine, family, PDN, revision codes |
| Physical | 5 | Width, depth, height, weight, operating weight |
| Capacity | 3 | Minimum, nominal, maximum with typed domain unit text |
| Electrical | 5 | Power, voltage, phase, frequency, current |
| Pneumatic | 3 | Pressure, consumption, connection size |
| Network | 1 | Protocol list |
| Maintenance Clearance | 5 | Front, back, left, right, top |

Missing values display `Not available`. No missing weight, utility, capacity,
or clearance value is converted to zero or synthesized. All fields are
read-only in P1-E because a canonical smart-property write command/history
authority does not yet exist.

## 7. Units, Localization, and Validation

The bounded English catalog resolves all schema labels, unit labels, unknown
state, booleans, and validation messages. Registered units format existing
canonical values only. Parsing rejects unit-bearing strings, comma decimals,
empty input, non-finite values, and unknown units without coercion.

Validation is pure and returns structured issues. Required, type, minimum,
maximum, step, pattern, allowed-values, and custom registered validators are
covered. Validation messages use localization keys and render through an
accessible live alert when present.

## 8. Inspector and Browser Evidence

The selected-machine surface keeps its existing transform controls and adds
the schema projection in the same Inspector. Component tests prove localized
groups, units, explicit unknown values, read-only fields, and in-place entity
updates. Chromium proves:

- selecting a machine renders the canonical schema and engineering units;
- selecting another placed machine updates the same Inspector DOM node;
- one App, Editor Host, canvas, and scene lifecycle generation remain;
- read-only selection/inspection changes no undo depth, redo depth, or dirty
  state;
- temporary invalid Plan X input changes neither transform, history, nor dirty
  state;
- valid Plan X input changes the selected entity through the existing update
  and history path;
- console-error and page-error collections remain empty.

## 9. Export Boundary

Every initial field carries stable BOM and report mapping keys in the same
projected view model. P1-E implements no BOM UI, Excel, PDF, quotation, or
report generation.

## 10. Validation Evidence

- Focused schema/ATARA/Inspector/P1-A validation: 5 files / 73 tests, passed.
- Focused Chromium schema Inspector: 1/1 passed.
- Dependency audit (`--audit-level=low`): 0 vulnerabilities, passed.
- Design-token governance: 217 maintained files, passed.
- Build: passed; the existing large-chunk warning remains non-blocking.
- Full unit: 129 files / 1147 tests, passed.
- Full E2E: 58/58, passed.
- `git diff --check`: passed.

## 11. Manual Visual Acceptance

Required after exact-head review because visible Inspector content changed.
Bounded scope:

- schema group hierarchy and density inside the existing right Inspector;
- label/value alignment and unit readability in light and dark themes;
- professional `Not available` presentation;
- selection transition between two machines without visual flicker;
- no regression to existing transform, layer, duplicate, delete, and adjacent
  diagnostics controls.

## 12. Decision

**READY FOR REVIEW AND EXACT-HEAD CI.** The complete local gate passes. Final
bounded manual visual acceptance remains required because the existing
Inspector now exposes visible schema-driven content. P1-F dock composition and
P1-G commercial outputs remain explicitly outside P1-E.
