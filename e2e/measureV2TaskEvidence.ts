import { expect, test, type Page } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { canvas, command, graphics, snapshot, start, type Helpers } from "./measureV2Evidence";

export type TaskPoint = { entityId?: string; anchorKind?: string; levelId?: string; xMm: number; yMm: number; zMm: number };
export type TaskEntity = { id: string; name: string; type: string; transform: { planX: number; planY: number; elevation: number; rotationDeg: number };
  properties: { key: string; value: unknown }[] };
export type TaskSession = { points: TaskPoint[]; hover: TaskPoint | null; entry: { selectionIds: string[]; primaryId: string | null };
  activeDimensionEntityId?: string; activeCandidateEntityId?: string; highlightedAnchor?: TaskPoint; completed: boolean;
  entityCatalog: TaskEntity[]; result: { values: { label: string; value: number }[]; reason?: string };
  candidateObservations: { entityId: string; anchorKind: string; x: number; y: number; visible: boolean; reason: string; worldPoint?: TaskPoint }[] };
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
const baselineEvidence = async (page: Page, name: string, errors: string[], observations: Record<string, unknown>, png?: Uint8Array) => {
  const dir = join(process.cwd(), "test-results/c03-measure-v2-task/baseline"); await mkdir(dir, { recursive: true });
  if (png) await writeFile(join(dir, `${name}.png`), png);
  else await page.screenshot({ path: join(dir, `${name}.png`) });
  await writeFile(join(dir, `${name}.json`), JSON.stringify({
    servedHead: process.env.ATRVISU_E2E_EXPECTED_SOURCE_HEAD,
    deliveryHead: process.env.ATRVISU_C03_DELIVERY_HEAD ?? null,
    historicalSource: "17763309b532813a7e004d608992073a97c08bb0",
    classification: observations.taskResult === "FAIL" ? "Historical owner-task failure reproduced; not a passing product task" : "Owner-task failure not reproduced",
    errors, runtime: await snapshot(page), session: await taskSession(page), ...observations
  }, null, 2));
};
export const taskOpenMeasure = async (page: Page) => {
  if ((page.viewportSize()?.width ?? 1440) <= 720 && await page.getByRole("button", { name: "Collapse Primary Dock", exact: true }).isVisible())
    await page.getByRole("button", { name: "Collapse Primary Dock", exact: true }).click();
  if (!await command(page, "view.measure").isVisible()) await page.getByRole("button", { name: "More commands", exact: true }).click();
  await command(page, "view.measure").click();
  await expect(page.getByTestId("measure-panel")).toBeVisible();
};
export const taskSelectEntries = async (page: Page, ids: string[]) => {
  await page.getByRole("button", { name: "Exit Measure", exact: true }).click();
  if (!await page.getByTestId("primary-dock-tab-panel.layoutExplorer").isVisible()) await page.getByTestId("primary-dock-collapse-toggle").click();
  await page.getByTestId("primary-dock-tab-panel.layoutExplorer").click();
  for (const [i, id] of ids.entries()) await page.getByTestId(`layout-explorer-entity-${id}`).click(i ? { modifiers: ["Control"] } : {});
  const selected = await snapshot(page);
  expect(selected.invariants.selectionIds).toEqual(ids);
  await taskOpenMeasure(page);
  return selected;
};

