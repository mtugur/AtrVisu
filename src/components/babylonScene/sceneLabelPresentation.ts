import type { DynamicTexture } from "@babylonjs/core";
import {
  TECHNICAL_CSS_COLORS,
  type EffectiveThemeId
} from "../../designSystem";

type SceneLabelTexture = Pick<DynamicTexture, "clear" | "getContext" | "getSize" | "update">;

export type SceneLabelKind = "entity" | "connection-point";

export type SceneLabelPresentation = Readonly<{
  textColor: string;
  backgroundColor: string;
  borderColor: string;
}>;

const SCENE_LABEL_PRESENTATIONS = Object.freeze({
  dark: Object.freeze({
    textColor: TECHNICAL_CSS_COLORS.labelText,
    backgroundColor: TECHNICAL_CSS_COLORS.labelDarkBackground,
    borderColor: TECHNICAL_CSS_COLORS.labelDarkBorder
  }),
  light: Object.freeze({
    textColor: TECHNICAL_CSS_COLORS.labelText,
    backgroundColor: TECHNICAL_CSS_COLORS.labelLightBackground,
    borderColor: TECHNICAL_CSS_COLORS.labelLightBorder
  })
} as const satisfies Readonly<Record<EffectiveThemeId, SceneLabelPresentation>>);

export const getSceneLabelPresentation = (
  effectiveThemeId: EffectiveThemeId
): SceneLabelPresentation => SCENE_LABEL_PRESENTATIONS[effectiveThemeId];

const roundedRectPath = (
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) => {
  context.beginPath();
  context.moveTo(x + radius, y);
  context.lineTo(x + width - radius, y);
  context.quadraticCurveTo(x + width, y, x + width, y + radius);
  context.lineTo(x + width, y + height - radius);
  context.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  context.lineTo(x + radius, y + height);
  context.quadraticCurveTo(x, y + height, x, y + height - radius);
  context.lineTo(x, y + radius);
  context.quadraticCurveTo(x, y, x + radius, y);
  context.closePath();
};

export const drawSceneLabelText = (
  texture: SceneLabelTexture,
  text: string,
  effectiveThemeId: EffectiveThemeId,
  kind: SceneLabelKind = "entity"
) => {
  const presentation = getSceneLabelPresentation(effectiveThemeId);
  const { width, height } = texture.getSize();
  const context = texture.getContext() as unknown as CanvasRenderingContext2D;
  const fontSize = kind === "connection-point" ? 42 : 42;
  const font = `bold ${fontSize}px Arial`;
  const horizontalPadding = kind === "connection-point" ? 20 : 18;
  const verticalPadding = kind === "connection-point" ? 10 : 12;

  texture.clear();
  context.save();
  context.font = font;
  context.textAlign = "center";
  context.textBaseline = "middle";
  const maxTextWidth = Math.max(1, width - horizontalPadding * 4);
  const measuredTextWidth = Math.min(context.measureText(text).width, maxTextWidth);
  const backgroundWidth = Math.min(width - 12, measuredTextWidth + horizontalPadding * 2);
  const backgroundHeight = Math.min(height - 12, fontSize + verticalPadding * 2);
  const backgroundX = (width - backgroundWidth) / 2;
  const backgroundY = (height - backgroundHeight) / 2;

  roundedRectPath(
    context,
    backgroundX,
    backgroundY,
    backgroundWidth,
    backgroundHeight,
    Math.min(12, backgroundHeight / 4)
  );
  context.fillStyle = presentation.backgroundColor;
  context.fill();
  context.strokeStyle = presentation.borderColor;
  context.lineWidth = 1.5;
  context.stroke();
  context.fillStyle = presentation.textColor;
  context.fillText(text, width / 2, height / 2 + 1, maxTextWidth);
  context.restore();
  texture.update();
};
