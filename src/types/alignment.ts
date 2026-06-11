export type PlanAxis = "x" | "y";

export type PlanBounds = {
  objectId?: string;
  centerXMm: number;
  centerYMm: number;
  minXMm: number;
  maxXMm: number;
  minYMm: number;
  maxYMm: number;
  widthMm: number;
  depthMm: number;
};

export type AlignmentAction = "left" | "right" | "front" | "back" | "centerX" | "centerY";

export type DistributionAction = "horizontal" | "vertical";

export type EqualGapAction = "gapX" | "gapY";

export type PairAlignmentAction =
  | "leftToRight"
  | "rightToLeft"
  | "frontToBack"
  | "backToFront"
  | "centerX"
  | "centerY"
  | "gapX"
  | "gapY";

export type FootprintAnchor =
  | "center"
  | "leftCenter"
  | "rightCenter"
  | "frontCenter"
  | "backCenter"
  | "frontLeft"
  | "frontRight"
  | "backLeft"
  | "backRight";
