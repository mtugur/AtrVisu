import { expect, test, type Locator, type Page } from "@playwright/test";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { MeasureSession } from "../src/measure/measureAuthority";
import type { MeasurePoint } from "../src/measure/measureGeometry";
import { prepare, customCard, expectRealModel } from "./nativeAssetHelpers";
type Helpers = {
    openCleanApp: (page: Page) => Promise<void>;
    getMenuCommand: (page: Page, menu: string, id: string) => Promise<Locator>;
    addCanonicalAtaraMachine: (page: Page, name: string, path: readonly string[]) => Promise<void>;
    openPreferenceBranch: (page: Page, id: "theme") => Promise<{
        surface: Locator;
    }>;
};
const directory = join(process.cwd(), "test-results/p1-close-measure-tool");
const captureEvidence = process.env.ATRVISU_CAPTURE_MEASURE_EVIDENCE === "1";
const canvas = (page: Page) => page.getByLabel("AtrVisu 3D workspace");
const tool = (page: Page) => page.getByTestId("measure-tool");
const frames = (page: Page) => page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
const session = async (page: Page): Promise<MeasureSession & {
    result: {
        values: {
            label: string;
            value: number;
            unit: string;
        }[];
        reason?: string;
    };
}> => {
    await expect(canvas(page)).toHaveAttribute("data-measure-session", /"kind"/);
    return JSON.parse((await canvas(page).getAttribute("data-measure-session"))!);
};
const snapshot = (page: Page) => page.evaluate(() => {
    const bridge = window.__atrvisuRuntimeViewport!;
    const c = document.querySelector<HTMLCanvasElement>(".scene-canvas")!;
    const observer = window as Window & { __measureCanvasObservation?: { ids: WeakMap<HTMLCanvasElement, number>; nextId: number } };
    observer.__measureCanvasObservation ??= { ids: new WeakMap(), nextId: 1 };
    const identity = observer.__measureCanvasObservation;
    if (!identity.ids.has(c)) identity.ids.set(c, identity.nextId++);
    return { camera: bridge.getCameraSnapshot("viewport.main"), viewport: bridge.get("viewport.main"), invariants: bridge.getInvariants(),
        canvasIdentity: { id: identity.ids.get(c), connected: c.isConnected, count: document.querySelectorAll(".scene-canvas").length },
        machineElevations: JSON.parse(c.dataset.machineElevationsMm ?? "{}"),
        civilElevations: JSON.parse(c.dataset.civilElevationsMm ?? "{}"),
        dpr: devicePixelRatio, renderSize: [c.width, c.height], cssSize: [c.clientWidth, c.clientHeight] };
});
const errorsFor = (page: Page) => {
    const errors: string[] = [];
    page.on("console", m => { if (m.type() === "error" || /Maximum update depth|GL_INVALID_VALUE|Uncaught|removeChild/.test(m.text()))
        errors.push(m.text()); });
    page.on("pageerror", e => errors.push(e.message));
    return errors;
};
const closeDocks = async (page: Page) => {
    if (await page.getByTestId("primary-dock").getAttribute("data-collapsed") !== "true")
        await page.getByTestId("primary-dock-collapse-toggle").click();
    if (await page.getByTestId("right-panel").isVisible())
        await page.getByRole("button", { name: "Collapse Inspector", exact: true }).click();
};
const enter = async (page: Page, helpers: Helpers, route = "menu") => {
    if (route === "toolbar")
        await page.getByTestId("workbench-command-bar").locator('[data-command-id="view.measure"]').click();
    else if (route === "palette") {
        await page.keyboard.press("Control+k");
        await page.getByRole("textbox", { name: /Search commands/ }).fill("Measure");
        await page.getByRole("option", { name: /^Measure/ }).click();
    }
    else
        await (await helpers.getMenuCommand(page, "View", "view.measure")).click();
    await expect(tool(page)).toBeVisible();
    await frames(page);
    await expect(canvas(page)).toBeFocused();
};
const exit = async (page: Page) => { await tool(page).getByRole("button", { name: "Exit Measure", exact: true }).click(); await expect(tool(page)).toHaveCount(0); };
const restart = async (page: Page) => { await tool(page).getByRole("button", { name: "Restart Measure", exact: true }).click(); await frames(page); };
const camera = async (page: Page, beta = .01, mode: "perspective" | "orthographic" = "orthographic", alpha = -Math.PI / 2) => {
    expect(await page.evaluate(({ beta, mode, alpha }) => window.__atrvisuRuntimeViewport!.applyCameraState({ mode,
        alpha, beta, radius: 32, targetX: 2, targetY: 0, targetZ: 1.5,
        orthographic: { centerX: 0, centerY: 0, verticalWorldSpan: 18 }
    }), { beta, mode, alpha })).toBe(true);
    expect(await page.evaluate(() => window.__atrvisuRuntimeViewport!.startRenderFrameProbe([{ x: 0, y: 0, z: 0 }, { x: 1, y: 0, z: 0 }, { x: 0, y: 0, z: 1 }]))).toBe(true);
    await expect.poll(() => page.evaluate(() => window.__atrvisuRuntimeViewport!.readRenderFrameProbe().length)).toBeGreaterThan(2);
    const rendered = await page.evaluate(() => window.__atrvisuRuntimeViewport!.readRenderFrameProbe(true));
    expect(rendered.at(-1)!.beta).toBeCloseTo(beta, 6);
};
const projected = (page: Page, p: MeasurePoint) => page.evaluate(p => window.__atrvisuRuntimeViewport!.probeProjection(0, 0, { x: p.xMm / 1000, y: p.zMm / 1000, z: p.yMm / 1000 })!.projected, p);
const pick = async (page: Page, point: MeasurePoint) => {
    const screen = await projected(page, point);
    expect(Number.isFinite(screen.x) && Number.isFinite(screen.y), JSON.stringify({ point, screen, snapshot: await snapshot(page) })).toBe(true);
    await page.mouse.move(screen.x, screen.y);
    await page.mouse.click(screen.x, screen.y);
    await frames(page);
};
const point = (xMm: number, yMm: number, zMm: number): MeasurePoint => ({ xMm, yMm, zMm });
const assertPoint = (actual: MeasurePoint, expected: MeasurePoint) => {
    for (const key of ["xMm", "yMm", "zMm"] as const)
        expect(Math.abs(actual[key] - expected[key])).toBeLessThanOrEqual(1);
};
const record = async (page: Page, name: string, ids: string[], before: unknown, observations: unknown, errors: string[]) => {
    expect(errors).toEqual([]);
    const after = await snapshot(page);
    const data = { name, scenarios: ids, sourceHead: process.env.ATRVISU_E2E_EXPECTED_SOURCE_HEAD, ciRun: process.env.GITHUB_RUN_ID ?? "local",
        before, after, observations, session: await canvas(page).getAttribute("data-measure-session"),
        displayed: await tool(page).count() ? await tool(page).innerText() : null, consoleErrors: errors };
    if (captureEvidence) {
        await mkdir(directory, { recursive: true });
        await writeFile(join(directory, `${name}.json`), JSON.stringify(data, null, 2));
        await page.screenshot({ path: join(directory, `${name}.png`) });
    }
};
const start = async (page: Page, helpers: Helpers) => {
    const errors = errorsFor(page);
    await page.setViewportSize({ width: 1440, height: 900 });
    await helpers.openCleanApp(page);
    await expect.poll(async () => (await snapshot(page)).viewport?.available).toBe(true);
    const response = await page.request.get("/");
    expect(response.headers()["x-atrvisu-source-head"]).toBe(process.env.ATRVISU_E2E_EXPECTED_SOURCE_HEAD);
    return errors;
};
const importSurfaces = async (page: Page, helpers: Helpers, points: MeasurePoint[], activeLevel = "ground", flags: {
    locked?: boolean;
    visible?: boolean;
}[] = []) => {
    const time = "2026-01-01T00:00:00.000Z";
    const data = { appName: "AtrVisu", version: 1, referencePoint: "front-left-bottom", coordinateReferenceVersion: "front-left-bottom-v1",
        exportedAt: time, objects: [], activeLevelId: activeLevel,
        levels: [{ id: "ground", name: "Ground", elevationMm: 0, systemLevel: true, createdAt: time, updatedAt: time },
            { id: "level-2", name: "Level 2", elevationMm: 6000, systemLevel: false, createdAt: time, updatedAt: time }],
        civilReferences: points.map((p, i) => ({ id: `measure-${i}`, type: p.zMm <= 0 ? "floor-area" : "wall", name: `Measure surface ${i}`,
            positionMm: { xMm: p.xMm - 250, yMm: p.yMm - 250, zMm: p.zMm - 200 }, sizeMm: { widthMm: 500, depthMm: 500, heightMm: 200 },
            rotationDeg: 0, referencePoint: "front-left-bottom", coordinateReferenceVersion: "front-left-bottom-v1", levelId: "ground", visible: flags[i]?.visible ?? true, locked: flags[i]?.locked ?? false,
            style: { opacity: 1 }, createdAt: time, updatedAt: time })) };
    await (await helpers.getMenuCommand(page, "File", "layout.controls")).click();
    const dialog = page.getByRole("dialog", { name: "Layout Import / Export", exact: true });
    await dialog.getByLabel("Import Layout File").setInputFiles({ name: "measure-fixture.json", mimeType: "application/json", buffer: Buffer.from(JSON.stringify(data)) });
    await expect(dialog).toContainText("Imported 0 objects.");
    await dialog.getByRole("button", { name: "Close Layout Import / Export" }).click();
    await expect.poll(async () => (await snapshot(page)).invariants.civilTransforms.length).toBe(points.length);
    await closeDocks(page);
    await camera(page);
};
const unchanged = async (page: Page, before: Awaited<ReturnType<typeof snapshot>>, handle: Awaited<ReturnType<Locator["elementHandle"]>>, allowCamera = false) => {
    const after = await snapshot(page);
    expect(after.invariants).toEqual(before.invariants);
    expect(after.machineElevations).toEqual(before.machineElevations);
    expect(after.civilElevations).toEqual(before.civilElevations);
    expect(after.viewport!.sceneLifecycleGeneration).toBe(before.viewport!.sceneLifecycleGeneration);
    expect(await handle!.evaluate(e => e === document.querySelector(".scene-canvas"))).toBe(true);
    if (!allowCamera)
        expect(after.camera).toEqual(before.camera);
};
const exportedLayout = async (page: Page, helpers: Helpers) => {
    await (await helpers.getMenuCommand(page, "File", "layout.controls")).click();
    const dialog = page.getByRole("dialog", { name: "Layout Import / Export", exact: true });
    const pending = page.waitForEvent("download");
    await dialog.getByRole("button", { name: "Export Layout", exact: true }).click();
    const data = JSON.parse(await readFile((await (await pending).path())!, "utf8"));
    delete data.exportedAt;
    await dialog.getByRole("button", { name: "Close Layout Import / Export" }).click();
    return JSON.stringify(data);
};
const commercialPng = async (page: Page, helpers: Helpers) => {
    await (await helpers.getMenuCommand(page, "File", "project.commercialOutputs")).click();
    const modal = page.getByTestId("commercial-outputs-modal");
    await expect(modal).toBeVisible();
    const pending = page.waitForEvent("download");
    await modal.getByTestId("export-commercial-snapshot").click();
    const png = await readFile((await (await pending).path())!);
    await page.getByTestId("close-commercial-outputs").click();
    return png;
};
export function registerMeasureTests(helpers: Helpers) {
    test("C03 M01 real registered routes, empty miss, explicit plane and Escape", async ({ page }) => {
        const errors = await start(page, helpers);
        await closeDocks(page);
        await camera(page);
        const before = await snapshot(page), handle = await canvas(page).elementHandle();
        for (const route of ["toolbar", "menu", "palette"]) {
            await enter(page, helpers, route);
            await exit(page);
        }
        await enter(page, helpers);
        expect(errors).toEqual([]);
        await pick(page, point(0, 0, 0));
        expect((await session(page)).points).toHaveLength(0);
        await record(page, "M01-empty-miss", ["M01"], before, { route: "real menu and pointer", miss: await session(page) }, errors);
        await tool(page).getByLabel("Measurement point source").selectOption("level-plane");
        await pick(page, point(0, 0, 0));
        const b = await projected(page, point(3000, 4000, 0));
        await page.mouse.move(b.x, b.y);
        await frames(page);
        const preview = await session(page);
        expect(Math.abs(preview.result.values[4].value - 5000)).toBeLessThanOrEqual(1);
        await expect(tool(page)).toContainText(`${preview.result.values[4].value.toFixed(3)} mm`);
        await record(page, "M01-distance-preview", ["M01"], before, { preview: await session(page) }, errors);
        await page.mouse.click(b.x, b.y);
        await frames(page);
        await expect(tool(page)).toContainText("Confirmed");
        await canvas(page).focus();
        await page.keyboard.press("Escape");
        await expect(tool(page)).toHaveCount(0);
        await expect(page.getByTestId("measure-graphics")).toHaveCount(0);
        await unchanged(page, before, handle);
    });
    test("C03 M03 rendered fixture signed XYZ and Distance result", async ({ page }) => {
        const errors = await start(page, helpers);
        const points = [point(0, 0, 0), point(3000, 4000, 12000)];
        await importSurfaces(page, helpers, points);
        const before = await snapshot(page), handle = await canvas(page).elementHandle();
        await enter(page, helpers);
        expect(errors).toEqual([]);
        for (const p of points)
            await pick(page, p);
        const s = await session(page);
        expect(s.points).toHaveLength(2);
        s.points.forEach((p, i) => assertPoint(p, points[i]));
        const result = s.result;
        [3000, 4000, 12000, 13000, 5000].forEach((n, i) => expect(Math.abs(result.values[i].value - n)).toBeLessThanOrEqual(1));
        await record(page, "M03-distance-result", ["M03"], before, { route: "real layout import + Geometry pointer hits", expected: points, result }, errors);
        await restart(page);
        for (const p of [...points].reverse())
            await pick(page, p);
        expect((await session(page)).result.values[2].value).toBeLessThan(0);
        await restart(page);
        await pick(page, points[0]);
        await pick(page, points[0]);
        expect((await session(page)).result.values.every(v => v.value === 0)).toBe(true);
        await exit(page);
        await unchanged(page, before, handle);
    });
    test("C03 M04 Angle arms arc and invalid zero-arm from real pointers", async ({ page }) => {
        const errors = await start(page, helpers);
        await closeDocks(page);
        await camera(page);
        const before = await snapshot(page), handle = await canvas(page).elementHandle();
        await enter(page, helpers);
        await tool(page).getByLabel("Measurement kind").selectOption("angle");
        await tool(page).getByLabel("Measurement point source").selectOption("level-plane");
        const observations = [];
        for (const deg of [90, 60, 0, 180]) {
            await restart(page);
            const points = [point(1000, 0, 0), point(0, 0, 0), point(1000 * Math.cos(deg * Math.PI / 180), 1000 * Math.sin(deg * Math.PI / 180), 0)];
            for (const p of points)
                await pick(page, p);
            const s = await session(page);
            expect(s.points).toHaveLength(3);
            const result = s.result;
            expect(Math.abs(result.values[0].value - deg)).toBeLessThanOrEqual(.05);
            observations.push({ expected: deg, points: s.points, result });
            if (deg === 90)
                await record(page, "M04-angle", ["M04"], before, observations, errors);
        }
        await restart(page);
        for (const p of [point(0, 0, 0), point(0, 0, 0), point(1000, 0, 0)])
            await pick(page, p);
        await expect(tool(page)).toContainText("zero length");
        expect((await session(page)).completed).toBe(false);
        await exit(page);
        await unchanged(page, before, handle);
    });
    test("C03 M05 differing-Z Geometry and captured Level Plan presentation planes", async ({ page }) => {
        test.setTimeout(90000);
        const errors = await start(page, helpers);
        const points = [point(0, 0, 1200), point(4000, 0, 6000), point(4000, 3000, -350), point(0, 3000, 2500)];
        await importSurfaces(page, helpers, points, "level-2");
        const before = await snapshot(page), handle = await canvas(page).elementHandle();
        await enter(page, helpers);
        await tool(page).getByLabel("Measurement kind").selectOption("area");
        for (const p of points)
            await pick(page, p);
        await tool(page).getByRole("button", { name: "Finish", exact: true }).click();
        const geometry = await session(page);
        expect(geometry.completed).toBe(true);
        geometry.points.forEach((p, i) => assertPoint(p, points[i]));
        expect(Math.abs(geometry.presentationElevationMm! - 1200)).toBeLessThanOrEqual(1);
        expect(Math.abs(geometry.result.values[0].value - 12000000)).toBeLessThanOrEqual(100);
        const lines = JSON.parse((await canvas(page).getAttribute("data-measure-session"))!).lines;
        expect(lines[0].points.every((p: MeasurePoint) => p.zMm === geometry.presentationElevationMm)).toBe(true);
        await record(page, "M05-geometry-area", ["M05"], before, { expected: points, geometry, lines, completion: "visible Finish" }, errors);
        const variations = [];
        for (const sequence of [[points[0], points[3], points[2], points[1]], [points[3], points[0], points[1], points[2]]]) {
            await restart(page);
            for (const p of sequence)
                await pick(page, p);
            await tool(page).getByRole("button", { name: "Finish", exact: true }).click();
            const state = await session(page);
            expect(Math.abs(state.presentationElevationMm! - sequence[0].zMm)).toBeLessThanOrEqual(1);
            expect(Math.abs(state.result.values[0].value - 12000000)).toBeLessThanOrEqual(100);
            variations.push({ geometryWinding: sequence, state });
        }
        await tool(page).getByLabel("Measurement point source").selectOption("level-plane");
        for (const p of points)
            await pick(page, { ...p, zMm: 6000 });
        await canvas(page).focus();
        await page.keyboard.press("Enter");
        const plane = await session(page);
        expect(plane.completed).toBe(true);
        expect(plane.presentationElevationMm).toBe(6000);
        plane.points.forEach(p => expect(p.zMm).toBeCloseTo(6000, 5));
        await record(page, "M05-level-area", ["M05"], before, { plane, variations, completion: "real canvas Enter" }, errors);
        await restart(page);
        for (const p of [point(0, 0, 6000), point(4000, 0, 6000), point(2000, 1000, 6000), point(4000, 3000, 6000), point(0, 3000, 6000)])
            await pick(page, p);
        await tool(page).getByRole("button", { name: "Finish", exact: true }).click();
        expect((await session(page)).completed).toBe(true);
        expect(Math.abs((await session(page)).result.values[0].value - 9000000)).toBeLessThanOrEqual(100);
        variations.push({ concave: await session(page) });
        await restart(page);
        for (const p of [point(0, 0, 6000), point(1000, 0, 6000), point(2000, 0, 6000)])
            await pick(page, p);
        await expect(tool(page).getByRole("button", { name: "Finish", exact: true })).toBeDisabled();
        variations.push({ collinear: await session(page) });
        await restart(page);
        await pick(page, point(0, 0, 6000));
        await pick(page, point(0, 0, 6000));
        expect((await session(page)).points).toHaveLength(1);
        await expect(tool(page)).toContainText("Repeated Plan vertex");
        variations.push({ duplicate: await session(page) });
        await restart(page);
        for (const p of [points[0], points[2], points[1], points[3]])
            await pick(page, { ...p, zMm: 6000 });
        await expect(tool(page).getByRole("button", { name: "Finish", exact: true })).toBeDisabled();
        await canvas(page).focus();
        await page.keyboard.press("Enter");
        await expect(tool(page)).toContainText("cross or touch");
        await record(page, "M05-invalid-area", ["M05"], before, { variations, invalid: await session(page) }, errors);
        await exit(page);
        await unchanged(page, before, handle);
    });
    for (const dpr of [1, 2])
        test(`C03 M08 real CSS classifier and capture cancellation DPR ${dpr}`, async ({ browser }) => {
            test.setTimeout(90000);
            const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: dpr });
            const page = await context.newPage();
            try {
                const errors = await start(page, helpers);
                await importSurfaces(page, helpers, [point(0, 0, 1200)]);
                const before = await snapshot(page), handle = await canvas(page).elementHandle();
                await enter(page, helpers);
                const origin = await projected(page, point(0, 0, 1200));
                const observations = [];
                for (const path of [[0], [3], [4], [5], [5, 0], [3, -3, 3, -3, 0]]) {
                    await restart(page);
                    await page.mouse.move(origin.x, origin.y);
                    await page.mouse.down();
                    await expect.poll(async () => (await session(page)).points.length).toBe(0);
                    for (const dx of path)
                        await page.mouse.move(origin.x + dx, origin.y);
                    await page.mouse.up();
                    await frames(page);
                    const s = await session(page);
                    const expected = Math.max(...path.map(Math.abs)) <= 4;
                    expect(s.points).toHaveLength(expected ? 1 : 0);
                    expect(s.lastPress?.confirmed).toBe(expected);
                    expect(s.lastPress?.maximum).toBeCloseTo(Math.max(...path.map(Math.abs)), 5);
                    observations.push({ route: "real page.mouse down/move/up", cssPath: path, expected, press: s.lastPress, points: s.points });
                    await unchanged(page, before, handle);
                }
                for (const cancel of ["pointercancel", "lostpointercapture", "focus", "outside", "navigate", "restart", "exit"]) {
                    await restart(page);
                    await page.mouse.move(origin.x, origin.y);
                    await page.mouse.down();
                    await expect.poll(async () => Boolean(JSON.parse((await canvas(page).getAttribute("data-measure-session"))!).press)).toBe(true);
                    if (cancel === "pointercancel")
                        await canvas(page).evaluate(e => {
                            const c = e as HTMLCanvasElement, press = JSON.parse(c.dataset.measureSession!).press;
                            c.dispatchEvent(new PointerEvent("pointercancel", { pointerId: press.pointerId, isPrimary: true, bubbles: true }));
                        });
                    if (cancel === "lostpointercapture")
                        await canvas(page).evaluate(e => { const c = e as HTMLCanvasElement; c.releasePointerCapture(JSON.parse(c.dataset.measureSession!).press.pointerId); });
                    if (cancel === "focus")
                        await tool(page).getByRole("button", { name: "Restart Measure", exact: true }).focus();
                    if (cancel === "outside")
                        await page.mouse.move(0, 0);
                    if (["navigate", "restart", "exit"].includes(cancel)) {
                        const name = cancel === "navigate" ? "Navigate" : cancel === "restart" ? "Restart Measure" : "Exit Measure";
                        await tool(page).getByRole("button", { name, exact: true }).focus();
                        await page.keyboard.press("Enter");
                    }
                    await page.mouse.up();
                    await frames(page);
                    if (cancel === "exit") {
                        await expect(tool(page)).toHaveCount(0);
                        await enter(page, helpers);
                    }
                    expect((await session(page)).points, `Cancelled by ${cancel}: ${JSON.stringify(await session(page))}`).toHaveLength(0);
                    observations.push({ cancellation: cancel, provenance: ["pointercancel", "lostpointercapture"].includes(cancel) ? "real press + browser capture/PointerEvent cancellation" : "real pointer/keyboard/focus", state: await session(page) });
                    if (cancel === "navigate")
                        await tool(page).getByRole("button", { name: "Pick", exact: true }).click();
                }
                await record(page, `M08-classifier-dpr-${dpr}`, ["M08"], before, observations, errors);
                await expect(await helpers.getMenuCommand(page, "Edit", "edit.undo")).toBeDisabled();
                await page.keyboard.press("Escape");
                await canvas(page).focus();
                await page.keyboard.press("Control+z");
                await unchanged(page, before, handle);
                await exit(page);
                await unchanged(page, before, handle);
                await pick(page, point(0, 0, 1200));
                await expect.poll(async () => (await snapshot(page)).invariants.selectionIds).toEqual(["civil:measure-0"]);
                const screen = await projected(page, point(0, 0, 1200)), dragBefore = await snapshot(page);
                await page.mouse.move(screen.x, screen.y);
                await page.mouse.down();
                await page.mouse.move(screen.x + 30, screen.y + 10, { steps: 5 });
                await page.mouse.up();
                await frames(page);
                expect((await snapshot(page)).invariants.civilTransforms).not.toEqual(dragBefore.invariants.civilTransforms);
                await canvas(page).focus();
                await page.keyboard.press("Control+z");
                await frames(page);
                expect((await snapshot(page)).invariants.civilTransforms).toEqual(dragBefore.invariants.civilTransforms);
                expect(errors).toEqual([]);
            }
            finally {
                await context.close();
            }
        });
    test("C03 M06 entry dimensions and ordered mixed reference graphics", async ({ page }) => {
        const errors = await start(page, helpers);
        await helpers.addCanonicalAtaraMachine(page, "Flow Pack Machine", ["Primary Packaging", "Horizontal Flow Pack"]);
        const props = page.getByLabel("Selected machine properties");
        await props.getByRole("spinbutton", { name: /^Rotation Angle/ }).fill("30");
        await props.getByRole("spinbutton", { name: /^Rotation Angle/ }).press("Tab");
        await closeDocks(page);
        await camera(page);
        await expect.poll(async () => Object.keys((await snapshot(page)).machineElevations).length).toBe(1);
        const before = await snapshot(page), handle = await canvas(page).elementHandle();
        await enter(page, helpers);
        await tool(page).getByLabel("Measurement kind").selectOption("dimensions");
        await expect(tool(page)).toContainText("Local Width");
        await expect(page.getByTestId("measure-graphics").locator(":scope > g:not([data-point-status]) > polyline")).toHaveCount(3);
        await record(page, "M06-dimensions", ["M06"], before, { dimensions: await session(page) }, errors);
        await exit(page);
        await unchanged(page, before, handle);
        // Two entry-selected entities are selected through the actual Explorer Ctrl route.
        await page.getByTestId("primary-dock-collapse-toggle").click();
        await page.getByTestId("primary-dock-tab-panel.machineLibrary").click();
        const wallGroup = page.getByTestId("build-group-structure").getByRole("button", { name: "Structure", exact: true });
        if (await wallGroup.getAttribute("aria-expanded") !== "true")
            await wallGroup.click();
        await page.getByTestId("asset-card-build::wall").getByRole("button", { name: "Add Wall to layout" }).click();
        await page.getByTestId("primary-dock-tab-panel.layoutExplorer").click();
        const explorer = page.getByTestId("layout-explorer");
        await explorer.getByRole("button", { name: /Flow Pack Machine/ }).first().click();
        await explorer.getByRole("button", { name: /Wall/ }).first().click({ modifiers: ["Control"] });
        const pairBefore = await snapshot(page);
        expect(pairBefore.invariants.selectionIds).toHaveLength(2);
        await closeDocks(page);
        await enter(page, helpers);
        await tool(page).getByLabel("Measurement kind").selectOption("pair");
        await expect(tool(page)).toContainText("Reference Point");
        await record(page, "M06-pair", ["M06"], pairBefore, { pair: await session(page) }, errors);
        await exit(page);
        expect((await snapshot(page)).invariants).toEqual(pairBefore.invariants);
    });
    test("C03 M06 Floor dimensions and two Machine references use canonical adapters", async ({ page }) => {
        const errors = await start(page, helpers);
        await importSurfaces(page, helpers, [point(0, 0, 0)]);
        await page.getByTestId("primary-dock-collapse-toggle").click();
        await page.getByTestId("primary-dock-tab-panel.layoutExplorer").click();
        await page.getByTestId("layout-explorer").getByRole("button", { name: /Measure surface 0/ }).click();
        const floorBefore = await snapshot(page);
        expect(floorBefore.invariants.selectionIds).toEqual(["civil:measure-0"]);
        await closeDocks(page);
        await enter(page, helpers);
        await tool(page).getByLabel("Measurement kind").selectOption("dimensions");
        const floorDimensions = (await session(page)).result.values;
        expect(floorDimensions.map(v => [v.label, v.value])).toEqual([["Local Width", 500], ["Plan Depth", 500], ["Floor Thickness", 200]]);
        await tool(page).getByRole("button", { name: "Navigate", exact: true }).click();
        await page.mouse.move(400, 300);
        await page.mouse.wheel(0, -100);
        await frames(page);
        expect((await session(page)).result.values).toEqual(floorDimensions);
        await record(page, "M06-floor-dimensions", ["M06"], floorBefore, { floorDimensions, navigation: "real wheel; local dimensions unchanged" }, errors);
        await exit(page);
        for (let i = 0; i < 2; i++) {
            if (await page.getByTestId("primary-dock").getAttribute("data-collapsed") === "true")
                await page.getByTestId("primary-dock-collapse-toggle").click();
            if (await page.getByTestId("primary-dock-tab-panel.machineLibrary").getAttribute("aria-pressed") === "true")
                await page.getByTestId("primary-dock-tab-panel.layoutExplorer").click();
            await helpers.addCanonicalAtaraMachine(page, "Flow Pack Machine", ["Primary Packaging", "Horizontal Flow Pack"]);
        }
        const exported = await exportedLayout(page, helpers);
        // Read-only expected result from the public export and production helpers
        // inside Vite's module environment, never a diagnostic-created operand.
        const expected = await page.evaluate(async raw => {
            const serializationPath = "/src/utils/layoutSerialization.ts";
            const adapterPath = "/src/platform/adapters/legacyEntityAdapter.ts";
            const geometryPath = "/src/measure/measureGeometry.ts";
            const { placedMachinesFromLayout } = await import(serializationPath);
            const { adaptPlacedMachineToPlatformEntity } = await import(adapterPath);
            const { pairResult } = await import(geometryPath);
            const machines = placedMachinesFromLayout(JSON.parse(raw));
            return pairResult(machines.map((m: import("../src/types/machine").PlacedMachine) => adaptPlacedMachineToPlatformEntity(m, [])), machines);
        }, exported);
        if (await page.getByTestId("primary-dock").getAttribute("data-collapsed") === "true")
            await page.getByTestId("primary-dock-collapse-toggle").click();
        if (await page.getByTestId("primary-dock-tab-panel.layoutExplorer").getAttribute("aria-pressed") !== "true")
            await page.getByTestId("primary-dock-tab-panel.layoutExplorer").click();
        const rows = page.getByTestId("layout-explorer").getByRole("button", { name: /Flow Pack Machine/ });
        await rows.nth(0).click();
        await rows.nth(1).click({ modifiers: ["Control"] });
        await closeDocks(page);
        const pairBefore = await snapshot(page);
        await enter(page, helpers);
        await tool(page).getByLabel("Measurement kind").selectOption("pair");
        expect((await session(page)).result).toEqual(expected);
        await record(page, "M06-machine-pair", ["M06"], pairBefore, { expected, authority: "canonical exported machines/adapters + existing Machine Plan reference helper" }, errors);
        await exit(page);
        expect((await snapshot(page)).invariants).toEqual(pairBefore.invariants);
    });
    test("C03 M02 native GLB surface, locked/hidden geometry and signed Floor bottom", async ({ page }) => {
        test.setTimeout(90000);
        const errors = await start(page, helpers);
        await importSurfaces(page, helpers, [], "level-2");
        await page.getByTestId("primary-dock-collapse-toggle").click();
        await page.getByTestId("primary-dock-tab-panel.machineLibrary").click();
        const dialog = await prepare(page, { exerciseCalibration: false, offsetUnindexed: true });
        // Retain the translated GLB child but calibrate it onto its canonical footprint.
        await dialog.getByRole("button", { name: "Back", exact: true }).click();
        await dialog.getByRole("button", { name: "Back", exact: true }).click();
        await dialog.getByLabel("Center on footprint").check();
        await dialog.getByLabel("Bottom on floor").check();
        await dialog.getByRole("button", { name: "Next", exact: true }).click();
        await dialog.getByRole("button", { name: "Next", exact: true }).click();
        await dialog.getByRole("button", { name: "Validate & Save", exact: true }).click();
        await customCard(page).getByRole("button", { name: "Add Imported Test Equipment to layout", exact: true }).click();
        await closeDocks(page);
        await camera(page, .7, "perspective");
        await expectRealModel(page);
        const geometry = await page.evaluate(() => window.__atrvisuRuntimeViewport!.getNavigationGeometry().included[0]);
        const center = geometry.corners.reduce((p, c) => ({ x: p.x + c.x / geometry.corners.length, y: p.y + c.y / geometry.corners.length, z: p.z + c.z / geometry.corners.length }), { x: 0, y: 0, z: 0 });
        const before = await snapshot(page), handle = await canvas(page).elementHandle();
        await enter(page, helpers);
        await pick(page, point(center.x * 1000, center.z * 1000, center.y * 1000));
        const glb = await session(page);
        expect(glb.points).toHaveLength(1);
        expect(glb.points[0].entityId).toMatch(/^machine:/);
        await record(page, "M02-native-glb", ["M02"], before, { route: "native GLB import + actual child surface pick", glb }, errors);
        await exit(page);
        await unchanged(page, before, handle);
        await importSurfaces(page, helpers, [point(0, 0, 1200), point(4000, 0, 1200)], "ground", [{ locked: true }, { visible: false }]);
        const visibilityBefore = await snapshot(page);
        await enter(page, helpers);
        await pick(page, point(0, 0, 1200));
        expect((await session(page)).points[0].entityId).toBe("civil:measure-0");
        await restart(page);
        await pick(page, point(4000, 0, 1200));
        expect((await session(page)).points).toHaveLength(0);
        await record(page, "M02-locked-visible-hidden-miss", ["M02"], visibilityBefore, { lockedVisible: "civil:measure-0", hidden: "civil:measure-1", state: await session(page) }, errors);
        await exit(page);
        await importSurfaces(page, helpers, [point(-3000, -2000, 0)]);
        // Bottom is real slab geometry, observed from below, not an FFL fallback.
        await camera(page, Math.PI - .01);
        const bottomBefore = await snapshot(page);
        await enter(page, helpers);
        await pick(page, point(-3000, -2000, -200));
        const bottom = await session(page);
        expect(bottom.points).toHaveLength(1);
        expect(bottom.points[0].zMm).toBeCloseTo(-200, 3);
        await record(page, "M02-signed-floor-bottom", ["M02"], bottomBefore, { bottom }, errors);
    });
    test("C03 M07 camera/input ownership and M10 clean capture/transient reload", async ({ page }) => {
        test.setTimeout(90000);
        const errors = await start(page, helpers);
        await importSurfaces(page, helpers, [point(0, 0, 1200), point(4000, 3000, 2500)]);
        await page.getByTestId("primary-dock-collapse-toggle").click();
        await page.getByTestId("primary-dock-tab-panel.viewpoints").click();
        await page.getByTestId("viewpoint-name-input").fill("C03 saved camera");
        await page.getByTestId("capture-viewpoint").click();
        await expect(page.getByTestId("viewpoints-panel").getByRole("button", { name: /C03 saved camera, updated/ })).toBeVisible();
        await closeDocks(page);
        const layoutBefore = await exportedLayout(page, helpers);
        await pick(page, point(0, 0, 1200));
        await closeDocks(page);
        const before = await snapshot(page), handle = await canvas(page).elementHandle();
        expect(before.invariants.selectionIds).toEqual(["civil:measure-0"]);
        await enter(page, helpers);
        for (const p of [point(0, 0, 1200), point(4000, 3000, 2500)])
            await pick(page, p);
        const confirmed = (await session(page)).points;
        const navigation = [];
        for (const mode of ["navigate", "pick"] as const) {
            await tool(page).getByRole("button", { name: mode === "pick" ? "Pick" : "Navigate", exact: true }).click();
            const box = (await canvas(page).boundingBox())!, x = box.x + box.width * .55, y = box.y + box.height * .3;
            const pre = await snapshot(page);
            await page.mouse.move(x, y);
            await page.mouse.down();
            await page.mouse.move(x + 50, y + 30, { steps: 5 });
            await page.mouse.up();
            await frames(page);
            if (mode === "pick")
                expect((await snapshot(page)).camera).toEqual(pre.camera);
            else
                expect((await snapshot(page)).camera).not.toEqual(pre.camera);
            const panBefore = await snapshot(page);
            await page.mouse.move(x, y);
            await page.mouse.down({ button: "middle" });
            await page.mouse.move(x + 30, y + 15, { steps: 5 });
            await page.mouse.up({ button: "middle" });
            await frames(page);
            expect((await snapshot(page)).camera).not.toEqual(panBefore.camera);
            const zoomBefore = await snapshot(page);
            await page.mouse.wheel(0, -100);
            await frames(page);
            expect((await snapshot(page)).camera).not.toEqual(zoomBefore.camera);
            expect((await session(page)).points).toEqual(confirmed);
            navigation.push({ mode, after: await snapshot(page) });
        }
        await (await helpers.getMenuCommand(page, "View", "view.fitView")).click();
        await frames(page);
        expect((await session(page)).points).toEqual(confirmed);
        await page.getByTestId("primary-dock-collapse-toggle").click();
        if (await page.getByTestId("primary-dock-tab-panel.viewpoints").getAttribute("aria-pressed") !== "true")
            await page.getByTestId("primary-dock-tab-panel.viewpoints").click();
        await expect(page.getByTestId("capture-viewpoint")).toBeDisabled();
        await page.getByTestId("viewpoints-panel").getByRole("button", { name: /C03 saved camera, updated/ }).dblclick();
        await frames(page);
        expect((await session(page)).points).toEqual(confirmed);
        await closeDocks(page);
        await camera(page, .7, "perspective");
        for (const preset of ["Top view (+Z)", "Front view (-Y)", "Right view (+X)"]) {
            await camera(page, .7, "perspective", -Math.PI / 4);
            // The accessible face controls are the same public ViewCube route.
            const control = page.getByTestId("viewcube").getByRole("button", { name: preset, exact: true });
            await control.focus();
            await control.press("Enter");
            await frames(page);
            expect((await session(page)).points).toEqual(confirmed);
            const current = await snapshot(page);
            expect(current.camera!.mode).toBe("orthographic");
            navigation.push({ preset, after: current });
        }
        await tool(page).getByLabel("Measurement point source").selectOption("level-plane");
        await camera(page, Math.PI / 2);
        await pick(page, point(0, 0, 6000));
        expect((await session(page)).points).toHaveLength(0);
        await record(page, "M07-navigation", ["M07"], before, { navigation, parallel: await session(page) }, errors);
        await camera(page);
        await tool(page).getByLabel("Measurement point source").selectOption("geometry");
        for (const p of [point(0, 0, 1200), point(4000, 3000, 2500)])
            await pick(page, p);
        await expect(tool(page)).toContainText("Confirmed");
        const sessionBefore = await session(page);
        const png = await commercialPng(page, helpers);
        expect([...png.subarray(0, 8)]).toEqual([137, 80, 78, 71, 13, 10, 26, 10]);
        expect(png.readUInt32BE(16)).toBe(1920);
        expect(png.readUInt32BE(20)).toBe(1080);
        expect((await session(page)).points).toEqual(sessionBefore.points);
        await unchanged(page, before, handle, true);
        await record(page, "M10-clean-capture", ["M10"], before, { sessionBefore, pngAuthority: "registered commercial export through actual modal; render-target capture excludes DOM tool", pngBytes: png.length, resolution: [1920, 1080] }, errors);
        await exit(page);
        expect((await commercialPng(page, helpers)).equals(png)).toBe(true);
        expect(await exportedLayout(page, helpers)).toBe(layoutBefore);
        await enter(page, helpers);
        await page.reload();
        await expect(page.getByTestId("app-root")).toBeVisible();
        await expect(tool(page)).toHaveCount(0);
        expect(errors).toEqual([]);
    });
    for (const width of [1440, 1024, 640])
        test(`C03 M09 live graphics and controls safe area at ${width}`, async ({ page }) => {
            test.setTimeout(90000);
            const errors = await start(page, helpers);
            await importSurfaces(page, helpers, [point(0, 0, 1200), point(4000, 3000, 2500)]);
            await page.setViewportSize({ width, height: width === 1024 ? 768 : width === 640 ? 800 : 900 });
            await frames(page);
            await camera(page);
            await pick(page, point(0, 0, 1200));
            await closeDocks(page);
            const before = await snapshot(page), handle = await canvas(page).elementHandle();
            const observations = [];
            for (const theme of ["light", "dark"] as const) {
                const control = await helpers.openPreferenceBranch(page, "theme");
                await control.surface.getByRole("radio", { name: theme === "light" ? "Light" : "Dark", exact: true }).check();
                await page.keyboard.press("Escape");
                await page.keyboard.press("Escape");
                await enter(page, helpers);
                await pick(page, point(0, 0, 1200));
                await pick(page, point(4000, 3000, 2500));
                const bounds = (await tool(page).boundingBox())!;
                expect(bounds.x).toBeGreaterThanOrEqual(0);
                expect(bounds.x + bounds.width).toBeLessThanOrEqual(width);
                expect(bounds.y).toBeGreaterThanOrEqual(0);
                expect(bounds.y + bounds.height).toBeLessThanOrEqual(page.viewportSize()!.height);
                expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
                observations.push({ theme, bounds, state: await session(page) });
                await record(page, `M09-${width}-${theme}`, ["M09"], before, observations, errors);
                const anchor = await projected(page, point(0, 0, 1200));
                await page.getByTestId("primary-dock-collapse-toggle").click();
                const primaryOpen = { bounds: await page.getByTestId("primary-dock").boundingBox(), tool: await tool(page).boundingBox(), anchor: await projected(page, point(0, 0, 1200)) };
                expect(Math.hypot(primaryOpen.anchor.x - anchor.x, primaryOpen.anchor.y - anchor.y)).toBeLessThanOrEqual(1);
                // The existing narrow shell hides the right reopen control behind the left
                // dock. Exercise each actual responsive surface, not an invisible control.
                if (width === 640)
                    await page.getByTestId("primary-dock-collapse-toggle").click();
                await page.getByRole("button", { name: "Expand Inspector", exact: true }).click();
                const inspector = page.getByTestId("right-panel");
                await expect(inspector).toBeVisible();
                await inspector.getByRole("button", { name: "Pin Inspector", exact: true }).click();
                await expect(inspector.getByText("Pinned", { exact: true })).toBeVisible();
                await frames(page);
                const afterAnchor = await projected(page, point(0, 0, 1200));
                const delta = Math.hypot(afterAnchor.x - anchor.x, afterAnchor.y - anchor.y);
                expect(delta).toBeLessThanOrEqual(1);
                const operands = (await session(page)).points;
                const markerPixels = await page.getByTestId("measure-graphics").locator("circle").evaluateAll(nodes => nodes.map(n => ({ x: Number(n.getAttribute("cx")), y: Number(n.getAttribute("cy")) })));
                expect(markerPixels).toHaveLength(operands.length);
                const canvasBounds = (await canvas(page).boundingBox())!;
                for (let i = 0; i < operands.length; i++) {
                    const expectedPixel = await projected(page, operands[i]);
                    expect(Math.hypot(markerPixels[i].x + canvasBounds.x - expectedPixel.x, markerPixels[i].y + canvasBounds.y - expectedPixel.y)).toBeLessThanOrEqual(1);
                }
                const openBounds = (await tool(page).boundingBox())!;
                expect(openBounds.x).toBeGreaterThanOrEqual(0);
                expect(openBounds.x + openBounds.width).toBeLessThanOrEqual(width);
                expect(openBounds.y).toBeGreaterThanOrEqual(0);
                expect(openBounds.y + openBounds.height).toBeLessThanOrEqual(page.viewportSize()!.height);
                await unchanged(page, before, handle);
                await record(page, `M09-${width}-${theme}-docks-pinned`, ["M09"], before, { anchor, afterAnchor, delta, markerPixels, primaryOpen, toolBounds: openBounds, inspector: await inspector.boundingBox(), primary: await page.getByTestId("primary-dock").boundingBox(), state: await session(page) }, errors);
                await inspector.getByRole("button", { name: "Unpin Inspector", exact: true }).click();
                await expect(inspector.getByText("Auto", { exact: true })).toBeVisible();
                await closeDocks(page);
                await exit(page);
            }
            await unchanged(page, before, handle);
        });
    test("C03 M10 migrated and current preferences do not serialize or restore Measure", async ({ page }) => {
        const errors = errorsFor(page);
        await page.addInitScript(() => {
            if (!sessionStorage.getItem("c03-legacy-seeded")) {
                localStorage.setItem("atrvisu.rightPanelWidth.v1", "430");
                localStorage.setItem("atrvisu.panelSection.layers.v1", "expanded");
                localStorage.setItem("atrvisu.placementSettings", JSON.stringify({ gridSnapEnabled: true, gridSnapStepMm: 100, rotationSnapEnabled: true, rotationSnapStepDeg: 15, showMeasurementHelpers: true }));
                sessionStorage.setItem("c03-legacy-seeded", "true");
            }
        });
        await page.setViewportSize({ width: 1440, height: 900 });
        await page.goto("/?e2eDiagnostics=1");
        await expect(page.getByTestId("app-root")).toBeVisible();
        await expect.poll(() => page.evaluate(() => window.__atrvisuUiPreferences?.getSnapshot().hydrationStatus)).toBe("ready");
        await closeDocks(page);
        await camera(page);
        const preferenceBefore = await page.evaluate(() => window.__atrvisuUiPreferences!.getSnapshot().preferences);
        const compatibilityBefore = await page.evaluate(() => localStorage.getItem("atrvisu.placementSettings"));
        const before = await snapshot(page);
        await enter(page, helpers);
        await tool(page).getByLabel("Measurement point source").selectOption("level-plane");
        await pick(page, point(0, 0, 0));
        await pick(page, point(3000, 4000, 0));
        expect(await page.evaluate(() => window.__atrvisuUiPreferences!.getSnapshot().preferences)).toEqual(preferenceBefore);
        await record(page, "M10-migrated-preferences", ["M10"], before, { preferenceBefore, compatibilityBefore, state: await session(page) }, errors);
        await page.reload();
        await expect(page.getByTestId("app-root")).toBeVisible();
        await expect(tool(page)).toHaveCount(0);
        await expect.poll(() => page.evaluate(() => window.__atrvisuUiPreferences?.getSnapshot().hydrationStatus)).toBe("ready");
        expect(await page.evaluate(() => window.__atrvisuUiPreferences!.getSnapshot().preferences)).toEqual(preferenceBefore);
        expect(await page.evaluate(() => localStorage.getItem("atrvisu.placementSettings"))).toBe(compatibilityBefore);
        await enter(page, helpers);
        expect((await session(page)).points).toEqual([]);
        await exit(page);
        expect(errors).toEqual([]);
    });
}
