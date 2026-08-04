export type TechnicalRgb = readonly [red: number, green: number, blue: number];
export type TechnicalRgba = readonly [red: number, green: number, blue: number, alpha: number];

export const TECHNICAL_COLOR_RGB = Object.freeze({
  black: [0, 0, 0],
  white: [1, 1, 1],
  nearWhite: [0.92, 0.92, 0.92],
  sceneAmbient: [0.18, 0.22, 0.25],
  sceneGround: [0.08, 0.09, 0.1],
  gridMinor: [0.18, 0.68, 0.74],
  gridMinorEmissive: [0.04, 0.17, 0.18],
  gridMajor: [0.7, 0.86, 0.56],
  gridMajorEmissive: [0.12, 0.16, 0.08],
  annotationSelected: [1, 0.86, 0.28],
  annotationFallback: [0.7, 0.85, 0.76],
  connectionProductIn: [0.45, 0.82, 1],
  connectionProductOut: [0.7, 1, 0.48],
  connectionElectrical: [1, 0.82, 0.2],
  connectionPneumatic: [0.55, 0.72, 1],
  connectionNetwork: [0.75, 0.55, 1],
  connectionAspiration: [0.95, 0.62, 0.42],
  selectionFrame: [1, 0.93, 0.38],
  selectionPrimary: [1, 0.86, 0.28],
  selectionSecondary: [0.37, 0.78, 1],
  metadataFrame: [0.25, 0.78, 1],
  collisionFrame: [0.35, 0.72, 1],
  collisionActive: [1, 0.22, 0.16],
  clearanceFrame: [1, 0.56, 0.22],
  flowArrow: [0.98, 0.98, 0.72],
  product: [0.96, 0.82, 0.38],
  productEmissive: [0.08, 0.05, 0.01],
  productSpecular: [0.12, 0.1, 0.05],
  darkSpecular: [0.08, 0.08, 0.08],
  darkCoolSpecular: [0.08, 0.1, 0.1],
  objectSpecular: [0.14, 0.16, 0.18],
  collisionTint: [0.42, 0.08, 0.04],
  warningTint: [0.24, 0.2, 0.05],
  collisionEmissive: [0.18, 0.03, 0.02],
  warningEmissive: [0.28, 0.22, 0.06],
  annotationLeader: [0.74, 0.86, 0.78]
} as const satisfies Record<string, TechnicalRgb>);

export const TECHNICAL_COLOR_RGBA = Object.freeze({
  sceneClear: [0.035, 0.045, 0.055, 1]
} as const satisfies Record<string, TechnicalRgba>);

export type TechnicalColor3Id = keyof typeof TECHNICAL_COLOR_RGB;
export type TechnicalColor4Id = keyof typeof TECHNICAL_COLOR_RGBA;

export const TECHNICAL_CSS_COLORS = Object.freeze({
  labelText: "#f8fbf6",
  transparent: "transparent",
  annotationSelectedBorder: "#ffe58a",
  annotationSelectedText: "#fff2a8",
  annotationSelectedBackground: "rgba(48, 43, 20, 0.94)",
  libraryDefault: "#7fc8ff",
  layerDefault: "#a8c978",
  benchmarkMachine: "#7fb7ff"
} as const);

export const CIVIL_TECHNICAL_COLORS = Object.freeze({
  "floor-area": "#3f6f91",
  wall: "#8d98a5",
  column: "#b6bdc8",
  "door-opening": "#7ec8de",
  "restricted-area": "#d77957",
  walkway: "#d5c25d",
  "reference-zone": "#75b99d"
} as const);

export const ANNOTATION_TECHNICAL_STYLES = Object.freeze({
  note: { textColor: "#f6fbf5", backgroundColor: "rgba(18, 24, 23, 0.86)", borderColor: "#6e8178", accentColor: "#aab8ae" },
  info: { textColor: "#e9f7ff", backgroundColor: "rgba(12, 42, 59, 0.9)", borderColor: "#56b5df", accentColor: "#7ed8ff" },
  warning: { textColor: "#fff3d2", backgroundColor: "rgba(67, 38, 9, 0.92)", borderColor: "#ffb547", accentColor: "#ffd166" },
  callout: { textColor: "#effff9", backgroundColor: "rgba(9, 45, 38, 0.9)", borderColor: "#58d1af", accentColor: "#8ff0d1" },
  "dimension-note": { textColor: "#eef6ff", backgroundColor: "rgba(19, 35, 62, 0.9)", borderColor: "#8fb7ff", accentColor: "#b9d1ff" },
  "area-note": { textColor: "#f5f0ff", backgroundColor: "rgba(42, 30, 67, 0.9)", borderColor: "#b69cff", accentColor: "#d4c3ff" }
} as const);
