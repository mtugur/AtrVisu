import type { AnnotationObject, AnnotationType } from "../types/annotations";
import type { PlacedMachine } from "../types/machine";
import { getMachinePlanPositionMm } from "./placement";

export type AnnotationVisualStyle = {
  typeToken: AnnotationType;
  emphasisToken: "normal" | "important" | "critical";
  sizeScale: number;
  indicator: string;
  textColor: string;
  backgroundColor: string;
  borderColor: string;
  accentColor: string;
  borderWidthPx: number;
  fontSizePx: number;
  fontWeight: "600" | "700" | "800";
  paddingPx: number;
  lineHeightPx: number;
  maxCharsPerLine: number;
  filledBackground: boolean;
};

export type AnnotationReadableScaleOptions = {
  cameraDistanceMeters: number;
  sizeScale?: number;
};

export type AnnotationDragPlanPoint = {
  xMm: number;
  yMm: number;
};

export type AnnotationRayPlaneInput = {
  rayOrigin: { x: number; y: number; z: number };
  rayDirection: { x: number; y: number; z: number };
  planeElevationMeters: number;
};

export type AnnotationPickKind = "label" | "hit-target" | "handle";

const annotationTypes: AnnotationType[] = [
  "note",
  "callout",
  "warning",
  "info",
  "dimension-note",
  "area-note"
];

const defaultTextByType: Record<AnnotationType, string> = {
  note: "New note",
  callout: "New callout",
  warning: "New warning",
  info: "New info",
  "dimension-note": "New dimension note",
  "area-note": "New area note"
};

const typeStyleMap: Record<AnnotationType, Pick<AnnotationVisualStyle, "indicator" | "textColor" | "backgroundColor" | "borderColor" | "accentColor">> = {
  note: {
    indicator: "NOTE",
    textColor: "#f6fbf5",
    backgroundColor: "rgba(18, 24, 23, 0.86)",
    borderColor: "#6e8178",
    accentColor: "#aab8ae"
  },
  info: {
    indicator: "INFO",
    textColor: "#e9f7ff",
    backgroundColor: "rgba(12, 42, 59, 0.9)",
    borderColor: "#56b5df",
    accentColor: "#7ed8ff"
  },
  warning: {
    indicator: "WARN",
    textColor: "#fff3d2",
    backgroundColor: "rgba(67, 38, 9, 0.92)",
    borderColor: "#ffb547",
    accentColor: "#ffd166"
  },
  callout: {
    indicator: "CALL",
    textColor: "#effff9",
    backgroundColor: "rgba(9, 45, 38, 0.9)",
    borderColor: "#58d1af",
    accentColor: "#8ff0d1"
  },
  "dimension-note": {
    indicator: "DIM",
    textColor: "#eef6ff",
    backgroundColor: "rgba(19, 35, 62, 0.9)",
    borderColor: "#8fb7ff",
    accentColor: "#b9d1ff"
  },
  "area-note": {
    indicator: "AREA",
    textColor: "#f5f0ff",
    backgroundColor: "rgba(42, 30, 67, 0.9)",
    borderColor: "#b69cff",
    accentColor: "#d4c3ff"
  }
};

const emphasisStyleMap: Record<AnnotationVisualStyle["emphasisToken"], Pick<AnnotationVisualStyle, "borderWidthPx" | "fontWeight">> = {
  normal: {
    borderWidthPx: 3,
    fontWeight: "600"
  },
  important: {
    borderWidthPx: 5,
    fontWeight: "700"
  },
  critical: {
    borderWidthPx: 7,
    fontWeight: "800"
  }
};

