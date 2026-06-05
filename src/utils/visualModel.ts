import type { MachineDefinition, VisualModelDefinition } from "../types/machine";

export const DEFAULT_VISUAL_MODEL: VisualModelDefinition = {
  modelPath: null,
  unit: "m",
  scaleMode: "metadata-box",
  rotationOffsetDeg: {
    x: 0,
    y: 0,
    z: 0
  },
  positionOffsetMm: {
    xMm: 0,
    yMm: 0,
    zMm: 0
  }
};

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === "object" && value !== null && !Array.isArray(value);
};

const finiteNumberOrZero = (value: unknown) => {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
};

export const normalizeVisualModel = (
  value: unknown,
  legacyModelPath?: string | null
): VisualModelDefinition => {
  if (!isRecord(value)) {
    return {
      ...DEFAULT_VISUAL_MODEL,
      modelPath: legacyModelPath?.trim() ? legacyModelPath : null
    };
  }

  const rotationOffset = isRecord(value.rotationOffsetDeg) ? value.rotationOffsetDeg : {};
  const positionOffset = isRecord(value.positionOffsetMm) ? value.positionOffsetMm : {};
  const modelPath = typeof value.modelPath === "string" && value.modelPath.trim().length > 0
    ? value.modelPath.trim()
    : legacyModelPath?.trim()
      ? legacyModelPath
      : null;

  return {
    modelPath,
    unit: value.unit === "mm" ? "mm" : "m",
    scaleMode: value.scaleMode === "model-units" ? "model-units" : "metadata-box",
    rotationOffsetDeg: {
      x: finiteNumberOrZero(rotationOffset.x),
      y: finiteNumberOrZero(rotationOffset.y),
      z: finiteNumberOrZero(rotationOffset.z)
    },
    positionOffsetMm: {
      xMm: finiteNumberOrZero(positionOffset.xMm),
      yMm: finiteNumberOrZero(positionOffset.yMm),
      zMm: finiteNumberOrZero(positionOffset.zMm)
    }
  };
};

export const normalizeMachineVisualModel = <T extends MachineDefinition>(definition: T): T => {
  const visualModel = normalizeVisualModel(definition.visualModel, definition.modelPath);

  return {
    ...definition,
    modelPath: definition.modelPath ?? visualModel.modelPath,
    visualModel
  };
};
