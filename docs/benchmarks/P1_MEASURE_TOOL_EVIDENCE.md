# C03 Professional Measure Tool - Benchmark Evidence

Status: Stage A, pre-implementation research. No AtrVisu runtime acceptance claim.
Review date: 2026-10-05.
Baseline: exact main `14d6f8086e1d868ea498b0c3f59d93c287843dac`.

## Method

Official documentation was researched before freezing the new Measure contract. Factory-layout measurement has the strongest task similarity; CAD measurement supplies complementary point, component and area precedents. The observations below are documentation observations, not hands-on vendor execution or invented screenshot evidence. No source establishes AtrVisu numerical tolerances, mouse arbitration, Level plane or implementation algorithm.

## 1. Visual Components - Measuring Components

- Product/generation: Visual Components Premium 5.1 official help.
- Official source: [Measuring Components](https://help.visualcomponents.com/5.1/Premium/en/English/3D%20Operations/Measuring_components.htm), measurement workflow and Display accuracy. Direct retrieval returned a cache miss; the indexed official page supplied the complete numbered workflow. Review date: 2026-10-05.
- BENCHMARK FACT: Measure is entered from Home/Tools. The workflow configures point picking, accepts a first point, previews a second, then confirms it. Results appear in the 3D world and Output panel. Escape or Close exits; display precision is configurable.
- Task similarity: measurement within an industrial equipment layout rather than editing equipment geometry.
- AtrVisu adoption: active viewport tool, preview before confirmation, viewport results and explicit exit.
- AtrVisu rejection/deviation: no Output-panel dependency, persistence, configurable precision project or claim of identical bindings. Fixed mm/degree presentation and transient lifetime are AtrVisu choices.
- Supplemental official source: [Take Measurements](https://academy.visualcomponents.com/lessons/take-measurements/), lesson for 4.0.2+. The published lesson outline lists XYZ/world-coordinate and picking options. The embedded video was not independently executed; its contents are not claimed as observed.

## 2. Autodesk AutoCAD - MEASUREGEOM

- Product/generation: AutoCAD Core 2026 official help.
- Official source: [MEASUREGEOM (Command)](https://help.autodesk.com/cloudhelp/2026/ENU/AutoCAD-Core/files/GUID-5D5B0EE1-DD90-47AE-8A55-642FBFF5E4E4.htm), Distance, Angle/Vertex and Area/Specify corner points. Review date: 2026-10-05.
- BENCHMARK FACT: Distance reports point separation and XYZ components. Vertex angle uses a vertex and two other points. Area/perimeter can be defined by corner points. Results use current units and dynamic tooltips; Quick is principally a 2D World-UCS plan workflow.
- Task similarity: engineering point sequences and plan quantities without creation of dimension entities.
- AtrVisu adoption: point distance plus world-axis deltas, a three-point angle, and explicitly Plan XY area/perimeter.
- AtrVisu rejection/deviation: no Quick automatic geometry inference, arc/volume/subtract-area modes, UCS editor, or persistent dimension objects. A-B-C ordering with B as vertex and an interior 0..180-degree angle are explicit AtrVisu decisions, not an attribution to AutoCAD's documented acute-angle wording. Enter/Finish completion is frozen by the AtrVisu contract, not inferred from CAD command prompts.

## 3. SOLIDWORKS - Using the Measure Tool

- Product/generation: SOLIDWORKS Design Help 2021.
- Official source: [Using the Measure Tool](https://help.solidworks.com/2021/english/SolidWorks/sldworks/t_using_the_measure_tool.htm), point-to-point, single-entity, XYZ and temporary suspension options. Review date: 2026-10-05. Direct opening returned a JS shell; the indexed official page supplied the workflow/option table.
- BENCHMARK FACT: Measure supports single entities and point-to-point, XYZ/coordinate options, graphics-area callouts and session history. Entity-pair measurement can report minimum separation. The documented Select action temporarily suspends measuring; interacting with Measure resumes it.
- Task similarity: read-only part/assembly interrogation with visible results and a distinct measurement interaction state.
- AtrVisu adoption: selected-entity dimension presentation, viewport callouts, and an explicit suspend/resume distinction between picking and navigation.
- AtrVisu rejection/deviation: no CAD topology, minimum-surface-distance promise, associative dimensions, sensor, session-history store or right-click Select binding. Pair results remain named canonical reference-point measurements, not SOLIDWORKS minimum-distance calculations.

## Convergence, differences and bounded product decisions

The evidence supports tool ownership, visible point confirmation/preview and results separate from model editing. It does not establish one universal camera binding or persistent lifetime. SOLIDWORKS suspension provides the interaction-family precedent for an explicit Pick/Navigate control; copying vendor mouse bindings would conflict with AtrVisu's existing LMB orbit and required MMB Pan.

ATRVISU PRODUCT DECISION, recorded before implementation in ADR-008 and Interaction Standard section 15:

- Pick owns LMB confirmations; Navigate suspends picking and enables the unchanged LMB orbit. MMB Pan and wheel zoom remain available in both. Review `5413470723` clarifies a Measure-only maximum radial 4 CSS px inclusive confirmation tolerance, DPR-independent and non-tunable in Stage B, with cancellation/capture semantics in contract section 4.1. It is not a vendor fact or existing classifier and never decides Pick-versus-Orbit. No new modifier binding, movement solver or hidden intent fallback is introduced.
- Geometry and Level Plane are separate visible point sources. Geometry misses do not become plane points. The latter uses an explicitly displayed active-Level FFL plane, not Floor thickness inference.
- Plan Area presentation captures Geometry first-confirmed-point world Z or the explicit Level Plane operation-start FFL, respectively. Those immutable presentation planes do not change Plan XY arithmetic/original operand Z or follow camera/Level observations. This review clarification is an AtrVisu decision, not a claim about benchmark projection behavior.
- Entry selection is read-only; measurement operands never replace Runtime Selection. One transient result/sequence exists until Restart, mode/source change or exit.
- Entity dimensions and pair reference readouts reuse canonical adapters/helpers. No fake imported-GLB edges, surface-clearance solver or duplicate diagnostic authority.
- Distance, angle and simple Plan polygons use fixed presentation/tolerances; invalid/self-intersecting inputs fail visibly. These rules are AtrVisu acceptance decisions, not vendor assertions.

## Provenance and stage boundary

The attached C03 task is synchronized into `docs/product/P1_MEASURE_TOOL_CONTRACT.md`. The Phase-1 Final Exit Gate is read-only at [PR #120 exact head](https://github.com/mtugur/AtrVisu/blob/0a8fb10c857921bfba02e72e89a31bb80b552a5f/docs/checklists/PHASE_1_FINAL_EXIT_GATE.md), section G/C03; it is not in this main baseline and is neither copied, fetched as a branch nor changed. Its PENDING state is not closed by this research.

Stage B requires independent governance review/merge and a separate implementation instruction. No new runtime screenshot, vendor video execution, Product Owner exploratory test or C03 runtime PASS is claimed here.
