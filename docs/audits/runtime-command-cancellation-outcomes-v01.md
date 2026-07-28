# Runtime Command Cancellation Outcomes v0.1

## 1. Scope And Baseline

This correction addresses only Phase 0 blocker P0-B1 from
`phase-0-final-exit-v01.md`.

| Field | Value |
| --- | --- |
| Date | 2026-07-28 |
| Branch | `fix/runtime-command-cancellation-outcomes-v01` |
| Baseline | `0f6324d3ca3d2aba4f3a83e9358129ccc33b44e6` |
| Commands | `edit.deleteSelected`, `assembly.ungroup` |
| Scope | Final operation-result propagation, diagnostics probes, and regression evidence |

P0-B2, Feature Access evidence aggregation, and Phase 1 work are explicitly out
of scope. The historical final-exit audit remains unchanged.

## 2. Source Defect

The Core Editor and Assembly Runtime Command bridges previously accepted
`void` callbacks. Once enablement passed, each bridge invoked the callback and
created a successful result independently of the domain outcome.

Both Delete and Ungroup contain confirmation dialogs. Rejecting either dialog
returned from the callback without mutation, but the bridge and App diagnostics
still recorded the command as handled and executed. The callback's final domain
outcome was therefore not authoritative.

## 3. Shared Result Contract

Core Editor, Assembly, and Runtime Feature commands now share one operation
result contract:

```ts
type RuntimeCommandOperationResult = {
  handled: boolean;
  status:
    | "executed"
    | "cancelled"
    | "disabled"
    | "unavailable"
    | "unsupported"
    | "failed";
  reason?: string;
};
```

The shared normalizer validates the shape and status, derives `handled` from the
status, and rejects malformed results deterministically. Only `executed`
normalizes to `handled: true`. Synchronous callback errors continue to
propagate. Runtime Feature command Promise completion and rejection behavior is
preserved while using the same normalizer.

Direct registry execution remains protected by current enablement checks and
cannot fall back to seed no-op execution.

## 4. Delete Outcome

`edit.deleteSelected` now returns the final domain result through the Core
Editor bridge and App unchanged.

- Rejecting machine or civil confirmation returns `cancelled` with
  `handled: false`.
- Accepting confirmation performs the existing deletion and cleanup once,
  records one history transaction, and returns `executed`.
- Civil and annotation deletion return `executed` only after their mutations.
- Missing, stale, locked, or otherwise noneligible targets return
  `unavailable` or remain disabled before callback invocation.
- Locked entities retain the existing eligible-unlocked Delete policy.
- Cancelled Delete performs no object, annotation attachment, group membership,
  selection, history, or dirty-state mutation.
- Keyboard Delete derives browser handling from `result.handled`; cancellation
  is not treated as a successful shortcut execution.

## 5. Ungroup Outcome

`assembly.ungroup` now returns the final domain result through the Assembly
bridge and App unchanged.

- A missing or stale group returns `unavailable`.
- Rejecting confirmation returns `cancelled` with `handled: false`.
- Accepting confirmation removes the group once, preserves member objects and
  transforms, records one history transaction, restores member selection once,
  and returns `executed`.
- An unexpected empty ungroup helper result returns `unavailable`, never
  `executed`.
- Other assembly commands retain their existing enabled execution behavior and
  now report explicit `executed` results.

## 6. History And Dirty-State Invariants

Confirmation is evaluated before `markLayoutChanged` and before any state
setter. A rejected operation therefore cannot:

- push an Undo snapshot;
- clear Redo history;
- mark the project dirty;
- alter selection;
- alter machines, civil references, annotations, groups, or member transforms.

Accepted Delete and Ungroup paths call the existing history boundary once.
Browser regression coverage verifies that one Undo restores the accepted
operation without a duplicate transaction.

## 7. Diagnostics Probe Semantics

The App now records the exact normalized bridge result. Probe updates use the
shared result semantics:

- every invocation increments `attemptCount` once;
- only `handled: true` / `status: "executed"` increments `executedCount`;
- cancellation leaves `executedCount` unchanged;
- `lastResult` records the exact final status and deterministic reason.

The command probes remain diagnostics-only and read-only. They are exposed only
when `?e2eDiagnostics=1` is present. The normal URL continues to expose no
diagnostics globals and no arbitrary command execution surface.

## 8. Automated Evidence

Deterministic unit coverage verifies:

- handled semantics for every operation status;
- invalid-result rejection and inconsistent handled normalization;
- confirmed-operation cancellation and single accepted invocation;
- cancelled and accepted probe counting;
- Core disabled, cancelled, accepted, unavailable, replacement-binding,
  direct-registry, and error behavior;
- Assembly disabled, cancelled, accepted, unavailable, replacement-binding,
  direct-registry, and error behavior;
- Runtime Feature synchronous and Promise behavior after sharing the result
  normalizer.

Browser coverage verifies:

- visible Delete cancellation preserves machines, selection-facing properties,
  Undo availability, and records `attempt +1 / executed +0 / cancelled`;
- keyboard Delete cancellation uses the same canonical command and result;
- accepted Delete removes one object and one Undo restores it;
- cancelled Ungroup preserves group identity, selection, two members, member
  transforms, and Undo availability while recording the cancelled probe;
- accepted Ungroup removes the group once, preserves members and transforms,
  records executed once, and one Undo restores the group;
- no red console or page errors occur in these flows.

## 9. Validation

| Command | Result |
| --- | --- |
| `npm.cmd audit` | Passed; 0 vulnerabilities |
| `npm.cmd run build` | Passed; Vite large-chunk advisory only |
| `npm.cmd run test -- --run` | Passed; 95 files / 881 tests |
| `npm.cmd run test:e2e` | Passed; 32 tests |
| `git diff --check` | Passed; line-ending advisories only |

The E2E runner started the current checkout's server on
`http://127.0.0.1:5173/` and released the port after completion. No unrelated
server process was stopped or reused.

## 10. Assessment

P0-B1 is technically resolved at this branch baseline: cancelled Delete and
Ungroup operations are no longer reported, counted, or treated as executed, and
accepted operations retain their existing single-mutation behavior.

This assessment does not close Phase 0. P0-B2 remains unresolved and requires
its own bounded correction package and a later final exit audit.
