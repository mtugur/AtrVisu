import { Color3, Color4 } from "@babylonjs/core";
import {
  TECHNICAL_COLOR_RGB,
  TECHNICAL_COLOR_RGBA,
  type TechnicalColor3Id,
  type TechnicalColor4Id
} from "./technicalPalette";

export const createTechnicalColor3 = (colorId: TechnicalColor3Id) => {
  const [red, green, blue] = TECHNICAL_COLOR_RGB[colorId];
  return new Color3(red, green, blue);
};

export const createTechnicalColor4 = (colorId: TechnicalColor4Id) => {
  const [red, green, blue, alpha] = TECHNICAL_COLOR_RGBA[colorId];
  return new Color4(red, green, blue, alpha);
};

export const createTechnicalColor3FromHex = (hexColor: string) =>
  Color3.FromHexString(hexColor);
