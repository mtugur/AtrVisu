import type { Engine, Scene } from "@babylonjs/core";
import type { AtrVisuLayout, MachineDefinition, PlacedMachine } from "../types/machine";
import type {
  BenchmarkOptions,
  BenchmarkResult,
  BenchmarkRunSummary,
  BenchmarkScenario,
  ScenePerformanceMetrics
} from "../types/performance";
import { COORDINATE_REFERENCE_VERSION, LAYOUT_REFERENCE_POINT } from "./coordinateReference";
import { createLayoutSnapshotFromMachines } from "./layoutSerialization";
import { mmToMeters } from "./units";

export const BENCHMARK_SCENARIOS: Record<BenchmarkScenario, { label: string; objectCount: number }> = {
  "proxy-grid-50": { label: "50 proxy objects", objectCount: 50 },
  "proxy-grid-100": { label: "100 proxy objects", objectCount: 100 },
  "proxy-grid-200": { label: "200 proxy objects", objectCount: 200 },
  "proxy-grid-500": { label: "500 proxy objects", objectCount: 500 }
};

export const DEFAULT_BENCHMARK_OPTIONS: BenchmarkOptions = {
  scenarioName: "proxy-grid-50",
  objectCount: 50,
  useProxyObjects: true,
  useExistingLibraryDefinitions: false,
  includeLabels: true,
  includeCollisionCheck: true,
  includeMetadataBoxes: false,
  spacingMm: 1800,
  randomRotation: false
};

export const estimateJsonSizeBytes = (data: unknown) => {
  const json = JSON.stringify(data);
  if (typeof TextEncoder !== "undefined") {
    return new TextEncoder().encode(json).byteLength;
  }
  return json.length;
};

const safeFpsSamples = (samples: number[]) => samples.filter((sample) => Number.isFinite(sample) && sample >= 0);

export const calculateAverageFps = (samples: number[]) => {
  const safeSamples = safeFpsSamples(samples);
  return safeSamples.length === 0
    ? 0
    : safeSamples.reduce((total, sample) => total + sample, 0) / safeSamples.length;
};

export const calculateMinFps = (samples: number[]) => {
  const safeSamples = safeFpsSamples(samples);
  return safeSamples.length === 0 ? 0 : Math.min(...safeSamples);
};

export const calculateMaxFps = (samples: number[]) => {
  const safeSamples = safeFpsSamples(samples);
  return safeSamples.length === 0 ? 0 : Math.max(...safeSamples);
};

export const calculateElapsedMs = (startedAtMs: number, completedAtMs: number) => {
  if (!Number.isFinite(startedAtMs) || !Number.isFinite(completedAtMs)) {
    return 0;
  }
  return Math.max(0, completedAtMs - startedAtMs);
};

export const createBenchmarkGridPositions = (objectCount: number, spacingMm: number) => {
  const safeCount = Math.max(0, Math.floor(objectCount));
  const safeSpacing = Number.isFinite(spacingMm) && spacingMm > 0 ? spacingMm : DEFAULT_BENCHMARK_OPTIONS.spacingMm;
  const columns = Math.max(1, Math.ceil(Math.sqrt(safeCount)));
  const rows = Math.max(1, Math.ceil(safeCount / columns));
  const originX = -((columns - 1) * safeSpacing) / 2;
  const originY = -((rows - 1) * safeSpacing) / 2;

  return Array.from({ length: safeCount }, (_, index) => ({
    xMm: originX + (index % columns) * safeSpacing,
    yMm: originY + Math.floor(index / columns) * safeSpacing
  }));
};

const padObjectIndex = (index: number) => String(index + 1).padStart(3, "0");

