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
  await expect(page.getByTestId("primary-dock")).toBeVisible();
  await expect(page.getByTestId("right-panel")).toHaveCount(1);
  await expect(page.getByTestId("machine-library-panel")).toBeVisible();
};

const openPrimaryDockPanel = async (
  page: Page,
  panelId: "panel.machineLibrary" | "panel.layoutExplorer" | "panel.layers" | "panel.groups"
) => {
  const tab = page.getByTestId(`primary-dock-tab-${panelId}`);
  await expect(tab).toBeVisible();
  await tab.click();
  await expect(tab).toHaveAttribute("aria-pressed", "true");
  return page.locator(`[data-panel-id="${panelId}"]`);
};

const seedUiPreferences = async (page: Page, preferences: unknown) => {
  await page.addInitScript((seed) => new Promise<void>((resolve, reject) => {
    if (window.sessionStorage.getItem("atrvisu.e2e.uiPreferencesSeeded") === "true") {
      resolve();
      return;
    }
    const deleteRequest = indexedDB.deleteDatabase("atrvisu-db");
    deleteRequest.onerror = () => reject(deleteRequest.error);
    deleteRequest.onsuccess = () => {
      const openRequest = indexedDB.open("atrvisu-db", 2);
      openRequest.onupgradeneeded = () => {
        const database = openRequest.result;
        if (!database.objectStoreNames.contains("projects")) {
          const projects = database.createObjectStore("projects", { keyPath: "projectId" });
          projects.createIndex("updatedAt", "updatedAt");
          projects.createIndex("customerName", "customerName");
          projects.createIndex("projectName", "projectName");
        }
        if (!database.objectStoreNames.contains("uiPreferences")) {
          database.createObjectStore("uiPreferences");
        }
      };
      openRequest.onerror = () => reject(openRequest.error);
      openRequest.onsuccess = () => {
        const database = openRequest.result;
        const transaction = database.transaction("uiPreferences", "readwrite");
        transaction.objectStore("uiPreferences").put(seed, "workbench");
        transaction.oncomplete = () => {
          window.sessionStorage.setItem("atrvisu.e2e.uiPreferencesSeeded", "true");
          database.close();
          resolve();
        };
        transaction.onerror = () => reject(transaction.error);
      };
    };
  }), preferences);
};

const waitForUiPreferences = async (page: Page, status = "ready") => {
  await expect.poll(() => page.evaluate(() =>
    window.__atrvisuUiPreferences?.getSnapshot().hydrationStatus
  )).toBe(status);
};

const readRawUiPreferencesJson = async (page: Page) => page.evaluate(() =>
  new Promise<string>((resolve, reject) => {
    const request = indexedDB.open("atrvisu-db", 2);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const database = request.result;
      const getRequest = database.transaction("uiPreferences").objectStore("uiPreferences").get("workbench");
      getRequest.onerror = () => reject(getRequest.error);
      getRequest.onsuccess = () => {
        resolve(JSON.stringify(getRequest.result));
        database.close();
      };
    };
  })
);

const delayUiPreferencesHydration = async (page: Page) => {
  await page.addInitScript(() => {
    const releasedKey = "atrvisu.e2e.uiPreferencesHydrationReleased";
    if (window.sessionStorage.getItem(releasedKey) === "true") {
      window.__atrvisuUiPreferencesHydrationTestGate = {
        wait: Promise.resolve(),
        release: () => undefined
      };
      return;
    }
    let releaseWait!: () => void;
    const wait = new Promise<void>((resolve) => {
      releaseWait = resolve;
    });
    window.__atrvisuUiPreferencesHydrationTestGate = {
      wait,
      release: () => {
        window.sessionStorage.setItem(releasedKey, "true");
        releaseWait();
      }
    };
  });
};

const createE2EUiPreferences = (overrides: {
  theme?: "light" | "dark" | "system";
  density?: "compact" | "comfortable";
  width?: number;
  primaryDockWidth?: number;
  bottomDockHeight?: number;
  activeWorkspaceId?: "workspace.sales-layout" | "workspace.layout-engineering";
  panelOverrides?: Readonly<Record<string, Readonly<{
    visible?: boolean;
    collapsed?: boolean;
  }>>>;
} = {}) => {
  const panels = [
    ["panel.rightPanelShell", false],
    ["panel.primaryDockShell", false],
    ["panel.bottomDockShell", true],
    ["panel.machineLibrary", false],
    ["panel.layoutExplorer", false],
    ["panel.layoutControls", false],
    ["panel.viewpoints", true],
    ["panel.layers", true],
    ["panel.civilReferences", true],
    ["panel.groups", true],
    ["panel.projectStatus", false],
    ["panel.performanceBenchmarkLauncher", true],
    ["panel.simulationControls", true],
    ["panel.annotations", true],
    ["panel.precisionPlacement", false],
    ["panel.alignmentTools", true],
    ["panel.connectionPointSnap", false],
    ["panel.displayOverlayControls", true],
    ["panel.collisionCheck", false],
    ["panel.inspector", true],
    ["panel.statusBar", false]
  ] as const;
  return {
    schemaVersion: 1,
    theme: overrides.theme ?? "dark",
    density: overrides.density ?? "comfortable",
    ...(overrides.activeWorkspaceId ? { activeWorkspaceId: overrides.activeWorkspaceId } : {}),
    panels: panels.map(([panelId, collapsed], order) => ({
      panelId,
      visible: overrides.panelOverrides?.[panelId]?.visible ?? true,
      collapsed: overrides.panelOverrides?.[panelId]?.collapsed ?? collapsed,
      ...(panelId === "panel.rightPanelShell"
        ? { size: overrides.width ?? 360 }
        : panelId === "panel.primaryDockShell"
          ? { size: overrides.primaryDockWidth ?? 304 }
          : panelId === "panel.bottomDockShell"
            ? { size: overrides.bottomDockHeight ?? 136 }
            : {}),
      order,
      dock: panelId === "panel.primaryDockShell"
        || panelId === "panel.machineLibrary"
        || panelId === "panel.layoutExplorer"
        || panelId === "panel.layers"
        || panelId === "panel.groups"
        ? "primary-dock"
        : panelId === "panel.bottomDockShell"
          || panelId === "panel.viewpoints"
          || panelId === "panel.statusBar"
          ? "bottom-dock"
          : "secondary-dock"
    }))
  };
};

const openWorkspacePreferences = async (page: Page) => {
  const trigger = page.getByTestId("workspace-preferences-trigger");
  if (await trigger.getAttribute("aria-expanded") !== "true") {
    await trigger.click();
  }
  await expect(trigger).toHaveAttribute("aria-expanded", "true");
  const popover = page.getByTestId("workspace-preferences-popover");
  await expect(popover).toBeVisible();
  return { trigger, popover };
};

const preferenceBranchIds = {
  workspace: {
    trigger: "workspace-preferences-workspace-trigger",
    surface: "workspace-preferences-workspace-surface"
  },
  theme: {
    trigger: "workspace-preferences-theme-trigger",
    surface: "workspace-preferences-theme-surface"
  },
  density: {
    trigger: "workspace-preferences-density-trigger",
    surface: "workspace-preferences-density-surface"
  },
  "visible-panels": {
    trigger: "workspace-visible-panels-trigger",
    surface: "workspace-visible-panels-surface"
  }
} as const;

const openPreferenceBranch = async (
  page: Page,
  branchId: keyof typeof preferenceBranchIds
) => {
  const control = await openWorkspacePreferences(page);
  const branch = preferenceBranchIds[branchId];
  const branchTrigger = control.popover.getByTestId(branch.trigger);
  if (await branchTrigger.getAttribute("aria-expanded") !== "true") {
    await branchTrigger.click();
  }
  const surface = page.locator(`#${branch.surface}`);
  await expect(surface).toBeVisible();
  if (await branchTrigger.count()) {
    await expect(branchTrigger).toHaveAttribute("aria-expanded", "true");
  }
  return { ...control, branchTrigger, surface };
};

const openVisiblePanels = (page: Page) => openPreferenceBranch(page, "visible-panels");

const expandContextualPanel = async (page: Page, panelId: string) => {
  const toggle = page.getByTestId(`contextual-panel-toggle-${panelId}`);
  await expect(toggle).toBeVisible();
  if ((await toggle.getAttribute("aria-expanded")) !== "true") {
    await toggle.click();
  }
  await expect(toggle).toHaveAttribute("aria-expanded", "true");
};

const expectNoModalBackdrop = async (page: Page) => {
  await expect(page.locator(".manager-backdrop")).toHaveCount(0);
};

const getCommandBarCommand = (page: Page, commandId: string) =>
  page.getByTestId("workbench-command-bar").locator(`[data-command-id="${commandId}"]`);

const openWorkbenchMenu = async (page: Page, menuLabel: string) => {
  const trigger = page.getByTestId("workbench-menu-bar").getByRole("menuitem", {
    name: menuLabel,
    exact: true
  });
  await trigger.click();
  await expect(trigger).toHaveAttribute("aria-expanded", "true");
  return page.getByRole("menu", { name: menuLabel, exact: true });
};

const openProjectManagerFromFileMenu = async (page: Page) => {
  const fileMenu = await openWorkbenchMenu(page, "File");
  await fileMenu.locator('[data-command-id="project.manager"]').click();
  await expect(page.getByTestId("project-manager-modal")).toBeVisible();
};

const openPerformanceBenchmarkFromToolsMenu = async (page: Page) => {
  const toolsMenu = await openWorkbenchMenu(page, "Tools");
  await toolsMenu.locator('[data-command-id="performance.benchmark"]').click();
  await expect(page.getByTestId("performance-benchmark-modal")).toBeVisible();
};

