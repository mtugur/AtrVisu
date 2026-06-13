import { expect, type Page, test } from "@playwright/test";

const collectPageErrors = (page: Page) => {
  const errors: string[] = [];

  page.on("console", (message) => {
    if (message.type() === "error") {
      errors.push(message.text());
    }
  });
  page.on("pageerror", (error) => {
    errors.push(error.message);
  });

  return errors;
};

const openCleanApp = async (page: Page) => {
  await page.addInitScript(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });

  await page.goto("/");
  await expect(page.getByTestId("app-root")).toBeVisible();
  await expect(page.getByTestId("right-panel")).toBeVisible();
  await expect(page.getByTestId("machine-library-panel")).toBeVisible();
};

const expectNoModalBackdrop = async (page: Page) => {
  await expect(page.locator(".manager-backdrop")).toHaveCount(0);
};

test("app loads and core panels have no red console errors", async ({ page }) => {
  const errors = collectPageErrors(page);
  await openCleanApp(page);

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

  expect(errors).toEqual([]);
});

test("selected object and numeric rotation smoke has no red console errors", async ({ page }) => {
  const errors = collectPageErrors(page);
  await openCleanApp(page);

  await page.getByLabel("Grid Snap", { exact: true }).uncheck();
  await page.getByLabel("Grid Snap", { exact: true }).check();
  await page.getByLabel("Grid Snap Step").fill("250");
  await page.getByLabel("Rotation Snap", { exact: true }).uncheck();
  await page.getByLabel("Rotation Snap", { exact: true }).check();
  await page.getByLabel("Rotation Snap Step").fill("45");

  await page.locator(".machine-card").first().click();
  const propertiesSectionButton = page.getByRole("button", { name: /Selected Object Properties/i });
  if ((await propertiesSectionButton.getAttribute("aria-expanded")) !== "true") {
    await propertiesSectionButton.click();
  }
  await expect(page.getByLabel("Selected machine properties").getByText("Selection")).toBeVisible();
  await expect(page.getByLabel("Selected machine properties").getByText(/Packaging|Machine/i).first()).toBeVisible();

  const rotationInput = page.getByLabel(/Rotation Angle/i);
  await rotationInput.fill("50");
  await rotationInput.press("Enter");
  await expect(rotationInput).toHaveValue("45");

  expect(errors).toEqual([]);
});

test("project and performance modals open and close deterministically", async ({ page }) => {
  const errors = collectPageErrors(page);
  await openCleanApp(page);

  await page.getByTestId("open-project-manager").click();
  await expect(page.getByTestId("project-manager-modal")).toBeVisible();
  await expect(page.getByTestId("project-manager-ready")).toBeVisible();
  await expect(page.getByTestId("new-project-name")).toBeVisible();
  await expect(page.getByTestId("new-customer-name")).toBeVisible();
  await expect(page.getByTestId("create-project")).toBeVisible();
  await expect(page.getByTestId("import-project-file")).toBeAttached();
  await expect(page.getByTestId("project-manager-project-list")).toBeAttached();
  await page.getByTestId("close-project-manager").click();
  await expect(page.getByTestId("project-manager-modal")).toHaveCount(0);
  await expectNoModalBackdrop(page);

  await page.getByRole("button", { name: /Performance Benchmark/i }).click();
  await page.getByTestId("open-performance-benchmark").click();
  await expect(page.getByTestId("performance-benchmark-modal")).toBeVisible();
  await page.getByTestId("close-performance-benchmark").click();
  await expect(page.getByTestId("performance-benchmark-modal")).toHaveCount(0);
  await expectNoModalBackdrop(page);

  expect(errors).toEqual([]);
});

test("annotation create and negative coordinate smoke has no red console errors", async ({ page }) => {
  const errors = collectPageErrors(page);
  await openCleanApp(page);

  await page.getByRole("button", { name: /Annotations/i }).click();
  await expect(page.getByTestId("annotations-panel")).toBeVisible();
  await page.getByTestId("add-note-annotation").click();
  await expect(page.getByTestId("annotation-properties")).toBeVisible();
  await page.getByTestId("annotation-text-input").fill("Forklift access required");
  await page.getByTestId("annotation-text-input").blur();
  await page.getByTestId("annotation-plan-x-input").fill("-200");
  await page.getByTestId("annotation-plan-x-input").blur();
  await page.getByTestId("annotation-size-scale-input").evaluate((element) => {
    const input = element as HTMLInputElement;
    input.value = "6";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
  });
  await expect(page.getByRole("button", { name: /Forklift access required/ })).toBeVisible();

  expect(errors).toEqual([]);
});

test("viewpoints can be captured and applied without red console errors", async ({ page }) => {
  const errors = collectPageErrors(page);
  await openCleanApp(page);

  const viewpointsSection = page.getByRole("button", { name: /Viewpoints/i });
  if ((await viewpointsSection.getAttribute("aria-expanded")) !== "true") {
    await viewpointsSection.click();
  }
  await expect(page.getByTestId("viewpoints-panel")).toBeVisible();
  await page.getByTestId("viewpoint-name-input").fill("Genel Gorunum");
  await page.getByTestId("capture-viewpoint").click();
  await expect(page.getByRole("button", { name: /Genel Gorunum/i })).toBeVisible();
  await page.getByRole("button", { name: /Genel Gorunum/i }).click();
  await expect(page.getByTestId("apply-viewpoint")).toBeEnabled();
  await page.getByTestId("apply-viewpoint").click();

  expect(errors).toEqual([]);
});

