import type { CommercialOutputEquipmentInstance, CommercialOutputExtents, CommercialOutputSnapshot } from "./types";

export type LayoutPlanFootprint = {
  entityId: string;
  entityType: "machine" | "civil";
  name: string;
  cornersMm: readonly { xMm: number; yMm: number }[];
  rotationDeg: number;
};

export type LayoutPlanScheduleRow = {
  instanceId: string;
  name: string;
  identity: string;
  dimensions: string;
  manufacturer: string;
  machineCode: string;
  electricalPower: string;
  pneumaticPressure: string;
  networkProtocols: string;
};

export type LayoutPlanModel = {
  title: "MEASURED LAYOUT PLAN";
  projectName: string;
  layoutName: string;
  revision: string;
  generatedAt: string;
  unit: "mm";
  scaleLabel: "Fit to page";
  footprints: readonly LayoutPlanFootprint[];
  extents: CommercialOutputExtents | null;
  xDimensionLabel: string;
  yDimensionLabel: string;
  schedule: readonly LayoutPlanScheduleRow[];
  warnings: readonly string[];
};

const propertyDisplay = (instance: CommercialOutputEquipmentInstance, key: string) => (
  instance.reportProperties.find((property) => property.key === key)?.displayValue ?? "Unknown"
);

const propertyDisplayWithUnit = (instance: CommercialOutputEquipmentInstance, key: string) => {
  const property = instance.reportProperties.find((candidate) => candidate.key === key);
  if (!property) {
    return "Unknown";
  }
  return property.displayValue;
};

export const createLayoutPlanModel = (snapshot: CommercialOutputSnapshot): LayoutPlanModel => ({
  title: "MEASURED LAYOUT PLAN",
  projectName: snapshot.metadata.projectName,
  layoutName: snapshot.metadata.layoutName,
  revision: snapshot.metadata.revision,
  generatedAt: snapshot.metadata.generatedAt,
  unit: snapshot.metadata.canonicalUnit,
  scaleLabel: "Fit to page",
  footprints: snapshot.planFootprints
    .filter((footprint) => footprint.visible)
    .map((footprint) => ({
      entityId: footprint.entityId,
      entityType: footprint.entityType,
      name: footprint.name,
      cornersMm: footprint.cornersMm,
      rotationDeg: footprint.rotationDeg
    })),
  extents: snapshot.extents,
  xDimensionLabel: snapshot.extents ? `${Math.round(snapshot.extents.widthMm)} mm` : "Unknown",
  yDimensionLabel: snapshot.extents ? `${Math.round(snapshot.extents.depthMm)} mm` : "Unknown",
  schedule: snapshot.equipment.map((instance) => ({
    instanceId: instance.instanceId,
    name: instance.name,
    identity: instance.definitionIdentity,
    dimensions: `${instance.widthMm} x ${instance.depthMm} x ${instance.heightMm} mm`,
    manufacturer: propertyDisplay(instance, "manufacturer"),
    machineCode: propertyDisplay(instance, "machineCode"),
    electricalPower: propertyDisplayWithUnit(instance, "electricalPowerKw"),
    pneumaticPressure: propertyDisplayWithUnit(instance, "pneumaticPressureBar"),
    networkProtocols: propertyDisplay(instance, "networkProtocols")
  })),
  warnings: snapshot.warnings
});
