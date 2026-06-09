import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { AtrVisuLayout, PlacedMachine } from "../types/machine";
import type { BenchmarkOptions, BenchmarkResult, BenchmarkScenario, ScenePerformanceMetrics } from "../types/performance";
import {
  BENCHMARK_SCENARIOS,
  DEFAULT_BENCHMARK_OPTIONS,
  collectScenePerformanceMetrics,
  calculateElapsedMs,
  createBenchmarkMachines,
  createBenchmarkResult,
  createBenchmarkSnapshot,
  createBenchmarkSummary
} from "../utils/performanceBenchmark";

type PerformanceBenchmarkModalProps = {
  currentSnapshot: AtrVisuLayout;
  latestMetrics: ScenePerformanceMetrics | null;
  onApplyBenchmarkScene: (machines: PlacedMachine[]) => void;
  onRestoreScene: (snapshot: AtrVisuLayout) => void;
  onClearBenchmarkScene: () => void;
  onClose: () => void;
};

const sleep = (durationMs: number) => new Promise((resolve) => window.setTimeout(resolve, durationMs));

const nextFrame = () => new Promise<number>((resolve) => window.requestAnimationFrame(resolve));

const formatNumber = (value: number | null | undefined, digits = 1) =>
  typeof value === "number" && Number.isFinite(value) ? value.toFixed(digits) : "n/a";

