import type { DisplayUnit } from "../types/units";

const MM_PER_METER = 1000;
const MM_PER_INCH = 25.4;

export const mmToMeters = (mm: number): number => mm / MM_PER_METER;

export const metersToMm = (meters: number): number => meters * MM_PER_METER;

export const mmToInches = (mm: number): number => mm / MM_PER_INCH;

export const inchesToMm = (inches: number): number => inches * MM_PER_INCH;

export const formatLength = (mm: number, displayUnit: DisplayUnit, precision = 2): string => {
  if (displayUnit === "mm") {
    return `${mm.toFixed(precision)} mm`;
  }

  if (displayUnit === "m") {
    return `${mmToMeters(mm).toFixed(precision)} m`;
  }

  return `${mmToInches(mm).toFixed(precision)} in`;
};

