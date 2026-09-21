# ADR-001 — Phase-1 Direct Plan Body Drag

## Status

Accepted

## Context

AtrVisu Phase 1 needs immediate Plan placement for Machines, Civil references, Groups and independent multi-selection. The benchmark baseline favors explicit industrial-layout manipulators and treats body drag as a separate interaction family. PF-3A Correction B nevertheless produced a direct body-drag model that the product owner manually accepted for Group rigidity, continuous snapped movement and coherent high picked-point movement.

The accepted runtime behavior is represented by commit `0f215fd530316badccf5190b0459990b7ae1feb2`; exact head `37ec887c1b93514f298c6b9d9a8162a14b78c05c` adds only the Vitest advisory patch. Later attempts to compensate for high-elevation camera geometry introduced adaptive planes, camera-relative mapping, Jacobian/conditioning logic, fallbacks and finally an explicit PositionGizmo. Those approaches exceeded the correction budget and did not receive product acceptance.

The Product Constitution requires the repeated tuning loop to return to contract review. Review `5246282002` freezes the product decision below before runtime reconciliation.

## Decision

- Phase-1 canonical pointer Plan movement is direct Machine/Civil body drag.
- Pointer-down captures the actual finite Babylon picked point and creates one horizontal working plane, parallel to the floor, at that picked-point Elevation.
- The captured plane, anchor and entity start positions remain fixed for the complete gesture.
- Every movement frame uses only a forward ray intersection with that same plane to derive Plan X/Y delta.
- A frame without a finite forward intersection produces no movement update. No alternate solver or remapping is permitted.
- Plan movement never changes Elevation.
- Selected Group and multi-selection members receive one identical rigid Plan delta through canonical atomic movement authority.
- Canonical placement snap quantizes the delta. A snapped no-op keeps the gesture active.
- One drag gesture records at most one Undo transaction, on the first accepted mutation.
- Camera controls detach only during an active body drag and restore deterministically when the gesture ends or is rejected.
- Annotation drag remains a separate existing interaction authority.

## Accepted Known Limitation

At approximately 20 m Elevation, when the camera is near or below the captured horizontal plane, ray/plane geometry may become singular or make forward/back movement feel reversed. This is accepted for Phase 1 and is not a PF-3A blocker.

The runtime must remain finite and console-clean. It must not add a camera-facing plane, screen-space mapping, Jacobian solver, camera-relative sign correction, catch-up, gain clamp, hysteresis, smoothing or PositionGizmo fallback.

Future Level work may improve usability by changing spatial context or datum presentation. It may not silently change this pointer-mathematics contract. P1-BLD1, P1-BLD2 and PF-3B implementation remain outside this decision package.

## Consequences

- AtrVisu intentionally deviates from the explicit-manipulator preference recorded in `docs/benchmarks/INTERACTION_BENCHMARK_BASELINE_V1.md` for Phase 1.
- The deviation preserves the manually accepted rapid-layout workflow and removes the unaccepted adaptive/manipulator experiment.
- Camera geometry can limit high-elevation drag usability; this limitation is visible in product acceptance and must not be hidden with another movement model.
- Numeric placement remains the exact fallback for coordinates without becoming a second domain authority.
- Runtime selection, atomic lock evaluation, canonical millimetre coordinates, snap and history remain authoritative.

## Alternatives Considered

### Explicit PositionGizmo

Rejected for the Phase-1 rollback. It did not match the manually accepted Correction B interaction and failed later product acceptance.

### Adaptive camera-facing or screen-space drag

Rejected. It changes pointer mathematics according to camera state and requires hidden remapping/fallback behavior prohibited by the Product Constitution stop rule.

### Jacobian, conditioning and direction-correction solvers

Rejected. Repeated tuning introduced camera-specific repair logic without resolving the product interaction decision.

### Ground-plane-only drag

Rejected. It loses the accepted high grab-point behavior. The working plane must use the real picked-point Elevation.

## Tests / Validation

- Machine and Civil high-point body drag use one immutable floor-parallel plane and preserve Elevation.
- Group and multi-selection move rigidly with one identical Plan delta.
- Snap no-op does not end the gesture; movement continues across later snap cells.
- One body drag creates one Undo transaction.
- Locked Group/multi-selection movement remains atomic.
- The accepted approximately 20 m geometry limitation remains finite and console-clean without hidden fallback or remapping.
- Persisted preferences, Inspector Auto/Pinned, dock collapse/expand, drag, Undo/Redo and hard reload remain free of blocker console errors.
- No PositionGizmo/proxy Plan manipulator is rendered or required.
