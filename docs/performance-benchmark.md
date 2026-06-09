# Performance Benchmark v0.1

AtrVisu Performance Benchmark is an optional diagnostic tool for measuring scene scale before heavier modules are added.

It is not an optimization pass and it does not enforce CI pass/fail FPS thresholds in v0.1.

## How To Run

Open the right panel section:

```text
Performance Benchmark
```

Then choose a scenario:

- `50 proxy objects`
- `100 proxy objects`
- `200 proxy objects`
- `500 proxy objects`

Click `Run Benchmark`. AtrVisu will confirm before temporarily replacing the current scene.

Use `Restore Previous Scene` after the run to return to the saved pre-benchmark scene.

## Metrics

Benchmark results include:

- object count
- generation time
- average FPS
- minimum FPS
- maximum FPS
- sample count
- sample duration
- scene settle delay
- mesh count
- material count
- texture count when available
- active mesh count when available
- total vertices when available
- snapshot JSON size

Metrics are advisory. Different browsers, GPUs, laptops, power modes, display scaling, and open tabs can change results.

FPS sampling uses browser animation frames over the benchmark sample duration. The scene is given a short settle delay after object generation before sampling begins.

## Scenario Options

v0.1 uses lightweight generated proxy objects.

Options include:

- labels
- collision check
- metadata boxes
- random rotation
- spacing in millimeters

The result schema is designed so future benchmark runs can include repeated GLB models, mixed GLB/proxy scenes, label-heavy tests, and collision-heavy tests.

## Expectations

Suggested interpretation:

- `50` proxy objects: basic sanity check.
- `100` proxy objects: normal medium layout check.
- `200` proxy objects: should remain usable for proxy scenes.
- `500` proxy objects: stress territory for v0.1.

Large GLB models, labels, collision overlays, metadata boxes, and clearance/collision envelopes can all affect performance.

## Safety

Benchmark mode is user-triggered only.

It does not run during normal app startup. It captures the current layout snapshot before generating objects and offers restore.

Benchmark-generated scenes are not automatically saved as project revisions. Autosave is skipped while benchmark mode is active.

## Future Work

Potential future benchmark additions:

- GLB repeated model stress test
- mixed GLB/proxy test
- label stress test
- visual regression snapshots
- CI performance trend reporting
- per-feature performance comparisons
