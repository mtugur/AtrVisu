import { expect, test, type Page } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { canvas, command, graphics, snapshot, start, type Helpers } from "./measureV2Evidence";
import { closePrimary, editSelectedMachine, expectOperands, hoverCorner, reloadProject, taskFrame, taskOpenMeasure, taskSelectEntries, taskSession, taskToolbarCommand, topAndFit, visibleReferenceReadouts, type TaskPoint, type TaskSession } from "./measureV2TaskEvidence";

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
  if (!baseline) { registerRecoveryDelivery(helpers); return; }
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

type RecoverySession = TaskSession & { projectionMode?: string; workflow?: string;
  relationships: { id: number; points: TaskPoint[]; projectionMode: string; savedAnnotationId?: string }[] };
const recoverySession = async (page: Page) => await taskSession(page) as RecoverySession;
const selectExplorer = async (page: Page, ids: string[]) => {
  if (!await page.getByTestId("primary-dock-tab-panel.layoutExplorer").isVisible()) await page.getByTestId("primary-dock-collapse-toggle").click();
  await page.getByTestId("primary-dock-tab-panel.layoutExplorer").click();
  for (const [index, id] of ids.entries()) await page.getByTestId(`layout-explorer-entity-${id}`).click(index ? { modifiers: ["Control"] } : {});
  expect((await snapshot(page)).invariants.selectionIds).toEqual(ids);
  await closePrimary(page);
};
const alternateCorner = async (page: Page, id: string, exclude?: string) => {
  const initial = await hoverCorner(page, id), box = (await canvas(page).boundingBox())!;
  const offered = (await taskSession(page)).candidateObservations.find(point => point.entityId === id && point.visible && point.anchorKind.endsWith("-top") && point.anchorKind !== exclude)!;
  expect(offered).toBeTruthy();
  await page.mouse.move(initial.pointer.x, initial.pointer.y);
  await page.mouse.move(box.x + offered.x, box.y + offered.y, { steps: 12 }); await taskFrame(page);
  const state = await taskSession(page); expect(state.hover).toMatchObject({ entityId: id, anchorKind: offered.anchorKind });
  await page.mouse.click(box.x + offered.x, box.y + offered.y); await taskFrame(page);
  return state.hover!;
};
const assertSameScene = async (page: Page, handle: Awaited<ReturnType<ReturnType<typeof canvas>["elementHandle"]>>, generation: string | null) => {
  expect(await handle!.evaluate(element => element === document.querySelector("canvas.scene-canvas"))).toBe(true);
  await expect(canvas(page)).toHaveAttribute("data-scene-lifecycle-generation", generation!);
};