export const registerMeasureV2TaskTests = (helpers: Helpers) => {
  if (process.env.ATRVISU_MEASURE_TASK_BASELINE !== "1") { registerCorrectedTaskTests(helpers); return; }
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
    const machine = (await taskSession(page)).entityCatalog.find(e => e.type === "machine")!;
    const size = (key: string) => machine.properties.find(p => p.key === key)!.value as number;
    await page.getByRole("button", { name: "Exit Measure", exact: true }).click();
    await page.getByTestId("primary-dock-tab-panel.machineLibrary").click();
    await page.getByRole("searchbox", { name: "Search assets", exact: true }).fill("");
    const structure = page.getByTestId("build-group-structure").getByRole("button", { name: "Structure", exact: true });
    if (await structure.getAttribute("aria-expanded") !== "true") await structure.click();
    await page.getByTestId("asset-card-build::column").getByRole("button", { name: "Add Column to layout", exact: true }).click();
    await page.getByTestId("right-panel").getByRole("button", { name: "Inspector", exact: true }).click();
    for (const [label, value] of [["Civil Plan X", machine.transform.planX + size("widthMm") / 4 - 200],
      ["Civil Plan Y", machine.transform.planY + size("depthMm") / 4 - 200], ["Civil Elevation above Level", 1800]] as const) {
      const input = page.getByRole("textbox", { name: label, exact: true }); await input.fill(String(value)); await input.press("Tab");
    }
    await taskOpenMeasure(page);
    await page.getByLabel("Measurement point source").selectOption("geometry");
    await command(page, "view.fitView").click();
    await page.getByTestId("viewcube").getByRole("button", { name: "Top view (+Z)", exact: true }).click();
    const body = await taskHoverBody(page), initial = await taskSession(page), box = (await canvas(page).boundingBox())!;
    const corners = initial.candidateObservations.filter(p => p.visible && p.anchorKind.endsWith("-top"));
    expect(corners).toHaveLength(4);
    const paths: { target: typeof corners[number]; samples: { x: number; y: number; offered: string[]; hover: TaskPoint | null }[] }[] = [];
    let firstDrop: { png: Uint8Array; session: TaskSession; x: number; y: number } | undefined;
    for (const target of corners) {
      await taskHoverBody(page);
      const samples = [];
      for (let i = 0; i <= 24; i++) {
        const x = body.x + (box.x + target.x - body.x) * i / 24, y = body.y + (box.y + target.y - body.y) * i / 24;
        await page.mouse.move(x, y); await taskFrame(page);
        const state = await taskSession(page);
        samples.push({ x, y, offered: state.candidateObservations.filter(p => p.visible).map(p => `${p.entityId}/${p.anchorKind}`), hover: state.hover });
        if (!firstDrop && !samples[samples.length - 1].offered.includes(`${target.entityId}/${target.anchorKind}`))
          firstDrop = { png: await page.screenshot(), session: state, x, y };
      }
      paths.push({ target, samples });
    }
    const drops = paths.flatMap(path => path.samples.filter(sample => !sample.offered.includes(`${path.target.entityId}/${path.target.anchorKind}`)));
    await baselineEvidence(page, "B-candidate-approach", errors, { taskResult: drops.length ? "FAIL" : "NOT REPRODUCED", paths, drops: drops.length,
      initial, failurePointer: firstDrop ? { x: firstDrop.x, y: firstDrop.y } : null, session: firstDrop?.session ?? await taskSession(page) }, firstDrop?.png);
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

const taskEvidence = async (page: Page, name: string, errors: string[], observations: Record<string, unknown>) => {
  const directory = join(process.cwd(), "test-results/c03-measure-v2-task"); await mkdir(directory, { recursive: true });
  expect(errors).toEqual([]);
  await page.screenshot({ path: join(directory, `${name}.png`) });
  await writeFile(join(directory, `${name}.json`), JSON.stringify({ head: process.env.ATRVISU_E2E_EXPECTED_SOURCE_HEAD,
    outcome: "PASS", errors, runtime: await snapshot(page), session: await taskSession(page), graphics: await graphics(page),
    generation: await canvas(page).getAttribute("data-scene-lifecycle-generation"), ...observations }, null, 2));
};
const taskToolbarCommand = async (page: Page, id: string) => {
  if (!await command(page, id).isVisible()) await page.getByRole("button", { name: "More commands", exact: true }).click();
  await command(page, id).click(); await taskFrame(page);
};
const closePrimary = async (page: Page) => {
  const toggle = page.getByRole("button", { name: "Collapse Primary Dock", exact: true });
  if (await toggle.isVisible()) await toggle.click();
};
const editSelectedMachine = async (page: Page, values: Record<string, number>) => {
  if ((page.viewportSize()?.width ?? 1440) <= 720) await closePrimary(page);
  await page.getByTestId("right-panel").getByRole("button", { name: "Inspector", exact: true }).click();
  for (const [name, value] of Object.entries(values)) {
    const input = page.getByRole("textbox", { name, exact: true }); await input.fill(String(value)); await input.press("Tab");
  }
};
const topAndFit = async (page: Page) => {
  await closePrimary(page);
  await page.getByTestId("viewcube").getByRole("button", { name: "Top view (+Z)", exact: true }).click();
  await taskToolbarCommand(page, "view.fitView");
  const viewport = (await canvas(page).boundingBox())!, panel = (await page.getByTestId("right-panel").boundingBox())!;
  const available = { width: panel.x > viewport.x ? panel.x - viewport.x : viewport.width,
    height: panel.y > viewport.y ? panel.y - viewport.y : viewport.height };
  const start = { x: viewport.x + available.width / 2, y: viewport.y + available.height / 2 };
  await page.mouse.move(start.x, start.y); await page.mouse.wheel(0, 500); await taskFrame(page);
  const bounds = Object.values(JSON.parse(await canvas(page).getAttribute("data-machine-screen-bounds") ?? "{}")) as { left: number; top: number; width: number; height: number }[];
  const center = { x: (Math.min(...bounds.map(box => box.left)) + Math.max(...bounds.map(box => box.left + box.width))) / 2,
    y: (Math.min(...bounds.map(box => box.top)) + Math.max(...bounds.map(box => box.top + box.height))) / 2 };
  // Explicit user navigation frames the fixture in the actual open workspace;
  // it does not change Fit View, camera adapters or measurement operands.
  await page.mouse.down({ button: "middle" });
  await page.mouse.move(start.x + available.width / 2 - center.x, start.y + available.height / 2 - center.y, { steps: 10 });
  await page.mouse.up({ button: "middle" }); await taskFrame(page);
};
const hoverCorner = async (page: Page, id: string) => {
  const body = await taskHoverBody(page, id), box = (await canvas(page).boundingBox())!;
  const corner = (await taskSession(page)).candidateObservations.find(point => point.entityId === id && point.visible && point.anchorKind.endsWith("-top"))!;
  expect(corner).toBeTruthy();
  await page.mouse.move(body.x, body.y); await page.mouse.move(box.x + corner.x, box.y + corner.y, { steps: 12 }); await taskFrame(page);
  const point = (await taskSession(page)).hover!;
  expect(point).toMatchObject({ entityId: id, anchorKind: corner.anchorKind });
  return { point, pointer: { x: box.x + corner.x, y: box.y + corner.y } };
};
const visibleReferenceReadouts = async (page: Page) => {
  const observed = await page.getByTestId("measure-panel").evaluate(panel => {
    const rect = (element: Element) => { const box = element.getBoundingClientRect(); return { x: box.x, y: box.y, right: box.right, bottom: box.bottom }; };
    const dock = rect(panel.closest('[data-testid="right-panel"]')!);
    const bounds = rect(panel), clip = { x: Math.max(0, dock.x, bounds.x), y: Math.max(0, dock.y, bounds.y), right: Math.min(innerWidth, dock.right, bounds.right), bottom: Math.min(innerHeight, dock.bottom, bounds.bottom) };
    return { panel: clip, references: [...panel.querySelectorAll('.measure-point-references > section')].map(element => ({ name: element.getAttribute("aria-label"), text: element.textContent,
      values: [...element.querySelectorAll("data")].map(data => Number(data.value)), ...rect(element) })),
      metrics: [...panel.querySelectorAll('.measure-session-readout > .measure-values > div')].map(element => ({ name: element.querySelector("dt")!.textContent, ...rect(element) })) };
  });
  for (const reference of [...observed.references, ...observed.metrics]) {
    expect(reference.x, reference.name!).toBeGreaterThanOrEqual(observed.panel.x);
    expect(reference.y, reference.name!).toBeGreaterThanOrEqual(observed.panel.y);
    expect(reference.right, reference.name!).toBeLessThanOrEqual(observed.panel.right);
    expect(reference.bottom, reference.name!).toBeLessThanOrEqual(observed.panel.bottom);
  }
  expect(observed.references.length).toBeGreaterThan(0);
  return observed;
};
const expectOperands = async (page: Page, points: TaskPoint[]) => {
  await page.getByRole("region", { name: "Measure Session", exact: true }).hover(); await page.mouse.wheel(0, -1800); await taskFrame(page);
  const state = await taskSession(page); expect(state.points).toEqual(points);
  const [a, b] = points, dx = b.xMm - a.xMm, dy = b.yMm - a.yMm, dz = b.zMm - a.zMm;
  for (const [label, value] of [["3D Distance", Math.hypot(dx, dy, dz)], ["Plan Distance", Math.hypot(dx, dy)], ["Delta Z", dz]] as const) {
    expect(state.result.values.find(result => result.label === label)?.value).toBeCloseTo(value, 8);
    await expect(page.getByRole("region", { name: "Measure Session", exact: true }).getByText(label, { exact: true })).toBeVisible();
  }
  for (const [i, point] of points.entries()) {
    const region = page.getByRole("region", { name: `Reference ${String.fromCharCode(65 + i)} confirmed`, exact: true });
    await expect(region).toContainText(point.entityId!); expect(await region.locator("data").evaluateAll(elements => elements.map(element => Number(element.value)))).toEqual([point.xMm, point.yMm, point.zMm]);
  }
  return state.result;
};
const reloadProject = async (page: Page, name: string) => {
  page.on("dialog", dialog => dialog.accept("C03 task regression"));
  await taskToolbarCommand(page, "project.save");
  await expect.poll(() => page.evaluate(() => window.__atrvisuProjectCommands?.getActiveContext().hasUnsavedChanges)).toBe(false);
  await page.reload();
  await page.getByTestId("empty-project-welcome").getByRole("button", { name: "Open Project", exact: true }).click();
  const manager = page.getByTestId("project-manager-modal");
  await manager.getByTestId("project-manager-project-option").filter({ hasText: name }).click();
  await manager.getByRole("button", { name: "Load Revision", exact: true }).click();
  await manager.getByTestId("close-project-manager").click(); await taskFrame(page);
};

function registerCorrectedTaskTests(helpers: Helpers) {
  test("C03 renewed C single Civil mixed and empty entry results remain explicit", async ({ page }) => {
    test.setTimeout(90_000);
    const errors = await start(page, helpers, 1440, true);
    await page.getByLabel("Measurement kind").selectOption("dimensions");
    await expect(page.getByLabel("Selected entity dimensions").getByRole("region")).toHaveCount(1);
    await page.getByRole("button", { name: "Exit Measure", exact: true }).click();
    await page.getByTestId("primary-dock-tab-panel.machineLibrary").click();
    await page.getByRole("searchbox", { name: "Search assets", exact: true }).fill("");
    const planning = page.getByTestId("build-group-planning").getByRole("button", { name: "Planning", exact: true });
    if (await planning.getAttribute("aria-expanded") !== "true") await planning.click();
    await page.getByTestId("asset-card-build::floor-area").getByRole("button", { name: "Add Floor Area to layout", exact: true }).click();
    await taskOpenMeasure(page); await page.getByLabel("Measurement kind").selectOption("dimensions");
    const single = await taskSession(page);
    expect(single.activeDimensionEntityId).toMatch(/^civil:/);
    await expect(page.getByRole("region", { name: "Dimensions Floor Area", exact: true })).toContainText("Floor Thickness");
    const firstEntities = (await taskSession(page)).entityCatalog;
    const mixedIds = ["machine", "civil"].map(type => firstEntities.find(entity => entity.type === type)!.id);
    const mixedEntry = await taskSelectEntries(page, mixedIds);
    await page.getByLabel("Measurement kind").selectOption("dimensions");
    const mixedBefore = await snapshot(page);
    await page.getByRole("region", { name: "Dimensions Floor Area", exact: true }).getByRole("button", { name: "Floor Area", exact: true }).click();
    expect((await taskSession(page)).activeDimensionEntityId).toBe(mixedIds[1]); expect(await snapshot(page)).toEqual(mixedBefore);
    await taskEvidence(page, "C-civil-mixed-1440", errors, { single, entry: mixedEntry, before: mixedBefore, after: await snapshot(page) });
    await page.getByRole("button", { name: "Exit Measure", exact: true }).click();
    await page.getByRole("menuitem", { name: "Arrange", exact: true }).click();
    await page.locator('[role="menu"] [data-command-id="assembly.createGroup"]').click();
    await page.getByTestId("primary-dock-tab-panel.machineLibrary").click();
    await page.getByRole("searchbox", { name: "Search assets", exact: true }).fill("Belt Conveyor");
    await page.getByRole("button", { name: "Add Belt Conveyor to layout", exact: true }).click();
    await taskOpenMeasure(page);
    const entities = (await taskSession(page)).entityCatalog;
    const unsupported = entities.find(entity => entity.type === "group")!;
    const eligible = entities.find(entity => entity.type === "machine" && entity.id !== mixedIds[0])!;
    const ids = [eligible.id, unsupported.id], entry = await taskSelectEntries(page, ids);
    await page.getByLabel("Measurement kind").selectOption("dimensions");
    const before = await snapshot(page);
    await expect(page.getByRole("region", { name: `Dimensions ${unsupported.name}`, exact: true }).getByRole("button")).toBeDisabled();
    await expect(page.getByRole("region", { name: `Dimensions ${unsupported.name}`, exact: true })).toContainText("unavailable for this entity type");
    expect((await taskSession(page)).activeDimensionEntityId).toBe(eligible.id);
    await page.getByRole("region", { name: `Dimensions ${eligible.name}`, exact: true }).getByRole("button").click();
    expect(await snapshot(page)).toEqual(before);
    await taskEvidence(page, "C-unsupported-mixed-1440", errors, { entry, before, after: await snapshot(page), unsupported });
    await page.getByRole("button", { name: "Exit Measure", exact: true }).click();
    await page.getByTestId("primary-dock-tab-panel.layoutExplorer").click();
    for (const id of ids) await page.getByTestId(`layout-explorer-entity-${id}`).click({ modifiers: ["Control"] });
    expect((await snapshot(page)).invariants.selectionIds).toEqual([]);
    await taskOpenMeasure(page); await page.getByLabel("Measurement kind").selectOption("dimensions");
    await expect(page.getByRole("region", { name: "Measure Session", exact: true })).toContainText("before entering Measure");
    await expect(page.getByRole("button", { name: "Keep / Save", exact: true })).toBeDisabled();
    await taskEvidence(page, "C-empty-1440", errors, { empty: true });
  });
  for (const [width, height] of [[1440, 900], [1024, 768], [640, 800]]) {
    test(`C03 renewed B E continuous offered corners survive overlap and deterministic handoff ${width}`, async ({ page }) => {
      test.setTimeout(120_000);
      const errors = await start(page, helpers, width, ["Flow Pack Machine", "Belt Conveyor"], undefined, height);
      const machine = (await taskSession(page)).entityCatalog.find(entity => entity.type === "machine")!;
      const size = (key: string) => machine.properties.find(property => property.key === key)!.value as number;
      await page.getByRole("button", { name: "Exit Measure", exact: true }).click();
      await editSelectedMachine(page, { "Plan X": -3500 });
      if (!await page.getByTestId("primary-dock-tab-panel.machineLibrary").isVisible()) await page.getByTestId("primary-dock-collapse-toggle").click();
      await page.getByTestId("primary-dock-tab-panel.machineLibrary").click();
      await page.getByRole("searchbox", { name: "Search assets", exact: true }).fill("");
      const structure = page.getByTestId("build-group-structure").getByRole("button", { name: "Structure", exact: true });
      if (await structure.getAttribute("aria-expanded") !== "true") await structure.click();
      await page.getByTestId("asset-card-build::column").getByRole("button", { name: "Add Column to layout", exact: true }).click();
      if (width <= 720) await closePrimary(page);
      await page.getByTestId("right-panel").getByRole("button", { name: "Inspector", exact: true }).click();
      for (const [label, value] of [["Civil Plan X", machine.transform.planX + size("widthMm") / 4 - 200],
        ["Civil Plan Y", machine.transform.planY + size("depthMm") / 4 - 200], ["Civil Elevation above Level", 1800]] as const) {
        const input = page.getByRole("textbox", { name: label, exact: true }); await input.fill(String(value)); await input.press("Tab");
      }
      await taskOpenMeasure(page); await page.getByLabel("Measurement point source").selectOption("geometry"); await topAndFit(page);
      const before = await snapshot(page), handle = await canvas(page).elementHandle(), generation = await canvas(page).getAttribute("data-scene-lifecycle-generation");
      const body = await taskHoverBody(page, machine.id), initial = await taskSession(page), box = (await canvas(page).boundingBox())!;
      const corners = initial.candidateObservations.filter(point => point.entityId === machine.id && point.visible && point.anchorKind.endsWith("-top"));
      expect(corners).toHaveLength(4);
      const paths = [];
      for (const target of corners) {
        await taskHoverBody(page, machine.id);
        const samples = [];
        for (let step = 0; step <= 24; step++) {
          const x = body.x + (box.x + target.x - body.x) * step / 24, y = body.y + (box.y + target.y - body.y) * step / 24;
          await page.mouse.move(x, y); await taskFrame(page);
          const state = await taskSession(page), offered = state.candidateObservations.filter(point => point.visible);
          expect(state.activeCandidateEntityId).toBe(machine.id);
          expect(offered.some(point => point.entityId === target.entityId && point.anchorKind === target.anchorKind)).toBe(true);
          samples.push({ x, y, activeEntity: state.activeCandidateEntityId, offered, hover: state.hover, highlighted: state.highlightedAnchor });
        }
        const point = (await taskSession(page)).hover!;
        expect(point).toMatchObject({ entityId: machine.id, anchorKind: target.anchorKind });
        expect(target.worldPoint).toEqual(point);
        await page.mouse.click(box.x + target.x, box.y + target.y); await taskFrame(page);
        expect((await taskSession(page)).points).toEqual([point]);
        paths.push({ target, samples, confirmed: point });
        await taskEvidence(page, `B-${target.anchorKind}-${width}`, errors, { before, paths });
        await page.getByRole("button", { name: "Restart", exact: true }).click();
      }
      await taskHoverBody(page, machine.id); await canvas(page).focus(); await page.keyboard.press("Tab");
      const cycled = (await taskSession(page)).highlightedAnchor!; expect(cycled.anchorKind).toBeTruthy();
      await page.keyboard.press("Shift");
      await expect(page.getByRole("region", { name: "Locked Anchor", exact: true })).toContainText(machine.name);
      await page.getByRole("button", { name: "Restart", exact: true }).click();
      await taskHoverBody(page, machine.id);
      const other = (await taskSession(page)).entityCatalog.find(entity => entity.type === "machine" && entity.id !== machine.id)!;
      const centers = JSON.parse(await canvas(page).getAttribute("data-machine-screen-points") ?? "{}");
      const otherPoint = centers[other.id.replace("machine:", "")];
      await page.mouse.move(box.x + otherPoint.x, box.y + otherPoint.y, { steps: 20 }); await taskFrame(page);
      expect((await taskSession(page)).activeCandidateEntityId).toBe(other.id);
      const handoff = await taskSession(page);
      await page.mouse.move(1, 1); await taskFrame(page);
      expect((await taskSession(page)).candidateObservations).toEqual([]);
      expect((await taskSession(page)).activeCandidateEntityId).toBeUndefined();
      expect(await snapshot(page)).toEqual(before);
      const sameCanvas = await handle!.evaluate(element => element === document.querySelector("canvas.scene-canvas")); expect(sameCanvas).toBe(true);
      await expect(canvas(page)).toHaveAttribute("data-scene-lifecycle-generation", generation!);
      await taskEvidence(page, `B-handoff-${width}`, errors, { before, after: await snapshot(page), paths, cycled, handoff, released: true, sameCanvas });
    });
    test(`C03 renewed A E real references remain three dimensional across views and reload ${width}`, async ({ page }) => {
      test.setTimeout(90_000);
      const project = `C03 renewed references ${width}`;
      const errors = await start(page, helpers, width, ["Flow Pack Machine", "Belt Conveyor"], project, height);
      await page.getByRole("button", { name: "Exit Measure", exact: true }).click();
      await editSelectedMachine(page, { "Plan X": -3500, "Elevation above Level": 1400 });
      await taskToolbarCommand(page, "view.fitView");
      if (!await page.getByTestId("primary-dock-tab-panel.viewpoints").isVisible()) await page.getByTestId("primary-dock-collapse-toggle").click();
      await page.getByTestId("primary-dock-tab-panel.viewpoints").click();
      await page.getByTestId("viewpoint-name-input").fill("C03 perspective reference");
      await page.getByRole("button", { name: "Capture Current View", exact: true }).click();
      const perspectiveCamera = (await snapshot(page)).camera; expect(perspectiveCamera?.mode).toBe("perspective");
      await closePrimary(page);
      await taskOpenMeasure(page); await page.getByLabel("Measurement point source").selectOption("geometry"); await topAndFit(page);
      const handle = await canvas(page).elementHandle(), generation = await canvas(page).getAttribute("data-scene-lifecycle-generation");
      const initial = await snapshot(page), entities = (await taskSession(page)).entityCatalog.filter(entity => entity.type === "machine");
      const a = await hoverCorner(page, entities[0].id);
      await expect(page.getByRole("region", { name: "Reference A preview", exact: true })).toContainText(entities[0].name);
      await taskEvidence(page, `A-preview-a-${width}`, errors, { initial, actual: a.point, readouts: await visibleReferenceReadouts(page) });
      await page.mouse.click(a.pointer.x, a.pointer.y);
      const b = await hoverCorner(page, entities[1].id);
      expect(b.point.zMm).not.toBe(a.point.zMm);
      await expect(page.getByRole("region", { name: "Reference A confirmed", exact: true })).toContainText(entities[0].id);
      await expect(page.getByRole("region", { name: "Reference B preview", exact: true })).toContainText(entities[1].name);
      await taskEvidence(page, `A-preview-b-${width}`, errors, { initial, actual: b.point, readouts: await visibleReferenceReadouts(page) });
      await page.mouse.click(b.pointer.x, b.pointer.y);
      const points = [a.point, b.point], result = await expectOperands(page, points);
      await page.getByRole("button", { name: "Keep / Save", exact: true }).click();
      await expect.poll(async () => (await graphics(page)).length).toBe(1);
      const saved = (await graphics(page))[0], beforeView = await snapshot(page);
      const editor = page.getByRole("region", { name: "Reference Dimension Editor" });
      for (const mode of ["depth", "overlay"]) {
        await editor.getByLabel("Display", { exact: true }).selectOption(mode);
        await expectOperands(page, points); expect((await graphics(page))[0].endpoints).toEqual(saved.endpoints);
        await taskEvidence(page, `A-${mode}-${width}`, errors, { points, result, saved });
      }
      await page.getByRole("button", { name: "Navigate", exact: true }).click();
      const beforeOrbit = await snapshot(page);
      await page.getByTestId("viewcube").getByRole("button", { name: "Right / Front / Top view (+X / -Y / +Z)", exact: true }).click();
      const bounds = (await canvas(page).boundingBox())!, x = bounds.x + bounds.width * .45, y = bounds.y + bounds.height * .2;
      await page.mouse.move(x, y); await page.mouse.down(); await page.mouse.move(x + 55, y + 40, { steps: 10 }); await page.mouse.up(); await taskFrame(page);
      const afterView = await snapshot(page); expect(afterView.camera).not.toEqual(beforeView.camera);
      expect(afterView.camera!.beta).toBeGreaterThan(.2); expect(afterView.camera!.beta).toBeLessThan(Math.PI / 2 - .2);
      expect(afterView.invariants).toEqual(beforeOrbit.invariants);
      await expectOperands(page, points); expect((await graphics(page))[0].endpoints).toEqual(saved.endpoints);
      const sameCanvas = await handle!.evaluate(element => element === document.querySelector("canvas.scene-canvas")); expect(sameCanvas).toBe(true);
      await expect(canvas(page)).toHaveAttribute("data-scene-lifecycle-generation", generation!);
      await taskEvidence(page, `A-oblique-${width}`, errors, { initial, beforeView, beforeOrbit, afterView, points, result, saved, sameCanvas });
      const beforePerspective = await snapshot(page);
      await page.getByTestId("primary-dock-collapse-toggle").click();
      const viewpointsTab = page.getByTestId("primary-dock-tab-panel.viewpoints");
      if (await viewpointsTab.getAttribute("aria-pressed") !== "true") await viewpointsTab.click();
      await page.getByTestId("apply-viewpoint").click(); await closePrimary(page); await taskFrame(page);
      const afterPerspective = await snapshot(page);
      expect(afterPerspective.camera?.mode).toBe("perspective");
      expect(afterPerspective.invariants).toEqual(beforePerspective.invariants);
      await expectOperands(page, points); expect((await graphics(page))[0].endpoints).toEqual(saved.endpoints);
      await taskEvidence(page, `A-perspective-${width}`, errors, { perspectiveCamera, beforePerspective, afterPerspective, points, result, saved });
      await page.getByRole("button", { name: "Exit Measure", exact: true }).click(); await reloadProject(page, project);
      await expect.poll(async () => (await graphics(page)).length).toBe(1);
      expect((await graphics(page))[0].references).toEqual(saved.references); expect((await graphics(page))[0].endpoints).toEqual(saved.endpoints);
      await taskOpenMeasure(page);
      await page.locator(".measure-dimension-list-item").click();
      await expect(page.getByRole("region", { name: "Reference Dimension Editor" })).toContainText("3D Distance");
      for (const [index, point] of points.entries()) {
        const region = page.getByRole("region", { name: `Saved Reference ${String.fromCharCode(65 + index)} confirmed`, exact: true });
        expect(await region.locator("data").evaluateAll(elements => elements.map(element => Number(element.value)))).toEqual([point.xMm, point.yMm, point.zMm]);
      }
      await taskEvidence(page, `A-reload-${width}`, errors, { saved, points, result });
    });

    test(`C03 renewed C D E named active dimensions keep one associative Annotation ${width}`, async ({ page }) => {
      test.setTimeout(90_000);
      const project = `C03 renewed active dimensions ${width}`;
      const errors = await start(page, helpers, width, ["Flow Pack Machine", "Belt Conveyor"], project, height);
      const entities = (await taskSession(page)).entityCatalog.filter(entity => entity.type === "machine"), ids = entities.map(entity => entity.id);
      const entry = await taskSelectEntries(page, ids), handle = await canvas(page).elementHandle(), generation = await canvas(page).getAttribute("data-scene-lifecycle-generation");
      await page.getByLabel("Measurement kind").selectOption("dimensions");
      expect((await taskSession(page)).activeDimensionEntityId).toBe(entry.invariants.primarySelectionId);
      const activeBefore = await snapshot(page);
      const groups = [];
      for (const entity of entities) {
        const region = page.getByRole("region", { name: `Dimensions ${entity.name}`, exact: true });
        await expect(region).toContainText(entity.id);
        const expected = ["widthMm", "depthMm", "heightMm"].map(key => entity.properties.find(property => property.key === key)!.value);
        const observedReadout = await region.locator("dd").allTextContents();
        expect(observedReadout).toEqual(expected.map(value => `${Number(value).toFixed(3)} mm`));
        await region.getByRole("button", { name: entity.name, exact: true }).focus(); await page.keyboard.press("Enter");
        await expect(region.getByRole("button")).toHaveAttribute("aria-pressed", "true");
        const state = await taskSession(page); expect(state.activeDimensionEntityId).toBe(entity.id);
        expect(state.result.values.map(value => value.value)).toEqual(expected);
        expect(await snapshot(page)).toEqual(activeBefore);
        groups.push({ entity, state, observedReadout });
      }
      for (const kind of ["pair", "dimensions"]) await page.getByLabel("Measurement kind").selectOption(kind);
      await page.getByRole("button", { name: "Restart", exact: true }).click();
      expect((await taskSession(page)).entry.selectionIds).toEqual(ids);
      expect((await taskSession(page)).activeDimensionEntityId).toBe(entities[1].id);
      await taskEvidence(page, `C-groups-${width}`, errors, { entry, groups, activeBefore, after: await snapshot(page) });
      const beforeKeep = await snapshot(page);
      await expect(page.locator("#measure-keep-active-entity")).toHaveText(`Active: ${entities[1].name}`);
      await page.getByRole("button", { name: "Keep / Save", exact: true }).click();
      await expect.poll(async () => (await graphics(page)).length).toBe(3);
      const saved = await graphics(page), afterKeep = await snapshot(page);
      await expect(page.locator(".measure-dimension-list-item")).toHaveCount(1);
      expect(saved.every(item => item.references[0].entityId === entities[1].id)).toBe(true);
      expect(afterKeep.invariants.undoDepth).toBe(beforeKeep.invariants.undoDepth + 1);
      expect(afterKeep.invariants.annotationTransforms.length).toBe(beforeKeep.invariants.annotationTransforms.length + 1);
      expect(afterKeep.invariants.selectionIds).toEqual(ids);
      const sameCanvas = await handle!.evaluate(element => element === document.querySelector("canvas.scene-canvas")); expect(sameCanvas).toBe(true);
      await expect(canvas(page)).toHaveAttribute("data-scene-lifecycle-generation", generation!);
      await taskEvidence(page, `D-kept-${width}`, errors, { beforeKeep, afterKeep, saved, sameCanvas });
      await page.getByRole("button", { name: "Exit Measure", exact: true }).click();
      await taskToolbarCommand(page, "edit.undo"); await expect.poll(async () => (await graphics(page)).length).toBe(0);
      await taskToolbarCommand(page, "edit.redo"); await expect.poll(async () => (await graphics(page)).length).toBe(3);
      await reloadProject(page, project); await expect.poll(async () => (await graphics(page)).length).toBe(3);
      expect((await graphics(page)).map(item => item.references)).toEqual(saved.map(item => item.references));
      await taskOpenMeasure(page);
      await taskEvidence(page, `D-reload-${width}`, errors, { saved, beforeKeep, afterKeep });
    });
  }
}
