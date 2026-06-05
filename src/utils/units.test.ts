import { describe, expect, it } from "vitest";
import { formatLength, inchesToMm, metersToMm, mmToInches, mmToMeters } from "./units";

describe("unit conversion utilities", () => {
  it("converts millimeters to meters without rounding stored data", () => {
    expect(mmToMeters(2876)).toBe(2.876);
  });

  it("converts meters to millimeters", () => {
    expect(metersToMm(2.876)).toBe(2876);
  });

  it("round-trips inches and millimeters within tolerance", () => {
    const mm = 1234.5;
    expect(inchesToMm(mmToInches(mm))).toBeCloseTo(mm, 8);
  });

  it("formats display output without changing the source number", () => {
    const value = 2876;
    expect(formatLength(value, "mm", 0)).toBe("2876 mm");
    expect(formatLength(value, "m", 3)).toBe("2.876 m");
    expect(value).toBe(2876);
  });
});
