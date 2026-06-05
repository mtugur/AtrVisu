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
  },
  calibration: {
    centerOnFootprint: true,
    bottomOnFloor: true,
    preserveAspectRatio: true,
    forwardAxis: "z+",
    upAxis: "y+"
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
  const calibration = isRecord(value.calibration) ? value.calibration : {};
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
    },
    calibration: {
      centerOnFootprint:
        typeof calibration.centerOnFootprint === "boolean"
          ? calibration.centerOnFootprint
          : DEFAULT_VISUAL_MODEL.calibration.centerOnFootprint,
      bottomOnFloor:
        typeof calibration.bottomOnFloor === "boolean"
          ? calibration.bottomOnFloor
          : DEFAULT_VISUAL_MODEL.calibration.bottomOnFloor,
      preserveAspectRatio:
        typeof calibration.preserveAspectRatio === "boolean"
          ? calibration.preserveAspectRatio
          : DEFAULT_VISUAL_MODEL.calibration.preserveAspectRatio,
      forwardAxis:
        calibration.forwardAxis === "x+" ||
        calibration.forwardAxis === "x-" ||
        calibration.forwardAxis === "z+" ||
        calibration.forwardAxis === "z-"
          ? calibration.forwardAxis
          : DEFAULT_VISUAL_MODEL.calibration.forwardAxis,
      upAxis:
        calibration.upAxis === "y+" || calibration.upAxis === "z+" || calibration.upAxis === "x+"
          ? calibration.upAxis
          : DEFAULT_VISUAL_MODEL.calibration.upAxis
    }
  };
};

export const calculateMetadataBoxScale = (
  target: { width: number; depth: number; height: number },
  source: { width: number; depth: number; height: number },
  preserveAspectRatio: boolean
) => {
  const safeRatio = (targetValue: number, sourceValue: number) =>
    sourceValue > 0.0001 ? targetValue / sourceValue : 1;
  const scale = {
    x: safeRatio(target.width, source.width),
    y: safeRatio(target.height, source.height),
    z: safeRatio(target.depth, source.depth)
  };

  if (!preserveAspectRatio) {
    return scale;
  }

  // Uniform metadata-box fit uses the limiting dimension so the visual stays inside the metadata box.
  const uniform = Math.min(scale.x, scale.y, scale.z);
  return { x: uniform, y: uniform, z: uniform };
};

export const normalizeMachineVisualModel = <T extends MachineDefinition>(definition: T): T => {
  const visualModel = normalizeVisualModel(definition.visualModel, definition.modelPath);

  return {
    ...definition,
    modelPath: definition.modelPath ?? visualModel.modelPath,
    visualModel
  };
};
