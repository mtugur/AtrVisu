export const THEME_IDS = ["light", "dark", "system"] as const;
export type ThemeId = (typeof THEME_IDS)[number];

export const DENSITY_IDS = ["compact", "comfortable"] as const;
export type DensityId = (typeof DENSITY_IDS)[number];

export const DESIGN_TOKEN_FAMILIES = [
  "surface",
  "elevation",
  "text",
  "border",
  "interaction",
  "focus",
  "selection",
  "spacing",
  "typography",
  "control-size",
  "density",
  "icon-size",
  "semantic-status",
  "viewport-overlay",
  "technical-palette",
  "z-index"
] as const;

export type DesignTokenFamily = (typeof DESIGN_TOKEN_FAMILIES)[number];
