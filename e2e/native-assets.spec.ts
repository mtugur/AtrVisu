import { expect, test } from "@playwright/test";
import { createNativeGlbFixture } from "../tests/fixtures/nativeGlb";
import { capture, start, openImport, prepare, expectRealModel, customCard } from "./nativeAssetHelpers";

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