const addCanonicalAtaraMachine = async (
  page: Page,
  machineName: string,
  groupPath: readonly string[]
) => {
  await openPrimaryDockPanel(page, "panel.machineLibrary");
  const machineCard = page.locator(`.machine-card[title="Add ${machineName}"]`);
  for (const groupName of groupPath) {
    if (await machineCard.isVisible().catch(() => false)) {
      break;
    }
    await page.getByRole("button", { name: groupName, exact: true }).click();
  }
  await expect(machineCard).toBeVisible();
  await machineCard.click();
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

const getRuntimeFeatureAccessReport = async (page: Page) => page.evaluate(() => {
  const bridge = window.__atrvisuRuntimeFeatureAccess;
  if (!bridge) {
    throw new Error("AtrVisu runtime feature access E2E bridge is unavailable.");
  }
  return bridge.getReport();
});

const getRuntimeFeatureAccessGate = async (
  page: Page,
  noRedConsole: boolean
) =>
  page.evaluate((passedNoRedConsole) => {
    const bridge = window.__atrvisuRuntimeFeatureAccess;
    if (!bridge) {
      throw new Error("AtrVisu runtime feature access E2E bridge is unavailable.");
    }
    return bridge.getGate({
      quality: { "no-red-console": passedNoRedConsole }
    });
  }, noRedConsole);

const getRuntimeFeatureAccessDiagnostics = async (page: Page) =>
  page.evaluate(() => {
    const bridge = window.__atrvisuRuntimeFeatureAccess;
    if (!bridge) {
      throw new Error("AtrVisu runtime feature access E2E bridge is unavailable.");
    }
    return {
      sessionId: bridge.getDiagnosticsSessionId(),
      requiredCommandIds: bridge.getRequiredSurfaceExecutionCommandIds()
    };
  });

const getRuntimeCommandExecution = async (page: Page, commandId: string) =>
  page.evaluate((id) => {
    const bridge = window.__atrvisuRuntimeFeatureAccess;
    if (!bridge) {
      throw new Error("AtrVisu runtime feature access E2E bridge is unavailable.");
    }
    return bridge.getCommandExecution(id);
  }, commandId);

const getRuntimeCommandExecutionSnapshot = async (page: Page) =>
  page.evaluate(() => {
    const bridge = window.__atrvisuRuntimeFeatureAccess;
    if (!bridge) {
      throw new Error("AtrVisu runtime feature access E2E bridge is unavailable.");
    }
    return bridge.listCommandExecutions();
  });

const getActiveProjectRuntimeContext = async (page: Page) => page.evaluate(() => {
  const bridge = window.__atrvisuProjectCommands;
  if (!bridge) {
    throw new Error("AtrVisu project runtime command E2E bridge is unavailable.");
  }
  return bridge.getActiveContext();
});

const beginRuntimeSurfaceExecutionObservation = async (
  page: Page,
  commandId: string
) => page.evaluate((id) => {
  const bridge = window.__atrvisuRuntimeFeatureAccess;
  if (!bridge) {
    throw new Error("AtrVisu runtime feature access E2E bridge is unavailable.");
  }
  return bridge.beginSurfaceExecutionObservation(id);
}, commandId);

const completeRuntimeSurfaceExecutionObservation = async (
  page: Page,
  token: string
) => page.evaluate((observationToken) => {
  const bridge = window.__atrvisuRuntimeFeatureAccess;
  if (!bridge) {
    throw new Error("AtrVisu runtime feature access E2E bridge is unavailable.");
  }
  return bridge.completeSurfaceExecutionObservation(observationToken);
}, token);

const getRuntimeSurfaceExecutionEvidence = async (page: Page) =>
  page.evaluate(() => {
    const bridge = window.__atrvisuRuntimeFeatureAccess;
    if (!bridge) {
      throw new Error("AtrVisu runtime feature access E2E bridge is unavailable.");
    }
    return bridge.getSurfaceExecutionEvidence();
  });

const expectOneRuntimeCommandExecution = async (
  page: Page,
  commandId: string,
  action: () => Promise<unknown>
) => {
  const observation = await beginRuntimeSurfaceExecutionObservation(page, commandId);
  const before = await getRuntimeCommandExecution(page, commandId);
  await action();
  await expect.poll(async () =>
    (await getRuntimeCommandExecution(page, commandId)).attemptCount
  ).toBe(before.attemptCount + 1);
  const after = await getRuntimeCommandExecution(page, commandId);
  expect(after.executedCount).toBe(before.executedCount + 1);
  expect(after.lastResult).toMatchObject({ handled: true, status: "executed" });
  const completion = await completeRuntimeSurfaceExecutionObservation(
    page,
    observation.token
  );
  return { ...completion, token: observation.token };
};

const expectRuntimeCommandExecutionOnce = async (
  page: Page,
  commandId: string,
  action: () => Promise<unknown>
) => {
  const before = await getRuntimeCommandExecution(page, commandId);
  await action();
  await expect.poll(async () =>
    (await getRuntimeCommandExecution(page, commandId)).attemptCount
  ).toBe(before.attemptCount + 1);
  const after = await getRuntimeCommandExecution(page, commandId);
  expect(after.executedCount).toBe(before.executedCount + 1);
  expect(after.lastResult).toMatchObject({ handled: true, status: "executed" });
  return { before, after };
};

const expectCancelledRuntimeCommandExecution = async (
  page: Page,
  commandId: string,
  action: () => Promise<unknown>
) => {
  const before = await getRuntimeCommandExecution(page, commandId);
  await action();
  await expect.poll(async () =>
    (await getRuntimeCommandExecution(page, commandId)).attemptCount
  ).toBe(before.attemptCount + 1);
  const after = await getRuntimeCommandExecution(page, commandId);
  expect(after.executedCount).toBe(before.executedCount);
  expect(after.lastResult).toMatchObject({ handled: false, status: "cancelled" });
  return { before, after };
};

const getRuntimeFeature = async (page: Page, featureId: string) =>
  page.evaluate((id) => {
    const bridge = window.__atrvisuRuntimeFeatureAccess;
    if (!bridge) {
      throw new Error("AtrVisu runtime feature access E2E bridge is unavailable.");
    }
    return bridge.getFeature(id);
  }, featureId);

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

type RuntimeCameraApplyState = {
  mode: "perspective" | "orthographic";
  alpha: number;
  beta: number;
  radius: number;
  targetX: number;
  targetY: number;
  targetZ: number;
  orthographic?: {
    centerX: number;
    centerY: number;
    verticalWorldSpan: number;
  };
};

const DEFAULT_ORTHOGRAPHIC_CAMERA_STATE: RuntimeCameraApplyState = {
  mode: "orthographic",
  alpha: 0.7,
  beta: 1.05,
  radius: 34,
  targetX: 1,
  targetY: 0,
  targetZ: -2
};

const applyRuntimeViewportCameraState = async (
  page: Page,
  cameraState: RuntimeCameraApplyState = DEFAULT_ORTHOGRAPHIC_CAMERA_STATE
) => page.evaluate((state) => {
  const bridge = window.__atrvisuRuntimeViewport;
  if (!bridge) {
    throw new Error("AtrVisu runtime viewport E2E bridge is unavailable.");
  }
  return bridge.applyCameraState(state);
}, cameraState);

type RuntimeViewportSnapshot = Awaited<ReturnType<typeof getRuntimeViewportSnapshot>>;

const expectOrthographicFramingEquivalent = (
  before: RuntimeViewportSnapshot,
  after: RuntimeViewportSnapshot
) => {
  expect(before.camera?.mode).toBe("orthographic");
  expect(after.camera?.mode).toBe("orthographic");
  expect(after.camera?.alpha).toBeCloseTo(before.camera?.alpha ?? Number.NaN);
  expect(after.camera?.beta).toBeCloseTo(before.camera?.beta ?? Number.NaN);
  expect(after.camera?.radius).toBeCloseTo(before.camera?.radius ?? Number.NaN);
  expect(after.camera?.targetX).toBeCloseTo(before.camera?.targetX ?? Number.NaN);
  expect(after.camera?.targetY).toBeCloseTo(before.camera?.targetY ?? Number.NaN);
  expect(after.camera?.targetZ).toBeCloseTo(before.camera?.targetZ ?? Number.NaN);

  const beforeIntent = before.camera?.orthographicIntent;
  const afterIntent = after.camera?.orthographicIntent;
  expect(beforeIntent).toBeDefined();
  expect(afterIntent).toBeDefined();
  expect(afterIntent?.centerX).toBeCloseTo(beforeIntent?.centerX ?? Number.NaN);
  expect(afterIntent?.centerY).toBeCloseTo(beforeIntent?.centerY ?? Number.NaN);
  expect(afterIntent?.verticalWorldSpan)
    .toBeCloseTo(beforeIntent?.verticalWorldSpan ?? Number.NaN);
  expect(afterIntent?.viewportAspectRatio)
    .toBeCloseTo((after.viewport?.cssWidth ?? 0) / (after.viewport?.cssHeight ?? 1));
  expect(afterIntent?.horizontalWorldSpan)
    .toBeCloseTo(
      (afterIntent?.verticalWorldSpan ?? 0) * (afterIntent?.viewportAspectRatio ?? 0)
    );
  expect(afterIntent?.horizontalWorldUnitsPerPixel)
    .toBeCloseTo(afterIntent?.verticalWorldUnitsPerPixel ?? Number.NaN);
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
type ScreenBounds = { left: number; top: number; width: number; height: number };

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

const getMachineScreenBounds = async (page: Page, machineId: string) => {
  await expect.poll(async () => {
    const bounds = (await readCanvasRecord<ScreenBounds>(
      page,
      "data-machine-screen-bounds"
    ))[machineId];
    return Boolean(bounds && bounds.width > 0 && bounds.height > 0);
  }).toBe(true);
  return (await readCanvasRecord<ScreenBounds>(
    page,
    "data-machine-screen-bounds"
  ))[machineId];
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
  await openPrimaryDockPanel(page, "panel.machineLibrary");
  const machineCard = page.locator(".machine-card").first();
  await machineCard.click();
  await waitForMachineDiagnostics(page, 1);
  await afterFirstMachineAdded?.();

  await openPrimaryDockPanel(page, "panel.groups");
  page.once("dialog", async (dialog) => dialog.accept(name));
  await expectOneRuntimeCommandExecution(page, "assembly.createGroup", () =>
    page.getByTestId("create-group-from-selection").click()
  );
  const group = page.locator(".assembly-group-row").filter({ hasText: name });
  await expect(group).toContainText("1 item");

  await openPrimaryDockPanel(page, "panel.machineLibrary");
  await machineCard.click();
  await waitForMachineDiagnostics(page, 2);
  await openPrimaryDockPanel(page, "panel.groups");
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
  await expect(canvas).not.toHaveAttribute("data-machine-screen-bounds");
  await expect(canvas).not.toHaveAttribute("data-machine-plan-positions");
  await expect(canvas).not.toHaveAttribute("data-civil-plan-positions");
  expect(await page.evaluate(() => window.__atrvisuRuntimePanels === undefined)).toBe(true);
  expect(await page.evaluate(() => window.__atrvisuRuntimeViewport === undefined)).toBe(true);
  expect(await page.evaluate(() => window.__atrvisuRuntimeFeatureAccess === undefined)).toBe(true);
  expect(await page.evaluate(() => window.__atrvisuProjectCommands === undefined)).toBe(true);

  await page.goto("/?e2eDiagnostics=1");
  await expect(page.getByTestId("app-root")).toBeVisible();
  await expect(canvas).toHaveAttribute("data-machine-screen-points", "{}");
  await expect(canvas).toHaveAttribute("data-machine-screen-bounds", "{}");
  await expect(canvas).toHaveAttribute("data-machine-plan-positions", "{}");
  await expect(canvas).toHaveAttribute("data-civil-plan-positions", "{}");
  expect(await page.evaluate(() => Boolean(window.__atrvisuRuntimePanels))).toBe(true);
  expect(await page.evaluate(() => Boolean(window.__atrvisuRuntimeViewport))).toBe(true);
  expect(await page.evaluate(() => Boolean(window.__atrvisuRuntimeFeatureAccess))).toBe(true);
  expect(await page.evaluate(() => Boolean(window.__atrvisuProjectCommands))).toBe(true);
  const diagnostics = await waitForRuntimeViewport(page);
  expect(diagnostics.viewport?.lastResizeReason).toBe("manual");
  expect(diagnostics.invariants).toMatchObject({
    selectionIds: [],
    primarySelectionId: null,
    activeGroupEditId: null,
    machineTransforms: [],
    civilTransforms: [],
    annotationTransforms: [],
    groupMembership: [],
    undoDepth: 0,
    redoDepth: 0,
    undoStack: [],
    redoStack: [],
    projectDirty: false,
    simulationRunning: false,
    simulationSpeed: 1
  });
  expect(Array.isArray(diagnostics.invariants.layerState)).toBe(true);
  expect(errors).toEqual([]);
});

test("runtime feature access baseline requires observed surface execution evidence", async ({ page }) => {
  const errors = collectPageErrors(page);
  await openCleanApp(page);
  await waitForRuntimeViewport(page);

  const report = await getRuntimeFeatureAccessReport(page);
  const diagnostics = await getRuntimeFeatureAccessDiagnostics(page);
  expect(report.requiredRuntimeFeatures.every((feature) =>
    feature.status === "ready" || feature.status === "contextually-unavailable"
  )).toBe(true);
  expect(report.metadataOnlyRequiredFeatureIds).toEqual([]);
  expect(report.unknownCommandIds).toEqual([]);
  expect(report.unknownPanelIds).toEqual([]);
  expect(report.staleSurfaceFeatureIds).toEqual([]);
  expect(report.unmappedRuntimeSurfaceIds).toEqual([]);
  expect(report.missingSurfaceExecutionCommandIds)
    .toEqual(diagnostics.requiredCommandIds);
  expect(report.plannedFeatures.map((feature) => feature.featureId)).toEqual([
    "view.fitView",
    "panel.diagnostics"
  ]);
  expect(report.plannedFeatures.every((feature) => feature.status === "planned-unbound")).toBe(true);
  expect(report.qualitySignals).toEqual([
    expect.objectContaining({
      featureId: "diagnostics.noRedConsole",
      status: "external-evidence-required"
    })
  ]);

  const missingEvidenceGate = await page.evaluate(() =>
    window.__atrvisuRuntimeFeatureAccess?.getGate({})
  );
  expect(missingEvidenceGate?.passed).toBe(false);
  expect(missingEvidenceGate?.blockedFeatureIds).toContain("diagnostics.noRedConsole");
  expect(missingEvidenceGate?.report.missingSurfaceExecutionCommandIds)
    .toEqual(diagnostics.requiredCommandIds);

  const qualityOnlyGate = await getRuntimeFeatureAccessGate(page, true);
  expect(qualityOnlyGate.passed).toBe(false);
  expect(qualityOnlyGate.report.surfaceExecutionValidation.verifiedCommandIds).toEqual([]);
  expect(qualityOnlyGate.report.missingSurfaceExecutionCommandIds)
    .toEqual(diagnostics.requiredCommandIds);
  expect(errors).toEqual([]);
});

test("runtime feature access complete gate is bound to observed visible command routes", async ({ page }) => {
  test.setTimeout(60_000);
  const errors = collectPageErrors(page);
  await openCleanApp(page);
  await waitForRuntimeViewport(page);
  const diagnostics = await getRuntimeFeatureAccessDiagnostics(page);
  const completions: Awaited<ReturnType<typeof expectOneRuntimeCommandExecution>>[] = [];
  const observe = async (commandId: string, action: () => Promise<unknown>) => {
    completions.push(await expectOneRuntimeCommandExecution(page, commandId, action));
  };

  expect((await getRuntimeFeatureAccessGate(page, true)).passed).toBe(false);

  const machineCard = page.locator(".machine-card").first();
  await observe("library.addMachine", () => machineCard.click());
  await machineCard.click();
  await machineCard.click();
  await waitForMachineDiagnostics(page, 3);

  const propertiesSection = page.getByRole("button", { name: /Selected Object Properties/i });
  if ((await propertiesSection.getAttribute("aria-expanded")) !== "true") {
    await propertiesSection.click();
  }
  const machineProperties = page.getByLabel("Selected machine properties");
  await observe("edit.duplicateSelected", () =>
    machineProperties.getByRole("button", { name: "Duplicate Selected" }).click()
  );
  await waitForMachineDiagnostics(page, 4);

  page.once("dialog", (dialog) => dialog.accept());
  await observe("edit.deleteSelected", () =>
    page.getByRole("button", { name: "Delete Selected" }).first().click()
  );
  await waitForMachineDiagnostics(page, 3);
  await observe("edit.undo", () =>
    getCommandBarCommand(page, "edit.undo").click()
  );
  await waitForMachineDiagnostics(page, 4);
  await observe("edit.redo", () =>
    getCommandBarCommand(page, "edit.redo").click()
  );
  await waitForMachineDiagnostics(page, 3);

  await observe("view.toggleLabels", () =>
    getCommandBarCommand(page, "view.toggleLabels").click()
  );
  await observe("view.toggleConnectionPoints", () =>
    getCommandBarCommand(page, "view.toggleConnectionPoints").click()
  );
  await observe("view.showMeasurements", () =>
    getCommandBarCommand(page, "view.showMeasurements").click()
  );
  const viewMenu = await openWorkbenchMenu(page, "View");
  await observe("view.displayOverlayControls", () =>
    viewMenu.locator('[data-command-id="view.displayOverlayControls"]').click()
  );
  await expect(page.getByTestId("display-overlay-tool-surface")).toBeVisible();
  await page.getByRole("button", { name: "Close Display / Overlay Controls" }).click();
  await expect(page.getByTestId("display-overlay-tool-surface")).toHaveCount(0);

  const machineIds = await getMachineIds(page);
  await clickSceneMachine(page, machineIds[0]);
  if ((await propertiesSection.getAttribute("aria-expanded")) !== "true") {
    await propertiesSection.click();
  }
  await machineProperties.getByLabel("Plan X").fill("-10000");
  await machineProperties.getByLabel("Plan X").blur();
  await expect(machineProperties.getByLabel("Plan X")).toHaveValue("-10000");
  await page.keyboard.down("Control");
  await clickSceneMachine(page, machineIds[2]);
  await page.keyboard.up("Control");
  const snapButton = page.getByTestId("connection-point-snap-button");
  await expect(snapButton).toBeEnabled();
  const positionsBeforeSnap = await readCanvasRecord<PlanPosition>(
    page,
    "data-machine-plan-positions"
  );
  await observe("snap.connectionPoint", () => snapButton.click());
  await expect.poll(() =>
    readCanvasRecord<PlanPosition>(page, "data-machine-plan-positions")
  ).not.toEqual(positionsBeforeSnap);

  await clickSceneMachine(page, machineIds[1]);
  await page.keyboard.down("Control");
  await clickSceneMachine(page, machineIds[0]);
  await page.keyboard.up("Control");
  const multiSelectionSection = page.getByRole("button", { name: /Multi-Selection/i });
  if ((await multiSelectionSection.getAttribute("aria-expanded")) !== "true") {
    await multiSelectionSection.click();
  }
  const alignmentContributionToggle = page.getByTestId(
    "contextual-panel-toggle-panel.alignmentTools"
  );
  if ((await alignmentContributionToggle.getAttribute("aria-expanded")) !== "true") {
    await alignmentContributionToggle.click();
  }
  const multiSelectionPanel = page.getByTestId("multi-selection-panel");
  const positionsBeforeAlignment = await readCanvasRecord<PlanPosition>(
    page,
    "data-machine-plan-positions"
  );
  await observe("alignment.alignSelection", () =>
    multiSelectionPanel.getByRole("button", { name: "Align Left" }).click()
  );
  await expect.poll(() =>
    readCanvasRecord<PlanPosition>(page, "data-machine-plan-positions")
  ).not.toEqual(positionsBeforeAlignment);

  await clickSceneMachine(page, machineIds[0]);
  await openPrimaryDockPanel(page, "panel.groups");
  const createGroupButton = page.getByTestId("create-group-from-selection");
  await expect(createGroupButton).toBeEnabled();
  page.once("dialog", (dialog) => dialog.accept("Observed Assembly"));
  await observe("assembly.createGroup", () => createGroupButton.click());
  const group = page.locator(".assembly-group-row").filter({ hasText: "Observed Assembly" });
  await expect(group).toContainText("1 item");
  await observe("assembly.enterEdit", () =>
    group.getByRole("button", { name: /Edit Group Observed Assembly/i }).click()
  );
  await expect(group).toContainText("Editing members");
  await observe("assembly.exitEdit", () =>
    group.getByRole("button", { name: /Exit Group Edit Observed Assembly/i }).click()
  );
  await expect(group).not.toContainText("Editing members");
  page.once("dialog", (dialog) => dialog.accept());
  await observe("assembly.ungroup", () =>
    group.getByRole("button", { name: /Ungroup Observed Assembly/i }).click()
  );
  await expect(group).toHaveCount(0);

  let insertMenu = await openWorkbenchMenu(page, "Insert");
  await observe("annotations.create", () =>
    insertMenu.locator('[data-command-id="annotations.create"]').click()
  );
  await expect(page.getByTestId("annotation-properties")).toBeVisible();

  insertMenu = await openWorkbenchMenu(page, "Insert");
  await observe("civil.addColumn", () =>
    insertMenu.locator('[data-command-id="civil.addColumn"]').click()
  );
  await expect(page.getByTestId("civil-reference-properties")).toBeVisible();

  await openPrimaryDockPanel(page, "panel.machineLibrary");
  await observe("library.manager", () => page.getByTestId("open-library-manager").click());
  await expect(page.getByTestId("library-manager-modal")).toBeVisible();
  await page.getByTestId("close-library-manager-header").click();
  await expect(page.getByTestId("library-manager-modal")).toHaveCount(0);

  await observe("library.taxonomyManager", () =>
    page.getByTestId("open-taxonomy-manager").click()
  );
  await expect(page.getByTestId("taxonomy-manager-modal")).toBeVisible();
  await page.getByTestId("close-taxonomy-manager-header").click();
  await expect(page.getByTestId("taxonomy-manager-modal")).toHaveCount(0);

  const toolsMenu = await openWorkbenchMenu(page, "Tools");
  await observe("performance.benchmark", () =>
    toolsMenu.locator('[data-command-id="performance.benchmark"]').click()
  );
  await expect(page.getByTestId("performance-benchmark-modal")).toBeVisible();
  await page.getByTestId("close-performance-benchmark").click();
  await expect(page.getByTestId("performance-benchmark-modal")).toHaveCount(0);

  const authorityEvidence = await getRuntimeSurfaceExecutionEvidence(page);
  expect(authorityEvidence.complete).toBe(true);
  expect(authorityEvidence.verifiedCommandIds).toEqual(diagnostics.requiredCommandIds);
  expect([...completions.map((item) => item.commandId)].sort())
    .toEqual(diagnostics.requiredCommandIds);

  const completeGate = await getRuntimeFeatureAccessGate(page, errors.length === 0);
  expect(completeGate.passed).toBe(true);
  expect(completeGate.blockedFeatureIds).toEqual([]);
  expect(completeGate.report.surfaceExecutionValidation.passed).toBe(true);
  expect(errors).toEqual([]);
});

test("runtime feature access authority rejects synthetic, forged, replayed, cancelled, stale, and partial evidence", async ({ page }) => {
  const errors = collectPageErrors(page);
  await openCleanApp(page);
  await waitForRuntimeViewport(page);
  const diagnostics = await getRuntimeFeatureAccessDiagnostics(page);

  const initial = await page.evaluate((requiredCommandIds) => {
    const bridge = window.__atrvisuRuntimeFeatureAccess;
    if (!bridge) {
      throw new Error("AtrVisu runtime feature access E2E bridge is unavailable.");
    }
    const syntheticEvidence = {
      quality: { "no-red-console": true },
      surfaceExecution: {
        source: "live-runtime-probe-authority",
        sessionId: bridge.getDiagnosticsSessionId(),
        verifiedCommandIds: requiredCommandIds,
        missingCommandIds: [],
        rejectedCommandIds: [],
        rejections: [],
        complete: true,
        reasons: []
      },
      observations: requiredCommandIds.map((commandId) => ({
        commandId,
        beforeAttemptCount: 0,
        afterAttemptCount: 1,
        beforeExecutedCount: 0,
        afterExecutedCount: 1,
        finalResult: { handled: true, status: "executed" }
      })),
      verifiedCommandIds: requiredCommandIds
    };
    return {
      bridgeKeys: Object.keys(bridge).sort(),
      probes: bridge.listCommandExecutions(),
      evidence: bridge.getSurfaceExecutionEvidence(),
      syntheticGate: bridge.getGate(syntheticEvidence)
    };
  }, diagnostics.requiredCommandIds);

  expect(initial.bridgeKeys).not.toContain("createCommandExecutionObservation");
  expect(initial.bridgeKeys).not.toContain("validateSurfaceExecutionAttestation");
  expect(initial.probes).toEqual([]);
  expect(initial.evidence.complete).toBe(false);
  expect(initial.evidence.verifiedCommandIds).toEqual([]);
  expect(initial.syntheticGate.passed).toBe(false);
  expect(initial.syntheticGate.report.surfaceExecutionValidation.verifiedCommandIds)
    .toEqual([]);
  expect(initial.syntheticGate.report.missingSurfaceExecutionCommandIds)
    .toEqual(diagnostics.requiredCommandIds);

  await expect(
    completeRuntimeSurfaceExecutionObservation(
      page,
      `${diagnostics.sessionId}.forged-token`
    )
  ).rejects.toThrow("unknown");
  expect((await getRuntimeSurfaceExecutionEvidence(page)).verifiedCommandIds)
    .toEqual([]);

  const noExecution = await beginRuntimeSurfaceExecutionObservation(page, "edit.undo");
  await expect(
    completeRuntimeSurfaceExecutionObservation(page, noExecution.token)
  ).rejects.toThrow("attemptCount");
  await expect(
    completeRuntimeSurfaceExecutionObservation(page, noExecution.token)
  ).rejects.toThrow("already been consumed");

  const addMachineCompletion = await expectOneRuntimeCommandExecution(
    page,
    "library.addMachine",
    () => page.locator(".machine-card").first().click()
  );
  await waitForMachineDiagnostics(page, 1);
  await expect(
    completeRuntimeSurfaceExecutionObservation(page, addMachineCompletion.token)
  ).rejects.toThrow("already been consumed");

  const partialEvidence = await getRuntimeSurfaceExecutionEvidence(page);
  expect(partialEvidence.complete).toBe(false);
  expect(partialEvidence.verifiedCommandIds).toEqual(["library.addMachine"]);
  expect(partialEvidence.missingCommandIds)
    .toEqual(diagnostics.requiredCommandIds.filter((id) => id !== "library.addMachine"));
  const partialGate = await getRuntimeFeatureAccessGate(page, true);
  expect(partialGate.passed).toBe(false);
  expect(partialGate.report.surfaceExecutionValidation.verifiedCommandIds)
    .toEqual(["library.addMachine"]);

  const propertiesSection = page.getByRole("button", { name: /Selected Object Properties/i });
  if ((await propertiesSection.getAttribute("aria-expanded")) !== "true") {
    await propertiesSection.click();
  }
  const cancelledHandle = await beginRuntimeSurfaceExecutionObservation(
    page,
    "edit.deleteSelected"
  );
  page.once("dialog", (dialog) => dialog.dismiss());
  const cancelled = await expectCancelledRuntimeCommandExecution(
    page,
    "edit.deleteSelected",
    () => page.getByLabel("Selected machine properties")
      .getByRole("button", { name: "Delete Selected" })
      .click()
  );
  expect(cancelled.after.attemptCount).toBe(cancelled.before.attemptCount + 1);
  expect(cancelled.after.executedCount).toBe(cancelled.before.executedCount);
  await expect(
    completeRuntimeSurfaceExecutionObservation(page, cancelledHandle.token)
  ).rejects.toThrow('status "cancelled"');
  const cancelledEvidence = await getRuntimeSurfaceExecutionEvidence(page);
  expect(cancelledEvidence.rejections).toContainEqual(
    expect.objectContaining({
      commandId: "edit.deleteSelected",
      kind: "cancelled"
    })
  );
  expect((await getRuntimeFeatureAccessGate(page, true)).passed).toBe(false);

  const staleHandle = await beginRuntimeSurfaceExecutionObservation(
    page,
    "annotations.create"
  );
  const previousSessionId = diagnostics.sessionId;
  await page.reload();
  await expect(page.getByTestId("app-root")).toBeVisible();
  await waitForRuntimeViewport(page);
  const reloadedDiagnostics = await getRuntimeFeatureAccessDiagnostics(page);
  expect(reloadedDiagnostics.sessionId).not.toBe(previousSessionId);
  await expect(
    completeRuntimeSurfaceExecutionObservation(page, staleHandle.token)
  ).rejects.toThrow("stale session");

  const reloadedEvidence = await getRuntimeSurfaceExecutionEvidence(page);
  expect(reloadedEvidence.verifiedCommandIds).toEqual([]);
  expect(reloadedEvidence.complete).toBe(false);
  const reloadedGate = await getRuntimeFeatureAccessGate(page, true);
  expect(reloadedGate.passed).toBe(false);
  expect(reloadedGate.report.missingSurfaceExecutionCommandIds)
    .toEqual(reloadedDiagnostics.requiredCommandIds);
  expect(errors).toEqual([]);
});

test("required runtime command bindings are live without executing during report construction", async ({ page }) => {
  const errors = collectPageErrors(page);
  await openCleanApp(page);
  await waitForRuntimeViewport(page);

  const report = await getRuntimeFeatureAccessReport(page);
  const requiredCommandEvidence = report.requiredRuntimeFeatures.flatMap(
    (feature) => feature.commandEvidence
  );
  expect(requiredCommandEvidence.length).toBeGreaterThan(0);
  expect(requiredCommandEvidence.every((command) =>
    command.registered && command.bound && command.reachable
  )).toBe(true);
  expect(report.features.find((feature) => feature.featureId === "view.fitView")).toMatchObject({
    classification: "declared-planned",
    status: "planned-unbound",
    bound: false,
    reachable: false
  });

  await expect(page.getByTestId("library-manager-modal")).toHaveCount(0);
  await expect(page.getByTestId("taxonomy-manager-modal")).toHaveCount(0);
  await expect(page.getByTestId("performance-benchmark-modal")).toHaveCount(0);
  expect(errors).toEqual([]);
});

test("runtime feature evidence covers panels, selection, entities, viewport, and surfaces", async ({ page }) => {
  const errors = collectPageErrors(page);
  await openCleanApp(page);
  await waitForRuntimeViewport(page);

  const report = await getRuntimeFeatureAccessReport(page);
  const selectionFeature = report.features.find(
    (feature) => feature.featureId === "selection.singleSelect"
  );
  const viewportFeature = report.features.find(
    (feature) => feature.featureId === "viewport.main"
  );
  expect(selectionFeature?.selectionEvidence).toMatchObject({
    authorityBound: true,
    replaceSupported: true,
    toggleSupported: true,
    clearSupported: true,
    reconciliationSupported: true
  });
  expect(selectionFeature?.entityEvidence).toMatchObject({
    authorityBound: true,
    canonicalIdentity: true,
    duplicateIdentityRejected: true
  });
  expect(viewportFeature?.viewportEvidence).toMatchObject({
    viewportId: "viewport.main",
    registered: true,
    bound: true,
    available: true,
    cameraResolvable: true,
    resizeSupported: true
  });
  expect(report.requiredRuntimeFeatures.every(
    (feature) => feature.inventoriedRuntimeSurfaceIds.length > 0
  )).toBe(true);
  expect(report.requiredRuntimeFeatures.flatMap(
    (feature) => feature.panelEvidence
  ).every((panel) => panel.registered && panel.bound)).toBe(true);
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
  await expect(page.getByTestId("inspector-empty-state")).toBeVisible();
  await openPrimaryDockPanel(page, "panel.layoutExplorer");
  await expect(page.getByTestId("layout-explorer")).toBeVisible();
  await openPrimaryDockPanel(page, "panel.layers");
  await expect(page.getByTestId("layers-panel")).toBeVisible();
  await openPrimaryDockPanel(page, "panel.groups");
  await expect(page.getByTestId("assembly-tree-panel")).toBeVisible();

  await expectOneRuntimeCommandExecution(page, "view.toggleLabels", () =>
    getCommandBarCommand(page, "view.toggleLabels").click()
  );
  await expectOneRuntimeCommandExecution(page, "view.toggleConnectionPoints", () =>
    getCommandBarCommand(page, "view.toggleConnectionPoints").click()
  );
  await expectOneRuntimeCommandExecution(page, "view.showMeasurements", () =>
    getCommandBarCommand(page, "view.showMeasurements").click()
  );

  const toolsMenu = await openWorkbenchMenu(page, "Tools");
  await toolsMenu.locator('[data-command-id="collision.check"]').click();
  await expect(page.getByTestId("collision-check-tool-surface")).toBeVisible();
  await page.getByRole("button", { name: "Close Collision Check" }).click();

  expect(errors).toEqual([]);
});

test("View-owned display controls update the persisted overlay authority without remounting the editor", async ({ page }) => {
  const errors = collectPageErrors(page);
  await openCleanApp(page);
  await waitForRuntimeViewport(page);
  const before = await getRuntimeViewportSnapshot(page);

  const viewMenu = await openWorkbenchMenu(page, "View");
  await viewMenu.locator('[data-command-id="view.displayOverlayControls"]').click();
  const surface = page.getByTestId("display-overlay-tool-surface");
  const controls = page.getByTestId("overlay-controls");
  await expect(surface).toBeVisible();
  await expect(controls).toBeVisible();
  expect(await getRuntimePanel(page, "panel.displayOverlayControls")).toMatchObject({
    bound: true,
    visible: true,
    open: true,
    surfaceKind: "modal",
    runtimeLocation: "modal-layer"
  });

  await controls.getByLabel("Show Selection Box", { exact: true }).uncheck();
  await controls.getByLabel("Show Metadata Box", { exact: true }).check();
  await controls.getByLabel("Show Collision Envelope", { exact: true }).check();
  await controls.getByLabel("Show Clearance Envelope", { exact: true }).check();
  await controls.getByLabel("Show Annotations", { exact: true }).uncheck();
  await expect(controls.getByLabel("Show Annotation Leader Lines", { exact: true })).toBeDisabled();
  await controls.getByLabel("Show Annotations", { exact: true }).check();
  await controls.getByLabel("Show Annotation Leader Lines", { exact: true }).uncheck();
  await controls.getByLabel("Show Connection Points", { exact: true }).check();
  await controls.getByRole("combobox", {
    name: "Connection Point Display Mode",
    exact: true
  }).selectOption("all");

  await expect.poll(() => page.evaluate(() => {
    const raw = window.localStorage.getItem("atrvisu.overlaySettings");
    return raw ? JSON.parse(raw) : null;
  })).toMatchObject({
    showSelectionBox: false,
    showMetadataBox: true,
    showCollisionEnvelope: true,
    showClearanceEnvelope: true,
    showAnnotations: true,
    showAnnotationLeaderLines: false,
    showConnectionPoints: true,
    connectionPointDisplayMode: "all"
  });

  await page.getByRole("button", { name: "Close Display / Overlay Controls" }).click();
  await expect(surface).toHaveCount(0);
  expect(await getRuntimePanel(page, "panel.displayOverlayControls")).toMatchObject({
    visible: false,
    open: false
  });
  const after = await getRuntimeViewportSnapshot(page);
  expect(after.invariants).toEqual(before.invariants);
  expect(after.camera).toEqual(before.camera);
  expect(after.viewport?.sceneLifecycleGeneration).toBe(before.viewport?.sceneLifecycleGeneration);
  await expect(page.getByTestId("editor-host")).toHaveCount(1);
  await expect(page.locator("canvas.scene-canvas")).toHaveCount(1);
  expect(errors).toEqual([]);
});

test("real ATARA sales line uses the final workbench composition", async ({ page }) => {
  const errors = collectPageErrors(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await openCleanApp(page);
  const canvas = page.getByLabel("AtrVisu 3D workspace");
  const lifecycleGeneration = await canvas.getAttribute("data-scene-lifecycle-generation");

  const lineAssets = [
    { name: "Flow Pack Machine", groups: ["Primary Packaging", "Horizontal Flow Pack"], xMm: "0" },
    { name: "Belt Conveyor", groups: ["Conveyors", "Belt Conveyors"], xMm: "4200" },
    { name: "Robot Palletizer", groups: ["Palletizing", "Robot Palletizers"], xMm: "9800" }
  ] as const;

  for (const [index, asset] of lineAssets.entries()) {
    await addCanonicalAtaraMachine(page, asset.name, asset.groups);
    await waitForMachineDiagnostics(page, index + 1);
    const properties = page.getByLabel("Selected machine properties");
    await expect(properties).toBeVisible();
    await properties.getByLabel("Plan X").fill(asset.xMm);
    await properties.getByLabel("Plan X").blur();
  }

  await expect(page.getByTestId("workbench-status-bar")).toContainText("Selected: 1");
  await expect(page.getByTestId("workbench-status-bar")).toContainText("Unit: mm");
  await expect(page.getByTestId("workbench-status-bar")).toContainText("Unsaved");

  await openPrimaryDockPanel(page, "panel.layoutExplorer");
  const explorer = page.getByTestId("layout-explorer");
  for (const asset of lineAssets) {
    await expect(explorer).toContainText(asset.name);
  }
  const flowPackRow = explorer.locator(".layout-explorer-row").filter({ hasText: "Flow Pack Machine" });
  const conveyorRow = explorer.locator(".layout-explorer-row").filter({ hasText: "Belt Conveyor" });
  const palletizerRow = explorer.locator(".layout-explorer-row").filter({ hasText: "Robot Palletizer" });
  await flowPackRow.click();
  await expect(flowPackRow).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByTestId("schema-property-inspector")).toBeVisible();
  await expect(page.getByTestId("atara-machine-data-diagnostics")).toHaveAttribute(
    "data-schema-id",
    "schema.atara.machine"
  );

  const machineIds = await getMachineIds(page);
  await clickSceneMachine(page, machineIds[1]);
  await expect(conveyorRow).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByTestId("workbench-status-bar")).toContainText("Belt Conveyor (machine)");

  await flowPackRow.click();
  await conveyorRow.click({ modifiers: ["Control"] });
  await palletizerRow.click({ modifiers: ["Control"] });
  await expect(page.getByTestId("workbench-status-bar")).toContainText("Selected: 3");

  await openPrimaryDockPanel(page, "panel.layers");
  page.once("dialog", (dialog) => dialog.accept("ATARA Sales Line"));
  await page.getByTestId("add-layer").click();
  await expect(page.locator(".layer-row").filter({ hasText: "ATARA Sales Line" })).toBeVisible();

  await openPrimaryDockPanel(page, "panel.groups");
  page.once("dialog", (dialog) => dialog.accept("ATARA Packaging Cell"));
  await page.getByTestId("create-group-from-selection").click();
  await expect(page.locator(".assembly-group-row").filter({ hasText: "ATARA Packaging Cell" }))
    .toContainText("3 items");

  await getCommandBarCommand(page, "view.viewpoints").click();
  await expect(page.getByTestId("bottom-dock")).toHaveAttribute("data-collapsed", "false");
  await page.getByTestId("viewpoint-name-input").fill("ATARA Sales Review");
  await page.getByTestId("capture-viewpoint").click();
  await expect(page.getByRole("button", { name: /ATARA Sales Review/i })).toBeVisible();

  const toolsMenu = await openWorkbenchMenu(page, "Tools");
  await toolsMenu.locator('[data-command-id="library.manager"]').click();
  await expect(page.getByTestId("library-manager-modal")).toBeVisible();
  await page.getByTestId("close-library-manager-header").click();
  await expect(page.getByTestId("library-manager-modal")).toHaveCount(0);

  await expect(canvas).toHaveAttribute("data-scene-lifecycle-generation", lifecycleGeneration ?? "");
  expect(errors).toEqual([]);
});

