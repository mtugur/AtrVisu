import { describe, expect, it } from "vitest";
import {
  calculateAverageFps,
  calculateElapsedMs,
  calculateMaxFps,
  calculateMinFps,
  createBenchmarkGridPositions,
  createBenchmarkSummary,
  estimateJsonSizeBytes
} from "./performanceBenchmark";

describe("performance benchmark helpers", () => {
  it("estimates positive JSON size", () => {
    expect(estimateJsonSizeBytes({ appName: "AtrVisu", objects: [1, 2, 3] })).toBeGreaterThan(0);
  });

  it("creates requested grid position count", () => {
    expect(createBenchmarkGridPositions(50, 1800)).toHaveLength(50);
  });

  it("spaces grid positions by the requested millimeters", () => {
    const [first, second] = createBenchmarkGridPositions(4, 1800);

    expect(second.xMm - first.xMm).toBe(1800);
    expect(second.yMm).toBe(first.yMm);
  });

  it("calculates average/min/max FPS", () => {
    const samples = [60, 55, 45];

    expect(calculateAverageFps(samples)).toBeCloseTo(53.333, 2);
    expect(calculateMinFps(samples)).toBe(45);
    expect(calculateMaxFps(samples)).toBe(60);
  });

  it("handles empty FPS samples safely", () => {
    expect(calculateAverageFps([])).toBe(0);
    expect(calculateMinFps([])).toBe(0);
    expect(calculateMaxFps([])).toBe(0);
  });

  it("calculates non-negative elapsed milliseconds", () => {
    expect(calculateElapsedMs(100, 123.456)).toBeCloseTo(23.456);
    expect(calculateElapsedMs(200, 100)).toBe(0);
  });

  it("handles empty benchmark summaries safely", () => {
    expect(createBenchmarkSummary([])).toEqual({
      runCount: 0,
      totalObjects: 0,
      averageFps: null,
      minFps: null,
      maxFps: null,
      latestCompletedAt: null,
      warnings: []
    });
  });
});
