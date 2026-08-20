import type { DynamicTexture } from "@babylonjs/core";

type MachineLabelTexture = Pick<DynamicTexture, "clear" | "drawText">;

export const drawMachineLabelText = (
  texture: MachineLabelTexture,
  text: string,
  color: string
) => {
  texture.clear();
  texture.drawText(text, null, 78, "bold 42px Arial", color, null, true, true);
};
