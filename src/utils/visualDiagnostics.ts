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
  visualBoundsMm?: VisualModelDiagnostics["visualBoundsMm"]
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
    boundsDifferenceMm: calculateBoundsDifferenceMm(metadataBoundsMm, visualBoundsMm),
    rotationOffsetDeg: visualModel.rotationOffsetDeg,
    positionOffsetMm: visualModel.positionOffsetMm
  };
};
