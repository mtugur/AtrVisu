import type { WorkbenchUiPreferences } from "../../platform/contracts";
import { RUNTIME_PANEL_IDS } from "../../platform/runtimePanels/runtimePanelRegistryBridge";
import { cloneWorkbenchUiPreferences, createDefaultWorkbenchUiPreferences } from "./uiPreferencesDefaults";
import { normalizeWorkbenchUiPreferences } from "./uiPreferencesNormalizer";
import type { UiPreferencesReadResult, UiPreferencesStorage } from "./uiPreferencesStorage";

export const LEGACY_RIGHT_PANEL_WIDTH_KEY = "atrvisu.rightPanelWidth.v1";
export const LEGACY_RIGHT_PANEL_COLLAPSED_KEY = "atrvisu.rightPanelCollapsed.v1";

export const LEGACY_PANEL_SECTION_KEYS = [
  ["atrvisu.panelSection.machineLibrary.v1", RUNTIME_PANEL_IDS.machineLibrary],
  ["atrvisu.panelSection.layoutControls.v1", RUNTIME_PANEL_IDS.layoutControls],
  ["atrvisu.panelSection.viewpoints.v1", RUNTIME_PANEL_IDS.viewpoints],
  ["atrvisu.panelSection.layers.v1", RUNTIME_PANEL_IDS.layers],
  ["atrvisu.panelSection.civilReferences.v1", RUNTIME_PANEL_IDS.civilReferences],
  ["atrvisu.panelSection.assemblyTree.v1", RUNTIME_PANEL_IDS.groups],
  ["atrvisu.panelSection.projectManager.v1", RUNTIME_PANEL_IDS.projectStatus],
  ["atrvisu.panelSection.performanceBenchmark.v1", RUNTIME_PANEL_IDS.performanceBenchmarkLauncher],
  ["atrvisu.panelSection.simulationControls.v1", RUNTIME_PANEL_IDS.simulationControls],
  ["atrvisu.panelSection.annotations.v1", RUNTIME_PANEL_IDS.annotations],
  ["atrvisu.panelSection.precisionPlacement.v1", RUNTIME_PANEL_IDS.precisionPlacement],
  ["atrvisu.panelSection.alignmentTools.v1", RUNTIME_PANEL_IDS.alignmentTools],
  ["atrvisu.panelSection.connectionPointSnap.v1", RUNTIME_PANEL_IDS.connectionPointSnap],
  ["atrvisu.panelSection.overlayControls.v1", RUNTIME_PANEL_IDS.displayOverlayControls],
  ["atrvisu.panelSection.collisionCheck.v1", RUNTIME_PANEL_IDS.collisionCheck],
  ["atrvisu.panelSection.properties.v1", RUNTIME_PANEL_IDS.inspector]
] as const;

export type LegacyStorageLike = Pick<Storage, "getItem" | "removeItem">;

export type UiPreferencesInitializationResult = {
  readResult: UiPreferencesReadResult;
  preferences: WorkbenchUiPreferences;
  migrated: boolean;
  warning?: string;
};

const readLegacyPreferences = (legacyStorage: LegacyStorageLike) => {
  const defaults = createDefaultWorkbenchUiPreferences();
  const byId = new Map(defaults.panels.map((panel) => [panel.panelId, { ...panel }]));
  const consumedKeys: string[] = [];
  const widthValue = legacyStorage.getItem(LEGACY_RIGHT_PANEL_WIDTH_KEY);
  if (widthValue !== null) {
    consumedKeys.push(LEGACY_RIGHT_PANEL_WIDTH_KEY);
    const width = Number(widthValue);
    if (Number.isFinite(width)) {
      const shell = byId.get(RUNTIME_PANEL_IDS.rightPanelShell);
      if (shell) {
        byId.set(shell.panelId, { ...shell, size: width });
      }
    }
  }
  const collapsedValue = legacyStorage.getItem(LEGACY_RIGHT_PANEL_COLLAPSED_KEY);
  if (collapsedValue !== null) {
    consumedKeys.push(LEGACY_RIGHT_PANEL_COLLAPSED_KEY);
    const shell = byId.get(RUNTIME_PANEL_IDS.rightPanelShell);
    if (shell) {
      byId.set(shell.panelId, { ...shell, collapsed: collapsedValue === "collapsed" });
    }
  }
  LEGACY_PANEL_SECTION_KEYS.forEach(([key, panelId]) => {
    const value = legacyStorage.getItem(key);
    if (value === null) {
      return;
    }
    consumedKeys.push(key);
    const panel = byId.get(panelId);
    if (panel && (value === "expanded" || value === "collapsed")) {
      byId.set(panelId, { ...panel, collapsed: value === "collapsed" });
    }
  });
  return {
    preferences: normalizeWorkbenchUiPreferences({
      ...defaults,
      panels: defaults.panels.map((panel) => byId.get(panel.panelId) ?? panel)
    }).preferences,
    consumedKeys
  };
};

export const initializeUiPreferences = async (
  storage: UiPreferencesStorage,
  legacyStorage: LegacyStorageLike
): Promise<UiPreferencesInitializationResult> => {
  const readResult = await storage.read();
  if (readResult.status === "valid") {
    return {
      readResult,
      preferences: cloneWorkbenchUiPreferences(readResult.preferences),
      migrated: false,
      ...(readResult.warnings.length > 0 ? { warning: readResult.warnings.join(" ") } : {})
    };
  }
  if (readResult.status === "future-version" || readResult.status === "invalid") {
    return {
      readResult,
      preferences: createDefaultWorkbenchUiPreferences(),
      migrated: false,
      warning: readResult.warning
    };
  }
  if (readResult.status === "storage-error") {
    return {
      readResult,
      preferences: createDefaultWorkbenchUiPreferences(),
      migrated: false,
      warning: readResult.warning
    };
  }

  const legacy = readLegacyPreferences(legacyStorage);
  try {
    await storage.put(legacy.preferences);
    legacy.consumedKeys.forEach((key) => legacyStorage.removeItem(key));
    return {
      readResult,
      preferences: cloneWorkbenchUiPreferences(legacy.preferences),
      migrated: legacy.consumedKeys.length > 0
    };
  } catch {
    return {
      readResult: {
        status: "storage-error",
        error: new Error("Legacy UI preference migration write failed."),
        warning: "Legacy UI preferences could not be persisted; values remain available for a later retry."
      },
      preferences: cloneWorkbenchUiPreferences(legacy.preferences),
      migrated: false,
      warning: "Legacy UI preferences could not be persisted; values remain available for a later retry."
    };
  }
};
