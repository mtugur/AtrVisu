import { expect, test, type Page } from "@playwright/test";
import { canvas, command, evidence, graphics, keep, snapshot, start, type Helpers } from "./measureV2Evidence";

type Session = { points: { entityId?: string; anchorKind?: string; xMm: number; yMm: number; zMm: number }[];
  entityCatalog: { id: string; transform: { planX: number; planY: number; elevation: number } }[];
  lockedReference?: { entityId: string; anchor: string };
  lockedAnchor?: { visible: boolean; confirmable: boolean; reason: string; point: Session["points"][number] };
  candidateObservations: { entityId: string; anchorKind: string; x: number; y: number; visible: boolean; reason: string }[] };
const session = async (page: Page): Promise<Session> => JSON.parse(await canvas(page).getAttribute("data-measure-session") ?? "null");
const frame = (page: Page) => page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
const hoverEntity = async (page: Page, family = "machine") => {
  const bounds = (await canvas(page).boundingBox())!;
  const points = JSON.parse(await canvas(page).getAttribute(`data-${family}-screen-points`) ?? "{}");
  const point = Object.values(points)[0] as { x: number; y: number };
  expect(point).toBeTruthy();
  await page.mouse.move(bounds.x + point.x, bounds.y + point.y);
  await expect.poll(async () => (await session(page)).candidateObservations?.length ?? 0).toBeGreaterThan(0);
};
const lock = async (page: Page, occlusion = false) => {
  await page.getByLabel("Measurement point source").selectOption("geometry");
  await command(page, "view.fitView").click();
  await hoverEntity(page);
  const point = (await session(page)).candidateObservations.find(point => point.visible && (occlusion ? point.anchorKind === "top-face-center" : point.anchorKind.endsWith("-top")));
  expect(point).toBeTruthy();
  const bounds = (await canvas(page).boundingBox())!;
  await page.mouse.move(bounds.x + point!.x, bounds.y + point!.y);
  await canvas(page).focus(); await page.keyboard.down("Shift"); await page.keyboard.up("Shift");
  await expect(page.getByRole("region", { name: "Locked Anchor", exact: true })).toBeVisible();
  expect((await session(page)).lockedReference?.anchor).toBe(point!.anchorKind);
  return (await session(page)).lockedReference!;
};
const pan = async (page: Page, dx: number, dy: number) => {
  const bounds = (await canvas(page).boundingBox())!;
  const panel = await page.getByTestId("right-panel").boundingBox();
  const openBottom = panel && panel.width >= bounds.width - .5 && panel.y > bounds.y ? panel.y : bounds.y + bounds.height;
  const x = bounds.x + bounds.width * .45, y = bounds.y + (openBottom - bounds.y) / 2;
  await page.mouse.move(x, y); await page.mouse.down({ button: "middle" });
  await page.mouse.move(x + dx, y + dy, { steps: 8 }); await page.mouse.up({ button: "middle" });
  await frame(page);
};
const geometry = (page: Page) => page.locator(".workbench-inspector-header").evaluate(header => {
  const box = (element: Element) => { const b = element.getBoundingClientRect(); return { x: b.x, y: b.y, width: b.width, height: b.height }; };
  return { header: box(header), controls: [...header.querySelectorAll("button,.workbench-inspector-mode")].map(element => ({ name: element.getAttribute("aria-label") ?? element.textContent, ...box(element) })) };
});
const expectHeader = async (page: Page) => {
  const observed = await geometry(page), header = observed.header;
  for (const control of observed.controls) {
    expect(control.x).toBeGreaterThanOrEqual(header.x); expect(control.y).toBeGreaterThanOrEqual(header.y);
    expect(control.x + control.width).toBeLessThanOrEqual(header.x + header.width + .1);
    expect(control.y + control.height).toBeLessThanOrEqual(header.y + header.height + .1);
    for (const other of observed.controls.filter(other => other !== control))
      expect(control.x + control.width <= other.x || other.x + other.width <= control.x || control.y + control.height <= other.y || other.y + other.height <= control.y, `${control.name} overlaps ${other.name}`).toBe(true);
  }
  return observed;
};
const pixelComparison = (page: Page, shown: string, hidden: string, rectangle: { x: number; y: number; width: number; height: number }) =>
  page.evaluate(async ({ shown, hidden, rectangle }) => {
    const crop = { x: Math.ceil(rectangle.x + 2), y: Math.ceil(rectangle.y + 2), width: Math.floor(rectangle.width - 4), height: Math.floor(rectangle.height - 4) };
    const read = async (png: string) => {
      const image = new Image(); image.src = `data:image/png;base64,${png}`; await image.decode();
      const c = document.createElement("canvas"); c.width = crop.width; c.height = crop.height;
      const ctx = c.getContext("2d")!; ctx.drawImage(image, -crop.x, -crop.y);
      return { pixels: ctx.getImageData(0, 0, c.width, c.height).data, png: c.toDataURL("image/png").split(",")[1] };
    };
    const a = await read(shown), b = await read(hidden);
    let changedPixels = 0, left = crop.width, top = crop.height, right = -1, bottom = -1;
    for (let i = 0; i < a.pixels.length; i += 4) if (Math.max(Math.abs(a.pixels[i] - b.pixels[i]), Math.abs(a.pixels[i + 1] - b.pixels[i + 1]), Math.abs(a.pixels[i + 2] - b.pixels[i + 2])) > 3) {
      changedPixels++; const x = (i / 4) % crop.width, y = Math.floor(i / 4 / crop.width);
      left = Math.min(left, x); top = Math.min(top, y); right = Math.max(right, x); bottom = Math.max(bottom, y);
    }
    return { changedPixels, bounds: changedPixels ? { x: crop.x + left, y: crop.y + top, width: right - left + 1, height: bottom - top + 1 } : null,
      crop, shownPngBase64: a.png, hiddenPngBase64: b.png };
  }, { shown, hidden, rectangle });
