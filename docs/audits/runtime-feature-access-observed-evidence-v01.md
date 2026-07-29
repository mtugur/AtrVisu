# Runtime Feature Access Observed Evidence v0.1

Date: 2026-07-29

Baseline: `5e26b7f2db6dcbdc3cc75aab18b370541d1af15e`

## Scope

This package resolves Phase 0 blocker P0-B2 only. It does not repeat the Final
Phase 0 Exit Audit, close Phase 0, or begin Phase 1.

## Source Defect

The previous browser gate accepted a caller-provided
`surfaceExecution.verifiedCommandIds` array. The E2E suite supplied a manually
copied list of the representative command IDs before those commands had been
observed on that page. A disconnected visible route could therefore remain in
the copied list and falsely satisfy the complete gate.

That raw membership path has been removed.

## Canonical Required Commands

`FeatureAccessEntry.requiresSurfaceExecutionEvidence` marks the existing
required-runtime regression features whose representative commands require
browser execution evidence. The required command IDs are derived from
`platformFeatureAccessMatrix`, sorted deterministically, and checked against
the platform command seeds.

Derivation fails on duplicate command IDs or unknown command references.
Declared-planned features and quality signals are excluded. E2E reads the
derived IDs through the opt-in diagnostics report and keeps no copied canonical
array.

The current derived set contains 19 commands.

## Observation Structure

Each observation records:

- command ID
- diagnostics session ID
- attempt and execution counts before the visible action
- attempt and execution counts after the visible action
- the final shared `RuntimeCommandOperationResult`

An observation is created only when the command IDs match, the session is
current, attempt count increases by exactly one, execution count increases by
exactly one, and the final result is consistently `handled: true` with status
`executed`.

## Session Identity

The diagnostics App creates one random session ID per mounted diagnostics
session. It is stable for that mount and changes after reload. It is not stored
in project state, layout JSON, browser storage, or export/import data. The
normal URL exposes no Runtime Feature Access diagnostics global.

## Attestation Validation

The attestation source is fixed to `observed-runtime-probes`. Validation returns
machine-readable verified, missing, duplicate, stale, cancelled, failed,
attempted-only, unknown, and malformed command lists plus sorted reasons.

Duplicate observations are rejected rather than normalized. Empty and partial
attestations remain incomplete. Cancelled or failed attempts do not count as
execution. Observations from another diagnostics session are stale. Unknown or
malformed observations block the gate even if all required IDs are otherwise
present.

## Complete Gate Integration

The Runtime Feature Access report derives its required IDs and validates the
structured attestation for the current session. The complete gate consumes the
validation result and treats any failed attestation validation as a structural
failure. Raw copied IDs cannot satisfy this path.

No-red-console remains separate explicit evidence supplied by the browser test
harness. Production runtime does not assert that browser verification or
no-red-console succeeded.

The opt-in diagnostics bridge exposes only read operations, observation
validation/construction, and gate/report reads. It does not expose command
execution, registry mutation, React setters, or Babylon objects.

## Browser Closure Scenario

One clean diagnostics session reads the canonical required command IDs, proves
the gate initially fails, and invokes all 19 current representatives through
their visible UI routes:

- Undo, Redo, Delete Selected, and Duplicate Selected
- Add Machine, Add Annotation, and Add Civil Column
- Align Selection and Connection Point Snap
- measurement helpers, labels, and connection-point overlay toggles
- Library Manager, Taxonomy Manager, and Performance Benchmark
- Create Group, Edit Group, Exit Group Edit, and Ungroup

Each route captures before/after probes and verifies a corresponding state or
DOM outcome. The final attested ID set must exactly equal the canonical set
before the complete gate can pass.

Focused browser negatives cover empty evidence, partial observed evidence,
cancelled Delete evidence, and stale evidence after reload. Failed and malformed
observations are covered deterministically at unit level. Existing independent
route and P0-B1 cancellation tests remain intact.

## Validation

- `npm.cmd audit`: 0 vulnerabilities
- `npm.cmd run build`: passed
- `npm.cmd run test -- --run`: 96 files / 911 tests passed
- `npm.cmd run test:e2e`: 34 tests passed
- `git diff --check`: passed

The E2E runner started the current checkout's own server and released its
runner-owned port after completion.

## Assessment

P0-B2 is technically resolved in this package: complete Runtime Feature Access
can pass only from current-session observed successful probe transitions plus
explicit quality evidence.

Phase 0 is not closed. After this PR merges, the Final Phase 0 Exit Audit must
be repeated before any Phase 1 transition decision.