test("app shell zone anchors are rendered without red console errors", async ({ page }) => {
  const errors = collectPageErrors(page);
  await openCleanApp(page);

  for (const zone of ["app-root", "scene-viewport", "machine-library", "machine-properties", "modal-layer"]) {
    await expect(page.locator(`[data-app-shell-zone="${zone}"]`)).toHaveCount(1);
  }
  await expect(page.getByTestId("workbench-application-bar")).toBeVisible();
  await expect(page.getByTestId("workbench-menu-bar")).toBeVisible();
  await expect(page.getByTestId("workbench-command-bar")).toBeVisible();

  expect(errors).toEqual([]);
});

test("workbench chrome keyboard and responsive geometry preserve the editor lifecycle", async ({ page }) => {
  const errors = collectPageErrors(page);
  await openCleanApp(page);
  const before = await waitForRuntimeViewport(page);

  const applicationBar = page.getByTestId("workbench-application-bar");
  const menuBar = page.getByTestId("workbench-menu-bar");
  const commandBar = page.getByTestId("workbench-command-bar");
  await expect(applicationBar).toBeVisible();
  await expect(menuBar).toBeVisible();
  await expect(commandBar).toBeVisible();
  await expect(page.locator('[data-workbench-region="editor-host"]')).toHaveCount(1);
  await expect(page.locator("canvas.scene-canvas")).toHaveCount(1);
  await expect(page.getByTestId("right-panel")).toHaveCount(1);

  const assertGeometry = async (width: number, height: number) => {
    await page.setViewportSize({ width, height });
    await expect.poll(async () => (await getRuntimeViewportSnapshot(page)).viewport?.cssWidth ?? 0)
      .toBeGreaterThan(0);
    const geometry = await page.evaluate(() => {
      const rect = (selector: string) => {
        const element = document.querySelector(selector);
        if (!element) throw new Error(`Missing geometry element: ${selector}`);
        const box = element.getBoundingClientRect();
        return { top: box.top, bottom: box.bottom, width: box.width, height: box.height };
      };
      return {
        application: rect('[data-testid="workbench-application-bar"]'),
        menu: rect('[data-testid="workbench-menu-bar"]'),
        command: rect('[data-testid="workbench-command-bar"]'),
        viewport: rect('[data-app-shell-zone="scene-viewport"]'),
        panel: rect('[data-testid="right-panel"]'),
        noHorizontalOverflow: document.documentElement.scrollWidth <= document.documentElement.clientWidth
      };
    });
    expect(geometry.application.bottom).toBeLessThanOrEqual(geometry.menu.top + 1);
    expect(geometry.menu.bottom).toBeLessThanOrEqual(geometry.command.top + 1);
    expect(geometry.command.bottom).toBeLessThanOrEqual(geometry.viewport.top + 1);
    expect(geometry.command.bottom).toBeLessThanOrEqual(geometry.panel.top + 1);
    expect(geometry.viewport.width).toBeGreaterThan(0);
    expect(geometry.viewport.height).toBeGreaterThan(0);
    expect(geometry.noHorizontalOverflow).toBe(true);
  };

  await assertGeometry(1280, 720);
  await assertGeometry(1024, 768);

  await page.locator(".machine-card").first().click();
  await waitForMachineDiagnostics(page, 1);

  const fileTrigger = menuBar.getByRole("menuitem", { name: "File", exact: true });
  await fileTrigger.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("menu", { name: "File", exact: true })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(fileTrigger).toBeFocused();

  const undoBefore = await getRuntimeCommandExecution(page, "edit.undo");
  await page.keyboard.press("Enter");
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("ArrowRight");
  const editTrigger = menuBar.getByRole("menuitem", { name: "Edit", exact: true });
  await expect(editTrigger).toHaveAttribute("aria-expanded", "true");
  const editMenu = page.getByRole("menu", { name: "Edit", exact: true });
  await expect(editMenu).toBeVisible();
  await expect(editMenu.getByRole("menuitem").first()).toBeFocused();
  await page.keyboard.press("Control+z");
  expect((await getRuntimeCommandExecution(page, "edit.undo")).attemptCount)
    .toBe(undoBefore.attemptCount);
  await page.keyboard.press("Escape");

  const after = await getRuntimeViewportSnapshot(page);
  expect(after.viewport?.sceneLifecycleGeneration).toBe(before.viewport?.sceneLifecycleGeneration);
  await expect(page.locator("canvas.scene-canvas")).toHaveCount(1);
  expect(errors).toEqual([]);
});

test("visual acceptance chrome remains readable and lifecycle-stable", async ({ page }) => {
  const errors = collectPageErrors(page);
  await page.setViewportSize({ width: 1024, height: 768 });
  await openCleanApp(page);
  const before = await waitForRuntimeViewport(page);

  const editMenu = await openWorkbenchMenu(page, "Edit");
  const redo = editMenu.locator('[data-command-id="edit.redo"]');
  const redoLabel = redo.locator(".workbench-menu-item-label");
  const redoShortcut = redo.locator(".workbench-menu-item-shortcut");
  await expect(redoLabel).toHaveText("Redo");
  await expect(redoShortcut).toHaveText("Ctrl/Cmd+Y or Ctrl/Cmd+Shift+Z");
  await expect(redoShortcut).toHaveAttribute("data-multiline", "true");
  const menuGeometry = await redo.evaluate((element) => {
    const row = element.getBoundingClientRect();
    const label = element.querySelector(".workbench-menu-item-label")?.getBoundingClientRect();
    const shortcut = element.querySelector(".workbench-menu-item-shortcut")?.getBoundingClientRect();
    if (!label || !shortcut) throw new Error("Redo layout regions are missing.");
    return {
      row: { left: row.left, right: row.right, top: row.top, bottom: row.bottom },
      label: { left: label.left, right: label.right, top: label.top, bottom: label.bottom },
      shortcut: {
        left: shortcut.left,
        right: shortcut.right,
        top: shortcut.top,
        bottom: shortcut.bottom,
        scrollWidth: (element.querySelector(".workbench-menu-item-shortcut") as HTMLElement).scrollWidth,
        clientWidth: (element.querySelector(".workbench-menu-item-shortcut") as HTMLElement).clientWidth
      }
    };
  });
  expect(menuGeometry.label.right).toBeLessThanOrEqual(menuGeometry.shortcut.left + 1);
  expect(menuGeometry.label.left).toBeGreaterThanOrEqual(menuGeometry.row.left);
  expect(menuGeometry.shortcut.right).toBeLessThanOrEqual(menuGeometry.row.right);
  expect(menuGeometry.label.top).toBeGreaterThanOrEqual(menuGeometry.row.top);
  expect(menuGeometry.shortcut.bottom).toBeLessThanOrEqual(menuGeometry.row.bottom + 1);
  expect(menuGeometry.shortcut.scrollWidth).toBeLessThanOrEqual(menuGeometry.shortcut.clientWidth + 1);
  await page.keyboard.press("Escape");

  const inspector = page.getByTestId("right-panel");
  await expect(inspector.getByText("Inspector", { exact: true })).toBeVisible();
  await expect(inspector.getByRole("button", { name: "Collapse Inspector" })).toHaveCount(1);
  for (const globalTool of ["Project Manager", "Library Manager", "Performance Benchmark", "Collision Check"]) {
    await expect(inspector.getByText(globalTool, { exact: true })).toHaveCount(0);
  }
  const panelGeometry = await inspector.locator(".workbench-inspector-header").evaluate((element) => {
    const box = element.getBoundingClientRect();
    return {
      width: box.width,
      scrollWidth: (element as HTMLElement).scrollWidth,
      clientWidth: (element as HTMLElement).clientWidth
    };
  });
  expect(panelGeometry.width).toBeGreaterThan(0);
  expect(panelGeometry.scrollWidth).toBeLessThanOrEqual(panelGeometry.clientWidth + 1);

  const applicationBar = page.getByTestId("workbench-application-bar");
  const save = applicationBar.locator('[data-command-id="project.save"]');
  await expect(save).toBeVisible();
  await expect(applicationBar.locator('[data-command-id="project.save"]')).toHaveCount(1);
  await expect(applicationBar.locator(".workbench-save-state")).toBeVisible();
  await expect(applicationBar.locator(".workbench-project-context")).toBeVisible();
  const applicationGeometry = await applicationBar.evaluate((element) => {
    const box = (selector: string) => {
      const target = element.querySelector(selector);
      if (!target) throw new Error(`Missing application-bar region: ${selector}`);
      const rect = target.getBoundingClientRect();
      return { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom };
    };
    return {
      state: box(".workbench-save-state"),
      save: box(".workbench-save-command"),
      context: box(".workbench-project-context")
    };
  });
  expect(applicationGeometry.state.right).toBeLessThanOrEqual(applicationGeometry.save.left + 1);
  expect(applicationGeometry.save.right).toBeLessThanOrEqual(applicationGeometry.context.left + 1);

  const after = await waitForRuntimeViewport(page);
  expect(after.viewport?.sceneLifecycleGeneration).toBe(before.viewport?.sceneLifecycleGeneration);
  await expect(page.getByTestId("editor-host")).toHaveCount(1);
  await expect(page.locator("canvas.scene-canvas")).toHaveCount(1);
  expect(errors).toEqual([]);
});

test("command bar arrow navigation is isolated from editor nudge state", async ({ page }) => {
  const errors = collectPageErrors(page);
  await openCleanApp(page);
  await page.locator(".machine-card").first().click();
  await waitForMachineDiagnostics(page, 1);

  const [machineId] = await getMachineIds(page);
  const beforePosition = (await readCanvasRecord<PlanPosition>(
    page,
    "data-machine-plan-positions"
  ))[machineId];
  const before = await getRuntimeViewportSnapshot(page);
  const beforeExecutions = await getRuntimeCommandExecutionSnapshot(page);
  const commandBar = page.getByTestId("workbench-command-bar");
  const firstButton = commandBar.locator("button:not(:disabled)").first();
  await firstButton.focus();
  const firstCommandId = await firstButton.getAttribute("data-command-id");

  await page.keyboard.press("ArrowRight");
  const secondCommandId = await page.evaluate(() =>
    (document.activeElement as HTMLElement | null)?.dataset.commandId ?? null
  );
  expect(secondCommandId).not.toBe(firstCommandId);
  await page.keyboard.press("ArrowLeft");
  await expect(firstButton).toBeFocused();

  const after = await getRuntimeViewportSnapshot(page);
  const afterPosition = (await readCanvasRecord<PlanPosition>(
    page,
    "data-machine-plan-positions"
  ))[machineId];
  expect(after.invariants.selectionIds).toEqual(before.invariants.selectionIds);
  expect(after.invariants.primarySelectionId).toBe(before.invariants.primarySelectionId);
  expect(afterPosition).toEqual(beforePosition);
  expect(after.invariants.undoDepth).toBe(before.invariants.undoDepth);
  expect(after.invariants.redoDepth).toBe(before.invariants.redoDepth);
  expect(after.invariants.projectDirty).toBe(before.invariants.projectDirty);
  expect(await getRuntimeCommandExecutionSnapshot(page)).toEqual(beforeExecutions);
  expect(errors).toEqual([]);
});

test("640x800 workbench preserves chrome and mobile bottom-panel geometry", async ({ page }) => {
  const errors = collectPageErrors(page);
  await page.setViewportSize({ width: 640, height: 800 });
  await openCleanApp(page);
  await expect(page.getByTestId("primary-dock-resize-handle")).toHaveCount(0);
  await expect(page.getByTestId("bottom-dock-resize-handle")).toHaveCount(0);
  const before = await waitForRuntimeViewport(page);
  const rightPanel = page.getByTestId("right-panel");
  await expect(rightPanel).toBeHidden();
  await page.getByRole("button", { name: "Collapse Primary Dock" }).click();
  await expect(rightPanel).toBeVisible();
  const geometry = await page.evaluate(() => {
    const rect = (selector: string) => {
      const element = document.querySelector(selector);
      if (!element) throw new Error(`Missing geometry element: ${selector}`);
      const box = element.getBoundingClientRect();
      return { top: box.top, bottom: box.bottom, width: box.width, height: box.height };
    };
    return {
      application: rect('[data-testid="workbench-application-bar"]'),
      menu: rect('[data-testid="workbench-menu-bar"]'),
      command: rect('[data-testid="workbench-command-bar"]'),
      viewport: rect('[data-app-shell-zone="scene-viewport"]'),
      panel: rect('[data-testid="right-panel"]'),
      viewportHeight: window.innerHeight,
      noHorizontalOverflow: document.documentElement.scrollWidth <= document.documentElement.clientWidth
    };
  });

  expect(geometry.application.bottom).toBeLessThanOrEqual(geometry.menu.top + 1);
  expect(geometry.menu.bottom).toBeLessThanOrEqual(geometry.command.top + 1);
  expect(geometry.command.bottom).toBeLessThanOrEqual(geometry.viewport.top + 1);
  expect(geometry.viewport.width).toBeGreaterThan(0);
  expect(geometry.viewport.height).toBeGreaterThan(0);
  expect(Math.abs(geometry.panel.bottom - (geometry.viewportHeight - 28))).toBeLessThanOrEqual(1);
  expect(geometry.panel.top).not.toBeCloseTo(geometry.command.bottom, 0);
  expect(geometry.panel.height).toBeLessThanOrEqual(361);
  expect(geometry.panel.height).toBeCloseTo(Math.min(800 * 0.44, 360), 0);
  expect(geometry.panel.height).toBeLessThan(geometry.viewport.height);
  expect(geometry.noHorizontalOverflow).toBe(true);

  await rightPanel.getByRole("button", { name: "Collapse Inspector", exact: true }).click();
  await expect(rightPanel).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Open Inspector" })).toBeVisible();
  await expect(page.getByTestId("editor-host")).toHaveCount(1);
  await expect(page.locator("canvas.scene-canvas")).toHaveCount(1);
  await page.getByRole("button", { name: "Open Inspector" }).click();
  await expect(page.getByTestId("right-panel")).toBeVisible();
  await getCommandBarCommand(page, "view.viewpoints").click();
  await expect(page.getByTestId("bottom-dock")).toHaveAttribute("data-collapsed", "false");
  expect(await page.getByTestId("bottom-dock").evaluate((element) =>
    element.scrollWidth <= element.clientWidth
  )).toBe(true);
  expect(await page.locator(".workbench-bottom-dock-content").evaluate((element) =>
    element.scrollWidth <= element.clientWidth && element.scrollHeight <= element.clientHeight
  )).toBe(true);
  const after = await waitForRuntimeViewport(page);
  expect(after.viewport?.sceneLifecycleGeneration).toBe(before.viewport?.sceneLifecycleGeneration);
  await expect(page.getByTestId("editor-host")).toHaveCount(1);
  await expect(page.locator("canvas.scene-canvas")).toHaveCount(1);
  expect(errors).toEqual([]);
});