const chromeState = (page: Page, target: { x: number; y: number }) => page.locator(".workbench-inspector-header").evaluate((header, target) => {
  const elementState = (element: Element | null) => {
    if (!element) return null;
    const b = element.getBoundingClientRect(), css = getComputedStyle(element);
    return { tag: element.tagName, name: element.getAttribute("aria-label") ?? element.textContent?.trim(), classes: element.className,
      box: { x: b.x, y: b.y, width: b.width, height: b.height }, hover: element.matches(":hover"), focus: element === document.activeElement,
      background: css.backgroundColor, color: css.color, outline: css.outline };
  };
  return { header: elementState(header), controls: [...header.querySelectorAll("button,.workbench-inspector-mode")].map(elementState),
    targetHit: elementState(document.elementFromPoint(target.x, target.y)), focused: elementState(document.activeElement),
    scroll: { x: scrollX, y: scrollY, containers: [...document.querySelectorAll('[data-testid="right-panel"],.measure-panel')].map(element => ({ top: element.scrollTop, left: element.scrollLeft })) },
    html: header.innerHTML, activeAnimations: header.getAnimations({ subtree: true }).filter(animation => animation.playState === "running").length };
}, target);
const neutralChromeCapture = async (page: Page, target: { x: number; y: number }) => {
  await canvas(page).focus(); await page.mouse.move(1, 1);
  // Checkbox activation scrolls its dock into view; compare the same scroll pose.
  await page.locator('[data-testid="right-panel"],.measure-panel').evaluateAll(elements => {
    for (const element of elements) { element.scrollTop = 0; element.scrollLeft = 0; }
  });
  await page.locator(".workbench-inspector-header").evaluate(async header => {
    await Promise.all(header.getAnimations({ subtree: true }).map(animation => animation.finished.catch(() => undefined)));
  });
  await frame(page);
  const state = await chromeState(page, target);
  expect(state.activeAnimations).toBe(0);
  const png = await page.screenshot({ animations: "disabled", scale: "css" });
  expect(await chromeState(page, target)).toEqual(state);
  return { state, png };
};