export function PerformanceBenchmarkModal({
  currentSnapshot,
  latestMetrics,
  onApplyBenchmarkScene,
  onRestoreScene,
  onClearBenchmarkScene,
  onClose
}: PerformanceBenchmarkModalProps) {
  const [options, setOptions] = useState<BenchmarkOptions>(DEFAULT_BENCHMARK_OPTIONS);
  const [previousSnapshot, setPreviousSnapshot] = useState<AtrVisuLayout | null>(null);
  const [results, setResults] = useState<BenchmarkResult[]>([]);
  const [status, setStatus] = useState("Ready.");
  const [isRunning, setIsRunning] = useState(false);
  const latestResult = results[0] ?? null;
  const summary = useMemo(() => createBenchmarkSummary(results), [results]);
  const latestMetricsRef = useRef(latestMetrics);

  useEffect(() => {
    latestMetricsRef.current = latestMetrics;
  }, [latestMetrics]);

  const updateScenario = (scenarioName: BenchmarkScenario) => {
    setOptions({
      ...options,
      scenarioName,
      objectCount: BENCHMARK_SCENARIOS[scenarioName].objectCount
    });
  };

  const runBenchmark = async () => {
    if (isRunning) {
      return;
    }
    const confirmed = window.confirm("Run benchmark and temporarily replace the current scene? You can restore it afterward.");
    if (!confirmed) {
      return;
    }

    setIsRunning(true);
    setStatus("Generating objects...");
    const startedAt = new Date().toISOString();
    const generationStart = performance.now();
    const machines = createBenchmarkMachines(options);
    const savedSnapshot = previousSnapshot ?? currentSnapshot;
    setPreviousSnapshot(savedSnapshot);
    onApplyBenchmarkScene(machines);
    await nextFrame();
    await nextFrame();
    const generationTimeMs = calculateElapsedMs(generationStart, performance.now());

    setStatus("Settling scene...");
    const settleDelayMs = 450;
    await sleep(settleDelayMs);
    await nextFrame();

    setStatus("Sampling FPS...");
    const sampleDurationMs = 3000;
    const sampleStart = performance.now();
    const fpsSamples: number[] = [];
    let previousFrameTime: number | null = null;
    while (performance.now() - sampleStart < sampleDurationMs) {
      const frameTime = await nextFrame();
      const reportedFps = latestMetricsRef.current?.fps;
      if (previousFrameTime !== null) {
        const deltaMs = frameTime - previousFrameTime;
        if (deltaMs > 0) {
          fpsSamples.push(1000 / deltaMs);
        }
      } else if (reportedFps !== null && reportedFps !== undefined && Number.isFinite(reportedFps) && reportedFps > 0) {
        fpsSamples.push(reportedFps);
      }
      previousFrameTime = frameTime;
    }

    const benchmarkSnapshot = createBenchmarkSnapshot(machines);
    const snapshotMetrics = collectScenePerformanceMetrics(null, null, benchmarkSnapshot);
    const liveMetrics = latestMetricsRef.current;
    const metrics = {
      ...snapshotMetrics,
      ...(liveMetrics ?? {}),
      snapshotSizeBytes: snapshotMetrics.snapshotSizeBytes
    };
    const completedAt = new Date().toISOString();
    const warnings = options.objectCount >= 500 ? ["500 proxy objects is a stress scenario for v0.1."] : [];
    const result = createBenchmarkResult(
      options,
      generationTimeMs,
      fpsSamples,
      metrics,
      startedAt,
      completedAt,
      sampleDurationMs,
      settleDelayMs,
      warnings
    );
    setResults((current) => [result, ...current]);
    setStatus("Benchmark complete.");
    setIsRunning(false);
  };

  const restorePreviousScene = () => {
    if (!previousSnapshot) {
      setStatus("No previous scene snapshot is available.");
      return;
    }
    onRestoreScene(previousSnapshot);
    setStatus("Previous scene restored.");
  };

  const exportResults = () => {
    const payload = {
      appName: "AtrVisu",
      version: 1,
      exportedAt: new Date().toISOString(),
      browser: typeof navigator !== "undefined" ? navigator.userAgent : "unknown",
      summary,
      results
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `atrvisu-performance-benchmark-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-")}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const modal = (
    <div className="manager-backdrop" role="presentation">
      <section className="manager-dialog benchmark-dialog" data-testid="performance-benchmark-modal" role="dialog" aria-modal="true" aria-label="Performance Benchmark">
        <header className="manager-header">
          <div>
            <span className="panel-kicker">AtrVisu</span>
            <h2>Performance Benchmark</h2>
          </div>
          <div className="manager-context">
            <strong>{status}</strong>
            <span className={`manager-mode-badge${isRunning ? "" : " is-editable"}`}>{isRunning ? "Running" : "Optional"}</span>
          </div>
          <button data-testid="close-performance-benchmark" type="button" onClick={onClose}>
            Close
          </button>
        </header>

        <div className="benchmark-layout">
          <section className="benchmark-panel">
            <div className="manager-column-header">
              <span>Scenario</span>
              <strong>{options.objectCount} objects</strong>
            </div>
            <p className="benchmark-note">
              Diagnostic benchmark only. It temporarily generates proxy objects and does not enforce pass/fail FPS thresholds.
            </p>
            <label>
              <span>Object Count</span>
              <select
                value={options.scenarioName}
                onChange={(event) => updateScenario(event.target.value as BenchmarkScenario)}
              >
                {(Object.keys(BENCHMARK_SCENARIOS) as BenchmarkScenario[]).map((scenario) => (
                  <option key={scenario} value={scenario}>
                    {BENCHMARK_SCENARIOS[scenario].label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>Spacing (mm)</span>
              <input
                type="number"
                min="500"
                step="100"
                value={options.spacingMm}
                onChange={(event) => {
                  const spacingMm = Number(event.target.value);
                  if (Number.isFinite(spacingMm) && spacingMm > 0) {
                    setOptions({ ...options, spacingMm });
                  }
                }}
              />
            </label>
            <div className="benchmark-options">
              {([
                ["includeLabels", "Include labels"],
                ["includeCollisionCheck", "Include collision check"],
                ["includeMetadataBoxes", "Include metadata boxes"],
                ["randomRotation", "Random rotation"]
              ] as const).map(([key, label]) => (
                <label key={key}>
                  <input
                    type="checkbox"
                    checked={options[key]}
                    onChange={(event) => setOptions({ ...options, [key]: event.target.checked })}
                  />
                  <span>{label}</span>
                </label>
              ))}
            </div>
            <div className="benchmark-actions">
              <button className="primary-action" disabled={isRunning} type="button" onClick={runBenchmark}>
                Run Benchmark
              </button>
              <button type="button" onClick={onClearBenchmarkScene}>
                Clear Benchmark Scene
              </button>
              <button type="button" onClick={restorePreviousScene}>
                Restore Previous Scene
              </button>
              <button type="button" disabled={results.length === 0} onClick={exportResults}>
                Export Benchmark Result JSON
              </button>
            </div>
          </section>

          <section className="benchmark-panel">
            <div className="manager-column-header">
              <span>Latest Result</span>
              <strong>{latestResult ? latestResult.scenarioName : "None"}</strong>
            </div>
            {latestResult ? (
              <div className="benchmark-result-grid">
                <span>Object Count</span>
                <strong>{latestResult.objectCount}</strong>
                <span>Generation Time</span>
                <strong>{formatNumber(latestResult.generationTimeMs, 1)} ms</strong>
                <span>Sample Count</span>
                <strong>{latestResult.sampleCount}</strong>
                <span>Sample Duration</span>
                <strong>{formatNumber(latestResult.sampleDurationMs / 1000, 1)} s</strong>
                <span>Settle Delay</span>
                <strong>{latestResult.settleDelayMs} ms</strong>
                <span>Average FPS</span>
                <strong>{formatNumber(latestResult.averageFps)}</strong>
                <span>Min / Max FPS</span>
                <strong>{formatNumber(latestResult.minFps)} / {formatNumber(latestResult.maxFps)}</strong>
                <span>Meshes</span>
                <strong>{latestResult.meshCount}</strong>
                <span>Materials</span>
                <strong>{latestResult.materialCount}</strong>
                <span>Textures</span>
                <strong>{latestResult.textureCount ?? "n/a"}</strong>
                <span>Active Meshes</span>
                <strong>{latestResult.activeMeshCount ?? "n/a"}</strong>
                <span>Total Vertices</span>
                <strong>{latestResult.totalVertices ?? "n/a"}</strong>
                <span>Snapshot Size</span>
                <strong>{latestResult.snapshotSizeBytes} bytes</strong>
                <span>Warnings</span>
                <strong>{latestResult.warnings.length ? latestResult.warnings.join(" ") : "None"}</strong>
              </div>
            ) : (
              <p className="empty-selection">Run a benchmark to collect FPS and scene metrics.</p>
            )}
          </section>

          <section className="benchmark-panel">
            <div className="manager-column-header">
              <span>Session Results</span>
              <strong>{summary.runCount}</strong>
            </div>
            <div className="benchmark-history">
              {results.map((result) => (
                <article key={`${result.startedAt}-${result.scenarioName}`}>
                  <strong>{result.objectCount} objects</strong>
                  <span>Avg {formatNumber(result.averageFps)} FPS</span>
                  <small>{new Date(result.completedAt).toLocaleTimeString()}</small>
                </article>
              ))}
              {results.length === 0 ? <p className="empty-selection">No benchmark results yet.</p> : null}
            </div>
          </section>
        </div>
      </section>
    </div>
  );

  return createPortal(modal, document.body);
}
