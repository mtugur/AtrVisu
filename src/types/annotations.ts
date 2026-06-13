export type AnnotationType =
  | "note"
  | "callout"
  | "warning"
  | "info"
  | "dimension-note"
  | "area-note";

export type AnnotationObject = {
  id: string;
  type: AnnotationType;
  text: string;
  layerId?: string;
  positionMm: {
    xMm: number;
    yMm: number;
    zMm?: number;
  };
  rotationDeg?: number;
  targetObjectId?: string;
  targetConnectionPointId?: string;
  anchorOffsetMm?: {
    xMm?: number;
    yMm?: number;
    zMm?: number;
  };
  style?: {
    size?: "small" | "medium" | "large";
    sizeScale?: number;
    emphasis?: "normal" | "important" | "critical";
    background?: boolean;
  };
  createdAt?: string;
  updatedAt?: string;
};
