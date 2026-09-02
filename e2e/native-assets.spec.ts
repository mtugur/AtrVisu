import { expect, test, type Page } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { createNativeGlbFixture } from "../tests/fixtures/nativeGlb";

const capture = async (page: Page, name: string) => {
  if (process.env.ATRVISU_CAPTURE_PF2B_EVIDENCE !== "1") return;
  const directory = join(process.cwd(), "test-results", "pf2b-native-asset-import");
  await mkdir(directory, { recursive: true });
  await page.screenshot({ path: join(directory, name), fullPage: false });
};
const start = async (page: Page, width = 1440, height = 900) => {
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
const openImport = async (page: Page) => {
  await page.getByTestId("machine-library-panel").getByRole("button", { name: "Import 3D Asset", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Import 3D Asset", exact: true });
  await expect(dialog).toBeVisible();
  return dialog;
};
const prepare = async (page: Page, evidence = false, offsetUnindexed = false) => {
  const dialog = await openImport(page);
  await dialog.getByLabel("GLB file").setInputFiles({ name: "Imported Test Equipment.glb", mimeType: "model/gltf-binary", buffer: Buffer.from(createNativeGlbFixture({ unindexed: offsetUnindexed, offset: offsetUnindexed })) });
  await expect(dialog.getByTestId("native-asset-preview")).toHaveAttribute("data-ready", "true");
  if (evidence) await capture(page, "01-import-file-preview-1440.png");
  await dialog.getByRole("button", { name: "Next", exact: true }).click();
  await dialog.getByLabel("Model units").selectOption("mm");
  await expect(dialog.getByLabel("Calibrated dimensions")).toContainText("W 2.0");
  await dialog.getByLabel("Model units").selectOption("m");
  await dialog.getByLabel("Forward axis").selectOption("x+");
  await expect(dialog.getByLabel("Calibrated dimensions")).toContainText("W 3000.0");
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
const expectPreviewPixels = async (page: Page) => {
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
const expectRealModel = async (page: Page) => {
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
const customCard = (page: Page) => page.getByTestId("machine-library-panel").locator('.asset-card[data-asset-key^="project-custom::"]').filter({ hasText: "Imported Test Equipment" });

test("PF-2B native GLB preview save Add and hard reload resolve the persisted real model", async ({ page }) => {
  const errors = await start(page);
  const canvas = await page.getByLabel("AtrVisu 3D workspace").elementHandle();
  const dialog = await prepare(page, true);
  expect(await canvas?.evaluate((element) => element.isConnected)).toBe(true);
  await dialog.getByRole("button", { name: "Validate & Save", exact: true }).click();
  await expect(dialog).toHaveCount(0);
  expect(await canvas?.evaluate((element) => element === document.querySelector('[aria-label="AtrVisu 3D workspace"]'))).toBe(true);
  const library = page.getByTestId("machine-library-panel");
  await library.getByLabel("Search assets").fill("Imported Test Equipment");
  await expect(customCard(page)).toBeVisible();
  const key = await customCard(page).getAttribute("data-asset-key");
  await capture(page, "05-import-saved-project-custom.png");
  await customCard(page).getByRole("button", { name: "Add Imported Test Equipment to layout", exact: true }).click();
  await expectRealModel(page);
  await library.getByRole("button", { name: "Recent", exact: true }).click();
  await expect(customCard(page)).toBeVisible();
  await capture(page, "06-imported-model-added.png");
  await page.reload();
  await expect(library).toHaveAttribute("data-asset-preferences-status", "ready");
  await library.getByLabel("Search assets").fill("Imported Test Equipment");
  await expect(customCard(page)).toHaveAttribute("data-asset-key", key!);
  await customCard(page).getByRole("button", { name: "Add Imported Test Equipment to layout", exact: true }).click();
  await expectRealModel(page);
  await capture(page, "07-import-persisted-after-reload.png");
  expect(errors).toEqual([]);
});

test("PF-2B malformed GLB cannot save or leave an orphan model", async ({ page }) => {
  const errors = await start(page);
  const before = await page.evaluate(() => localStorage.getItem("atrvisu.projectCustomLibrary.v1"));
  const dialog = await openImport(page);
  await dialog.getByLabel("GLB file").setInputFiles({ name: "invalid.glb", mimeType: "model/gltf-binary", buffer: Buffer.from("not a model") });
  await expect(dialog.getByRole("alert")).toContainText("valid");
  await expect(dialog.getByRole("button", { name: "Next", exact: true })).toBeDisabled();
  await expect(dialog.getByRole("button", { name: "Validate & Save", exact: true })).toHaveCount(0);
  expect(await page.evaluate(() => localStorage.getItem("atrvisu.projectCustomLibrary.v1"))).toBe(before);
  expect(await page.evaluate(() => new Promise<number>((resolve, reject) => {
    const request = indexedDB.open("atrvisu-db");
    request.onerror = () => reject(request.error);
    request.onsuccess = () => { const db = request.result; const count = db.transaction("importedModels").objectStore("importedModels").count(); count.onsuccess = () => { resolve(count.result); db.close(); }; };
  }))).toBe(0);
  await capture(page, "08-invalid-import.png");
  await dialog.getByLabel("GLB file").setInputFiles({ name: "empty.glb", mimeType: "model/gltf-binary", buffer: Buffer.from(createNativeGlbFixture({ noGeometry: true })) });
  await expect(dialog.getByRole("alert")).toBeVisible();
  await expect(dialog.getByRole("button", { name: "Next", exact: true })).toBeDisabled();
  expect(errors).toEqual([]);
});

test("PF-2B Standard custom variant is editable without mutating its source", async ({ page }) => {
  const errors = await start(page);
  const library = page.getByTestId("machine-library-panel");
  await library.getByLabel("Search assets").fill("Flow Pack Machine");
  const standard = library.locator('[data-asset-key="atara-standard::packaging-flowpack-01"]');
  const before = await standard.innerText();
  await standard.getByRole("button", { name: "Create Custom Variant of Flow Pack Machine", exact: true }).click();
  const variant = library.locator('.asset-card[data-asset-key^="project-custom::"]').filter({ hasText: "Flow Pack Machine Custom" });
  await expect(variant).toBeVisible();
  const variantId = (await variant.getAttribute("data-asset-key"))!.split("::")[1];
  expect(await standard.innerText()).toBe(before);
  await capture(page, "09-custom-variant.png");
  await page.getByRole("menuitem", { name: "Tools", exact: true }).click();
  await page.getByRole("menuitem", { name: "Library Manager", exact: true }).click();
  const manager = page.getByTestId("library-manager-modal");
  await expect(manager).toBeVisible();
  await manager.getByTestId("library-manager-custom-library-button").click();
  await manager.getByTestId(`library-manager-item-${variantId}`).click();
  await manager.getByLabel("Name", { exact: true }).fill("Custom Line Wrapper");
  await manager.getByRole("button", { name: "Save Item", exact: true }).click();
  await expect(manager.locator(".manager-status")).toContainText("saved");
  await manager.getByTestId("close-library-manager-header").click();
  await library.getByLabel("Search assets").fill("Custom Line Wrapper");
  await expect(library.locator('.asset-card[data-asset-key^="project-custom::"]')).toContainText("Custom Line Wrapper");
  await library.getByLabel("Search assets").fill("Flow Pack Machine");
  expect(await standard.innerText()).toBe(before);
  expect(errors).toEqual([]);
});

for (const [width, height] of [[1024, 768], [640, 800]]) {
  test(`PF-2B import stays operable at ${width}`, async ({ page }) => {
    const errors = await start(page, width, height);
    const dialog = await prepare(page, false, width === 1024);
    await expect(dialog.getByRole("button", { name: "Validate & Save", exact: true })).toBeInViewport();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await capture(page, width === 640 ? "10-import-640.png" : "11-import-1024.png");
    expect(errors).toEqual([]);
  });
}