test("dark and light modal backdrops resolve from the semantic scrim", async ({ page }) => {
  const errors = collectPageErrors(page);
  await openCleanApp(page);
  await page.locator(".av-design-system-root").evaluate((element) => {
    element.setAttribute("data-av-theme", "light");
  });
  const toolsMenu = await openWorkbenchMenu(page, "Tools");
  await toolsMenu.locator('[data-command-id="library.manager"]').click();
  const backdrop = page.locator(".manager-backdrop");
  const dialog = page.getByTestId("library-manager-modal");
  await expect(dialog).toBeVisible();
  const lightScrim = await backdrop.evaluate((element) => ({
    background: getComputedStyle(element).backgroundColor,
    token: getComputedStyle(element).getPropertyValue("--av-surface-scrim").trim()
  }));
  expect(lightScrim).toEqual({
    background: "rgba(18, 27, 24, 0.42)",
    token: "rgba(18, 27, 24, 0.42)"
  });
  expect(await dialog.evaluate((element) => getComputedStyle(element).backgroundColor))
    .toBe("rgb(255, 255, 255)");
  expect(await dialog.evaluate((element) => getComputedStyle(element).color))
    .toBe("rgb(23, 33, 30)");

  await page.locator(".av-design-system-root").evaluate((element) => {
    element.setAttribute("data-av-theme", "dark");
  });
  const darkScrim = await backdrop.evaluate((element) => ({
    background: getComputedStyle(element).backgroundColor,
    token: getComputedStyle(element).getPropertyValue("--av-surface-scrim").trim()
  }));
  expect(darkScrim).toEqual({
    background: "rgba(0, 0, 0, 0.7)",
    token: "rgba(0, 0, 0, 0.7)"
  });
  expect(await dialog.evaluate((element) => getComputedStyle(element).backgroundColor))
    .toBe("rgb(17, 24, 26)");
  expect(await dialog.evaluate((element) => getComputedStyle(element).color))
    .toBe("rgb(244, 247, 242)");
  await page.getByTestId("close-library-manager-header").click();
  await expect(dialog).toHaveCount(0);
  expect(errors).toEqual([]);
});

test("command bar toggles and tool commands use live runtime surfaces", async ({ page }) => {
  const errors = collectPageErrors(page);
  await openCleanApp(page);
  const before = await waitForRuntimeViewport(page);

  for (const commandId of [
    "view.toggleLabels",
    "view.showMeasurements",
    "view.toggleConnectionPoints"
  ]) {
    const button = getCommandBarCommand(page, commandId);
    const pressedBefore = await button.getAttribute("aria-pressed");
    await expectOneRuntimeCommandExecution(page, commandId, () => button.click());
    await expect(button).toHaveAttribute("aria-pressed", pressedBefore === "true" ? "false" : "true");
  }

  await expectRuntimeCommandExecutionOnce(page, "view.viewpoints", () =>
    getCommandBarCommand(page, "view.viewpoints").click()
  );
  await expect.poll(async () => (await getRuntimePanel(page, "panel.viewpoints"))?.open).toBe(true);

  let toolsMenu = await openWorkbenchMenu(page, "Tools");
  await expectOneRuntimeCommandExecution(page, "library.manager", () =>
    toolsMenu.locator('[data-command-id="library.manager"]').click()
  );
  await expect(page.getByTestId("library-manager-modal")).toBeVisible();
  await page.getByTestId("close-library-manager-header").click();
  await expect(page.getByTestId("library-manager-modal")).toHaveCount(0);

  toolsMenu = await openWorkbenchMenu(page, "Tools");
  await expectOneRuntimeCommandExecution(page, "performance.benchmark", () =>
    toolsMenu.locator('[data-command-id="performance.benchmark"]').click()
  );
  await expect(page.getByTestId("performance-benchmark-modal")).toBeVisible();
  await page.getByTestId("close-performance-benchmark").click();
  await expect(page.getByTestId("performance-benchmark-modal")).toHaveCount(0);

  const after = await getRuntimeViewportSnapshot(page);
  expect(after.viewport?.sceneLifecycleGeneration).toBe(before.viewport?.sceneLifecycleGeneration);
  expect(errors).toEqual([]);
});

test("runtime panel registry opens and closes the actual Machine Library section", async ({ page }) => {
  const errors = collectPageErrors(page);
  await openCleanApp(page);
  const canvas = page.getByLabel("AtrVisu 3D workspace");
  const lifecycleGeneration = await canvas.getAttribute("data-scene-lifecycle-generation");
  const resizeGeneration = (await waitForRuntimeViewport(page)).viewport?.resizeGeneration;

  expect(await invokeRuntimePanel(page, "close", "panel.machineLibrary")).toMatchObject({
    handled: true,
    status: "executed"
  });
  await expect(page.getByTestId("machine-library-panel")).toBeHidden();
  await expect(page.getByTestId("primary-dock")).toHaveAttribute("data-collapsed", "true");
  await expect.poll(async () => (await getRuntimePanel(page, "panel.machineLibrary"))?.open).toBe(false);

  expect(await invokeRuntimePanel(page, "open", "panel.machineLibrary")).toMatchObject({
    handled: true,
    status: "executed"
  });
  await expect(page.getByTestId("machine-library-panel")).toBeVisible();
  await expect(page.getByTestId("primary-dock")).toHaveAttribute("data-collapsed", "false");
  await expect.poll(async () => (await getRuntimePanel(page, "panel.machineLibrary"))?.open).toBe(true);

  expect(await invokeRuntimePanel(page, "close", "panel.machineLibrary")).toMatchObject({
    handled: true,
    status: "executed"
  });
  await expect(page.getByTestId("machine-library-panel")).toBeHidden();
  await expect(canvas).toHaveAttribute("data-scene-lifecycle-generation", lifecycleGeneration ?? "");
  await expect.poll(async () =>
    (await getRuntimeViewportSnapshot(page)).viewport?.resizeGeneration ?? 0
  ).toBeGreaterThan(resizeGeneration ?? 0);
  expect(errors).toEqual([]);
});

test("orthographic activation and wheel zoom preserve runtime invariants", async ({ page }) => {
  const errors = collectPageErrors(page);
  await openCleanApp(page);
  const canvas = page.getByLabel("AtrVisu 3D workspace");
  await page.locator(".machine-card").first().click();
  await waitForMachineDiagnostics(page, 1);
  const [machineId] = await getMachineIds(page);
  const perspective = await waitForRuntimeViewport(page);
  const perspectiveBounds = await getMachineScreenBounds(page, machineId);

  expect(await applyRuntimeViewportCameraState(page)).toBe(true);
  await expect.poll(async () =>
    (await getRuntimeViewportSnapshot(page)).camera?.mode
  ).toBe("orthographic");
  const activated = await waitForRuntimeViewport(page);
  const activatedBounds = await getMachineScreenBounds(page, machineId);
  const activatedIntent = activated.camera?.orthographicIntent;

  expect(activatedIntent).toBeDefined();
  expect(activatedIntent?.verticalWorldSpan).toBeGreaterThan(1);
  expect(activatedIntent?.verticalWorldSpan)
    .toBeLessThan((activated.viewport?.cssHeight ?? 0) / 10);
  expect(activatedIntent?.horizontalWorldUnitsPerPixel)
    .toBeCloseTo(activatedIntent?.verticalWorldUnitsPerPixel ?? Number.NaN);
  expect(activatedBounds.width).toBeGreaterThan(perspectiveBounds.width * 0.35);
  expect(activatedBounds.width).toBeLessThan(perspectiveBounds.width * 3);
  expect(activated.viewport?.sceneLifecycleGeneration)
    .toBe(perspective.viewport?.sceneLifecycleGeneration);
  expect(activated.invariants).toEqual(perspective.invariants);

  const point = await getMachineScreenPoint(page, machineId);
  const canvasBox = await canvas.boundingBox();
  if (!canvasBox || !point) {
    throw new Error("Machine wheel target is unavailable.");
  }
  await page.mouse.move(canvasBox.x + point.x, canvasBox.y + point.y);
  await page.mouse.wheel(0, -240);
  await expect.poll(async () =>
    (await getRuntimeViewportSnapshot(page)).camera?.orthographicIntent?.verticalWorldSpan ?? Infinity
  ).toBeLessThan(activatedIntent?.verticalWorldSpan ?? 0);
  await expect.poll(async () =>
    (await readCanvasRecord<ScreenBounds>(
      page,
      "data-machine-screen-bounds"
    ))[machineId]?.width ?? 0
  ).toBeGreaterThan(activatedBounds.width);
  const zoomedIn = await getRuntimeViewportSnapshot(page);
  const zoomedInBounds = await getMachineScreenBounds(page, machineId);
  expect(zoomedInBounds.width).toBeGreaterThan(activatedBounds.width);
  expect(zoomedIn.camera?.radius).toBeCloseTo(activated.camera?.radius ?? Number.NaN);
  expect(zoomedIn.camera?.targetX).toBeCloseTo(activated.camera?.targetX ?? Number.NaN);
  expect(zoomedIn.camera?.targetY).toBeCloseTo(activated.camera?.targetY ?? Number.NaN);
  expect(zoomedIn.camera?.targetZ).toBeCloseTo(activated.camera?.targetZ ?? Number.NaN);
  expect(zoomedIn.invariants).toEqual(activated.invariants);

  await page.mouse.wheel(0, 240);
  await expect.poll(async () =>
    (await getRuntimeViewportSnapshot(page)).camera?.orthographicIntent?.verticalWorldSpan ?? 0
  ).toBeGreaterThan(zoomedIn.camera?.orthographicIntent?.verticalWorldSpan ?? Infinity);
  await expect.poll(async () =>
    (await readCanvasRecord<ScreenBounds>(
      page,
      "data-machine-screen-bounds"
    ))[machineId]?.width ?? Infinity
  ).toBeLessThan(zoomedInBounds.width);
  const zoomedOut = await getRuntimeViewportSnapshot(page);
  const zoomedOutBounds = await getMachineScreenBounds(page, machineId);
  expect(zoomedOutBounds.width).toBeLessThan(zoomedInBounds.width);
  expect(zoomedOut.camera?.orthographicIntent?.horizontalWorldUnitsPerPixel)
    .toBeCloseTo(
      zoomedOut.camera?.orthographicIntent?.verticalWorldUnitsPerPixel ?? Number.NaN
    );
  expect(zoomedOut.viewport?.sceneLifecycleGeneration)
    .toBe(activated.viewport?.sceneLifecycleGeneration);
  expect(zoomedOut.invariants).toEqual(activated.invariants);

  expect(await page.evaluate(() => window.__atrvisuRuntimeViewport?.applyCameraState({
    mode: "orthographic",
    alpha: 0.7,
    beta: 1.05,
    radius: 34,
    targetX: 1,
    targetY: 0,
    targetZ: -2,
    orthographic: {
      centerX: 0,
      centerY: 0,
      verticalWorldSpan: Number.NaN
    }
  }) ?? true)).toBe(false);
  expect(errors).toEqual([]);
});

test("orthographic framing survives panel and browser aspect-ratio changes after zoom", async ({ page }) => {
  const errors = collectPageErrors(page);
  await openCleanApp(page);
  const canvas = page.getByLabel("AtrVisu 3D workspace");
  await page.locator(".machine-card").first().click();
  await waitForMachineDiagnostics(page, 1);
  const [machineId] = await getMachineIds(page);
  expect(await applyRuntimeViewportCameraState(page)).toBe(true);
  await expect.poll(async () =>
    (await getRuntimeViewportSnapshot(page)).camera?.mode
  ).toBe("orthographic");
  const point = await getMachineScreenPoint(page, machineId);
  const canvasBox = await canvas.boundingBox();
  if (!canvasBox || !point) {
    throw new Error("Machine wheel target is unavailable.");
  }
  await page.mouse.move(canvasBox.x + point.x, canvasBox.y + point.y);
  await page.mouse.wheel(0, -180);
  await expect.poll(async () =>
    (await getRuntimeViewportSnapshot(page)).camera?.orthographicIntent?.verticalWorldSpan ?? Infinity
  ).toBeLessThan(25);
  const before = await waitForRuntimeViewport(page);
  const rightPanel = page.getByTestId("right-panel");
  const widthBefore = await rightPanel.evaluate((element) => element.getBoundingClientRect().width);

  expect(await invokeRuntimePanel(page, "open", "panel.layers")).toMatchObject({ handled: true });
  await expect(page.getByTestId("layers-panel")).toBeVisible();

  expect(await invokeRuntimePanel(page, "close", "panel.rightPanelShell")).toMatchObject({ handled: true });
  await expect(rightPanel).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Open Inspector" })).toBeVisible();
  await expect.poll(async () =>
    (await getRuntimeViewportSnapshot(page)).viewport?.cssWidth ?? 0
  ).toBeGreaterThan(before.viewport?.cssWidth ?? Number.MAX_SAFE_INTEGER);
  const collapsed = await getRuntimeViewportSnapshot(page);
  expect(collapsed.viewport?.resizeGeneration).toBe((before.viewport?.resizeGeneration ?? 0) + 1);
  expect(collapsed.viewport?.lastResizeReason).toBe("dock-collapse");
  expect(collapsed.viewport?.sceneLifecycleGeneration).toBe(before.viewport?.sceneLifecycleGeneration);
  expect(collapsed.camera?.orthographicIntent?.viewportAspectRatio)
    .not.toBeCloseTo(before.camera?.orthographicIntent?.viewportAspectRatio ?? Number.NaN);
  expectOrthographicFramingEquivalent(before, collapsed);
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
  expect(reopened.viewport?.lastResizeReason).toBe("dock-collapse");
  expect(reopened.viewport?.sceneLifecycleGeneration).toBe(before.viewport?.sceneLifecycleGeneration);
  expectOrthographicFramingEquivalent(before, reopened);
  expect(reopened.invariants).toEqual(before.invariants);

  await page.setViewportSize({ width: 1100, height: 850 });
  await expect.poll(async () => {
    const runtimeHeight = (await getRuntimeViewportSnapshot(page)).viewport?.cssHeight;
    const renderedHeight = await page.locator('[data-app-shell-zone="scene-viewport"]')
      .evaluate((element) => Math.round(element.getBoundingClientRect().height));
    return runtimeHeight === renderedHeight;
  }).toBe(true);
  await expect.poll(async () =>
    (await getRuntimeViewportSnapshot(page)).viewport?.lastResizeReason
  ).toBe("window");
  const browserResized = await getRuntimeViewportSnapshot(page);
  expect(browserResized.viewport?.sceneLifecycleGeneration)
    .toBe(before.viewport?.sceneLifecycleGeneration);
  expect(browserResized.camera?.orthographicIntent?.viewportAspectRatio)
    .not.toBeCloseTo(reopened.camera?.orthographicIntent?.viewportAspectRatio ?? Number.NaN);
  expectOrthographicFramingEquivalent(before, browserResized);
  expect(browserResized.invariants).toEqual(before.invariants);
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
  expect(after.viewport?.lastResizeReason).toBe("dock-resize");
  expect(after.viewport?.sceneLifecycleGeneration).toBe(before.viewport?.sceneLifecycleGeneration);
  expect(after.camera).toEqual(before.camera);
  expect(after.invariants).toEqual(before.invariants);
  expect(errors).toEqual([]);
});

test("Primary and Bottom Dock resizing persists without changing editor state", async ({ page }) => {
  const errors = collectPageErrors(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await openCleanApp(page);
  await waitForUiPreferences(page);
  await page.locator(".machine-card").first().click();
  await waitForMachineDiagnostics(page, 1);
  await getCommandBarCommand(page, "view.viewpoints").click();
  await expect(page.getByTestId("bottom-dock")).toHaveAttribute("data-collapsed", "false");
  await openPrimaryDockPanel(page, "panel.layoutExplorer");

  const before = await waitForRuntimeViewport(page);
  const primaryDock = page.getByTestId("primary-dock");
  const bottomDock = page.getByTestId("bottom-dock");
  const primaryWidthBefore = await primaryDock.evaluate((element) => element.getBoundingClientRect().width);
  const bottomHeightBefore = await bottomDock.evaluate((element) => element.getBoundingClientRect().height);
  expect(bottomHeightBefore).toBeGreaterThanOrEqual(120);
  expect(bottomHeightBefore).toBeLessThanOrEqual(150);

  const primaryResize = page.getByTestId("primary-dock-resize-handle");
  await expect(primaryResize).toHaveAttribute("aria-label", "Resize Primary Dock");
  const primaryHandleBounds = await primaryResize.boundingBox();
  if (!primaryHandleBounds) {
    throw new Error("Primary Dock resize handle bounds are unavailable.");
  }
  await page.mouse.move(
    primaryHandleBounds.x + primaryHandleBounds.width / 2,
    primaryHandleBounds.y + 80
  );
  await page.mouse.down();
  await page.mouse.move(primaryHandleBounds.x + 80, primaryHandleBounds.y + 80, { steps: 6 });
  await page.mouse.up();
  await expect.poll(() => primaryDock.evaluate((element) => element.getBoundingClientRect().width))
    .toBeGreaterThan(primaryWidthBefore);
  const widerPrimaryWidth = await primaryDock.evaluate((element) => element.getBoundingClientRect().width);
  const widerHandleBounds = await primaryResize.boundingBox();
  if (!widerHandleBounds) {
    throw new Error("Resized Primary Dock handle bounds are unavailable.");
  }
  await page.mouse.move(widerHandleBounds.x + widerHandleBounds.width / 2, widerHandleBounds.y + 80);
  await page.mouse.down();
  await page.mouse.move(widerHandleBounds.x - 96, widerHandleBounds.y + 80, { steps: 6 });
  await page.mouse.up();
  await expect.poll(() => primaryDock.evaluate((element) => element.getBoundingClientRect().width))
    .toBeLessThan(primaryWidthBefore);
  const resizedPrimaryWidth = await primaryDock.evaluate((element) => element.getBoundingClientRect().width);
  expect(resizedPrimaryWidth).toBeLessThan(widerPrimaryWidth);

  await expect(page.getByTestId("primary-dock-tab-panel.layoutExplorer"))
    .toHaveAttribute("aria-pressed", "true");
  const explorerRow = page.locator(".layout-explorer-row").first();
  await expect(explorerRow).toBeVisible();
  await expect(explorerRow).toHaveAttribute("title", /Machine.*Default/);
  expect(await page.locator('[data-panel-id="panel.layoutExplorer"]').evaluate((element) =>
    element.scrollWidth <= element.clientWidth
  )).toBe(true);

  const bottomResize = page.getByTestId("bottom-dock-resize-handle");
  await expect(bottomResize).toHaveAttribute("aria-label", "Resize Bottom Dock");
  const bottomHandleBounds = await bottomResize.boundingBox();
  if (!bottomHandleBounds) {
    throw new Error("Bottom Dock resize handle bounds are unavailable.");
  }
  await page.mouse.move(bottomHandleBounds.x + 120, bottomHandleBounds.y + bottomHandleBounds.height / 2);
  await page.mouse.down();
  await page.mouse.move(bottomHandleBounds.x + 120, bottomHandleBounds.y - 56, { steps: 6 });
  await page.mouse.up();
  await expect.poll(() => bottomDock.evaluate((element) => element.getBoundingClientRect().height))
    .toBeGreaterThan(bottomHeightBefore);
  const resizedBottomHeight = await bottomDock.evaluate((element) => element.getBoundingClientRect().height);

  await page.getByRole("button", { name: "Collapse Primary Dock", exact: true }).click();
  await expect(primaryDock).toHaveAttribute("data-collapsed", "true");
  await page.getByRole("button", { name: "Expand Primary Dock", exact: true }).click();
  await expect.poll(() => primaryDock.evaluate((element) => element.getBoundingClientRect().width))
    .toBe(resizedPrimaryWidth);

  await page.getByRole("button", { name: "Collapse Bottom Dock", exact: true }).click();
  await expect(bottomDock).toHaveAttribute("data-collapsed", "true");
  await page.getByRole("button", { name: "Expand Bottom Dock", exact: true }).click();
  await expect.poll(() => bottomDock.evaluate((element) => element.getBoundingClientRect().height))
    .toBe(resizedBottomHeight);

  await expect.poll(() => page.evaluate(() => {
    const panels = window.__atrvisuUiPreferences?.getSnapshot().preferences.panels ?? [];
    return {
      primary: panels.find((panel) => panel.panelId === "panel.primaryDockShell")?.size,
      bottom: panels.find((panel) => panel.panelId === "panel.bottomDockShell")?.size
    };
  })).toEqual({ primary: resizedPrimaryWidth, bottom: resizedBottomHeight });

  const afterResize = await getRuntimeViewportSnapshot(page);
  expect(afterResize.viewport?.sceneLifecycleGeneration).toBe(before.viewport?.sceneLifecycleGeneration);
  expect(afterResize.camera).toEqual(before.camera);
  expect(afterResize.invariants).toEqual(before.invariants);
  await expect(page.getByTestId("app-root")).toHaveCount(1);
  await expect(page.getByTestId("editor-host")).toHaveCount(1);
  await expect(page.locator("canvas.scene-canvas")).toHaveCount(1);

  await page.reload();
  await expect(page.getByTestId("app-root")).toBeVisible();
  await waitForUiPreferences(page);
  await expect.poll(() => primaryDock.evaluate((element) => element.getBoundingClientRect().width))
    .toBe(resizedPrimaryWidth);
  await expect.poll(() => bottomDock.evaluate((element) => element.getBoundingClientRect().height))
    .toBe(resizedBottomHeight);
  expect(errors).toEqual([]);
});

test("medium workbench constrains dock resizing around a dominant viewport", async ({ page }) => {
  const errors = collectPageErrors(page);
  await page.setViewportSize({ width: 1024, height: 768 });
  await openCleanApp(page);
  await waitForUiPreferences(page);

  const primaryDock = page.getByTestId("primary-dock");
  const resizeHandle = page.getByTestId("primary-dock-resize-handle");
  await expect(resizeHandle).toHaveAttribute("aria-valuemax", "344");
  await resizeHandle.focus();
  for (let index = 0; index < 8; index += 1) {
    await resizeHandle.press("ArrowRight");
  }
  await expect.poll(() => primaryDock.evaluate((element) => Math.round(element.getBoundingClientRect().width)))
    .toBe(344);
  await getCommandBarCommand(page, "view.viewpoints").click();
  await expect(page.getByTestId("bottom-dock")).toHaveAttribute("data-collapsed", "false");
  expect(await page.locator('[data-app-shell-zone="scene-viewport"]').evaluate((element) =>
    element.getBoundingClientRect().width
  )).toBeGreaterThanOrEqual(320);
  expect(await page.getByTestId("bottom-dock").evaluate((element) =>
    element.scrollWidth <= element.clientWidth
  )).toBe(true);
  expect(await page.locator(".workbench-bottom-dock-content").evaluate((element) =>
    element.scrollWidth <= element.clientWidth && element.scrollHeight <= element.clientHeight
  )).toBe(true);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth))
    .toBe(true);
  expect(errors).toEqual([]);
});

