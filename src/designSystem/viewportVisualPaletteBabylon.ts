import { Color3, Color4 } from "@babylonjs/core";
import type { ViewportVisualPalette } from "./viewportVisualPalette";

const hexToRgb = (hex: string) => {
  const value = Number.parseInt(hex.slice(1), 16);
  return [
    ((value >> 16) & 255) / 255,
    ((value >> 8) & 255) / 255,
    (value & 255) / 255
  ] as const;
};

export const createViewportPaletteColor3 = (
  palette: ViewportVisualPalette,
  role: keyof ViewportVisualPalette
) => {
  const [red, green, blue] = hexToRgb(palette[role]);
  return new Color3(red, green, blue);
};

export const createViewportPaletteColor4 = (
  palette: ViewportVisualPalette,
  role: keyof ViewportVisualPalette
) => {
  const [red, green, blue] = hexToRgb(palette[role]);
  return new Color4(red, green, blue, 1);
};