function registerRecoveryDelivery(helpers: Helpers) {
  for (const [width, height] of [[1440, 900], [1024, 768], [640, 800]]) {
    test(`C03 recovery R1 R6 persisted Inspector and explicit edit resume ${width}`, async ({ page }) => {
      test.setTimeout(120_000);
      const project = `Sales Layout recovery ${width}`;
      const profileHelpers: Helpers = { ...helpers, openCleanApp: async target => {
        await target.addInitScript(() => {
          localStorage.clear(); sessionStorage.clear();
          localStorage.setItem("atrvisu.panelSection.properties.v1", "collapsed");
        });
        await target.goto("/?e2eDiagnostics=1"); await expect(target.getByTestId("app-root")).toBeVisible();
      } };
      const errors = await start(page, profileHelpers, width, ["Flow Pack Machine", "Belt Conveyor"], project, height);
      const entities = (await taskSession(page)).entityCatalog.filter(entity => entity.type === "machine");
      await page.getByRole("button", { name: "Exit Measure", exact: true }).click();
      const generation = await canvas(page).getAttribute("data-scene-lifecycle-generation");
      await editSelectedMachine(page, { "Plan X": -3500, "Elevation above Level": 1400 });
      await expect(page.getByTestId("machine-instance-identity")).toContainText(entities[1].id);
      const elevation = page.getByRole("textbox", { name: "Elevation above Level", exact: true });
      await expect(elevation).toHaveValue("1400");
      await record(page, `R1-edit-${width}`, errors, { outcome: "PASS", task: "R1", persistedLegacyCollapsedFixture: true,
        selectedEntity: entities[1], elevation: await elevation.inputValue() });
      await reloadProject(page, project);
      await selectExplorer(page, [entities[1].id]);
      await page.getByTestId("right-panel").getByRole("button", { name: "Inspector", exact: true }).click();
      await expect(elevation).toBeEnabled(); await expect(elevation).toHaveValue("1400");
      await expect(page.getByTestId("machine-instance-identity")).toContainText(entities[1].id);
      await taskOpenMeasure(page); await page.getByLabel("Measurement point source").selectOption("geometry"); await topAndFit(page);
      const a = await alternateCorner(page, entities[0].id), b = await alternateCorner(page, entities[1].id);
      await page.getByRole("button", { name: "Keep / Save", exact: true }).click();
      await expect.poll(async () => (await graphics(page)).length).toBe(1);
      const saved = (await graphics(page))[0], beforeTabs = await snapshot(page);
      const afterReloadHandle = await canvas(page).elementHandle(), afterReloadGeneration = await canvas(page).getAttribute("data-scene-lifecycle-generation");
      await page.getByTestId("right-panel").getByRole("button", { name: "Inspector", exact: true }).click();
      await expect(elevation).toBeDisabled(); await expect(elevation).toHaveValue("1400");
      await expect(page.getByLabel("Measure editing ownership")).toContainText("Read-only");
      expect(await snapshot(page)).toEqual(beforeTabs);
      await page.getByRole("button", { name: "Pause and edit", exact: true }).click();
      await expect(elevation).toBeEnabled();
      const beforeEdit = await snapshot(page);
      await elevation.fill("1800"); await elevation.press("Tab"); await taskFrame(page);
      expect((await snapshot(page)).invariants.undoDepth).toBe(beforeEdit.invariants.undoDepth + 1);
      await expect.poll(async () => (await graphics(page))[0].endpoints[1].zMm).toBe(b.zMm + 400);
      const changed = await graphics(page);
      await taskToolbarCommand(page, "edit.undo"); await expect(elevation).toHaveValue("1400");
      await expect.poll(async () => (await graphics(page))[0].endpoints).toEqual(saved.endpoints);
      await taskToolbarCommand(page, "edit.redo"); await expect(elevation).toHaveValue("1800");
      const beforeResume = await snapshot(page);
      await page.getByRole("button", { name: "Resume Measure", exact: true }).click();
      await expect(page.getByTestId("measure-panel")).toBeVisible(); expect((await taskSession(page)).points).toEqual([]);
      expect((await snapshot(page)).invariants).toEqual(beforeResume.invariants);
      await assertSameScene(page, afterReloadHandle, afterReloadGeneration);
      await record(page, `R6-resume-${width}`, errors, { outcome: "PASS", task: "R6", a, b, saved, changed, beforeTabs, beforeEdit, beforeResume,
        afterReloadGeneration, sameCanvas: true });
      await page.getByRole("button", { name: "Exit Measure", exact: true }).click();
      await reloadProject(page, project); await expect.poll(async () => (await graphics(page)).length).toBe(1);
      expect((await graphics(page))[0].endpoints).toEqual(changed[0].endpoints);
      await record(page, `R1-reload-${width}`, errors, { outcome: "PASS", task: "R1", saved, changed, reloaded: await graphics(page), initialGeneration: generation,
        explicitProjectPageReload: true });
    });

    test(`C03 recovery R2 R3 R4 deliberate pair and seven world constraints ${width}`, async ({ page }) => {
      test.setTimeout(120_000);
      const errors = await start(page, helpers, width, ["Flow Pack Machine", "Belt Conveyor"], undefined, height);
      await page.getByRole("button", { name: "Exit Measure", exact: true }).click();
      await editSelectedMachine(page, { "Plan X": -3500, "Plan Y": -1500, "Elevation above Level": 1400 });
      await taskOpenMeasure(page);
      const entities = (await taskSession(page)).entityCatalog.filter(entity => entity.type === "machine");
      await taskSelectEntries(page, entities.map(entity => entity.id));
      await page.getByLabel("Measurement kind").selectOption("selected-pair");
      expect((await taskSession(page)).points).toEqual([]);
      await expect(page.getByRole("button", { name: "Keep / Save", exact: true })).toBeDisabled();
      await topAndFit(page);
      const handle = await canvas(page).elementHandle(), generation = await canvas(page).getAttribute("data-scene-lifecycle-generation");
      const a = await alternateCorner(page, entities[0].id), b = await alternateCorner(page, entities[1].id);
      expect(a.zMm).not.toBe(b.zMm);
      const result = await expectOperands(page, [a, b]);
      await record(page, `R2-references-${width}`, errors, { outcome: "PASS", task: "R2", a, b, result, readouts: await visibleReferenceReadouts(page) });
      const before = await snapshot(page), dx = b.xMm - a.xMm, dy = b.yMm - a.yMm, dz = b.zMm - a.zMm;
      for (const delta of [dx, dy, dz]) expect(delta).not.toBe(0);
      for (const [mode, expected, projected] of [
        ["true-3d", Math.hypot(dx, dy, dz), [b.xMm, b.yMm, b.zMm]], ["plan-xy", Math.hypot(dx, dy), [b.xMm, b.yMm, a.zMm]],
        ["vertical-xz", Math.hypot(dx, dz), [b.xMm, a.yMm, b.zMm]], ["vertical-yz", Math.hypot(dy, dz), [a.xMm, b.yMm, b.zMm]],
        ["axis-x", Math.abs(dx), [b.xMm, a.yMm, a.zMm]], ["axis-y", Math.abs(dy), [a.xMm, b.yMm, a.zMm]], ["axis-z", Math.abs(dz), [a.xMm, a.yMm, b.zMm]]
      ] as const) {
        const interpretation = page.getByLabel("Measurement interpretation", { exact: true });
        if (mode === "plan-xy") {
          await interpretation.focus(); await page.keyboard.press("Home"); await page.keyboard.press("ArrowDown"); await page.keyboard.press("Enter");
          await expect(interpretation).toHaveValue("plan-xy");
        } else await interpretation.selectOption(mode);
        await taskFrame(page);
        const state = await recoverySession(page);
        expect(state.points).toEqual([a, b]);
        const measured = mode === "true-3d" ? state.result.values.find(value => value.label === "3D Distance")! : state.result.values[0];
        expect(measured.value).toBeCloseTo(expected, 8);
        if (mode !== "true-3d") expect(await page.getByRole("region", { name: "Projected B", exact: true }).locator("data").evaluateAll(elements => elements.map(element => Number(element.value)))).toEqual(projected);
        expect(await snapshot(page)).toEqual(before);
        await record(page, `R3-${mode}-${width}`, errors, { outcome: "PASS", task: "R3", a, b, mode, expected, projected, measured,
          readouts: await visibleReferenceReadouts(page), state, sameCanvas: true, keyboardInterpretation: mode === "plan-xy" });
      }
      await page.getByRole("button", { name: "Change A", exact: true }).click();
      const replacement = await alternateCorner(page, entities[0].id, a.anchorKind);
      expect((await taskSession(page)).points).toEqual([replacement, b]);
      await page.getByRole("button", { name: "Change B", exact: true }).click();
      const replacementB = await alternateCorner(page, entities[1].id, b.anchorKind);
      expect((await taskSession(page)).points).toEqual([replacement, replacementB]);
      const beforeKeep = await snapshot(page);
      await page.getByRole("button", { name: "Keep / Save", exact: true }).click();
      await expect.poll(async () => (await graphics(page)).length).toBe(1);
      await expect(page.getByRole("button", { name: "Keep / Save", exact: true })).toBeDisabled();
      expect((await snapshot(page)).invariants.undoDepth).toBe(beforeKeep.invariants.undoDepth + 1);
      const editor = page.getByRole("region", { name: "Reference Dimension Editor", exact: true });
      await editor.getByLabel("Reference A anchor", { exact: true }).selectOption(a.anchorKind!);
      await expect.poll(async () => (await graphics(page))[0].references[0].anchor).toBe(a.anchorKind);
      await page.getByRole("button", { name: "Navigate", exact: true }).click();
      const actual = (await taskSession(page)).points;
      const box = (await canvas(page).boundingBox())!;
      for (const view of ["Back view (+Y)", "Right / Front / Top view (+X / -Y / +Z)"]) {
        const control = page.getByTestId("viewcube").getByRole("button", { name: view, exact: true });
        for (let turn = 0; turn < 6 && !await control.count(); turn++) {
          const start = { x: box.x + box.width * .2, y: box.y + box.height * .2 };
          await page.mouse.move(start.x, start.y); await page.mouse.down();
          await page.mouse.move(start.x + box.width * .55, start.y + 45, { steps: 15 }); await page.mouse.up(); await taskFrame(page);
        }
        await expect(control).toHaveCount(1); await control.focus(); await page.keyboard.press("Enter"); await taskFrame(page);
        expect((await taskSession(page)).points).toEqual(actual);
      }
      await assertSameScene(page, handle, generation);
      await record(page, `R4-manual-pair-${width}`, errors, { outcome: "PASS", task: "R4", a, b, replacement, replacementB, beforeKeep,
        afterKeep: await snapshot(page), graphics: await graphics(page), generation, sameCanvas: true });
    });

    test(`C03 recovery R5 R7 shared anchors chain and saved overlay never consume a corner ${width}`, async ({ page }) => {
      test.setTimeout(120_000);
      const errors = await start(page, helpers, width, ["Flow Pack Machine", "Belt Conveyor"], undefined, height);
      await page.getByRole("button", { name: "Exit Measure", exact: true }).click();
      await editSelectedMachine(page, { "Plan X": -3500 }); await taskOpenMeasure(page);
      await page.getByLabel("Measurement kind").selectOption("fan-out");
      await page.getByLabel("Measurement point source").selectOption("geometry"); await topAndFit(page);
      const entities = (await taskSession(page)).entityCatalog.filter(entity => entity.type === "machine");
      const handle = await canvas(page).elementHandle(), generation = await canvas(page).getAttribute("data-scene-lifecycle-generation");
      const a = await alternateCorner(page, entities[0].id), b1 = await alternateCorner(page, entities[1].id);
      await page.getByRole("button", { name: "Next B", exact: true }).click();
      expect((await taskSession(page)).points).toEqual([a]);
      const b2 = await alternateCorner(page, entities[1].id, b1.anchorKind);
      expect((await recoverySession(page)).relationships).toHaveLength(2);
      expect((await graphics(page)).length).toBe(0);
      const beforeKeep = await snapshot(page);
      await page.getByRole("button", { name: "Measurement 1 · Not saved", exact: false }).click();
      await page.getByRole("button", { name: "Keep / Save", exact: true }).click();
      await page.getByRole("button", { name: "Measurement 2 · Not saved", exact: false }).click();
      await page.getByRole("button", { name: "Keep / Save", exact: true }).click();
      await expect.poll(async () => (await graphics(page)).length).toBe(2);
      expect((await snapshot(page)).invariants.undoDepth).toBe(beforeKeep.invariants.undoDepth + 2);
      const fanout = await recoverySession(page), saved = await graphics(page);
      expect(fanout.relationships.every(item => item.savedAnnotationId)).toBe(true);
      await record(page, `R5-fan-out-${width}`, errors, { outcome: "PASS", task: "R5", a, b1, b2, beforeKeep, fanout, saved });
      await page.getByLabel("Measurement kind").selectOption("distance");
      const reused = await alternateCorner(page, entities[0].id);
      expect(reused).toEqual(a); expect((await taskSession(page)).points).toEqual([a]);
      await alternateCorner(page, entities[1].id);
      expect((await taskSession(page)).points).toEqual([a, b1]);
      await page.getByLabel("Measurement kind").selectOption("chain");
      await alternateCorner(page, entities[0].id); await alternateCorner(page, entities[1].id);
      await page.getByRole("button", { name: "Next segment", exact: true }).click();
      expect((await taskSession(page)).points).toEqual([b1]);
      await alternateCorner(page, entities[1].id, b1.anchorKind);
      const chain = await recoverySession(page);
      expect(chain.relationships[1].points[0]).toEqual(chain.relationships[0].points[1]);
      await expect(page.getByText("Route total:", { exact: false })).toBeVisible();
      expect((await graphics(page)).length).toBe(2);
      await page.getByLabel("Measurement kind").selectOption("distance");
      await alternateCorner(page, entities[0].id); await alternateCorner(page, entities[1].id);
      await page.getByRole("button", { name: "Keep / Save", exact: true }).focus(); await page.keyboard.press("Enter");
      await expect.poll(async () => (await graphics(page)).length).toBe(3);
      const editor = page.getByRole("region", { name: "Reference Dimension Editor", exact: true });
      for (const mode of ["depth", "overlay"]) {
        await editor.getByLabel("Display", { exact: true }).selectOption(mode);
        expect((await graphics(page))[2].endpoints).toEqual([a, b1].map(point => ({ xMm: point.xMm, yMm: point.yMm, zMm: point.zMm, entityId: point.entityId })));
      }
      await assertSameScene(page, handle, generation);
      await expectOperands(page, [a, b1]);
      await record(page, `R7-reuse-${width}`, errors, { outcome: "PASS", task: "R7", a, b1, b2, fanout, chain, saved,
        graphics: await graphics(page), readouts: await visibleReferenceReadouts(page), generation, sameCanvas: true });
    });
  }
  test("C03 recovery R7 locked Inspector and Auto Pinned keep canonical ownership", async ({ page }) => {
    test.setTimeout(90_000);
    const errors = await start(page, helpers, 1440, ["Flow Pack Machine", "Belt Conveyor"]);
    const entities = (await taskSession(page)).entityCatalog.filter(entity => entity.type === "machine");
    await page.getByRole("button", { name: "Exit Measure", exact: true }).click();
    await page.getByTestId("right-panel").getByRole("button", { name: "Inspector", exact: true }).click();
    if (!await page.getByTestId("primary-dock-tab-panel.layers").isVisible()) await page.getByTestId("primary-dock-collapse-toggle").click();
    await page.getByTestId("primary-dock-tab-panel.layers").click();
    page.once("dialog", dialog => dialog.accept("Measure lock test"));
    await page.getByTestId("add-layer").click();
    await page.getByRole("region", { name: "Selected machine properties", exact: true }).getByRole("combobox", { name: "Layer", exact: true }).selectOption({ label: "Measure lock test" });
    const row = page.locator(".layer-row").filter({ hasText: "Measure lock test" });
    await row.getByRole("button", { name: "Lock Measure lock test", exact: true }).click();
    await closePrimary(page); await taskOpenMeasure(page);
    const beforeTabs = await snapshot(page), generation = await canvas(page).getAttribute("data-scene-lifecycle-generation"), handle = await canvas(page).elementHandle();
    await page.getByTestId("right-panel").getByRole("button", { name: "Inspector", exact: true }).click();
    await expect(page.getByRole("textbox", { name: "Elevation above Level", exact: true })).toBeDisabled();
    await page.getByRole("button", { name: "Pause and edit", exact: true }).click();
    await expect(page.getByRole("textbox", { name: "Elevation above Level", exact: true })).toBeDisabled();
    await expect(page.getByText("This object is on a locked layer. Movement, editing, and delete are disabled.", { exact: true })).toBeVisible();
    expect(await snapshot(page)).toEqual(beforeTabs);
    await page.getByTestId("right-panel").getByRole("button", { name: "Pin Inspector", exact: true }).click();
    await selectExplorer(page, [entities[1].id]);
    if (!await page.getByTestId("primary-dock-tab-panel.layoutExplorer").isVisible()) await page.getByTestId("primary-dock-collapse-toggle").click();
    await page.getByTestId(`layout-explorer-entity-${entities[1].id}`).click({ modifiers: ["Control"] });
    await closePrimary(page);
    expect((await snapshot(page)).invariants.selectionIds).toEqual([]);
    await expect(page.getByTestId("inspector-empty-state")).toBeVisible();
    await expect(page.getByTestId("right-panel").getByText("Pinned", { exact: true })).toBeVisible();
    await page.getByTestId("right-panel").getByRole("button", { name: "Unpin Inspector", exact: true }).click();
    await expect(page.getByTestId("right-panel")).toHaveCount(0);
    await selectExplorer(page, [entities[0].id]);
    await expect(page.getByRole("textbox", { name: "Elevation above Level", exact: true })).toBeEnabled();
    await expect(page.getByTestId("right-panel").getByText("Auto", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Resume Measure", exact: true }).click();
    expect((await taskSession(page)).entry.selectionIds).toEqual([entities[1].id]);
    await assertSameScene(page, handle, generation);
    await record(page, "R7-locks-1440", errors, { outcome: "PASS", task: "R7", lockedEntity: entities[1], beforeTabs, sameCanvas: true, generation,
      resumedEntry: (await taskSession(page)).entry, currentSelection: (await snapshot(page)).invariants.selectionIds });
  });
}
