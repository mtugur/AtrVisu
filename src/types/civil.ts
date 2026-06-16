export type CivilReferenceType =
  | "floor-area"
  | "wall"
  | "column"
  | "door-opening"
  | "restricted-area"
  | "walkway"
  | "reference-zone";

export type CivilReferenceItem = {
  id: string;
  type: CivilReferenceType;
  name: string;
  description?: string;
  positionMm: {
    xMm: number;
    yMm: number;
    zMm?: number;
  };
  referencePoint?: "front-left-bottom";
  coordinateReferenceVersion?: "front-left-bottom-v1";
  sizeMm: {
    widthMm: number;
    depthMm: number;
    heightMm?: number;
  };
  rotationDeg: number;
  layerId?: string;
  locked?: boolean;
  visible?: boolean;
  style?: {
    opacity?: number;
    colorToken?: string;
  };
  createdAt: string;
  updatedAt: string;
};
