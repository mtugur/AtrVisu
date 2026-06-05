import type { MachineDefinition } from "../types/machine";
import type { VisualModelDiagnostics, VisualModelStatus } from "../types/overlays";
import { getMachineDimensionsMm } from "./machineDimensions";
import { normalizeVisualModel } from "./visualModel";

export const calculateBoundsDifferenceMm = (
  metadataBoundsMm: VisualModelDiagnostics["metadataBoundsMm"],
  visualBoundsMm?: VisualModelDiagnostics["visualBoundsMm"]
) => {
  if (!visualBoundsMm) {
    return undefined;
  }

  return {
    widthMm: visualBoundsMm.widthMm - metadataBoundsMm.widthMm,
    depthMm: visualBoundsMm.depthMm - metadataBoundsMm.depthMm,
    heightMm: visualBoundsMm.heightMm - metadataBoundsMm.heightMm
  };
};

export const createBaseVisualDiagnostics = (
  instanceId: string,
  definition: MachineDefinition,
  visualStatus: VisualModelStatus,
  fallbackReason?: string,
  visualBoundsMm?: VisualModelDiagnostics["visualBoundsMm"],
  appliedScale?: VisualModelDiagnostics["appliedScale"],
  extraWarnings: string[] = []
): VisualModelDiagnostics => {
  const visualModel = normalizeVisualModel(definition.visualModel, definition.modelPath);
  const metadataBoundsMm = getMachineDimensionsMm(definition);
  const placeholderVisualType = definition.placeholderVisualType ?? "box-generic";
  const visualSource =
    visualStatus === "loaded"
      ? "glb"
      : visualStatus === "failed" || visualStatus === "fallback"
        ? "fallback"
        : visualStatus === "proxy"
          ? "proxy"
          : "none";

  const boundsDifferenceMm = calculateBoundsDifferenceMm(metadataBoundsMm, visualBoundsMm);
  const warnings = [...extraWarnings];
  if (boundsDifferenceMm && visualBoundsMm) {
    const exceedsTolerance =
      Math.abs(boundsDifferenceMm.widthMm) > metadataBoundsMm.widthMm * 0.1 ||
      Math.abs(boundsDifferenceMm.depthMm) > metadataBoundsMm.depthMm * 0.1 ||
      Math.abs(boundsDifferenceMm.heightMm) > metadataBoundsMm.heightMm * 0.1;
    if (exceedsTolerance) {
      warnings.push("Visual bounds differ from metadata bounds by more than 10%.");
    }
  }
  if (visualStatus === "failed" && visualModel.modelPath) {
    warnings.push("Model path is configured but loading failed.");
  }

  return {
    instanceId,
    visualStatus,
    visualSource,
    modelPath: visualModel.modelPath,
    scaleMode: visualModel.scaleMode,
    modelUnit: visualModel.unit,
    placeholderVisualType,
    fallbackReason,
    category: definition.category,
    machineType: definition.machineType,
    productFamilyCode: definition.productFamilyCode,
    metadataBoundsMm,
    visualBoundsMm,
    boundsDifferenceMm,
    calibration: visualModel.calibration,
    appliedScale,
    rotationOffsetDeg: visualModel.rotationOffsetDeg,
    positionOffsetMm: visualModel.positionOffsetMm,
    warnings
  };
};
