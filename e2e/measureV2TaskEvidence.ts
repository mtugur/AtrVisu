import { expect, test, type Page } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { canvas, command, snapshot, start, type Helpers } from "./measureV2Evidence";

export type TaskPoint = { entityId?: string; anchorKind?: string; levelId?: string; xMm: number; yMm: number; zMm: number };
export type TaskEntity = { id: string; name: string; type: string; transform: { planX: number; planY: number; elevation: number; rotationDeg: number };
  properties: { key: string; value: unknown }[] };
export type TaskSession = { points: TaskPoint[]; hover: TaskPoint | null; entry: { selectionIds: string[]; primaryId: string | null };
  entityCatalog: TaskEntity[]; result: { values: { label: string; value: number }[]; reason?: string };
  candidateObservations: { entityId: string; anchorKind: string; x: number; y: number; visible: boolean; reason: string }[] };
export const taskSession = async (page: Page): Promise<TaskSession> => JSON.parse(await canvas(page).getAttribute("data-measure-session") ?? "null");
export const taskFrame = (page: Page) => page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
export const taskHoverBody = async (page: Page, id?: string) => {
  const box = (await canvas(page).boundingBox())!;
  const centers = JSON.parse(await canvas(page).getAttribute("data-machine-screen-points") ?? "{}");
  const point = centers[id?.replace("machine:", "") ?? Object.keys(centers)[0]] as { x: number; y: number };
  expect(point).toBeTruthy();
  await page.mouse.move(box.x + point.x, box.y + point.y); await taskFrame(page);
  await expect.poll(async () => (await taskSession(page)).candidateObservations?.length ?? 0).toBeGreaterThan(0);
  return { x: box.x + point.x, y: box.y + point.y };
};
const baselineEvidence = async (page: Page, name: string, errors: string[], observations: Record<string, unknown>) => {
  const dir = join(process.cwd(), "test-results/c03-measure-v2-task/baseline"); await mkdir(dir, { recursive: true });
  await page.screenshot({ path: join(dir, `${name}.png`) });
  await writeFile(join(dir, `${name}.json`), JSON.stringify({
    servedHead: process.env.ATRVISU_E2E_EXPECTED_SOURCE_HEAD,
    deliveryHead: process.env.ATRVISU_C03_DELIVERY_HEAD ?? null,
    historicalSource: "17763309b532813a7e004d608992073a97c08bb0",
    classification: "Historical owner-task failure reproduced; not a passing product task",
    errors, runtime: await snapshot(page), session: await taskSession(page), ...observations
  }, null, 2));
};
export const taskOpenMeasure = async (page: Page) => {
  if (!await command(page, "view.measure").isVisible()) await page.getByRole("button", { name: "More commands", exact: true }).click();
  await command(page, "view.measure").click();
  await expect(page.getByTestId("measure-panel")).toBeVisible();
};
export const taskSelectEntries = async (page: Page, ids: string[]) => {
  await page.getByRole("button", { name: "Exit Measure", exact: true }).click();
  await page.getByTestId("primary-dock-tab-panel.layoutExplorer").click();
  for (const [i, id] of ids.entries()) await page.getByTestId(`layout-explorer-entity-${id}`).click(i ? { modifiers: ["Control"] } : {});
  const selected = await snapshot(page);
  expect(selected.invariants.selectionIds).toEqual(ids);
  await taskOpenMeasure(page);
  return selected;
};

export const registerMeasureV2TaskTests = (helpers: Helpers) => {
  if (process.env.ATRVISU_MEASURE_TASK_BASELINE !== "1") return;
  test("C03 renewed baseline A unlocked semantic preview lacks reviewable entity and world XYZ", async ({ page }) => {
    const errors = await start(page, helpers, 1440, true);
    await page.getByLabel("Measurement point source").selectOption("geometry");
    await command(page, "view.fitView").click(); await taskHoverBody(page);
    const offered = (await taskSession(page)).candidateObservations.find(p => p.visible && p.anchorKind.endsWith("-top"))!;
    expect(offered).toBeTruthy(); const box = (await canvas(page).boundingBox())!;
    await page.mouse.move(box.x + offered.x, box.y + offered.y); await taskFrame(page);
    const state = await taskSession(page), panelText = await page.getByTestId("measure-panel").innerText();
    expect(state.hover?.entityId).toBeTruthy(); expect(state.hover?.anchorKind).toBe(offered.anchorKind);
    expect(panelText).not.toContain(state.hover!.entityId!);
    expect(await page.getByRole("region", { name: "Reference A preview", exact: true }).count()).toBe(0);
    expect(errors).toEqual([]);
    await baselineEvidence(page, "A-unlocked-reference", errors, { taskResult: "FAIL", offered, panelText, actualPreview: state.hover });
  });
  test("C03 renewed baseline B continuous approach loses an offered visible corner", async ({ page }) => {
    test.setTimeout(90_000);
    const errors = await start(page, helpers, 1440, true);
    await page.getByLabel("Measurement point source").selectOption("geometry");
    await command(page, "view.fitView").click();
    const body = await taskHoverBody(page), initial = await taskSession(page), box = (await canvas(page).boundingBox())!;
    const corners = initial.candidateObservations.filter(p => p.visible && p.anchorKind.endsWith("-top"));
    expect(corners).toHaveLength(4);
    const paths: { target: typeof corners[number]; samples: { x: number; y: number; offered: string[]; hover: TaskPoint | null }[] }[] = [];
    for (const target of corners) {
      await taskHoverBody(page);
      const samples = [];
      for (let i = 0; i <= 24; i++) {
        const x = body.x + (box.x + target.x - body.x) * i / 24, y = body.y + (box.y + target.y - body.y) * i / 24;
        await page.mouse.move(x, y); await taskFrame(page);
        const state = await taskSession(page);
        samples.push({ x, y, offered: state.candidateObservations.filter(p => p.visible).map(p => `${p.entityId}/${p.anchorKind}`), hover: state.hover });
      }
      paths.push({ target, samples });
    }
    const drops = paths.flatMap(path => path.samples.filter(sample => !sample.offered.includes(`${path.target.entityId}/${path.target.anchorKind}`)));
    await baselineEvidence(page, "B-candidate-approach", errors, { taskResult: drops.length ? "FAIL" : "NOT REPRODUCED", paths, drops: drops.length });
    expect(errors).toEqual([]); expect(drops.length).toBeGreaterThan(0);
  });
  test("C03 renewed baseline C two preselected machines yield no named local dimensions", async ({ page }) => {
    const errors = await start(page, helpers, 1440, ["Flow Pack Machine", "Belt Conveyor"]);
    const ids = (await taskSession(page)).entityCatalog.filter(e => e.type === "machine").map(e => e.id);
    expect(ids).toHaveLength(2); const entry = await taskSelectEntries(page, ids);
    await page.getByLabel("Measurement kind").selectOption("dimensions");
    const state = await taskSession(page), panelText = await page.getByTestId("measure-panel").innerText();
    expect(state.entry.selectionIds).toEqual(ids); expect(state.result.values).toEqual([]);
    expect(state.result.reason).toContain("exactly one"); expect(panelText).not.toContain(state.result.reason!);
    await expect(page.getByRole("button", { name: "Keep / Save", exact: true })).toBeDisabled();
    expect(errors).toEqual([]);
    await baselineEvidence(page, "C-two-selected", errors, { taskResult: "FAIL", entry, panelText });
  });
};
