# Runtime Feature Access Live Probe Attestation v0.1

Date: 2026-07-29

Baseline: `a1563127c3c68d3819dd0cf777a70acd6a473210`

## Scope

This package resolves Phase 0 blocker P0-B2R only. It does not repeat the Final
Phase 0 Exit Audit, close Phase 0, or begin Phase 1.

## Source Defect

The previous diagnostics boundary accepted caller-authored before and after
probe counters, command results, observations, and surface attestations. Its
shape and delta checks did not prove that the supplied values came from the
live `runtimeCommandExecutionProbesRef` store.

A diagnostics caller could therefore use the current session and canonical
command IDs, claim synthetic `0/0` to `1/1` probe transitions with an executed
result for all 19 commands, and obtain a passing complete gate while the live
probe store remained empty. This reproduces the unresolved PR #93 review
finding, "Bind attestations to the live probe store."

## Internal Authority

`RuntimeSurfaceExecutionAuthority` now owns the complete observation lifecycle:

- the current diagnostics session identity
- the sorted canonical required command IDs
- opaque pending tokens
- internally captured before probes
- direct reads from the live current probe store
- consumed-token and replay protection
- completed verified command IDs
- deterministic rejection records

The App creates one authority for each mounted diagnostics session. It is not
stored in project data, layouts, browser storage, export/import data, or React
business state. Unmount resets pending and completed evidence.

## Live Probe Binding

`beginObservation(commandId)` accepts only a canonical required-runtime command
and reads its before probe internally. Callers cannot provide or replace that
probe.

`completeObservation(token)` resolves the authority-owned pending record and
reads the after probe directly from the live probe store. Verification requires
exactly one additional attempt, exactly one additional execution, and a valid
final result with `handled: true` and status `executed`.

Zero or multiple attempt deltas, zero or multiple execution deltas, cancelled,
disabled, unavailable, unsupported, failed, malformed, or inconsistent results
cannot mint verified evidence.

## Token Lifecycle

Each begin request mints an opaque, unpredictable token bound to the current
session, canonical command ID, and internally cloned before probe. A token is
consumed on its first completion attempt, including rejected completion.

Forged, unknown, replayed, stale-session, duplicate-pending, and
duplicate-verified requests are rejected deterministically. Reloading creates a
new session and authority, so an old token cannot contribute evidence in the
new session.

## Authority Snapshot

The authority creates a frozen snapshot with:

- source `live-runtime-probe-authority`
- current session ID
- verified command IDs
- missing command IDs
- rejected command IDs and rejection details
- deterministic reasons
- complete or incomplete status

Verified IDs can originate only from authority-owned completed transitions.
The complete state requires the exact matrix-derived canonical set. Missing,
partial, rejected, duplicate, unknown, or stale evidence blocks completion.

Snapshot trust is bound to the internal authority provider rather than
TypeScript structural shape. A caller-created object with matching fields,
copied command IDs, or raw observations is not accepted as authority evidence.

## Diagnostics Boundary

The opt-in diagnostics bridge may:

- read the diagnostics session and canonical command IDs
- read current command probes
- begin a canonical observation
- complete an existing token
- read authority evidence status
- read the report and complete gate

It cannot execute arbitrary commands or submit before probes, after probes,
command results, observation objects, verified IDs, or surface attestations.
The gate accepts caller evidence only for the explicit no-red-console quality
signal; App adds the authority snapshot internally.

The normal URL continues to expose no Runtime Feature Access diagnostics
global.

## Browser Evidence

The positive browser scenario covers all 19 current canonical commands. For
each route it begins an authority observation, invokes the real visible UI
action, checks the expected DOM or state result, independently confirms the
live probe transition, and completes the token. The final verified IDs must
exactly equal the matrix-derived required IDs before explicit no-red-console
evidence can produce a passing complete gate.

Negative browser coverage proves:

- an empty live store and synthetic caller data cannot satisfy the gate
- fabricated tokens are rejected
- completion without execution is rejected and consumes the token
- partial genuine evidence remains incomplete
- cancelled Delete records one attempt and zero executions, then fails evidence
- completed tokens cannot be replayed
- tokens from a previous page session are stale after reload

All scenarios retain red-console and page-error checks.

## Validation

- `npm.cmd audit`: 0 vulnerabilities
- `npm.cmd run build`: passed
- focused Runtime Feature Access unit tests: 3 files / 42 tests passed
- `npm.cmd run test -- --run`: 97 files / 917 tests passed
- focused Runtime Feature Access E2E tests: 3 tests passed
- `npm.cmd run test:e2e`: 34 tests passed
- `git diff --check`: passed

The E2E runner started the current checkout's own server and released port 5173
after completion.

## Assessment

P0-B2R is technically resolved in this package. Browser surface-execution
evidence is now produced only by a current-session authority that verifies
internally captured transitions against the live runtime command probe store.
Caller-authored counters, results, observations, command ID lists, and
structurally matching snapshots cannot satisfy the App gate.

Phase 0 is not closed. After this package is accepted and merged, a new Final
Phase 0 Exit Audit remains mandatory before any Phase 1 transition decision.
