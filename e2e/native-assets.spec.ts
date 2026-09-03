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
const prepare = async (page: Page, { evidence = false, offsetUnindexed = false, exerciseCalibration = true } = {}) => {
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

type RenderTransform = { box: number[]; label: number[]; children: { name: string; position: number[] }[] };
const renderTransforms = async (page: Page): Promise<Record<string, RenderTransform>> =>
  JSON.parse(await page.getByLabel("AtrVisu 3D workspace").getAttribute("data-machine-render-transforms") ?? "{}");
const expectVerticalOffset = (before: RenderTransform, after: RenderTransform, delta: number) => {
  const expectPosition = (start: number[], end: number[]) => {
    expect(end[0]).toBeCloseTo(start[0]);
    expect(end[1]).toBeCloseTo(start[1] + delta);
    expect(end[2]).toBeCloseTo(start[2]);
  };
  expectPosition(before.box, after.box);
  expectPosition(before.label, after.label);
  expect(after.children.map((child) => child.name)).toEqual(before.children.map((child) => child.name));
  expect(before.children.length).toBeGreaterThan(0);
  before.children.forEach((child, index) => {
    // Product animation may advance along the conveyor, but its elevation is inherited too.
    expect(after.children[index].position[1]).toBeCloseTo(child.position[1] + delta);
  });
};
const openProjects = async (page: Page) => {
  await page.getByRole("menuitem", { name: "File", exact: true }).click();
  await page.locator('[role="menu"] [data-command-id="project.manager"]').click();
  await expect(page.getByTestId("project-manager-modal")).toBeVisible();
};

test("PF-2B picker has one accessible selected-file state and supports same-file reselection", async ({ page }) => {
  const errors = await start(page);
  const dialog = await openImport(page);
  const input = dialog.getByLabel("GLB file", { exact: true });
  const button = dialog.getByRole("button", { name: "Choose GLB file", exact: true });
  const status = dialog.getByTestId("native-asset-selected-file");
  await expect(input).toBeHidden();
  await expect(status).toHaveText("No GLB selected");
  const buffer = Buffer.from(createNativeGlbFixture());
  for (const key of ["Enter", "Space"]) {
    await button.focus();
    await expect(button).toBeFocused();
    const chooserEvent = page.waitForEvent("filechooser");
    await button.press(key);
    const chooser = await chooserEvent;
    await chooser.setFiles({ name: "Selected Equipment.glb", mimeType: "model/gltf-binary", buffer });
    await expect(dialog.getByTestId("native-asset-preview")).toHaveAttribute("data-ready", "true");
    await expectPreviewPixels(page);
    const text = `Selected Equipment.glb (${(buffer.byteLength / 1024).toFixed(1)} KB)`;
    await expect(status).toHaveCount(1);
    await expect(status).toHaveText(text);
    await expect(dialog.getByText(text, { exact: true })).toHaveCount(1);
    await expect(button).toHaveAccessibleDescription(text);
    await expect(input).toBeHidden();
    await expect(input).toHaveValue("");
    expect(await dialog.innerText()).not.toMatch(/No file selected|Dosya seçilmedi|No GLB selected/i);
  }
  // Cancelling leaves the application-owned selection intact.
  await input.dispatchEvent("cancel");
  await expect(status).toContainText("Selected Equipment.glb");
  await capture(page, "12-truthful-selected-file.png");
  expect(errors).toEqual([]);
});

for (const imported of [false, true]) {
  test(`PF-2B ${imported ? "persisted GLB" : "Standard machine"} elevation moves root label and child affordances without changing Plan X/Y`, async ({ page }) => {
    const errors = await start(page);
    const canvas = page.getByLabel("AtrVisu 3D workspace");
    await expect(canvas).toHaveAttribute("data-scene-lifecycle-generation", /\d+/);
    const generation = await canvas.getAttribute("data-scene-lifecycle-generation");
    const canvasHandle = await canvas.elementHandle();
    if (imported) {
      await openProjects(page);
      await page.getByTestId("new-project-name").fill("Elevated GLB Project");
      await page.getByTestId("new-customer-name").fill("E2E Customer");
      await page.getByTestId("create-project").click();
      await expect(page.getByTestId("project-manager-project-list")).toContainText("Elevated GLB Project");
      await page.getByTestId("close-project-manager").click();
      // Calibration controls are exercised by the dedicated import/responsive cases.
      const dialog = await prepare(page, { exerciseCalibration: false });
      await dialog.getByRole("button", { name: "Validate & Save", exact: true }).click();
      await expect(dialog).toHaveCount(0);
    }
    const name = imported ? "Imported Test Equipment" : "Flow Pack Machine";
    const library = page.getByTestId("machine-library-panel");
    await library.getByLabel("Search assets").fill(name);
    await library.getByRole("button", { name: `Add ${name} to layout`, exact: true }).click();
    if (imported) await expectRealModel(page);
    await expect.poll(async () => Object.keys(await renderTransforms(page)).length).toBe(1);
    const [id, before] = Object.entries(await renderTransforms(page))[0];
    const plan = await canvas.getAttribute("data-machine-plan-positions");
    const planX = await page.getByRole("textbox", { name: "Plan X", exact: true }).inputValue();
    const planY = await page.getByRole("textbox", { name: "Plan Y", exact: true }).inputValue();
    const elevation = page.getByRole("textbox", { name: "Elevation", exact: true });
    const screenBefore = JSON.parse(await canvas.getAttribute("data-machine-screen-points") ?? "{}")[id];
    await elevation.fill("1500");
    await elevation.press("Tab");
    await expect.poll(async () => (await renderTransforms(page))[id]?.box[1]).toBeCloseTo(before.box[1] + 1.5);
    expectVerticalOffset(before, (await renderTransforms(page))[id], 1.5);
    await expect.poll(async () => JSON.parse(await canvas.getAttribute("data-machine-screen-points") ?? "{}")[id]?.y).toBeLessThan(screenBefore.y - 5);
    await expect(canvas).toHaveAttribute("data-machine-plan-positions", plan!);
    await expect(page.getByRole("textbox", { name: "Plan X", exact: true })).toHaveValue(planX);
    await expect(page.getByRole("textbox", { name: "Plan Y", exact: true })).toHaveValue(planY);
    await expect(canvas).toHaveAttribute("data-scene-lifecycle-generation", generation!);
    expect(await canvasHandle?.evaluate((element) => element === document.querySelector('[aria-label="AtrVisu 3D workspace"]'))).toBe(true);
    if (imported) {
      await expectRealModel(page);
      await capture(page, "13-imported-model-elevated.png");
      let prompts = 0;
      page.on("dialog", async (dialog) => { if (dialog.type() === "prompt") await dialog.accept(prompts++ === 0 ? "Elevated" : "1500 mm above floor"); });
      await page.getByTestId("workbench-command-bar").locator('[data-command-id="project.save"]').click();
      await expect.poll(() => page.evaluate(() => window.__atrvisuProjectCommands?.getActiveContext().hasUnsavedChanges)).toBe(false);
      const saved = await page.evaluate(() => window.__atrvisuProjectCommands!.getActiveContext());
      expect(saved.revisionId).not.toBeNull();
      await page.reload();
      await expect(page.getByTestId("empty-project-welcome")).toBeVisible();
      await page.getByTestId("empty-project-welcome").getByRole("button", { name: "Open Project", exact: true }).click();
      const manager = page.getByTestId("project-manager-modal");
      await manager.getByTestId("project-manager-project-option").filter({ hasText: "Elevated GLB Project" }).click();
      await manager.getByRole("button", { name: "Load Revision", exact: true }).click();
      await manager.getByTestId("close-project-manager").click();
      await expectRealModel(page);
      await expect.poll(async () => (await renderTransforms(page))[id]?.box[1]).toBeCloseTo(before.box[1] + 1.5);
      expectVerticalOffset(before, (await renderTransforms(page))[id], 1.5);
      await expect(canvas).toHaveAttribute("data-machine-plan-positions", plan!);
      expect(await page.evaluate(() => window.__atrvisuProjectCommands!.getActiveContext())).toMatchObject(saved);
      await capture(page, "14-elevated-model-project-reload.png");
    } else {
      await elevation.fill("0");
      await elevation.press("Tab");
      await expect.poll(async () => (await renderTransforms(page))[id]?.box[1]).toBeCloseTo(before.box[1]);
      expectVerticalOffset(before, (await renderTransforms(page))[id], 0);
      await expect(canvas).toHaveAttribute("data-machine-plan-positions", plan!);
    }
    expect(errors).toEqual([]);
  });
}

test("PF-2B native GLB preview save Add and hard reload resolve the persisted real model", async ({ page }) => {
  const errors = await start(page);
  const canvas = await page.getByLabel("AtrVisu 3D workspace").elementHandle();
  const dialog = await prepare(page, { evidence: true });
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
    const dialog = await prepare(page, { offsetUnindexed: width === 1024 });
    await expect(dialog.getByRole("button", { name: "Validate & Save", exact: true })).toBeInViewport();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await capture(page, width === 640 ? "10-import-640.png" : "11-import-1024.png");
    expect(errors).toEqual([]);
  });
}
