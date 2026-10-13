import { expect, test, type Page } from "@playwright/test";
import { mkdir, writeFile, readFile } from "node:fs/promises";
import { join } from "node:path";

type Helpers = {
  openCleanApp: (page: Page) => Promise<void>;
  collectPageErrors: (page: Page) => string[];
  waitForRuntimeViewport: (page: Page) => Promise<unknown>;
};
type Graphic = { id: string; displayMode: string; text: string; textPx: number; witnessCount: number; lineWeightPx: number;
  labelPosition: { x: number; y: number; z: number }; endpointScreens: { x: number; y: number }[];
  references: { type: string; levelId?: string; entityId?: string; anchor?: string }[];
  endpoints: { xMm: number; yMm: number; zMm: number }[] };
const canvas = (page: Page) => page.getByLabel("AtrVisu 3D workspace");
const graphics = async (page: Page): Promise<Graphic[]> => JSON.parse(await canvas(page).getAttribute("data-reference-dimensions") ?? "[]");
const snapshot = (page: Page) => page.evaluate(() => ({ camera: window.__atrvisuRuntimeViewport!.getCameraSnapshot("viewport.main"), invariants: window.__atrvisuRuntimeViewport!.getInvariants() }));
const dimensionPixels = async (page: Page) => {
  const png = (await page.screenshot()).toString("base64");
  const bounds = (await canvas(page).boundingBox())!;
  return page.evaluate(async ({ png, bounds }) => {
    const image = new Image(); image.src = `data:image/png;base64,${png}`; await image.decode();
    const surface = document.createElement("canvas"); surface.width = image.width; surface.height = image.height;
    const ctx = surface.getContext("2d")!; ctx.drawImage(image, 0, 0);
    const data = ctx.getImageData(Math.ceil(bounds.x), Math.ceil(bounds.y), Math.floor(bounds.width), Math.floor(bounds.height)).data;
    let count = 0;
    for (let i = 0; i < data.length; i += 4) if (data[i] > 180 && data[i + 1] > 140 && data[i + 2] < 140) count++;
    return count;
  }, { png, bounds });
};
const command = (page: Page, id: string) => page.getByTestId("workbench-command-bar").locator(`[data-command-id="${id}"]`);
const addMachine = async (page: Page, name = "Flow Pack Machine") => {
  const library = page.getByTestId("machine-library-panel");
  await library.getByLabel("Search assets").fill(name);
  await library.getByRole("button", { name: `Add ${name} to layout`, exact: true }).click();
  await expect.poll(async () => Object.keys(JSON.parse(await canvas(page).getAttribute("data-machine-screen-points") ?? "{}")).length).toBeGreaterThan(0);
};
const start = async (page: Page, helpers: Helpers, width = 1440, machine = false) => {
  await page.setViewportSize({ width, height: 900 });
  const errors = helpers.collectPageErrors(page);
  await helpers.openCleanApp(page); await helpers.waitForRuntimeViewport(page);
  if (machine) await addMachine(page);
  if (width <= 720) await page.getByRole("button", { name: "More commands", exact: true }).click();
  await command(page, "view.measure").click();
  await expect(page.getByTestId("measure-panel")).toBeVisible();
  await page.getByLabel("Measurement point source").selectOption("level-plane");
  return errors;
};
const complete = async (page: Page) => {
  const bounds = (await canvas(page).boundingBox())!;
  await page.mouse.click(bounds.x + bounds.width * .42, bounds.y + bounds.height * .3);
  await page.mouse.click(bounds.x + bounds.width * .57, bounds.y + bounds.height * .4);
  await expect(page.getByRole("button", { name: "Keep / Save", exact: true })).toBeEnabled();
};
const keep = async (page: Page) => {
  await complete(page); await page.getByRole("button", { name: "Keep / Save", exact: true }).click();
  await expect.poll(async () => (await graphics(page)).length).toBe(1);
};
const evidence = async (page: Page, name: string, errors: string[], observed: Record<string, unknown> = {}) => {
  const dir = join(process.cwd(), "test-results/c03-measure-v2-recovery"); await mkdir(dir, { recursive: true });
  await page.screenshot({ path: join(dir, `${name}.png`) });
  await writeFile(join(dir, `${name}.json`), JSON.stringify({ head: process.env.ATRVISU_E2E_EXPECTED_SOURCE_HEAD, runtime: await snapshot(page), canvasGeneration: await canvas(page).getAttribute("data-scene-lifecycle-generation"), graphics: await graphics(page), errors, ...observed }, null, 2));
};