test("populated Viewpoints stays bounded across desktop, medium, and narrow workbenches", async ({ page }) => {
  const errors = collectPageErrors(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await openCleanApp(page);
  await getCommandBarCommand(page, "view.viewpoints").click();
  await expect(page.getByTestId("bottom-dock")).toHaveAttribute("data-collapsed", "false");

  const capture = async (name: string) => {
    await page.getByTestId("viewpoint-name-input").fill(name);
    await page.getByTestId("capture-viewpoint").click();
    await expect(page.getByRole("button", { name: new RegExp(name, "i") })).toBeVisible();
  };
  const expectSelectedCardRevealed = async (index: number) => {
    const item = page.locator(".viewpoint-list-item").nth(index - 1);
    await expect(item).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByTestId("viewpoint-context-actions")).toBeVisible();
    await expect(page.getByTestId("viewpoint-context-actions").getByRole("button"))
      .toHaveText(["Apply", "Update", "Rename", "Delete"]);
    await expect.poll(() => item.evaluate((element) => {
      const strip = element.closest('[data-testid="viewpoint-strip"]');
      if (!strip) {
        return false;
      }
      const itemBox = element.getBoundingClientRect();
      const stripBox = strip.getBoundingClientRect();
      return itemBox.left >= stripBox.left - 1 && itemBox.right <= stripBox.right + 1;
    })).toBe(true);
  };
  const expectBoundedPopulatedLayout = async () => {
    const contextActions = page.getByTestId("viewpoint-context-actions");
    await expect(contextActions).toBeVisible();
    for (const button of await contextActions.getByRole("button").all()) {
      await button.scrollIntoViewIfNeeded();
      await expect(button).toBeVisible();
      await expect(button).toBeEnabled();
    }
    const geometry = await page.evaluate(() => {
      const dock = document.querySelector('[data-testid="bottom-dock"]');
      const content = document.querySelector(".workbench-bottom-dock-content");
      const panel = document.querySelector('[data-testid="viewpoints-panel"]');
      const toolbar = document.querySelector('[data-testid="viewpoints-toolbar"]');
      const results = document.querySelector('[data-testid="viewpoints-results"]');
      const navigation = document.querySelector('[data-testid="viewpoint-navigation"]');
      const strip = document.querySelector('[data-testid="viewpoint-strip"]');
      const firstCard = strip?.querySelector(".viewpoint-list-item");
      const actions = document.querySelector('[data-testid="viewpoint-context-actions"]');
      if (!dock || !content || !panel || !toolbar || !results || !navigation || !strip || !firstCard || !actions) {
        throw new Error("Viewpoints populated layout is incomplete.");
      }
      const dockBox = dock.getBoundingClientRect();
      const contentBox = content.getBoundingClientRect();
      const panelBox = panel.getBoundingClientRect();
      const toolbarBox = toolbar.getBoundingClientRect();
      const resultsBox = results.getBoundingClientRect();
      const navigationBox = navigation.getBoundingClientRect();
      const actionsBox = actions.getBoundingClientRect();
      return {
        stablePanelRegions: panel.children.length === 2
          && panel.children[0] === toolbar
          && panel.children[1] === results,
        actionsOutsideStrip: !strip.contains(actions) && actions.parentElement === results,
        stripOwnedByNavigation: strip.parentElement === navigation,
        orderedRows: toolbarBox.bottom <= resultsBox.top + 1,
        panelInsideDock: panelBox.top >= contentBox.top - 1 && panelBox.bottom <= contentBox.bottom + 1,
        actionsInsideDock: actionsBox.left >= contentBox.left - 1
          && actionsBox.right <= contentBox.right + 1
          && actionsBox.bottom <= contentBox.bottom + 1,
        dockInsideDocument: dockBox.left >= -1 && dockBox.right <= document.documentElement.clientWidth + 1,
        noDockHorizontalOverflow: dock.scrollWidth <= dock.clientWidth,
        noContentVerticalOverflow: content.scrollHeight <= content.clientHeight,
        noDocumentHorizontalOverflow: document.documentElement.scrollWidth <= document.documentElement.clientWidth,
        stripOverflowX: getComputedStyle(strip).overflowX,
        stripOverflowY: getComputedStyle(strip).overflowY,
        stripScrollbarHidden: getComputedStyle(strip).scrollbarWidth === "none",
        stripCanRevealWholeCard: strip.clientWidth >= firstCard.getBoundingClientRect().width,
        responsiveActionRow: window.innerWidth > 1200 || actionsBox.top >= navigationBox.bottom - 1,
        stripHasOverflow: strip.scrollWidth > strip.clientWidth
      };
    });

    expect(geometry).toEqual({
      stablePanelRegions: true,
      actionsOutsideStrip: true,
      stripOwnedByNavigation: true,
      orderedRows: true,
      panelInsideDock: true,
      actionsInsideDock: true,
      dockInsideDocument: true,
      noDockHorizontalOverflow: true,
      noContentVerticalOverflow: true,
      noDocumentHorizontalOverflow: true,
      stripOverflowX: "auto",
      stripOverflowY: "hidden",
      stripScrollbarHidden: true,
      stripCanRevealWholeCard: true,
      responsiveActionRow: true,
      stripHasOverflow: true
    });
  };

  for (let index = 1; index <= 8; index += 1) {
    await capture(`Viewpoint ${index}`);
  }
  await expect(page.locator(".viewpoint-list-item")).toHaveCount(8);
  await expect(page.getByTestId("viewpoint-context-actions").getByRole("button"))
    .toHaveText(["Apply", "Update", "Rename", "Delete"]);
  await expect(page.getByTestId("viewpoint-strip-scroll-backward")).toBeVisible();
  await expect(page.getByTestId("viewpoint-strip-scroll-forward")).toBeVisible();
  await expectSelectedCardRevealed(8);
  await expectBoundedPopulatedLayout();

  const strip = page.getByTestId("viewpoint-strip");
  const initialScrollLeft = await strip.evaluate((element) => element.scrollLeft);
  await page.getByTestId("viewpoint-strip-scroll-backward").click();
  await expect.poll(() => strip.evaluate((element) => element.scrollLeft)).toBeLessThan(initialScrollLeft);
  const backwardScrollLeft = await strip.evaluate((element) => element.scrollLeft);
  await page.getByTestId("viewpoint-strip-scroll-forward").click();
  await expect.poll(() => strip.evaluate((element) => element.scrollLeft)).toBeGreaterThan(backwardScrollLeft);

  await page.getByRole("button", { name: "Next Viewpoint" }).click();
  await expectSelectedCardRevealed(1);
  await page.locator(".viewpoint-list-item").nth(3).evaluate((element: HTMLElement) => element.click());
  await expectSelectedCardRevealed(4);
  await page.locator(".viewpoint-list-item").nth(7).evaluate((element: HTMLElement) => element.click());
  await expectSelectedCardRevealed(8);
  await page.getByRole("button", { name: "Previous Viewpoint" }).click();
  await expectSelectedCardRevealed(7);
  await expectBoundedPopulatedLayout();

  await page.setViewportSize({ width: 1024, height: 768 });
  await expectSelectedCardRevealed(7);
  await expectBoundedPopulatedLayout();

  await page.setViewportSize({ width: 640, height: 800 });
  await expectSelectedCardRevealed(7);
  await expectBoundedPopulatedLayout();
  await expect(page.getByTestId("editor-host")).toHaveCount(1);
  await expect(page.locator("canvas.scene-canvas")).toHaveCount(1);
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
    const runtimeHeight = (await getRuntimeViewportSnapshot(page)).viewport?.cssHeight;
    const renderedHeight = await page.locator('[data-app-shell-zone="scene-viewport"]')
      .evaluate((element) => Math.round(element.getBoundingClientRect().height));
    return runtimeHeight === renderedHeight;
  }).toBe(true);
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
  expect(after.viewport?.lastResizeReason).toBe("window");
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
  await expect(page.getByTestId("primary-dock")).toHaveAttribute("data-collapsed", "false");
  await expect(nameInput).toHaveValue(dirtyValue);
  expect(await getRuntimePanel(page, "panel.libraryManager")).toMatchObject({ open: true, visible: true });

  page.once("dialog", async (dialog) => dialog.dismiss());
  expect(await invokeRuntimePanel(page, "close", "panel.primaryDockShell")).toMatchObject({
    handled: false,
    status: "cancelled"
  });
  await expect(page.getByTestId("primary-dock")).toHaveAttribute("data-collapsed", "false");
  await expect(page.getByTestId("library-manager-modal")).toBeVisible();
  await expect(nameInput).toHaveValue(dirtyValue);
  expect(await getRuntimeViewportSnapshot(page)).toEqual(beforeCancelledCollapse);

  page.once("dialog", async (dialog) => dialog.accept());
  expect(await invokeRuntimePanel(page, "close", "panel.primaryDockShell")).toMatchObject({
    handled: true,
    status: "executed"
  });
  await expect(page.getByTestId("library-manager-modal")).toHaveCount(0);
  await expect(page.getByTestId("primary-dock")).toHaveAttribute("data-collapsed", "true");
  await expect.poll(async () => (await getRuntimePanel(page, "panel.libraryManager"))?.open).toBe(false);
  await expect.poll(async () =>
    (await getRuntimeViewportSnapshot(page)).viewport?.resizeGeneration ?? 0
  ).toBeGreaterThan(beforeCancelledCollapse.viewport?.resizeGeneration ?? 0);
  const afterAcceptedCollapse = await getRuntimeViewportSnapshot(page);
  expect(afterAcceptedCollapse.viewport?.resizeGeneration ?? 0)
    .toBeGreaterThan(beforeCancelledCollapse.viewport?.resizeGeneration ?? 0);
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

test("dirty Library Manager reports cancelled Taxonomy command until discard is accepted", async ({ page }) => {
  const errors = collectPageErrors(page);
  await openCleanApp(page);

  await page.getByTestId("open-library-manager").click();
  await expect(page.getByTestId("library-manager-ready")).toBeVisible();
  await selectExistingCustomLibraryItem(page);
  const nameInput = page
    .getByTestId("library-manager-selected-item-editor")
    .getByRole("textbox", { name: "Name", exact: true });
  await nameInput.fill(`${await nameInput.inputValue()} - pending taxonomy navigation`);

  const taxonomyControl = page.getByTestId("open-taxonomy-manager");
  const beforeCancelled = await getRuntimeCommandExecution(page, "library.taxonomyManager");
  page.once("dialog", (dialog) => dialog.dismiss());
  await taxonomyControl.evaluate((element) => (element as HTMLButtonElement).click());
  await expect.poll(async () =>
    (await getRuntimeCommandExecution(page, "library.taxonomyManager")).attemptCount
  ).toBe(beforeCancelled.attemptCount + 1);
  const cancelled = await getRuntimeCommandExecution(page, "library.taxonomyManager");
  expect(cancelled.executedCount).toBe(beforeCancelled.executedCount);
  expect(cancelled.lastResult).toMatchObject({ handled: false, status: "cancelled" });
  await expect(page.getByTestId("library-manager-modal")).toBeVisible();
  await expect(page.getByTestId("taxonomy-manager-modal")).toHaveCount(0);

  page.once("dialog", (dialog) => dialog.accept());
  await expectOneRuntimeCommandExecution(page, "library.taxonomyManager", () =>
    taxonomyControl.evaluate((element) => (element as HTMLButtonElement).click())
  );
  await expect(page.getByTestId("library-manager-modal")).toHaveCount(0);
  await expect(page.getByTestId("taxonomy-manager-modal")).toBeVisible();
  await page.getByTestId("close-taxonomy-manager-header").click();
  await expect(page.getByTestId("taxonomy-manager-modal")).toHaveCount(0);
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

  const insertMenu = await openWorkbenchMenu(page, "Insert");
  await insertMenu.locator('[data-command-id="civil.addColumn"]').click();

  await page.keyboard.down("Control");
  await clickSceneMachine(page, machineIds[0]);
  await clickSceneMachine(page, machineIds[1]);
  await page.keyboard.up("Control");
  await expect(page.getByTestId("connection-point-snap-panel")).toHaveCount(0);
  expect(await getRuntimeFeature(page, "snap.connectionPoint")).toMatchObject({
    bound: true,
    reachable: true,
    status: "contextually-unavailable"
  });
  expect(await getRuntimePanel(page, "panel.connectionPointSnap")).toMatchObject({
    available: false,
    visible: false
  });
  expect(await getRuntimeCommandExecution(page, "snap.connectionPoint")).toMatchObject({
    attemptCount: 0,
    executedCount: 0
  });

  await clickSceneMachine(page, machineIds[0]);
  await page.keyboard.down("Control");
  await clickSceneMachine(page, machineIds[1]);
  await page.keyboard.up("Control");
  await expect(page.getByTestId("connection-point-snap-panel")).toBeVisible();
  await expect.poll(async () => (await getRuntimePanel(page, "panel.connectionPointSnap"))?.available).toBe(true);
  await expect.poll(async () => (await getRuntimeFeature(page, "snap.connectionPoint"))?.status).toBe("ready");
  expect(await getRuntimePanel(page, "panel.connectionPointSnap")).toMatchObject({ visible: true });

  const positionsBeforeSnap = await readCanvasRecord<PlanPosition>(
    page,
    "data-machine-plan-positions"
  );
  const snapButton = page.getByTestId("connection-point-snap-button");
  await expect(snapButton).toBeEnabled();
  await expectOneRuntimeCommandExecution(page, "snap.connectionPoint", () => snapButton.click());
  await expect.poll(() =>
    readCanvasRecord<PlanPosition>(page, "data-machine-plan-positions")
  ).not.toEqual(positionsBeforeSnap);

  await clickSceneMachine(page, machineIds[2]);
  await page.keyboard.down("Control");
  await clickSceneMachine(page, machineIds[0]);
  await page.keyboard.up("Control");
  const multiSelectionSection = page.getByRole("button", { name: /Multi-Selection/i });
  if ((await multiSelectionSection.getAttribute("aria-expanded")) !== "true") {
    await multiSelectionSection.click();
  }
  await expandContextualPanel(page, "panel.alignmentTools");
  const multiSelectionPanel = page.getByTestId("multi-selection-panel");
  const positionsBeforeAlignment = await readCanvasRecord<PlanPosition>(
    page,
    "data-machine-plan-positions"
  );
  await expectOneRuntimeCommandExecution(page, "alignment.alignSelection", () =>
    multiSelectionPanel.getByRole("button", { name: "Align Left" }).click()
  );
  await expect.poll(() =>
    readCanvasRecord<PlanPosition>(page, "data-machine-plan-positions")
  ).not.toEqual(positionsBeforeAlignment);
  expect(errors).toEqual([]);
});

