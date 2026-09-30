import type { EffectiveThemeId } from "./effectiveTheme";

export type ViewportVisualPalette = Readonly<{
  background: string;
  workplaneFill: string;
  gridMinor: string;
  gridMajor: string;
  neutralLight: string;
}>;

const freezePalette = (palette: ViewportVisualPalette) => Object.freeze({ ...palette });

export const VIEWPORT_VISUAL_PALETTES = Object.freeze({
  dark: freezePalette({
    background: "#202326",
    workplaneFill: "#2B2F33",
    gridMinor: "#454C52",
    gridMajor: "#707981",
    neutralLight: "#F4F5F6"
  }),
  light: freezePalette({
    background: "#E7EAEC",
    workplaneFill: "#D9DEE1",
    gridMinor: "#BBC2C7",
    gridMajor: "#858F97",
    neutralLight: "#FFFFFF"
  })
} as const satisfies Readonly<Record<EffectiveThemeId, ViewportVisualPalette>>);

export const getViewportVisualPalette = (
  effectiveThemeId: EffectiveThemeId
): ViewportVisualPalette => VIEWPORT_VISUAL_PALETTES[effectiveThemeId];
