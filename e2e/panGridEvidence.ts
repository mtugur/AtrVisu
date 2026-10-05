import { expect, test, type Page, type Locator } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { RuntimeViewportCameraSnapshot, NavigationProjectionProbe, NavigationRenderFrame } from "../src/platform/runtimeViewport/runtimeViewportBridge";
import { VIEW_PRESETS, getPresetAngles } from "../src/components/viewportNavigation/navigationGeometry";

const capture = process.env.ATRVISU_CAPTURE_PAN_GRID_EVIDENCE === "1";
const directory = join(process.cwd(), "test-results/p1-viewport-pan-grid-runtime");
const exactHeadSha = process.env.ATRVISU_E2E_EXPECTED_SOURCE_HEAD;
type Helpers = {
  openCleanApp: (page: Page) => Promise<void>;
  expectExactHeadServer: (page: Page) => Promise<void>;
  openPrimaryDockPanel: (page: Page, id: string) => Promise<unknown>;
  addBuildPrimitive: (page: Page, name: string, group: "Structure" | "Planning") => Promise<void>;
  createTwoMachineAssembly: (page: Page, name: string) => Promise<{ group: Locator }>;
  getMenuCommand: (page: Page, menu: string, id: string) => Promise<Locator>;
  openPreferenceBranch: (page: Page, id: "theme") => Promise<{ surface: Locator }>;
};
const frames = (page: Page) => page.evaluate(() => new Promise<void>(resolve =>
  requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
const snapshot = (page: Page) => page.evaluate(() => {
  const bridge = window.__atrvisuRuntimeViewport!;
  return { camera: bridge.getCameraSnapshot("viewport.main")!, viewport: bridge.get("viewport.main")!, invariants: bridge.getInvariants(),
    worldGeometry: bridge.getNavigationGeometry().included.map(({ entityId, corners }) => ({ entityId, corners })) };
});
const probe = (page: Page, x: number, y: number, reference?: NavigationProjectionProbe["reference"]) =>
  page.evaluate(({ x, y, reference }) => window.__atrvisuRuntimeViewport!.probeProjection(x, y, reference)!, { x, y, reference });
const cameraInvariant = (camera: RuntimeViewportCameraSnapshot) => {
  const { targetX: _tx, targetY: _ty, targetZ: _tz, positionX: _px, positionY: _py, positionZ: _pz, ...invariant } = camera;
  return invariant;
};
const settle = async (page: Page) => {
  let previous = (await snapshot(page)).camera;
  await expect(async () => {
    await frames(page);
    const next = (await snapshot(page)).camera;
    const difference = Math.max(Math.abs(next.alpha - previous.alpha), Math.abs(next.beta - previous.beta), Math.abs(next.radius - previous.radius));
    previous = next;
    expect(difference).toBeLessThan(0.000001);
  }).toPass({ timeout: 5000, intervals: [16, 32, 64] });
};
const orbit = async (page: Page, dx: number, dy: number) => {
  const box = (await page.getByLabel("AtrVisu 3D workspace").boundingBox())!;
  const x = box.x + box.width / 2, y = box.y + box.height * 0.22;
  await page.mouse.move(x, y); await page.mouse.down();
  await page.mouse.move(x + dx, y + dy, { steps: 12 }); await page.mouse.up();
  await settle(page);
};
const choosePreset = async (page: Page, id: string) => {
  const preset = VIEW_PRESETS.find(p => p.id === id)!;
  const zone = page.getByTestId("viewcube").locator(`[data-preset-id="${id}"]`);
  // Expose back-facing cube zones through real empty-space orbit, then invoke
  // the actual accessible ViewCube control. No diagnostic camera writes.
  for (let attempt = 0; await zone.count() === 0 && attempt < 12; attempt++) {
    await orbit(page, 180, preset.direction.z < 0 ? -120 : preset.direction.z > 0 ? 80 : 0);
  }
  await expect(zone).toBeVisible();
  await zone.focus(); await page.keyboard.press("Enter"); await frames(page);
  const camera = (await snapshot(page)).camera;
  const angles = getPresetAngles(preset.direction);
  expect(camera.mode).toBe("orthographic");
  expect(camera.alpha).toBeCloseTo(angles.alpha, 6); expect(camera.beta).toBeCloseTo(angles.beta, 6);
};
const closeDocks = async (page: Page) => {
  const primary = page.getByTestId("primary-dock");
  if (await primary.getAttribute("data-collapsed") !== "true") await page.getByTestId("primary-dock-collapse-toggle").click();
  const inspector = page.getByTestId("right-panel");
  if (await inspector.isVisible()) await page.getByRole("button", { name: "Collapse Inspector", exact: true }).click();
};
const enterState = async (page: Page, state: string, helpers: Helpers) => {
  const box = (await page.getByLabel("AtrVisu 3D workspace").boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  if (state === "wheel") { await page.mouse.wheel(0, -450); await settle(page); }
  if (state === "oblique") await orbit(page, 100, 85);
  if (state === "shallow") {
    // Orbit downward until near-horizontal; stop before the actual side pole.
    for (let i = 0; (await snapshot(page)).camera.beta < 1.40 && i < 8; i++) await orbit(page, 20, -35);
    expect((await snapshot(page)).camera.beta).toBeGreaterThan(1.40);
  }
  if (state === "fit") { await (await helpers.getMenuCommand(page, "View", "view.fitView")).click(); await frames(page); }
  if (VIEW_PRESETS.some(p => p.id === state)) await choosePreset(page, state);
};
const saveCamera = async (page: Page, helpers: Helpers) => {
  const open = async () => {
    if (await page.getByTestId("primary-dock").getAttribute("data-collapsed") === "true") {
      await page.getByTestId("primary-dock-collapse-toggle").click();
    }
    const tab = page.getByTestId("primary-dock-tab-panel.viewpoints");
    if (await tab.getAttribute("aria-pressed") !== "true") await helpers.openPrimaryDockPanel(page, "panel.viewpoints");
  };
  await open();
  await page.getByTestId("viewpoint-name-input").fill("Pan reference");
  await page.getByTestId("capture-viewpoint").click();
  await closeDocks(page); await frames(page);
  return async () => {
    await open();
    await page.getByTestId("apply-viewpoint").click();
    await closeDocks(page); await frames(page);
  };
};
const writeEvidence = async (filename: string, value: unknown) => {
  if (!capture) return;
  await mkdir(directory, { recursive: true });
  await writeFile(join(directory, filename), JSON.stringify(value, null, 2));
};

const analyzeRenderFrames = (samples: readonly NavigationRenderFrame[], origin: readonly NavigationProjectionProbe[], x: number, y: number) => {
  let residual = 0, reversal = 0, wobble = 0, jump = 0, stalls = 0;
  for (let i = 0; i < samples.length; i++) {
    const frame = samples[i];
    for (let a = 0; a < origin.length; a++) {
      const dx = frame.projected[a].x - origin[a].projected.x;
      const dy = frame.projected[a].y - origin[a].projected.y;
      residual = Math.max(residual, Math.hypot(dx - (frame.pointer.x - x), dy - (frame.pointer.y - y)));
      wobble = Math.max(wobble, Math.abs(dy - (frame.pointer.y - y)));
      if (i > 0) {
        const previous = samples[i - 1];
        const input = frame.pointer.x - previous.pointer.x;
        const movement = frame.projected[a].x - previous.projected[a].x;
        reversal = Math.max(reversal, Math.max(0, -movement));
        jump = Math.max(jump, Math.abs(movement - input));
        if (input > 1 && Math.abs(movement) < 0.01) stalls++;
      }
    }
  }
  return { residual, reversal, wobble, jump, stalls, frameCount: samples.length };
};

export function registerPanGridTests(helpers: Helpers) {
  for (const dpr of [1, 1.25, 1.5, 2]) test.describe(`render-frame DPR ${dpr}`, () => {
    test.use({ deviceScaleFactor: dpr });
    for (const width of [1440, 640]) for (const state of ["default", "fit", "shallow", "y-", "x+-y+-z+"]) {
      test(`P1-PAN-FRAME ${state} ${width}px DPR${dpr}`, async ({ page }) => {
        test.setTimeout(120_000);
        const errors: string[] = [];
        page.on("console", m => { if (m.type() === "error" || /Maximum update depth|GL_INVALID_VALUE|Uncaught|removeChild/.test(m.text())) errors.push(m.text()); });
        page.on("pageerror", e => errors.push(e.message));
        await page.setViewportSize({ width, height: width === 1440 ? 900 : 800 });
        await helpers.openCleanApp(page); await helpers.expectExactHeadServer(page);
        if (await page.getByTestId("primary-dock").getAttribute("data-collapsed") === "true") {
          await page.getByRole("button", { name: "Open Library", exact: true }).click();
        }
        await helpers.createTwoMachineAssembly(page, "Frame Pan Assembly");
        await helpers.addBuildPrimitive(page, "Beam", "Structure");
        await closeDocks(page); await enterState(page, state, helpers); await settle(page);
        const restore = await saveCamera(page, helpers);
        const canvas = page.getByLabel("AtrVisu 3D workspace");
        const handle = await canvas.elementHandle(); const box = (await canvas.boundingBox())!;
        const x = box.x + box.width * 0.4, y = box.y + box.height * 0.45;
        const paths = [];
        for (const speed of ["normal", "slow"] as const) {
          await restore(); await settle(page);
          const before = await snapshot(page);
          await page.mouse.move(x, y); await frames(page);
          const anchors = await Promise.all([[x, y], [x + 60, y], [x, y + 60]].map(([px, py]) => probe(page, px, py)));
          expect(await page.evaluate(a => window.__atrvisuRuntimeViewport!.startRenderFrameProbe(a), anchors.map(a => a.reference))).toBe(true);
          await page.mouse.down({ button: "middle" }); await frames(page);
          if (speed === "normal") await page.mouse.move(x + 120, y, { steps: 12 });
          else for (let step = 1; step <= 48; step++) {
            await page.mouse.move(x + 120 * step / 48, y);
            // Pace real input by display frames, not an arbitrary sleep. The
            // observer records ALL renders, including intermediate input lag.
            await page.evaluate(() => new Promise<void>(r => requestAnimationFrame(() => r())));
          }
          await frames(page); await page.mouse.up({ button: "middle" }); await frames(page);
          const samples = await page.evaluate(() => window.__atrvisuRuntimeViewport!.readRenderFrameProbe(true));
          const analysis = analyzeRenderFrames(samples, anchors, x, y);
          expect(analysis.frameCount).toBeGreaterThan(speed === "slow" ? 40 : 4);
          expect(analysis.residual).toBeLessThanOrEqual(1);
          expect(analysis.reversal).toBeLessThanOrEqual(0.01);
          expect(analysis.wobble).toBeLessThanOrEqual(1);
          expect(analysis.jump).toBeLessThanOrEqual(1);
          expect(analysis.stalls).toBe(0);
          const first = samples[0];
          for (const f of samples) {
            expect([f.alpha, f.beta, f.radius, f.fov, f.mode, f.ortho]).toEqual([first.alpha, first.beta, first.radius, first.fov, first.mode, first.ortho]);
            expect(f.canvas).toEqual(first.canvas); expect(f.inertia).toEqual([0, 0, 0, 0, 0]);
            expect(f.viewMatrix.every(Number.isFinite)).toBe(true);
          }
          const after = await snapshot(page);
          expect(after.invariants).toEqual(before.invariants); expect(after.worldGeometry).toEqual(before.worldGeometry);
          expect(after.viewport.visualPresentation).toEqual(before.viewport.visualPresentation);
          expect(await handle!.evaluate(el => el === document.querySelector('[aria-label="AtrVisu 3D workspace"]'))).toBe(true);
          paths.push({ speed, anchors, origin: { x, y }, before, after, samples, analysis });
        }
        expect(errors).toEqual([]);
        await writeEvidence(`frames-${width}-dpr${dpr}-${state}.json`, { exactHeadSha, state, width, dpr, paths, errors });
      });
    }
  });
  const states = ["default", "wheel", "oblique", "shallow", "fit", "z+", "y-", "y+", "x-", "x+", "z-", "x+-z+", "x+-y+-z+"];
  for (const width of [1440, 640]) for (const state of states) {
    test(`P1-PAN-GRID real MMB ${state} at ${width}px`, async ({ page }) => {
      test.setTimeout(120_000);
      const errors: string[] = [];
      page.on("console", message => { if (message.type() === "error" || /Maximum update depth|GL_INVALID_VALUE|Uncaught|removeChild/.test(message.text())) errors.push(message.text()); });
      page.on("pageerror", error => errors.push(error.message));
      await page.setViewportSize({ width, height: width === 1440 ? 900 : 800 });
      await helpers.openCleanApp(page); await helpers.expectExactHeadServer(page);
      await expect.poll(async () => Boolean((await snapshot(page)).camera)).toBe(true);
      // Empty context proves Pan has no floor/scene hit prerequisite. Mixed
      // context retains real Group selection, Machines and Civil geometry.
      const context = state === "default" || state === "y-" ? "empty" : "mixed-machine-civil-group";
      let selectedGroup: Locator | null = null;
      if (context !== "empty") {
        if (await page.getByTestId("primary-dock").getAttribute("data-collapsed") === "true") {
          await page.getByRole("button", { name: "Open Library", exact: true }).click();
        }
        const assembly = await helpers.createTwoMachineAssembly(page, "Pan Assembly");
        selectedGroup = assembly.group;
        await helpers.addBuildPrimitive(page, "Beam", "Structure");
        await helpers.openPrimaryDockPanel(page, "panel.groups");
        await assembly.group.locator(".assembly-group-button").click();
      }
      await closeDocks(page); await frames(page);
      const entryDomain = (await snapshot(page)).invariants;
      await enterState(page, state, helpers);
      const enteredDomain = (await snapshot(page)).invariants;
      expect(enteredDomain.machineTransforms).toEqual(entryDomain.machineTransforms);
      expect(enteredDomain.civilTransforms).toEqual(entryDomain.civilTransforms);
      expect(enteredDomain.undoDepth).toBe(entryDomain.undoDepth);
      if (selectedGroup) {
        await page.getByTestId("primary-dock-collapse-toggle").click();
        const tab = page.getByTestId("primary-dock-tab-panel.groups");
        if (await tab.getAttribute("aria-pressed") !== "true") await helpers.openPrimaryDockPanel(page, "panel.groups");
        await selectedGroup.locator(".assembly-group-button").click();
        await closeDocks(page); await frames(page);
      }
      const restoreCamera = await saveCamera(page, helpers);
      const restore = async () => {
        await restoreCamera();
        // Existing Viewpoint restore projects legacy selected Machine IDs.
        // Establish the real Group selection again before each measured Pan;
        // never confuse that independent restore behavior with gesture effects.
        if (selectedGroup) {
          await page.getByTestId("primary-dock-collapse-toggle").click();
          const tab = page.getByTestId("primary-dock-tab-panel.groups");
          if (await tab.getAttribute("aria-pressed") !== "true") await helpers.openPrimaryDockPanel(page, "panel.groups");
          await selectedGroup.locator(".assembly-group-button").click();
          await closeDocks(page); await frames(page);
        }
      };
      await restore();
      const baseline = await snapshot(page);
      const canvas = page.getByLabel("AtrVisu 3D workspace");
      const handle = await canvas.elementHandle();
      const box = (await canvas.boundingBox())!;
      const x = box.x + box.width / 2, y = box.y + box.height / 2;
      const start = await probe(page, x, y);
      const trajectories: unknown[] = [];
      const endpoints: Record<string, NavigationProjectionProbe["projected"]> = {};
      const paths = [
        { name: "H+120-1", dx: 120, dy: 0, steps: 1 }, { name: "H+120-8", dx: 120, dy: 0, steps: 8 },
        { name: "H+120-24", dx: 120, dy: 0, steps: 24 }, { name: "H-120", dx: -120, dy: 0, steps: 8 },
        { name: "V+120", dx: 0, dy: 120, steps: 8 }, { name: "V-120", dx: 0, dy: -120, steps: 8 },
        { name: "diagonal", dx: 120, dy: 80, steps: 8 }, { name: "slow240", dx: 240, dy: 0, steps: 24 }
      ];
      let worstResidual = 0, worstReverseResidual = 0;
      for (const path of paths) {
        await restore();
        const before = await snapshot(page);
        await page.mouse.move(x, y); await page.mouse.down({ button: "middle" });
        const samples: unknown[] = [];
        for (let step = 1; step <= path.steps; step++) {
          const dx = path.dx * step / path.steps, dy = path.dy * step / path.steps;
          await page.mouse.move(x + dx, y + dy); await frames(page);
          const observed = await probe(page, x, y, start.reference);
          const residual = Math.hypot(observed.projected.x - start.projected.x - dx, observed.projected.y - start.projected.y - dy);
          worstResidual = Math.max(worstResidual, residual);
          expect(residual, `${state}/${width}/${path.name} step ${step}`).toBeLessThanOrEqual(1);
          expect(observed.placementSettings).toEqual(start.placementSettings);
          const current = await snapshot(page);
          expect(cameraInvariant(current.camera)).toEqual(cameraInvariant(before.camera));
          expect(current.invariants).toEqual(baseline.invariants);
          expect(current.worldGeometry).toEqual(baseline.worldGeometry);
          expect(current.viewport.sceneLifecycleGeneration).toBe(baseline.viewport.sceneLifecycleGeneration);
          expect(current.viewport.visualPresentation).toEqual(baseline.viewport.visualPresentation);
          for (const axis of ["X", "Y", "Z"] as const) {
            expect(current.camera[`position${axis}`] - before.camera[`position${axis}`])
              .toBeCloseTo(current.camera[`target${axis}`] - before.camera[`target${axis}`], 5);
          }
          samples.push({ pointer: { x: x + dx, y: y + dy }, ...observed, residual, ...current });
        }
        endpoints[path.name] = (await probe(page, x, y, start.reference)).projected;
        for (let step = path.steps - 1; step >= 0; step--) {
          await page.mouse.move(x + path.dx * step / path.steps, y + path.dy * step / path.steps); await frames(page);
          const reverse = await probe(page, x, y, start.reference);
          const residual = Math.hypot(reverse.projected.x - start.projected.x - path.dx * step / path.steps, reverse.projected.y - start.projected.y - path.dy * step / path.steps);
          expect(residual).toBeLessThanOrEqual(1);
          expect(reverse.placementSettings).toEqual(start.placementSettings);
          worstReverseResidual = Math.max(worstReverseResidual, residual);
          samples.push({ reverse: true, step, ...reverse, residual });
        }
        await page.mouse.up({ button: "middle" }); await frames(page);
        expect(await handle!.evaluate(element => element === document.querySelector('[aria-label="AtrVisu 3D workspace"]'))).toBe(true);
        expect((await snapshot(page)).invariants).toEqual(baseline.invariants);
        trajectories.push({ path, before, samples, after: await snapshot(page) });
      }
      const equivalence = Math.max(...["H+120-8", "H+120-24"].map(key => Math.hypot(endpoints[key].x - endpoints["H+120-1"].x, endpoints[key].y - endpoints["H+120-1"].y)));
      expect(equivalence).toBeLessThanOrEqual(1); expect(errors).toEqual([]);
      await writeEvidence(`pan-${width}-${state}.json`, { exactHeadSha, state, context, width, height: page.viewportSize()!.height, dpr: await page.evaluate(() => devicePixelRatio),
        baseline, canvas: box, gestureReference: start, trajectories, worstResidual, worstReverseResidual, equivalence, errors });
    });
  }

  for (const dpr of [1, 1.25, 1.5, 2]) test.describe(`rigid-grid DPR ${dpr}`, () => {
    test.use({ deviceScaleFactor: dpr });
    for (const theme of ["light", "dark"] as const) for (const state of (dpr === 1
      ? ["z+", "default", "oblique", "shallow", "wheel", "x+-y+-z+", "fit"] : ["shallow"])) {
    test(`P1-PAN-GRID temporal grid ${theme} ${state} DPR${dpr}`, async ({ page }) => {
      test.setTimeout(120_000);
      const errors: string[] = [];
      page.on("console", message => { if (message.type() === "error" || /Maximum update depth|GL_INVALID_VALUE|Uncaught|removeChild/.test(message.text())) errors.push(message.text()); });
      page.on("pageerror", error => errors.push(error.message));
      await page.setViewportSize({ width: 1440, height: 900 });
      await helpers.openCleanApp(page); await helpers.expectExactHeadServer(page);
      await expect.poll(async () => Boolean((await snapshot(page)).camera)).toBe(true);
      if (await page.getByTestId("primary-dock").getAttribute("data-collapsed") === "true") {
        await page.getByRole("button", { name: "Open Library", exact: true }).click();
      }
      await helpers.createTwoMachineAssembly(page, "Grid Evidence Assembly");
      await helpers.addBuildPrimitive(page, "Beam", "Structure");
      await page.keyboard.press("Escape"); await frames(page);
      expect((await snapshot(page)).invariants.selectionIds).toEqual([]);
      const themeControl = await helpers.openPreferenceBranch(page, "theme");
      await themeControl.surface.getByRole("radio", { name: theme === "light" ? "Light" : "Dark", exact: true }).check();
      await page.keyboard.press("Escape"); await page.keyboard.press("Escape");
      await closeDocks(page); await enterState(page, state, helpers);
      const restore = await saveCamera(page, helpers);
      const baseline = await snapshot(page);
      const canvas = page.getByLabel("AtrVisu 3D workspace");
      const handle = await canvas.elementHandle(); const rect = (await canvas.boundingBox())!;
      const x = rect.x + rect.width / 2, y = rect.y + rect.height / 2;
      const captures: unknown[] = [];
      const trajectories: unknown[] = [];
      for (const operation of ["pan-normal", "pan-slow", "orbit", "zoom"] as const) {
        await restore(); await settle(page);
        const orbitStart = operation === "orbit" ? await page.evaluate(({ rect }) => {
          const bounds = window.__atrvisuRuntimeViewport!.getNavigationGeometry().included.map(item => ({
            minX: Math.min(...item.projected.map(p => p.x)), maxX: Math.max(...item.projected.map(p => p.x)),
            minY: Math.min(...item.projected.map(p => p.y)), maxY: Math.max(...item.projected.map(p => p.y))
          }));
          return [0.04, 0.12, 0.22, 0.94].map(y => ({ x: rect.x + rect.width / 2, y: rect.y + rect.height * y }))
            .find(p => bounds.every(b => p.x < b.minX - 2 || p.x > b.maxX + 2 || p.y < b.minY - 2 || p.y > b.maxY + 2));
        }, { rect }) : { x, y };
        expect(orbitStart).toBeTruthy();
        const inputX = orbitStart!.x, inputY = orbitStart!.y;
        await page.mouse.move(inputX, inputY);
        expect(await page.evaluate(() => window.__atrvisuRuntimeViewport!.startRenderFrameProbe([
          { x: 0, y: -0.001, z: 0 }, { x: 5, y: -0.001, z: 0 }, { x: 0, y: -0.001, z: 5 }
        ]))).toBe(true);
        if (operation !== "zoom") await page.mouse.down({ button: operation.startsWith("pan") ? "middle" : "left" });
        const steps = 12;
        for (let step = 0; step <= steps; step++) {
          if (step > 0) {
            if (operation === "zoom") await page.mouse.wheel(0, -320 / steps);
            else await page.mouse.move(inputX + (operation === "pan-slow" ? 60 : 200) * step / steps,
              inputY + (operation === "orbit" ? 60 : operation === "pan-slow" ? 24 : 80) * step / steps);
            await page.evaluate(() => new Promise<void>(r => requestAnimationFrame(() => r())));
          }
          const current = await snapshot(page);
          expect(current.invariants).toEqual(baseline.invariants);
          expect(current.worldGeometry).toEqual(baseline.worldGeometry);
          expect(current.viewport.sceneLifecycleGeneration).toBe(baseline.viewport.sceneLifecycleGeneration);
          expect(current.viewport.visualPresentation).toEqual(baseline.viewport.visualPresentation);
          expect(await handle!.evaluate(element => element === document.querySelector('[aria-label="AtrVisu 3D workspace"]'))).toBe(true);
          {
            const filename = `grid-dpr${dpr}-${theme}-${state}-${operation}-${String(step).padStart(2, "0")}.png`;
            const renderBoundary = () => page.evaluate(() => {
              const samples = window.__atrvisuRuntimeViewport!.readRenderFrameProbe();
              const last = samples[samples.length - 1];
              return last ? { frame: last.frame, timeMs: last.timeMs } : null;
            });
            const captureStart = await renderBoundary();
            if (capture) { await mkdir(directory, { recursive: true }); await page.screenshot({ path: join(directory, filename) }); }
            const captureEnd = await renderBoundary();
            captures.push({ filename, progress: step / steps, operation, ...current, captureWindow: { start: captureStart, end: captureEnd },
              css: rect, dpr: await page.evaluate(() => devicePixelRatio), errors: [...errors] });
          }
        }
        if (operation !== "zoom") await page.mouse.up({ button: operation.startsWith("pan") ? "middle" : "left" });
        await settle(page);
        const renderFrames = await page.evaluate(() => window.__atrvisuRuntimeViewport!.readRenderFrameProbe(true));
        expect(renderFrames.length).toBeGreaterThan(12);
        trajectories.push({ operation, renderFrames });
      }
      expect(errors).toEqual([]);
      await writeEvidence(`grid-dpr${dpr}-${theme}-${state}.json`, { exactHeadSha, theme, state, dpr, baseline, captures, trajectories, errors });
    });
  }
  });
}