test("selected object and numeric rotation smoke has no red console errors", async ({ page }) => {
  const errors = collectPageErrors(page);
  await openCleanApp(page);

  await page.locator(".machine-card").first().click();
  await expect.poll(async () => (await getRuntimePanel(page, "panel.inspector"))?.context).toBe("machine");
  const placementSettings = page.getByTestId("precision-placement-panel");
  if (!(await placementSettings.isVisible().catch(() => false))) {
    await page.getByText("Placement Settings", { exact: true }).click();
  }
  await page.getByLabel("Grid Snap", { exact: true }).uncheck();
  await page.getByLabel("Grid Snap", { exact: true }).check();
  await page.getByLabel("Grid Snap Step").fill("250");
  await page.getByLabel("Rotation Snap", { exact: true }).uncheck();
  await page.getByLabel("Rotation Snap", { exact: true }).check();
  await page.getByLabel("Rotation Snap Step").fill("45");

  await expect(placementSettings).toBeVisible();
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

test("schema-driven smart asset Inspector follows selection without remount or read-only mutation", async ({ page }) => {
  const errors = collectPageErrors(page);
  await openCleanApp(page);

  const machineCard = page.locator(".machine-card").first();
  await expect(machineCard).toBeVisible();
  await machineCard.click();
  await machineCard.click();
  await waitForMachineDiagnostics(page, 2);

  const propertiesSection = page.getByRole("button", { name: /Selected Object Properties/i });
  if ((await propertiesSection.getAttribute("aria-expanded")) !== "true") {
    await propertiesSection.click();
  }
  const machineIds = await getMachineIds(page);
  await clickSceneMachine(page, machineIds[0]);
  const inspector = page.getByTestId("schema-property-inspector");
  const schemaRoot = page.getByTestId("atara-machine-data-diagnostics");
  const canvas = page.getByLabel("AtrVisu 3D workspace");
  await expect(inspector).toBeVisible();
  await expect(schemaRoot).toHaveAttribute("data-schema-id", "schema.atara.machine");
  await expect(inspector.getByRole("heading", { name: "Identity" })).toBeVisible();
  await expect(inspector.getByRole("heading", { name: "Physical" })).toBeVisible();
  await expect(inspector.locator('[data-property-id="atara.physical.width"]')).toContainText("mm");
  await expect(inspector.locator('[data-property-id="atara.identity.manufacturer"]')).toHaveText(/.+/);
  await expect(inspector.locator("input, select, textarea")).toHaveCount(0);

  const lifecycleGeneration = await canvas.getAttribute("data-scene-lifecycle-generation");
  const firstEntityId = await schemaRoot.getAttribute("data-entity-id");
  const beforeReadOnlySelection = await getRuntimeViewportSnapshot(page);
  await inspector.evaluate((element) => element.setAttribute("data-e2e-node-probe", "stable"));
  await clickSceneMachine(page, machineIds[1]);
  await expect(inspector).toHaveAttribute("data-e2e-node-probe", "stable");
  await expect(schemaRoot).not.toHaveAttribute("data-entity-id", firstEntityId ?? "");
  await expect(canvas).toHaveAttribute("data-scene-lifecycle-generation", lifecycleGeneration ?? "");
  await expect(page.getByTestId("editor-host")).toHaveCount(1);
  await expect(page.locator("canvas.scene-canvas")).toHaveCount(1);
  const afterReadOnlySelection = await getRuntimeViewportSnapshot(page);
  expect(afterReadOnlySelection.invariants.undoDepth).toBe(beforeReadOnlySelection.invariants.undoDepth);
  expect(afterReadOnlySelection.invariants.redoDepth).toBe(beforeReadOnlySelection.invariants.redoDepth);
  expect(afterReadOnlySelection.invariants.projectDirty).toBe(beforeReadOnlySelection.invariants.projectDirty);

  const planX = page.getByLabel("Selected machine properties").getByLabel("Plan X");
  const positionsBeforeInvalid = await readCanvasRecord<PlanPosition>(page, "data-machine-plan-positions");
  const beforeInvalid = await getRuntimeViewportSnapshot(page);
  await planX.fill("-");
  await planX.blur();
  expect(await readCanvasRecord<PlanPosition>(page, "data-machine-plan-positions")).toEqual(positionsBeforeInvalid);
  const afterInvalid = await getRuntimeViewportSnapshot(page);
  expect(afterInvalid.invariants.undoDepth).toBe(beforeInvalid.invariants.undoDepth);
  expect(afterInvalid.invariants.projectDirty).toBe(beforeInvalid.invariants.projectDirty);

  await planX.fill("-250");
  await planX.blur();
  await expect.poll(async () => (
    await readCanvasRecord<PlanPosition>(page, "data-machine-plan-positions")
  )[machineIds[1]]?.xMm).not.toBe(positionsBeforeInvalid[machineIds[1]]?.xMm);
  const afterValid = await getRuntimeViewportSnapshot(page);
  expect(afterValid.invariants.undoDepth).toBeGreaterThan(beforeInvalid.invariants.undoDepth);
  await expect(canvas).toHaveAttribute("data-scene-lifecycle-generation", lifecycleGeneration ?? "");
  expect(errors).toEqual([]);
});

test("core editor visible controls execute canonical commands once", async ({ page }) => {
  const errors = collectPageErrors(page);
  await openCleanApp(page);

  await expectOneRuntimeCommandExecution(page, "library.addMachine", () =>
    page.locator(".machine-card").first().click()
  );
  await waitForMachineDiagnostics(page, 1);

  const propertiesSection = page.getByRole("button", { name: /Selected Object Properties/i });
  if ((await propertiesSection.getAttribute("aria-expanded")) !== "true") {
    await propertiesSection.click();
  }
  const machineProperties = page.getByLabel("Selected machine properties");
  await expectOneRuntimeCommandExecution(page, "edit.duplicateSelected", () =>
    getCommandBarCommand(page, "edit.duplicateSelected").click()
  );
  await waitForMachineDiagnostics(page, 2);

  const machinesBeforeCancellation = await readCanvasRecord<PlanPosition>(
    page,
    "data-machine-plan-positions"
  );
  const undoEnabledBeforeCancellation = await getCommandBarCommand(page, "edit.undo").isEnabled();
  page.once("dialog", (dialog) => dialog.dismiss());
  await expectCancelledRuntimeCommandExecution(page, "edit.deleteSelected", () =>
    getCommandBarCommand(page, "edit.deleteSelected").click()
  );
  expect(await readCanvasRecord<PlanPosition>(
    page,
    "data-machine-plan-positions"
  )).toEqual(machinesBeforeCancellation);
  await expect(machineProperties).toBeVisible();
  expect(await getCommandBarCommand(page, "edit.undo").isEnabled())
    .toBe(undoEnabledBeforeCancellation);

  const selectedMachineId = (await getMachineIds(page)).at(-1);
  if (!selectedMachineId) {
    throw new Error("A selected machine is required for keyboard Delete cancellation.");
  }
  await clickSceneMachine(page, selectedMachineId);
  page.once("dialog", (dialog) => dialog.dismiss());
  await expectCancelledRuntimeCommandExecution(page, "edit.deleteSelected", () =>
    page.keyboard.press("Delete")
  );
  expect(await readCanvasRecord<PlanPosition>(
    page,
    "data-machine-plan-positions"
  )).toEqual(machinesBeforeCancellation);
  await expect(machineProperties).toBeVisible();

  page.once("dialog", (dialog) => dialog.accept());
  await expectOneRuntimeCommandExecution(page, "edit.deleteSelected", () =>
    getCommandBarCommand(page, "edit.deleteSelected").click()
  );
  await waitForMachineDiagnostics(page, 1);

  await expectOneRuntimeCommandExecution(page, "edit.undo", () =>
    getCommandBarCommand(page, "edit.undo").click()
  );
  await waitForMachineDiagnostics(page, 2);
  await expectOneRuntimeCommandExecution(page, "edit.redo", () =>
    getCommandBarCommand(page, "edit.redo").click()
  );
  await waitForMachineDiagnostics(page, 1);

  expect(errors).toEqual([]);
});

test("rigid assembly projection renders without exposing member arrange actions", async ({ page }) => {
  const errors = collectPageErrors(page);
  await openCleanApp(page);

  const firstMachineCard = page.locator(".machine-card").first();
  await firstMachineCard.click();
  await openPrimaryDockPanel(page, "panel.groups");
  await expect(page.getByTestId("assembly-tree-panel")).toBeVisible();

  page.once("dialog", async (dialog) => {
    await dialog.accept("Alignment Smoke Group");
  });
  await page.getByTestId("create-group-from-selection").click();
  const group = page.locator(".assembly-group-row").filter({ hasText: "Alignment Smoke Group" });
  await expect(group).toBeVisible();
  await expect(group).toContainText("1 item");

  await openPrimaryDockPanel(page, "panel.machineLibrary");
  await firstMachineCard.click();
  await openPrimaryDockPanel(page, "panel.groups");
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
  await expandContextualPanel(page, "panel.alignmentTools");
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

  await openPrimaryDockPanel(page, "panel.layers");
  page.once("dialog", async (dialog) => {
    await dialog.accept("Atomic Lock Layer");
  });
  await page.getByTestId("add-layer").click();
  const lockedLayerRow = page.locator(".layer-row").filter({ hasText: "Atomic Lock Layer" });
  await expect(lockedLayerRow).toBeVisible();

  await openPrimaryDockPanel(page, "panel.machineLibrary");
  const firstMachineCard = page.locator(".machine-card").first();
  await firstMachineCard.click();
  const propertiesSection = page.getByRole("button", { name: /Selected Object Properties/i });
  if ((await propertiesSection.getAttribute("aria-expanded")) !== "true") {
    await propertiesSection.click();
  }
  await page.getByLabel("Selected machine properties").getByLabel("Layer").selectOption({
    label: "Atomic Lock Layer"
  });

  await openPrimaryDockPanel(page, "panel.groups");
  page.once("dialog", async (dialog) => {
    await dialog.accept("Atomic Lock Group");
  });
  await page.getByTestId("create-group-from-selection").click();
  const group = page.locator(".assembly-group-row").filter({ hasText: "Atomic Lock Group" });
  await expect(group).toContainText("1 item");

  await openPrimaryDockPanel(page, "panel.machineLibrary");
  await firstMachineCard.click();
  await openPrimaryDockPanel(page, "panel.groups");
  await group.getByRole("button", { name: "Add Selected" }).click();
  await expect(group).toContainText("2 items");
  await openPrimaryDockPanel(page, "panel.layers");
  await lockedLayerRow.getByRole("button", { name: "Lock", exact: true }).click();
  await openPrimaryDockPanel(page, "panel.groups");
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
  await expect(page.getByTestId("editor-host")).toHaveCount(1);
  await expect(page.locator('[data-workbench-region="editor-host"]')).toHaveCount(1);
  await expect(canvas).toHaveCount(1);
  await expect(canvas).toHaveAttribute("data-scene-lifecycle-generation", /\d+/);
  const initialLifecycleGeneration = await canvas.getAttribute("data-scene-lifecycle-generation");
  expect(initialLifecycleGeneration).not.toBeNull();
  const initialViewport = await waitForRuntimeViewport(page);
  expect(initialViewport.viewport?.viewportId).toBe("viewport.main");

  expect(await invokeRuntimePanel(page, "close", "panel.rightPanelShell"))
    .toMatchObject({ handled: true });
  await expect(page.getByTestId("right-panel")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Open Inspector" })).toBeVisible();
  const collapsedViewport = await waitForRuntimeViewport(page);
  expect(collapsedViewport.viewport?.viewportId).toBe(initialViewport.viewport?.viewportId);
  expect(collapsedViewport.viewport?.sceneLifecycleGeneration)
    .toBe(initialViewport.viewport?.sceneLifecycleGeneration);

  expect(await invokeRuntimePanel(page, "open", "panel.rightPanelShell"))
    .toMatchObject({ handled: true });
  const rightPanel = page.getByTestId("right-panel");
  await expect(rightPanel).toBeVisible();
  const reopenedViewport = await waitForRuntimeViewport(page);
  expect(reopenedViewport.viewport?.viewportId).toBe(initialViewport.viewport?.viewportId);
  expect(reopenedViewport.viewport?.sceneLifecycleGeneration)
    .toBe(initialViewport.viewport?.sceneLifecycleGeneration);

  const panelWidthBefore = await rightPanel.evaluate(
    (element) => element.getBoundingClientRect().width
  );
  const resizeHandle = page.getByRole("button", { name: "Resize right panel" });
  const resizeHandleBounds = await resizeHandle.boundingBox();
  if (!resizeHandleBounds) {
    throw new Error("Right-panel resize handle bounds are unavailable.");
  }
  await page.mouse.move(
    resizeHandleBounds.x + resizeHandleBounds.width / 2,
    resizeHandleBounds.y + 40
  );
  await page.mouse.down();
  await page.mouse.move(resizeHandleBounds.x - 48, resizeHandleBounds.y + 40, { steps: 4 });
  await page.mouse.up();
  await expect.poll(async () =>
    rightPanel.evaluate((element) => element.getBoundingClientRect().width)
  ).toBeGreaterThan(panelWidthBefore);
  const resizedViewport = await waitForRuntimeViewport(page);
  expect(resizedViewport.viewport?.viewportId).toBe(initialViewport.viewport?.viewportId);
  expect(resizedViewport.viewport?.sceneLifecycleGeneration)
    .toBe(initialViewport.viewport?.sceneLifecycleGeneration);

  await page.locator(".machine-card").first().click();
  await expect(page.getByRole("button", { name: /Selected Object Properties/i })).toBeVisible();
  await expect(canvas).toHaveAttribute(
    "data-scene-lifecycle-generation",
    initialLifecycleGeneration ?? ""
  );

  const insertMenu = await openWorkbenchMenu(page, "Insert");
  await insertMenu.locator('[data-command-id="annotations.create"]').click();
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
  await openPrimaryDockPanel(page, "panel.layers");
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
  await openPrimaryDockPanel(page, "panel.layers");
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

  await openProjectManagerFromFileMenu(page);
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

  await openPerformanceBenchmarkFromToolsMenu(page);
  await page.getByTestId("close-performance-benchmark").click();
  await expect(page.getByTestId("performance-benchmark-modal")).toHaveCount(0);
  await expectNoModalBackdrop(page);

  expect(errors).toEqual([]);
});

test("project save clears a real dirty scene and updates its active revision while Project Manager is closed", async ({ page }) => {
  const errors = collectPageErrors(page);
  await openCleanApp(page);
  const canvas = page.getByLabel("AtrVisu 3D workspace");
  await expect(canvas).toHaveAttribute("data-scene-lifecycle-generation", /\d+/);
  const lifecycleGeneration = await canvas.getAttribute("data-scene-lifecycle-generation");

  await openProjectManagerFromFileMenu(page);
  await page.getByTestId("new-project-name").fill("Closed Command Project");
  await page.getByTestId("new-customer-name").fill("E2E Customer");
  await page.getByTestId("create-project").click();
  await expect(page.getByTestId("project-manager-project-list")).toContainText("Closed Command Project");
  await page.getByTestId("close-project-manager").click();
  await expect(page.getByTestId("project-manager-modal")).toHaveCount(0);

  const cleanContext = await getActiveProjectRuntimeContext(page);
  expect(cleanContext.projectId).not.toBeNull();
  expect(cleanContext.layoutId).not.toBeNull();
  expect(cleanContext.revisionId).not.toBeNull();
  expect(cleanContext.hasUnsavedChanges).toBe(false);

  await page.locator(".machine-card").first().click();
  await waitForMachineDiagnostics(page, 1);
  await expect.poll(() => getActiveProjectRuntimeContext(page)).toEqual({
    ...cleanContext,
    hasUnsavedChanges: true
  });

  let promptCount = 0;
  page.on("dialog", async (dialog) => {
    if (dialog.type() === "prompt") {
      await dialog.accept(promptCount++ === 0 ? "R01" : "Saved with modal closed");
    }
  });
  await expectRuntimeCommandExecutionOnce(page, "project.save", () =>
    page.getByTestId("workbench-application-bar")
      .locator('[data-command-id="project.save"]')
      .click()
  );
  await expect.poll(() => getActiveProjectRuntimeContext(page)).toMatchObject({
    projectId: cleanContext.projectId,
    layoutId: cleanContext.layoutId,
    hasUnsavedChanges: false
  });
  const savedContext = await getActiveProjectRuntimeContext(page);
  expect(savedContext.revisionId).not.toBe(cleanContext.revisionId);

  await openProjectManagerFromFileMenu(page);
  await expect(page.getByRole("button", { name: /Layout-1 2 revisions/ })).toBeVisible();
  await page.getByTestId("close-project-manager").click();

  const fileMenu = await openWorkbenchMenu(page, "File");
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    expectRuntimeCommandExecutionOnce(page, "project.exportJson", () =>
      fileMenu.locator('[data-command-id="project.exportJson"]').click()
    )
  ]);
  expect(download.suggestedFilename()).toBe("Closed-Command-Project.project.json");
  await expect(canvas).toHaveAttribute("data-scene-lifecycle-generation", lifecycleGeneration ?? "");
  await expect(page.locator("canvas")).toHaveCount(1);
  expect(errors).toEqual([]);
});

test("Project Manager export uses its selected project payload", async ({ page }) => {
  const errors = collectPageErrors(page);
  await openCleanApp(page);
  await openProjectManagerFromFileMenu(page);

  for (const projectName of ["Selected Export", "Active Other Project"]) {
    await page.getByTestId("new-project-name").fill(projectName);
    await page.getByTestId("new-customer-name").fill("E2E Customer");
    await page.getByTestId("create-project").click();
    await expect(page.getByTestId("project-manager-project-list")).toContainText(projectName);
  }

  await page.getByTestId("project-manager-project-list")
    .getByRole("button", { name: /Selected Export/ })
    .click();
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: "Export Project JSON" }).click()
  ]);

  expect(download.suggestedFilename()).toBe("Selected-Export.project.json");
  expect(errors).toEqual([]);
});

test("persistent project import input survives Project Manager close without scene mutation", async ({ page }) => {
  const errors = collectPageErrors(page);
  await openCleanApp(page);
  const canvas = page.getByLabel("AtrVisu 3D workspace");
  await expect(canvas).toHaveAttribute("data-scene-lifecycle-generation", /\d+/);

  await expect(page.getByTestId("import-project-file")).toHaveCount(1);
  await openProjectManagerFromFileMenu(page);
  await page.getByTestId("new-project-name").fill("Persistent Import Source");
  await page.getByTestId("new-customer-name").fill("E2E Customer");
  await page.getByTestId("create-project").click();
  await expect(page.getByTestId("project-manager-project-list")).toContainText("Persistent Import Source");

  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: "Export Project JSON" }).click()
  ]);
  const downloadPath = await download.path();
  expect(downloadPath).not.toBeNull();
  const activeContextBeforeImport = await getActiveProjectRuntimeContext(page);
  const before = await getRuntimeViewportSnapshot(page);

  await page.getByTestId("close-project-manager").click();
  await expect(page.getByTestId("project-manager-modal")).toHaveCount(0);

  const importExecutionBeforeCancel = await getRuntimeCommandExecution(
    page,
    "project.importJson"
  );
  let fileMenu = await openWorkbenchMenu(page, "File");
  const cancelledChooserPromise = page.waitForEvent("filechooser");
  await fileMenu.locator('[data-command-id="project.importJson"]').click();
  const cancelledChooser = await cancelledChooserPromise;
  await cancelledChooser.setFiles([]);
  await expect.poll(async () =>
    (await getRuntimeCommandExecution(page, "project.importJson")).attemptCount
  ).toBe(importExecutionBeforeCancel.attemptCount);
  await expect(page.getByTestId("import-project-file")).toHaveValue("");

  fileMenu = await openWorkbenchMenu(page, "File");
  const chooserPromise = page.waitForEvent("filechooser");
  await fileMenu.locator('[data-command-id="project.importJson"]').click();
  const chooser = await chooserPromise;
  await expectRuntimeCommandExecutionOnce(page, "project.importJson", () =>
    chooser.setFiles(downloadPath ?? "")
  );

  await openProjectManagerFromFileMenu(page);
  await expect(page.getByTestId("project-manager-project-list")).toContainText("Persistent Import Source Imported");
  await expect(page.getByTestId("import-project-file")).toHaveCount(1);
  await expect(page.getByTestId("import-project-file")).toHaveValue("");

  await page.getByTestId("close-project-manager").click();
  await expect(page.getByTestId("project-manager-modal")).toHaveCount(0);
  await expect(page.getByTestId("import-project-file")).toHaveCount(1);
  const after = await getRuntimeViewportSnapshot(page);
  const activeContextAfterImport = await getActiveProjectRuntimeContext(page);
  expect(activeContextAfterImport).toEqual(activeContextBeforeImport);
  expect(after.viewport?.sceneLifecycleGeneration).toBe(before.viewport?.sceneLifecycleGeneration);
  expect(after.invariants.selectionIds).toEqual(before.invariants.selectionIds);
  expect(after.invariants.undoDepth).toBe(before.invariants.undoDepth);
  expect(after.invariants.redoDepth).toBe(before.invariants.redoDepth);
  expect(after.invariants.projectDirty).toBe(before.invariants.projectDirty);
  await expect(page.locator("canvas")).toHaveCount(1);
  expect(errors).toEqual([]);
});

test("annotation create and negative coordinate smoke has no red console errors", async ({ page }) => {
  const errors = collectPageErrors(page);
  await openCleanApp(page);

  const insertMenu = await openWorkbenchMenu(page, "Insert");
  await expectOneRuntimeCommandExecution(page, "annotations.create", () =>
    insertMenu.locator('[data-command-id="annotations.create"]').click()
  );
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
  await expect(page.getByTestId("annotation-text-input")).toHaveValue("Forklift access required");
  await expectOneRuntimeCommandExecution(page, "edit.deleteSelected", () =>
    page.getByRole("button", { name: "Delete Annotation" }).click()
  );
  await expect(page.getByTestId("annotation-properties")).toHaveCount(0);

  expect(errors).toEqual([]);
});

test("orthographic viewpoint framing can be captured, updated, and applied", async ({ page }) => {
  const errors = collectPageErrors(page);
  await openCleanApp(page);
  await page.locator(".machine-card").first().click();
  await waitForMachineDiagnostics(page, 1);
  expect(await applyRuntimeViewportCameraState(page, {
    ...DEFAULT_ORTHOGRAPHIC_CAMERA_STATE,
    orthographic: {
      centerX: 3,
      centerY: -2,
      verticalWorldSpan: 14
    }
  })).toBe(true);
  await expect.poll(async () =>
    (await getRuntimeViewportSnapshot(page)).camera?.orthographicIntent?.verticalWorldSpan
  ).toBe(14);

  await getCommandBarCommand(page, "view.viewpoints").click();
  await expect(page.getByTestId("viewpoints-panel")).toBeVisible();
  await page.getByTestId("viewpoint-name-input").fill("Orthographic Review");
  await page.getByTestId("capture-viewpoint").click();
  const viewpointItem = page.getByRole("button", { name: /Orthographic Review/i });
  await expect(viewpointItem).toBeVisible();
  await viewpointItem.click();
  await expect(page.getByTestId("apply-viewpoint")).toBeEnabled();
  const captured = await getRuntimeViewportSnapshot(page);

  expect(await applyRuntimeViewportCameraState(page, {
    ...DEFAULT_ORTHOGRAPHIC_CAMERA_STATE,
    orthographic: {
      centerX: -4,
      centerY: 5,
      verticalWorldSpan: 30
    }
  })).toBe(true);
  await page.getByTestId("apply-viewpoint").click();
  await expect.poll(async () => {
    const intent = (await getRuntimeViewportSnapshot(page)).camera?.orthographicIntent;
    return [intent?.centerX, intent?.centerY, intent?.verticalWorldSpan];
  }).toEqual([3, -2, 14]);
  const restored = await getRuntimeViewportSnapshot(page);
  expect(restored.camera?.alpha).toBeCloseTo(captured.camera?.alpha ?? Number.NaN);
  expect(restored.camera?.beta).toBeCloseTo(captured.camera?.beta ?? Number.NaN);
  expect(restored.camera?.radius).toBeCloseTo(captured.camera?.radius ?? Number.NaN);
  expect(restored.invariants).toEqual(captured.invariants);

  expect(await applyRuntimeViewportCameraState(page, {
    ...DEFAULT_ORTHOGRAPHIC_CAMERA_STATE,
    orthographic: {
      centerX: 6,
      centerY: 1,
      verticalWorldSpan: 10
    }
  })).toBe(true);
  await page.getByRole("button", { name: "Update From Current View" }).click();
  expect(await applyRuntimeViewportCameraState(page, {
    ...DEFAULT_ORTHOGRAPHIC_CAMERA_STATE,
    orthographic: {
      centerX: 0,
      centerY: 0,
      verticalWorldSpan: 24
    }
  })).toBe(true);
  await page.getByTestId("apply-viewpoint").click();
  await expect.poll(async () => {
    const intent = (await getRuntimeViewportSnapshot(page)).camera?.orthographicIntent;
    return [intent?.centerX, intent?.centerY, intent?.verticalWorldSpan];
  }).toEqual([6, 1, 10]);

  expect(errors).toEqual([]);
});

test("layers can be created, assigned, hidden, and shown without red console errors", async ({ page }) => {
  const errors = collectPageErrors(page);
  await openCleanApp(page);

  await openPrimaryDockPanel(page, "panel.layers");
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

  await openPrimaryDockPanel(page, "panel.machineLibrary");
  await page.locator(".machine-card").first().click();
  const propertiesSectionButton = page.getByRole("button", { name: /Selected Object Properties/i });
  if ((await propertiesSectionButton.getAttribute("aria-expanded")) !== "true") {
    await propertiesSectionButton.click();
  }
  await expect(page.getByLabel("Selected machine properties").getByLabel("Layer")).toHaveValue("default");
  await openPrimaryDockPanel(page, "panel.layers");
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

  const insertMenu = await openWorkbenchMenu(page, "Insert");
  await insertMenu.locator('[data-command-id="annotations.create"]').click();
  await expect(page.getByTestId("annotation-properties")).toBeVisible();
  await expect(page.getByTestId("annotation-properties").getByLabel("Layer")).toHaveValue("default");
  await expect(defaultLayerRow).toContainText("1 item");

  expect(errors).toEqual([]);
});

test("building civil references can be added and edited without red console errors", async ({ page }) => {
  const errors = collectPageErrors(page);
  await openCleanApp(page);

  const insertMenu = await openWorkbenchMenu(page, "Insert");
  await expectOneRuntimeCommandExecution(page, "civil.addColumn", () =>
    insertMenu.locator('[data-command-id="civil.addColumn"]').click()
  );
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
  page.once("dialog", (dialog) => dialog.accept());
  await expectOneRuntimeCommandExecution(page, "edit.deleteSelected", () =>
    page.getByRole("button", { name: "Delete Civil Reference" }).click()
  );
  await expect(page.getByTestId("civil-reference-properties")).toHaveCount(0);

  expect(errors).toEqual([]);
});

