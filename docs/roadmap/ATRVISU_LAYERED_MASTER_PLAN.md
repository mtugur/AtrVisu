# AtrVisu Layered Master Plan v3.0

Source authority: `AtrVisu_Master_Plan_v3_0.docx`

Source SHA-256:
`0ff97ed5c07213b1a875cd3ebdd498cc739c0f07eb35c48b9777cacf9bd58da7`

This file is a repository projection of the canonical Project Master Plan.
If this projection disagrees with the source document, the source plus
`docs/governance/MASTER_PLAN_PROJECTION.md` governs and this file must be
corrected.

## Phase 0 — Platform Foundation

Goal: establish the contracts and governance needed to grow without losing
features or coupling UI changes to engineering state.

Main deliverables:

- Command Registry
- Panel Registry
- Entity / Selection / Viewport contracts
- Feature Access Matrix
- contract tests
- no-red-console E2E

Transition condition:

- shell changes do not lose features;
- panel collapse/resize does not mutate scene/entity/camera behavior.

## Phase 1 — Layer 1 Sales Layout MVP

Goal: fastest commercial value: a CAD-nonexpert sales/pre-sales user can build
and present a simple layout during a customer meeting.

Main deliverables:

- professional shell;
- Library / Explorer / Inspector;
- smart asset metadata foundation;
- 2D / 3D output;
- BOM / Excel / PDF;
- presentation viewpoints.

Transition condition:

- a presentable layout and output package can be produced within 15 minutes.

Layer-1 acceptance also requires a simple packaging/palletizing line,
PDF/Excel/3D visual output, clean console, and bidirectional Explorer/scene
selection.

## Phase 2 — Layer 4 Platform Core

Goal: make Library, Explorer, Entity, Panel, Command and reporting behave as a
coherent platform rather than a single-screen demo. Phase 2 is the bridge from
the Sales Layout MVP to engineering-grade platform workflows.

Target duration: 12–20 weeks.

Main deliverables:

- Smart eCatalog maturity;
- group-as-assembly maturity;
- layer / zone maturity;
- collision / clearance report;
- layout templates;
- project / revision workflow.

Transition condition:

- sales and engineering packages are produced from one entity graph.

Phase-2 platform-core work must also preserve the integrated-platform direction:

- unified workbench with registry-backed feature access;
- smart assets carrying model + metadata + connectors + envelope + behavior
  readiness;
- 2D/3D consistency over the same entity graph;
- reports derived from entity data;
- viewpoints / annotations / issue-review workflow;
- bounded performance/scaling readiness;
- plugin/adapter extensibility without turning core into a monolith.

Phase 2 may prepare `simulationAdapter`, connector and behavior metadata, but
it does **not** implement the Phase-3 throughput/DES engine.

## Phase 3 — Layer 2 Throughput Simulation

Goal: make layout behavior measurable and repeatable.

Target duration: 16–24 weeks.

Main deliverables:

- flow primitives;
- deterministic DES runner;
- scenario manager;
- capacity / bottleneck report;
- replay timeline.

Transition condition:

- a simple cellular line can be simulated repeatably with the same input/seed
  producing the same result.

## Phase 4 — Layer 3 Selective Digital Twin

Goal: add a controlled subset of PLC/IO/kinematics/robot and virtual
commissioning capabilities after entity and simulation adapters are mature.

Target duration: 24–40 weeks.

Main deliverables:

- SignalBridge;
- IO matrix;
- simple state machine;
- sensor / actuator mapping;
- virtual commissioning test runner.

Transition condition:

- real or virtual signals can change entity state and produce a traceable test
  report.

Frontend does not become a PLC driver; external I/O remains bridge-based.

## Phase 5 — Layer 4 Mature Platform

Goal: integrate all layers into one stable product experience.

Target duration: 40+ weeks.

Main deliverables:

- performance scaling;
- plugin adapters;
- review workflows;
- advanced reports;
- AI/layout-assistant foundation.

Transition condition:

- the user experiences one stable product-quality platform across sales,
  engineering and later commissioning workflows.

## Cross-phase development priority

The Master Plan's durable order is:

1. platform contracts and Feature Access Matrix;
2. professional shell;
3. command system + shortcuts + clipboard;
4. Arrange tools v2;
5. smart asset standard;
6. reporting/output pipeline;
7. simulation adapters.

Simulation behavior is added only after the entity/asset platform is mature.
DES comes before high-fidelity physics; PLC/OPC integration comes after the
simulation and bridge abstractions are ready.