const legacySizeScaleMap: Record<"small" | "medium" | "large", number> = {
  small: 2,
  medium: 4,
  large: 7
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const finiteNumberOr = (value: unknown, fallback: number) =>
  typeof value === "number" && Number.isFinite(value) ? value : fallback;

const optionalFiniteNumber = (value: unknown) =>
  typeof value === "number" && Number.isFinite(value) ? value : undefined;

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

export const normalizeAnnotationSizeScale = (style: unknown, fallback = 4) => {
  if (!isRecord(style)) {
    return clamp(fallback, 1, 10);
  }

  if (typeof style.sizeScale === "number" && Number.isFinite(style.sizeScale)) {
    return clamp(style.sizeScale, 1, 10);
  }

  if (style.size === "small" || style.size === "medium" || style.size === "large") {
    return legacySizeScaleMap[style.size];
  }

  return clamp(fallback, 1, 10);
};

export const normalizeAnnotationCoordinateInput = (
  value: string,
  fallback: number,
  options: { allowNegative?: boolean } = {}
) => {
  const trimmedValue = value.trim();
  if (trimmedValue === "" || trimmedValue === "-" || trimmedValue === "." || trimmedValue === "-.") {
    return fallback;
  }

  const numericValue = Number(trimmedValue);
  if (!Number.isFinite(numericValue)) {
    return fallback;
  }

  return options.allowNegative === false ? Math.max(0, numericValue) : numericValue;
};

export const getAnnotationVisualStyle = (annotation: Pick<AnnotationObject, "type" | "style">): AnnotationVisualStyle => {
  const typeToken = annotationTypes.includes(annotation.type) ? annotation.type : "note";
  const emphasisToken = annotation.style?.emphasis === "important" || annotation.style?.emphasis === "critical"
    ? annotation.style.emphasis
    : "normal";
  const sizeScale = normalizeAnnotationSizeScale(annotation.style);
  const typeStyle = typeStyleMap[typeToken];
  const emphasisStyle = emphasisStyleMap[emphasisToken];
  const fontSizePx = Math.round(26 + sizeScale * 4.2);
  const paddingPx = Math.round(15 + sizeScale * 2.2);
  const lineHeightPx = Math.round(fontSizePx * 1.24);
  const maxCharsPerLine = Math.round(clamp(22 + sizeScale * 1.2, 22, 34));

  return {
    typeToken,
    emphasisToken,
    sizeScale,
    ...typeStyle,
    ...emphasisStyle,
    fontSizePx,
    paddingPx,
    lineHeightPx,
    maxCharsPerLine,
    indicator: emphasisToken === "critical" ? "CRIT" : typeStyle.indicator,
    filledBackground: annotation.style?.background !== false
  };
};

export const getAnnotationReadableScale = ({
  cameraDistanceMeters,
  sizeScale = 4
}: AnnotationReadableScaleOptions) => {
  const safeDistance = Number.isFinite(cameraDistanceMeters) && cameraDistanceMeters > 0
    ? cameraDistanceMeters
    : 12;
  const normalizedSizeScale = clamp(sizeScale, 1, 10);
  const sizeMultiplier = 0.72 + normalizedSizeScale * 0.16;
  const distanceMultiplier = clamp(safeDistance / 18, 1, 2.25);

  return clamp(sizeMultiplier * distanceMultiplier, 0.88, 4.2);
};

export const calculateAnnotationDragPosition = ({
  initialAnnotationPosition,
  initialPointerPosition,
  currentPointerPosition
}: {
  initialAnnotationPosition: AnnotationDragPlanPoint;
  initialPointerPosition: AnnotationDragPlanPoint;
  currentPointerPosition: AnnotationDragPlanPoint;
}): AnnotationDragPlanPoint => ({
  xMm: initialAnnotationPosition.xMm + currentPointerPosition.xMm - initialPointerPosition.xMm,
  yMm: initialAnnotationPosition.yMm + currentPointerPosition.yMm - initialPointerPosition.yMm
});

export const getRayPlanePlanPointMm = ({
  rayOrigin,
  rayDirection,
  planeElevationMeters
}: AnnotationRayPlaneInput): AnnotationDragPlanPoint | null => {
  if (Math.abs(rayDirection.y) < 0.0001) {
    return null;
  }

  const distance = (planeElevationMeters - rayOrigin.y) / rayDirection.y;
  if (!Number.isFinite(distance) || distance < 0) {
    return null;
  }

  return {
    xMm: (rayOrigin.x + rayDirection.x * distance) * 1000,
    yMm: (rayOrigin.z + rayDirection.z * distance) * 1000
  };
};

export const getAnnotationPickMetadata = (annotationId: string, pickKind: AnnotationPickKind) => ({
  kind: "annotation" as const,
  annotationId,
  annotationPickKind: pickKind
});

const normalizeAnnotationType = (value: unknown): AnnotationType =>
  typeof value === "string" && annotationTypes.includes(value as AnnotationType)
    ? value as AnnotationType
    : "note";

export const createAnnotation = ({
  type = "note",
  selectedMachine,
  positionMm,
  now = new Date().toISOString()
}: {
  type?: AnnotationType;
  selectedMachine?: PlacedMachine;
  positionMm?: { xMm: number; yMm: number; zMm?: number };
  now?: string;
}): AnnotationObject => {
  const basePosition = positionMm ?? (selectedMachine
    ? {
        xMm: getMachinePlanPositionMm(selectedMachine).xMm + 1200,
        yMm: getMachinePlanPositionMm(selectedMachine).yMm - 1200,
        zMm: (selectedMachine.elevationMm ?? 0) + 1600
      }
    : { xMm: 0, yMm: 0, zMm: 1600 });

  return {
    id: `annotation-${Date.now()}-${Math.round(Math.random() * 10000)}`,
    type,
    text: defaultTextByType[type],
    positionMm: basePosition,
    rotationDeg: 0,
    targetObjectId: type === "callout" ? selectedMachine?.instanceId : undefined,
    style: {
      sizeScale: 4,
      emphasis: type === "warning" ? "important" : "normal",
      background: true
    },
    createdAt: now,
    updatedAt: now
  };
};

export const normalizeAnnotation = (value: unknown): AnnotationObject | null => {
  if (!isRecord(value)) {
    return null;
  }

  const position = isRecord(value.positionMm) ? value.positionMm : {};
  const style = isRecord(value.style) ? value.style : {};
  const anchorOffset = isRecord(value.anchorOffsetMm) ? value.anchorOffsetMm : undefined;
  const id = typeof value.id === "string" && value.id.trim() ? value.id : `annotation-${Date.now()}`;
  const type = normalizeAnnotationType(value.type);
  const text = typeof value.text === "string" ? value.text : defaultTextByType[type];

  return {
    id,
    type,
    text,
    positionMm: {
      xMm: finiteNumberOr(position.xMm, 0),
      yMm: finiteNumberOr(position.yMm, 0),
      zMm: optionalFiniteNumber(position.zMm)
    },
    rotationDeg: optionalFiniteNumber(value.rotationDeg),
    targetObjectId: typeof value.targetObjectId === "string" && value.targetObjectId.trim()
      ? value.targetObjectId
      : undefined,
    targetConnectionPointId:
      typeof value.targetConnectionPointId === "string" && value.targetConnectionPointId.trim()
        ? value.targetConnectionPointId
        : undefined,
    anchorOffsetMm: anchorOffset
      ? {
          xMm: optionalFiniteNumber(anchorOffset.xMm),
          yMm: optionalFiniteNumber(anchorOffset.yMm),
          zMm: optionalFiniteNumber(anchorOffset.zMm)
        }
      : undefined,
    style: {
      size: style.size === "small" || style.size === "medium" || style.size === "large" ? style.size : undefined,
      sizeScale: normalizeAnnotationSizeScale(style),
      emphasis: style.emphasis === "important" || style.emphasis === "critical" ? style.emphasis : "normal",
      background: typeof style.background === "boolean" ? style.background : true
    },
    createdAt: typeof value.createdAt === "string" ? value.createdAt : undefined,
    updatedAt: typeof value.updatedAt === "string" ? value.updatedAt : undefined
  };
};

export const normalizeAnnotations = (value: unknown): AnnotationObject[] =>
  Array.isArray(value)
    ? value.map(normalizeAnnotation).filter((annotation): annotation is AnnotationObject => Boolean(annotation))
    : [];

export const updateAnnotation = (
  annotations: AnnotationObject[],
  annotationId: string,
  updates: Partial<AnnotationObject>,
  updatedAt = new Date().toISOString()
) =>
  annotations.map((annotation) =>
    annotation.id === annotationId
      ? {
          ...annotation,
          ...updates,
          positionMm: updates.positionMm ?? annotation.positionMm,
          style: updates.style ? { ...annotation.style, ...updates.style } : annotation.style,
          updatedAt
        }
      : annotation
  );

export const moveAnnotationByDelta = (
  annotations: AnnotationObject[],
  annotationId: string,
  deltaXMm: number,
  deltaYMm: number
) =>
  annotations.map((annotation) =>
    annotation.id === annotationId
      ? {
          ...annotation,
          positionMm: {
            ...annotation.positionMm,
            xMm: annotation.positionMm.xMm + deltaXMm,
            yMm: annotation.positionMm.yMm + deltaYMm
          },
          updatedAt: new Date().toISOString()
        }
      : annotation
  );

export const deleteAnnotation = (annotations: AnnotationObject[], annotationId: string) =>
  annotations.filter((annotation) => annotation.id !== annotationId);

export const detachAnnotationsForDeletedObjects = (
  annotations: AnnotationObject[],
  deletedObjectIds: Set<string>
) =>
  annotations.map((annotation) =>
    annotation.targetObjectId && deletedObjectIds.has(annotation.targetObjectId)
      ? {
          ...annotation,
          targetObjectId: undefined,
          targetConnectionPointId: undefined,
          updatedAt: new Date().toISOString()
        }
      : annotation
  );