test("assembly tree can create and select a group without red console errors", async ({ page }) => {
  const errors = collectPageErrors(page);
  await openCleanApp(page);
  const { canvas, group, groupId, machineIds } = await createTwoMachineAssembly(
    page,
    "Packaging Line 1"
  );
  expect(groupId).not.toBeNull();
  expect(machineIds).toHaveLength(2);
  const memberTransforms = await readCanvasRecord<PlanPosition>(
    page,
    "data-machine-plan-positions"
  );

  await expectOneRuntimeCommandExecution(page, "assembly.enterEdit", () =>
    group.getByRole("button", { name: /Edit Group Packaging Line 1/i }).click()
  );
  await expect(group).toContainText("Editing members");
  await expectOneRuntimeCommandExecution(page, "assembly.exitEdit", () =>
    group.getByRole("button", { name: /Exit Group Edit Packaging Line 1/i }).click()
  );
  await expect(group).not.toContainText("Editing members");

  const undoEnabledBeforeCancellation = await getCommandBarCommand(page, "edit.undo").isEnabled();
  page.once("dialog", (dialog) => dialog.dismiss());
  await expectCancelledRuntimeCommandExecution(page, "assembly.ungroup", () =>
    group.getByRole("button", { name: /Ungroup Packaging Line 1/i }).click()
  );
  await expect(group).toBeVisible();
  await expect(group).toHaveClass(/is-selected/);
  await expect(canvas).toHaveAttribute("data-selected-assembly-id", groupId ?? "");
  expect(await readCanvasRecord<PlanPosition>(
    page,
    "data-machine-plan-positions"
  )).toEqual(memberTransforms);
  expect(await getCommandBarCommand(page, "edit.undo").isEnabled())
    .toBe(undoEnabledBeforeCancellation);

  page.once("dialog", (dialog) => dialog.accept());
  await expectOneRuntimeCommandExecution(page, "assembly.ungroup", () =>
    group.getByRole("button", { name: /Ungroup Packaging Line 1/i }).click()
  );
  await expect(group).toHaveCount(0);
  expect(await readCanvasRecord<PlanPosition>(
    page,
    "data-machine-plan-positions"
  )).toEqual(memberTransforms);
  await getCommandBarCommand(page, "edit.undo").click();
  await expect(group).toBeVisible();
  await expect(group).toContainText("2 items");
  expect(await readCanvasRecord<PlanPosition>(
    page,
    "data-machine-plan-positions"
  )).toEqual(memberTransforms);

  expect(errors).toEqual([]);
});

test("Library Manager opens and closes with stable header control", async ({ page }) => {
  const errors = collectPageErrors(page);
  await openCleanApp(page);

  await expectNoModalBackdrop(page);
  const openLibraryManager = page.getByTestId("open-library-manager");
  await expect(openLibraryManager).toBeVisible();
  await expect(openLibraryManager).toBeEnabled();
  await expectOneRuntimeCommandExecution(page, "library.manager", () =>
    openLibraryManager.click()
  );
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
  await expectOneRuntimeCommandExecution(page, "library.taxonomyManager", () =>
    openTaxonomyManager.click()
  );
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

test("UI preferences default shell renders without red console errors", async ({ page }) => {
  const errors = collectPageErrors(page);
  await openCleanApp(page);
  await waitForUiPreferences(page);

  await expect(page.getByTestId("design-system-root")).toHaveAttribute("data-av-theme", "dark");
  await expect(page.getByTestId("design-system-root")).toHaveAttribute("data-av-density", "comfortable");
  await expect(page.getByTestId("editor-host")).toHaveCount(1);
  await expect(page.locator("canvas.scene-canvas")).toHaveCount(1);
  await expect(page.getByTestId("primary-dock-tab-panel.machineLibrary"))
    .toHaveAttribute("aria-pressed", "true");
  await expect(page.getByTestId("primary-dock-tab-panel.layers"))
    .toHaveAttribute("aria-pressed", "false");
  expect(await page.getByTestId("right-panel").evaluate((element) =>
    getComputedStyle(element).getPropertyValue("--panel-width").trim()
  )).toBe("360px");
  expect(errors).toEqual([]);
});

test("legacy panel preferences migrate once to IndexedDB and preserve unrelated storage", async ({ page }) => {
  const errors = collectPageErrors(page);
  await page.addInitScript(() => {
    window.localStorage.clear();
    window.localStorage.setItem("atrvisu.rightPanelWidth.v1", "430");
    window.localStorage.setItem("atrvisu.panelSection.layers.v1", "expanded");
    window.localStorage.setItem("atrvisu.unrelated", "keep");
  });
  await page.goto("/?e2eDiagnostics=1");
  await expect(page.getByTestId("app-root")).toBeVisible();
  await waitForUiPreferences(page);

  expect(await page.getByTestId("right-panel").evaluate((element) =>
    getComputedStyle(element).getPropertyValue("--panel-width").trim()
  )).toBe("430px");
  await expect.poll(() => page.evaluate(() =>
    window.__atrvisuUiPreferences?.getSnapshot().preferences.panels
      .find((panel) => panel.panelId === "panel.layers")?.collapsed
  )).toBe(false);
  const persisted = await page.evaluate(() => new Promise<{ width?: number }>((resolve, reject) => {
    const request = indexedDB.open("atrvisu-db", 2);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const database = request.result;
      const getRequest = database.transaction("uiPreferences").objectStore("uiPreferences").get("workbench");
      getRequest.onerror = () => reject(getRequest.error);
      getRequest.onsuccess = () => {
        const value = getRequest.result as { panels: Array<{ panelId: string; size?: number }> };
        resolve({ width: value.panels.find((panel) => panel.panelId === "panel.rightPanelShell")?.size });
        database.close();
      };
    };
  }));
  expect(persisted.width).toBe(430);
  expect(await page.evaluate(() => window.localStorage.getItem("atrvisu.rightPanelWidth.v1"))).toBeNull();
  expect(await page.evaluate(() => window.localStorage.getItem("atrvisu.panelSection.layers.v1"))).toBeNull();
  expect(await page.evaluate(() => window.localStorage.getItem("atrvisu.unrelated"))).toBe("keep");
  await expect(page.getByTestId("editor-host")).toHaveCount(1);
  await expect(page.locator("canvas.scene-canvas")).toHaveCount(1);
  expect(errors).toEqual([]);
});

test("persisted theme density and panel updates hydrate without remounting the scene", async ({ page }) => {
  const errors = collectPageErrors(page);
  await seedUiPreferences(page, createE2EUiPreferences({ theme: "light", density: "compact", width: 420 }));
  await page.goto("/?e2eDiagnostics=1");
  await expect(page.getByTestId("app-root")).toBeVisible();
  await waitForUiPreferences(page);

  const designRoot = page.getByTestId("design-system-root");
  const canvas = page.locator("canvas.scene-canvas");
  await expect(designRoot).toHaveAttribute("data-av-theme", "light");
  await expect(designRoot).toHaveAttribute("data-av-density", "compact");
  await expect(canvas).toHaveAttribute("data-scene-lifecycle-generation", /\d+/);
  const lifecycle = await canvas.getAttribute("data-scene-lifecycle-generation");
  await page.evaluate(() => {
    const runtimeWindow = window as Window & { __p1d1Identity?: Element[] };
    runtimeWindow.__p1d1Identity = [
      document.querySelector('[data-testid="app-root"]')!,
      document.querySelector('[data-testid="editor-host"]')!,
      document.querySelector("canvas.scene-canvas")!
    ];
  });
  await page.evaluate(async () => {
    const bridge = window.__atrvisuUiPreferences;
    if (!bridge) throw new Error("UI preference bridge unavailable");
    await bridge.updateTheme("dark").persisted;
    await bridge.updatePanelPreference("panel.rightPanelShell", { size: 470 }).persisted;
    await bridge.updatePanelPreference("panel.layers", { collapsed: false }).persisted;
  });
  await expect(designRoot).toHaveAttribute("data-av-theme", "dark");
  expect(await page.evaluate(() => {
    const runtimeWindow = window as Window & { __p1d1Identity?: Element[] };
    const identity = runtimeWindow.__p1d1Identity ?? [];
    return identity[0] === document.querySelector('[data-testid="app-root"]')
      && identity[1] === document.querySelector('[data-testid="editor-host"]')
      && identity[2] === document.querySelector("canvas.scene-canvas");
  })).toBe(true);
  await expect(canvas).toHaveAttribute("data-scene-lifecycle-generation", lifecycle ?? "");

  await page.reload();
  await waitForUiPreferences(page);
  await expect(page.getByTestId("design-system-root")).toHaveAttribute("data-av-theme", "dark");
  expect(await page.getByTestId("right-panel").evaluate((element) =>
    getComputedStyle(element).getPropertyValue("--panel-width").trim()
  )).toBe("470px");
  await expect.poll(() => page.evaluate(() =>
    window.__atrvisuUiPreferences?.getSnapshot().preferences.panels
      .find((panel) => panel.panelId === "panel.layers")?.collapsed
  )).toBe(false);
  expect(errors).toEqual([]);
});

test("visible panel updates survive a deliberately pending preference hydration", async ({ page }) => {
  const errors = collectPageErrors(page);
  const persistedSeed = createE2EUiPreferences({ theme: "light", density: "compact", width: 420 });
  await seedUiPreferences(page, persistedSeed);
  await delayUiPreferencesHydration(page);
  await page.goto("/?e2eDiagnostics=1");
  await expect(page.getByTestId("app-root")).toBeVisible();
  await expect.poll(() => page.evaluate(() =>
    window.__atrvisuUiPreferences?.getSnapshot().hydrationStatus
  )).toBe("loading");

  const canvas = page.locator("canvas.scene-canvas");
  await expect(canvas).toHaveAttribute("data-scene-lifecycle-generation", /\d+/);
  const lifecycleGeneration = await canvas.getAttribute("data-scene-lifecycle-generation");
  await openPrimaryDockPanel(page, "panel.layers");
  await page.getByTestId("right-panel")
    .getByRole("button", { name: "Collapse Inspector", exact: true })
    .click();
  await expect(page.getByTestId("right-panel")).toHaveCount(0);

  await page.evaluate(() => window.__atrvisuUiPreferencesHydrationTestGate?.release());
  await waitForUiPreferences(page);
  const finalSnapshot = await page.evaluate(() => window.__atrvisuUiPreferences?.getSnapshot());
  expect(finalSnapshot?.preferences).toMatchObject({ theme: "light", density: "compact" });
  expect(finalSnapshot?.preferences.panels.find((panel) => panel.panelId === "panel.rightPanelShell"))
    .toMatchObject({ size: 420, collapsed: true });
  expect(finalSnapshot?.preferences.panels.find((panel) => panel.panelId === "panel.layers"))
    .toMatchObject({ collapsed: false });
  const persisted = await page.evaluate(() => new Promise<unknown>((resolve, reject) => {
    const request = indexedDB.open("atrvisu-db", 2);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const database = request.result;
      const getRequest = database.transaction("uiPreferences").objectStore("uiPreferences").get("workbench");
      getRequest.onerror = () => reject(getRequest.error);
      getRequest.onsuccess = () => {
        resolve(getRequest.result);
        database.close();
      };
    };
  }));
  expect(persisted).toEqual(finalSnapshot?.preferences);
  await expect(page.getByTestId("design-system-root")).toHaveCount(1);
  await expect(page.getByTestId("app-root")).toHaveCount(1);
  await expect(page.getByTestId("editor-host")).toHaveCount(1);
  await expect(canvas).toHaveCount(1);
  await expect(canvas).toHaveAttribute("data-scene-lifecycle-generation", lifecycleGeneration ?? "");

  await page.reload();
  await waitForUiPreferences(page);
  await expect(page.getByTestId("design-system-root")).toHaveAttribute("data-av-theme", "light");
  await expect(page.getByTestId("design-system-root")).toHaveAttribute("data-av-density", "compact");
  await expect(page.getByTestId("right-panel")).toHaveCount(0);
  const restored = await page.evaluate(() => window.__atrvisuUiPreferences?.getSnapshot().preferences);
  expect(restored).toEqual(finalSnapshot?.preferences);
  await expect(page.getByTestId("design-system-root")).toHaveCount(1);
  await expect(page.getByTestId("app-root")).toHaveCount(1);
  await expect(page.getByTestId("editor-host")).toHaveCount(1);
  await expect(page.locator("canvas.scene-canvas")).toHaveCount(1);
  expect(errors).toEqual([]);
});

test("panel preference changes preserve domain and scene lifecycle invariants", async ({ page }) => {
  const errors = collectPageErrors(page);
  await openCleanApp(page);
  await waitForUiPreferences(page);
  const before = await getRuntimeViewportSnapshot(page);

  await page.evaluate(async () => {
    const bridge = window.__atrvisuUiPreferences;
    if (!bridge) throw new Error("UI preference bridge unavailable");
    await bridge.updatePanelPreference("panel.rightPanelShell", { size: 410 }).persisted;
    await bridge.updatePanelPreference("panel.layers", { collapsed: false }).persisted;
  });
  await expect.poll(() => page.evaluate(() =>
    window.__atrvisuUiPreferences?.getSnapshot().preferences.panels
      .find((panel) => panel.panelId === "panel.layers")?.collapsed
  )).toBe(false);
  const after = await getRuntimeViewportSnapshot(page);

  expect(after.invariants).toEqual(before.invariants);
  expect(after.camera).toEqual(before.camera);
  expect(after.viewport?.sceneLifecycleGeneration).toBe(before.viewport?.sceneLifecycleGeneration);
  await expect(page.getByTestId("editor-host")).toHaveCount(1);
  await expect(page.locator("canvas.scene-canvas")).toHaveCount(1);
  expect(errors).toEqual([]);
});

test("corrupt preference storage degrades safely and diagnostics remain guarded", async ({ page }) => {
  const errors = collectPageErrors(page);
  await seedUiPreferences(page, {
    schemaVersion: 1,
    theme: "dark",
    density: "comfortable",
    panels: "corrupt"
  });
  await page.goto("/?e2eDiagnostics=1");
  await expect(page.getByTestId("app-root")).toBeVisible();
  await waitForUiPreferences(page, "degraded");
  await expect(page.getByTestId("design-system-root")).toHaveAttribute("data-av-theme", "dark");
  await expect(page.locator("canvas.scene-canvas")).toHaveCount(1);
  expect(errors).toEqual([]);

  const normalPage = await page.context().newPage();
  const normalErrors = collectPageErrors(normalPage);
  await normalPage.goto("/");
  await expect(normalPage.getByTestId("app-root")).toBeVisible();
  expect(await normalPage.evaluate(() => window.__atrvisuUiPreferences)).toBeUndefined();
  expect(await normalPage.evaluate(() => window.__atrvisuWorkspace)).toBeUndefined();
  expect(normalErrors).toEqual([]);
  await normalPage.close();
});

