export type BenchmarkScenario =
  | "proxy-grid-50"
  | "proxy-grid-100"
  | "proxy-grid-200"
  | "proxy-grid-500";

export type BenchmarkOptions = {
  scenarioName: BenchmarkScenario;
  objectCount: number;
  useProxyObjects: boolean;
  useExistingLibraryDefinitions: boolean;
  includeLabels: boolean;
  includeCollisionCheck: boolean;
  includeMetadataBoxes: boolean;
  spacingMm: number;
  randomRotation: boolean;
};

export type ScenePerformanceMetrics = {
  fps: number | null;
  meshCount: number;
  materialCount: number;
  textureCount: number | null;
  activeMeshCount: number | null;
  totalVertices: number | null;
  snapshotSizeBytes: number;
};

export type BenchmarkResult = {
  scenarioName: BenchmarkScenario;
  objectCount: number;
  startedAt: string;
  completedAt: string;
  generationTimeMs: number;
  averageFps: number;
  minFps: number;
  maxFps: number;
  sampleCount: number;
  sampleDurationMs: number;
  settleDelayMs: number;
  fpsSamples?: number[];
  meshCount: number;
  materialCount: number;
  textureCount: number | null;
  activeMeshCount: number | null;
  totalVertices: number | null;
  snapshotSizeBytes: number;
  notes: string[];
  warnings: string[];
  options: BenchmarkOptions;
};

export type BenchmarkRunSummary = {
  runCount: number;
  totalObjects: number;
  averageFps: number | null;
  minFps: number | null;
  maxFps: number | null;
  latestCompletedAt: string | null;
  warnings: string[];
};
