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
  const revisionPromptAnswers = ["R01", "Imported revision smoke"];
  const handleRevisionPrompt = async (dialog: import("@playwright/test").Dialog) => {
    expect(dialog.type()).toBe("prompt");
    await dialog.accept(revisionPromptAnswers.shift() ?? "");
  };
  page.on("dialog", handleRevisionPrompt);
  await page.getByTestId("save-scene-revision").click();
  page.off("dialog", handleRevisionPrompt);
  await expect(page.getByRole("dialog", { name: "Project Manager" }).getByText("R01").first()).toBeVisible();
  const projectDownload = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: "Export Project JSON" }).click()
  ]).then(([download]) => download);
  const exportedProjectPath = await projectDownload.path();
  expect(exportedProjectPath).toBeTruthy();
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Delete Project" }).click();
  await expect(page.getByText("Create or import a project to begin.")).toBeVisible();
  await page.getByTestId("close-project-manager").click();
  await expect(page.getByTestId("project-manager-modal")).toHaveCount(0);
  await page.reload();
  await expect(page.getByTestId("app-root")).toBeVisible();
  await expect(page.getByTestId("open-project-manager")).toBeEnabled();
  await page.getByTestId("open-project-manager").click();
  await expect(page.getByText("Create or import a project to begin.")).toBeVisible();
  await page.getByTestId("import-project-file").setInputFiles(exportedProjectPath ?? "");
  await expect(page.getByRole("dialog", { name: "Project Manager" }).getByText("Paketleme Hatti").first()).toBeVisible();
  await expect(page.getByRole("dialog", { name: "Project Manager" }).getByText("R01").first()).toBeVisible();
  await page.reload();
  await expect(page.getByTestId("app-root")).toBeVisible();
  await page.getByTestId("open-project-manager").click();
  await expect(page.getByRole("dialog", { name: "Project Manager" }).getByText("Paketleme Hatti").first()).toBeVisible();
  await page.getByRole("button", { name: "Load Revision" }).click();
  await page.getByTestId("close-project-manager").click();
  await expect(page.getByTestId("project-manager-modal")).toHaveCount(0);
  const propertiesSectionButton = page.getByRole("button", { name: /Selected Object Properties/i });
  if ((await propertiesSectionButton.getAttribute("aria-expanded")) !== "true") {
    await propertiesSectionButton.click();
  }
  await expect(page.getByLabel("Selected machine properties").getByText("Selection")).toBeVisible();
  await expect(page.getByLabel("Selected machine properties").getByText(/Packaging|Machine/i).first()).toBeVisible();

  await page.getByRole("button", { name: /Performance Benchmark/i }).click();
  await page.getByTestId("open-performance-benchmark").click();
  await expect(page.getByTestId("performance-benchmark-modal")).toBeVisible();
  await page.getByTestId("close-performance-benchmark").click();
  await expect(page.getByTestId("performance-benchmark-modal")).toHaveCount(0);

  await page.getByTestId("open-library-manager").click();
  await expect(page.getByTestId("library-manager-modal")).toBeVisible();
  await expect(page.getByTestId("library-manager-custom-library-selector")).toBeVisible();
  await page.getByTestId("library-manager-custom-library-selector").click();
  await expect(page.getByTestId("library-manager-tree-panel")).toBeVisible();
  await expect(page.getByTestId("library-manager-add-item-button")).toBeVisible();
  await expect(page.getByTestId("library-manager-add-item-button")).toBeEnabled();
  await page.getByTestId("library-manager-add-item-button").click();
  await expect(page.getByTestId("library-manager-selected-item-editor")).toBeVisible();
  await expect(page.getByTestId("atara-machine-data-section")).toBeVisible();
  await expect(page.getByTestId("visual-model-calibration-section")).toBeVisible();
  await expect(page.getByTestId("collision-envelope-editor-section")).toBeVisible();
  await page.getByTestId("close-library-manager").click();
  await expect(page.getByTestId("library-manager-modal")).toHaveCount(0);

  await page.getByTestId("open-taxonomy-manager").click();
  await expect(page.getByTestId("taxonomy-manager-modal")).toBeVisible();
  await expect(page.getByRole("dialog", { name: "Taxonomy Manager" }).getByText("Material Handling")).toBeVisible();
  await page.getByTestId("close-taxonomy-manager").click();
  await expect(page.getByTestId("taxonomy-manager-modal")).toHaveCount(0);

  expect(errors).toEqual([]);
});
