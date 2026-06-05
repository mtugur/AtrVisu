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

  await page.getByTestId("open-library-manager").click();
  await expect(page.getByTestId("library-manager-modal")).toBeVisible();
  await page.getByTestId("close-library-manager").click();
  await expect(page.getByTestId("library-manager-modal")).toHaveCount(0);

  await page.getByTestId("open-taxonomy-manager").click();
  await expect(page.getByTestId("taxonomy-manager-modal")).toBeVisible();
  await expect(page.getByRole("dialog", { name: "Taxonomy Manager" }).getByText("Material Handling")).toBeVisible();
  await page.getByTestId("close-taxonomy-manager").click();
  await expect(page.getByTestId("taxonomy-manager-modal")).toHaveCount(0);

  expect(errors).toEqual([]);
});
