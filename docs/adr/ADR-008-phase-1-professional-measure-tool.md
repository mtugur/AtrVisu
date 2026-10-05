# ADR-008 - Phase-1 Professional Measure Tool

## Status

Proposed for independent Stage A governance review. No runtime implementation authorized by CI alone.
This is ADR-008 in the normative `docs/adr` series; the historical `docs/architecture/decisions/ADR-008-WORKSPACE-PRESET-APPLICATION-AND-CONTROL-STAGING.md` is a separate document and is not superseded.

## Context

Product UI Design Spec sections 2.4/5/10 require a real viewport Measure separate from Precision Placement. C03 in read-only PR #120 requires point distance/XYZ/Plan, angle, area/perimeter and active callouts. Main `14d6f8086e1d868ea498b0c3f59d93c287843dac` has no such tool; its legacy measurement command toggles persisted Precision Placement Helpers and its pair diagnostic is machine-only Plan reference measurement.

Official VC/AutoCAD/SOLIDWORKS precedents, facts and limitations were researched before this decision in `docs/benchmarks/P1_MEASURE_TOOL_EVIDENCE.md`. They support preview/confirmation, graphics results and a separate measuring state, but do not prescribe AtrVisu's existing LMB orbit/MMB Pan or canonical Level/domain units. SOLIDWORKS documents temporary suspension of measuring, not the exact AtrVisu navigation control.

## Decision

1. One transient viewport session with explicit Pick/Navigate. Pick LMB confirms operands, not selection/movement/orbit; Navigate LMB uses existing orbit without picking. MMB Pan and wheel remain available in both through unchanged camera authority. No new modifier, movement solver or tunable intent fallback. Baseline main has no reusable click classifier. Freeze a Measure-local classifier: maximum radial displacement from primary pointer-down <=4 CSS px including release, independent of DPR and elapsed time, confirms exactly once on same-pointer LMB up inside the viewport with a valid current preview. Crossing >4 latches cancellation even after returning; pointercancel, pre-up lost capture, focus loss, outside release or ownership/reset/exit changes abort, while normal post-up capture release preserves confirmation. Stationary/small-jitter presses are valid; cancelled Pick drags never become Orbit. Full event/cancellation oracle is contract section 4.1/M08. This tolerance is an explicit AtrVisu decision, not an existing runtime/vendor authority, and cannot be tuned during Stage B.
2. Entry/exit never changes camera implicitly. Deliberate navigation remains on exit; without navigation the prior camera is identical. Prior Runtime Selection stays authoritative/read-only. Tool operands are not a second selection source.
3. Geometry and displayed active-Level FFL Plane are explicit mutually exclusive sources. No miss-to-plane, inferred Floor support, snap-induced point relocation or fake GLB CAD topology.
4. Two-point world distance/signed XYZ/Plan, A-B-C interior angle with B vertex, simple Plan XY polygon area/perimeter, canonical single Machine/Civil dimensions and pair reference measurement satisfy the bounded obligation. Enter/Finish closes a valid polygon; Escape discards/exits immediately. Invalid arms/polygons report reasons, not fabricated results.
5. Reuse canonical dimensions/adapters/coordinate and existing machine-pair diagnostic arithmetic. Entity pair means named reference points, not a minimum surface-distance contract. No duplicate geometry/diagnostic authority.
6. Keep `view.showMeasurements` as Precision Placement Helpers. Stage B's new `view.measure`/`viewport.measure` registered route owns the real tool and Quick Toolbar surface; no dead UI or persisted-toggle alias. Stage A edits no command/feature/runtime record.
7. All tool data/results are transient and non-exported editor affordances. No history/dirty/schema or persistent associative annotation/dimension. Existing commercial capture suppression authority remains intact.
8. Plan Area presentation is source-specific and immutable per operation. Geometry captures first confirmed A's actual world Z; no projected polygon plane exists before A. Level Plane uses its explicit active-Level FFL captured once at operation start (source selection, Restart or kind change under Level Plane), never recaptured at A. All projected polygon/rubberband vertices use that captured Z while original hit XYZ and Plan XY calculations remain unchanged. Camera or later Level observations cannot move it; explicit reset discards it and follows the same capture rule. No Ground/active-Level inference for Geometry or hidden fallback. Contract section 6/M05 records both plane authorities, capture timing and differing-Z fixtures.

## Alternatives considered and rejected

- Rename the legacy command or toggle Inspector visibility: conflates precision helpers with viewport Measure and risks preference/compatibility changes.
- Use LMB for picking and orbit simultaneously: ambiguous point confirmation, camera movement or selection changes. A hidden click/drag tuning pass is not the measurement mental model.
- Claim an existing click classifier or accept every pointer-up/browser click: the baseline supplies neither the required tolerance nor cancellation authority. The frozen 4 CSS px boundary protects human jitter only inside Pick, never arbitrates navigation or modifies ordinary selection/Plan Move.
- Put every Geometry Plan polygon on an unspecified active-Level plane: differing-Z geometry would acquire hidden presentation semantics. First confirmed Z is deterministic and operand-owned; explicit Level Plane retains its separately displayed FFL authority.
- Copy VC/SOLIDWORKS mouse bindings globally: conflicts with frozen AtrVisu navigation and ADR-001. An explicit tool-local suspension preserves existing gestures.
- Restore the entry camera on exit after deliberate navigation: unexpected jump unrelated to measurement; preservation means no tool-induced camera mutation, not undoing navigation.
- Infer an empty-space plane or object support from Floor/Level geometry: changes user intent and creates another elevation authority.
- Claim SOLIDWORKS minimum-distance/topological edges from arbitrary GLB meshes or rotate dimension readouts into world AABB values: untruthful engineering meaning.
- Persist annotations, measurement history or CAD constraints: Phase 2, not C03.

## Consequences, validation and sequencing

The compact Pick/Navigate control is an intentional bounded difference from vendor bindings. It costs one explicit tool-state action to orbit but prevents overlapping selection/move/pick ownership; pan/zoom need no suspension. Values stay in domain mm/degree and reproject, never derive from display pixels after confirmation.

`P1_MEASURE_TOOL_CONTRACT.md` sections 7-8 own exact tolerances, M01-M10 real-input scenarios, lifecycle/state invariants and evidence. Tests must observe those behaviors, not approve a particular renderer algorithm. A helper-only result, baseline CI or a screenshot without source/input provenance cannot certify runtime compliance.

Governance review/merge precedes a separately authorized Stage B package. This ADR and section 15 are proposed contract changes made before runtime, not retrospective code justification. Stage A Automation Green is repository/governance CI only; Contract Verified PENDING; Product Accepted N/A for these documents and PENDING for runtime. No Product Owner exploratory/manual request or PR #120 acceptance change.

Independent review `5413470723` requested this one bounded Stage-A clarification of missing click classification and Geometry area-plane authority. No runtime correction or benchmark fact is added. Stationary/jitter/boundary/cancel/DPR real-input coverage and both source-specific presentation-plane observations are mandatory future M08/M05 evidence, not executed Stage-A results.