export const createBenchmarkMachines = (options: BenchmarkOptions): PlacedMachine[] => {
  const positions = createBenchmarkGridPositions(options.objectCount, options.spacingMm);
  const definition: MachineDefinition = {
    id: "benchmark-proxy-object",
    name: "Benchmark Proxy Object",
    category: "Benchmark",
    machineType: "Benchmark Proxy",
    placeholderVisualType: "box-generic",
    widthMm: 1200,
    depthMm: 800,
    heightMm: 1200,
    width: 1.2,
    depth: 0.8,
    height: 1.2,
    defaultColor: "#7fb7ff",
    connectionPoints: [],
    collisionEnvelope: {
      widthMm: 1200,
      depthMm: 800,
      heightMm: 1200,
      offsetMm: { xMm: 0, yMm: 0, zMm: 0 },
      enabled: true
    },
    capabilities: {
      canConvey: false,
      canPalletize: false,
      canWrap: false,
      hasFlowDirection: false,
      collisionRelevant: true
    }
  };

  return positions.map((position, index) => {
    const rotationDeg = options.randomRotation ? (index * 37) % 360 : 0;
    return {
      instanceId: `benchmark-object-${padObjectIndex(index)}`,
      libraryId: "benchmark",
      machineDefinitionId: definition.id,
      definitionSnapshot: {
        ...definition,
        id: `benchmark-proxy-object-${padObjectIndex(index)}`,
        name: `Benchmark Object ${padObjectIndex(index)}`
      },
      definition: {
        ...definition,
        id: `benchmark-proxy-object-${padObjectIndex(index)}`,
        name: `Benchmark Object ${padObjectIndex(index)}`
      },
      position: {
        x: mmToMeters(position.xMm),
        z: mmToMeters(position.yMm)
      },
      positionMm: position,
      referencePoint: LAYOUT_REFERENCE_POINT,
      coordinateReferenceVersion: COORDINATE_REFERENCE_VERSION,
      elevationMm: 0,
      rotationDeg,
      rotationY: rotationDeg,
      flowDirection: "forward" as const
    };
  });
};

export const collectScenePerformanceMetrics = (
  scene: Scene | null,
  engine: Engine | null,
  snapshot?: AtrVisuLayout
): ScenePerformanceMetrics => {
  const meshes = scene?.meshes ?? [];
  const totalVertices = meshes.reduce((total, mesh) => {
    try {
      return total + mesh.getTotalVertices();
    } catch {
      return total;
    }
  }, 0);

  return {
    fps: engine ? engine.getFps() : null,
    meshCount: meshes.length,
    materialCount: scene?.materials.length ?? 0,
    textureCount: scene?.textures?.length ?? null,
    activeMeshCount: scene?.getActiveMeshes?.().length ?? null,
    totalVertices,
    snapshotSizeBytes: snapshot ? estimateJsonSizeBytes(snapshot) : 0
  };
};

export const createBenchmarkResult = (
  options: BenchmarkOptions,
  generationTimeMs: number,
  fpsSamples: number[],
  metrics: ScenePerformanceMetrics,
  startedAt: string,
  completedAt: string,
  sampleDurationMs: number,
  settleDelayMs: number,
  warnings: string[] = []
): BenchmarkResult => ({
  scenarioName: options.scenarioName,
  objectCount: options.objectCount,
  startedAt,
  completedAt,
  generationTimeMs,
  averageFps: calculateAverageFps(fpsSamples),
  minFps: calculateMinFps(fpsSamples),
  maxFps: calculateMaxFps(fpsSamples),
  sampleCount: fpsSamples.length,
  sampleDurationMs,
  settleDelayMs,
  fpsSamples: fpsSamples.length <= 600 ? fpsSamples : undefined,
  meshCount: metrics.meshCount,
  materialCount: metrics.materialCount,
  textureCount: metrics.textureCount,
  activeMeshCount: metrics.activeMeshCount,
  totalVertices: metrics.totalVertices,
  snapshotSizeBytes: metrics.snapshotSizeBytes,
  notes: ["Performance Benchmark v0.1 is diagnostic only and does not enforce pass/fail thresholds."],
  warnings,
  options
});

export const createBenchmarkSnapshot = (machines: PlacedMachine[]) => {
  return createLayoutSnapshotFromMachines(machines, new Date().toISOString());
};

export const createBenchmarkSummary = (results: BenchmarkResult[]): BenchmarkRunSummary => {
  if (results.length === 0) {
    return {
      runCount: 0,
      totalObjects: 0,
      averageFps: null,
      minFps: null,
      maxFps: null,
      latestCompletedAt: null,
      warnings: []
    };
  }

  const completedAtValues = results.map((result) => result.completedAt).sort();

  return {
    runCount: results.length,
    totalObjects: results.reduce((total, result) => total + result.objectCount, 0),
    averageFps: calculateAverageFps(results.map((result) => result.averageFps)),
    minFps: calculateMinFps(results.map((result) => result.minFps)),
    maxFps: calculateMaxFps(results.map((result) => result.maxFps)),
    latestCompletedAt: completedAtValues[completedAtValues.length - 1] ?? null,
    warnings: results.flatMap((result) => result.warnings)
  };
};
