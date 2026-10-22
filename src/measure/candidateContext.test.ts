import { describe, expect, it } from "vitest";
import { insideCandidateContext, projectedVolumeEnvelope } from "./candidateContext";

describe("canonical projected candidate approach ownership", () => {
  const envelope = projectedVolumeEnvelope([{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 60 }, { x: 0, y: 60 }, { x: 40, y: 30 }]);
  it("retains body-to-corner paths including the boundary without a raw mesh hit", () => {
    expect(envelope).toHaveLength(4);
    for (const corner of envelope) for (let step = 0; step <= 24; step++) {
      expect(insideCandidateContext({ x: 50 + (corner.x - 50) * step / 24, y: 30 + (corner.y - 30) * step / 24 }, envelope, [])).toBe(true);
    }
  });
  it("does not enlarge the visible marker region or retain context across misses outside it", () => {
    expect(insideCandidateContext({ x: -7, y: 0 }, envelope, [{ x: 0, y: 0 }])).toBe(true);
    expect(insideCandidateContext({ x: -7.001, y: 0 }, envelope, [{ x: 0, y: 0 }])).toBe(false);
    expect(insideCandidateContext({ x: -1, y: 0 }, envelope, [])).toBe(false);
    expect(projectedVolumeEnvelope([{ x: Number.NaN, y: 1 }])).toEqual([]);
  });
});
