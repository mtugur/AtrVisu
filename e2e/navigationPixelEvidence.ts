import type { Page } from "@playwright/test";
import { analyzeMachinePixels, getMachinePixelRegion, type Rgb } from "../tests/helpers/navigationPixels";

export async function measureMachinePixels(page: Page, entityId: string, corners: readonly { x: number; y: number; z: number }[]) {
  const region = getMachinePixelRegion(corners);
  const pagePng = await page.screenshot();
  const readback = await page.evaluate(({ bounds }) => new Promise<{
    rgba: number[]; png: string; backgroundRgb: [number, number, number]; glError: number;
    contextLost: boolean; viewport: number[]; canvasStyle: { opacity: string; visibility: string; display: string };
    sampleOccluder: string | null;
  }>((resolve, reject) => requestAnimationFrame(() => {
    const canvas = document.querySelector<HTMLCanvasElement>('[aria-label="AtrVisu 3D workspace"]')!;
    const gl = canvas.getContext("webgl2") ?? canvas.getContext("webgl");
    if (!gl) { reject(new Error("Machine framebuffer unavailable.")); return; }
    const rect = canvas.getBoundingClientRect();
    if (bounds.x < rect.x || bounds.y < rect.y || bounds.x + bounds.width > rect.right || bounds.y + bounds.height > rect.bottom) {
      reject(new Error("Machine sample falls outside the actual canvas.")); return;
    }
    const width = gl.drawingBufferWidth;
    const height = gl.drawingBufferHeight;
    const pixels = new Uint8Array(width * height * 4);
    gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
    const rgba: number[] = [];
    for (let y = bounds.y; y < bounds.y + bounds.height; y++) {
      for (let x = bounds.x; x < bounds.x + bounds.width; x++) {
        const bx = Math.floor((x - rect.x + .5) * width / rect.width);
        const by = height - 1 - Math.floor((y - rect.y + .5) * height / rect.height);
        const offset = (by * width + bx) * 4;
        rgba.push(...pixels.subarray(offset, offset + 4));
      }
    }
    // Encode the exact readback; never render again or mutate Babylon to obtain evidence.
    const topDown = new Uint8ClampedArray(pixels.length);
    for (let y = 0; y < height; y++) topDown.set(pixels.subarray((height - 1 - y) * width * 4, (height - y) * width * 4), y * width * 4);
    const image = document.createElement("canvas");
    image.width = width; image.height = height;
    image.getContext("2d")!.putImageData(new ImageData(topDown, width, height), 0, 0);
    const clear = gl.getParameter(gl.COLOR_CLEAR_VALUE) as Float32Array;
    const style = getComputedStyle(canvas);
    const hit = document.elementFromPoint(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
    resolve({ rgba, png: image.toDataURL("image/png").split(",")[1], backgroundRgb: [Math.round(clear[0] * 255), Math.round(clear[1] * 255), Math.round(clear[2] * 255)],
      glError: gl.getError(), contextLost: gl.isContextLost(), viewport: Array.from(gl.getParameter(gl.VIEWPORT)),
      canvasStyle: { opacity: style.opacity, visibility: style.visibility, display: style.display }, sampleOccluder: hit?.tagName ?? null });
  })), { bounds: region.sampleBounds });
  const screenshotRgba = await page.evaluate(async ({ base64, bounds }) => {
    const image = new Image(); image.src = `data:image/png;base64,${base64}`;
    await image.decode();
    const canvas = document.createElement("canvas"); canvas.width = image.width; canvas.height = image.height;
    const context = canvas.getContext("2d")!; context.drawImage(image, 0, 0);
    return Array.from(context.getImageData(bounds.x, bounds.y, bounds.width, bounds.height).data);
  }, { base64: pagePng.toString("base64"), bounds: region.sampleBounds });
  const framebuffer = analyzeMachinePixels(entityId, region, readback.rgba, readback.backgroundRgb as Rgb);
  const screenshot = analyzeMachinePixels(entityId, region, screenshotRgba, readback.backgroundRgb as Rgb);
  const { rgba: _rgba, png, backgroundRgb: _background, ...renderer } = readback;
  return { pagePng, framebufferPng: Buffer.from(png, "base64"), evidence: {
    machinePixelEvidence: { ...framebuffer, projectedCorners: corners }, pageScreenshot: screenshot, renderer,
    classification: !framebuffer.pass ? "rendered-machine-missing" : screenshot.pass ? "rendered-and-composited" : "headless-compositor-evidence-limitation"
  } };
}
