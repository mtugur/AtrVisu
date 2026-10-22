export type MeasureDimensionKind = "distance" | "angle" | "area" | "dimensions" | "pair";
export type MeasureAnchorKind =
  | "front-left-bottom"
  | "front-right-bottom"
  | "back-right-bottom"
  | "back-left-bottom"
  | "footprint-center"
  | "front-edge-midpoint"
  | "back-edge-midpoint"
  | "left-edge-midpoint"
  | "right-edge-midpoint"
  | "bottom-face-center"
  | "top-face-center";

export type MeasureReference =
  | {
      type: "entity-anchor";
      entityId: string;
      anchor: MeasureAnchorKind;
    }
  | {
      type: "world-point";
      xMm: number;
      yMm: number;
      zMm: number;
    }
  | {
      type: "level-point";
      levelId: string;
      xMm: number;
      yMm: number;
    };

export type MeasureDimensionStyle = {
  fontFamily: string;
  textSizeMode: "adaptive" | "fixed";
  adaptiveMinTextPx: number;
  adaptiveMaxTextPx: number;
  fixedTextPx: number;
  lineWeightPx: number;
  arrowStyle: "arrow" | "tick";
  arrowSizePx: number;
  textOffsetPx: number;
  textBackground: boolean;
  precision: 0 | 1 | 2 | 3;
  unitPresentation: "mm" | "mm-metric";
  displayMode: "depth" | "overlay";
  showWitnessLines: boolean;
  showLeaders: boolean;
};

export type MeasureDimensionMetadata = {
  schemaVersion: 1;
  dimensionKind: MeasureDimensionKind;
  name: string;
  visible: boolean;
  references: readonly MeasureReference[];
  dimensionAxis?: "width" | "depth" | "height";
  style: MeasureDimensionStyle;
  textPlacementMm?: {
    xMm: number;
    yMm: number;
    zMm: number;
  };
  status: "healthy" | "orphaned";
  orphanReason?: string;
};

export const DEFAULT_MEASURE_DIMENSION_STYLE: MeasureDimensionStyle = {
  fontFamily: "Arial",
  textSizeMode: "adaptive",
  adaptiveMinTextPx: 10,
  adaptiveMaxTextPx: 18,
  fixedTextPx: 12,
  lineWeightPx: 1.5,
  arrowStyle: "arrow",
  arrowSizePx: 7,
  textOffsetPx: 10,
  textBackground: true,
  precision: 3,
  unitPresentation: "mm",
  displayMode: "depth",
  showWitnessLines: true,
  showLeaders: true
};

export const cloneMeasureDimensionStyle = (style?: Partial<MeasureDimensionStyle>): MeasureDimensionStyle => ({
  ...DEFAULT_MEASURE_DIMENSION_STYLE,
  ...style
});