test("layers can be created, assigned, hidden, and shown without red console errors", async ({ page }) => {
  const errors = collectPageErrors(page);
  await openCleanApp(page);

  await page.locator(".machine-card").first().click();
  const propertiesSectionButton = page.getByRole("button", { name: /Selected Object Properties/i });
  if ((await propertiesSectionButton.getAttribute("aria-expanded")) !== "true") {
    await propertiesSectionButton.click();
  }

  const layersSection = page.getByRole("button", { name: /Layers/i });
  if ((await layersSection.getAttribute("aria-expanded")) !== "true") {
    await layersSection.click();
  }
  await expect(page.getByTestId("layers-panel")).toBeVisible();

  page.once("dialog", async (dialog) => {
    await dialog.accept("Test Layer");
  });
  await page.getByTestId("add-layer").click();
  const layerRow = page.locator(".layer-row").filter({ hasText: "Test Layer" });
  await expect(layerRow).toBeVisible();

  await page.getByLabel("Selected machine properties").getByLabel("Layer").selectOption({ label: "Test Layer" });
  await expect(layerRow).toContainText("1 item");
  await layerRow.getByRole("button", { name: "Hide" }).click();
  await expect(page.getByRole("button", { name: /Selected Object Properties/i })).toContainText("None");
  await layerRow.getByRole("button", { name: "Show" }).click();
  await layerRow.getByRole("button", { name: "Isolate" }).click();
  await page.getByRole("button", { name: "Show All Layers" }).click();

  expect(errors).toEqual([]);
});

test("Library Manager opens and closes with stable header control", async ({ page }) => {
  const errors = collectPageErrors(page);
  await openCleanApp(page);

  await expectNoModalBackdrop(page);
  const openLibraryManager = page.getByTestId("open-library-manager");
  await expect(openLibraryManager).toBeVisible();
  await expect(openLibraryManager).toBeEnabled();
  await openLibraryManager.click();
  await expect(page.getByTestId("library-manager-modal")).toBeVisible();
  await expect(page.getByTestId("library-manager-ready")).toBeVisible();
  await expect(page.getByTestId("library-manager-tree-panel")).toBeVisible();

  const customLibraryItem = page.getByTestId("library-manager-item-project-safety-fence-01");
  if (!(await customLibraryItem.isVisible().catch(() => false))) {
    const customLibraryButton = page.getByTestId("library-manager-custom-library-button");
    await expect(customLibraryButton).toBeVisible();
    await expect(customLibraryButton).toBeEnabled();
    await customLibraryButton.click();
    await expect(page.getByTestId("library-manager-tree-panel")).toBeVisible();
  }
  if (!(await customLibraryItem.isVisible().catch(() => false))) {
    await page.getByTestId("library-manager-group-toggle-safety").click();
  }
  if (!(await customLibraryItem.isVisible().catch(() => false))) {
    await page.getByTestId("library-manager-group-toggle-fencing").click();
  }
  await expect(customLibraryItem).toBeVisible();
  await customLibraryItem.click();
  await expect(page.getByTestId("library-manager-selected-item-editor")).toBeVisible();
  await expect(page.getByTestId("atara-machine-data-section")).toBeVisible();
  await expect(page.getByTestId("visual-model-calibration-section")).toBeVisible();
  await expect(page.getByTestId("collision-envelope-editor-section")).toBeVisible();
  await page.getByTestId("connection-point-editor-section").locator("summary").click();
  await expect(page.getByTestId("library-manager-connection-point-editor")).toBeVisible();

  const closeLibraryManager = page.getByTestId("close-library-manager-header");
  await expect(closeLibraryManager).toBeVisible();
  await expect(closeLibraryManager).toBeEnabled();
  await closeLibraryManager.click();
  await expect(page.getByTestId("library-manager-modal")).toHaveCount(0);
  await expectNoModalBackdrop(page);

  expect(errors).toEqual([]);
});

test("Taxonomy Manager opens and closes with stable header control", async ({ page }) => {
  const errors = collectPageErrors(page);
  await openCleanApp(page);

  await expectNoModalBackdrop(page);
  const openTaxonomyManager = page.getByTestId("open-taxonomy-manager");
  await expect(openTaxonomyManager).toBeVisible();
  await expect(openTaxonomyManager).toBeEnabled();
  await openTaxonomyManager.click();
  await expect(page.getByTestId("taxonomy-manager-modal")).toBeVisible();
  await expect(page.getByTestId("taxonomy-manager-ready")).toBeVisible();
  await expect(page.getByRole("dialog", { name: "Taxonomy Manager" }).getByText("Material Handling")).toBeVisible();

  const closeTaxonomyManager = page.getByTestId("close-taxonomy-manager-header");
  await expect(closeTaxonomyManager).toBeVisible();
  await expect(closeTaxonomyManager).toBeEnabled();
  await closeTaxonomyManager.click();
  await expect(page.getByTestId("taxonomy-manager-modal")).toHaveCount(0);
  await expectNoModalBackdrop(page);

  expect(errors).toEqual([]);
});