export const registerMeasureV2StageBTests = (helpers: Helpers) => {
  for (const [width, height] of [[1440, 900], [1024, 768], [640, 800]]) {
    test(`C03 Stage B T05 shared header retains every control at default and minimum width ${width}`, async ({ page }) => {
      const errors = await start(page, helpers, width, false, undefined, height);
      const before = await snapshot(page), handle = await canvas(page).elementHandle(), generation = await canvas(page).getAttribute("data-scene-lifecycle-generation");
      await page.getByTestId("right-panel").getByRole("button", { name: "Inspector", exact: true }).click();
      const defaultGeometry = await expectHeader(page);
      if (width > 720) {
        const resize = (await page.getByRole("button", { name: "Resize right panel", exact: true }).boundingBox())!;
        await page.mouse.move(resize.x + resize.width / 2, resize.y + resize.height / 2); await page.mouse.down();
        await page.mouse.move(width - 280, resize.y + resize.height / 2, { steps: 6 }); await page.mouse.up();
      }
      const minimumGeometry = await expectHeader(page);
      await page.getByRole("button", { name: "Pin Inspector", exact: true }).click();
      await expect(page.locator(".workbench-inspector-mode")).toHaveText("Pinned");
      const pinnedGeometry = await expectHeader(page);
      await page.getByRole("button", { name: "Unpin Inspector", exact: true }).focus(); await page.keyboard.press("Enter");
      // Empty-selection Auto correctly closes the Inspector; explicit reopen restores its surface.
      await expect(page.getByTestId("right-panel")).toHaveCount(0);
      await page.getByTestId("right-dock-collapse-toggle").click();
      await expect(page.locator(".workbench-inspector-mode")).toHaveText("Auto");
      await page.getByTestId("right-panel").getByRole("button", { name: "Measure", exact: true }).focus(); await page.keyboard.press("Enter");
      await expect(page.getByTestId("measure-panel")).toBeVisible(); await expectHeader(page);
      await page.getByTestId("right-dock-collapse-toggle").click();
      await expect(page.getByTestId("right-panel")).toHaveCount(0);
      await page.getByTestId("right-dock-collapse-toggle").focus(); await page.keyboard.press("Enter");
      await expect(page.getByTestId("measure-panel")).toBeVisible();
      expect(await snapshot(page)).toEqual(before);
      const sameCanvas = await handle!.evaluate(element => element === document.querySelector("canvas.scene-canvas"));
      expect(sameCanvas).toBe(true); await expect(canvas(page)).toHaveAttribute("data-scene-lifecycle-generation", generation!);
      expect(errors).toEqual([]);
      await evidence(page, `stage-b-t05-header-${width}`, errors, { defaultGeometry, minimumGeometry, pinnedGeometry, before, after: await snapshot(page), sameCanvas });
    });
    for (const mode of ["depth", "overlay"]) test(`C03 Stage B T04 ${mode} graphics stay below actual chrome pixels ${width}`, async ({ page }) => {
      const errors = await start(page, helpers, width, false, undefined, height);
      await page.getByTestId("viewcube").getByRole("button", { name: "Top view (+Z)", exact: true }).focus(); await page.keyboard.press("Enter");
      await keep(page);
      const editor = page.getByRole("region", { name: "Reference Dimension Editor" });
      await editor.getByLabel("Display", { exact: true }).selectOption(mode);
      const before = await snapshot(page), rendered = (await graphics(page))[0], bounds = (await canvas(page).boundingBox())!;
      const header = (await page.locator(".workbench-inspector-header").boundingBox())!;
      const target = { x: header.x + header.width / 2, y: header.y + header.height / 2 };
      // Positive control: a real saved label must change visible viewport pixels,
      // not just disappear from diagnostics or from a completely covered region.
      const labelRectangle = { x: bounds.x + rendered.labelPosition.x - rendered.labelWidthPx / 2,
        y: bounds.y + rendered.labelPosition.y - rendered.labelHeightPx / 2, width: rendered.labelWidthPx, height: rendered.labelHeightPx };
      const panel = (await page.getByTestId("right-panel").boundingBox())!;
      expect(labelRectangle.x + labelRectangle.width <= panel.x || panel.x + panel.width <= labelRectangle.x
        || labelRectangle.y + labelRectangle.height <= panel.y || panel.y + panel.height <= labelRectangle.y).toBe(true);
      const positiveShown = await neutralChromeCapture(page, target);
      await editor.getByLabel("Show dimension", { exact: true }).uncheck();
      await expect.poll(async () => (await graphics(page)).length).toBe(0);
      const positiveHidden = await neutralChromeCapture(page, target);
      expect(positiveHidden.state).toEqual(positiveShown.state);
      const positiveComparison = await pixelComparison(page, positiveShown.png.toString("base64"), positiveHidden.png.toString("base64"), labelRectangle);
      expect(positiveComparison.changedPixels).toBeGreaterThan(0);
      await editor.getByLabel("Show dimension", { exact: true }).check();
      await expect.poll(async () => (await graphics(page)).length).toBe(1);
      await page.mouse.move(bounds.x + rendered.labelPosition.x, bounds.y + rendered.labelPosition.y);
      await page.mouse.down(); await page.mouse.move(target.x, target.y, { steps: 8 }); await page.mouse.up();
      await expect.poll(async () => (await graphics(page))[0]?.labelPosition.x).toBeCloseTo(target.x - bounds.x, 0);
      const savedUnderHeader = (await graphics(page))[0];
      const stableGraphics = await graphics(page), stableSnapshot = await snapshot(page);
      const neutralShown = await neutralChromeCapture(page, target);
      await page.getByTestId("right-panel").getByRole("button", { name: "Measure", exact: true }).hover(); await frame(page);
      const hoverState = await chromeState(page, target), hoverPng = (await page.screenshot({ animations: "disabled", scale: "css" })).toString("base64");
      const hoverControl = await pixelComparison(page, hoverPng, neutralShown.png.toString("base64"), header);
      expect(hoverControl.changedPixels).toBeGreaterThan(0);
      const measureTab = hoverState.controls.find(control => control?.name === "Measure")!;
      expect(measureTab.hover).toBe(true);
      // A fractional CSS edge paints the intersecting integer pixel cell.
      expect(hoverControl.bounds!.x).toBeGreaterThanOrEqual(Math.floor(measureTab.box.x));
      expect(hoverControl.bounds!.y).toBeGreaterThanOrEqual(Math.floor(measureTab.box.y));
      expect(hoverControl.bounds!.x + hoverControl.bounds!.width).toBeLessThanOrEqual(Math.ceil(measureTab.box.x + measureTab.box.width));
      expect(hoverControl.bounds!.y + hoverControl.bounds!.height).toBeLessThanOrEqual(Math.ceil(measureTab.box.y + measureTab.box.height));
      expect(await graphics(page)).toEqual(stableGraphics); expect(await snapshot(page)).toEqual(stableSnapshot);
      const afterHoverGraphics = await graphics(page), afterHoverSnapshot = await snapshot(page);
      await editor.getByLabel("Show dimension", { exact: true }).uncheck();
      await expect.poll(async () => (await graphics(page)).length).toBe(0);
      const mismatchedHidden = (await page.screenshot({ animations: "disabled", scale: "css" })).toString("base64");
      const mismatchedComparison = await pixelComparison(page, hoverPng, mismatchedHidden, header);
      expect(mismatchedComparison.changedPixels).toBe(hoverControl.changedPixels);
      expect(mismatchedComparison.bounds).toEqual(hoverControl.bounds);
      const neutralHidden = await neutralChromeCapture(page, target);
      expect(neutralHidden.state).toEqual(neutralShown.state);
      const matchedComparison = await pixelComparison(page, neutralShown.png.toString("base64"), neutralHidden.png.toString("base64"), header);
      const changedChromePixels = matchedComparison.changedPixels;
      expect(changedChromePixels).toBe(0);
      await page.getByRole("button", { name: "Navigate", exact: true }).click();
      const firstPoint = await page.locator(".measure-graphics polyline").first().evaluate(element => {
        const svg = element as SVGPolylineElement, p = svg.points.getItem(0), rect = svg.closest("svg")!.getBoundingClientRect(); return { x: p.x + rect.x, y: p.y + rect.y };
      });
      await pan(page, target.x - firstPoint.x, target.y - firstPoint.y);
      const livePolyline = await page.locator(".measure-graphics polyline").first().evaluate(element => {
        const svg = element as SVGPolylineElement, p = svg.points.getItem(0), rect = svg.closest("svg")!.getBoundingClientRect(); return { x: p.x + rect.x, y: p.y + rect.y };
      });
      expect(livePolyline.x).toBeGreaterThan(header.x); expect(livePolyline.x).toBeLessThan(header.x + header.width);
      expect(livePolyline.y).toBeGreaterThan(header.y); expect(livePolyline.y).toBeLessThan(header.y + header.height);
      const liveState = await snapshot(page), liveSession = await session(page), liveCapture = await neutralChromeCapture(page, target), livePng = liveCapture.png;
      await page.getByRole("button", { name: "Exit Measure", exact: true }).click();
      const withoutLive = await neutralChromeCapture(page, target);
      expect(withoutLive.state).toEqual(liveCapture.state);
      const liveComparison = await pixelComparison(page, livePng.toString("base64"), withoutLive.png.toString("base64"), header);
      const changedLiveChromePixels = liveComparison.changedPixels;
      expect(changedLiveChromePixels).toBe(0);
      expect((await snapshot(page)).camera).toEqual(liveState.camera);
      expect((await snapshot(page)).invariants).toEqual(liveState.invariants);
      if (!await command(page, "view.measure").isVisible()) await page.getByRole("button", { name: "More commands", exact: true }).click();
      await command(page, "view.measure").click();
      await editor.getByLabel("Show dimension", { exact: true }).check();
      await expect.poll(async () => (await graphics(page)).length).toBe(1);
      const isolation = await page.locator(".scene-viewport-host").evaluate(element => getComputedStyle(element).isolation);
      expect(isolation).toBe("isolate");
      const after = await snapshot(page);
      expect(after.invariants.selectionIds).toEqual(before.invariants.selectionIds);
      expect(errors).toEqual([]);
      await evidence(page, `stage-b-t04-${mode}-${width}`, errors, { mode, target, header, canvasBounds: bounds, savedUnderHeader, rendered: (await graphics(page))[0], changedChromePixels, changedLiveChromePixels, livePolyline, liveState, liveSession, isolation, before, after,
        positiveControl: { labelRectangle, shownChrome: positiveShown.state, hiddenChrome: positiveHidden.state, comparison: positiveComparison },
        hoverControl: { neutralChrome: neutralShown.state, hoverChrome: hoverState, comparison: hoverControl, graphicsBefore: stableGraphics, graphicsAfter: afterHoverGraphics, runtimeBefore: stableSnapshot, runtimeAfter: afterHoverSnapshot },
        mismatchedComparison, matchedControl: { shownChrome: neutralShown.state, hiddenChrome: neutralHidden.state, comparison: matchedComparison },
        liveControl: { shownChrome: liveCapture.state, hiddenChrome: withoutLive.state, comparison: liveComparison } }, livePng);
    });
  }
  for (const reason of ["Not in viewport", "Covered by chrome", "Scene-occluded"]) for (const activation of ["pointer", "keyboard"]) {
    test(`C03 Stage B T03 invisible locked ${reason} requires explicit ${activation} confirmation`, async ({ page }) => {
      const errors = await start(page, helpers, 1440, reason === "Scene-occluded" ? ["Flow Pack Machine", "Flow Pack Machine"] : true);
      if (reason === "Scene-occluded") {
        const lower = (await session(page)).entityCatalog.find(entity => entity.id.startsWith("machine:"))!;
        await page.getByRole("button", { name: "Exit Measure", exact: true }).click();
        await page.getByTestId("right-panel").getByRole("button", { name: "Inspector", exact: true }).click();
        for (const [label, value] of [["Plan X", lower.transform.planX], ["Plan Y", lower.transform.planY]] as const) {
          const input = page.getByRole("textbox", { name: label, exact: true }); await input.fill(String(value)); await input.press("Tab");
        }
        const elevation = page.getByRole("textbox", { name: "Elevation above Level", exact: true });
        await elevation.fill("3500"); await elevation.press("Tab");
        await command(page, "view.measure").click();
        const machines = (await session(page)).entityCatalog.filter(entity => entity.id.startsWith("machine:"));
        expect(machines[0].transform.planX).toBe(machines[1].transform.planX);
        expect(machines[0].transform.planY).toBe(machines[1].transform.planY);
      }
      const reference = await lock(page, reason === "Scene-occluded"), before = await snapshot(page);
      const locked = (await session(page)).lockedAnchor!, bounds = (await canvas(page).boundingBox())!;
      const observed = (await session(page)).candidateObservations.find(point => point.anchorKind === reference.anchor)!;
      await page.getByRole("button", { name: "Navigate", exact: true }).click();
      if (reason === "Scene-occluded") {
        await page.getByTestId("viewcube").getByRole("button", { name: "Top view (+Z)", exact: true }).focus(); await page.keyboard.press("Enter");
      } else {
        const panel = (await page.getByTestId("right-panel").boundingBox())!;
        if (reason === "Not in viewport") {
          // Three ordinary in-window Pan gestures move the reference past the viewport,
          // rather than losing the browser pointer outside the native window.
          for (let i = 0; i < 3; i++) await pan(page, -bounds.width / 4, 0);
        } else await pan(page, panel.x + 50 - bounds.x - observed.x, 0);
      }
      await expect.poll(async () => (await session(page)).lockedAnchor?.reason).toBe(reason);
      await page.getByRole("button", { name: "Pick", exact: true }).click();
      const invisible = await session(page), state = await snapshot(page);
      expect(invisible.lockedReference).toEqual(reference); expect(invisible.lockedAnchor?.confirmable).toBe(true);
      expect(invisible.lockedAnchor?.point).toEqual(locked.point);
      await page.mouse.click(bounds.x + bounds.width * .45, bounds.y + bounds.height * .2);
      await canvas(page).focus(); await page.keyboard.press("Enter");
      expect((await session(page)).points).toHaveLength(0);
      const confirm = page.getByRole("button", { name: "Confirm Locked Anchor", exact: true });
      await expect(confirm).toBeEnabled();
      expect(errors).toEqual([]);
      await evidence(page, `stage-b-t03-${reason.toLowerCase().replaceAll(" ", "-")}-${activation}-locked`, errors, { reference, invisible, before, beforeConfirmation: state });
      if (activation === "pointer") await confirm.click(); else { await confirm.focus(); await page.keyboard.press("Enter"); }
      await expect.poll(async () => (await session(page)).points.length).toBe(1);
      expect((await session(page)).points[0]).toMatchObject({ ...locked.point, entityId: reference.entityId, anchorKind: reference.anchor });
      expect((await snapshot(page)).invariants).toEqual(state.invariants);
      expect((await snapshot(page)).camera).toEqual(state.camera);
      expect(errors).toEqual([]);
      await evidence(page, `stage-b-t03-${reason.toLowerCase().replaceAll(" ", "-")}-${activation}`, errors, { reference, invisible, before, beforeConfirmation: state, after: await snapshot(page) });
    });
  }
  test("C03 Stage B T03 visible top corners are associative and silhouette markers remain pointer reachable", async ({ page }) => {
    const errors = await start(page, helpers, 1440, true);
    await page.getByLabel("Measurement point source").selectOption("geometry");
    await command(page, "view.fitView").click(); await hoverEntity(page);
    const observations = (await session(page)).candidateObservations;
    const tops = observations.filter(point => point.visible && point.anchorKind.endsWith("-top"));
    expect(tops).toHaveLength(4);
    const bounds = (await canvas(page).boundingBox())!;
    for (const point of tops.slice(0, 2)) await page.mouse.click(bounds.x + point.x, bounds.y + point.y);
    await expect(page.getByRole("button", { name: "Keep / Save", exact: true })).toBeEnabled();
    expect((await session(page)).points.map(point => point.anchorKind)).toEqual(tops.slice(0, 2).map(point => point.anchorKind));
    await page.getByRole("button", { name: "Keep / Save", exact: true }).click();
    await expect.poll(async () => (await graphics(page)).length).toBe(1);
    expect((await graphics(page))[0].references.every(reference => reference.type === "entity-anchor" && reference.anchor?.endsWith("-top"))).toBe(true);
    expect(errors).toEqual([]);
    await evidence(page, "stage-b-t03-top-corners", errors, { observations, references: (await graphics(page))[0].references });
  });
  test("C03 Stage B T03 rotated non-origin Column exposes all four canonical top corners", async ({ page }) => {
    const errors = await start(page, helpers);
    await page.getByRole("button", { name: "Exit Measure", exact: true }).click();
    const group = page.getByTestId("build-group-structure").getByRole("button", { name: "Structure", exact: true });
    if (await group.getAttribute("aria-expanded") !== "true") await group.click();
    await page.getByTestId("asset-card-build::column").getByRole("button", { name: "Add Column to layout", exact: true }).click();
    await page.getByTestId("right-panel").getByRole("button", { name: "Inspector", exact: true }).click();
    const properties = page.getByTestId("civil-reference-properties");
    for (const [label, value] of [["Civil Plan X", "-2500"], ["Civil Plan Y", "1800"], ["Civil Rotation Angle", "-37"]]) {
      const input = properties.getByLabel(label, { exact: true }); await input.fill(value); await input.press("Tab");
    }
    await command(page, "view.measure").click(); await command(page, "view.fitView").click();
    await hoverEntity(page, "civil");
    const observations = (await session(page)).candidateObservations;
    const tops = observations.filter(point => point.visible && point.anchorKind.endsWith("-top"));
    expect(tops).toHaveLength(4);
    const bounds = (await canvas(page).boundingBox())!, picked: Session["points"] = [];
    for (const point of tops) {
      await page.getByRole("button", { name: "Restart", exact: true }).click();
      await page.mouse.click(bounds.x + point.x, bounds.y + point.y);
      const confirmed = (await session(page)).points[0];
      expect(confirmed.anchorKind).toBe(point.anchorKind); expect(confirmed.entityId).toMatch(/^civil:/); picked.push(confirmed);
    }
    expect(new Set(picked.map(point => point.zMm)).size).toBe(1);
    expect(errors).toEqual([]);
    await evidence(page, "stage-b-t03-column", errors, { observations, picked, entity: (await session(page)).entityCatalog.find(entity => entity.id === picked[0].entityId) });
  });
  test("C03 Stage B T06 saved top references follow real geometry history and hard reload", async ({ page }) => {
    const errors = await start(page, helpers, 1440, true, "Stage B top references");
    await page.getByLabel("Measurement point source").selectOption("geometry");
    await command(page, "view.fitView").click(); await hoverEntity(page);
    const tops = (await session(page)).candidateObservations.filter(point => point.visible && point.anchorKind.endsWith("-top"));
    const bounds = (await canvas(page).boundingBox())!;
    for (const point of tops.slice(0, 2)) await page.mouse.click(bounds.x + point.x, bounds.y + point.y);
    await page.getByRole("button", { name: "Keep / Save", exact: true }).click();
    await expect.poll(async () => (await graphics(page)).length).toBe(1);
    const saved = (await graphics(page))[0];
    await page.getByRole("button", { name: "Exit Measure", exact: true }).click();
    await page.getByTestId("right-panel").getByRole("button", { name: "Inspector", exact: true }).click();
    const historyBefore = (await snapshot(page)).invariants.undoDepth;
    const x = page.getByRole("textbox", { name: "Plan X", exact: true });
    await x.fill(String(Number(await x.inputValue()) + 500)); await x.press("Tab");
    await page.getByRole("spinbutton", { name: /^Rotation Angle/ }).fill("30"); await page.getByRole("spinbutton", { name: /^Rotation Angle/ }).press("Tab");
    await expect.poll(async () => (await graphics(page))[0]?.endpoints[0]).not.toEqual(saved.endpoints[0]);
    const moved = (await graphics(page))[0];
    const historyAfter = (await snapshot(page)).invariants.undoDepth;
    const transactions = historyAfter - historyBefore;
    expect(transactions).toBeGreaterThan(0);
    for (let i = 0; i < transactions; i++) {
      await command(page, "edit.undo").click();
      await expect.poll(async () => (await snapshot(page)).invariants.undoDepth).toBe(historyAfter - i - 1);
    }
    await expect.poll(async () => (await graphics(page))[0]?.endpoints).toEqual(saved.endpoints);
    for (let i = 0; i < transactions; i++) {
      await command(page, "edit.redo").click();
      await expect.poll(async () => (await snapshot(page)).invariants.undoDepth).toBe(historyBefore + i + 1);
    }
    await expect.poll(async () => (await graphics(page))[0]?.endpoints).toEqual(moved.endpoints);
    page.on("dialog", dialog => dialog.accept("Stage B top references"));
    await command(page, "project.save").click();
    await expect.poll(() => page.evaluate(() => window.__atrvisuProjectCommands?.getActiveContext().hasUnsavedChanges)).toBe(false);
    await page.reload();
    await page.getByTestId("empty-project-welcome").getByRole("button", { name: "Open Project", exact: true }).click();
    const manager = page.getByTestId("project-manager-modal");
    await manager.getByTestId("project-manager-project-option").filter({ hasText: "Stage B top references" }).click();
    await manager.getByRole("button", { name: "Load Revision", exact: true }).click(); await manager.getByTestId("close-project-manager").click();
    await expect.poll(async () => (await graphics(page))[0]?.references).toEqual(saved.references);
    expect((await graphics(page))[0].endpoints).toEqual(moved.endpoints);
    expect(errors).toEqual([]);
    await evidence(page, "stage-b-t06-top-history-reload", errors, { saved, moved, historyBefore, historyAfter, transactions, restored: (await graphics(page))[0] });
  });
  test("C03 Stage B T03 completed dimension grip uses explicit invisible lock as one reference transaction", async ({ page }) => {
    const errors = await start(page, helpers, 1440, true);
    await page.getByLabel("Measurement point source").selectOption("geometry");
    await command(page, "view.fitView").click(); await hoverEntity(page);
    const tops = (await session(page)).candidateObservations.filter(point => point.visible && point.anchorKind.endsWith("-top"));
    const bounds = (await canvas(page).boundingBox())!;
    for (const point of tops.slice(0, 2)) await page.mouse.click(bounds.x + point.x, bounds.y + point.y);
    await page.getByRole("button", { name: "Keep / Save", exact: true }).click();
    await expect.poll(async () => (await graphics(page)).length).toBe(1);
    const original = (await graphics(page))[0], before = await snapshot(page), target = tops[2];
    await page.mouse.move(bounds.x + original.endpointScreens[0].x, bounds.y + original.endpointScreens[0].y); await page.mouse.down();
    await page.mouse.move(bounds.x + target.x, bounds.y + target.y, { steps: 6 });
    await canvas(page).focus(); await page.keyboard.down("Shift"); await page.keyboard.up("Shift");
    const panel = (await page.getByTestId("right-panel").boundingBox())!;
    await page.mouse.move(panel.x + panel.width / 2, panel.y + 70, { steps: 6 }); await page.mouse.up();
    const reference = (await session(page)).lockedReference!;
    expect(reference.anchor).toBe(target.anchorKind);
    expect((await graphics(page))[0].references).toEqual(original.references);
    expect((await snapshot(page)).invariants).toEqual(before.invariants);
    await page.getByRole("button", { name: "Navigate", exact: true }).click();
    await pan(page, panel.x + 70 - bounds.x - target.x, 0);
    await expect.poll(async () => (await session(page)).lockedAnchor?.reason).toBe("Covered by chrome");
    const locked = await session(page);
    await evidence(page, "stage-b-t03-grip-invisible-locked", errors, { original, reference, locked, before, beforeConfirmation: await snapshot(page) });
    await page.getByRole("button", { name: "Confirm Locked Anchor", exact: true }).click();
    await expect.poll(async () => (await graphics(page))[0]?.references[0]).toEqual({ type: "entity-anchor", entityId: reference.entityId, anchor: reference.anchor });
    const edited = (await graphics(page))[0], after = await snapshot(page);
    expect(edited.references[1]).toEqual(original.references[1]);
    expect(after.invariants.undoDepth).toBe(before.invariants.undoDepth + 1);
    expect(after.invariants.selectionIds).toEqual(before.invariants.selectionIds);
    await page.getByRole("button", { name: "Exit Measure", exact: true }).click();
    await command(page, "edit.undo").click(); await expect.poll(async () => (await graphics(page))[0]?.references).toEqual(original.references);
    await command(page, "edit.redo").click(); await expect.poll(async () => (await graphics(page))[0]?.references).toEqual(edited.references);
    expect(errors).toEqual([]);
    await evidence(page, "stage-b-t03-grip-invisible-confirmed", errors, { original, edited, reference, before, after });
  });
};