export const registerMeasureV2Tests = (helpers: Helpers) => {
  for (const width of [1440, 1024, 640]) test(`C03 V2 M20 M29 M30 right Measure workspace preserves selection camera and lifecycle at ${width}`, async ({ page }) => {
    const errors = await start(page, helpers, width);
    const handle = await canvas(page).elementHandle(), generation = await canvas(page).getAttribute("data-scene-lifecycle-generation");
    const before = await snapshot(page);
    await complete(page);
    expect(await snapshot(page)).toEqual(before);
    if (width === 1440) {
      const handle = (await page.getByRole("button", { name: "Resize right panel", exact: true }).boundingBox())!;
      await page.mouse.move(handle.x + handle.width / 2, handle.y + handle.height / 2); await page.mouse.down();
      await page.mouse.move(handle.x - 80, handle.y + handle.height / 2, { steps: 4 }); await page.mouse.up();
      expect(await snapshot(page)).toEqual(before);
    }
    await page.getByRole("button", { name: "Inspector", exact: true }).click();
    await expect(page.locator(".workbench-inspector-mode")).toHaveText("Auto");
    await page.getByRole("button", { name: "Pin Inspector", exact: true }).click();
    await expect(page.locator(".workbench-inspector-mode")).toHaveText("Pinned");
    const measureTab = page.getByTestId("right-panel").getByRole("button", { name: "Measure", exact: true });
    const tabBox = (await measureTab.boundingBox())!;
    const actionsBox = (await page.locator(".workbench-inspector-header-actions").boundingBox())!;
    expect(tabBox.x + tabBox.width <= actionsBox.x || tabBox.y + tabBox.height <= actionsBox.y).toBe(true);
    await measureTab.click();
    await expect(page.getByRole("button", { name: "Keep / Save", exact: true })).toBeEnabled();
    await evidence(page, `m20-m29-m30-dock-${width}`, errors, { before, after: await snapshot(page), sameCanvas: await handle!.evaluate(el => el === document.querySelector("canvas.scene-canvas")) });
    await page.getByTestId("right-dock-collapse-toggle").click();
    await expect(page.getByTestId("right-panel")).toHaveCount(0);
    expect(await handle!.evaluate(el => el === document.querySelector("canvas.scene-canvas"))).toBe(true);
    await expect(canvas(page)).toHaveAttribute("data-scene-lifecycle-generation", generation!);
    expect(await snapshot(page)).toEqual(before); expect(errors).toEqual([]);
  });

  test("C03 V2 M22 M23 M26 M28 one saved renderer keeps explicit Overlay and visibility/style truthful", async ({ page }) => {
    const errors = await start(page, helpers); await keep(page);
    const initial = (await graphics(page))[0]; expect(initial.displayMode).toBe("depth"); expect(initial.witnessCount).toBe(2);
    const editor = page.getByRole("region", { name: "Reference Dimension Editor" });
    await editor.getByLabel("Display", { exact: true }).selectOption("overlay");
    await expect.poll(async () => (await graphics(page))[0]?.displayMode).toBe("overlay");
    await editor.getByLabel("Text Mode", { exact: true }).selectOption("fixed");
    await editor.getByLabel("Fixed text px").fill("20");
    await expect.poll(async () => (await graphics(page))[0]?.textPx).toBe(20);
    await editor.getByLabel("Line px", { exact: true }).fill("3");
    await expect.poll(async () => (await graphics(page))[0]?.lineWeightPx).toBe(3);
    await editor.getByLabel("Units", { exact: true }).selectOption("mm-metric");
    await expect.poll(async () => (await graphics(page))[0]?.text).toContain(" m)");
    await editor.getByLabel("Witness lines", { exact: true }).uncheck();
    await expect.poll(async () => (await graphics(page))[0]?.witnessCount).toBe(0);
    expect((await graphics(page))[0].endpoints).toEqual(initial.endpoints);
    await editor.getByLabel("Show dimension", { exact: true }).uncheck();
    await expect.poll(async () => (await graphics(page)).length).toBe(0);
    await editor.getByLabel("Show dimension", { exact: true }).check();
    await expect.poll(async () => (await graphics(page)).length).toBe(1);
    expect(errors).toEqual([]); await evidence(page, "m22-m23-m26-m28-overlay", errors);
  });

  test("C03 V2 M25 M29 text drag changes presentation only and is one undoable transaction", async ({ page }) => {
    const errors = await start(page, helpers); await keep(page);
    const before = (await graphics(page))[0], state = await snapshot(page), bounds = (await canvas(page).boundingBox())!;
    const x = bounds.x + before.labelPosition.x, y = bounds.y + before.labelPosition.y;
    await page.mouse.move(x, y); await page.mouse.down(); await page.mouse.move(x + 35, y - 30, { steps: 5 }); await page.mouse.up();
    await expect.poll(async () => (await graphics(page))[0]?.labelPosition.x).not.toBe(before.labelPosition.x);
    expect((await graphics(page))[0].endpoints).toEqual(before.endpoints);
    const after = await snapshot(page);
    expect(after.invariants.undoDepth).toBe(state.invariants.undoDepth + 1);
    expect(after.invariants.selectionIds).toEqual(state.invariants.selectionIds);
    await page.getByRole("button", { name: "Exit Measure", exact: true }).click();
    await command(page, "edit.undo").click();
    await expect.poll(async () => (await graphics(page))[0]?.labelPosition.x).toBeCloseTo(before.labelPosition.x, 3);
    await command(page, "edit.redo").click();
    await expect.poll(async () => (await graphics(page))[0]?.labelPosition.x).not.toBe(before.labelPosition.x);
    expect(errors).toEqual([]); await evidence(page, "m25-text-history", errors);
  });

  test("C03 V2 M21 M25 endpoint grip replaces only its Level reference and cancellation is inert", async ({ page }) => {
    const errors = await start(page, helpers); await keep(page);
    const before = (await graphics(page))[0], state = await snapshot(page), bounds = (await canvas(page).boundingBox())!;
    const a = before.endpointScreens[0];
    await page.mouse.move(bounds.x + a.x, bounds.y + a.y); await page.mouse.down();
    await page.mouse.move(bounds.x + a.x + 30, bounds.y + a.y - 20, { steps: 4 }); await page.mouse.up();
    await expect.poll(async () => (await graphics(page))[0]?.endpoints[0].xMm).not.toBe(before.endpoints[0].xMm);
    const edited = (await graphics(page))[0];
    expect(edited.endpoints[1]).toEqual(before.endpoints[1]);
    expect(edited.references.every(ref => ref.type === "level-point" && ref.levelId === "ground")).toBe(true);
    expect((await snapshot(page)).invariants.undoDepth).toBe(state.invariants.undoDepth + 1);
    await page.mouse.move(bounds.x + edited.endpointScreens[0].x, bounds.y + edited.endpointScreens[0].y); await page.mouse.down();
    await page.mouse.move(bounds.x + edited.endpointScreens[0].x + 40, bounds.y + edited.endpointScreens[0].y - 20);
    await canvas(page).dispatchEvent("pointercancel", { pointerId: 1, isPrimary: true }); await page.mouse.up();
    expect((await graphics(page))[0].endpoints).toEqual(edited.endpoints);
    expect((await snapshot(page)).invariants.undoDepth).toBe(state.invariants.undoDepth + 1);
    expect(errors).toEqual([]); await evidence(page, "m21-m25-grip-cancel", errors);
  });

  test("C03 V2 M24 semantic hover cycling and deliberate lock retain canonical anchors", async ({ page }) => {
    const errors = await start(page, helpers, 1440, true);
    await page.getByLabel("Measurement point source").selectOption("geometry");
    const bounds = (await canvas(page).boundingBox())!;
    const points = JSON.parse(await canvas(page).getAttribute("data-machine-screen-points") ?? "{}");
    const point = Object.values(points)[0] as { x: number; y: number };
    await page.mouse.move(bounds.x + point.x, bounds.y + point.y);
    const selected = page.locator('[data-anchor-kind][opacity="1"]');
    await expect(selected).toHaveCount(1);
    await canvas(page).focus(); await page.keyboard.press("Tab");
    const first = await selected.getAttribute("data-anchor-kind");
    await page.keyboard.press("Tab");
    expect(await selected.getAttribute("data-anchor-kind")).not.toBe(first);
    await page.keyboard.down("Shift");
    await expect(selected).toHaveAttribute("data-anchor-locked", "true");
    const locked = await selected.getAttribute("data-anchor-kind");
    await page.mouse.move(bounds.x + point.x + 15, bounds.y + point.y + 10);
    await expect(selected).toHaveAttribute("data-anchor-kind", locked!);
    await page.mouse.click(bounds.x + point.x + 15, bounds.y + point.y + 10);
    const session = JSON.parse(await canvas(page).getAttribute("data-measure-session") ?? "null");
    expect(session.points[0].anchorKind).toBeTruthy();
    expect(session.points[0].entityId).toMatch(/^machine:/);
    await page.keyboard.up("Shift");
    expect(errors).toEqual([]); await evidence(page, "m24-semantic-lock", errors);
  });

  test("C03 V2 M26 M30 saved Level references survive real project save and hard reload", async ({ page }) => {
    const errors = await start(page, helpers);
    await page.getByRole("button", { name: "Exit Measure", exact: true }).click();
    await page.getByRole("menuitem", { name: "File", exact: true }).click();
    await page.locator('[role="menu"] [data-command-id="project.manager"]').click();
    const manager = page.getByTestId("project-manager-modal");
    await manager.getByTestId("new-project-name").fill("C03 V2 persisted references");
    await manager.getByTestId("new-customer-name").fill("Measure regression");
    await manager.getByTestId("create-project").click();
    await expect(manager.getByTestId("project-manager-project-list")).toContainText("C03 V2 persisted references");
    await manager.getByTestId("close-project-manager").click();
    await command(page, "view.measure").click();
    await page.getByLabel("Measurement point source").selectOption("level-plane"); await keep(page);
    const before = (await graphics(page))[0];
    await page.getByRole("region", { name: "Reference Dimension Editor" }).getByLabel("Name", { exact: true }).fill("FFL baseline");
    await page.getByRole("button", { name: "Exit Measure", exact: true }).click();
    page.on("dialog", dialog => dialog.accept("Measure V2"));
    await command(page, "project.save").click();
    await expect.poll(() => page.evaluate(() => window.__atrvisuProjectCommands?.getActiveContext().hasUnsavedChanges)).toBe(false);
    await page.reload();
    await page.getByTestId("empty-project-welcome").getByRole("button", { name: "Open Project", exact: true }).click();
    await manager.getByTestId("project-manager-project-option").filter({ hasText: "C03 V2 persisted references" }).click();
    await manager.getByRole("button", { name: "Load Revision", exact: true }).click();
    await manager.getByTestId("close-project-manager").click();
    await expect.poll(async () => (await graphics(page)).length).toBe(1);
    expect((await graphics(page))[0].references).toEqual(before.references);
    expect((await graphics(page))[0].endpoints).toEqual(before.endpoints);
    await command(page, "view.measure").click();
    await expect(page.getByRole("button").filter({ hasText: "FFL baseline" })).toHaveCount(1);
    expect(errors).toEqual([]); await evidence(page, "m26-m30-project-reload", errors);
  });

  test("C03 V2 M27 associative entity dimensions update and an orphan repairs through registered reference editing", async ({ page }) => {
    const errors = await start(page, helpers, 1440, true);
    await page.getByLabel("Measurement kind").selectOption("dimensions");
    await page.getByRole("button", { name: "Keep / Save", exact: true }).click();
    await expect.poll(async () => (await graphics(page)).length).toBe(3);
    const before = (await graphics(page))[0].endpoints[0];
    await page.getByRole("button", { name: "Exit Measure", exact: true }).click();
    await page.getByTestId("right-panel").getByRole("button", { name: "Inspector", exact: true }).click();
    const x = page.getByRole("textbox", { name: "Plan X", exact: true });
    await x.fill(String(before.xMm + 1000)); await x.press("Tab");
    await expect.poll(async () => (await graphics(page))[0]?.endpoints[0].xMm).toBeCloseTo(before.xMm + 1000, 3);
    page.on("dialog", dialog => dialog.accept());
    await command(page, "edit.deleteSelected").click();
    await expect.poll(async () => (await graphics(page)).length).toBe(0);
    await command(page, "view.measure").click();
    await expect(page.getByRole("region", { name: "Reference Dimension Editor" })).toContainText("Orphaned");
    await page.getByRole("button", { name: "Exit Measure", exact: true }).click();
    await addMachine(page, "Belt Conveyor");
    await command(page, "view.measure").click();
    const editor = page.getByRole("region", { name: "Reference Dimension Editor" });
    const options = editor.getByLabel("Reference A entity", { exact: true }).locator("option");
    const id = await options.last().getAttribute("value");
    expect(id).toMatch(/^machine:/);
    await editor.getByLabel("Reference A entity", { exact: true }).selectOption(id!);
    await expect(editor).toContainText("Healthy");
    await expect.poll(async () => (await graphics(page)).length).toBe(3);
    expect((await graphics(page)).every(item => item.references[0].entityId === id)).toBe(true);
    expect(errors).toEqual([]); await evidence(page, "m27-associative-repair", errors);
  });

  test("C03 V2 M28 real machine depth occludes a dimension while explicit Overlay renders the same references", async ({ page }) => {
    const errors = await start(page, helpers, 1440, true);
    const top = page.getByTestId("viewcube").locator('[data-preset-id="z+"]');
    await top.focus(); await top.press("Enter");
    await expect.poll(() => page.evaluate(() => window.__atrvisuRuntimeViewport!.getCameraSnapshot("viewport.main")?.mode)).toBe("orthographic");
    const bounds = (await canvas(page).boundingBox())!;
    const points = JSON.parse(await canvas(page).getAttribute("data-machine-screen-points") ?? "{}");
    const p = Object.values(points)[0] as { x: number; y: number };
    await page.mouse.click(bounds.x + p.x - 8, bounds.y + p.y);
    await page.mouse.click(bounds.x + p.x + 8, bounds.y + p.y);
    await page.getByRole("button", { name: "Keep / Save", exact: true }).click();
    await expect.poll(async () => (await graphics(page)).length).toBe(1);
    const before = (await graphics(page))[0], depthPixels = await dimensionPixels(page);
    await evidence(page, "m28-depth-occluder", errors, { depthPixels });
    await page.getByLabel("Display", { exact: true }).selectOption("overlay");
    await expect.poll(async () => (await graphics(page))[0]?.displayMode).toBe("overlay");
    const overlayPixels = await dimensionPixels(page);
    expect(overlayPixels).toBeGreaterThan(depthPixels + 20);
    expect((await graphics(page))[0].references).toEqual(before.references);
    expect((await graphics(page))[0].endpoints).toEqual(before.endpoints);
    expect(errors).toEqual([]); await evidence(page, "m28-overlay-occluder", errors, { depthPixels, overlayPixels });
  });

  for (const kind of ["angle", "area"]) test(`C03 V2 M22 ${kind} has its own graphics and captured operand plane`, async ({ page }) => {
    const errors = await start(page, helpers);
    await page.getByLabel("Measurement kind").selectOption(kind);
    const bounds = (await canvas(page).boundingBox())!;
    for (const [x, y] of [[.42, .3], [.57, .4], [.45, .45]]) await page.mouse.click(bounds.x + bounds.width * x, bounds.y + bounds.height * y);
    if (kind === "area") await page.getByRole("button", { name: "Finish", exact: true }).click();
    await page.getByRole("button", { name: "Keep / Save", exact: true }).click();
    await expect.poll(async () => (await graphics(page)).length).toBe(1);
    expect((await graphics(page))[0].text).toContain(kind === "angle" ? "deg" : "mm2");
    expect(errors).toEqual([]); await evidence(page, `m22-${kind}`, errors);
  });

  test("C03 V2 M30 clean PNG includes saved dimensions but excludes session and edit affordances", async ({ page }) => {
    const errors = await start(page, helpers); await keep(page);
    await page.getByLabel("Display", { exact: true }).selectOption("overlay");
    const initial = await snapshot(page);
    const capture = async () => {
      await page.getByRole("menuitem", { name: "File", exact: true }).click();
      await page.locator('[role="menu"] [data-command-id="project.commercialOutputs"]').click();
      const downloadPromise = page.waitForEvent("download");
      await page.getByTestId("export-commercial-snapshot").click();
      const download = await downloadPromise, bytes = await readFile((await download.path())!);
      expect(bytes.readUInt32BE(16)).toBe(1920); expect(bytes.readUInt32BE(20)).toBe(1080);
      await page.getByTestId("close-commercial-outputs").click();
      return bytes;
    };
    const active = await capture();
    await page.getByRole("button", { name: "Exit Measure", exact: true }).click();
    const inactive = await capture();
    const count = (png: Buffer) => page.evaluate(async base64 => {
      const image = new Image(); image.src = `data:image/png;base64,${base64}`; await image.decode();
      const surface = document.createElement("canvas"); surface.width = image.width; surface.height = image.height;
      const ctx = surface.getContext("2d")!; ctx.drawImage(image, 0, 0);
      const data = ctx.getImageData(0, 0, surface.width, surface.height).data;
      let yellow = 0; for (let i = 0; i < data.length; i += 4) if (data[i] > 180 && data[i + 1] > 140 && data[i + 2] < 140) yellow++;
      return yellow;
    }, png.toString("base64"));
    const activePixels = await count(active), inactivePixels = await count(inactive);
    expect(activePixels).toBeGreaterThan(50);
    expect(Math.abs(activePixels - inactivePixels)).toBeLessThanOrEqual(10);
    expect(await snapshot(page)).toEqual(initial);
    const dir = join(process.cwd(), "test-results/c03-measure-v2-recovery"); await mkdir(dir, { recursive: true });
    await writeFile(join(dir, "m30-clean-presentation.png"), inactive);
    await writeFile(join(dir, "m30-clean-presentation.json"), JSON.stringify({ head: process.env.ATRVISU_E2E_EXPECTED_SOURCE_HEAD, activePixels, inactivePixels, runtime: await snapshot(page), errors }, null, 2));
    expect(errors).toEqual([]);
  });
};
