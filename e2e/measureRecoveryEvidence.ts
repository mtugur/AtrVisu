import { expect, test, type Page } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { canvas, command, snapshot, start, type Helpers } from "./measureV2Evidence";
import { taskFrame, taskSelectEntries, taskSession } from "./measureV2TaskEvidence";

const baseline = process.env.ATRVISU_MEASURE_RECOVERY_BASELINE === "1";
const directory = join(process.cwd(), "test-results/c03-measure-recovery", baseline ? "baseline" : "delivery");
const record = async (page: Page, name: string, errors: string[], observation: Record<string, unknown>) => {
  const response = await page.request.get("/");
  const servedHead = response.headers()["x-atrvisu-source-head"];
  expect(servedHead).toBe(process.env.ATRVISU_E2E_EXPECTED_SOURCE_HEAD);
  expect(errors).toEqual([]);
  await mkdir(directory, { recursive: true });
  await page.screenshot({ path: join(directory, name + ".png") });
  await writeFile(join(directory, name + ".json"), JSON.stringify({ servedHead,
    deliveryHead: process.env.ATRVISU_C03_RECOVERY_DELIVERY_HEAD ?? servedHead,
    errors, runtime: await snapshot(page), ...observation }, null, 2));
};

export function registerMeasureRecoveryTests(helpers: Helpers) {
  if (!baseline) return;
  test("C03 recovery baseline explicit projection and shared-A controls are absent", async ({ page }) => {
    const errors = await start(page, helpers, 1440, ["Flow Pack Machine", "Belt Conveyor"]);
    const kinds = await page.getByLabel("Measurement kind").locator("option").allTextContents();
    expect(kinds.some(label => /Multiple B|Point Chain|Selected Pair A\/B/.test(label))).toBe(false);
    expect(await page.getByLabel("Measurement interpretation", { exact: true }).count()).toBe(0);
    await record(page, "missing-workflows", errors, { taskResult: "FAIL", kinds, projectionControlCount: 0 });
  });
  test("C03 recovery baseline pair computes origins before the operator chooses A or B", async ({ page }) => {
    const errors = await start(page, helpers, 1440, ["Flow Pack Machine", "Belt Conveyor"]);
    const ids = (await taskSession(page)).entityCatalog.filter(e => e.type === "machine").map(e => e.id);
    await taskSelectEntries(page, ids);
    await page.getByLabel("Measurement kind").selectOption("pair");
    const state = await taskSession(page);
    expect(state.entry.selectionIds).toEqual(ids); expect(state.points).toEqual([]);
    expect(state.result.values.length).toBeGreaterThan(0);
    await expect(page.getByRole("button", { name: "Keep / Save", exact: true })).toBeEnabled();
    await record(page, "automatic-pair", errors, { taskResult: "FAIL", state });
  });
  test("C03 recovery baseline a completed distance cannot accept another B without reset", async ({ page }) => {
    const errors = await start(page, helpers, 1440);
    const b = (await canvas(page).boundingBox())!;
    await page.mouse.click(b.x + b.width * .35, b.y + b.height * .25);
    await page.mouse.click(b.x + b.width * .48, b.y + b.height * .35);
    const completed = await taskSession(page); expect(completed.points).toHaveLength(2);
    await page.mouse.click(b.x + b.width * .55, b.y + b.height * .3); await taskFrame(page);
    expect((await taskSession(page)).points).toEqual(completed.points);
    await record(page, "completed-dead-end", errors, { taskResult: "FAIL", completed, after: await taskSession(page) });
  });
  test("C03 recovery baseline collapsed Inspector disclosure is disabled while Measure owns picking", async ({ page }) => {
    const persistedHelpers: Helpers = { ...helpers, openCleanApp: async target => {
      await target.addInitScript(() => {
        localStorage.clear(); sessionStorage.clear();
        localStorage.setItem("atrvisu.panelSection.properties.v1", "collapsed");
      });
      await target.goto("/?e2eDiagnostics=1");
      await expect(target.getByTestId("app-root")).toBeVisible();
    } };
    page.on("dialog", dialog => dialog.accept("Recovery persisted profile"));
    const errors = await start(page, persistedHelpers, 1440, ["Flow Pack Machine", "Belt Conveyor"], "Recovery baseline Inspector");
    await page.getByRole("button", { name: "Exit Measure", exact: true }).click();
    const inspector = page.getByTestId("right-panel");
    await inspector.getByRole("button", { name: "Inspector", exact: true }).click();
    const elevation = page.getByRole("textbox", { name: "Elevation above Level", exact: true });
    const initial = await snapshot(page);
    const header = inspector.locator(".panel-section-header").filter({ hasText: "Selected Object Properties" });
    await expect(header).toHaveAttribute("aria-expanded", "false");
    expect(await elevation.count()).toBe(0);
    await command(page, "project.save").click();
    await expect.poll(() => page.evaluate(() => window.__atrvisuProjectCommands?.getActiveContext().hasUnsavedChanges)).toBe(false);
    await command(page, "view.measure").click();
    await inspector.getByRole("button", { name: "Inspector", exact: true }).click();
    await expect(header).toBeDisabled(); await expect(header).toHaveAttribute("aria-expanded", "false");
    expect(await elevation.count()).toBe(0);
    const after = await snapshot(page);
    expect(after.invariants.selectionIds).toEqual(initial.invariants.selectionIds);
    await record(page, "inspector-collapsed-picking", errors, { taskResult: "FAIL", profileFixture: "existing legacy collapsed-properties preference migrated by production hydration",
      actualCondition: "selected machine; collapsed Inspector preference; Measure picking; Inspector tab", initial, after,
      header: await header.evaluate(e => ({ text: e.textContent, expanded: e.getAttribute("aria-expanded"), disabled: (e as HTMLButtonElement).disabled })), elevationCount: 0 });
  });
}