test("P1-D1 preferences start as Current arrangement without an implicit Sales reset", async ({ page }) => {
  const errors = collectPageErrors(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  const seed = createE2EUiPreferences({
    theme: "light",
    density: "compact",
    width: 420,
    panelOverrides: {
      "panel.layers": { visible: false, collapsed: true },
      "panel.annotations": { visible: true, collapsed: false }
    }
  });
  await seedUiPreferences(page, seed);
  await page.goto("/?e2eDiagnostics=1");
  await waitForUiPreferences(page);

  await expect(page.getByTestId("workspace-preferences-trigger")).toContainText("Current arrangement");
  await expect(page.getByTestId("design-system-root")).toHaveAttribute("data-av-theme", "light");
  await expect(page.getByTestId("design-system-root")).toHaveAttribute("data-av-density", "compact");
  await expect(page.getByTestId("right-panel")).toHaveCSS("width", "420px");
  await expect(page.getByTestId("primary-dock-tab-panel.layers")).toHaveCount(0);
  await expect.poll(() => page.evaluate(() =>
    window.__atrvisuUiPreferences?.getSnapshot().preferences.panels
      .find((panel) => panel.panelId === "panel.annotations")
  )).toMatchObject({ visible: true, collapsed: false });
  const control = await openWorkspacePreferences(page);
  const disclosureRows = control.popover.locator(".workspace-preference-disclosure-row");
  await expect(disclosureRows).toHaveCount(4);
  await expect(control.popover.locator("input")).toHaveCount(0);
  await expect(control.popover.getByTestId("workspace-preferences-workspace-trigger"))
    .toContainText("Current arrangement");
  await expect(control.popover.getByTestId("workspace-preferences-theme-trigger"))
    .toContainText("Light");
  await expect(control.popover.getByTestId("workspace-preferences-density-trigger"))
    .toContainText("Compact");
  await expect(control.popover.getByTestId("workspace-visible-panels-trigger"))
    .toHaveAccessibleName(/^Visible Panels: \d+\/\d+$/);
  expect(await control.popover.evaluate((element) => element.scrollHeight <= element.clientHeight))
    .toBe(true);
  const snapshot = await page.evaluate(() => window.__atrvisuWorkspace?.getSnapshot());
  expect(snapshot?.activeWorkspaceId).toBeUndefined();
  expect(snapshot?.inspectorMode).toBe("contextual");
  expect(errors).toEqual([]);
});

test("Sales and Engineering workspaces persist while domain and scene invariants stay fixed", async ({ page }) => {
  const errors = collectPageErrors(page);
  await openCleanApp(page);
  await waitForUiPreferences(page);
  const beforeViewport = await getRuntimeViewportSnapshot(page);
  const beforeProject = await getActiveProjectRuntimeContext(page);

  const workspace = await openPreferenceBranch(page, "workspace");
  await expect(page.getByTestId("workspace-preferences-workspace-flyout")).toBeVisible();
  await expect(workspace.surface.getByRole("radio")).toHaveCount(3);
  await workspace.surface.getByLabel("Sales Layout", { exact: true }).check();
  await expect(workspace.surface).toBeVisible();
  await expect(workspace.branchTrigger).toContainText("Sales Layout");
  await expect(workspace.branchTrigger).toHaveAttribute("aria-expanded", "true");
  await expect(page.getByTestId("workspace-preferences-popover")).toBeVisible();
  await expect(page.getByTestId("workspace-preferences-trigger")).toContainText("Sales Layout");
  await expect(page.getByTestId("design-system-root")).toHaveAttribute("data-av-density", "comfortable");
  await expect(page.getByTestId("primary-dock-tab-panel.machineLibrary")).toBeVisible();
  await expect(page.getByTestId("primary-dock-tab-panel.layers")).toHaveCount(0);
  await expect(page.getByTestId("app-root")).toHaveAttribute("data-workspace-inspector-mode", "summary");
  await expect(page.locator('[data-command-id="project.save"]')).toHaveAttribute(
    "data-workspace-emphasized",
    "true"
  );

  await workspace.surface.getByLabel("Layout Engineering", { exact: true }).check();
  await expect(workspace.surface).toBeVisible();
  await expect(workspace.branchTrigger).toContainText("Layout Engineering");
  await expect(page.getByTestId("workspace-preferences-trigger")).toContainText("Layout Engineering");
  await expect(page.getByTestId("design-system-root")).toHaveAttribute("data-av-density", "compact");
  await expect(page.getByTestId("primary-dock-tab-panel.layers")).toBeVisible();
  await expect(page.getByTestId("app-root")).toHaveAttribute("data-workspace-inspector-mode", "engineering");
  await expect(getCommandBarCommand(page, "edit.undo")).toHaveAttribute(
    "data-workspace-emphasized",
    "true"
  );
  await expect(getCommandBarCommand(page, "view.toggleLabels")).not.toHaveAttribute(
    "data-workspace-emphasized",
    "true"
  );

  await workspace.surface.getByLabel("Sales Layout", { exact: true }).check();
  await expect(workspace.surface).toBeVisible();
  const afterViewport = await getRuntimeViewportSnapshot(page);
  const afterProject = await getActiveProjectRuntimeContext(page);
  expect(afterViewport.invariants).toEqual(beforeViewport.invariants);
  expect(afterViewport.camera).toEqual(beforeViewport.camera);
  expect(afterViewport.viewport?.sceneLifecycleGeneration)
    .toBe(beforeViewport.viewport?.sceneLifecycleGeneration);
  expect(afterProject).toEqual(beforeProject);
  await expect(page.getByTestId("app-root")).toHaveCount(1);
  await expect(page.getByTestId("editor-host")).toHaveCount(1);
  await expect(page.locator("canvas.scene-canvas")).toHaveCount(1);

  await page.reload();
  await waitForUiPreferences(page);
  await expect(page.getByTestId("workspace-preferences-trigger")).toContainText("Sales Layout");
  expect(errors).toEqual([]);
});

test("theme retains workspace identity and density override returns to Current arrangement", async ({ page }) => {
  const errors = collectPageErrors(page);
  await openCleanApp(page);
  await waitForUiPreferences(page);
  const workspace = await openPreferenceBranch(page, "workspace");
  await workspace.surface.getByLabel("Sales Layout", { exact: true }).check();
  const before = await getRuntimeViewportSnapshot(page);
  const beforeProject = await getActiveProjectRuntimeContext(page);

  const themeBranch = await openPreferenceBranch(page, "theme");
  await expect(page.getByTestId("workspace-preferences-workspace-flyout")).toHaveCount(0);
  await expect(themeBranch.surface.getByRole("radio")).toHaveCount(3);
  for (const theme of ["Dark", "Light", "System"] as const) {
    await themeBranch.surface.getByLabel(theme, { exact: true }).check();
    await expect(themeBranch.surface).toBeVisible();
    await expect(themeBranch.branchTrigger).toContainText(theme);
    await expect(page.getByTestId("design-system-root")).toHaveAttribute(
      "data-av-theme",
      theme.toLowerCase()
    );
    await expect(page.getByTestId("workspace-preferences-trigger")).toContainText("Sales Layout");
  }
  const densityBranch = await openPreferenceBranch(page, "density");
  await expect(page.getByTestId("workspace-preferences-workspace-flyout")).toHaveCount(0);
  await expect(page.getByTestId("workspace-preferences-theme-flyout")).toHaveCount(0);
  await expect(densityBranch.surface.getByRole("radio")).toHaveCount(2);
  await densityBranch.surface.getByLabel("Compact", { exact: true }).check();
  await expect(densityBranch.surface).toBeVisible();
  await expect(densityBranch.branchTrigger).toContainText("Compact");
  await expect(page.getByTestId("workspace-preferences-workspace-trigger"))
    .toContainText("Current arrangement");
  await expect(page.getByTestId("workspace-preferences-trigger"))
    .toContainText("Current arrangement");
  await expect(page.getByTestId("design-system-root")).toHaveAttribute("data-av-density", "compact");

  const after = await getRuntimeViewportSnapshot(page);
  expect(after.invariants).toEqual(before.invariants);
  expect(after.camera).toEqual(before.camera);
  expect(after.viewport?.sceneLifecycleGeneration).toBe(before.viewport?.sceneLifecycleGeneration);
  expect(after.invariants.projectDirty).toBe(before.invariants.projectDirty);
  expect(await getActiveProjectRuntimeContext(page)).toEqual(beforeProject);
  await expect(page.getByTestId("design-system-root")).toHaveCount(1);
  await expect(page.getByTestId("editor-host")).toHaveCount(1);
  await expect(page.locator("canvas.scene-canvas")).toHaveCount(1);
  await page.reload();
  await waitForUiPreferences(page);
  await expect(page.getByTestId("workspace-preferences-trigger")).toContainText("Current arrangement");
  await expect(page.getByTestId("design-system-root")).toHaveAttribute("data-av-density", "compact");
  expect(errors).toEqual([]);
});

test("a hidden live panel is restored through Workspace and View and survives reload", async ({ page }) => {
  const errors = collectPageErrors(page);
  await openCleanApp(page);
  await waitForUiPreferences(page);
  const workspace = await openPreferenceBranch(page, "workspace");
  await workspace.surface.getByLabel("Layout Engineering", { exact: true }).check();

  let panels = await openVisiblePanels(page);
  await panels.surface.getByLabel("Layers", { exact: true }).uncheck();
  await expect(page.getByTestId("workspace-preferences-trigger")).toContainText("Current arrangement");
  await expect(page.getByTestId("primary-dock-tab-panel.layers")).toHaveCount(0);

  panels = await openVisiblePanels(page);
  const layersToggle = panels.surface.getByLabel("Layers", { exact: true });
  await expect(layersToggle).not.toBeChecked();
  await layersToggle.check();
  await expect(panels.surface).toBeVisible();
  await expect(page.getByTestId("primary-dock-tab-panel.layers")).toBeVisible();
  await page.reload();
  await waitForUiPreferences(page);
  await expect(page.getByTestId("primary-dock-tab-panel.layers")).toBeVisible();
  expect(errors).toEqual([]);
});

test("workspace panel controls follow live Connection Point Snap and Inspector availability", async ({ page }) => {
  const errors = collectPageErrors(page);
  await openCleanApp(page);
  await waitForUiPreferences(page);
  const canvas = page.locator("canvas.scene-canvas");
  const lifecycleGeneration = await canvas.getAttribute("data-scene-lifecycle-generation");

  const workspace = await openPreferenceBranch(page, "workspace");
  await workspace.surface.getByLabel("Layout Engineering", { exact: true }).check();
  const control = await openWorkspacePreferences(page);
  let panels = await openVisiblePanels(page);
  let snapLabel = panels.surface.locator("label").filter({ hasText: "Connection Point Snap" });
  let snapToggle = snapLabel.locator('input[type="checkbox"]');
  await expect(snapToggle).toBeDisabled();
  await expect(snapToggle).toBeChecked();
  await expect(snapLabel).toContainText("Select exactly two explicit machines.");
  const unavailableSnapshot = await page.evaluate(() => window.__atrvisuUiPreferences?.getSnapshot());
  await snapLabel.evaluate((element) => (element as HTMLLabelElement).click());
  await snapToggle.dispatchEvent("keydown", { key: " ", code: "Space" });
  expect(await page.evaluate(() => window.__atrvisuUiPreferences?.getSnapshot()))
    .toEqual(unavailableSnapshot);
  await expect(control.trigger).toContainText("Layout Engineering");
  await page.keyboard.press("Escape");
  await page.keyboard.press("Escape");

  const machineCard = page.locator(".machine-card").first();
  await machineCard.click();
  await machineCard.click();
  await waitForMachineDiagnostics(page, 2);
  const machineIds = await getMachineIds(page);
  await clickSceneMachine(page, machineIds[0]);
  await page.keyboard.down("Control");
  await clickSceneMachine(page, machineIds[1]);
  await page.keyboard.up("Control");
  await expect.poll(async () => (await getRuntimePanel(page, "panel.connectionPointSnap"))?.available)
    .toBe(true);
  await expect(page.getByTestId("contextual-panel-panel.connectionPointSnap")).toBeVisible();
  await expect(page.getByTestId("contextual-panel-panel.alignmentTools")).toBeVisible();
  const beforeContextVisibility = await getRuntimeViewportSnapshot(page);

  panels = await openVisiblePanels(page);
  snapLabel = panels.surface.locator("label").filter({ hasText: "Connection Point Snap" });
  snapToggle = snapLabel.locator('input[type="checkbox"]');
  await expect(snapToggle).toBeEnabled();
  await expect(snapToggle).toBeChecked();
  await snapToggle.uncheck();
  await expect(control.trigger).toContainText("Current arrangement");
  await expect(page.getByTestId("contextual-panel-panel.connectionPointSnap")).toHaveCount(0);
  expect(await getRuntimePanel(page, "panel.connectionPointSnap")).toMatchObject({
    visible: false,
    open: false
  });
  await snapToggle.check();
  await expect(page.getByTestId("contextual-panel-panel.connectionPointSnap")).toBeVisible();
  expect(await getRuntimePanel(page, "panel.connectionPointSnap")).toMatchObject({ visible: true });

  const alignmentLabel = panels.surface.locator("label").filter({ hasText: "Alignment Tools" });
  const alignmentToggle = alignmentLabel.locator('input[type="checkbox"]');
  await expect(alignmentToggle).toBeEnabled();
  await alignmentToggle.uncheck();
  await expect(page.getByTestId("contextual-panel-panel.alignmentTools")).toHaveCount(0);
  expect(await getRuntimePanel(page, "panel.alignmentTools")).toMatchObject({
    visible: false,
    open: false
  });
  await alignmentToggle.check();
  await expect(page.getByTestId("contextual-panel-panel.alignmentTools")).toBeVisible();
  const afterContextVisibility = await getRuntimeViewportSnapshot(page);
  expect(afterContextVisibility.invariants).toEqual(beforeContextVisibility.invariants);
  expect(afterContextVisibility.camera).toEqual(beforeContextVisibility.camera);
  expect(afterContextVisibility.viewport?.sceneLifecycleGeneration)
    .toBe(beforeContextVisibility.viewport?.sceneLifecycleGeneration);
  await page.keyboard.press("Escape");
  await page.keyboard.press("Escape");

  await clickSceneMachine(page, machineIds[0]);
  const beforeSingleContextVisibility = await getRuntimeViewportSnapshot(page);
  const precisionContribution = page.getByTestId("contextual-panel-panel.precisionPlacement");
  await expect(precisionContribution).toBeVisible();
  const precisionHeader = page.getByTestId(
    "contextual-panel-toggle-panel.precisionPlacement"
  );
  await precisionHeader.click();
  await expect(precisionHeader).toHaveAttribute("aria-expanded", "false");
  expect(await getRuntimePanel(page, "panel.precisionPlacement")).toMatchObject({
    visible: true,
    open: false
  });
  await precisionHeader.click();
  await expect(precisionHeader).toHaveAttribute("aria-expanded", "true");

  panels = await openVisiblePanels(page);
  const precisionToggle = panels.surface.getByLabel("Precision Placement", { exact: true });
  await expect(precisionToggle).toBeEnabled();
  await precisionToggle.uncheck();
  await expect(control.trigger).toContainText("Current arrangement");
  await expect(precisionContribution).toHaveCount(0);
  expect(await getRuntimePanel(page, "panel.precisionPlacement")).toMatchObject({
    visible: false,
    open: false
  });
  await precisionToggle.check();
  await expect(precisionContribution).toBeVisible();
  await page.keyboard.press("Escape");
  await page.keyboard.press("Escape");

  panels = await openVisiblePanels(page);
  let inspectorLabel = panels.surface.locator("label").filter({ hasText: "Inspector" });
  let inspectorToggle = inspectorLabel.locator('input[type="checkbox"]');
  await expect(inspectorToggle).toBeEnabled();
  await inspectorToggle.uncheck();
  await expect(page.getByRole("button", { name: /Selected Object Properties/i })).toHaveCount(0);
  expect(await getRuntimePanel(page, "panel.inspector")).toMatchObject({
    visible: false,
    open: false
  });
  await inspectorToggle.check();
  await expect(page.getByRole("button", { name: /Selected Object Properties/i })).toBeVisible();
  await page.keyboard.press("Escape");
  await page.keyboard.press("Escape");
  const afterSingleContextVisibility = await getRuntimeViewportSnapshot(page);
  expect(afterSingleContextVisibility.invariants).toEqual(beforeSingleContextVisibility.invariants);
  expect(afterSingleContextVisibility.camera).toEqual(beforeSingleContextVisibility.camera);
  expect(afterSingleContextVisibility.viewport?.sceneLifecycleGeneration)
    .toBe(beforeSingleContextVisibility.viewport?.sceneLifecycleGeneration);

  const insertMenu = await openWorkbenchMenu(page, "Insert");
  await insertMenu.locator('[data-command-id="annotations.create"]').click();
  const annotationsContribution = page.getByTestId("contextual-panel-panel.annotations");
  await expect(annotationsContribution).toBeVisible();
  await expect(page.getByTestId("annotation-properties")).toBeVisible();
  await expect.poll(async () => (await getRuntimePanel(page, "panel.inspector"))?.available)
    .toBe(true);
  const beforeAnnotationVisibility = await getRuntimeViewportSnapshot(page);

  panels = await openVisiblePanels(page);
  const annotationsToggle = panels.surface.getByLabel("Annotations", { exact: true });
  await expect(annotationsToggle).toBeEnabled();
  await annotationsToggle.uncheck();
  await expect(annotationsContribution).toHaveCount(0);
  await expect(page.getByTestId("annotation-properties")).toHaveCount(0);
  expect(await getRuntimePanel(page, "panel.annotations")).toMatchObject({
    visible: false,
    open: false
  });
  await annotationsToggle.check();
  await expect(annotationsContribution).toBeVisible();
  await expect(page.getByTestId("annotation-properties")).toBeVisible();
  const afterAnnotationVisibility = await getRuntimeViewportSnapshot(page);
  expect(afterAnnotationVisibility.invariants).toEqual(beforeAnnotationVisibility.invariants);
  expect(afterAnnotationVisibility.camera).toEqual(beforeAnnotationVisibility.camera);
  expect(afterAnnotationVisibility.viewport?.sceneLifecycleGeneration)
    .toBe(beforeAnnotationVisibility.viewport?.sceneLifecycleGeneration);
  inspectorLabel = panels.surface.locator("label").filter({ hasText: "Inspector" });
  inspectorToggle = inspectorLabel.locator('input[type="checkbox"]');
  await expect(inspectorToggle).toBeEnabled();
  await page.keyboard.press("Escape");
  await page.keyboard.press("Escape");

  await clickSceneMachine(page, machineIds[0]);
  await expect.poll(async () => (await getRuntimePanel(page, "panel.inspector"))?.available)
    .toBe(true);
  panels = await openVisiblePanels(page);
  inspectorToggle = panels.surface.locator("label")
    .filter({ hasText: "Inspector" })
    .locator('input[type="checkbox"]');
  await expect(inspectorToggle).toBeEnabled();
  await expect(page.getByTestId("app-root")).toHaveCount(1);
  await expect(page.getByTestId("editor-host")).toHaveCount(1);
  await expect(page.getByTestId("design-system-root")).toHaveCount(1);
  await expect(canvas).toHaveCount(1);
  await expect(canvas).toHaveAttribute("data-scene-lifecycle-generation", lifecycleGeneration ?? "");
  const finalContextVisibility = await getRuntimeViewportSnapshot(page);
  expect(finalContextVisibility.camera).toEqual(beforeContextVisibility.camera);
  expect(finalContextVisibility.viewport?.sceneLifecycleGeneration)
    .toBe(beforeContextVisibility.viewport?.sceneLifecycleGeneration);
  expect(errors).toEqual([]);
});

test("future-version preferences expose an inspectable read-only Workspace and View surface", async ({ page }) => {
  const errors = collectPageErrors(page);
  const futureRecord = {
    ...createE2EUiPreferences({
      theme: "light",
      density: "compact",
      activeWorkspaceId: "workspace.layout-engineering"
    }),
    schemaVersion: 3,
    futurePreference: { preserve: "byte-for-byte" }
  };
  await seedUiPreferences(page, futureRecord);
  await page.goto("/?e2eDiagnostics=1");
  await expect(page.getByTestId("app-root")).toBeVisible();
  await waitForUiPreferences(page, "future-readonly");
  const rawBefore = await readRawUiPreferencesJson(page);
  const snapshotBefore = await page.evaluate(() => window.__atrvisuUiPreferences?.getSnapshot());
  const canvas = page.locator("canvas.scene-canvas");
  const lifecycleGeneration = await canvas.getAttribute("data-scene-lifecycle-generation");

  const control = await openWorkspacePreferences(page);
  const message = page.getByTestId("workspace-preferences-read-only-message");
  await expect(message).toBeVisible();
  await expect(message).toContainText("unsupported schema version 3");
  await expect(control.popover).toHaveAttribute("aria-describedby", await message.getAttribute("id") ?? "");
  await expect(control.popover.locator(".workspace-preference-disclosure-row")).toHaveCount(4);
  await expect(control.popover.locator("input")).toHaveCount(0);

  for (const branchId of ["workspace", "theme", "density", "visible-panels"] as const) {
    const branch = await openPreferenceBranch(page, branchId);
    const controls = branch.surface.locator("input");
    expect(await controls.count()).toBeGreaterThan(0);
    await expect(branch.surface).toHaveAttribute(
      "aria-describedby",
      await message.getAttribute("id") ?? ""
    );
    for (let index = 0; index < await controls.count(); index += 1) {
      await expect(controls.nth(index)).toBeDisabled();
      await controls.nth(index).evaluate((element) => (element as HTMLInputElement).click());
    }
    await expect(message).toBeVisible();
  }

  expect(await readRawUiPreferencesJson(page)).toBe(rawBefore);
  expect(await page.evaluate(() => window.__atrvisuUiPreferences?.getSnapshot()))
    .toEqual(snapshotBefore);
  await expect(page.getByTestId("app-root")).toHaveCount(1);
  await expect(page.getByTestId("editor-host")).toHaveCount(1);
  await expect(page.getByTestId("design-system-root")).toHaveCount(1);
  await expect(canvas).toHaveCount(1);
  await expect(canvas).toHaveAttribute("data-scene-lifecycle-generation", lifecycleGeneration ?? "");
  expect(errors).toEqual([]);
});

test("Visible Panels stays open for multiple desktop changes without nested root scrolling", async ({ page }) => {
  const errors = collectPageErrors(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await openCleanApp(page);
  await waitForUiPreferences(page);
  const before = await getRuntimeViewportSnapshot(page);
  const workspace = await openPreferenceBranch(page, "workspace");
  await workspace.surface.getByLabel("Layout Engineering", { exact: true }).check();
  const root = await openWorkspacePreferences(page);
  const panels = await openVisiblePanels(page);
  const flyout = page.getByTestId("workspace-visible-panels-flyout");
  await expect(flyout).toBeVisible();
  await expect(flyout).toHaveAttribute("data-cascading-depth", "1");
  await expect(flyout).toHaveAttribute("data-cascading-side", /right|left/);
  await expect(root.popover.locator('input[type="checkbox"]')).toHaveCount(0);
  await expect(root.popover.locator(".workspace-panel-preferences")).toHaveCount(0);

  const rootBox = await root.popover.boundingBox();
  const flyoutBox = await flyout.boundingBox();
  expect(rootBox).not.toBeNull();
  expect(flyoutBox).not.toBeNull();
  expect(flyoutBox!.x >= rootBox!.x + rootBox!.width || rootBox!.x >= flyoutBox!.x + flyoutBox!.width)
    .toBe(true);
  expect(flyoutBox!.x).toBeGreaterThanOrEqual(0);
  expect(flyoutBox!.x + flyoutBox!.width).toBeLessThanOrEqual(1440);
  expect(flyoutBox!.y).toBeGreaterThanOrEqual(0);
  expect(flyoutBox!.y + flyoutBox!.height).toBeLessThanOrEqual(900);
  expect(await root.popover.evaluate((element) => element.scrollHeight <= element.clientHeight)).toBe(true);

  const layers = panels.surface.getByLabel("Layers", { exact: true });
  const groups = panels.surface.getByLabel("Groups", { exact: true });
  const layersInitiallyChecked = await layers.isChecked();
  const groupsInitiallyChecked = await groups.isChecked();
  await layers.setChecked(!layersInitiallyChecked);
  await groups.setChecked(!groupsInitiallyChecked);
  await expect(panels.surface).toBeVisible();
  await layers.setChecked(layersInitiallyChecked);
  await groups.setChecked(groupsInitiallyChecked);
  await expect(panels.surface).toBeVisible();

  expect((await getRuntimeViewportSnapshot(page)).invariants).toEqual(before.invariants);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  expect(errors).toEqual([]);
});

test("workspace preferences are keyboard complete and stay inside responsive application geometry", async ({ page }) => {
  const errors = collectPageErrors(page);
  await openCleanApp(page);
  await waitForUiPreferences(page);
  const before = await getRuntimeViewportSnapshot(page);
  const trigger = page.getByTestId("workspace-preferences-trigger");
  await trigger.focus();
  await trigger.press("Enter");
  const popover = page.getByTestId("workspace-preferences-popover");
  await expect(popover).toBeVisible();
  const workspaceTrigger = popover.getByTestId("workspace-preferences-workspace-trigger");
  await workspaceTrigger.focus();
  await workspaceTrigger.press("ArrowRight");
  const workspaceSurface = page.locator("#workspace-preferences-workspace-surface");
  await expect(workspaceSurface).toBeVisible();
  await expect(workspaceSurface.locator(":focus")).toHaveCount(1);
  await page.keyboard.press("ArrowLeft");
  await expect(workspaceSurface).toHaveCount(0);
  await expect(workspaceTrigger).toBeFocused();

  const themeTrigger = popover.getByTestId("workspace-preferences-theme-trigger");
  await themeTrigger.focus();
  await themeTrigger.press("ArrowRight");
  const themeSurface = page.locator("#workspace-preferences-theme-surface");
  await expect(themeSurface).toBeVisible();
  await expect(themeSurface.locator(":focus")).toHaveCount(1);
  await page.keyboard.press("Escape");
  await expect(themeSurface).toHaveCount(0);
  await expect(themeTrigger).toBeFocused();
  await themeTrigger.press("Escape");
  await expect(popover).toHaveCount(0);
  await expect(trigger).toBeFocused();
  expect((await getRuntimeViewportSnapshot(page)).invariants).toEqual(before.invariants);

  for (const viewport of [
    { width: 1440, height: 900 },
    { width: 1024, height: 768 },
    { width: 640, height: 800 }
  ]) {
    await page.setViewportSize(viewport);
    const current = await openWorkspacePreferences(page);
    const box = await current.popover.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.y).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(viewport.width);
    expect(box!.y + box!.height).toBeLessThanOrEqual(viewport.height);
    expect(box!.height).toBeLessThan(viewport.height * 0.8);
    const branchIds = viewport.width === 640
      ? (["workspace", "theme", "density", "visible-panels"] as const)
      : (["visible-panels"] as const);
    for (const branchId of branchIds) {
      const branch = await openPreferenceBranch(page, branchId);
      const isDrillIn = await current.popover.getAttribute("data-cascading-presentation") === "drill-in";
      if (viewport.width === 640 || isDrillIn) {
        await expect(page.locator(".cascading-flyout-surface")).toHaveCount(0);
        await expect(current.popover).toHaveAttribute("data-cascading-presentation", "drill-in");
        await expect(branch.surface).toBeVisible();
        const back = current.popover.getByRole("button", { name: /Workspace & View/ });
        await expect(back).toBeVisible();
        expect(await current.popover.evaluate((element) => {
          const nestedScrollers = [...element.querySelectorAll("*")].filter((candidate) => {
            const style = getComputedStyle(candidate);
            return (style.overflowY === "auto" || style.overflowY === "scroll")
              && candidate.scrollHeight > candidate.clientHeight;
          });
          return nestedScrollers.length;
        })).toBe(0);
        await back.click();
        await expect(current.popover.getByTestId(preferenceBranchIds[branchId].trigger)).toBeFocused();
      } else {
        const child = page.getByTestId(
          branchId === "visible-panels"
            ? "workspace-visible-panels-flyout"
            : `workspace-preferences-${branchId}-flyout`
        );
        await expect(child).toBeVisible();
        await expect(branch.surface).toHaveCount(1);
        const childBox = await child.boundingBox();
        expect(childBox).not.toBeNull();
        expect(childBox!.x).toBeGreaterThanOrEqual(0);
        expect(childBox!.x + childBox!.width).toBeLessThanOrEqual(viewport.width);
        expect(childBox!.y).toBeGreaterThanOrEqual(0);
        expect(childBox!.y + childBox!.height).toBeLessThanOrEqual(viewport.height);
        await page.keyboard.press("Escape");
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth))
        .toBe(true);
    }
    await page.keyboard.press("Escape");
  }
  await expect(page.getByTestId("workbench-application-bar")).toBeVisible();
  await expect(page.locator('[data-command-id="project.save"]')).toBeVisible();
  await expect(page.getByTestId("editor-host")).toHaveCount(1);
  await expect(page.locator("canvas.scene-canvas")).toHaveCount(1);
  expect(errors).toEqual([]);
});

