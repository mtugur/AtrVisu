export type VisibilityTarget = {
  isVisible: boolean;
};

export type RgbBackground = readonly [red: number, green: number, blue: number];

export const compositeRgbaOverBackground = (
  data: ArrayBufferView,
  background: RgbBackground
) => {
  const source = new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
  const output = new Uint8Array(source);
  for (let offset = 0; offset + 3 < output.length; offset += 4) {
    const alpha = output[offset + 3] / 255;
    const inverseAlpha = 1 - alpha;
    output[offset] = Math.round(output[offset] * alpha + background[0] * inverseAlpha);
    output[offset + 1] = Math.round(output[offset + 1] * alpha + background[1] * inverseAlpha);
    output[offset + 2] = Math.round(output[offset + 2] * alpha + background[2] * inverseAlpha);
    output[offset + 3] = 255;
  }
  return output;
};

export const captureWithoutEditorAffordances = async <Result>(
  targets: readonly VisibilityTarget[],
  capture: () => Promise<Result>
) => {
  const states = targets.map((target) => ({ target, isVisible: target.isVisible }));
  states.forEach(({ target }) => {
    target.isVisible = false;
  });
  try {
    return await capture();
  } finally {
    states.forEach(({ target, isVisible }) => {
      target.isVisible = isVisible;
    });
  }
};
