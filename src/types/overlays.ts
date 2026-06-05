export type OverlaySettings = {
  showLabels: boolean;
  showSelectionBox: boolean;
  showMetadataBox: boolean;
  showClearanceEnvelope: boolean;
};

export type VisualModelStatus = "none" | "loading" | "loaded" | "proxy" | "fallback" | "failed";

export type VisualModelDiagnostics = {
  instanceId: string;
  visualStatus: VisualModelStatus;
  visualSource: "glb" | "proxy" | "fallback" | "none";
  modelPath: string | null;
  scaleMode: "metadata-box" | "model-units";
  modelUnit: "m" | "mm";
  placeholderVisualType: string;
  fallbackReason?: string;
  category: string;
  machineType?: string;
  productFamilyCode?: string;
  metadataBoundsMm: {
    widthMm: number;
    depthMm: number;
    heightMm: number;
  };
  visualBoundsMm?: {
    widthMm: number;
    depthMm: number;
    heightMm: number;
  };
  boundsDifferenceMm?: {
    widthMm: number;
    depthMm: number;
    heightMm: number;
  };
  calibration: {
    centerOnFootprint: boolean;
    bottomOnFloor: boolean;
    preserveAspectRatio: boolean;
    forwardAxis: "x+" | "x-" | "z+" | "z-";
    upAxis: "y+" | "z+" | "x+";
  };
  appliedScale?: {
    x: number;
    y: number;
    z: number;
  };
  rotationOffsetDeg: {
    x: number;
    y: number;
    z: number;
  };
  positionOffsetMm: {
    xMm: number;
    yMm: number;
    zMm: number;
  };
  warnings: string[];
};
