import { expect, type Dialog, type Page, test } from "@playwright/test";

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

  await page.goto("/?e2eDiagnostics=1");
  await expect(page.getByTestId("app-root")).toBeVisible();
  await expect(page.getByTestId("right-panel")).toBeVisible();
  await expect(page.getByTestId("machine-library-panel")).toBeVisible();
};

const expectNoModalBackdrop = async (page: Page) => {
  await expect(page.locator(".manager-backdrop")).toHaveCount(0);
};

type RuntimePanelOperation = "open" | "close" | "toggle";

const invokeRuntimePanel = async (
  page: Page,
  operation: RuntimePanelOperation,
  panelId: string
) => page.evaluate(({ operationName, id }) => {
  const bridge = window.__atrvisuRuntimePanels;
  if (!bridge) {
    throw new Error("AtrVisu runtime panel E2E bridge is unavailable.");
  }
  return bridge[operationName](id);
}, { operationName: operation, id: panelId });

const getRuntimePanel = async (page: Page, panelId: string) => page.evaluate((id) => {
  const bridge = window.__atrvisuRuntimePanels;
  if (!bridge) {
    throw new Error("AtrVisu runtime panel E2E bridge is unavailable.");
  }
  return bridge.get(id);
}, panelId);

const getRuntimeViewportSnapshot = async (page: Page) => page.evaluate(() => {
  const bridge = window.__atrvisuRuntimeViewport;
  if (!bridge) {
    throw new Error("AtrVisu runtime viewport E2E bridge is unavailable.");
  }
  return {
    viewport: bridge.get("viewport.main"),
    camera: bridge.getCameraSnapshot("viewport.main"),
    invariants: bridge.getInvariants()
  };
});

const waitForRuntimeViewport = async (page: Page) => {
  await expect.poll(async () => {
    const snapshot = await getRuntimeViewportSnapshot(page);
    return Boolean(
      snapshot.viewport?.bound
      && snapshot.viewport.available
      && snapshot.viewport.cssWidth > 0
      && snapshot.viewport.cssHeight > 0
      && snapshot.viewport.canvasWidth > 0
      && snapshot.viewport.canvasHeight > 0
      && snapshot.camera
    );
  }).toBe(true);
  return getRuntimeViewportSnapshot(page);
};

const selectExistingCustomLibraryItem = async (page: Page) => {
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
};

type PlanPosition = { xMm: number; yMm: number };
type ScreenPoint = { x: number; y: number };

const readCanvasRecord = async <T>(page: Page, attribute: string) => {
  const raw = await page.getByLabel("AtrVisu 3D workspace").getAttribute(attribute);
  return JSON.parse(raw ?? "{}") as Record<string, T>;
};

const waitForMachineDiagnostics = async (page: Page, count: number) => {
  await expect.poll(async () => Object.keys(
    await readCanvasRecord<PlanPosition>(page, "data-machine-plan-positions")
  ).length).toBeGreaterThanOrEqual(count);
};

const getMachineIds = async (page: Page) => Object.keys(
  await readCanvasRecord<PlanPosition>(page, "data-machine-plan-positions")
);

const getMachineScreenPoint = async (page: Page, machineId: string) => {
  await expect.poll(async () => Boolean(
    (await readCanvasRecord<ScreenPoint>(page, "data-machine-screen-points"))[machineId]
  )).toBe(true);
  return (await readCanvasRecord<ScreenPoint>(page, "data-machine-screen-points"))[machineId];
};

const clickSceneMachine = async (page: Page, machineId: string) => {
  const canvas = page.getByLabel("AtrVisu 3D workspace");
  const box = await canvas.boundingBox();
  const point = await getMachineScreenPoint(page, machineId);
  if (!box || !point) {
    throw new Error(`Scene point is unavailable for machine "${machineId}".`);
  }
  await page.mouse.click(box.x + point.x, box.y + point.y);
};

const dragSceneMachine = async (page: Page, machineId: string, deltaX: number, deltaY: number) => {
  const canvas = page.getByLabel("AtrVisu 3D workspace");
  const box = await canvas.boundingBox();
  const point = await getMachineScreenPoint(page, machineId);
  if (!box || !point) {
    throw new Error(`Scene point is unavailable for machine "${machineId}".`);
  }
  const startX = box.x + point.x;
  const startY = box.y + point.y;
  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.mouse.move(startX + deltaX, startY + deltaY, { steps: 8 });
  await page.mouse.up();
};

const createTwoMachineAssembly = async (
  page: Page,
  name: string,
  afterFirstMachineAdded?: () => Promise<void>
) => {
  const machineCard = page.locator(".machine-card").first();
  await machineCard.click();
  await waitForMachineDiagnostics(page, 1);
  await afterFirstMachineAdded?.();

  const assemblySection = page.getByRole("button", { name: /Assembly Tree/i });
  if ((await assemblySection.getAttribute("aria-expanded")) !== "true") {
    await assemblySection.click();
  }
  page.once("dialog", async (dialog) => dialog.accept(name));
  await page.getByTestId("create-group-from-selection").click();
  const group = page.locator(".assembly-group-row").filter({ hasText: name });
  await expect(group).toContainText("1 item");

  await machineCard.click();
  await waitForMachineDiagnostics(page, 2);
  await group.getByRole("button", { name: "Add Selected" }).click();
  await expect(group).toContainText("2 items");
  await group.locator(".assembly-group-button").click();
  const canvas = page.getByLabel("AtrVisu 3D workspace");
  await expect(canvas).toHaveAttribute("data-selected-assembly-id", /.+/);

  return {
    canvas,
    group,
    groupId: await canvas.getAttribute("data-selected-assembly-id"),
    machineIds: await getMachineIds(page)
  };
};

