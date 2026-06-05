// Canonical engineering storage unit is millimeter.
// Babylon.js render unit is meter.
export type DisplayUnit = "mm" | "m" | "inch";

export type UnitValue<Unit extends string = string> = {
  value: number;
  unit: Unit;
};

export type LengthMm = UnitValue<"mm">;

