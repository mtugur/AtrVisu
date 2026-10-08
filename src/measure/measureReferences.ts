import type { PlatformEntity } from "../platform/contracts";
import type { LayoutLevel } from "../types/levels";
import type { AnnotationObject } from "../types/annotations";
import { getFootprintCornersFromReferenceMm } from "../utils/coordinateReference";
import {
  areaResult,
  angleResult,
  distanceResult,
  dimensionsForEntity,
  type MeasurePoint,
  type MeasureResult
} from "./measureGeometry";
import {
  cloneMeasureDimensionStyle,
  type MeasureAnchorKind,
  type MeasureDimensionMetadata,
  type MeasureReference
} from "./referenceTypes";

const finiteProperty = (entity: PlatformEntity, key: string) => {
  const value = entity.properties.find((property) => property.key === key)?.value;
  return typeof value === "number" && Number.isFinite(value) ? value : null;
};

export const getEntityDimensionsMm = (entity: PlatformEntity) => {
  const widthMm = finiteProperty(entity, "widthMm");
  const depthMm = finiteProperty(entity, "depthMm");
  const heightMm = finiteProperty(entity, "heightMm");
  return widthMm !== null && depthMm !== null && heightMm !== null && widthMm > 0 && depthMm > 0 && heightMm > 0
    ? { widthMm, depthMm, heightMm }
    : null;
};

export const getSemanticAnchorPoints = (entity: PlatformEntity): Readonly<Record<MeasureAnchorKind, MeasurePoint>> => {
  const dimensions = getEntityDimensionsMm(entity);
  if (!dimensions) {
    return {};
  }
  const corners = getFootprintCornersFromReferenceMm(
    { xMm: entity.transform.planX, yMm: entity.transform.planY },
    { widthMm: dimensions.widthMm, depthMm: dimensions.depthMm },
    entity.transform.rotationDeg
  ).map((point) => ({ ...point, zMm: entity.transform.elevation, entityId: entity.id }));
  const center = {
    xMm: (corners[0].xMm + corners[2].xMm) / 2,
    yMm: (corners[0].yMm + corners[2].yMm) / 2,
    zMm: entity.transform.elevation,
    entityId: entity.id
  };
  return {
    "front-left-bottom": corners[0],
    "front-right-bottom": corners[1],
    "back-right-bottom": corners[2],
    "back-left-bottom": corners[3],
    "footprint-center": center,
    "front-edge-midpoint": {
      xMm: (corners[0].xMm + corners[1].xMm) / 2,
      yMm: (corners[0].yMm + corners[1].yMm) / 2,
      zMm: entity.transform.elevation,
      entityId: entity.id
    },
    "back-edge-midpoint": {
      xMm: (corners[3].xMm + corners[2].xMm) / 2,
      yMm: (corners[3].yMm + corners[2].yMm) / 2,
      zMm: entity.transform.elevation,
      entityId: entity.id
    },
    "left-edge-midpoint": {
      xMm: (corners[0].xMm + corners[3].xMm) / 2,
      yMm: (corners[0].yMm + corners[3].yMm) / 2,
      zMm: entity.transform.elevation,
      entityId: entity.id
    },
    "right-edge-midpoint": {
      xMm: (corners[1].xMm + corners[2].xMm) / 2,
      yMm: (corners[1].yMm + corners[2].yMm) / 2,
      zMm: entity.transform.elevation,
      entityId: entity.id
    },
    "bottom-face-center": center,
    "top-face-center": { ...center, zMm: entity.transform.elevation + dimensions.heightMm }
  };
};

export const MEASURE_ANCHOR_LABELS: Readonly<Record<MeasureAnchorKind, string>> = {
  "front-left-bottom": "Front Left Bottom",
  "front-right-bottom": "Front Right Bottom",
  "back-right-bottom": "Back Right Bottom",
  "back-left-bottom": "Back Left Bottom",
  "footprint-center": "Footprint Center",
  "front-edge-midpoint": "Front Edge Midpoint",
  "back-edge-midpoint": "Back Edge Midpoint",
  "left-edge-midpoint": "Left Edge Midpoint",
  "right-edge-midpoint": "Right Edge Midpoint",
  "bottom-face-center": "Bottom Face Center",
  "top-face-center": "Top Face Center"
};

export const resolveMeasureReference = (
  reference: MeasureReference,
  entities: readonly PlatformEntity[],
  levels: readonly LayoutLevel[]
): MeasurePoint | null => {
  if (reference.type === "world-point") {
    return {
      xMm: reference.xMm,
      yMm: reference.yMm,
      zMm: reference.zMm
    };
  }
  if (reference.type === "level-point") {
    const level = levels.find((item) => item.id === reference.levelId);
    return level && Number.isFinite(level.elevationMm)
      ? { xMm: reference.xMm, yMm: reference.yMm, zMm: level.elevationMm }
      : null;
  }
  const entity = entities.find((item) => item.id === reference.entityId);
  return entity ? getSemanticAnchorPoints(entity)[reference.anchor] ?? null : null;
};

export const resolveDimensionReferences = (
  dimension: MeasureDimensionMetadata,
  entities: readonly PlatformEntity[],
  levels: readonly LayoutLevel[]
) => {
  const points = dimension.references.map((reference) => resolveMeasureReference(reference, entities, levels));
  const orphaned = points.some((point) => !point);
  return {
    points: points.filter((point): point is MeasurePoint => Boolean(point)),
    orphaned,
    reason: orphaned ? "One or more dimension references can no longer be resolved." : undefined
  };
};

export const getDimensionResult = (
  annotation: AnnotationObject,
  entities: readonly PlatformEntity[],
  levels: readonly LayoutLevel[]
): MeasureResult => {
  const dimension = annotation.dimension;
  if (!dimension) {
    return { values: [], reason: "Annotation is not a Reference Dimension." };
  }
  const resolved = resolveDimensionReferences(dimension, entities, levels);
  if (resolved.orphaned) {
    return { values: [], reason: resolved.reason };
  }
  if (dimension.dimensionKind === "distance" || dimension.dimensionKind === "pair") {
    return resolved.points.length >= 2
      ? distanceResult(resolved.points[0], resolved.points[1])
      : { values: [], reason: "Two references are required." };
  }
  if (dimension.dimensionKind === "angle") {
    return resolved.points.length >= 3
      ? angleResult(resolved.points[0], resolved.points[1], resolved.points[2])
      : { values: [], reason: "Three references are required." };
  }
  if (dimension.dimensionKind === "area") {
    return areaResult(resolved.points);
  }
  const entityRef = dimension.references[0];
  if (!entityRef || entityRef.type !== "entity-anchor") {
    return { values: [], reason: "Entity dimension reference is invalid." };
  }
  const entity = entities.find((item) => item.id === entityRef.entityId);
  if (!entity) {
    return { values: [], reason: "Referenced entity no longer exists." };
  }
  const result = dimensionsForEntity(entity);
  if (result.reason || !dimension.dimensionAxis) {
    return result;
  }
  const index = dimension.dimensionAxis === "width" ? 0 : dimension.dimensionAxis === "depth" ? 1 : 2;
  const selected = result.values[index];
  return selected ? { values: [selected] } : { values: [], reason: "Dimension axis is unavailable." };
};

export const normalizeDimensionStyle = (style: Partial<MeasureDimensionMetadata["style"]> | undefined) =>
  cloneMeasureDimensionStyle(style);
