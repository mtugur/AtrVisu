import type {
  CommandId,
  DensityId,
  EditorId,
  PanelId,
  ThemeId,
  WorkbenchUiPreferences,
  WorkspaceId,
  WorkspaceInspectorMode,
  WorkspacePreset
} from "../../platform/contracts";
import { RUNTIME_PANEL_IDS } from "../../platform/runtimePanels";
import type {
  UiPreferencesRuntimeStore,
  UiPreferencesUpdateResult
} from "../uiPreferences";
import { LAYOUT_3D_EDITOR_ID } from "../layout3dEditorDefinition";
import { applyWorkspaceToPreferences, clearActiveWorkspace } from "./workspaceApplication";
import {
  liveWorkspacePanelDescriptors,
  workspacePresetRegistry,
  type WorkspacePresetRegistry
} from "./workspacePresetRegistry";

export type WorkspaceRuntimeProjection = Readonly<{
  activeWorkspaceId?: WorkspaceId;
  activePreset?: Readonly<WorkspacePreset>;
  inspectorMode: WorkspaceInspectorMode;
  emphasizedCommandIds: readonly CommandId[];
  defaultEditorId: EditorId;
}>;

export type WorkspaceRuntimeOperationResult = UiPreferencesUpdateResult & Readonly<{
  reason?: string;
}>;

export type WorkspaceRuntime = Readonly<{
  getProjection: (preferences?: WorkbenchUiPreferences) => WorkspaceRuntimeProjection;
  applyWorkspace: (workspaceId: string) => WorkspaceRuntimeOperationResult;
  useCurrentArrangement: () => WorkspaceRuntimeOperationResult;
  updateTheme: (theme: ThemeId) => WorkspaceRuntimeOperationResult;
  updateDensity: (density: DensityId) => WorkspaceRuntimeOperationResult;
  updatePanelVisibility: (panelId: PanelId, visible: boolean) => WorkspaceRuntimeOperationResult;
}>;

export type WorkspaceRuntimeDiagnosticsSnapshot = Readonly<{
  activeWorkspaceId?: WorkspaceId;
  inspectorMode: WorkspaceInspectorMode;
  emphasizedCommandIds: readonly CommandId[];
  preferences: WorkbenchUiPreferences;
}>;

export type WorkspaceRuntimeE2EBridge = Readonly<{
  getSnapshot: () => WorkspaceRuntimeDiagnosticsSnapshot;
}>;

declare global {
  interface Window {
    __atrvisuWorkspace?: WorkspaceRuntimeE2EBridge;
  }
}

const rejected = (reason: string): WorkspaceRuntimeOperationResult => ({
  accepted: false,
  persisted: Promise.resolve(false),
  reason
});

const livePanelIds = new Set(liveWorkspacePanelDescriptors.map(({ definition }) => definition.id));

export const deriveWorkspaceRuntimeProjection = (
  preferences: WorkbenchUiPreferences,
  registry: WorkspacePresetRegistry = workspacePresetRegistry
): WorkspaceRuntimeProjection => {
  const activePreset = preferences.activeWorkspaceId
    ? registry.get(preferences.activeWorkspaceId)
    : undefined;
  if (!activePreset) {
    return Object.freeze({
      inspectorMode: "contextual",
      emphasizedCommandIds: Object.freeze([]),
      defaultEditorId: LAYOUT_3D_EDITOR_ID
    });
  }
  return Object.freeze({
    activeWorkspaceId: activePreset.id,
    activePreset,
    inspectorMode: activePreset.inspectorMode,
    emphasizedCommandIds: activePreset.emphasizedCommandIds,
    defaultEditorId: activePreset.defaultEditorId
  });
};

export const createWorkspaceRuntime = (
  preferencesStore: UiPreferencesRuntimeStore,
  registry: WorkspacePresetRegistry = workspacePresetRegistry
): WorkspaceRuntime => ({
  getProjection: (preferences = preferencesStore.getSnapshot().preferences) =>
    deriveWorkspaceRuntimeProjection(preferences, registry),
  applyWorkspace: (workspaceId) => {
    if (!registry.has(workspaceId)) {
      return rejected(`Unknown workspace preset "${workspaceId}".`);
    }
    return preferencesStore.updatePreferences((current) =>
      applyWorkspaceToPreferences(current, workspaceId, registry).preferences);
  },
  useCurrentArrangement: () => preferencesStore.updatePreferences(clearActiveWorkspace),
  updateTheme: (theme) => preferencesStore.updateTheme(theme),
  updateDensity: (density) => preferencesStore.updatePreferences((current) => {
    const next = { ...current, density };
    const activePreset = current.activeWorkspaceId ? registry.get(current.activeWorkspaceId) : undefined;
    if (activePreset?.densityPreference && activePreset.densityPreference !== density) {
      delete next.activeWorkspaceId;
    }
    return next;
  }),
  updatePanelVisibility: (panelId, visible) => {
    if (panelId === RUNTIME_PANEL_IDS.rightPanelShell || !livePanelIds.has(panelId)) {
      return rejected(`Panel "${panelId}" is not a live workspace content panel.`);
    }
    return preferencesStore.updatePreferences((current) => ({
      ...clearActiveWorkspace(current),
      panels: current.panels.map((panel) => panel.panelId === panelId
        ? { ...panel, visible }
        : panel)
    }));
  }
});
