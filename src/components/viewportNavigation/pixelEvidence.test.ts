import { describe, expect, it } from "vitest";
import { analyzeMachinePixels, getMachinePixelRegion } from "../../../tests/helpers/navigationPixels";

const corners = Array.from({ length: 8 }, (_, i) => ({ x: i & 1 ? 200 : 100, y: i & 2 ? 200 : 100, z: i & 4 ? .8 : .2 }));
const region = getMachinePixelRegion(corners);
const background = [32, 35, 38] as const;
const pixels = (ratio: number, color = [120, 130, 140]) => Uint8Array.from(Array.from({ length: 900 }, (_, i) => [...(i < 900 * ratio ? color : background), 255]).flat());

describe("Machine-associated navigation pixel evidence", () => {
  it("derives bounds from all eight finite corners and samples only the central interior", () => {
    expect(region).toEqual({ projectedBounds: { x: 100, y: 100, width: 100, height: 100 }, sampleBounds: { x: 135, y: 135, width: 30, height: 30 } });
    expect(() => getMachinePixelRegion(corners.slice(0, 7))).toThrow(/eight/);
    expect(() => getMachinePixelRegion(corners.map((p, i) => i ? p : { ...p, x: NaN }))).toThrow(/finite/);
  });
  it("fails closed when projection is valid but Machine pixels are viewport background", () => {
    expect(analyzeMachinePixels("machine:test", region, pixels(0), background)).toMatchObject({ sampledPixelCount: 900, nonBackgroundPixelCount: 0, nonBackgroundRatio: 0, pass: false });
  });
  it("does not mistake a near-black ordinary screenshot for rendered Machine pixels", () => {
    expect(analyzeMachinePixels("machine:test", region, pixels(1, [10, 13, 16]), background).pass).toBe(false);
  });
  it("rejects sparse lines and incomplete readback rather than accepting generic WebGL colors", () => {
    expect(analyzeMachinePixels("machine:test", region, pixels(.2), background).pass).toBe(false);
    expect(() => analyzeMachinePixels("machine:test", region, pixels(1).slice(4), background)).toThrow(/Incomplete/);
  });
  it("accepts a filled neutral or colored Machine without requiring an exact material color", () => {
    for (const color of [[120, 130, 140], [50, 114, 139]]) {
      expect(analyzeMachinePixels("machine:test", region, pixels(.8, color), background)).toMatchObject({ nonBackgroundPixelCount: 720, nonBackgroundRatio: .8, pass: true });
    }
  });
  it("rejects transparent pixels and an undersized sample even when RGB differs", () => {
    const transparent = pixels(1); for (let i = 3; i < transparent.length; i += 4) transparent[i] = 0;
    expect(analyzeMachinePixels("machine:test", region, transparent, background).pass).toBe(false);
    expect(analyzeMachinePixels("machine:test", { ...region, sampleBounds: { x: 135, y: 135, width: 2, height: 2 } }, Uint8Array.from(Array(4).fill([120, 130, 140, 255]).flat()), background).pass).toBe(false);
  });
});