test("heavy scene diagnostics require explicit E2E opt in", async ({ page }) => {
  const errors = collectPageErrors(page);
  await page.addInitScript(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });

  await page.goto("/");
  await expect(page.getByTestId("app-root")).toBeVisible();
  const canvas = page.getByLabel("AtrVisu 3D workspace");
  await expect(canvas).toHaveAttribute("data-scene-lifecycle-generation", /\d+/);
  await expect(canvas).not.toHaveAttribute("data-machine-screen-points");
  await expect(canvas).not.toHaveAttribute("data-machine-plan-positions");
  await expect(canvas).not.toHaveAttribute("data-civil-plan-positions");
  expect(await page.evaluate(() => window.__atrvisuRuntimePanels === undefined)).toBe(true);
  expect(await page.evaluate(() => window.__atrvisuRuntimeViewport === undefined)).toBe(true);

  await page.goto("/?e2eDiagnostics=1");
  await expect(page.getByTestId("app-root")).toBeVisible();
  await expect(canvas).toHaveAttribute("data-machine-screen-points", "{}");
  await expect(canvas).toHaveAttribute("data-machine-plan-positions", "{}");
  await expect(canvas).toHaveAttribute("data-civil-plan-positions", "{}");
  expect(await page.evaluate(() => Boolean(window.__atrvisuRuntimePanels))).toBe(true);
  expect(await page.evaluate(() => Boolean(window.__atrvisuRuntimeViewport))).toBe(true);
  expect(errors).toEqual([]);
});

