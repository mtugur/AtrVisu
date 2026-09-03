import { expect, type Page } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { createNativeGlbFixture } from "../tests/fixtures/nativeGlb";

export const capture = async (page: Page, name: string) => {
  if (process.env.ATRVISU_CAPTURE_PF2B_EVIDENCE !== "1") return;
  const directory = join(process.cwd(), "test-results", "pf2b-native-asset-import");
  await mkdir(directory, { recursive: true });
  await page.screenshot({ path: join(directory, name), fullPage: false });
};
export const start = async (page: Page, width = 1440, height = 900) => {
  const errors: string[] = [];
  page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
  page.on("pageerror", (error) => errors.push(error.message));
  await page.setViewportSize({ width, height });
  await page.goto("/?e2eDiagnostics=1");
  const response = await page.request.get("/");
  expect(response.headers()["x-atrvisu-source-head"]).toBe(process.env.ATRVISU_E2E_EXPECTED_SOURCE_HEAD);
  await expect(page.getByTestId("app-root")).toBeVisible();
  if (width <= 720) await page.getByRole("button", { name: "Open Library", exact: true }).click();
  return errors;
};
export const openImport = async (page: Page) => {
  await page.getByTestId("machine-library-panel").getByRole("button", { name: "Import 3D Asset", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Import 3D Asset", exact: true });
  await expect(dialog).toBeVisible();
  return dialog;
};
export const prepare = async (page: Page, { evidence = false, offsetUnindexed = false, exerciseCalibration = true } = {}) => {
  const dialog = await openImport(page);
  await dialog.getByLabel("GLB file").setInputFiles({ name: "Imported Test Equipment.glb", mimeType: "model/gltf-binary", buffer: Buffer.from(createNativeGlbFixture({ unindexed: offsetUnindexed, offset: offsetUnindexed })) });
  await expect(dialog.getByTestId("native-asset-preview")).toHaveAttribute("data-ready", "true");
  if (evidence) await capture(page, "01-import-file-preview-1440.png");
  await dialog.getByRole("button", { name: "Next", exact: true }).click();
  if (exerciseCalibration) {
    await dialog.getByLabel("Model units").selectOption("mm");
    await expect(dialog.getByLabel("Calibrated dimensions")).toContainText("W 2.0");
    await dialog.getByLabel("Model units").selectOption("m");
    await dialog.getByLabel("Forward axis").selectOption("x+");
    await expect(dialog.getByLabel("Calibrated dimensions")).toContainText("W 3000.0");
  }
  await expectPreviewPixels(page);
  if (offsetUnindexed) {
    await dialog.getByLabel("Center on footprint").uncheck();
    await dialog.getByLabel("Bottom on floor").uncheck();
    await expectPreviewPixels(page);
  }
  if (evidence) await capture(page, "02-import-units-orientation.png");
  await dialog.getByRole("button", { name: "Next", exact: true }).click();
  await dialog.getByLabel("Name", { exact: true }).fill("Imported Test Equipment");
  await dialog.getByLabel("Category", { exact: true }).fill("Packaging");
  await dialog.getByLabel("Tags", { exact: true }).fill("imported, fixture");
  if (evidence) await capture(page, "03-import-metadata.png");
  await dialog.getByRole("button", { name: "Next", exact: true }).click();
  await expect(dialog.getByRole("button", { name: "Validate & Save", exact: true })).toBeEnabled();
  if (evidence) await capture(page, "04-import-validation-ready.png");
  return dialog;
};
export const expectPreviewPixels = async (page: Page) => {
  await expect.poll(() => page.evaluate(() => new Promise<number>((resolve) => requestAnimationFrame(() => {
    const canvas = document.querySelector<HTMLCanvasElement>('[data-testid="native-asset-preview"]')!;
    const gl = canvas.getContext("webgl2") ?? canvas.getContext("webgl");
    if (!gl) { resolve(0); return; }
    const pixels = new Uint8Array(gl.drawingBufferWidth * gl.drawingBufferHeight * 4);
    gl.readPixels(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
    let coloredModelPixels = 0;
    for (let i = 0; i < pixels.length; i += 4) {
      if (pixels[i + 1] > pixels[i] + 20 && pixels[i + 2] > pixels[i] + 20 && pixels[i + 1] > 60) coloredModelPixels++;
    }
    resolve(coloredModelPixels);
  })))).toBeGreaterThan(200);
};
export const expectRealModel = async (page: Page) => {
  await expect.poll(async () => Object.values(JSON.parse(await page.getByLabel("AtrVisu 3D workspace").getAttribute("data-machine-loaded-model-counts") ?? "{}") as Record<string, number>).filter((count) => count > 0).length).toBeGreaterThan(0);
  // Loaded meshes can precede shader readiness. Require the fixture's filled surface,
  // not merely its selection box or the underlying grid, before capturing evidence.
  await expect.poll(() => page.evaluate(() => new Promise<number>((resolve) => requestAnimationFrame(() => {
    const canvas = document.querySelector<HTMLCanvasElement>('[aria-label="AtrVisu 3D workspace"]')!;
    const bounds = Object.values(JSON.parse(canvas.dataset.machineScreenBounds ?? "{}") as Record<string, { left: number; top: number; width: number; height: number }>)[0];
    const gl = canvas.getContext("webgl2") ?? canvas.getContext("webgl");
    if (!gl || !bounds || bounds.width <= 0 || bounds.height <= 0) { resolve(0); return; }
    const scaleX = gl.drawingBufferWidth / canvas.clientWidth;
    const scaleY = gl.drawingBufferHeight / canvas.clientHeight;
    const x = Math.max(0, Math.floor(bounds.left * scaleX));
    const y = Math.max(0, gl.drawingBufferHeight - Math.ceil((bounds.top + bounds.height) * scaleY));
    const width = Math.min(gl.drawingBufferWidth - x, Math.ceil(bounds.width * scaleX));
    const height = Math.min(gl.drawingBufferHeight - y, Math.ceil(bounds.height * scaleY));
    if (width <= 0 || height <= 0) { resolve(0); return; }
    const pixels = new Uint8Array(width * height * 4);
    gl.readPixels(x, y, width, height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
    let filledPixels = 0;
    for (let i = 0; i < pixels.length; i += 4) {
      if (pixels[i] > 60 && pixels[i + 1] > pixels[i] + 15 && pixels[i + 2] > pixels[i] + 15) filledPixels++;
    }
    resolve(filledPixels / (width * height));
  })))).toBeGreaterThan(0.2);
};
export const customCard = (page: Page) => page.getByTestId("machine-library-panel").locator('.asset-card[data-asset-key^="project-custom::"]').filter({ hasText: "Imported Test Equipment" });
