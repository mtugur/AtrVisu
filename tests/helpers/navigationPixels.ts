export type PixelBounds = { x: number; y: number; width: number; height: number };
export type Rgb = readonly [number, number, number];

export const getMachinePixelRegion = (corners: readonly { x: number; y: number; z: number }[]) => {
  if (corners.length !== 8 || !corners.every(point => Object.values(point).every(Number.isFinite))) {
    throw new Error("Machine pixel evidence requires eight finite canonical projected corners.");
  }
  const x = Math.min(...corners.map(point => point.x));
  const y = Math.min(...corners.map(point => point.y));
  const width = Math.max(...corners.map(point => point.x)) - x;
  const height = Math.max(...corners.map(point => point.y)) - y;
  if (width <= 0 || height <= 0) throw new Error("Machine projected bounds must have positive area.");
  const projectedBounds = { x, y, width, height };
  // The central 30% avoids the selection outline/label and most empty AABB corners.
  const left = Math.ceil(x + width * .35);
  const top = Math.ceil(y + height * .35);
  const sampleBounds = { x: left, y: top, width: Math.floor(x + width * .65) - left,
    height: Math.floor(y + height * .65) - top };
  if (sampleBounds.width <= 0 || sampleBounds.height <= 0) throw new Error("Machine sample region is empty.");
  return { projectedBounds, sampleBounds };
};

export const analyzeMachinePixels = (
  entityId: string,
  region: { projectedBounds: PixelBounds; sampleBounds: PixelBounds },
  rgba: ArrayLike<number>,
  effectiveBackgroundRgb: Rgb
) => {
  const sampledPixelCount = region.sampleBounds.width * region.sampleBounds.height;
  if (rgba.length !== sampledPixelCount * 4) throw new Error("Incomplete Machine pixel readback.");
  let nonBackgroundPixelCount = 0;
  for (let offset = 0; offset < rgba.length; offset += 4) {
    // Reject clear color/near-black compositor background; accept any material color.
    const difference = Math.max(...effectiveBackgroundRgb.map((value, channel) => Math.abs(rgba[offset + channel] - value)));
    if (rgba[offset + 3] > 0 && difference >= 24) nonBackgroundPixelCount++;
  }
  const nonBackgroundRatio = nonBackgroundPixelCount / sampledPixelCount;
  // A filled interior, not sparse grid/selection lines, must occupy at least 75%.
  return { entityId, ...region, sampledPixelCount, nonBackgroundPixelCount, nonBackgroundRatio,
    effectiveBackgroundRgb, minimumColorDistance: 24, minimumRatio: .75, minimumSampledPixelCount: 64,
    pass: sampledPixelCount >= 64 && nonBackgroundRatio >= .75 };
};
