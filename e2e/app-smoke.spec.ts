import { expect, test } from "@playwright/test";

test("AtrVisu app smoke flow has no red console errors", async ({ page }) => {
  const errors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") {
      errors.push(message.text());
    }
  });
  page.on("pageerror", (error) => {
    errors.push(error.message);
  });

  await page.addInitScript(() => {
    window.localStorage.clear();
  });

  await page.goto("/");

  await expect(page.getByTestId("app-root")).toBeVisible();
  await expect(page.getByTestId("right-panel")).toBeVisible();
  await expect(page.getByTestId("machine-library-panel")).toBeVisible();
  await expect(page.getByRole("button", { name: /Atara Standard Library/i }).first()).toBeVisible();

  await page.getByRole("button", { name: /Display \/ Overlay Controls/i }).click();
  await expect(page.getByTestId("overlay-controls")).toBeVisible();
  await page.getByLabel("Show Labels").uncheck();
  await page.getByLabel("Show Labels").check();
  await page.getByLabel("Show Collision Envelope").check();

  await expect(page.getByRole("button", { name: /Collision Check/i })).toBeVisible();
  await expect(page.getByTestId("collision-check-panel")).toBeVisible();
  await page.getByLabel("Enable Collision Check").uncheck();
  await page.getByLabel("Enable Collision Check").check();

  await expect(page.getByRole("button", { name: /Precision Placement/i })).toBeVisible();
  await expect(page.getByTestId("precision-placement-panel")).toBeVisible();
  await page.getByLabel("Grid Snap", { exact: true }).uncheck();
  await page.getByLabel("Grid Snap", { exact: true }).check();
  await page.getByLabel("Grid Snap Step").fill("250");
  await page.getByLabel("Rotation Snap", { exact: true }).uncheck();
  await page.getByLabel("Rotation Snap", { exact: true }).check();
  await page.getByLabel("Rotation Snap Step").fill("45");

  await page.locator(".machine-card").first().click();
  await page.getByRole("button", { name: /Selected Object Properties/i }).click();
  const rotationInput = page.getByLabel(/Rotation Angle/i);
  await rotationInput.fill("50");
  await rotationInput.press("Enter");
  await expect(rotationInput).toHaveValue("45");

  await page.getByTestId("open-project-manager").click();
  await expect(page.getByTestId("project-manager-modal")).toBeVisible();
  await page.getByTestId("new-project-name").fill("Paketleme Hatti");
  await page.getByTestId("new-customer-name").fill("ABC Un");
  await page.getByTestId("create-project").click();
  await expect(page.getByRole("dialog", { name: "Project Manager" }).getByText("Paketleme Hatti").first()).toBeVisible();
  await expect(page.getByTestId("save-scene-revision")).toBeVisible();
  await page.getByTestId("close-project-manager").click();
  await expect(page.getByTestId("project-manager-modal")).toHaveCount(0);

  await page.getByTestId("open-library-manager").click();
  await expect(page.getByTestId("library-manager-modal")).toBeVisible();
  await page.getByRole("dialog", { name: "Library Manager" }).getByRole("button", { name: "Add Item" }).last().click();
  await expect(page.getByTestId("visual-model-calibration-section")).toBeVisible();
  await expect(page.getByTestId("collision-envelope-editor-section")).toBeVisible();
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByTestId("close-library-manager").click();
  await expect(page.getByTestId("library-manager-modal")).toHaveCount(0);

  await page.getByTestId("open-taxonomy-manager").click();
  await expect(page.getByTestId("taxonomy-manager-modal")).toBeVisible();
  await expect(page.getByRole("dialog", { name: "Taxonomy Manager" }).getByText("Material Handling")).toBeVisible();
  await page.getByTestId("close-taxonomy-manager").click();
  await expect(page.getByTestId("taxonomy-manager-modal")).toHaveCount(0);

  expect(errors).toEqual([]);
});
