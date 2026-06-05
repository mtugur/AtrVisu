import type { MachineDefinition } from "../types/machine";
import { metersToMm, mmToMeters } from "./units";

export const ATRVISU_UNIT_SYSTEM = {
  canonicalUnit: "mm",
  renderUnit: "m",
  version: "1.0"
} as const;

const isPositiveFinite = (value: unknown): value is number => {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
};

const roundMm = (value: number) => Number(value.toFixed(3));

export const getMachineDimensionsMm = (definition: MachineDefinition) => {
  const widthMm = isPositiveFinite(definition.widthMm)
    ? definition.widthMm
    : roundMm(metersToMm(definition.width));
  const depthMm = isPositiveFinite(definition.depthMm)
    ? definition.depthMm
    : roundMm(metersToMm(definition.depth));
  const heightMm = isPositiveFinite(definition.heightMm)
    ? definition.heightMm
    : roundMm(metersToMm(definition.height));

  return { widthMm, depthMm, heightMm };
};

export const getMachineDimensionsMeters = (definition: MachineDefinition) => {
  const { widthMm, depthMm, heightMm } = getMachineDimensionsMm(definition);

  return {
    width: mmToMeters(widthMm),
    depth: mmToMeters(depthMm),
    height: mmToMeters(heightMm)
  };
};

export const normalizeMachineDefinitionDimensions = <T extends MachineDefinition>(definition: T): T => {
  const { widthMm, depthMm, heightMm } = getMachineDimensionsMm(definition);

  return {
    ...definition,
    widthMm,
    depthMm,
    heightMm,
    width: mmToMeters(widthMm),
    depth: mmToMeters(depthMm),
    height: mmToMeters(heightMm)
  };
};