test("app loads and core panels have no red console errors", async ({ page }) => {
  const errors = collectPageErrors(page);
  await openCleanApp(page);
  expect(await getRuntimePanel(page, "panel.inspector")).toMatchObject({
    bound: true,
    available: true,
    context: "none"
  });
  expect(await getRuntimePanel(page, "panel.connectionPointSnap")).toMatchObject({
    bound: true,
    available: false,
    reason: "Select exactly two explicit machines."
  });

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

test("app shell zone anchors are rendered without red console errors", async ({ page }) => {
  const errors = collectPageErrors(page);
  await openCleanApp(page);

  for (const zone of ["app-root", "machine-properties", "top-toolbar"]) {
    await expect(page.locator(`[data-app-shell-zone="${zone}"]`)).toBeVisible();
  }

  expect(errors).toEqual([]);
});

test("runtime panel registry opens and closes the actual Machine Library section", async ({ page }) => {
  const errors = collectPageErrors(page);
  await openCleanApp(page);
  const canvas = page.getByLabel("AtrVisu 3D workspace");
  const lifecycleGeneration = await canvas.getAttribute("data-scene-lifecycle-generation");
  const resizeGeneration = (await waitForRuntimeViewport(page)).viewport?.resizeGeneration;
  const machineLibraryHeader = page.getByRole("button", { name: /Machine Library/i }).first();

  await machineLibraryHeader.click();
  await expect(page.getByTestId("machine-library-panel")).toHaveCount(0);
  await expect.poll(async () => (await getRuntimePanel(page, "panel.machineLibrary"))?.open).toBe(false);
  await expect.poll(() => page.evaluate(() =>
    window.localStorage.getItem("atrvisu.panelSection.machineLibrary.v1")
  )).toBe("collapsed");

  expect(await invokeRuntimePanel(page, "open", "panel.machineLibrary")).toMatchObject({
    handled: true,
    status: "executed"
  });
  await expect(page.getByTestId("machine-library-panel")).toBeVisible();
  await expect.poll(async () => (await getRuntimePanel(page, "panel.machineLibrary"))?.open).toBe(true);
  await expect.poll(() => page.evaluate(() =>
    window.localStorage.getItem("atrvisu.panelSection.machineLibrary.v1")
  )).toBe("expanded");

  expect(await invokeRuntimePanel(page, "close", "panel.machineLibrary")).toMatchObject({
    handled: true,
    status: "executed"
  });
  await expect(page.getByTestId("machine-library-panel")).toHaveCount(0);
  await expect(canvas).toHaveAttribute("data-scene-lifecycle-generation", lifecycleGeneration ?? "");
  await expect.poll(async () =>
    (await getRuntimeViewportSnapshot(page)).viewport?.resizeGeneration
  ).toBe(resizeGeneration);
  expect(errors).toEqual([]);
});

test("runtime right-panel collapse and reopen preserve viewport invariants", async ({ page }) => {
  const errors = collectPageErrors(page);
  await openCleanApp(page);
  const canvas = page.getByLabel("AtrVisu 3D workspace");
  await page.locator(".machine-card").first().click();
  await waitForMachineDiagnostics(page, 1);
  const before = await waitForRuntimeViewport(page);
  const rightPanel = page.getByTestId("right-panel");
  const widthBefore = await rightPanel.evaluate((element) => element.getBoundingClientRect().width);

  expect(await invokeRuntimePanel(page, "open", "panel.layers")).toMatchObject({ handled: true });
  await expect(page.getByTestId("layers-panel")).toBeVisible();

  expect(await invokeRuntimePanel(page, "close", "panel.rightPanelShell")).toMatchObject({ handled: true });
  await expect(rightPanel).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Open right panel" })).toBeVisible();
  await expect.poll(async () =>
    (await getRuntimeViewportSnapshot(page)).viewport?.cssWidth ?? 0
  ).toBeGreaterThan(before.viewport?.cssWidth ?? Number.MAX_SAFE_INTEGER);
  const collapsed = await getRuntimeViewportSnapshot(page);
  expect(collapsed.viewport?.resizeGeneration).toBe((before.viewport?.resizeGeneration ?? 0) + 1);
  expect(collapsed.viewport?.sceneLifecycleGeneration).toBe(before.viewport?.sceneLifecycleGeneration);
  expect(collapsed.camera).toEqual(before.camera);
  expect(collapsed.invariants).toEqual(before.invariants);

  expect(await invokeRuntimePanel(page, "open", "panel.rightPanelShell")).toMatchObject({ handled: true });
  await expect(rightPanel).toBeVisible();
  await expect(page.getByTestId("layers-panel")).toBeVisible();
  await expect.poll(async () => rightPanel.evaluate((element) => element.getBoundingClientRect().width)).toBe(widthBefore);
  await expect.poll(async () =>
    (await getRuntimeViewportSnapshot(page)).viewport?.cssWidth
  ).toBe(before.viewport?.cssWidth);
  const reopened = await getRuntimeViewportSnapshot(page);
  expect(reopened.viewport?.resizeGeneration).toBe((collapsed.viewport?.resizeGeneration ?? 0) + 1);
  expect(reopened.viewport?.sceneLifecycleGeneration).toBe(before.viewport?.sceneLifecycleGeneration);
  expect(reopened.camera).toEqual(before.camera);
  expect(reopened.invariants).toEqual(before.invariants);
  await expect(canvas).toHaveAttribute(
    "data-scene-lifecycle-generation",
    String(before.viewport?.sceneLifecycleGeneration)
  );
  expect(errors).toEqual([]);
});

test("runtime panel width drag resizes only the viewport", async ({ page }) => {
  const errors = collectPageErrors(page);
  await openCleanApp(page);
  await page.locator(".machine-card").first().click();
  await waitForMachineDiagnostics(page, 1);

  const before = await waitForRuntimeViewport(page);
  const rightPanel = page.getByTestId("right-panel");
  const panelWidthBefore = await rightPanel.evaluate((element) => element.getBoundingClientRect().width);
  const resizeHandle = page.getByRole("button", { name: "Resize right panel" });
  const handleBounds = await resizeHandle.boundingBox();
  if (!handleBounds) {
    throw new Error("Right-panel resize handle bounds are unavailable.");
  }

  await page.mouse.move(handleBounds.x + handleBounds.width / 2, handleBounds.y + 40);
  await page.mouse.down();
  await page.mouse.move(handleBounds.x - 64, handleBounds.y + 40, { steps: 6 });
  await page.mouse.up();

  await expect.poll(async () =>
    rightPanel.evaluate((element) => element.getBoundingClientRect().width)
  ).toBeGreaterThan(panelWidthBefore);
  await expect.poll(async () =>
    (await getRuntimeViewportSnapshot(page)).viewport?.cssWidth ?? Number.MAX_SAFE_INTEGER
  ).toBeLessThan(before.viewport?.cssWidth ?? 0);
  const after = await getRuntimeViewportSnapshot(page);
  expect(after.viewport?.resizeGeneration).toBeGreaterThan(before.viewport?.resizeGeneration ?? 0);
  expect(after.viewport?.sceneLifecycleGeneration).toBe(before.viewport?.sceneLifecycleGeneration);
  expect(after.camera).toEqual(before.camera);
  expect(after.invariants).toEqual(before.invariants);
  expect(errors).toEqual([]);
});

test("browser resize reconciles viewport backing size without scene reconstruction", async ({ page }) => {
  const errors = collectPageErrors(page);
  await openCleanApp(page);
  await page.locator(".machine-card").first().click();
  await waitForMachineDiagnostics(page, 1);
  const before = await waitForRuntimeViewport(page);

  await page.setViewportSize({ width: 1180, height: 760 });

  await expect.poll(async () => {
    const viewport = (await getRuntimeViewportSnapshot(page)).viewport;
    return viewport?.cssHeight;
  }).toBe(760);
  await expect.poll(async () => {
    const viewport = (await getRuntimeViewportSnapshot(page)).viewport;
    return Boolean(
      viewport
      && viewport.canvasWidth > 0
      && viewport.canvasHeight > 0
      && viewport.resizeGeneration > (before.viewport?.resizeGeneration ?? 0)
    );
  }).toBe(true);

  const after = await getRuntimeViewportSnapshot(page);
  expect(after.viewport?.sceneLifecycleGeneration).toBe(before.viewport?.sceneLifecycleGeneration);
  expect(after.viewport?.canvasWidth).not.toBe(before.viewport?.canvasWidth);
  expect(after.camera).toEqual(before.camera);
  expect(after.invariants).toEqual(before.invariants);
  expect(errors).toEqual([]);
});

test("runtime panel registry opens and closes only the requested manager modal", async ({ page }) => {
  const errors = collectPageErrors(page);
  await openCleanApp(page);
  const before = await waitForRuntimeViewport(page);

  expect(await invokeRuntimePanel(page, "open", "panel.libraryManager")).toMatchObject({ handled: true });
  await expect(page.getByTestId("library-manager-modal")).toBeVisible();
  await expect(page.getByTestId("taxonomy-manager-modal")).toHaveCount(0);
  await expect(page.getByTestId("project-manager-modal")).toHaveCount(0);
  await expect(page.getByTestId("performance-benchmark-modal")).toHaveCount(0);

  expect(await invokeRuntimePanel(page, "close", "panel.libraryManager")).toMatchObject({ handled: true });
  await expect(page.getByTestId("library-manager-modal")).toHaveCount(0);
  await expectNoModalBackdrop(page);
  expect(await getRuntimeViewportSnapshot(page)).toEqual(before);
  expect(errors).toEqual([]);
});

test("dirty Library Manager blocks parent panel collapse until discard is accepted", async ({ page }) => {
  const errors = collectPageErrors(page);
  await openCleanApp(page);

  expect(await invokeRuntimePanel(page, "open", "panel.libraryManager")).toMatchObject({ handled: true });
  await expect(page.getByTestId("library-manager-ready")).toBeVisible();
  await selectExistingCustomLibraryItem(page);

  const editor = page.getByTestId("library-manager-selected-item-editor");
  const nameInput = editor.getByRole("textbox", { name: "Name", exact: true });
  const dirtyValue = (await nameInput.inputValue()) + " - unsaved";
  await nameInput.fill(dirtyValue);
  const beforeCancelledCollapse = await waitForRuntimeViewport(page);

  page.once("dialog", async (dialog) => dialog.dismiss());
  expect(await invokeRuntimePanel(page, "close", "panel.machineLibrary")).toMatchObject({
    handled: false,
    status: "cancelled"
  });
  await expect(page.getByTestId("library-manager-modal")).toBeVisible();
  await expect(page.getByRole("button", { name: /Machine Library/i }).first()).toHaveAttribute("aria-expanded", "true");
  await expect(nameInput).toHaveValue(dirtyValue);
  expect(await getRuntimePanel(page, "panel.libraryManager")).toMatchObject({ open: true, visible: true });

  page.once("dialog", async (dialog) => dialog.dismiss());
  expect(await invokeRuntimePanel(page, "close", "panel.rightPanelShell")).toMatchObject({
    handled: false,
    status: "cancelled"
  });
  await expect(page.getByTestId("right-panel")).toBeVisible();
  await expect(page.getByTestId("library-manager-modal")).toBeVisible();
  await expect(nameInput).toHaveValue(dirtyValue);
  expect(await getRuntimeViewportSnapshot(page)).toEqual(beforeCancelledCollapse);

  page.once("dialog", async (dialog) => dialog.accept());
  expect(await invokeRuntimePanel(page, "close", "panel.rightPanelShell")).toMatchObject({
    handled: true,
    status: "executed"
  });
  await expect(page.getByTestId("library-manager-modal")).toHaveCount(0);
  await expect(page.getByTestId("right-panel")).toHaveCount(0);
  await expect.poll(async () => (await getRuntimePanel(page, "panel.libraryManager"))?.open).toBe(false);
  await expect.poll(async () =>
    (await getRuntimeViewportSnapshot(page)).viewport?.resizeGeneration ?? 0
  ).toBeGreaterThan(beforeCancelledCollapse.viewport?.resizeGeneration ?? 0);
  const afterAcceptedCollapse = await getRuntimeViewportSnapshot(page);
  expect(afterAcceptedCollapse.viewport?.resizeGeneration)
    .toBe((beforeCancelledCollapse.viewport?.resizeGeneration ?? 0) + 1);
  expect(afterAcceptedCollapse.viewport?.sceneLifecycleGeneration)
    .toBe(beforeCancelledCollapse.viewport?.sceneLifecycleGeneration);
  expect(afterAcceptedCollapse.camera).toEqual(beforeCancelledCollapse.camera);
  expect(afterAcceptedCollapse.invariants).toEqual(beforeCancelledCollapse.invariants);
  expect(errors).toEqual([]);
});

test("dirty Library Manager guards library navigation and discards only after acceptance", async ({ page }) => {
  const errors = collectPageErrors(page);
  await openCleanApp(page);

  expect(await invokeRuntimePanel(page, "open", "panel.libraryManager")).toMatchObject({ handled: true });
  await expect(page.getByTestId("library-manager-ready")).toBeVisible();
  await selectExistingCustomLibraryItem(page);

  const modal = page.getByTestId("library-manager-modal");
  const customLibraryButton = page.getByTestId("library-manager-custom-library-button");
  const standardLibraryButton = page.getByTestId("library-manager-atara-standard-library-button");
  const editor = page.getByTestId("library-manager-selected-item-editor");
  const nameInput = editor.getByRole("textbox", { name: "Name", exact: true });
  const persistedName = await nameInput.inputValue();
  const dirtyName = `${persistedName} - discarded navigation draft`;
  await nameInput.fill(dirtyName);

  page.once("dialog", async (dialog) => dialog.dismiss());
  await standardLibraryButton.click();
  await expect(customLibraryButton).toHaveClass(/is-selected/);
  await expect(standardLibraryButton).not.toHaveClass(/is-selected/);
  await expect(editor).toBeVisible();
  await expect(nameInput).toHaveValue(dirtyName);
  await expect(modal).toBeVisible();

  page.once("dialog", async (dialog) => dialog.accept());
  await standardLibraryButton.click();
  await expect(standardLibraryButton).toHaveClass(/is-selected/);
  await expect(customLibraryButton).not.toHaveClass(/is-selected/);
  await expect(modal.getByText("This library is read-only.").first()).toBeVisible();
  await expect(editor).toHaveCount(0);
  expect(await modal.locator("input").evaluateAll(
    (inputs, abandonedValue) => inputs.some((input) => (input as HTMLInputElement).value === abandonedValue),
    dirtyName
  )).toBe(false);

  let closeRequestedAnotherDiscard = false;
  const handleUnexpectedCloseDialog = async (dialog: Dialog) => {
    closeRequestedAnotherDiscard = true;
    await dialog.dismiss();
  };
  page.on("dialog", handleUnexpectedCloseDialog);
  await page.getByTestId("close-library-manager-header").click();
  await expect(modal).toHaveCount(0);
  page.off("dialog", handleUnexpectedCloseDialog);
  expect(closeRequestedAnotherDiscard).toBe(false);

  expect(await invokeRuntimePanel(page, "open", "panel.libraryManager")).toMatchObject({ handled: true });
  await expect(customLibraryButton).toHaveClass(/is-selected/);
  await selectExistingCustomLibraryItem(page);
  const reopenedNameInput = page
    .getByTestId("library-manager-selected-item-editor")
    .getByRole("textbox", { name: "Name", exact: true });
  await expect(reopenedNameInput).toHaveValue(persistedName);
  await expect(reopenedNameInput).not.toHaveValue(dirtyName);
  await page.getByTestId("close-library-manager-header").click();
  await expect(modal).toHaveCount(0);
  expect(errors).toEqual([]);
});

test("Connection Point Snap uses the authoritative exact-two-machine context", async ({ page }) => {
  const errors = collectPageErrors(page);
  await openCleanApp(page);

  const machineCard = page.locator(".machine-card").first();
  await machineCard.click();
  await machineCard.click();
  await machineCard.click();
  await waitForMachineDiagnostics(page, 3);
  const machineIds = await getMachineIds(page);

  const civilSection = page.getByRole("button", { name: /Building \/ Civil/i });
  if ((await civilSection.getAttribute("aria-expanded")) !== "true") {
    await civilSection.click();
  }
  await page.getByTestId("add-civil-column").click();

  await page.keyboard.down("Control");
  await clickSceneMachine(page, machineIds[0]);
  await clickSceneMachine(page, machineIds[1]);
  await page.keyboard.up("Control");
  await expect(page.getByTestId("connection-point-snap-panel")).toHaveCount(0);
  expect(await getRuntimePanel(page, "panel.connectionPointSnap")).toMatchObject({
    available: false,
    visible: false
  });

  await clickSceneMachine(page, machineIds[0]);
  await page.keyboard.down("Control");
  await clickSceneMachine(page, machineIds[1]);
  await page.keyboard.up("Control");
  await expect(page.getByTestId("connection-point-snap-panel")).toBeVisible();
  await expect.poll(async () => (await getRuntimePanel(page, "panel.connectionPointSnap"))?.available).toBe(true);
  expect(await getRuntimePanel(page, "panel.connectionPointSnap")).toMatchObject({ visible: true });

  await page.keyboard.down("Control");
  await clickSceneMachine(page, machineIds[2]);
  await page.keyboard.up("Control");
  await expect(page.getByTestId("connection-point-snap-panel")).toHaveCount(0);
  expect(await getRuntimePanel(page, "panel.connectionPointSnap")).toMatchObject({
    available: false,
    visible: false
  });
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
  await expect.poll(async () => (await getRuntimePanel(page, "panel.inspector"))?.context).toBe("machine");
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

test("rigid assembly projection renders without exposing member arrange actions", async ({ page }) => {
  const errors = collectPageErrors(page);
  await openCleanApp(page);

  const firstMachineCard = page.locator(".machine-card").first();
  await firstMachineCard.click();
  const assemblySection = page.getByRole("button", { name: /Assembly Tree/i });
  if ((await assemblySection.getAttribute("aria-expanded")) !== "true") {
    await assemblySection.click();
  }
  await expect(page.getByTestId("assembly-tree-panel")).toBeVisible();

  page.once("dialog", async (dialog) => {
    await dialog.accept("Alignment Smoke Group");
  });
  await page.getByTestId("create-group-from-selection").click();
  const group = page.locator(".assembly-group-row").filter({ hasText: "Alignment Smoke Group" });
  await expect(group).toBeVisible();
  await expect(group).toContainText("1 item");

  await firstMachineCard.click();
  await group.getByRole("button", { name: "Add Selected" }).click();
  await expect(group).toContainText("2 items");
  await group.locator(".assembly-group-button").click();
  await expect.poll(async () => (await getRuntimePanel(page, "panel.inspector"))?.context).toBe("assembly");

  await expect(page.getByTestId("create-group-from-selection")).toBeDisabled();
  await expect(group.getByRole("button", { name: "Add Selected" })).toBeDisabled();
  await expect(group.getByRole("button", { name: "Remove Selected" })).toBeDisabled();
  await expect(page.getByTestId("connection-point-snap-panel")).toHaveCount(0);
  expect(await getRuntimePanel(page, "panel.connectionPointSnap")).toMatchObject({ available: false });

  const multiSelectionSection = page.getByRole("button", { name: /Assembly Properties/i });
  await expect(multiSelectionSection).toBeVisible();
  if ((await multiSelectionSection.getAttribute("aria-expanded")) !== "true") {
    await multiSelectionSection.click();
  }
  const multiSelectionPanel = page.getByTestId("multi-selection-panel");
  await expect(multiSelectionPanel).toBeVisible();
  await expect(page.getByTestId("multi-selection-alignment-actions")).toBeVisible();
  await expect(page.getByTestId("pair-measurement-readout")).toBeVisible();
  await expect(page.getByTestId("pair-measurement-readout")).toContainText("Reference Point Distance");

  for (const label of ["Align Left", "Align Center X", "Align Right", "Align Top", "Align Center Y", "Align Bottom"]) {
    await expect(multiSelectionPanel.getByRole("button", { name: label })).toBeDisabled();
  }

  const distributeHorizontal = multiSelectionPanel.getByRole("button", { name: "Distribute Horizontal Center" });
  const distributeVertical = multiSelectionPanel.getByRole("button", { name: "Distribute Vertical Center" });
  const equalGapX = multiSelectionPanel.getByRole("button", { name: "Equal Gap X" });
  const equalGapY = multiSelectionPanel.getByRole("button", { name: "Equal Gap Y" });
  await expect(distributeHorizontal).toBeVisible();
  await expect(distributeVertical).toBeVisible();
  await expect(equalGapX).toBeVisible();
  await expect(equalGapY).toBeVisible();
  await expect(distributeHorizontal).toBeDisabled();
  await expect(distributeVertical).toBeDisabled();
  await expect(equalGapX).toBeDisabled();
  await expect(equalGapY).toBeDisabled();

  const duplicateSelected = multiSelectionPanel.getByRole("button", { name: "Duplicate Selected" });
  await expect(duplicateSelected).toBeVisible();
  await expect(duplicateSelected).toBeDisabled();
  await expect(multiSelectionPanel).toContainText("2 objects");
  await expect(page.getByTestId("pair-measurement-readout")).toBeVisible();
  await expect(page.getByTestId("selected-assembly-name")).toContainText("Alignment Smoke Group");

  expect(errors).toEqual([]);
});

test("locked member blocks atomic multi-selection movement without red console errors", async ({ page }) => {
  const errors = collectPageErrors(page);
  await openCleanApp(page);

  const layersSection = page.getByRole("button", { name: /Layers/i });
  if ((await layersSection.getAttribute("aria-expanded")) !== "true") {
    await layersSection.click();
  }
  page.once("dialog", async (dialog) => {
    await dialog.accept("Atomic Lock Layer");
  });
  await page.getByTestId("add-layer").click();
  const lockedLayerRow = page.locator(".layer-row").filter({ hasText: "Atomic Lock Layer" });
  await expect(lockedLayerRow).toBeVisible();

  const firstMachineCard = page.locator(".machine-card").first();
  await firstMachineCard.click();
  const propertiesSection = page.getByRole("button", { name: /Selected Object Properties/i });
  if ((await propertiesSection.getAttribute("aria-expanded")) !== "true") {
    await propertiesSection.click();
  }
  await page.getByLabel("Selected machine properties").getByLabel("Layer").selectOption({
    label: "Atomic Lock Layer"
  });

  const assemblySection = page.getByRole("button", { name: /Assembly Tree/i });
  if ((await assemblySection.getAttribute("aria-expanded")) !== "true") {
    await assemblySection.click();
  }
  page.once("dialog", async (dialog) => {
    await dialog.accept("Atomic Lock Group");
  });
  await page.getByTestId("create-group-from-selection").click();
  const group = page.locator(".assembly-group-row").filter({ hasText: "Atomic Lock Group" });
  await expect(group).toContainText("1 item");

  await firstMachineCard.click();
  await group.getByRole("button", { name: "Add Selected" }).click();
  await expect(group).toContainText("2 items");
  await lockedLayerRow.getByRole("button", { name: "Lock", exact: true }).click();
  await group.locator(".assembly-group-button").click();

  const multiSelectionPanel = page.getByTestId("multi-selection-panel");
  await expect(multiSelectionPanel).toContainText("2 objects");
  const bounds = multiSelectionPanel.getByLabel("Selection bounds");
  const beforeMovement = await bounds.textContent();
  expect(beforeMovement).not.toBeNull();

  await page.keyboard.press("ArrowRight");
  await expect(bounds).toHaveText(beforeMovement ?? "");
  await expect(multiSelectionPanel).toContainText("2 objects");
  expect(errors).toEqual([]);
});

test("scene lifecycle stays stable through selection and accepted pointer drag", async ({ page }) => {
  const errors = collectPageErrors(page);
  await openCleanApp(page);

  const canvas = page.getByLabel("AtrVisu 3D workspace");
  await expect(canvas).toHaveAttribute("data-scene-lifecycle-generation", /\d+/);
  const initialLifecycleGeneration = await canvas.getAttribute("data-scene-lifecycle-generation");
  expect(initialLifecycleGeneration).not.toBeNull();

  await page.locator(".machine-card").first().click();
  await expect(page.getByRole("button", { name: /Selected Object Properties/i })).toBeVisible();
  await expect(canvas).toHaveAttribute(
    "data-scene-lifecycle-generation",
    initialLifecycleGeneration ?? ""
  );

  const annotationsSection = page.getByRole("button", { name: /Annotations/i });
  if ((await annotationsSection.getAttribute("aria-expanded")) !== "true") {
    await annotationsSection.click();
  }
  await page.getByTestId("add-note-annotation").click();
  const planXInput = page.getByTestId("annotation-plan-x-input");
  await expect(planXInput).toBeVisible();
  const initialPlanX = await planXInput.inputValue();

  const canvasBox = await canvas.boundingBox();
  expect(canvasBox).not.toBeNull();
  if (!canvasBox) {
    throw new Error("Scene canvas bounds are unavailable.");
  }

  const startX = canvasBox.x + canvasBox.width / 2;
  const startY = canvasBox.y + canvasBox.height / 2 - 18;
  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.mouse.move(startX + 90, startY + 45, { steps: 8 });
  await page.mouse.up();

  await expect.poll(() => planXInput.inputValue()).not.toBe(initialPlanX);
  await expect(canvas).toHaveAttribute(
    "data-scene-lifecycle-generation",
    initialLifecycleGeneration ?? ""
  );
  expect(errors).toEqual([]);
});

test("scene member click selects and rigidly moves the complete assembly", async ({ page }) => {
  const errors = collectPageErrors(page);
  await openCleanApp(page);
  const { canvas, group, groupId, machineIds } = await createTwoMachineAssembly(page, "Rigid Move Assembly");
  expect(groupId).not.toBeNull();
  expect(machineIds).toHaveLength(2);

  const lifecycleGeneration = await canvas.getAttribute("data-scene-lifecycle-generation");
  const before = await readCanvasRecord<PlanPosition>(page, "data-machine-plan-positions");
  await page.keyboard.press("Escape");
  await clickSceneMachine(page, machineIds[0]);

  await expect(canvas).toHaveAttribute("data-selected-assembly-id", groupId ?? "");
  await expect(group).toHaveClass(/is-selected/);
  const propertiesSection = page.getByRole("button", { name: /Assembly Properties/i });
  if ((await propertiesSection.getAttribute("aria-expanded")) !== "true") {
    await propertiesSection.click();
  }
  await expect(page.getByTestId("selected-assembly-name")).toContainText("Rigid Move Assembly");
  await expect(page.getByTestId("multi-selection-panel")).toContainText("2 objects");

  await dragSceneMachine(page, machineIds[0], 90, 35);
  await expect(canvas).toHaveAttribute("data-last-machine-drag-preflight", "true");
  await expect(canvas).toHaveAttribute("data-last-machine-drag-member-count", "2");
  await expect(canvas).toHaveAttribute("data-last-machine-drag-applied", "true");
  await expect.poll(async () => {
    const current = await readCanvasRecord<PlanPosition>(page, "data-machine-plan-positions");
    return current[machineIds[0]]?.xMm !== before[machineIds[0]]?.xMm
      || current[machineIds[0]]?.yMm !== before[machineIds[0]]?.yMm;
  }).toBe(true);
  const moved = await readCanvasRecord<PlanPosition>(page, "data-machine-plan-positions");
  const firstDelta = {
    xMm: moved[machineIds[0]].xMm - before[machineIds[0]].xMm,
    yMm: moved[machineIds[0]].yMm - before[machineIds[0]].yMm
  };
  const secondDelta = {
    xMm: moved[machineIds[1]].xMm - before[machineIds[1]].xMm,
    yMm: moved[machineIds[1]].yMm - before[machineIds[1]].yMm
  };
  expect(secondDelta).toEqual(firstDelta);
  await expect(canvas).toHaveAttribute("data-scene-lifecycle-generation", lifecycleGeneration ?? "");

  await page.keyboard.press("Control+z");
  await expect.poll(() => readCanvasRecord<PlanPosition>(page, "data-machine-plan-positions")).toEqual(before);
  await page.keyboard.press("Control+y");
  await expect.poll(() => readCanvasRecord<PlanPosition>(page, "data-machine-plan-positions")).toEqual(moved);
  expect(errors).toEqual([]);
});

test("locked assembly member blocks pointer drag and keyboard nudge atomically", async ({ page }) => {
  const errors = collectPageErrors(page);
  await openCleanApp(page);
  const layersSection = page.getByRole("button", { name: /Layers/i });
  if ((await layersSection.getAttribute("aria-expanded")) !== "true") {
    await layersSection.click();
  }
  page.once("dialog", async (dialog) => dialog.accept("Rigid Lock Layer"));
  await page.getByTestId("add-layer").click();
  const lockedLayer = page.locator(".layer-row").filter({ hasText: "Rigid Lock Layer" });
  const { canvas, groupId, machineIds } = await createTwoMachineAssembly(
    page,
    "Locked Rigid Assembly",
    async () => {
      const propertiesSection = page.getByRole("button", { name: /Selected Object Properties/i });
      if ((await propertiesSection.getAttribute("aria-expanded")) !== "true") {
        await propertiesSection.click();
      }
      const machineProperties = page.getByLabel("Selected machine properties");
      await expect(machineProperties).toBeVisible();
      await machineProperties.getByLabel("Layer").selectOption({ label: "Rigid Lock Layer" });
    }
  );
  expect(groupId).not.toBeNull();
  await lockedLayer.getByRole("button", { name: "Lock", exact: true }).click();
  await expect(canvas).toHaveAttribute("data-selected-assembly-id", groupId ?? "");

  const before = await readCanvasRecord<PlanPosition>(page, "data-machine-plan-positions");
  await clickSceneMachine(page, machineIds[1]);
  await dragSceneMachine(page, machineIds[1], 80, 30);
  await page.keyboard.press("ArrowRight");
  await expect.poll(() => readCanvasRecord<PlanPosition>(page, "data-machine-plan-positions")).toEqual(before);
  await expect(canvas).toHaveAttribute("data-selected-assembly-id", groupId ?? "");
  expect(errors).toEqual([]);
});

test("group edit mode moves one member and restores rigid scene selection on exit", async ({ page }) => {
  const errors = collectPageErrors(page);
  await openCleanApp(page);
  const { canvas, group, groupId, machineIds } = await createTwoMachineAssembly(page, "Editable Rigid Assembly");
  expect(groupId).not.toBeNull();

  await group.getByRole("button", { name: /Edit Group Editable Rigid Assembly/i }).click();
  await expect(canvas).toHaveAttribute("data-active-group-edit-id", groupId ?? "");
  await expect(group).toContainText("Editing members");
  await expect(group.getByRole("button", { name: "Remove Selected" })).toBeDisabled();
  await page.keyboard.down("Control");
  await clickSceneMachine(page, machineIds[0]);
  await page.keyboard.up("Control");
  await expect(group.getByRole("button", { name: "Remove Selected" })).toBeEnabled();
  await expect(canvas).not.toHaveAttribute("data-selected-assembly-id", /.+/);

  await page.keyboard.down("Control");
  await clickSceneMachine(page, machineIds[1]);
  await page.keyboard.up("Control");
  await expect(page.getByTestId("connection-point-snap-panel")).toBeVisible();
  await expect.poll(async () => (await getRuntimePanel(page, "panel.connectionPointSnap"))?.available).toBe(true);

  await page.keyboard.down("Control");
  await clickSceneMachine(page, machineIds[1]);
  await page.keyboard.up("Control");
  await expect(page.getByTestId("connection-point-snap-panel")).toHaveCount(0);
  await expect.poll(async () => (await getRuntimePanel(page, "panel.connectionPointSnap"))?.available).toBe(false);

  const before = await readCanvasRecord<PlanPosition>(page, "data-machine-plan-positions");
  await dragSceneMachine(page, machineIds[0], 85, 25);
  await expect.poll(async () => {
    const current = await readCanvasRecord<PlanPosition>(page, "data-machine-plan-positions");
    return current[machineIds[0]]?.xMm !== before[machineIds[0]]?.xMm;
  }).toBe(true);
  const moved = await readCanvasRecord<PlanPosition>(page, "data-machine-plan-positions");
  expect(moved[machineIds[1]]).toEqual(before[machineIds[1]]);

  await group.getByRole("button", { name: /Exit Group Edit Editable Rigid Assembly/i }).click();
  await expect(canvas).not.toHaveAttribute("data-active-group-edit-id", /.+/);
  await expect(canvas).toHaveAttribute("data-selected-assembly-id", groupId ?? "");
  await clickSceneMachine(page, machineIds[1]);
  await expect(canvas).toHaveAttribute("data-selected-assembly-id", groupId ?? "");
  await expect(group).toHaveClass(/is-selected/);
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
  const defaultLayerRow = page.locator(".layer-row").filter({ hasText: "Default" });
  await expect(defaultLayerRow).toContainText("default system");
  await expect(defaultLayerRow.getByRole("button", { name: "Hide" })).toHaveCount(0);
  await expect(defaultLayerRow.getByRole("button", { name: "Delete" })).toHaveCount(0);

  await page.locator(".machine-card").first().click();
  const propertiesSectionButton = page.getByRole("button", { name: /Selected Object Properties/i });
  if ((await propertiesSectionButton.getAttribute("aria-expanded")) !== "true") {
    await propertiesSectionButton.click();
  }
  await expect(page.getByLabel("Selected machine properties").getByLabel("Layer")).toHaveValue("default");
  await expect(defaultLayerRow).toContainText("1 item");
  await expect(layerRow).toContainText("0 items");

  await page.getByLabel("Selected machine properties").getByLabel("Layer").selectOption({ label: "Test Layer" });
  await expect(layerRow).toContainText("1 item");
  await expect(defaultLayerRow).toContainText("0 items");
  await layerRow.getByRole("button", { name: "Hide" }).click();
  await expect(page.getByRole("button", { name: /Selected Object Properties/i })).toContainText("None");
  await layerRow.getByRole("button", { name: "Show" }).click();
  await layerRow.getByRole("button", { name: "Isolate" }).click();
  await expect(defaultLayerRow).not.toHaveClass(/is-hidden/);
  await page.getByRole("button", { name: "Show All Layers" }).click();

  const annotationsSection = page.getByRole("button", { name: /Annotations/i });
  if ((await annotationsSection.getAttribute("aria-expanded")) !== "true") {
    await annotationsSection.click();
  }
  await page.getByTestId("add-note-annotation").click();
  await expect(page.getByTestId("annotation-properties")).toBeVisible();
  await expect(page.getByTestId("annotation-properties").getByLabel("Layer")).toHaveValue("default");
  await expect(defaultLayerRow).toContainText("1 item");

  expect(errors).toEqual([]);
});

test("building civil references can be added and edited without red console errors", async ({ page }) => {
  const errors = collectPageErrors(page);
  await openCleanApp(page);

  const civilSection = page.getByRole("button", { name: /Building \/ Civil/i });
  if ((await civilSection.getAttribute("aria-expanded")) !== "true") {
    await civilSection.click();
  }
  await expect(page.getByTestId("civil-reference-panel")).toBeVisible();
  await page.getByTestId("add-civil-column").click();
  await expect.poll(async () => (await getRuntimePanel(page, "panel.inspector"))?.context).toBe("civil");

  const propertiesSection = page.getByRole("button", { name: /Civil Reference Properties/i });
  await expect(propertiesSection).toBeVisible();
  if ((await propertiesSection.getAttribute("aria-expanded")) !== "true") {
    await propertiesSection.click();
  }
  await expect(page.getByTestId("civil-reference-properties")).toBeVisible();
  await page.getByTestId("civil-plan-x-input").fill("-200");
  await page.getByTestId("civil-plan-x-input").blur();
  await expect(page.getByTestId("civil-plan-x-input")).toHaveValue("-200");

  expect(errors).toEqual([]);
});

test("assembly tree can create and select a group without red console errors", async ({ page }) => {
  const errors = collectPageErrors(page);
  await openCleanApp(page);

  await page.locator(".machine-card").first().click();
  const assemblySection = page.getByRole("button", { name: /Assembly Tree/i });
  if ((await assemblySection.getAttribute("aria-expanded")) !== "true") {
    await assemblySection.click();
  }
  await expect(page.getByTestId("assembly-tree-panel")).toBeVisible();

  page.once("dialog", async (dialog) => {
    await dialog.accept("Packaging Line 1");
  });
  await page.getByTestId("create-group-from-selection").click();
  const group = page.locator(".assembly-group-row").filter({ hasText: "Packaging Line 1" });
  await expect(group).toBeVisible();
  await expect(group).toContainText("1 item");
  await group.locator(".assembly-group-button").click();
  await expect(group).toHaveClass(/is-selected/);

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

  await selectExistingCustomLibraryItem(page);
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

