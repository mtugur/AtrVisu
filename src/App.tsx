import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import type { CSSProperties } from "react";
import type { ChangeEvent } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import { BabylonScene, type BabylonSceneHandle } from "./components/BabylonScene";
import { EditorHost } from "./components/EditorHost";
import { EmptyProjectWelcome } from "./components/EmptyProjectWelcome";
import { HelpModal, type HelpSection } from "./components/HelpModal";
import { NativeAssetImport } from "./components/NativeAssetImport";
import { customAssets } from "./nativeAssets/customAssets";
import { WorkbenchShell } from "./components/WorkbenchShell";
import {
  CommandPalette,
  ViewportArrangeBar,
  WorkbenchApplicationBar,
  WorkbenchCommandBar,
  WorkbenchDockCollapseButton,
  WorkbenchMenuBar,
  WorkspacePreferencesControl
} from "./components/workbench";
import { LayoutExplorer } from "./components/workbench/LayoutExplorer";
import { WorkbenchPrimaryDock } from "./components/workbench/WorkbenchPrimaryDock";
import { WorkbenchStatusBar } from "./components/workbench/WorkbenchStatusBar";
import { WorkbenchContextContribution } from "./components/workbench/WorkbenchContextContribution";
import {
  isResponsiveInspectorPresentation,
  isResponsivePrimaryDockPresentation,
  resolveInspectorPresentationCollapsed,
  resolvePrimaryDockPresentationCollapsed
} from "./components/workbench/responsivePresentation";
import { AssemblyTreePanel } from "./components/AssemblyTreePanel";
import { CollisionCheckPanel } from "./components/CollisionCheckPanel";
import { ConnectionPointSnapPanel } from "./components/ConnectionPointSnapPanel";
import { CivilReferencePanel } from "./components/CivilReferencePanel";
import { CivilReferenceProperties } from "./components/CivilReferenceProperties";
import { CommercialOutputsModal } from "./components/CommercialOutputsModal";
import { AnnotationsPanel } from "./components/AnnotationsPanel";
import { DisplayOverlayControls } from "./components/DisplayOverlayControls";
import { AlignmentToolsPanel } from "./components/AlignmentToolsPanel";
import { LayoutControls } from "./components/LayoutControls";
import { LayersPanel } from "./components/LayersPanel";
import { MachineLibrary } from "./components/MachineLibrary";
import type { LibraryManagerRuntimeController } from "./components/LibraryManager";
import { MachineProperties } from "./components/MachineProperties";
import { MultiSelectionProperties } from "./components/MultiSelectionProperties";
import { PanelSection } from "./components/PanelSection";
import { PrecisionPlacementPanel } from "./components/PrecisionPlacementPanel";
import { PerformanceBenchmarkModal } from "./components/PerformanceBenchmarkModal";
import { ProjectManager } from "./components/ProjectManager";
import { SimulationControls } from "./components/SimulationControls";
import { ViewpointsPanel } from "./components/ViewpointsPanel";
import type { AtrVisuLayout, MachineDefinition, PlacedMachine } from "./types/machine";
import type { AlignmentAction, DistributionAction, EqualGapAction, FootprintAnchor, PairAlignmentAction } from "./types/alignment";
import type { NudgeSettings, SelectionMode } from "./types/selection";
import type { OverlaySettings, VisualModelDiagnostics } from "./types/overlays";
import type { PlacementSettings } from "./types/placement";
import type { AtrVisuProject } from "./types/project";
import type { ScenePerformanceMetrics } from "./types/performance";
import type { MachineConnectionPoint } from "./types/ataraMachineData";
import type { AnnotationObject, AnnotationType } from "./types/annotations";
import type { CivilReferenceItem, CivilReferenceType } from "./types/civil";
import type { ObjectGroup } from "./types/groups";
import type { LayoutLayer } from "./types/layers";
import type { LayoutViewpoint, ViewpointDisplayState } from "./types/viewpoints";
import { createCommercialOutputSnapshot } from "./commercialOutputs/commercialOutputSnapshot";
import type { CommercialOutputKind } from "./commercialOutputs/types";
import { createCommercialOutputFileName } from "./commercialOutputs/fileNames";
import { createLayoutPlanModel } from "./commercialOutputs/layoutPlan";
import { dataUrlToBytes, downloadCommercialOutput, getPngDimensions } from "./commercialOutputs/download";
import { createCommandSurfaceAdapter } from "./workbench/commandSurfaces";
import { checkAllObjectCollisions } from "./utils/collision";
import { loadCollisionSettings, saveCollisionSettings } from "./utils/collisionSettings";
import { COORDINATE_REFERENCE_VERSION, LAYOUT_REFERENCE_POINT, getCivilReferenceFootprintBoundsMm } from "./utils/coordinateReference";
import { normalizeMachineDefinitionDimensions } from "./utils/machineDimensions";
import { annotationsFromLayout, civilReferencesFromLayout, createLayoutSnapshotFromMachines, groupsFromLayout, layersFromLayout, placedMachinesFromLayout, viewpointsFromLayout } from "./utils/layoutSerialization";
import { loadOverlaySettings, saveOverlaySettings } from "./utils/overlaySettings";
import {
  applyPositionSnap,
  applyRotationSnap,
  createMachineInstanceId,
  duplicatePlacedMachines,
  getMachinePlanPositionMm
} from "./utils/placement";
import {
  alignObjectsToAnchor,
  alignEntitiesToAnchor,
  applyMachinePositionUpdates,
  applyEntityPairAlignment,
  applyPairAlignment,
  distributeObjectsByCenter,
  distributeEntitiesByCenter,
  equalizeGaps,
  equalizeEntityGaps,
  getAlignableEntityKey,
  selectionHasLockedAlignableEntities,
  snapPrimaryEntityAnchorToSecondaryAnchor,
  snapPrimaryAnchorToSecondaryAnchor
} from "./utils/alignment";
import { createLayoutHistory, pushHistorySnapshot, redoHistory, undoHistory } from "./utils/layoutHistory";
import { loadPlacementSettings, savePlacementSettings } from "./utils/placementSettings";
import { listProjects } from "./utils/projectStorage";
import { initializeProjectStorage } from "./utils/storage/storageMigration";
import { metersToMm, mmToMeters } from "./utils/units";
import { normalizeMachineVisualModel } from "./utils/visualModel";
import { getPlacedMachineDisplayName } from "./utils/entityNames";
import { isRenameableProjectEntityId, renameProjectEntity } from "./utils/entityRename";
import { getObjectPlanBounds, getSelectionPlanBounds } from "./utils/selectionBounds";
import {
  applyConnectionPointSnap,
  evaluatePremiumConnectionPointSnapContext,
  executeGuardedConnectionPointSnap,
  getConnectionPointSnapContextMessage,
  type ConnectionPointSnapSelection
} from "./utils/connectionPointSnap";
import {
  createAnnotation,
  deleteAnnotation,
  detachAnnotationsForDeletedObjects,
  updateAnnotation
} from "./utils/annotations";
import {
  createCivilReference,
  deleteCivilReference,
  getVisibleCivilReferences,
  normalizeCivilReferences,
  updateCivilReference
} from "./utils/civil";
import { addViewpoint, createViewpoint, deleteViewpoint, updateViewpoint } from "./utils/viewpoints";
import {
  getEditorCommandIdForShortcutAction,
  resolveEditorShortcut,
  shouldPreventEditorShortcutDefault
} from "./utils/keyboardShortcuts";
import {
  CORE_EDITOR_COMMAND_IDS,
  createCoreEditorCommandAction,
  createCoreEditorRuntimeCommandBridge,
  isDeleteSelectionEligible,
  isMachineSelectionDuplicable,
  type CoreEditorCommandId,
  type CoreEditorRuntimeCommandBindings
} from "./platform/runtimeCommands/coreEditorRuntimeCommands";
import {
  ASSEMBLY_COMMAND_IDS,
  createAssemblyRuntimeCommandBridge,
  type AssemblyCommandId,
  type AssemblyRuntimeCommandBindings
} from "./platform/runtimeCommands/assemblyRuntimeCommands";
import {
  RUNTIME_FEATURE_COMMAND_IDS,
  createExecutedRuntimeFeatureCommandResult,
  createRuntimeFeatureCommandBridge,
  type RuntimeCommandReachability,
  type RuntimeFeatureCommandBindings,
  type RuntimeFeatureCommandId,
  type RuntimeFeatureCommandOperationResult
} from "./platform/runtimeCommands/runtimeFeatureCommands";
import { createArrangeRuntimeCommandBindings } from "./platform/runtimeCommands/arrangeRuntimeCommands";
import {
  createExecutedRuntimeCommandResult,
  createFailedRuntimeCommandResult,
  createNextRuntimeCommandExecutionProbe,
  createUnavailableRuntimeCommandResult,
  executeConfirmedRuntimeCommandOperation,
  type RuntimeCommandOperationResult
} from "./platform/runtimeCommands/runtimeCommandOperation";
import {
  createProjectImportRequestLifecycle,
  createProjectRuntimeCommandBindings,
  executeProjectImportRequest,
  PROJECT_RUNTIME_COMMAND_IDS,
  type ProjectRuntimeCommandE2EBridge,
  type ProjectImportCommandPayload
} from "./platform/runtimeCommands/projectRuntimeCommandAuthority";
import {
  getProjectManagerEntryIntent,
  type ProjectManagerEntryIntent
} from "./platform/runtimeCommands/projectManagerEntryIntent";
import { createLegacyEntitySnapshot, createLegacyPlatformEntityId } from "./platform/adapters/legacyEntityAdapter";
import {
  applyRuntimeSelectionRequest,
  areRuntimeSelectionsEqual,
  createEmptyRuntimeSelection,
  createRuntimeSelectionMovementPreflight,
  evaluateAtomicMovement,
  executeAtomicSelectionMutation,
  getAtomicMovementEntityIds,
  parseRuntimeSelectionEntityId,
  projectExplicitRuntimeSelection,
  projectRuntimeSelection,
  reconcileRuntimeSelection,
  replaceRuntimeSelection
} from "./platform/runtimeSelection";
import {
  addObjectsToGroup,
  createObjectGroup,
  getSelectedGroupMemberEntityIds,
  normalizeGroups,
  removeObjectsFromGroupWithResult,
  removeObjectsFromGroups,
  ungroupObjectGroup
} from "./utils/groups";
import {
  getCivilPositionUpdateDelta,
  getMachinePositionUpdateDelta,
  moveAssemblyMembersByDelta
} from "./utils/assemblyRuntime";
import {
  createDefaultLayer,
  createLayer,
  deleteLayerAndReassignItems,
  getLayer,
  getLayerId,
  isLayerLocked,
  isLayerVisible,
  isolateLayer,
  normalizeLayers,
  showAllLayers
} from "./utils/layers";
import {
  RUNTIME_PANEL_IDS,
  closeMachineLibraryManagerModals,
  createRuntimePanelRegistryBridge,
  openMachineLibraryManagerExclusively,
  type RuntimePanelBinding,
  type RuntimePanelBindings,
  type RuntimePanelOperationResult,
  type RuntimePanelReachability,
  type RuntimePanelState
} from "./platform/runtimePanels";
import {
  createViewportResizeRequest,
  type CommandContext,
  type EntityId,
  type PanelId,
  type WorkspaceId
} from "./platform/contracts";
import {
  RUNTIME_VIEWPORT_IDS,
  createRuntimeViewportInvariantSnapshot,
  createRuntimeViewportBridge,
  getRuntimeViewportShellResizeReason,
  refreshRuntimeViewportInvariantSnapshot,
  type RuntimeViewportBindings,
  type RuntimeViewportInvariantSnapshot,
  type RuntimeViewportState
} from "./platform/runtimeViewport";
import { platformFeatureAccessMatrix } from "./platform/featureAccess";
import { currentPlatformSurfaceInventory } from "./platform/surfaceInventory";
import {
  createRuntimeEntityAccessEvidence,
  createRuntimeFeatureAccessGate,
  createRuntimeFeatureAccessReport,
  createRuntimeSelectionAccessEvidence,
  createRuntimeSurfaceExecutionAuthority,
  deriveRequiredRuntimeSurfaceExecutionCommandIds,
  type RuntimeCommandAccessEvidence,
  type RuntimeCommandExecutionProbe,
  type RuntimeFeatureAccessExternalEvidence,
  type RuntimeFeatureAccessE2EBridge,
  type RuntimeFeatureAccessEvidence,
  type RuntimeEntityAuthorityCapabilities,
  type RuntimePanelAccessEvidence,
  type RuntimeSelectionAuthorityCapabilities,
  type RuntimeSurfaceExecutionAuthority,
  type RuntimeViewportAccessEvidence
} from "./platform/runtimeFeatureAccess";
import { getPlatformCommandSeedById } from "./platform/registrySeeds";
import { createEditorDefinitionRegistry } from "./platform/editorDefinitionRegistry";
import { createEditorRuntimeRegistry } from "./workbench/editorRuntimeRegistry";
import {
  MAX_RIGHT_PANEL_WIDTH,
  MIN_RIGHT_PANEL_WIDTH,
  type CompatibilityPanelId,
  useUiPreferences,
  useUiPreferencesStore
} from "./workbench/uiPreferences";
import {
  LAYOUT_3D_EDITOR_DEFINITION,
  LAYOUT_3D_EDITOR_ID
} from "./workbench/layout3dEditorDefinition";
import {
  DEFAULT_PRIMARY_DOCK_WIDTH,
  DOCK_RESIZE_BREAKPOINT,
  clampDockSize,
  getPrimaryDockWidthBounds
} from "./workbench/dockSizing";
import {
  createWorkspaceRuntime,
  liveWorkspacePanelDescriptors,
  workspaceFallbackLabels,
  workspaceFallbackTooltips,
  workspacePresetRegistry
} from "./workbench/workspaces";

const PLACEMENT_COLUMNS = 3;
const PLACEMENT_SPACING = 7;
const PLACEMENT_ORIGIN = { x: -8, z: -6 };
const AUTOSAVE_KEY = "atrvisu.autosavedLayout.v1";
const AUTOSAVE_DELAY_MS = 500;
const NUDGE_SETTINGS_KEY = "atrvisu.nudgeSettings.v1";
const PRIMARY_DOCK_PANEL_IDS = [
  RUNTIME_PANEL_IDS.machineLibrary,
  RUNTIME_PANEL_IDS.layoutExplorer,
  RUNTIME_PANEL_IDS.layers,
  RUNTIME_PANEL_IDS.groups,
  RUNTIME_PANEL_IDS.viewpoints
] as const;
const STATUS_BAR_HEIGHT = 25;
const DEFAULT_NUDGE_SETTINGS: NudgeSettings = {
  nudgeStepMm: 100,
  largeNudgeStepMm: 1000,
  smallNudgeStepMm: 10
};
const RUNTIME_SELECTION_AUTHORITY_CAPABILITIES = {
  authorityBound: true,
  replaceSupported: true,
  toggleSupported: true,
  clearSupported: true,
  reconciliationSupported: true,
  groupRootSemanticsSupported: true,
  editChildSemanticsSupported: true,
  staleUnselectableRemovalSupported: true
} as const satisfies RuntimeSelectionAuthorityCapabilities;
const RUNTIME_ENTITY_AUTHORITY_CAPABILITIES = {
  authorityBound: true,
  adapterFamilies: ["machine", "civil", "annotation", "group"]
} as const satisfies RuntimeEntityAuthorityCapabilities;

const mapPanelOperationToRuntimeCommandResult = (
  result: RuntimePanelOperationResult
): RuntimeFeatureCommandOperationResult => {
  if (result.status === "executed") {
    return createExecutedRuntimeFeatureCommandResult(result.reason);
  }
  return {
    handled: false,
    status: result.status === "cancelled"
      ? "cancelled"
      : result.status === "unavailable"
        ? "unavailable"
        : "unsupported",
    ...(result.reason ? { reason: result.reason } : {})
  };
};

type RuntimeAlignmentPayload =
  | { kind: "align"; action: AlignmentAction }
  | { kind: "distribute"; action: DistributionAction }
  | { kind: "equal-gap"; action: EqualGapAction }
  | { kind: "pair"; action: PairAlignmentAction; gapMm?: number }
  | { kind: "anchor"; primaryAnchor: FootprintAnchor; secondaryAnchor: FootprintAnchor };

type RuntimeConnectionSnapPayload = {
  selection: ConnectionPointSnapSelection;
  movingPoint: MachineConnectionPoint;
  fixedPoint: MachineConnectionPoint;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const isMachineLibrarySelection = (
  value: unknown
): value is { libraryId: string; definition: MachineDefinition } =>
  isRecord(value)
  && typeof value.libraryId === "string"
  && isRecord(value.definition)
  && typeof value.definition.id === "string";

const isAnnotationType = (value: unknown): value is AnnotationType =>
  typeof value === "string"
  && ["note", "info", "warning", "callout", "dimension-note", "area-note"].includes(value);

const isCivilReferenceType = (value: unknown): value is CivilReferenceType =>
  typeof value === "string"
  && ["floor-area", "wall", "column", "walkway", "restricted-area"].includes(value);

const isPlacementSettings = (value: unknown): value is PlacementSettings =>
  isRecord(value)
  && typeof value.gridSnapEnabled === "boolean"
  && typeof value.gridSnapStepMm === "number"
  && typeof value.rotationSnapEnabled === "boolean"
  && typeof value.rotationSnapStepDeg === "number"
  && typeof value.showMeasurementHelpers === "boolean";

const isOverlaySettings = (value: unknown): value is OverlaySettings =>
  isRecord(value)
  && typeof value.showLabels === "boolean"
  && typeof value.showConnectionPoints === "boolean";

const coreEditorRuntimeCommandIds = new Set<string>(Object.values(CORE_EDITOR_COMMAND_IDS));
const assemblyRuntimeCommandIds = new Set<string>(Object.values(ASSEMBLY_COMMAND_IDS));
const featureRuntimeCommandIds = new Set<string>(Object.values(RUNTIME_FEATURE_COMMAND_IDS));

const DUPLICATE_MACHINE_OFFSET_MM = 250;

type PanelSectionId = CompatibilityPanelId;
type PanelSectionExpansionState = Record<PanelSectionId, boolean>;

const normalizeNudgeSettings = (value: Partial<NudgeSettings> | null | undefined): NudgeSettings => ({
  nudgeStepMm:
    typeof value?.nudgeStepMm === "number" && Number.isFinite(value.nudgeStepMm) && value.nudgeStepMm > 0
      ? value.nudgeStepMm
      : DEFAULT_NUDGE_SETTINGS.nudgeStepMm,
  largeNudgeStepMm:
    typeof value?.largeNudgeStepMm === "number" && Number.isFinite(value.largeNudgeStepMm) && value.largeNudgeStepMm > 0
      ? value.largeNudgeStepMm
      : DEFAULT_NUDGE_SETTINGS.largeNudgeStepMm,
  smallNudgeStepMm:
    typeof value?.smallNudgeStepMm === "number" && Number.isFinite(value.smallNudgeStepMm) && value.smallNudgeStepMm > 0
      ? value.smallNudgeStepMm
      : DEFAULT_NUDGE_SETTINGS.smallNudgeStepMm
});

export function App() {
  const uiPreferencesStore = useUiPreferencesStore();
  const {
    preferences: uiPreferences,
    hydrationStatus: uiPreferencesHydrationStatus,
    warning: uiPreferencesWarning
  } = useUiPreferences();
  const workspacePreferencesReadOnly = uiPreferencesHydrationStatus === "future-readonly";
  const workspacePreferencesReadOnlyReason = uiPreferencesWarning
    ?? "UI preferences are from a newer version and are read-only.";
  const workspaceRuntime = useMemo(
    () => createWorkspaceRuntime(uiPreferencesStore),
    [uiPreferencesStore]
  );
  const workspaceProjection = useMemo(
    () => workspaceRuntime.getProjection(uiPreferences),
    [uiPreferences, workspaceRuntime]
  );
  const panelPreferences = useMemo(
    () => new Map(uiPreferences.panels.map((panel) => [panel.panelId, panel])),
    [uiPreferences.panels]
  );
  const shellPreference = panelPreferences.get(RUNTIME_PANEL_IDS.rightPanelShell);
  const panelWidth = shellPreference?.size ?? 360;
  const isPanelCollapsed = !shellPreference?.visible || Boolean(shellPreference.collapsed);
  const primaryDockPreference = panelPreferences.get(RUNTIME_PANEL_IDS.primaryDockShell);
  const primaryDockWidth = primaryDockPreference?.size ?? DEFAULT_PRIMARY_DOCK_WIDTH;
  const isPrimaryDockCollapsed = !primaryDockPreference?.visible || Boolean(primaryDockPreference.collapsed);
  const [workbenchViewportSize, setWorkbenchViewportSize] = useState(() => ({
    width: window.innerWidth,
    height: window.innerHeight
  }));
  const [isResponsiveInspectorOpen, setIsResponsiveInspectorOpen] = useState(false);
  const [isResponsivePrimaryDockOpen, setIsResponsivePrimaryDockOpen] = useState(false);
  const responsiveInspectorPresentation = isResponsiveInspectorPresentation(workbenchViewportSize.width);
  const responsivePrimaryDockPresentation = isResponsivePrimaryDockPresentation(workbenchViewportSize.width);
  const responsiveInspectorPresentationRef = useRef(responsiveInspectorPresentation);
  const responsivePrimaryDockPresentationRef = useRef(responsivePrimaryDockPresentation);
  const isInspectorPresentationCollapsed = resolveInspectorPresentationCollapsed({
    viewportWidth: workbenchViewportSize.width,
    persistedCollapsed: isPanelCollapsed,
    responsiveInspectorOpen: isResponsiveInspectorOpen
  });
  const inspectorPresentationCollapsedRef = useRef(isInspectorPresentationCollapsed);
  const isPrimaryDockPresentationCollapsed = resolvePrimaryDockPresentationCollapsed({
    viewportWidth: workbenchViewportSize.width,
    persistedCollapsed: isPrimaryDockCollapsed,
    responsivePrimaryDockOpen: isResponsivePrimaryDockOpen
  });
  const primaryDockWidthBounds = getPrimaryDockWidthBounds(
    workbenchViewportSize.width,
    isInspectorPresentationCollapsed ? 0 : panelWidth
  );
  const effectivePrimaryDockWidth = clampDockSize(primaryDockWidth, primaryDockWidthBounds);
  const dockResizeEnabled = workbenchViewportSize.width > DOCK_RESIZE_BREAKPOINT;
  const panelSectionExpansion = useMemo(() => Object.fromEntries(
    uiPreferences.panels
      .filter((panel) => panel.panelId !== RUNTIME_PANEL_IDS.rightPanelShell)
      .map((panel) => [panel.panelId, !panel.collapsed])
  ) as PanelSectionExpansionState, [uiPreferences.panels]);
  const panelSectionVisibility = useMemo(() => Object.fromEntries(
    uiPreferences.panels
      .filter((panel) => panel.panelId !== RUNTIME_PANEL_IDS.rightPanelShell)
      .map((panel) => [panel.panelId, panel.visible])
  ) as Record<PanelSectionId, boolean>, [uiPreferences.panels]);
  const setIsPanelCollapsed = useCallback((next: boolean | ((current: boolean) => boolean)) => {
    const currentShell = uiPreferencesStore.getSnapshot().preferences.panels.find(
      (panel) => panel.panelId === RUNTIME_PANEL_IDS.rightPanelShell
    );
    const current = !currentShell?.visible || Boolean(currentShell.collapsed);
    const collapsed = typeof next === "function" ? next(current) : next;
    uiPreferencesStore.updatePanelPreference(RUNTIME_PANEL_IDS.rightPanelShell, {
      visible: true,
      collapsed
    });
  }, [uiPreferencesStore]);
  const openInspectorPresentation = useCallback(() => {
    if (responsiveInspectorPresentationRef.current) {
      setIsResponsiveInspectorOpen(true);
      return;
    }
    setIsPanelCollapsed(false);
  }, [setIsPanelCollapsed]);
  const closeInspectorPresentation = useCallback(() => {
    if (responsiveInspectorPresentationRef.current) {
      setIsResponsiveInspectorOpen(false);
      return;
    }
    setIsPanelCollapsed(true);
  }, [setIsPanelCollapsed]);
  const toggleInspectorPresentation = useCallback(() => {
    if (responsiveInspectorPresentationRef.current) {
      setIsResponsiveInspectorOpen((current) => !current);
      return;
    }
    setIsPanelCollapsed((current) => !current);
  }, [setIsPanelCollapsed]);
  const setPanelWidth = useCallback((next: number | ((current: number) => number)) => {
    const currentShell = uiPreferencesStore.getSnapshot().preferences.panels.find(
      (panel) => panel.panelId === RUNTIME_PANEL_IDS.rightPanelShell
    );
    const current = currentShell?.size ?? 360;
    const requested = typeof next === "function" ? next(current) : next;
    uiPreferencesStore.updatePanelPreference(RUNTIME_PANEL_IDS.rightPanelShell, {
      size: Math.min(MAX_RIGHT_PANEL_WIDTH, Math.max(MIN_RIGHT_PANEL_WIDTH, requested))
    });
  }, [uiPreferencesStore]);
  const setPrimaryDockWidth = useCallback((requested: number) => {
    const currentPreferences = uiPreferencesStore.getSnapshot().preferences.panels;
    const rightPanel = currentPreferences.find(
      (panel) => panel.panelId === RUNTIME_PANEL_IDS.rightPanelShell
    );
    const rightInset = inspectorPresentationCollapsedRef.current
      || !rightPanel?.visible
      || rightPanel.collapsed
      ? 0
      : rightPanel.size ?? 360;
    uiPreferencesStore.updatePanelPreference(RUNTIME_PANEL_IDS.primaryDockShell, {
      size: clampDockSize(
        requested,
        getPrimaryDockWidthBounds(window.innerWidth, rightInset)
      )
    });
  }, [uiPreferencesStore]);
  const setPrimaryDockCollapsed = useCallback((collapsed: boolean) => {
    uiPreferencesStore.updatePanelPreference(RUNTIME_PANEL_IDS.primaryDockShell, {
      visible: true,
      collapsed
    });
  }, [uiPreferencesStore]);
  const setPrimaryDockPresentationCollapsed = useCallback((collapsed: boolean) => {
    if (responsivePrimaryDockPresentationRef.current) {
      setIsResponsivePrimaryDockOpen(!collapsed);
      return;
    }
    setPrimaryDockCollapsed(collapsed);
  }, [setPrimaryDockCollapsed]);
  useEffect(() => {
    const handleWorkbenchResize = () => {
      setWorkbenchViewportSize({ width: window.innerWidth, height: window.innerHeight });
    };
    window.addEventListener("resize", handleWorkbenchResize);
    return () => window.removeEventListener("resize", handleWorkbenchResize);
  }, []);
  const [enableE2EDiagnostics] = useState(() =>
    new URLSearchParams(window.location.search).get("e2eDiagnostics") === "1"
  );
  const [runtimeFeatureAccessDiagnosticsSessionId] = useState(() =>
    enableE2EDiagnostics ? window.crypto.randomUUID() : null
  );
  const [placedMachines, setPlacedMachines] = useState<PlacedMachine[]>([]);
  const [civilReferences, setCivilReferences] = useState<CivilReferenceItem[]>([]);
  const [annotations, setAnnotations] = useState<AnnotationObject[]>([]);
  const [layers, setLayers] = useState<LayoutLayer[]>(() => [createDefaultLayer()]);
  const [groups, setGroups] = useState<ObjectGroup[]>([]);
  const [activeGroupEditId, setActiveGroupEditId] = useState<string | null>(null);
  const [selectedLayerId, setSelectedLayerId] = useState("default");
  const [viewpoints, setViewpoints] = useState<LayoutViewpoint[]>([]);
  const [selectedViewpointId, setSelectedViewpointId] = useState<string | null>(null);
  const [runtimeSelection, setRuntimeSelection] = useState(() => createEmptyRuntimeSelection("scene"));
  const [activePrimaryPanelId, setActivePrimaryPanelId] = useState<PanelId>(RUNTIME_PANEL_IDS.machineLibrary);
  const [annotationSelectionSignal, setAnnotationSelectionSignal] = useState(0);
  const [recoveryLayout, setRecoveryLayout] = useState<AtrVisuLayout | null>(null);
  const [hasAcceptedWorkingLayout, setHasAcceptedWorkingLayout] = useState(false);
  const [autosaveReady, setAutosaveReady] = useState(false);
  const [isSimulationRunning, setIsSimulationRunning] = useState(false);
  const [simulationSpeed, setSimulationSpeed] = useState(1);
  const [overlaySettings, setOverlaySettings] = useState(loadOverlaySettings);
  const [collisionSettings, setCollisionSettings] = useState(loadCollisionSettings);
  const [placementSettings, setPlacementSettings] = useState(loadPlacementSettings);
  const [nudgeSettings, setNudgeSettings] = useState<NudgeSettings>(() => {
    try {
      return normalizeNudgeSettings(JSON.parse(window.localStorage.getItem(NUDGE_SETTINGS_KEY) ?? "null"));
    } catch {
      return DEFAULT_NUDGE_SETTINGS;
    }
  });
  const [visualDiagnostics, setVisualDiagnostics] = useState<Record<string, VisualModelDiagnostics>>({});
  const [projects, setProjects] = useState<AtrVisuProject[]>([]);
  const [isProjectStorageLoading, setIsProjectStorageLoading] = useState(true);
  const [projectStorageError, setProjectStorageError] = useState("");
  const [isProjectManagerOpen, setIsProjectManagerOpen] = useState(false);
  const [projectManagerEntryIntent, setProjectManagerEntryIntent] = useState<ProjectManagerEntryIntent | null>(null);
  const [isPerformanceBenchmarkOpen, setIsPerformanceBenchmarkOpen] = useState(false);
  const [isCollisionCheckOpen, setIsCollisionCheckOpen] = useState(false);
  const [isSimulationControlsOpen, setIsSimulationControlsOpen] = useState(false);
  const [isLayoutControlsOpen, setIsLayoutControlsOpen] = useState(false);
  const [isDisplayOverlayControlsOpen, setIsDisplayOverlayControlsOpen] = useState(false);
  const [isCommercialOutputsOpen, setIsCommercialOutputsOpen] = useState(false);
  const [isLibraryManagerOpen, setIsLibraryManagerOpen] = useState(false);
  const [isTaxonomyManagerOpen, setIsTaxonomyManagerOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isAdvancedAlignmentOpen, setIsAdvancedAlignmentOpen] = useState(false);
  const [isConnectionPointSnapOpen, setIsConnectionPointSnapOpen] = useState(false);
  const [helpSection, setHelpSection] = useState<HelpSection>("quick-start");
  const [isAssetImportOpen, setIsAssetImportOpen] = useState(false);
  const [renameRequest, setRenameRequest] = useState<{ entityId: string; version: number } | null>(null);
  const [isBenchmarkMode, setIsBenchmarkMode] = useState(false);
  const [latestPerformanceMetrics, setLatestPerformanceMetrics] = useState<ScenePerformanceMetrics | null>(null);
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
  const [currentLayoutId, setCurrentLayoutId] = useState<string | null>(null);
  const [currentRevisionId, setCurrentRevisionId] = useState<string | null>(null);
  const [hasUnsavedProjectChanges, setHasUnsavedProjectChanges] = useState(false);
  const [layoutHistory, setLayoutHistory] = useState(() => createLayoutHistory());
  const resizeStartRef = useRef<{ pointerX: number; width: number } | null>(null);
  const placementSettingsRef = useRef(placementSettings);
  const overlaySettingsRef = useRef(overlaySettings);
  const hasUnsavedProjectChangesRef = useRef(hasUnsavedProjectChanges);
  const isBenchmarkModeRef = useRef(isBenchmarkMode);
  const runtimeSelectionRef = useRef(runtimeSelection);
  const runtimeCommandExecutionProbesRef = useRef(
    new Map<string, RuntimeCommandExecutionProbe>()
  );
  const [runtimeSurfaceExecutionAuthority] = useState<
    RuntimeSurfaceExecutionAuthority | null
  >(() => {
    if (!enableE2EDiagnostics || !runtimeFeatureAccessDiagnosticsSessionId) {
      return null;
    }
    return createRuntimeSurfaceExecutionAuthority({
      sessionId: runtimeFeatureAccessDiagnosticsSessionId,
      requiredCommandIds:
        deriveRequiredRuntimeSurfaceExecutionCommandIds(platformFeatureAccessMatrix),
      getProbe: (commandId) =>
        runtimeCommandExecutionProbesRef.current.get(commandId)
    });
  });
  const placedMachinesRef = useRef<PlacedMachine[]>(placedMachines);
  const civilReferencesRef = useRef<CivilReferenceItem[]>(civilReferences);
  const annotationsRef = useRef<AnnotationObject[]>(annotations);
  const layersRef = useRef<LayoutLayer[]>(layers);
  const groupsRef = useRef<ObjectGroup[]>(groups);
  const activeGroupEditIdRef = useRef<string | null>(activeGroupEditId);
  const viewpointsRef = useRef<LayoutViewpoint[]>(viewpoints);
  const sceneRef = useRef<BabylonSceneHandle | null>(null);
  const editorDefinitionRegistry = useMemo(
    () => createEditorDefinitionRegistry([LAYOUT_3D_EDITOR_DEFINITION]),
    []
  );
  const annotationEditHistoryRecordedRef = useRef(false);
  const libraryManagerRuntimeControllerRef = useRef<LibraryManagerRuntimeController | null>(null);
  const projectImportFileInputRef = useRef<HTMLInputElement | null>(null);
  const projectImportRequestLifecycleRef = useRef(createProjectImportRequestLifecycle());
  const projectImportAcquisitionPendingRef = useRef(false);
  const [, setIsProjectImportAcquisitionPending] = useState(false);
  const runtimeCommandBindingsRef = useRef<CoreEditorRuntimeCommandBindings>({});
  const runtimeCommandBridge = useMemo(
    () => createCoreEditorRuntimeCommandBridge(() => runtimeCommandBindingsRef.current),
    []
  );
  const assemblyCommandBindingsRef = useRef<AssemblyRuntimeCommandBindings>({});
  const assemblyCommandBridge = useMemo(
    () => createAssemblyRuntimeCommandBridge(() => assemblyCommandBindingsRef.current),
    []
  );
  const runtimeFeatureCommandBindingsRef = useRef<RuntimeFeatureCommandBindings>({});
  const runtimeFeatureCommandBridge = useMemo(
    () => createRuntimeFeatureCommandBridge(() => runtimeFeatureCommandBindingsRef.current),
    []
  );
  const runtimePanelBindingsRef = useRef<RuntimePanelBindings>({});
  const runtimePanelBridge = useMemo(
    () => createRuntimePanelRegistryBridge(() => runtimePanelBindingsRef.current),
    []
  );
  const [workspacePanelReachability, setWorkspacePanelReachability] = useState<
    readonly RuntimePanelReachability[]
  >([]);
  const runtimeViewportBindingsRef = useRef<RuntimeViewportBindings>({});
  const runtimeViewportBridge = useMemo(
    () => createRuntimeViewportBridge(() => runtimeViewportBindingsRef.current),
    []
  );
  const runtimeViewportInvariantStateRef = useRef<RuntimeViewportInvariantSnapshot>({
    selectionIds: [],
    primarySelectionId: null,
    activeGroupEditId: null,
    machineTransforms: [],
    civilTransforms: [],
    annotationTransforms: [],
    groupMembership: [],
    layerState: [],
    undoDepth: 0,
    redoDepth: 0,
    undoStack: [],
    redoStack: [],
    projectDirty: false,
    simulationRunning: false,
    simulationSpeed: 1
  });
  const previousViewportShellStateRef = useRef({
    isPanelCollapsed: isInspectorPresentationCollapsed,
    panelWidth,
    isPrimaryDockCollapsed: isPrimaryDockPresentationCollapsed,
    primaryDockWidth: effectivePrimaryDockWidth,
    isBottomDockCollapsed: true,
    bottomDockHeight: 0
  });
  const runtimePanelStateRef = useRef({
    panelSectionExpansion,
    panelSectionVisibility,
    activePrimaryPanelId,
    isPrimaryDockCollapsed: isPrimaryDockPresentationCollapsed,
    isPanelCollapsed: isInspectorPresentationCollapsed,
    panelWidth,
    isProjectManagerOpen,
    isPerformanceBenchmarkOpen,
    isCollisionCheckOpen,
    isSimulationControlsOpen,
    isLayoutControlsOpen,
    isDisplayOverlayControlsOpen,
    isCommercialOutputsOpen,
    isLibraryManagerOpen,
    isTaxonomyManagerOpen,
    isHelpOpen,
    isAdvancedAlignmentOpen,
    isConnectionPointSnapOpen,
    connectionPointSnapAvailable: false,
    connectionPointSnapReason: "Select exactly two explicit machines.",
    measurementHelpersAvailable: false,
    measurementHelpersReason: "Select one machine to use Precision Placement helpers.",
    propertiesContext: "none"
  });

  const runtimeViewportBindings = useMemo<RuntimeViewportBindings>(() => ({
    [RUNTIME_VIEWPORT_IDS.main]: {
      getState: (): RuntimeViewportState => sceneRef.current?.getRuntimeViewportState() ?? {
        visible: true,
        available: false,
        cssWidth: 0,
        cssHeight: 0,
        canvasWidth: 0,
        canvasHeight: 0,
        devicePixelRatio: window.devicePixelRatio || 1,
        sceneLifecycleGeneration: 0,
        resizeGeneration: 0,
        cameraResolvable: false,
        reason: "Babylon viewport runtime is not ready."
      },
      getCameraSnapshot: () => sceneRef.current?.getRuntimeViewportCameraSnapshot() ?? null,
      requestResize: (request) =>
        sceneRef.current?.requestRuntimeViewportResize(request) ?? {
          status: "deferred",
          reason: "Babylon viewport runtime is not ready."
        }
    }
  }), []);

  const platformEntities = useMemo(() => createLegacyEntitySnapshot({
    machines: placedMachines,
    civilReferences,
    annotations,
    layers,
    groups
  }), [annotations, civilReferences, groups, layers, placedMachines]);
  const platformEntitiesRef = useRef(platformEntities);
  const selectionProjection = useMemo(
    () => projectRuntimeSelection(runtimeSelection, platformEntities),
    [platformEntities, runtimeSelection]
  );
  const explicitSelectionProjection = useMemo(
    () => projectExplicitRuntimeSelection(runtimeSelection, platformEntities),
    [platformEntities, runtimeSelection]
  );
  const connectionPointSnapContext = useMemo(() => evaluatePremiumConnectionPointSnapContext({
    selection: runtimeSelection,
    entities: platformEntities,
    machines: placedMachines,
    activeGroupEditId
  }), [activeGroupEditId, placedMachines, platformEntities, runtimeSelection]);
  const {
    selectedMachineIds,
    primarySelectedMachineId,
    selectedCivilReferenceIds,
    selectedCivilReferenceId,
    selectedAnnotationId,
    selectedGroupId,
    selectedAlignableEntityIds: selectedEntityKeys
  } = selectionProjection;
  const editingAnnotationId = selectedAnnotationId;

  const selectedMachineId = primarySelectedMachineId;
  const selectedMachine = placedMachines.find((machine) => machine.instanceId === selectedMachineId);
  const selectedCivilReference = selectedCivilReferenceId
    && selectedMachineIds.length === 0
    && selectedCivilReferenceIds.length <= 1
    && !selectedGroupId
    ? civilReferences.find((item) => item.id === selectedCivilReferenceId)
    : undefined;
  const selectedGroup = selectedGroupId ? groups.find((group) => group.id === selectedGroupId) : null;
  const activeGroupEdit = activeGroupEditId ? groups.find((group) => group.id === activeGroupEditId) : null;
  const activeGroupEditMachineIds = useMemo(() => activeGroupEdit
    ? activeGroupEdit.objectIds.flatMap((entityId) => entityId.startsWith("machine:")
      ? [entityId.slice("machine:".length)]
      : [])
    : [], [activeGroupEdit]);
  const singleSelectedMachine = selectedMachineIds.length === 1 && !selectedGroup ? selectedMachine : undefined;
  const visiblePlacedMachines = useMemo(
    () => placedMachines.filter((machine) => isLayerVisible(machine.layerId, layers)),
    [layers, placedMachines]
  );
  const visibleCivilReferences = useMemo(
    () => getVisibleCivilReferences(civilReferences, layers),
    [civilReferences, layers]
  );
  const visibleAnnotations = useMemo(
    () => annotations.filter((annotation) => isLayerVisible(annotation.layerId, layers)),
    [annotations, layers]
  );
  const lockedMachineIds = useMemo(
    () => placedMachines.filter((machine) => isLayerLocked(machine.layerId, layers)).map((machine) => machine.instanceId),
    [layers, placedMachines]
  );
  const lockedCivilReferenceIds = useMemo(
    () => civilReferences
      .filter((item) => item.locked || isLayerLocked(item.layerId, layers))
      .map((item) => item.id),
    [civilReferences, layers]
  );
  const lockedAnnotationIds = useMemo(
    () => annotations.filter((annotation) => isLayerLocked(annotation.layerId, layers)).map((annotation) => annotation.id),
    [annotations, layers]
  );
  const selectedMachineLocked = selectedMachine ? isLayerLocked(selectedMachine.layerId, layers) : false;
  const selectedCivilReferenceLocked = selectedCivilReference
    ? Boolean(selectedCivilReference.locked || isLayerLocked(selectedCivilReference.layerId, layers))
    : false;
  const selectedAnnotationLocked = editingAnnotationId
    ? isLayerLocked(annotations.find((annotation) => annotation.id === editingAnnotationId)?.layerId, layers)
    : false;
  const selectedMachineIdSet = useMemo(() => new Set(selectedMachineIds), [selectedMachineIds]);
  const selectedCivilReferenceIdSet = useMemo(() => new Set(selectedCivilReferenceIds), [selectedCivilReferenceIds]);
  const selectedMachines = useMemo(
    () => placedMachines.filter((machine) => selectedMachineIdSet.has(machine.instanceId)),
    [placedMachines, selectedMachineIdSet]
  );
  const runtimeSelectionMovementEvaluation = useMemo(
    () => evaluateAtomicMovement(runtimeSelection.ids, platformEntities),
    [platformEntities, runtimeSelection.ids]
  );
  const canDuplicateSelectedMachines = useMemo(
    () => runtimeSelection.ids.length === selectedMachineIds.length
      && runtimeSelectionMovementEvaluation.allowed
      && isMachineSelectionDuplicable(
        selectedMachineIds,
        selectedMachines.map((machine) => ({
          id: machine.instanceId,
          locked: isLayerLocked(machine.layerId, layers)
        }))
      ),
    [layers, runtimeSelection.ids.length, runtimeSelectionMovementEvaluation.allowed, selectedMachineIds, selectedMachines]
  );
  const selectedAnnotationForDeleteId = editingAnnotationId || selectedAnnotationId;
  const canDeleteSelectedEntities = useMemo(() => {
    if (selectedGroupId) {
      return false;
    }
    const selectedCivil = selectedCivilReferenceId
      ? civilReferences.find((item) => item.id === selectedCivilReferenceId)
      : undefined;
    const selectedAnnotation = selectedAnnotationForDeleteId
      ? annotations.find((item) => item.id === selectedAnnotationForDeleteId)
      : undefined;

    return isDeleteSelectionEligible({
      civil: selectedCivilReferenceId
        ? {
            exists: Boolean(selectedCivil),
            locked: Boolean(selectedCivil?.locked || isLayerLocked(selectedCivil?.layerId, layers))
          }
        : null,
      annotation: selectedAnnotationForDeleteId
        ? {
            exists: Boolean(selectedAnnotation),
            locked: isLayerLocked(selectedAnnotation?.layerId, layers)
          }
        : null,
      machines: selectedMachines.map((machine) => ({
        id: machine.instanceId,
        locked: isLayerLocked(machine.layerId, layers)
      }))
    });
  }, [
    annotations,
    civilReferences,
    layers,
    selectedAnnotationForDeleteId,
    selectedCivilReferenceId,
    selectedGroupId,
    selectedMachines
  ]);
  const selectedCivilReferences = useMemo(
    () => civilReferences.filter((item) => selectedCivilReferenceIdSet.has(item.id)),
    [civilReferences, selectedCivilReferenceIdSet]
  );
  const alignableEntities = useMemo(() => [
    ...visiblePlacedMachines.map((machine) => ({
      id: machine.instanceId,
      kind: "machine" as const,
      label: getPlacedMachineDisplayName(machine),
      bounds: getObjectPlanBounds(machine),
      positionMm: getMachinePlanPositionMm(machine),
      locked: isLayerLocked(machine.layerId, layers),
      hidden: false
    })),
    ...visibleCivilReferences.map((item) => ({
      id: item.id,
      kind: "civil" as const,
      label: item.name,
      bounds: { objectId: item.id, ...getCivilReferenceFootprintBoundsMm(item) },
      positionMm: item.positionMm,
      locked: Boolean(item.locked || isLayerLocked(item.layerId, layers)),
      hidden: false
    }))
  ], [layers, visibleCivilReferences, visiblePlacedMachines]);
  const selectedAlignableEntityIds = useMemo(() => [
    ...selectedEntityKeys
  ], [selectedEntityKeys]);
  const explicitSelectedAlignableEntityIds = explicitSelectionProjection.selectedAlignableEntityIds;
  const removableActiveGroupEntityIds = useMemo(() => activeGroupEdit
    ? getSelectedGroupMemberEntityIds(activeGroupEdit, explicitSelectedAlignableEntityIds)
    : [], [activeGroupEdit, explicitSelectedAlignableEntityIds]);
  const selectedAlignableEntities = useMemo(() => {
    const byKey = new Map(alignableEntities.map((entity) => [getAlignableEntityKey(entity.kind, entity.id), entity]));
    return selectedAlignableEntityIds.flatMap((key) => {
      const entity = byKey.get(key);
      return entity ? [entity] : [];
    });
  }, [alignableEntities, selectedAlignableEntityIds]);
  const primarySelectedAlignableId = useMemo(() => {
    return selectedAlignableEntityIds[0] ?? null;
  }, [selectedAlignableEntityIds]);
  const primarySelectedAlignable = primarySelectedAlignableId
    ? selectedAlignableEntities.find((entity) => getAlignableEntityKey(entity.kind, entity.id) === primarySelectedAlignableId)
    : undefined;
  const selectedGroupHasLockedVisibleMembers = useMemo(() => {
    if (!selectedGroup) {
      return false;
    }
    return selectedGroup.objectIds.some((objectId) => {
      if (objectId.startsWith("civil:")) {
        const civil = civilReferences.find((item) => item.id === objectId.slice("civil:".length));
        return civil ? isLayerVisible(civil.layerId, layers) && (civil.locked || isLayerLocked(civil.layerId, layers)) : false;
      }
      const machineId = objectId.replace(/^(object|machine):/, "");
      const machine = placedMachines.find((item) => item.instanceId === machineId);
      return machine ? isLayerVisible(machine.layerId, layers) && isLayerLocked(machine.layerId, layers) : false;
    });
  }, [civilReferences, layers, placedMachines, selectedGroup]);
  const selectionBounds = useMemo(() => getSelectionPlanBounds(selectedMachines), [selectedMachines]);
  const canUndo = layoutHistory.undoStack.length > 0;
  const canRedo = layoutHistory.redoStack.length > 0;
  const selectedVisualDiagnostics = selectedMachineId ? visualDiagnostics[selectedMachineId] : undefined;
  const currentProject = currentProjectId ? projects.find((project) => project.projectId === currentProjectId) : null;
  const currentLayout = currentProject && currentLayoutId
    ? currentProject.layouts.find((layout) => layout.layoutId === currentLayoutId)
    : null;
  const currentRevision = currentLayout && currentRevisionId
    ? currentLayout.revisions.find((revision) => revision.revisionId === currentRevisionId)
    : null;
  const commercialOutputSnapshot = useMemo(() => createCommercialOutputSnapshot({
    metadata: {
      projectId: currentProject?.projectId,
      projectName: currentProject?.projectName,
      layoutId: currentLayout?.layoutId,
      layoutName: currentLayout?.layoutName,
      revisionId: currentRevision?.revisionId,
      revision: currentRevision?.revisionCode
    },
    machines: placedMachines,
    civilReferences,
    layers,
    groups
  }), [civilReferences, currentLayout, currentProject, currentRevision, groups, layers, placedMachines]);
  const collisionResult = useMemo(
    () => checkAllObjectCollisions(visiblePlacedMachines, visibleCivilReferences, collisionSettings.enabled),
    [collisionSettings.enabled, visibleCivilReferences, visiblePlacedMachines]
  );
  const selectedCollisionPairs = selectedMachineId
    ? collisionResult.pairs.filter(
        (pair) => pair.objectAId === selectedMachineId || pair.objectBId === selectedMachineId
      )
    : [];
  const handleVisualDiagnosticsChange = useCallback((diagnostics: VisualModelDiagnostics) => {
    setVisualDiagnostics((current) => {
      const previous = current[diagnostics.instanceId];
      if (previous && JSON.stringify(previous) === JSON.stringify(diagnostics)) {
        return current;
      }
      return {
        ...current,
        [diagnostics.instanceId]: diagnostics
      };
    });
  }, []);

  useEffect(() => {
    try {
      saveOverlaySettings(overlaySettings);
    } catch {
      // Display preferences are best-effort only.
    }
  }, [overlaySettings]);

  useEffect(() => {
    try {
      saveCollisionSettings(collisionSettings);
    } catch {
      // Collision preferences are best-effort only.
    }
  }, [collisionSettings]);

  useEffect(() => {
    try {
      savePlacementSettings(placementSettings);
    } catch {
      // Placement preferences are best-effort only.
    }
    placementSettingsRef.current = placementSettings;
  }, [placementSettings]);

  useEffect(() => {
    try {
      window.localStorage.setItem(NUDGE_SETTINGS_KEY, JSON.stringify(nudgeSettings));
    } catch {
      // Precision preferences are best-effort only.
    }
  }, [nudgeSettings]);

  useEffect(() => {
    setRuntimeSelection((current) => {
      const next = reconcileRuntimeSelection(current, platformEntities);
      return areRuntimeSelectionsEqual(current, next) ? current : next;
    });
  }, [platformEntities]);

  useLayoutEffect(() => {
    runtimeSelectionRef.current = runtimeSelection;
    platformEntitiesRef.current = platformEntities;
    hasUnsavedProjectChangesRef.current = hasUnsavedProjectChanges;
    overlaySettingsRef.current = overlaySettings;
  }, [hasUnsavedProjectChanges, overlaySettings, platformEntities, runtimeSelection]);

  useEffect(() => {
    isBenchmarkModeRef.current = isBenchmarkMode;
  }, [isBenchmarkMode]);

  useLayoutEffect(() => {
    placedMachinesRef.current = placedMachines;
  }, [placedMachines]);

  useLayoutEffect(() => {
    civilReferencesRef.current = civilReferences;
  }, [civilReferences]);

  useLayoutEffect(() => {
    annotationsRef.current = annotations;
  }, [annotations]);

  useLayoutEffect(() => {
    layersRef.current = layers;
  }, [layers]);

  useLayoutEffect(() => {
    groupsRef.current = groups;
  }, [groups]);

  useLayoutEffect(() => {
    activeGroupEditIdRef.current = activeGroupEditId;
  }, [activeGroupEditId]);

  useLayoutEffect(() => {
    refreshRuntimeViewportInvariantSnapshot(
      enableE2EDiagnostics,
      () => createRuntimeViewportInvariantSnapshot({
        selectionIds: runtimeSelection.ids,
        primarySelectionId: runtimeSelection.primaryId ?? null,
        activeGroupEditId,
        machines: placedMachines.map((machine) => {
          const position = getMachinePlanPositionMm(machine);
          return {
            id: machine.instanceId,
            xMm: position.xMm,
            yMm: position.yMm,
            rotationDeg: machine.rotationDeg ?? 0,
            layerId: machine.layerId ?? "default"
          };
        }),
        civilReferences: civilReferences.map((item) => ({
          id: item.id,
          xMm: item.positionMm.xMm,
          yMm: item.positionMm.yMm,
          zMm: item.positionMm.zMm ?? 0,
          rotationDeg: item.rotationDeg,
          layerId: item.layerId ?? "default"
        })),
        annotations: annotations.map((annotation) => ({
          id: annotation.id,
          xMm: annotation.positionMm.xMm,
          yMm: annotation.positionMm.yMm,
          zMm: annotation.positionMm.zMm ?? 0,
          rotationDeg: annotation.rotationDeg ?? 0,
          layerId: annotation.layerId ?? "default"
        })),
        groups: groups.map((group) => ({
          id: group.id,
          objectIds: group.objectIds,
          annotationIds: group.annotationIds ?? [],
          layerId: group.layerId ?? ""
        })),
        layers,
        undoStack: layoutHistory.undoStack,
        redoStack: layoutHistory.redoStack,
        projectDirty: hasUnsavedProjectChanges,
        simulationRunning: isSimulationRunning,
        simulationSpeed
      }),
      (snapshot) => {
        runtimeViewportInvariantStateRef.current = snapshot;
      }
    );
  }, [
    activeGroupEditId,
    annotations,
    civilReferences,
    enableE2EDiagnostics,
    groups,
    hasUnsavedProjectChanges,
    isSimulationRunning,
    layers,
    layoutHistory.redoStack,
    layoutHistory.undoStack,
    placedMachines,
    runtimeSelection.ids,
    runtimeSelection.primaryId,
    simulationSpeed
  ]);

  useEffect(() => {
    const normalized = normalizeGroups(groups, placedMachines, layers, civilReferences);
    if (
      normalized.length !== groups.length ||
      normalized.some((group, index) => group.id !== groups[index]?.id || group.objectIds.join("|") !== groups[index]?.objectIds.join("|"))
    ) {
      setGroups(normalized);
    }
    if (activeGroupEditId && !normalized.some((group) => group.id === activeGroupEditId)) {
      setActiveGroupEditId(null);
    }
  }, [activeGroupEditId, civilReferences, groups, layers, placedMachines]);

  useEffect(() => {
    const normalized = normalizeCivilReferences(civilReferences, layers);
    if (
      normalized.length !== civilReferences.length ||
      normalized.some((item, index) =>
        item.id !== civilReferences[index]?.id ||
        item.layerId !== civilReferences[index]?.layerId ||
        item.sizeMm.widthMm !== civilReferences[index]?.sizeMm.widthMm ||
        item.sizeMm.depthMm !== civilReferences[index]?.sizeMm.depthMm ||
        item.sizeMm.heightMm !== civilReferences[index]?.sizeMm.heightMm
      )
    ) {
      setCivilReferences(normalized);
    }
  }, [civilReferences, layers]);

  useEffect(() => {
    const normalized = normalizeLayers(layers);
    if (
      normalized.length !== layers.length ||
      normalized.some((layer, index) =>
        layer.id !== layers[index]?.id ||
        layer.name !== layers[index]?.name ||
        layer.visible !== layers[index]?.visible ||
        layer.locked !== layers[index]?.locked ||
        layer.systemLayer !== layers[index]?.systemLayer
      )
    ) {
      setLayers(normalized);
    }
    if (!normalized.some((layer) => layer.id === selectedLayerId)) {
      setSelectedLayerId("default");
    }
  }, [layers, selectedLayerId]);

  useLayoutEffect(() => {
    viewpointsRef.current = viewpoints;
  }, [viewpoints]);

  useEffect(() => {
    if (selectedViewpointId && !viewpoints.some((viewpoint) => viewpoint.id === selectedViewpointId)) {
      setSelectedViewpointId(viewpoints[viewpoints.length - 1]?.id ?? null);
    }
  }, [selectedViewpointId, viewpoints]);

  const recordLayoutHistory = useCallback(() => {
    if (isBenchmarkModeRef.current) {
      return;
    }
    setLayoutHistory((current) =>
      pushHistorySnapshot(
        current,
        placedMachinesRef.current,
        annotationsRef.current,
        civilReferencesRef.current,
        viewpointsRef.current,
        layersRef.current,
        groupsRef.current
      )
    );
  }, []);

  const clearLayoutHistory = useCallback(() => {
    setLayoutHistory(createLayoutHistory());
  }, []);

  const markLayoutChanged = useCallback((options: { recordHistory?: boolean } = {}) => {
    if (options.recordHistory !== false) {
      recordLayoutHistory();
    }
    if (!isBenchmarkModeRef.current) {
      setHasAcceptedWorkingLayout(true);
      setHasUnsavedProjectChanges((current) => current || true);
    }
  }, [recordLayoutHistory]);

  const undoLayoutChange = useCallback(() => {
    setLayoutHistory((current) => {
      const result = undoHistory(
        current,
        placedMachinesRef.current,
        annotationsRef.current,
        civilReferencesRef.current,
        viewpointsRef.current,
        layersRef.current,
        groupsRef.current
      );
      if (!result) {
        return current;
      }
      setPlacedMachines(result.machines);
      setAnnotations(result.annotations);
      setCivilReferences(normalizeCivilReferences(result.civilReferences, result.layers));
      setLayers(normalizeLayers(result.layers));
      setGroups(normalizeGroups(result.groups, result.machines, result.layers, result.civilReferences));
      setViewpoints(result.viewpoints);
      setRuntimeSelection((selection) => selection.ids.some((id) => id.startsWith("annotation:"))
        ? createEmptyRuntimeSelection("command")
        : selection);
      setHasUnsavedProjectChanges(true);
      return result.history;
    });
  }, []);

  const redoLayoutChange = useCallback(() => {
    setLayoutHistory((current) => {
      const result = redoHistory(
        current,
        placedMachinesRef.current,
        annotationsRef.current,
        civilReferencesRef.current,
        viewpointsRef.current,
        layersRef.current,
        groupsRef.current
      );
      if (!result) {
        return current;
      }
      setPlacedMachines(result.machines);
      setAnnotations(result.annotations);
      setCivilReferences(normalizeCivilReferences(result.civilReferences, result.layers));
      setLayers(normalizeLayers(result.layers));
      setGroups(normalizeGroups(result.groups, result.machines, result.layers, result.civilReferences));
      setViewpoints(result.viewpoints);
      setRuntimeSelection((selection) => selection.ids.some((id) => id.startsWith("annotation:"))
        ? createEmptyRuntimeSelection("command")
        : selection);
      setHasUnsavedProjectChanges(true);
      return result.history;
    });
  }, []);

  const refreshProjects = useCallback(async () => {
    const nextProjects = await listProjects();
    setProjects(nextProjects);
    return nextProjects;
  }, []);

  const setPanelSectionExpanded = useCallback((panelId: PanelSectionId, expanded: boolean) => {
    uiPreferencesStore.updatePanelPreference(panelId, {
      visible: true,
      collapsed: !expanded
    });
  }, [uiPreferencesStore]);
  const setPanelSectionExpansionPreservingVisibility = useCallback((
    panelId: PanelSectionId,
    expanded: boolean
  ) => {
    uiPreferencesStore.updatePanelPreference(panelId, { collapsed: !expanded });
  }, [uiPreferencesStore]);

  const setLibraryManagerRuntimeController = useCallback(
    (controller: LibraryManagerRuntimeController | null) => {
      libraryManagerRuntimeControllerRef.current = controller;
    },
    []
  );

  const requestLibraryManagerClose = useCallback(() => {
    if (!runtimePanelStateRef.current.isLibraryManagerOpen) {
      return true;
    }
    const controller = libraryManagerRuntimeControllerRef.current;
    if (controller) {
      return controller.requestClose();
    }
    setIsLibraryManagerOpen(false);
    return true;
  }, []);

  const closeMachineLibraryManagers = useCallback(() => closeMachineLibraryManagerModals({
    libraryManagerOpen: runtimePanelStateRef.current.isLibraryManagerOpen,
    taxonomyManagerOpen: runtimePanelStateRef.current.isTaxonomyManagerOpen
  }, {
    requestLibraryManagerClose,
    closeTaxonomyManager: () => setIsTaxonomyManagerOpen(false)
  }), [requestLibraryManagerClose]);

  const openLibraryManager = useCallback(() => openMachineLibraryManagerExclusively("library", {
    libraryManagerOpen: runtimePanelStateRef.current.isLibraryManagerOpen,
    taxonomyManagerOpen: runtimePanelStateRef.current.isTaxonomyManagerOpen
  }, {
    requestLibraryManagerClose,
    closeTaxonomyManager: () => setIsTaxonomyManagerOpen(false),
    openLibraryManager: () => {
      setPrimaryDockPresentationCollapsed(false);
      setActivePrimaryPanelId(RUNTIME_PANEL_IDS.machineLibrary);
      setIsLibraryManagerOpen(true);
    },
    openTaxonomyManager: () => setIsTaxonomyManagerOpen(true)
  }), [requestLibraryManagerClose, setPrimaryDockPresentationCollapsed]);

  const openTaxonomyManager = useCallback(() => openMachineLibraryManagerExclusively("taxonomy", {
    libraryManagerOpen: runtimePanelStateRef.current.isLibraryManagerOpen,
    taxonomyManagerOpen: runtimePanelStateRef.current.isTaxonomyManagerOpen
  }, {
    requestLibraryManagerClose,
    closeTaxonomyManager: () => setIsTaxonomyManagerOpen(false),
    openLibraryManager: () => setIsLibraryManagerOpen(true),
    openTaxonomyManager: () => {
      setPrimaryDockPresentationCollapsed(false);
      setActivePrimaryPanelId(RUNTIME_PANEL_IDS.machineLibrary);
      setIsTaxonomyManagerOpen(true);
    }
  }), [requestLibraryManagerClose, setPrimaryDockPresentationCollapsed]);

  const runtimePanelBindings = useMemo<RuntimePanelBindings>(() => {
    const sectionBinding = (
      panelId: PanelSectionId,
      getAvailability: () => { available: boolean; reason?: string; context?: string } = () => ({ available: true }),
      beforeClose?: () => boolean
    ): RuntimePanelBinding => ({
      getState: () => {
        const state = runtimePanelStateRef.current;
        const availability = getAvailability();
        const expanded = state.panelSectionExpansion[panelId];
        const visible = state.panelSectionVisibility[panelId];
        return {
          isVisible: !state.isPanelCollapsed && visible && availability.available,
          isOpen: !state.isPanelCollapsed && visible && expanded && availability.available,
          available: availability.available,
          isExpanded: expanded,
          ...(availability.context ? { context: availability.context } : {}),
          ...(availability.reason ? { reason: availability.reason } : {})
        };
      },
      open: () => {
        openInspectorPresentation();
        setPanelSectionExpanded(panelId, true);
      },
      close: () => {
        if (beforeClose && !beforeClose()) {
          return false;
        }
        setPanelSectionExpanded(panelId, false);
        return true;
      },
      toggle: () => {
        const state = runtimePanelStateRef.current;
        const isOpen = state.panelSectionVisibility[panelId] && state.panelSectionExpansion[panelId];
        if (isOpen && beforeClose && !beforeClose()) {
          return false;
        }
        openInspectorPresentation();
        setPanelSectionExpanded(panelId, !isOpen);
        return true;
      }
    });

    const primaryPanelBinding = (
      panelId: PanelSectionId,
      beforeClose?: () => boolean
    ): RuntimePanelBinding => ({
      getState: () => {
        const state = runtimePanelStateRef.current;
        const visible = state.panelSectionVisibility[panelId] !== false;
        const active = state.activePrimaryPanelId === panelId;
        return {
          isVisible: !state.isPrimaryDockCollapsed && visible && active,
          isOpen: !state.isPrimaryDockCollapsed && visible && active,
          available: true,
          context: active ? "active-primary-panel" : "inactive-primary-panel"
        };
      },
      open: () => {
        setPrimaryDockPresentationCollapsed(false);
        setActivePrimaryPanelId(panelId);
        setPanelSectionExpanded(panelId, true);
      },
      close: () => {
        if (beforeClose && !beforeClose()) {
          return false;
        }
        if (runtimePanelStateRef.current.activePrimaryPanelId === panelId) {
          setPanelSectionExpanded(panelId, false);
          setPrimaryDockPresentationCollapsed(true);
        }
        return true;
      },
      toggle: () => {
        const state = runtimePanelStateRef.current;
        if (!state.isPrimaryDockCollapsed && state.activePrimaryPanelId === panelId) {
          if (beforeClose && !beforeClose()) {
            return false;
          }
          setPanelSectionExpanded(panelId, false);
          setPrimaryDockPresentationCollapsed(true);
        } else {
          setPrimaryDockPresentationCollapsed(false);
          setActivePrimaryPanelId(panelId);
          setPanelSectionExpanded(panelId, true);
        }
        return true;
      }
    });

    const modalState = (
      open: boolean,
      reason?: string
    ): RuntimePanelState => ({
      isVisible: open,
      isOpen: open,
      available: true,
      ...(reason ? { reason } : {})
    });

    return {
      [RUNTIME_PANEL_IDS.primaryDockShell]: {
        getState: () => ({
          isVisible: true,
          isOpen: !runtimePanelStateRef.current.isPrimaryDockCollapsed,
          available: true,
          context: `${effectivePrimaryDockWidth}px`
        }),
        open: () => setPrimaryDockPresentationCollapsed(false),
        close: () => {
          if (!closeMachineLibraryManagers()) {
            return false;
          }
          setPrimaryDockPresentationCollapsed(true);
          return true;
        },
        toggle: () => {
          if (!runtimePanelStateRef.current.isPrimaryDockCollapsed && !closeMachineLibraryManagers()) {
            return false;
          }
          setPrimaryDockPresentationCollapsed(!runtimePanelStateRef.current.isPrimaryDockCollapsed);
          return true;
        }
      },
      [RUNTIME_PANEL_IDS.rightPanelShell]: {
        getState: () => ({
          isVisible: true,
          isOpen: !runtimePanelStateRef.current.isPanelCollapsed,
          available: true,
          context: `${runtimePanelStateRef.current.panelWidth}px`
        }),
        open: openInspectorPresentation,
        close: closeInspectorPresentation,
        toggle: toggleInspectorPresentation
      },
      [RUNTIME_PANEL_IDS.bottomDockShell]: {
        getState: () => ({
          isVisible: false,
          isOpen: false,
          available: false,
          reason: "No Bottom Dock contributions are active in Phase 1."
        })
      },
      [RUNTIME_PANEL_IDS.layoutControls]: {
        getState: () => modalState(runtimePanelStateRef.current.isLayoutControlsOpen),
        open: () => setIsLayoutControlsOpen(true),
        close: () => setIsLayoutControlsOpen(false),
        toggle: () => setIsLayoutControlsOpen((current) => !current)
      },
      [RUNTIME_PANEL_IDS.commercialOutputs]: {
        getState: () => modalState(runtimePanelStateRef.current.isCommercialOutputsOpen),
        open: () => setIsCommercialOutputsOpen(true),
        close: () => setIsCommercialOutputsOpen(false),
        toggle: () => setIsCommercialOutputsOpen((current) => !current)
      },
      [RUNTIME_PANEL_IDS.machineLibrary]: primaryPanelBinding(
        RUNTIME_PANEL_IDS.machineLibrary,
        closeMachineLibraryManagers
      ),
      [RUNTIME_PANEL_IDS.layoutExplorer]: primaryPanelBinding(RUNTIME_PANEL_IDS.layoutExplorer),
      [RUNTIME_PANEL_IDS.viewpoints]: primaryPanelBinding(RUNTIME_PANEL_IDS.viewpoints),
      [RUNTIME_PANEL_IDS.layers]: primaryPanelBinding(RUNTIME_PANEL_IDS.layers),
      [RUNTIME_PANEL_IDS.civilReferences]: sectionBinding(RUNTIME_PANEL_IDS.civilReferences),
      [RUNTIME_PANEL_IDS.groups]: primaryPanelBinding(RUNTIME_PANEL_IDS.groups),
      [RUNTIME_PANEL_IDS.projectStatus]: sectionBinding(RUNTIME_PANEL_IDS.projectStatus),
      [RUNTIME_PANEL_IDS.performanceBenchmarkLauncher]: sectionBinding(
        RUNTIME_PANEL_IDS.performanceBenchmarkLauncher
      ),
      [RUNTIME_PANEL_IDS.simulationControls]: {
        getState: () => modalState(runtimePanelStateRef.current.isSimulationControlsOpen),
        open: () => setIsSimulationControlsOpen(true),
        close: () => setIsSimulationControlsOpen(false),
        toggle: () => setIsSimulationControlsOpen((current) => !current)
      },
      [RUNTIME_PANEL_IDS.annotations]: sectionBinding(RUNTIME_PANEL_IDS.annotations),
      [RUNTIME_PANEL_IDS.precisionPlacement]: sectionBinding(
        RUNTIME_PANEL_IDS.precisionPlacement,
        () => ({
          available: runtimePanelStateRef.current.measurementHelpersAvailable,
          reason: runtimePanelStateRef.current.measurementHelpersReason,
          context: runtimePanelStateRef.current.measurementHelpersAvailable ? "selected-machine" : "unavailable"
        })
      ),
      [RUNTIME_PANEL_IDS.alignmentTools]: {
        getState: () => modalState(runtimePanelStateRef.current.isAdvancedAlignmentOpen),
        open: () => setIsAdvancedAlignmentOpen(true),
        close: () => setIsAdvancedAlignmentOpen(false),
        toggle: () => setIsAdvancedAlignmentOpen((current) => !current)
      },
      [RUNTIME_PANEL_IDS.connectionPointSnap]: {
        getState: () => {
          const state = runtimePanelStateRef.current;
          const available = state.connectionPointSnapAvailable;
          const visible = state.panelSectionVisibility[RUNTIME_PANEL_IDS.connectionPointSnap] !== false;
          return {
            isVisible: visible && available,
            isOpen: visible && available && state.isConnectionPointSnapOpen,
            available,
            reason: available ? undefined : state.connectionPointSnapReason,
            context: available ? "viewport-context" : "unavailable"
          };
        },
        open: () => setIsConnectionPointSnapOpen(true),
        close: () => setIsConnectionPointSnapOpen(false),
        toggle: () => setIsConnectionPointSnapOpen(
          !runtimePanelStateRef.current.isConnectionPointSnapOpen
        )
      },
      [RUNTIME_PANEL_IDS.displayOverlayControls]: {
        getState: () => modalState(runtimePanelStateRef.current.isDisplayOverlayControlsOpen),
        open: () => setIsDisplayOverlayControlsOpen(true),
        close: () => setIsDisplayOverlayControlsOpen(false),
        toggle: () => setIsDisplayOverlayControlsOpen((current) => !current)
      },
      [RUNTIME_PANEL_IDS.help]: {
        getState: () => modalState(runtimePanelStateRef.current.isHelpOpen),
        open: () => setIsHelpOpen(true),
        close: () => setIsHelpOpen(false)
      },
      [RUNTIME_PANEL_IDS.collisionCheck]: {
        getState: () => modalState(runtimePanelStateRef.current.isCollisionCheckOpen),
        open: () => setIsCollisionCheckOpen(true),
        close: () => setIsCollisionCheckOpen(false),
        toggle: () => setIsCollisionCheckOpen((current) => !current)
      },
      [RUNTIME_PANEL_IDS.inspector]: sectionBinding(
        RUNTIME_PANEL_IDS.inspector,
        () => ({ available: true, context: runtimePanelStateRef.current.propertiesContext })
      ),
      [RUNTIME_PANEL_IDS.statusBar]: {
        getState: () => ({ isVisible: true, isOpen: true, available: true })
      },
      [RUNTIME_PANEL_IDS.projectManager]: {
        getState: () => modalState(runtimePanelStateRef.current.isProjectManagerOpen),
        open: () => {
          void refreshProjects();
          setIsProjectManagerOpen(true);
        },
        close: () => {
          setIsProjectManagerOpen(false);
          setProjectManagerEntryIntent(null);
        }
      },
      [RUNTIME_PANEL_IDS.performanceBenchmark]: {
        getState: () => modalState(runtimePanelStateRef.current.isPerformanceBenchmarkOpen),
        open: () => setIsPerformanceBenchmarkOpen(true),
        close: () => setIsPerformanceBenchmarkOpen(false)
      },
      [RUNTIME_PANEL_IDS.libraryManager]: {
        getState: () => modalState(runtimePanelStateRef.current.isLibraryManagerOpen),
        open: openLibraryManager,
        close: () => {
          return requestLibraryManagerClose();
        }
      },
      [RUNTIME_PANEL_IDS.taxonomyManager]: {
        getState: () => modalState(runtimePanelStateRef.current.isTaxonomyManagerOpen),
        open: openTaxonomyManager,
        close: () => setIsTaxonomyManagerOpen(false)
      }
    };
  }, [
    closeMachineLibraryManagers,
    openLibraryManager,
    openTaxonomyManager,
    refreshProjects,
    requestLibraryManagerClose,
    closeInspectorPresentation,
    effectivePrimaryDockWidth,
    openInspectorPresentation,
    setPrimaryDockPresentationCollapsed,
    setPanelSectionExpanded,
    setPanelSectionExpansionPreservingVisibility,
    toggleInspectorPresentation
  ]);

  const propertiesPanelContext = selectedGroup
    ? "assembly"
    : selectedCivilReference
      ? "civil"
      : selectedAlignableEntities.length > 1
        ? "multi-selection"
        : selectedMachine
          ? "machine"
          : "none";
  const connectionPointSnapAvailable = connectionPointSnapContext.available;
  const connectionPointSnapReason = connectionPointSnapContext.available
    ? ""
    : getConnectionPointSnapContextMessage(connectionPointSnapContext.reason);
  useEffect(() => {
    if (!connectionPointSnapAvailable) {
      setIsConnectionPointSnapOpen(false);
    }
  }, [connectionPointSnapAvailable]);
  const measurementHelpersAvailable = runtimeSelection.ids.length === 1 && Boolean(singleSelectedMachine);
  const measurementHelpersReason = measurementHelpersAvailable
    ? ""
    : "Select one machine to use Precision Placement helpers.";

  useLayoutEffect(() => {
    runtimePanelStateRef.current = {
      panelSectionExpansion,
      panelSectionVisibility,
      activePrimaryPanelId,
      isPrimaryDockCollapsed: isPrimaryDockPresentationCollapsed,
      isPanelCollapsed: isInspectorPresentationCollapsed,
      panelWidth,
      isProjectManagerOpen,
      isPerformanceBenchmarkOpen,
      isCollisionCheckOpen,
      isSimulationControlsOpen,
      isLayoutControlsOpen,
      isDisplayOverlayControlsOpen,
      isCommercialOutputsOpen,
      isLibraryManagerOpen,
      isTaxonomyManagerOpen,
      isHelpOpen,
      isAdvancedAlignmentOpen,
      isConnectionPointSnapOpen,
      connectionPointSnapAvailable,
      connectionPointSnapReason,
      measurementHelpersAvailable,
      measurementHelpersReason,
      propertiesContext: editingAnnotationId ? "annotation" : propertiesPanelContext
    };
  }, [
    activePrimaryPanelId,
    connectionPointSnapAvailable,
    connectionPointSnapReason,
    editingAnnotationId,
    isCollisionCheckOpen,
    isDisplayOverlayControlsOpen,
    isCommercialOutputsOpen,
    isLayoutControlsOpen,
    isLibraryManagerOpen,
    isHelpOpen,
    isAdvancedAlignmentOpen,
    isConnectionPointSnapOpen,
    isInspectorPresentationCollapsed,
    isPerformanceBenchmarkOpen,
    isProjectManagerOpen,
    isSimulationControlsOpen,
    isPrimaryDockPresentationCollapsed,
    isTaxonomyManagerOpen,
    measurementHelpersAvailable,
    measurementHelpersReason,
    panelSectionExpansion,
    panelSectionVisibility,
    panelWidth,
    propertiesPanelContext
  ]);

  useLayoutEffect(() => {
    runtimePanelBindingsRef.current = runtimePanelBindings;
    setWorkspacePanelReachability(liveWorkspacePanelDescriptors.flatMap(({ definition }) => {
      const panel = runtimePanelBridge.getRuntimePanel(definition.id);
      return panel?.bound ? [panel] : [];
    }));
  }, [
    connectionPointSnapAvailable,
    editingAnnotationId,
    panelSectionExpansion,
    panelSectionVisibility,
    propertiesPanelContext,
    runtimePanelBindings,
    runtimePanelBridge
  ]);

  useLayoutEffect(() => {
    runtimeViewportBindingsRef.current = runtimeViewportBindings;
  }, [runtimeViewportBindings]);

  useLayoutEffect(() => {
    const previous = previousViewportShellStateRef.current;
    const next = {
      isPanelCollapsed: isInspectorPresentationCollapsed,
      panelWidth,
      isPrimaryDockCollapsed: isPrimaryDockPresentationCollapsed,
      primaryDockWidth: effectivePrimaryDockWidth,
      isBottomDockCollapsed: true,
      bottomDockHeight: 0
    };
    previousViewportShellStateRef.current = next;
    const reason = getRuntimeViewportShellResizeReason(previous, next);
    if (!reason) {
      return;
    }

    const viewport = runtimeViewportBridge.getRuntimeViewport(RUNTIME_VIEWPORT_IDS.main);
    if (!viewport?.available || viewport.cssWidth <= 0 || viewport.cssHeight <= 0) {
      return;
    }
    runtimeViewportBridge.requestResize(
      RUNTIME_VIEWPORT_IDS.main,
      createViewportResizeRequest(
        reason,
        { width: viewport.cssWidth, height: viewport.cssHeight }
      )
    );
  }, [
    effectivePrimaryDockWidth,
    isInspectorPresentationCollapsed,
    isPrimaryDockPresentationCollapsed,
    panelWidth,
    runtimeViewportBridge
  ]);

  useEffect(() => {
    if (!enableE2EDiagnostics) {
      return;
    }
    window.__atrvisuRuntimePanels = {
      open: runtimePanelBridge.openPanel,
      close: runtimePanelBridge.closePanel,
      toggle: runtimePanelBridge.togglePanel,
      get: runtimePanelBridge.getRuntimePanel
    };
    return () => {
      delete window.__atrvisuRuntimePanels;
    };
  }, [enableE2EDiagnostics, runtimePanelBridge]);

  useEffect(() => {
    if (!enableE2EDiagnostics) {
      return;
    }
    window.__atrvisuUiPreferences = {
      getSnapshot: uiPreferencesStore.getSnapshot,
      updateTheme: uiPreferencesStore.updateTheme,
      updateDensity: uiPreferencesStore.updateDensity,
      updatePanelPreference: uiPreferencesStore.updatePanelPreference
    };
    return () => {
      delete window.__atrvisuUiPreferences;
    };
  }, [enableE2EDiagnostics, uiPreferencesStore]);

  useEffect(() => {
    if (!enableE2EDiagnostics) {
      return;
    }
    window.__atrvisuWorkspace = {
      getSnapshot: () => {
        const preferences = uiPreferencesStore.getSnapshot().preferences;
        const projection = workspaceRuntime.getProjection(preferences);
        return {
          ...(projection.activeWorkspaceId
            ? { activeWorkspaceId: projection.activeWorkspaceId }
            : {}),
          inspectorMode: projection.inspectorMode,
          emphasizedCommandIds: [...projection.emphasizedCommandIds],
          preferences
        };
      }
    };
    return () => {
      delete window.__atrvisuWorkspace;
    };
  }, [enableE2EDiagnostics, uiPreferencesStore, workspaceRuntime]);

  useEffect(() => {
    if (!enableE2EDiagnostics) {
      return;
    }
    window.__atrvisuRuntimeViewport = {
      get: runtimeViewportBridge.getRuntimeViewport,
      list: runtimeViewportBridge.listRuntimeViewports,
      requestResize: runtimeViewportBridge.requestResize,
      getCameraSnapshot: runtimeViewportBridge.getCameraSnapshot,
      applyCameraState: (cameraState) => {
        const scene = sceneRef.current;
        if (!scene) {
          return false;
        }
        return scene.applyCameraState(cameraState);
      },
      getInvariants: () => runtimeViewportInvariantStateRef.current
    };
    return () => {
      delete window.__atrvisuRuntimeViewport;
    };
  }, [enableE2EDiagnostics, runtimeViewportBridge]);

  useEffect(() => {
    let isMounted = true;

    const loadProjects = async () => {
      setIsProjectStorageLoading(true);
      try {
        const migrationResult = await initializeProjectStorage();
        if (migrationResult.warnings.length > 0) {
          console.warn("AtrVisu project storage migration warnings:", migrationResult.warnings);
        }
        const nextProjects = await listProjects();
        if (isMounted) {
          setProjects(nextProjects);
          setProjectStorageError("");
        }
      } catch (caught) {
        if (isMounted) {
          setProjectStorageError(caught instanceof Error ? caught.message : "Project storage could not be loaded.");
        }
      } finally {
        if (isMounted) {
          setIsProjectStorageLoading(false);
        }
      }
    };

    void loadProjects();

    return () => {
      isMounted = false;
    };
  }, []);
  useLayoutEffect(() => {
    responsiveInspectorPresentationRef.current = responsiveInspectorPresentation;
  }, [responsiveInspectorPresentation]);
  useLayoutEffect(() => {
    responsivePrimaryDockPresentationRef.current = responsivePrimaryDockPresentation;
  }, [responsivePrimaryDockPresentation]);
  useLayoutEffect(() => {
    inspectorPresentationCollapsedRef.current = isInspectorPresentationCollapsed;
  }, [isInspectorPresentationCollapsed]);
  useEffect(() => {
    if (!responsiveInspectorPresentation) {
      setIsResponsiveInspectorOpen(false);
    }
  }, [responsiveInspectorPresentation]);
  useEffect(() => {
    if (!responsivePrimaryDockPresentation) {
      setIsResponsivePrimaryDockOpen(false);
    }
  }, [responsivePrimaryDockPresentation]);

  useEffect(() => {
    const handlePointerMove = (event: PointerEvent) => {
      const resizeStart = resizeStartRef.current;
      if (!resizeStart) {
        return;
      }

      const nextWidth = resizeStart.width + resizeStart.pointerX - event.clientX;
      setPanelWidth(Math.min(MAX_RIGHT_PANEL_WIDTH, Math.max(MIN_RIGHT_PANEL_WIDTH, Math.round(nextWidth))));
    };

    const handlePointerUp = () => {
      resizeStartRef.current = null;
      document.body.classList.remove("is-resizing-panel");
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [setPanelWidth]);

  const startPanelResize = (event: ReactPointerEvent<HTMLButtonElement>) => {
    event.preventDefault();
    resizeStartRef.current = {
      pointerX: event.clientX,
      width: panelWidth
    };
    document.body.classList.add("is-resizing-panel");
  };

  const createLayoutSnapshot = useCallback(
    (exportedAt = new Date().toISOString()): AtrVisuLayout =>
      createLayoutSnapshotFromMachines(placedMachines, exportedAt, annotations, viewpoints, layers, groups, civilReferences),
    [annotations, civilReferences, groups, layers, placedMachines, viewpoints]
  );

  const clearSelection = useCallback(() => {
    setRuntimeSelection(createEmptyRuntimeSelection("command"));
  }, []);

  const selectMachine = useCallback((instanceId: string | null, mode: SelectionMode = "replace") => {
    setRuntimeSelection((current) => applyRuntimeSelectionRequest(current, {
      targetId: instanceId ? createLegacyPlatformEntityId("machine", instanceId) : null,
      mode: !instanceId ? "clear" : mode,
      source: "scene"
    }, platformEntitiesRef.current, { activeGroupEditId: activeGroupEditIdRef.current }));
  }, []);

  const selectAnnotationForEditing = useCallback((annotationId: string | null) => {
    if (!annotationId) {
      setRuntimeSelection((current) => current.ids.some((id) => id.startsWith("annotation:"))
        ? createEmptyRuntimeSelection("scene")
        : current);
      return;
    }

    setRuntimeSelection((current) => applyRuntimeSelectionRequest(current, {
      targetId: createLegacyPlatformEntityId("annotation", annotationId),
      mode: "replace",
      source: "scene"
    }, platformEntitiesRef.current));
    setAnnotationSelectionSignal((current) => current + 1);
    openInspectorPresentation();
    setPanelSectionExpansionPreservingVisibility(RUNTIME_PANEL_IDS.annotations, true);
  }, [openInspectorPresentation, setPanelSectionExpansionPreservingVisibility]);

  const selectCivilReferenceForEditing = useCallback((id: string | null, mode: SelectionMode = "replace") => {
    openInspectorPresentation();
    setRuntimeSelection((current) => applyRuntimeSelectionRequest(current, {
      targetId: id ? createLegacyPlatformEntityId("civil", id) : null,
      mode: !id ? "clear" : mode,
      source: "scene"
    }, platformEntitiesRef.current, { activeGroupEditId: activeGroupEditIdRef.current }));
  }, [openInspectorPresentation]);

  const selectPlatformEntityForEditing = useCallback((entityId: EntityId, mode: SelectionMode = "replace") => {
    setRuntimeSelection((current) => applyRuntimeSelectionRequest(current, {
      targetId: entityId,
      mode,
      source: "explorer"
    }, platformEntitiesRef.current, { activeGroupEditId: activeGroupEditIdRef.current }));
    if (entityId.startsWith("annotation:")) {
      setAnnotationSelectionSignal((current) => current + 1);
      setPanelSectionExpansionPreservingVisibility(RUNTIME_PANEL_IDS.annotations, true);
    }
    openInspectorPresentation();
  }, [openInspectorPresentation, setPanelSectionExpansionPreservingVisibility]);

  const replaceSelection = useCallback((ids: string[], primaryId: string | null = ids[0] ?? null) => {
    const orderedIds = primaryId
      ? [primaryId, ...ids.filter((id) => id !== primaryId)]
      : ids;
    setRuntimeSelection(replaceRuntimeSelection(
      orderedIds.map((id) => createLegacyPlatformEntityId("machine", id)),
      "command"
    ));
  }, []);

  const addMachine = useCallback((selection: { libraryId: string; definition: MachineDefinition }) => {
    const { libraryId } = selection;
    const definition = normalizeMachineVisualModel(normalizeMachineDefinitionDimensions(selection.definition));
    const instanceId = createMachineInstanceId(
      definition.id,
      placedMachinesRef.current.map((machine) => machine.instanceId)
    );

    markLayoutChanged();
    setPlacedMachines((current) => {
      const index = current.length;
      const column = index % PLACEMENT_COLUMNS;
      const row = Math.floor(index / PLACEMENT_COLUMNS);

      const position = {
        x: PLACEMENT_ORIGIN.x + column * PLACEMENT_SPACING,
        z: PLACEMENT_ORIGIN.z + row * PLACEMENT_SPACING
      };

      return [
        ...current,
        {
          instanceId,
          libraryId,
          machineDefinitionId: definition.id,
          definitionSnapshot: definition,
          definition,
          layerId: "default",
          position,
          positionMm: {
            xMm: metersToMm(position.x),
            yMm: metersToMm(position.z)
          },
          referencePoint: LAYOUT_REFERENCE_POINT,
          coordinateReferenceVersion: COORDINATE_REFERENCE_VERSION,
          elevationMm: 0,
          rotationDeg: 0,
          rotationY: 0,
          flowDirection: "forward"
        }
      ];
    });
    replaceSelection([instanceId], instanceId);
  }, [markLayoutChanged, replaceSelection]);

  const duplicateSelectedMachines = useCallback(() => {
    if (
      selectedMachineIds.length === 0
      || runtimeSelection.ids.length !== selectedMachineIds.length
      || !evaluateAtomicMovement(runtimeSelection.ids, platformEntities).allowed
    ) {
      return;
    }

    const selectedById = new Map(selectedMachines.map((machine) => [machine.instanceId, machine]));
    const sourceMachines = selectedMachineIds.flatMap((machineId) => {
      const machine = selectedById.get(machineId);
      return machine ? [machine] : [];
    });

    if (sourceMachines.length !== selectedMachineIds.length) {
      return;
    }

    if (sourceMachines.some((machine) => isLayerLocked(machine.layerId, layersRef.current))) {
      return;
    }

    const duplicates = duplicatePlacedMachines(sourceMachines, {
      existingInstanceIds: placedMachinesRef.current.map((machine) => machine.instanceId),
      offsetMm: DUPLICATE_MACHINE_OFFSET_MM
    });
    const duplicateIds = duplicates.map((machine) => machine.instanceId);
    const primarySourceId = primarySelectedMachineId && selectedMachineIds.includes(primarySelectedMachineId)
      ? primarySelectedMachineId
      : selectedMachineIds[0];
    const primarySourceIndex = sourceMachines.findIndex((machine) => machine.instanceId === primarySourceId);
    const duplicatePrimaryId = duplicates[Math.max(0, primarySourceIndex)]?.instanceId ?? duplicateIds[0] ?? null;

    markLayoutChanged();
    setPlacedMachines((current) => [...current, ...duplicates]);
    setActiveGroupEditId(null);
    replaceSelection(duplicateIds, duplicatePrimaryId);
  }, [markLayoutChanged, platformEntities, primarySelectedMachineId, replaceSelection, runtimeSelection.ids, selectedMachineIds, selectedMachines]);

  const updateMachine = useCallback((
    instanceId: string,
    updates: Partial<Pick<PlacedMachine, "position" | "positionMm" | "elevationMm" | "rotationDeg" | "rotationY" | "flowDirection" | "layerId">>,
    options: { snapPosition?: boolean; snapRotation?: boolean } = {}
  ) => {
    const currentMachine = placedMachinesRef.current.find((machine) => machine.instanceId === instanceId);
    if (currentMachine && isLayerLocked(currentMachine.layerId, layersRef.current)) {
      return;
    }
    markLayoutChanged();
    setPlacedMachines((current) =>
      current.map((machine) => {
        if (machine.instanceId !== instanceId) {
          return machine;
        }

        const positionChanged = updates.position !== undefined || updates.positionMm !== undefined;
        const rawPositionMm = updates.positionMm ?? (
          updates.position
            ? { xMm: metersToMm(updates.position.x), yMm: metersToMm(updates.position.z) }
            : machine.positionMm ?? {
                xMm: metersToMm(machine.position.x),
                yMm: metersToMm(machine.position.z)
              }
        );
        const nextPositionMm = positionChanged
          ? options.snapPosition === false
            ? rawPositionMm
            : applyPositionSnap(rawPositionMm, placementSettingsRef.current)
          : rawPositionMm;
        const nextPosition = {
          x: mmToMeters(nextPositionMm.xMm),
          z: mmToMeters(nextPositionMm.yMm)
        };
        const rotationChanged = updates.rotationY !== undefined || updates.rotationDeg !== undefined;
        const rawRotation = updates.rotationY ?? updates.rotationDeg ?? machine.rotationDeg ?? machine.rotationY;
        const nextRotationY = rotationChanged
          ? options.snapRotation === false
            ? applyRotationSnap(rawRotation, { ...placementSettingsRef.current, rotationSnapEnabled: false })
            : applyRotationSnap(rawRotation, placementSettingsRef.current)
          : rawRotation;

        return {
          ...machine,
          ...updates,
          position: nextPosition,
          positionMm: nextPositionMm,
          referencePoint: LAYOUT_REFERENCE_POINT,
          coordinateReferenceVersion: COORDINATE_REFERENCE_VERSION,
          rotationY: nextRotationY,
          rotationDeg: nextRotationY
        };
      })
    );
  }, []);

  const exportLayout = useCallback(() => {
    const layout = createLayoutSnapshot();
    const blob = new Blob([JSON.stringify(layout, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `atrvisu-layout-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-")}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }, [createLayoutSnapshot]);

  const importLayout = useCallback((layout: AtrVisuLayout) => {
    const importedMachines = placedMachinesFromLayout(layout);
    const importedAnnotations = annotationsFromLayout(layout);
    const importedLayers = layersFromLayout(layout);
    const importedCivilReferences = civilReferencesFromLayout(layout, importedLayers);
    const importedGroups = groupsFromLayout(layout, importedMachines, importedLayers);
    const importedViewpoints = viewpointsFromLayout(layout);

    markLayoutChanged();
    setLayers(importedLayers);
    setGroups(importedGroups);
    setActiveGroupEditId(null);
    setSelectedLayerId(importedLayers[0]?.id ?? "default");
    setPlacedMachines(importedMachines);
    setCivilReferences(importedCivilReferences);
    setAnnotations(importedAnnotations);
    setViewpoints(importedViewpoints);
    setSelectedViewpointId(importedViewpoints[0]?.id ?? null);
    clearSelection();
  }, [clearSelection, markLayoutChanged]);

  const createCurrentDisplayState = useCallback((): ViewpointDisplayState => ({
    showCollisionEnvelope: overlaySettings.showCollisionEnvelope,
    showConnectionPoints: overlaySettings.showConnectionPoints,
    showAnnotations: overlaySettings.showAnnotations,
    selectedObjectIds: selectedMachineIds,
    selectedAnnotationId
  }), [overlaySettings, selectedAnnotationId, selectedMachineIds]);

  const captureViewpoint = useCallback((name: string) => {
    const camera = sceneRef.current?.getCameraState();
    if (!camera) {
      return;
    }

    try {
      const viewpoint = createViewpoint({
        name,
        camera,
        displayState: createCurrentDisplayState()
      });
      markLayoutChanged();
      setViewpoints((current) => addViewpoint(current, viewpoint));
      setSelectedViewpointId(viewpoint.id);
    } catch (caught) {
      window.alert(caught instanceof Error ? caught.message : "Viewpoint could not be captured.");
    }
  }, [createCurrentDisplayState, markLayoutChanged]);

  const applyViewpoint = useCallback((viewpointId: string) => {
    const viewpoint = viewpoints.find((item) => item.id === viewpointId);
    if (!viewpoint) {
      return;
    }

    sceneRef.current?.applyCameraState(viewpoint.camera);
    if (viewpoint.displayState) {
      const {
        selectedObjectIds,
        selectedAnnotationId: displaySelectedAnnotationId,
        ...overlayDisplayState
      } = viewpoint.displayState;
      setOverlaySettings((current) => ({
        ...current,
        ...overlayDisplayState
      }));
      if (selectedObjectIds) {
        setRuntimeSelection(replaceRuntimeSelection(
          selectedObjectIds.map((id) => createLegacyPlatformEntityId("machine", id)),
          "command"
        ));
      }
      if (displaySelectedAnnotationId) {
        selectAnnotationForEditing(displaySelectedAnnotationId);
      }
    }
    setSelectedViewpointId(viewpoint.id);
  }, [selectAnnotationForEditing, viewpoints]);

  const updateSelectedViewpointFromCurrentView = useCallback((viewpointId: string) => {
    const camera = sceneRef.current?.getCameraState();
    if (!camera) {
      return;
    }

    markLayoutChanged();
    setViewpoints((current) =>
      updateViewpoint(current, viewpointId, {
        camera,
        displayState: createCurrentDisplayState()
      })
    );
  }, [createCurrentDisplayState, markLayoutChanged]);

  const renameViewpoint = useCallback((viewpointId: string, name: string) => {
    if (!name.trim()) {
      return;
    }

    markLayoutChanged();
    setViewpoints((current) => updateViewpoint(current, viewpointId, { name }));
  }, [markLayoutChanged]);

  const removeViewpoint = useCallback((viewpointId: string) => {
    const viewpoint = viewpoints.find((item) => item.id === viewpointId);
    if (!viewpoint) {
      return;
    }
    if (!window.confirm(`Delete viewpoint "${viewpoint.name}"?`)) {
      return;
    }

    markLayoutChanged();
    setViewpoints((current) => deleteViewpoint(current, viewpointId));
  }, [markLayoutChanged, viewpoints]);

  const stepViewpoint = useCallback((direction: "previous" | "next") => {
    if (viewpoints.length === 0) {
      return;
    }
    const currentIndex = Math.max(0, viewpoints.findIndex((viewpoint) => viewpoint.id === selectedViewpointId));
    const nextIndex = direction === "next"
      ? (currentIndex + 1) % viewpoints.length
      : (currentIndex - 1 + viewpoints.length) % viewpoints.length;
    applyViewpoint(viewpoints[nextIndex].id);
  }, [applyViewpoint, selectedViewpointId, viewpoints]);

  const addLayer = useCallback((name: string) => {
    try {
      const layer = createLayer(name);
      markLayoutChanged();
      setLayers((current) => normalizeLayers([...current, layer]));
    } catch (caught) {
      window.alert(caught instanceof Error ? caught.message : "Layer could not be created.");
    }
  }, [markLayoutChanged]);

  const renameLayer = useCallback((layerId: string, name: string) => {
    if (!name.trim()) {
      return;
    }
    markLayoutChanged();
    setLayers((current) =>
      current.map((layer) =>
        layer.id === layerId && !layer.systemLayer
          ? { ...layer, name: name.trim(), updatedAt: new Date().toISOString() }
          : layer
      )
    );
  }, [markLayoutChanged]);

  const toggleLayerVisibility = useCallback((layerId: string) => {
    if (getLayer(layerId, layersRef.current).systemLayer) {
      return;
    }
    markLayoutChanged();
    setLayers((current) =>
      current.map((layer) =>
        layer.id === layerId ? { ...layer, visible: !layer.visible, updatedAt: new Date().toISOString() } : layer
      )
    );
  }, [markLayoutChanged]);

  const toggleLayerLocked = useCallback((layerId: string) => {
    if (getLayer(layerId, layersRef.current).systemLayer) {
      return;
    }
    markLayoutChanged();
    setLayers((current) =>
      current.map((layer) =>
        layer.id === layerId ? { ...layer, locked: !layer.locked, updatedAt: new Date().toISOString() } : layer
      )
    );
  }, [markLayoutChanged]);

  const removeLayer = useCallback((layerId: string) => {
    const layer = layers.find((item) => item.id === layerId);
    if (!layer || layer.systemLayer) {
      return;
    }
    if (!window.confirm(`Delete layer "${layer.name}"? Items on this layer will move to Default.`)) {
      return;
    }
    markLayoutChanged();
    const result = deleteLayerAndReassignItems(layers, placedMachinesRef.current, annotationsRef.current, layerId);
    setLayers(normalizeLayers(result.layers));
    setPlacedMachines(result.machines);
    setAnnotations(result.annotations);
    setCivilReferences((current) =>
      current.map((item) => getLayerId(item.layerId, layers) === layerId ? { ...item, layerId: "default" } : item)
    );
    setSelectedLayerId("default");
  }, [layers, markLayoutChanged]);

  const isolateSelectedLayer = useCallback((layerId: string) => {
    markLayoutChanged();
    setLayers((current) => isolateLayer(current, layerId));
    setSelectedLayerId(layerId);
  }, [markLayoutChanged]);

  const showAllLayoutLayers = useCallback(() => {
    markLayoutChanged();
    setLayers((current) => showAllLayers(current));
  }, [markLayoutChanged]);

  const changeMachineLayer = useCallback((instanceId: string, layerId: string) => {
    const machine = placedMachinesRef.current.find((item) => item.instanceId === instanceId);
    if (!machine || isLayerLocked(machine.layerId, layersRef.current)) {
      return;
    }
    markLayoutChanged();
    setPlacedMachines((current) =>
      current.map((item) => item.instanceId === instanceId ? { ...item, layerId: getLayerId(layerId, layersRef.current) } : item)
    );
  }, [markLayoutChanged]);

  const changeAnnotationLayer = useCallback((annotationId: string, layerId: string) => {
    const annotation = annotationsRef.current.find((item) => item.id === annotationId);
    if (!annotation || isLayerLocked(annotation.layerId, layersRef.current)) {
      return;
    }
    markLayoutChanged();
    setAnnotations((current) =>
      current.map((item) => item.id === annotationId ? { ...item, layerId: getLayerId(layerId, layersRef.current) } : item)
    );
  }, [markLayoutChanged]);

  const selectObjectGroup = useCallback((groupId: string) => {
    const group = groupsRef.current.find((item) => item.id === groupId);
    if (!group) {
      return;
    }
    setRuntimeSelection(replaceRuntimeSelection([
      createLegacyPlatformEntityId("group", groupId)
    ], "explorer"));
  }, []);

  const createGroupFromSelection = useCallback((name: string) => {
    const objectIds = explicitSelectedAlignableEntityIds.filter((key) => {
      if (key.startsWith("civil:")) {
        const civil = civilReferencesRef.current.find((item) => item.id === key.slice("civil:".length));
        return civil ? isLayerVisible(civil.layerId, layersRef.current) : false;
      }
      const machineId = key.replace(/^(object|machine):/, "");
      const machine = placedMachinesRef.current.find((item) => item.instanceId === machineId);
      return machine ? isLayerVisible(machine.layerId, layersRef.current) : false;
    });
    if (objectIds.length === 0) {
      return;
    }
    try {
      const group = createObjectGroup(name, objectIds);
      markLayoutChanged();
      setGroups((current) => addObjectsToGroup([...current, { ...group, objectIds: [] }], group.id, objectIds));
      setActiveGroupEditId(null);
      setRuntimeSelection(replaceRuntimeSelection([
        createLegacyPlatformEntityId("group", group.id)
      ], "command"));
    } catch (caught) {
      window.alert(caught instanceof Error ? caught.message : "Group could not be created.");
    }
  }, [explicitSelectedAlignableEntityIds, markLayoutChanged]);

  const addSelectionToGroup = useCallback((groupId: string) => {
    if (explicitSelectedAlignableEntityIds.length === 0) {
      return;
    }
    const nextGroups = addObjectsToGroup(groupsRef.current, groupId, explicitSelectedAlignableEntityIds);
    if (nextGroups === groupsRef.current) {
      return;
    }
    markLayoutChanged();
    setGroups(nextGroups);
    if (
      activeGroupEditIdRef.current
      && !nextGroups.some((group) => group.id === activeGroupEditIdRef.current)
    ) {
      setActiveGroupEditId(null);
    }
    setRuntimeSelection(replaceRuntimeSelection([
      createLegacyPlatformEntityId("group", groupId)
    ], "command"));
  }, [explicitSelectedAlignableEntityIds, markLayoutChanged]);

  const removeSelectionFromGroup = useCallback((groupId: string) => {
    if (activeGroupEditIdRef.current !== groupId) {
      return;
    }
    const group = groupsRef.current.find((item) => item.id === groupId);
    if (!group) {
      return;
    }
    const explicitSelection = projectExplicitRuntimeSelection(
      runtimeSelectionRef.current,
      platformEntitiesRef.current
    );
    const removableEntityIds = getSelectedGroupMemberEntityIds(
      group,
      explicitSelection.selectedAlignableEntityIds
    );
    if (removableEntityIds.length === 0) {
      return;
    }
    const result = removeObjectsFromGroupWithResult(
      groupsRef.current,
      groupId,
      removableEntityIds
    );
    if (!result) {
      return;
    }
    markLayoutChanged();
    setGroups(result.groups);
    if (result.removedGroup) {
      setActiveGroupEditId(null);
      setRuntimeSelection(createEmptyRuntimeSelection("command"));
    }
  }, [markLayoutChanged]);

  const renameObjectGroup = useCallback((groupId: string, name: string) => {
    if (!name.trim()) {
      return;
    }
    markLayoutChanged();
    setGroups((current) =>
      current.map((group) =>
        group.id === groupId ? { ...group, name: name.trim(), updatedAt: new Date().toISOString() } : group
      )
    );
  }, [markLayoutChanged]);

  const toggleGroupCollapsed = useCallback((groupId: string) => {
    markLayoutChanged();
    setGroups((current) =>
      current.map((group) =>
        group.id === groupId ? { ...group, collapsed: !group.collapsed, updatedAt: new Date().toISOString() } : group
      )
    );
  }, [markLayoutChanged]);

  const applyBenchmarkMachines = useCallback((machines: PlacedMachine[]) => {
    setIsBenchmarkMode(true);
    setPlacedMachines(machines);
    setCivilReferences([]);
    setAnnotations([]);
    setLayers([createDefaultLayer()]);
    setGroups([]);
    setActiveGroupEditId(null);
    setSelectedLayerId("default");
    setViewpoints([]);
    setSelectedViewpointId(null);
    clearSelection();
    clearLayoutHistory();
  }, [clearLayoutHistory, clearSelection]);

  const restoreBenchmarkSnapshot = useCallback((snapshot: AtrVisuLayout) => {
    const importedMachines = placedMachinesFromLayout(snapshot);
    const importedAnnotations = annotationsFromLayout(snapshot);
    const importedLayers = layersFromLayout(snapshot);
    const importedCivilReferences = civilReferencesFromLayout(snapshot, importedLayers);
    const importedGroups = groupsFromLayout(snapshot, importedMachines, importedLayers);
    const importedViewpoints = viewpointsFromLayout(snapshot);
    setPlacedMachines(importedMachines);
    setCivilReferences(importedCivilReferences);
    setAnnotations(importedAnnotations);
    setLayers(importedLayers);
    setGroups(importedGroups);
    setActiveGroupEditId(null);
    setSelectedLayerId(importedLayers[0]?.id ?? "default");
    setViewpoints(importedViewpoints);
    setSelectedViewpointId(importedViewpoints[0]?.id ?? null);
    clearSelection();
    setIsBenchmarkMode(false);
    setHasUnsavedProjectChanges(false);
    clearLayoutHistory();
  }, [clearLayoutHistory, clearSelection]);

  const clearBenchmarkScene = useCallback(() => {
    setPlacedMachines([]);
    setCivilReferences([]);
    setAnnotations([]);
    setLayers([createDefaultLayer()]);
    setGroups([]);
    setActiveGroupEditId(null);
    setSelectedLayerId("default");
    setViewpoints([]);
    setSelectedViewpointId(null);
    clearSelection();
    setIsBenchmarkMode(true);
    clearLayoutHistory();
  }, [clearLayoutHistory, clearSelection]);

  const loadRevisionSnapshot = useCallback((
    projectId: string,
    layoutId: string,
    revisionId: string,
    snapshot: AtrVisuLayout
  ) => {
    const importedMachines = placedMachinesFromLayout(snapshot);
    const importedAnnotations = annotationsFromLayout(snapshot);
    const importedLayers = layersFromLayout(snapshot);
    const importedCivilReferences = civilReferencesFromLayout(snapshot, importedLayers);
    const importedGroups = groupsFromLayout(snapshot, importedMachines, importedLayers);
    const importedViewpoints = viewpointsFromLayout(snapshot);
    setPlacedMachines(importedMachines);
    setCivilReferences(importedCivilReferences);
    setAnnotations(importedAnnotations);
    setLayers(importedLayers);
    setGroups(importedGroups);
    setActiveGroupEditId(null);
    setSelectedLayerId(importedLayers[0]?.id ?? "default");
    setViewpoints(importedViewpoints);
    setSelectedViewpointId(importedViewpoints[0]?.id ?? null);
    clearSelection();
    setCurrentProjectId(projectId);
    setCurrentLayoutId(layoutId);
    setCurrentRevisionId(revisionId);
    setHasAcceptedWorkingLayout(true);
    void refreshProjects();
    setHasUnsavedProjectChanges(false);
    clearLayoutHistory();
  }, [clearLayoutHistory, clearSelection, refreshProjects]);

  const canBeginObjectDrag = useMemo(() => createRuntimeSelectionMovementPreflight(() => ({
    selection: runtimeSelectionRef.current,
    entities: platformEntitiesRef.current,
    activeGroupEditId: activeGroupEditIdRef.current
  })), []);

  const setMachinePositions = useCallback((
    updates: Array<{ instanceId: string; xMm: number; yMm: number }>,
    options: { recordHistory?: boolean } = {}
  ) => {
    const currentSelection = runtimeSelectionRef.current;
    const currentEntities = platformEntitiesRef.current;
    const affectedEntityIds = getAtomicMovementEntityIds(
      currentSelection,
      updates.map((update) => createLegacyPlatformEntityId("machine", update.instanceId)),
      true,
      currentEntities,
      activeGroupEditIdRef.current
    );
    const evaluation = evaluateAtomicMovement(affectedEntityIds, currentEntities);
    if (!evaluation.allowed) {
      return false;
    }

    const hasRealPositionChange = updates.some((update) => {
      const machine = placedMachinesRef.current.find((item) => item.instanceId === update.instanceId);
      const currentPosition = machine ? getMachinePlanPositionMm(machine) : null;
      return currentPosition ? currentPosition.xMm !== update.xMm || currentPosition.yMm !== update.yMm : false;
    });
    if (!hasRealPositionChange) {
      return false;
    }

    const activeEditGroup = activeGroupEditIdRef.current
      ? groupsRef.current.find((group) => group.id === activeGroupEditIdRef.current)
      : undefined;
    const updatesActiveEditMember = Boolean(activeEditGroup && updates.some((update) =>
      activeEditGroup.objectIds.includes(createLegacyPlatformEntityId("machine", update.instanceId))
    ));
    const hasSelectedAssembly = !updatesActiveEditMember
      && currentSelection.ids.some((entityId) => entityId.startsWith("group:"));
    if (hasSelectedAssembly) {
      const firstUpdate = updates.find((update) =>
        placedMachinesRef.current.some((machine) => machine.instanceId === update.instanceId)
      );
      const firstMachine = firstUpdate
        ? placedMachinesRef.current.find((machine) => machine.instanceId === firstUpdate.instanceId)
        : undefined;
      if (!firstUpdate || !firstMachine) {
        return false;
      }
      const targetPosition = applyPositionSnap(
        { xMm: firstUpdate.xMm, yMm: firstUpdate.yMm },
        placementSettingsRef.current
      );
      const delta = getMachinePositionUpdateDelta(firstMachine, targetPosition);
      const projection = projectRuntimeSelection(currentSelection, currentEntities);
      const movement = moveAssemblyMembersByDelta({
        machines: placedMachinesRef.current,
        civilReferences: civilReferencesRef.current,
        memberEntityIds: projection.selectedAlignableEntityIds,
        ...delta
      });
      if (!movement) {
        return false;
      }

      executeAtomicSelectionMutation({
        entityIds: affectedEntityIds,
        entities: currentEntities,
        beforeMutation: () => markLayoutChanged(options),
        mutate: () => {
          setPlacedMachines(movement.machines);
          setCivilReferences(movement.civilReferences);
        }
      });
      return true;
    }

    executeAtomicSelectionMutation({
      entityIds: affectedEntityIds,
      entities: currentEntities,
      beforeMutation: () => markLayoutChanged(options),
      mutate: () => setPlacedMachines((current) => {
        if (!placementSettingsRef.current.gridSnapEnabled || updates.length === 1) {
          const snappedUpdates = updates.map((update) => ({
            ...update,
            ...applyPositionSnap({ xMm: update.xMm, yMm: update.yMm }, placementSettingsRef.current)
          }));
          return applyMachinePositionUpdates(current, snappedUpdates);
        }

        const firstUpdate = updates[0];
        const firstMachine = current.find((machine) => machine.instanceId === firstUpdate.instanceId);
        if (!firstMachine) {
          return current;
        }

        const firstPosition = getMachinePlanPositionMm(firstMachine);
        const snappedFirstPosition = applyPositionSnap({ xMm: firstUpdate.xMm, yMm: firstUpdate.yMm }, placementSettingsRef.current);
        const snappedDeltaXMm = snappedFirstPosition.xMm - firstPosition.xMm;
        const snappedDeltaYMm = snappedFirstPosition.yMm - firstPosition.yMm;
        const updateIds = new Set(updates.map((update) => update.instanceId));

        return current.map((machine) => {
          if (!updateIds.has(machine.instanceId)) {
            return machine;
          }

          const position = getMachinePlanPositionMm(machine);
          return applyMachinePositionUpdates(
            [machine],
            [{
              instanceId: machine.instanceId,
              xMm: position.xMm + snappedDeltaXMm,
              yMm: position.yMm + snappedDeltaYMm
            }]
          )[0];
        });
      })
    });
    return true;
  }, [markLayoutChanged]);

  const moveSelectedByDelta = useCallback((
    deltaXMm: number,
    deltaYMm: number,
    options: { recordHistory?: boolean } = {}
  ) => {
    const currentSelection = runtimeSelectionRef.current;
    const currentEntities = platformEntitiesRef.current;
    const projection = projectRuntimeSelection(currentSelection, currentEntities);
    const movement = moveAssemblyMembersByDelta({
      machines: placedMachinesRef.current,
      civilReferences: civilReferencesRef.current,
      memberEntityIds: projection.selectedAlignableEntityIds,
      deltaXMm,
      deltaYMm
    });
    if (!movement) {
      return false;
    }
    const evaluation = executeAtomicSelectionMutation({
      entityIds: currentSelection.ids,
      entities: currentEntities,
      beforeMutation: () => markLayoutChanged(options),
      mutate: () => {
        setPlacedMachines(movement.machines);
        setCivilReferences(movement.civilReferences);
      }
    });
    return evaluation.allowed;
  }, [markLayoutChanged]);

  const getAssemblyCommandGroupId = useCallback((primarySelectionId?: string) => {
    const parsed = primarySelectionId ? parseRuntimeSelectionEntityId(primarySelectionId) : null;
    return parsed?.family === "group" ? parsed.sourceId : activeGroupEditIdRef.current;
  }, []);

  const enterGroupEditMode = useCallback((primarySelectionId?: string) => {
    const groupId = getAssemblyCommandGroupId(primarySelectionId);
    if (!groupId || !groupsRef.current.some((group) => group.id === groupId)) {
      return;
    }
    setActiveGroupEditId(groupId);
    setRuntimeSelection(replaceRuntimeSelection([
      createLegacyPlatformEntityId("group", groupId)
    ], "command"));
  }, [getAssemblyCommandGroupId]);

  const exitGroupEditMode = useCallback(() => {
    const groupId = activeGroupEditIdRef.current;
    setActiveGroupEditId(null);
    if (groupId && groupsRef.current.some((group) => group.id === groupId)) {
      setRuntimeSelection(replaceRuntimeSelection([
        createLegacyPlatformEntityId("group", groupId)
      ], "command"));
    }
  }, []);

  const ungroupAssembly = useCallback((primarySelectionId?: string) => {
    const groupId = getAssemblyCommandGroupId(primarySelectionId);
    const group = groupId ? groupsRef.current.find((item) => item.id === groupId) : undefined;
    if (!group) {
      return createUnavailableRuntimeCommandResult("The selected assembly is no longer available.");
    }

    return executeConfirmedRuntimeCommandOperation({
      confirm: () => window.confirm(
        `Ungroup "${group.name}"? Member objects will remain in the layout.`
      ),
      cancelledReason: "Ungroup was cancelled.",
      execute: () => {
        const result = ungroupObjectGroup(groupsRef.current, group.id);
        if (!result) {
          return createUnavailableRuntimeCommandResult(
            "The selected assembly could not be ungrouped."
          );
        }
        markLayoutChanged();
        setGroups(result.groups);
        setActiveGroupEditId(null);
        setRuntimeSelection(replaceRuntimeSelection(result.memberEntityIds, "command"));
        return createExecutedRuntimeCommandResult();
      }
    });
  }, [getAssemblyCommandGroupId, markLayoutChanged]);

  const applyAlignablePositionUpdates = useCallback((updates: Array<{ kind: "machine" | "civil"; id: string; xMm: number; yMm: number }>) => {
    const machineUpdates = updates
      .filter((update) => update.kind === "machine")
      .map((update) => ({ instanceId: update.id, xMm: update.xMm, yMm: update.yMm }));
    const civilUpdates = updates.filter((update) => update.kind === "civil");

    if (machineUpdates.length > 0) {
      setPlacedMachines((current) => applyMachinePositionUpdates(current, machineUpdates));
    }
    if (civilUpdates.length > 0) {
      setCivilReferences((current) =>
        civilUpdates.reduce(
          (items, update) => updateCivilReference(items, update.id, { positionMm: { xMm: update.xMm, yMm: update.yMm } }),
          current
        )
      );
    }
  }, []);

  const canApplyAlignableAction = useCallback(() => {
    if (runtimeSelection.ids.some((entityId) => entityId.startsWith("group:"))) {
      window.alert("Arrange the assembly as one rigid entity. Member alignment is available only in Edit Group mode.");
      return false;
    }
    if (selectedGroupHasLockedVisibleMembers) {
      window.alert("Alignment is blocked because the selected group contains locked visible objects.");
      return false;
    }
    if (selectedAlignableEntityIds.length < 2) {
      return false;
    }
    if (selectionHasLockedAlignableEntities(alignableEntities, selectedAlignableEntityIds)) {
      window.alert("Alignment is blocked because the selection includes locked objects or civil references.");
      return false;
    }
    return true;
  }, [alignableEntities, runtimeSelection.ids, selectedAlignableEntityIds, selectedGroupHasLockedVisibleMembers]);

  const applyAlignmentAction = useCallback((action: AlignmentAction) => {
    if (!canApplyAlignableAction()) {
      return;
    }
    const updates = alignEntitiesToAnchor(alignableEntities, selectedAlignableEntityIds, primarySelectedAlignableId, action);
    if (updates.length === 0) {
      return;
    }
    markLayoutChanged();
    applyAlignablePositionUpdates(updates);
  }, [alignableEntities, applyAlignablePositionUpdates, canApplyAlignableAction, markLayoutChanged, primarySelectedAlignableId, selectedAlignableEntityIds]);

  const applyDistributionAction = useCallback((action: DistributionAction) => {
    if (!canApplyAlignableAction()) {
      return;
    }
    const updates = distributeEntitiesByCenter(alignableEntities, selectedAlignableEntityIds, action);
    if (updates.length === 0) {
      return;
    }
    markLayoutChanged();
    applyAlignablePositionUpdates(updates);
  }, [alignableEntities, applyAlignablePositionUpdates, canApplyAlignableAction, markLayoutChanged, selectedAlignableEntityIds]);

  const applyEqualGapAction = useCallback((action: EqualGapAction) => {
    if (!canApplyAlignableAction()) {
      return;
    }
    const updates = equalizeEntityGaps(alignableEntities, selectedAlignableEntityIds, action);
    if (updates.length === 0) {
      return;
    }
    markLayoutChanged();
    applyAlignablePositionUpdates(updates);
  }, [alignableEntities, applyAlignablePositionUpdates, canApplyAlignableAction, markLayoutChanged, selectedAlignableEntityIds]);

  const applyPairAlignmentAction = useCallback((action: PairAlignmentAction, gapMm = 0) => {
    if (!canApplyAlignableAction()) {
      return;
    }
    const updates = applyEntityPairAlignment(alignableEntities, selectedAlignableEntityIds, primarySelectedAlignableId, action, gapMm);
    if (updates.length === 0) {
      return;
    }
    markLayoutChanged();
    applyAlignablePositionUpdates(updates);
  }, [alignableEntities, applyAlignablePositionUpdates, canApplyAlignableAction, markLayoutChanged, primarySelectedAlignableId, selectedAlignableEntityIds]);

  const applyPairAnchorSnap = useCallback((primaryAnchor: FootprintAnchor, secondaryAnchor: FootprintAnchor) => {
    if (!canApplyAlignableAction()) {
      return;
    }
    const updates = snapPrimaryEntityAnchorToSecondaryAnchor(
      alignableEntities,
      selectedAlignableEntityIds,
      primarySelectedAlignableId,
      primaryAnchor,
      secondaryAnchor
    );
    if (updates.length === 0) {
      return;
    }
    markLayoutChanged();
    applyAlignablePositionUpdates(updates);
  }, [alignableEntities, applyAlignablePositionUpdates, canApplyAlignableAction, markLayoutChanged, primarySelectedAlignableId, selectedAlignableEntityIds]);

  const applyConnectionSnap = useCallback((
    selection: ConnectionPointSnapSelection,
    movingPoint: MachineConnectionPoint,
    fixedPoint: MachineConnectionPoint
  ) => {
    executeGuardedConnectionPointSnap({
      selection: runtimeSelectionRef.current,
      entities: platformEntitiesRef.current,
      activeGroupEditId: activeGroupEditIdRef.current,
      movingMachineId: selection.movingMachineId,
      fixedMachineId: selection.fixedMachineId,
      movingPoint,
      fixedPoint,
      requireProductFlowPair: true
    }, () => {
      const currentMachines = placedMachinesRef.current;
      const nextMachines = applyConnectionPointSnap(currentMachines, selection, movingPoint, fixedPoint);
      if (nextMachines === currentMachines) {
        return;
      }
      markLayoutChanged();
      setPlacedMachines(nextMachines);
    });
  }, [markLayoutChanged]);

  const addCivilReference = useCallback((type: CivilReferenceType) => {
    const index = civilReferencesRef.current.length;
    const column = index % PLACEMENT_COLUMNS;
    const row = Math.floor(index / PLACEMENT_COLUMNS);
    const positionMm = {
      xMm: metersToMm(PLACEMENT_ORIGIN.x + column * PLACEMENT_SPACING),
      yMm: metersToMm(PLACEMENT_ORIGIN.z + row * PLACEMENT_SPACING)
    };
    const item = createCivilReference(type, positionMm);
    markLayoutChanged();
    setCivilReferences((current) => [...current, item]);
    setRuntimeSelection(replaceRuntimeSelection([
      createLegacyPlatformEntityId("civil", item.id)
    ], "inspector"));
    openInspectorPresentation();
  }, [markLayoutChanged, openInspectorPresentation]);

  const updateSelectedCivilReference = useCallback((
    id: string,
    updates: Partial<CivilReferenceItem>,
    options: { recordHistory?: boolean } = {}
  ) => {
    const item = civilReferencesRef.current.find((reference) => reference.id === id);
    if (!item || isLayerLocked(item.layerId, layersRef.current)) {
      return;
    }
    if (item.locked && updates.locked !== false) {
      return;
    }
    markLayoutChanged(options);
    setCivilReferences((current) => updateCivilReference(current, id, updates));
  }, [markLayoutChanged]);

  const setCivilReferencePosition = useCallback((
    id: string,
    positionMm: { xMm: number; yMm: number },
    options: { recordHistory?: boolean } = {}
  ) => {
    const item = civilReferencesRef.current.find((reference) => reference.id === id);
    if (!item || (item.positionMm.xMm === positionMm.xMm && item.positionMm.yMm === positionMm.yMm)) {
      return false;
    }

    const entityId = createLegacyPlatformEntityId("civil", id);
    const currentSelection = runtimeSelectionRef.current;
    const currentEntities = platformEntitiesRef.current;
    const affectedEntityIds = getAtomicMovementEntityIds(
      currentSelection,
      [entityId],
      true,
      currentEntities,
      activeGroupEditIdRef.current
    );
    const activeEditGroup = activeGroupEditIdRef.current
      ? groupsRef.current.find((group) => group.id === activeGroupEditIdRef.current)
      : undefined;
    const updatesActiveEditMember = Boolean(activeEditGroup?.objectIds.includes(entityId));
    const hasSelectedAssembly = !updatesActiveEditMember
      && currentSelection.ids.some((selectedId) => selectedId.startsWith("group:"));
    if (hasSelectedAssembly) {
      const delta = getCivilPositionUpdateDelta(item, positionMm);
      const projection = projectRuntimeSelection(currentSelection, currentEntities);
      const movement = moveAssemblyMembersByDelta({
        machines: placedMachinesRef.current,
        civilReferences: civilReferencesRef.current,
        memberEntityIds: projection.selectedAlignableEntityIds,
        ...delta
      });
      if (!movement) {
        return false;
      }
      const evaluation = executeAtomicSelectionMutation({
        entityIds: affectedEntityIds,
        entities: currentEntities,
        beforeMutation: () => markLayoutChanged(options),
        mutate: () => {
          setPlacedMachines(movement.machines);
          setCivilReferences(movement.civilReferences);
        }
      });
      return evaluation.allowed;
    }

    const evaluation = executeAtomicSelectionMutation({
      entityIds: affectedEntityIds,
      entities: currentEntities,
      beforeMutation: () => markLayoutChanged(options),
      mutate: () => setCivilReferences((current) => updateCivilReference(current, id, { positionMm }))
    });
    return evaluation.allowed;
  }, [markLayoutChanged]);

  const changeCivilReferenceLayer = useCallback((id: string, layerId: string) => {
    const item = civilReferencesRef.current.find((reference) => reference.id === id);
    if (!item || item.locked || isLayerLocked(item.layerId, layersRef.current)) {
      return;
    }
    markLayoutChanged();
    setCivilReferences((current) =>
      updateCivilReference(current, id, { layerId: getLayerId(layerId, layersRef.current) })
    );
  }, [markLayoutChanged]);

  const removeCivilReference = useCallback((id: string) => {
    const item = civilReferencesRef.current.find((reference) => reference.id === id);
    if (!item || item.locked || isLayerLocked(item.layerId, layersRef.current)) {
      return createUnavailableRuntimeCommandResult(
        "The selected civil reference is unavailable or locked."
      );
    }

    return executeConfirmedRuntimeCommandOperation({
      confirm: () => window.confirm(`Delete civil reference "${item.name}"?`),
      cancelledReason: "Delete selected was cancelled.",
      execute: () => {
        markLayoutChanged();
        setCivilReferences((current) => deleteCivilReference(current, id));
        setGroups((current) =>
          removeObjectsFromGroups(current, [getAlignableEntityKey("civil", id)])
        );
        setRuntimeSelection((selection) => replaceRuntimeSelection(
          selection.ids.filter(
            (entityId) => entityId !== createLegacyPlatformEntityId("civil", id)
          ),
          "command"
        ));
        return createExecutedRuntimeCommandResult();
      }
    });
  }, [markLayoutChanged]);

  const addAnnotation = useCallback((type: AnnotationType) => {
    markLayoutChanged();
    const annotation = createAnnotation({
      type,
      selectedMachine: type === "callout" ? selectedMachine : undefined
    });
    setAnnotations((current) => [...current, { ...annotation, layerId: "default" }]);
    setRuntimeSelection(replaceRuntimeSelection([
      createLegacyPlatformEntityId("annotation", annotation.id)
    ], "inspector"));
    setAnnotationSelectionSignal((current) => current + 1);
    openInspectorPresentation();
    setPanelSectionExpansionPreservingVisibility(RUNTIME_PANEL_IDS.annotations, true);
  }, [markLayoutChanged, openInspectorPresentation, selectedMachine, setPanelSectionExpansionPreservingVisibility]);

  const updateSelectedAnnotation = useCallback((
    annotationId: string,
    updates: Partial<AnnotationObject>,
    options: { recordHistory?: boolean } = {}
  ) => {
    const annotation = annotationsRef.current.find((item) => item.id === annotationId);
    if (annotation && isLayerLocked(annotation.layerId, layersRef.current)) {
      return;
    }
    if (options.recordHistory !== false) {
      markLayoutChanged();
      annotationEditHistoryRecordedRef.current = false;
    } else if (!isBenchmarkModeRef.current) {
      if (!annotationEditHistoryRecordedRef.current) {
        recordLayoutHistory();
        annotationEditHistoryRecordedRef.current = true;
      }
      setHasUnsavedProjectChanges(true);
    }
    setAnnotations((current) => updateAnnotation(current, annotationId, updates));
  }, [markLayoutChanged, recordLayoutHistory]);

  const setAnnotationPosition = useCallback((
    annotationId: string,
    positionMm: { xMm: number; yMm: number },
    options: { recordHistory?: boolean } = {}
  ) => {
    const annotation = annotationsRef.current.find((item) => item.id === annotationId);
    if (
      !annotation
      || (annotation.positionMm.xMm === positionMm.xMm && annotation.positionMm.yMm === positionMm.yMm)
    ) {
      return false;
    }

    const entityId = createLegacyPlatformEntityId("annotation", annotationId);
    const currentSelection = runtimeSelectionRef.current;
    const evaluation = executeAtomicSelectionMutation({
      entityIds: getAtomicMovementEntityIds(currentSelection, [entityId], true),
      entities: platformEntitiesRef.current,
      beforeMutation: () => markLayoutChanged(options),
      mutate: () => setAnnotations((current) =>
        updateAnnotation(current, annotationId, {
          positionMm: {
            ...(current.find((item) => item.id === annotationId)?.positionMm ?? { zMm: 1600 }),
            xMm: positionMm.xMm,
            yMm: positionMm.yMm
          }
        })
      )
    });
    return evaluation.allowed;
  }, [markLayoutChanged]);

  const commitAnnotationEdit = useCallback(() => {
    annotationEditHistoryRecordedRef.current = false;
  }, []);

  const removeAnnotation = useCallback((annotationId: string) => {
    const annotation = annotationsRef.current.find((item) => item.id === annotationId);
    if (!annotation || isLayerLocked(annotation.layerId, layersRef.current)) {
      return createUnavailableRuntimeCommandResult(
        "The selected annotation is unavailable or locked."
      );
    }
    markLayoutChanged();
    setAnnotations((current) => deleteAnnotation(current, annotationId));
    setRuntimeSelection((selection) => replaceRuntimeSelection(
      selection.ids.filter((entityId) => entityId !== createLegacyPlatformEntityId("annotation", annotationId)),
      "command"
    ));
    return createExecutedRuntimeCommandResult();
  }, [markLayoutChanged]);

  const deleteSelectedMachines = useCallback(() => {
    const deletableMachines = selectedMachines.filter((machine) => !isLayerLocked(machine.layerId, layersRef.current));
    if (deletableMachines.length === 0) {
      return createUnavailableRuntimeCommandResult("No selected machine is available for deletion.");
    }

    const selectedNames = deletableMachines.map(getPlacedMachineDisplayName);
    const label = deletableMachines.length === 1
      ? selectedNames[0] ?? "the selected object"
      : `${deletableMachines.length} selected objects`;
    return executeConfirmedRuntimeCommandOperation({
      confirm: () => window.confirm(`Delete ${label} from the layout?`),
      cancelledReason: "Delete selected was cancelled.",
      execute: () => {
        markLayoutChanged();
        const ids = new Set(deletableMachines.map((machine) => machine.instanceId));
        const groupIdsToRemove = deletableMachines.flatMap((machine) => [
          machine.instanceId,
          getAlignableEntityKey("machine", machine.instanceId)
        ]);
        setPlacedMachines((current) => current.filter((machine) => !ids.has(machine.instanceId)));
        setAnnotations((current) => detachAnnotationsForDeletedObjects(current, ids));
        setGroups((current) => removeObjectsFromGroups(current, groupIdsToRemove));
        setActiveGroupEditId(null);
        clearSelection();
        return createExecutedRuntimeCommandResult();
      }
    });
  }, [clearSelection, markLayoutChanged, selectedMachines]);

  const deleteSelectedEntities = useCallback(() => {
    if (selectedCivilReferenceId) {
      return removeCivilReference(selectedCivilReferenceId);
    }
    if (selectedAnnotationForDeleteId) {
      return removeAnnotation(selectedAnnotationForDeleteId);
    }
    return deleteSelectedMachines();
  }, [
    deleteSelectedMachines,
    removeAnnotation,
    removeCivilReference,
    selectedAnnotationForDeleteId,
    selectedCivilReferenceId
  ]);

  const runtimeCommandBindings = useMemo<CoreEditorRuntimeCommandBindings>(() => ({
    [CORE_EDITOR_COMMAND_IDS.undo]: {
      getEnableState: () => canUndo
        ? { enabled: true }
        : { enabled: false, reason: "Nothing to undo." },
      execute: () => {
        undoLayoutChange();
        return createExecutedRuntimeCommandResult();
      }
    },
    [CORE_EDITOR_COMMAND_IDS.redo]: {
      getEnableState: () => canRedo
        ? { enabled: true }
        : { enabled: false, reason: "Nothing to redo." },
      execute: () => {
        redoLayoutChange();
        return createExecutedRuntimeCommandResult();
      }
    },
    [CORE_EDITOR_COMMAND_IDS.deleteSelected]: {
      getEnableState: () => canDeleteSelectedEntities
        ? { enabled: true }
        : { enabled: false, reason: "Select an unlocked deletable object." },
      execute: deleteSelectedEntities
    },
    [CORE_EDITOR_COMMAND_IDS.duplicateSelected]: {
      getEnableState: () => canDuplicateSelectedMachines
        ? { enabled: true }
        : { enabled: false, reason: "Select only machines on unlocked layers." },
      execute: () => {
        duplicateSelectedMachines();
        return createExecutedRuntimeCommandResult();
      }
    }
  }), [
    canDeleteSelectedEntities,
    canDuplicateSelectedMachines,
    canRedo,
    canUndo,
    deleteSelectedEntities,
    duplicateSelectedMachines,
    redoLayoutChange,
    undoLayoutChange
  ]);

  useLayoutEffect(() => {
    runtimeCommandBindingsRef.current = runtimeCommandBindings;
  }, [runtimeCommandBindings]);

  const restoreAutosavedLayout = useCallback(() => {
    if (!recoveryLayout) {
      return;
    }

    importLayout(recoveryLayout);
    setHasAcceptedWorkingLayout(true);
    setRecoveryLayout(null);
    setAutosaveReady(true);
  }, [importLayout, recoveryLayout]);

  const dismissAutosavedLayout = useCallback(() => {
    window.localStorage.removeItem(AUTOSAVE_KEY);
    setRecoveryLayout(null);
    setAutosaveReady(true);
  }, []);

  const exportCommercialBom = useCallback(async () => {
    const { serializeCommercialOutputXlsx } = await import("./commercialOutputs/xlsxSerializer");
    const bytes = serializeCommercialOutputXlsx(commercialOutputSnapshot);
    downloadCommercialOutput(
      bytes,
      createCommercialOutputFileName(commercialOutputSnapshot.metadata, "bom"),
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
  }, [commercialOutputSnapshot]);

  const exportCommercialPlan = useCallback(async () => {
    const { serializeLayoutPlanPdf } = await import("./commercialOutputs/pdfSerializer");
    const bytes = await serializeLayoutPlanPdf(createLayoutPlanModel(commercialOutputSnapshot));
    downloadCommercialOutput(
      bytes,
      createCommercialOutputFileName(commercialOutputSnapshot.metadata, "plan"),
      "application/pdf"
    );
  }, [commercialOutputSnapshot]);

  const exportCommercialSnapshot = useCallback(async () => {
    const dataUrl = await sceneRef.current?.capturePresentationSnapshot();
    if (!dataUrl) {
      throw new Error("The 3D scene is not ready for presentation capture.");
    }
    const bytes = dataUrlToBytes(dataUrl);
    const dimensions = getPngDimensions(bytes);
    if (!dimensions || dimensions.width !== 1920 || dimensions.height !== 1080 || bytes.byteLength <= 24) {
      throw new Error("The 3D presentation snapshot did not produce a valid 1920 x 1080 PNG.");
    }
    downloadCommercialOutput(
      bytes,
      createCommercialOutputFileName(commercialOutputSnapshot.metadata, "snapshot"),
      "image/png"
    );
  }, [commercialOutputSnapshot]);

  const projectRuntimeCommandBindings = useMemo<RuntimeFeatureCommandBindings>(() =>
    createProjectRuntimeCommandBindings({
      projects,
      currentProjectId,
      currentLayoutId,
      currentSnapshot: createLayoutSnapshot(),
      refreshProjects,
      onRevisionSaved: (projectId, layoutId, revisionId) => {
        setCurrentProjectId(projectId);
        setCurrentLayoutId(layoutId);
        setCurrentRevisionId(revisionId);
        setHasAcceptedWorkingLayout(true);
        setHasUnsavedProjectChanges(false);
      },
      prompt: (message, defaultValue) => window.prompt(message, defaultValue)
    }), [
      createLayoutSnapshot,
      currentLayoutId,
      currentProjectId,
      projects,
      refreshProjects
    ]);

  const selectedRenameEntity = runtimeSelection.ids.length === 1 && runtimeSelection.primaryId
    ? platformEntities.find((entity) => entity.id === runtimeSelection.primaryId)
    : undefined;
  const renameEnableState = selectedRenameEntity
    && isRenameableProjectEntityId(selectedRenameEntity.id)
    && !selectedRenameEntity.locked
    ? { enabled: true as const }
    : {
        enabled: false as const,
        reason: selectedRenameEntity?.locked
          ? "Locked entities cannot be renamed."
          : "Select one renameable machine instance, civil reference, or group."
      };

  const commitEntityRename = useCallback((entityId: string, name: string) => {
    const result = renameProjectEntity({
      entityId,
      name,
      machines: placedMachines,
      civilReferences,
      groups,
      lockedEntityIds: new Set(platformEntities.filter((entity) => entity.locked).map((entity) => entity.id))
    });
    if (!result.changed) {
      return false;
    }
    markLayoutChanged();
    setPlacedMachines([...result.machines]);
    setCivilReferences([...result.civilReferences]);
    setGroups([...result.groups]);
    return true;
  }, [civilReferences, groups, markLayoutChanged, placedMachines, platformEntities]);

  const requestSelectedEntityRename = useCallback(() => {
    const entityId = runtimeSelectionRef.current.primaryId;
    if (!entityId || !isRenameableProjectEntityId(entityId)) {
      return false;
    }
    runtimePanelBridge.openPanel(RUNTIME_PANEL_IDS.layoutExplorer);
    setRenameRequest((current) => ({ entityId, version: (current?.version ?? 0) + 1 }));
    return true;
  }, [runtimePanelBridge]);

  const openHelpSection = useCallback((section: HelpSection) => {
    setHelpSection(section);
    return mapPanelOperationToRuntimeCommandResult(runtimePanelBridge.openPanel(RUNTIME_PANEL_IDS.help));
  }, [runtimePanelBridge]);

  const runtimeFeatureCommandBindings = useMemo<RuntimeFeatureCommandBindings>(() => ({
    ...projectRuntimeCommandBindings,
    [RUNTIME_FEATURE_COMMAND_IDS.projectRestorePrompt]: {
      getEnableState: () => recoveryLayout
        ? { enabled: true }
        : { enabled: false, reason: "No autosaved layout is available." },
      execute: () => {
        restoreAutosavedLayout();
        return createExecutedRuntimeFeatureCommandResult();
      }
    },
    [RUNTIME_FEATURE_COMMAND_IDS.projectManager]: {
      getEnableState: () => ({ enabled: true }),
      execute: (context) => {
        setProjectManagerEntryIntent(getProjectManagerEntryIntent(context.payload));
        return mapPanelOperationToRuntimeCommandResult(
          runtimePanelBridge.openPanel(RUNTIME_PANEL_IDS.projectManager)
        );
      }
    },
    [RUNTIME_FEATURE_COMMAND_IDS.layoutControls]: {
      getEnableState: () => ({ enabled: true }),
      execute: () => mapPanelOperationToRuntimeCommandResult(
        runtimePanelBridge.openPanel(RUNTIME_PANEL_IDS.layoutControls)
      )
    },
    [RUNTIME_FEATURE_COMMAND_IDS.commercialOutputs]: {
      getEnableState: () => ({ enabled: true }),
      execute: () => mapPanelOperationToRuntimeCommandResult(
        runtimePanelBridge.openPanel(RUNTIME_PANEL_IDS.commercialOutputs)
      )
    },
    [RUNTIME_FEATURE_COMMAND_IDS.exportBomExcel]: {
      getEnableState: () => commercialOutputSnapshot.equipmentCount > 0
        ? { enabled: true }
        : { enabled: false, reason: "Add equipment before exporting a BOM." },
      execute: async () => {
        await exportCommercialBom();
        return createExecutedRuntimeFeatureCommandResult();
      }
    },
    [RUNTIME_FEATURE_COMMAND_IDS.exportLayoutPdf]: {
      getEnableState: () => commercialOutputSnapshot.extents
        ? { enabled: true }
        : { enabled: false, reason: "Add visible layout geometry before exporting a plan." },
      execute: async () => {
        await exportCommercialPlan();
        return createExecutedRuntimeFeatureCommandResult();
      }
    },
    [RUNTIME_FEATURE_COMMAND_IDS.exportScenePng]: {
      getEnableState: () => commercialOutputSnapshot.planFootprints.some((footprint) => footprint.visible)
        ? { enabled: true }
        : { enabled: false, reason: "Add visible scene content before exporting a snapshot." },
      execute: async () => {
        await exportCommercialSnapshot();
        return createExecutedRuntimeFeatureCommandResult();
      }
    },
    [RUNTIME_FEATURE_COMMAND_IDS.displayOverlayControls]: {
      getEnableState: () => ({ enabled: true }),
      execute: () => mapPanelOperationToRuntimeCommandResult(
        runtimePanelBridge.openPanel(RUNTIME_PANEL_IDS.displayOverlayControls)
      )
    },
    [RUNTIME_FEATURE_COMMAND_IDS.toggleLabels]: {
      getEnableState: () => ({ enabled: true }),
      execute: (context) => {
        if (isOverlaySettings(context.payload)) {
          setOverlaySettings(context.payload);
          return createExecutedRuntimeFeatureCommandResult();
        }
        setOverlaySettings((current) => ({ ...current, showLabels: !current.showLabels }));
        return createExecutedRuntimeFeatureCommandResult();
      }
    },
    [RUNTIME_FEATURE_COMMAND_IDS.viewpoints]: {
      getEnableState: () => ({ enabled: true }),
      execute: () => {
        return mapPanelOperationToRuntimeCommandResult(
          runtimePanelBridge.togglePanel(RUNTIME_PANEL_IDS.viewpoints)
        );
      }
    },
    [RUNTIME_FEATURE_COMMAND_IDS.toggleConnectionPoints]: {
      getEnableState: () => ({ enabled: true }),
      execute: (context) => {
        if (isOverlaySettings(context.payload)) {
          setOverlaySettings(context.payload);
          return createExecutedRuntimeFeatureCommandResult();
        }
        setOverlaySettings((current) => ({
          ...current,
          showConnectionPoints: !current.showConnectionPoints
        }));
        return createExecutedRuntimeFeatureCommandResult();
      }
    },
    [RUNTIME_FEATURE_COMMAND_IDS.showMeasurements]: {
      getEnableState: () => measurementHelpersAvailable
        ? { enabled: true }
        : { enabled: false, reason: measurementHelpersReason },
      execute: (context) => {
        const nextSettings = isPlacementSettings(context.payload)
          ? context.payload
          : {
              ...placementSettingsRef.current,
              showMeasurementHelpers: !placementSettingsRef.current.showMeasurementHelpers
            };
        setPlacementSettings(nextSettings);
        if (nextSettings.showMeasurementHelpers) {
          runtimePanelBridge.openPanel(RUNTIME_PANEL_IDS.precisionPlacement);
        }
        return createExecutedRuntimeFeatureCommandResult();
      }
    },
    [RUNTIME_FEATURE_COMMAND_IDS.renameSelected]: {
      getEnableState: () => renameEnableState,
      execute: (context) => {
        if (isRecord(context.payload)) {
          const entityId = typeof context.payload.entityId === "string" ? context.payload.entityId : "";
          const name = typeof context.payload.name === "string" ? context.payload.name : "";
          if (entityId !== runtimeSelectionRef.current.primaryId || !commitEntityRename(entityId, name)) {
            return {
              handled: false,
              status: "disabled",
              reason: "Rename was not applied to the current selected entity."
            };
          }
          return createExecutedRuntimeFeatureCommandResult();
        }
        return requestSelectedEntityRename()
          ? createExecutedRuntimeFeatureCommandResult()
          : {
              handled: false,
              status: "disabled",
              reason: "Select one renameable entity."
            };
      }
    },
    [RUNTIME_FEATURE_COMMAND_IDS.addMachine]: {
      getEnableState: (context) => isMachineLibrarySelection(context.payload)
        ? { enabled: true }
        : { enabled: false, reason: "Choose a machine definition from the library." },
      execute: (context) => {
        if (!isMachineLibrarySelection(context.payload)) {
          throw new Error("Machine library command requires a machine definition.");
        }
        addMachine(context.payload);
        return createExecutedRuntimeFeatureCommandResult();
      }
    },
    [RUNTIME_FEATURE_COMMAND_IDS.importAsset]: {
      getEnableState: () => ({ enabled: true }),
      execute: () => {
        if (!closeMachineLibraryManagers()) return { handled: false, status: "cancelled", reason: "Library editor remains open." };
        setIsAssetImportOpen(true);
        return createExecutedRuntimeFeatureCommandResult();
      }
    },
    [RUNTIME_FEATURE_COMMAND_IDS.createCustomVariant]: {
      getEnableState: (context) => ({ enabled: isMachineLibrarySelection(context.payload), reason: "Choose a Library asset." }),
      execute: async (context) => {
        if (!isMachineLibrarySelection(context.payload)) return { handled: false, status: "disabled", reason: "Choose a Library asset." };
        const definition = context.payload.definition;
        await customAssets.createVariant({ ...definition, type: definition.machineType ?? definition.category });
        return createExecutedRuntimeFeatureCommandResult();
      }
    },
    [RUNTIME_FEATURE_COMMAND_IDS.libraryManager]: {
      getEnableState: () => ({ enabled: true }),
      execute: () => {
        return mapPanelOperationToRuntimeCommandResult(
          runtimePanelBridge.openPanel(RUNTIME_PANEL_IDS.libraryManager)
        );
      }
    },
    [RUNTIME_FEATURE_COMMAND_IDS.taxonomyManager]: {
      getEnableState: () => ({ enabled: true }),
      execute: () => {
        return mapPanelOperationToRuntimeCommandResult(
          runtimePanelBridge.openPanel(RUNTIME_PANEL_IDS.taxonomyManager)
        );
      }
    },
    [RUNTIME_FEATURE_COMMAND_IDS.createAnnotation]: {
      getEnableState: () => ({ enabled: true }),
      execute: (context) => {
        addAnnotation(isAnnotationType(context.payload) ? context.payload : "note");
        return createExecutedRuntimeFeatureCommandResult();
      }
    },
    [RUNTIME_FEATURE_COMMAND_IDS.addFloor]: {
      getEnableState: () => ({ enabled: true }),
      execute: () => {
        addCivilReference("floor-area");
        return createExecutedRuntimeFeatureCommandResult();
      }
    },
    [RUNTIME_FEATURE_COMMAND_IDS.addWall]: {
      getEnableState: () => ({ enabled: true }),
      execute: () => {
        addCivilReference("wall");
        return createExecutedRuntimeFeatureCommandResult();
      }
    },
    [RUNTIME_FEATURE_COMMAND_IDS.addColumn]: {
      getEnableState: () => ({ enabled: true }),
      execute: () => {
        addCivilReference("column");
        return createExecutedRuntimeFeatureCommandResult();
      }
    },
    [RUNTIME_FEATURE_COMMAND_IDS.addWalkway]: {
      getEnableState: () => ({ enabled: true }),
      execute: () => {
        addCivilReference("walkway");
        return createExecutedRuntimeFeatureCommandResult();
      }
    },
    [RUNTIME_FEATURE_COMMAND_IDS.addRestrictedZone]: {
      getEnableState: () => ({ enabled: true }),
      execute: () => {
        addCivilReference("restricted-area");
        return createExecutedRuntimeFeatureCommandResult();
      }
    },
    [RUNTIME_FEATURE_COMMAND_IDS.addReferenceZone]: {
      getEnableState: () => ({ enabled: true }),
      execute: () => {
        addCivilReference("reference-zone");
        return createExecutedRuntimeFeatureCommandResult();
      }
    },
    [RUNTIME_FEATURE_COMMAND_IDS.alignSelection]: {
      getEnableState: () => selectedAlignableEntityIds.length >= 2
        && runtimeSelectionMovementEvaluation.allowed
        ? { enabled: true }
        : { enabled: false, reason: "Select at least two unlocked alignable entities." },
      execute: (context) => {
        if (!isRecord(context.payload) || typeof context.payload.kind !== "string") {
          throw new Error("Alignment command requires an action payload.");
        }
        const payload = context.payload as RuntimeAlignmentPayload;
        if (payload.kind === "align") {
          applyAlignmentAction(payload.action);
        } else if (payload.kind === "distribute") {
          applyDistributionAction(payload.action);
        } else if (payload.kind === "equal-gap") {
          applyEqualGapAction(payload.action);
        } else if (payload.kind === "pair") {
          applyPairAlignmentAction(payload.action, payload.gapMm);
        } else {
          applyPairAnchorSnap(payload.primaryAnchor, payload.secondaryAnchor);
        }
        return createExecutedRuntimeFeatureCommandResult();
      }
    },
    ...createArrangeRuntimeCommandBindings({
      selectedCount: selectedAlignableEntityIds.length,
      movementAllowed: runtimeSelectionMovementEvaluation.allowed,
      align: applyAlignmentAction,
      distribute: applyDistributionAction,
      equalGap: applyEqualGapAction,
      toggleAlignmentTools: () => mapPanelOperationToRuntimeCommandResult(
        runtimePanelBridge.togglePanel(RUNTIME_PANEL_IDS.alignmentTools)
      )
    }),
    [RUNTIME_FEATURE_COMMAND_IDS.rotationSnap]: {
      getEnableState: () => ({ enabled: true }),
      execute: (context) => {
        if (!isPlacementSettings(context.payload)) {
          throw new Error("Rotation snap command requires placement settings.");
        }
        setPlacementSettings(context.payload);
        return createExecutedRuntimeFeatureCommandResult();
      }
    },
    [RUNTIME_FEATURE_COMMAND_IDS.connectionPointSnap]: {
      getEnableState: () => connectionPointSnapContext.available
        ? { enabled: true }
        : { enabled: false, reason: connectionPointSnapReason },
      execute: (context) => {
        if (!isRecord(context.payload)) {
          throw new Error("Connection point snap command requires a snap payload.");
        }
        const payload = context.payload as RuntimeConnectionSnapPayload;
        applyConnectionSnap(payload.selection, payload.movingPoint, payload.fixedPoint);
        return createExecutedRuntimeFeatureCommandResult();
      }
    },
    [RUNTIME_FEATURE_COMMAND_IDS.collisionCheck]: {
      getEnableState: () => ({ enabled: true }),
      execute: () => {
        return mapPanelOperationToRuntimeCommandResult(
          runtimePanelBridge.openPanel(RUNTIME_PANEL_IDS.collisionCheck)
        );
      }
    },
    [RUNTIME_FEATURE_COMMAND_IDS.performanceBenchmark]: {
      getEnableState: () => ({ enabled: true }),
      execute: () => {
        return mapPanelOperationToRuntimeCommandResult(
          runtimePanelBridge.openPanel(RUNTIME_PANEL_IDS.performanceBenchmark)
        );
      }
    },
    [RUNTIME_FEATURE_COMMAND_IDS.simulationControls]: {
      getEnableState: () => ({ enabled: true }),
      execute: () => mapPanelOperationToRuntimeCommandResult(
        runtimePanelBridge.openPanel(RUNTIME_PANEL_IDS.simulationControls)
      )
    },
    [RUNTIME_FEATURE_COMMAND_IDS.helpQuickStart]: {
      getEnableState: () => ({ enabled: true }),
      execute: () => openHelpSection("quick-start")
    },
    [RUNTIME_FEATURE_COMMAND_IDS.helpKeyboardShortcuts]: {
      getEnableState: () => ({ enabled: true }),
      execute: () => openHelpSection("shortcuts")
    },
    [RUNTIME_FEATURE_COMMAND_IDS.helpAbout]: {
      getEnableState: () => ({ enabled: true }),
      execute: () => openHelpSection("about")
    }
  }), [
    addAnnotation,
    addCivilReference,
    addMachine,
    applyAlignmentAction,
    applyConnectionSnap,
    applyDistributionAction,
    applyEqualGapAction,
    applyPairAlignmentAction,
    applyPairAnchorSnap,
    commitEntityRename,
    closeMachineLibraryManagers,
    connectionPointSnapContext.available,
    connectionPointSnapReason,
    commercialOutputSnapshot,
    exportCommercialBom,
    exportCommercialPlan,
    exportCommercialSnapshot,
    projectRuntimeCommandBindings,
    openHelpSection,
    renameEnableState,
    measurementHelpersAvailable,
    measurementHelpersReason,
    requestSelectedEntityRename,
    recoveryLayout,
    restoreAutosavedLayout,
    runtimePanelBridge,
    runtimeSelectionMovementEvaluation.allowed,
    selectedAlignableEntityIds.length
  ]);

  useLayoutEffect(() => {
    runtimeFeatureCommandBindingsRef.current = runtimeFeatureCommandBindings;
  }, [runtimeFeatureCommandBindings]);

  const assemblyCommandBindings = useMemo<AssemblyRuntimeCommandBindings>(() => ({
    [ASSEMBLY_COMMAND_IDS.createGroup]: {
      getEnableState: () => explicitSelectedAlignableEntityIds.length >= 1
        ? { enabled: true }
        : { enabled: false, reason: "Select at least one ungrouped entity." },
      execute: (context) => {
        const requestedName = isRecord(context.payload) && typeof context.payload.name === "string"
          ? context.payload.name
          : `Assembly ${groups.length + 1}`;
        createGroupFromSelection(requestedName);
        return createExecutedRuntimeCommandResult();
      }
    },
    [ASSEMBLY_COMMAND_IDS.addSelected]: {
      getEnableState: (context) => {
        const groupId = getAssemblyCommandGroupId(context.primarySelectionId);
        return groupId && explicitSelectedAlignableEntityIds.length > 0
          ? { enabled: true }
          : { enabled: false, reason: "Select an assembly and eligible entities." };
      },
      execute: (context) => {
        const groupId = getAssemblyCommandGroupId(context.primarySelectionId);
        if (!groupId) {
          throw new Error("Add Selected command requires an assembly.");
        }
        addSelectionToGroup(groupId);
        return createExecutedRuntimeCommandResult();
      }
    },
    [ASSEMBLY_COMMAND_IDS.removeSelected]: {
      getEnableState: (context) => {
        const groupId = getAssemblyCommandGroupId(context.primarySelectionId);
        return groupId && removableActiveGroupEntityIds.length > 0
          ? { enabled: true }
          : { enabled: false, reason: "Select assembly members to remove." };
      },
      execute: (context) => {
        const groupId = getAssemblyCommandGroupId(context.primarySelectionId);
        if (!groupId) {
          throw new Error("Remove Selected command requires an assembly.");
        }
        removeSelectionFromGroup(groupId);
        return createExecutedRuntimeCommandResult();
      }
    },
    [ASSEMBLY_COMMAND_IDS.enterEdit]: {
      getEnableState: (context) => {
        const groupId = getAssemblyCommandGroupId(context.primarySelectionId);
        return groupId && groupId !== activeGroupEditId && groups.some((group) => group.id === groupId)
          ? { enabled: true }
          : { enabled: false, reason: "Select an assembly that is not already in edit mode." };
      },
      execute: (context) => {
        enterGroupEditMode(context.primarySelectionId);
        return createExecutedRuntimeCommandResult();
      }
    },
    [ASSEMBLY_COMMAND_IDS.exitEdit]: {
      getEnableState: () => activeGroupEditId
        ? { enabled: true }
        : { enabled: false, reason: "No assembly is in edit mode." },
      execute: () => {
        exitGroupEditMode();
        return createExecutedRuntimeCommandResult();
      }
    },
    [ASSEMBLY_COMMAND_IDS.ungroup]: {
      getEnableState: (context) => {
        const groupId = getAssemblyCommandGroupId(context.primarySelectionId);
        return groupId && groups.some((group) => group.id === groupId)
          ? { enabled: true }
          : { enabled: false, reason: "Select an assembly to ungroup." };
      },
      execute: (context) => ungroupAssembly(context.primarySelectionId)
    }
  }), [
    activeGroupEditId,
    addSelectionToGroup,
    createGroupFromSelection,
    enterGroupEditMode,
    explicitSelectedAlignableEntityIds.length,
    exitGroupEditMode,
    getAssemblyCommandGroupId,
    groups,
    removableActiveGroupEntityIds.length,
    removeSelectionFromGroup,
    ungroupAssembly
  ]);

  useLayoutEffect(() => {
    assemblyCommandBindingsRef.current = assemblyCommandBindings;
  }, [assemblyCommandBindings]);

  const recordRuntimeCommandExecution = useCallback((
    commandId: string,
    result: RuntimeCommandOperationResult
  ) => {
    if (!enableE2EDiagnostics) {
      return;
    }
    const current = runtimeCommandExecutionProbesRef.current.get(commandId);
    runtimeCommandExecutionProbesRef.current.set(
      commandId,
      createNextRuntimeCommandExecutionProbe(commandId, current, result)
    );
  }, [enableE2EDiagnostics]);

  const getRuntimeFeatureCommandEvidence = useCallback((
    commandId: string
  ): RuntimeCommandAccessEvidence => {
    const context = {
      selectionIds: runtimeSelectionRef.current.ids,
      primarySelectionId: runtimeSelectionRef.current.primaryId,
      hasUnsavedChanges: hasUnsavedProjectChanges
    };

    if (coreEditorRuntimeCommandIds.has(commandId)) {
      const registered = Boolean(runtimeCommandBridge.registry.get(commandId));
      const binding = runtimeCommandBindingsRef.current[commandId as CoreEditorCommandId];
      const enableState = binding?.getEnableState(context);
      return {
        commandId,
        registered,
        bound: Boolean(binding),
        reachable: registered && Boolean(binding),
        currentlyAvailable: enableState?.enabled ?? false,
        ...(!registered
          ? { reason: `Runtime command "${commandId}" is unknown.` }
          : !binding
            ? { reason: `Runtime command "${commandId}" is not live-bound.` }
            : enableState?.reason
              ? { reason: enableState.reason }
              : {})
      };
    }

    if (assemblyRuntimeCommandIds.has(commandId)) {
      const registered = Boolean(assemblyCommandBridge.registry.get(commandId));
      const binding = assemblyCommandBindingsRef.current[commandId as AssemblyCommandId];
      const enableState = binding?.getEnableState(context);
      return {
        commandId,
        registered,
        bound: Boolean(binding),
        reachable: registered && Boolean(binding),
        currentlyAvailable: enableState?.enabled ?? false,
        ...(!registered
          ? { reason: `Runtime command "${commandId}" is unknown.` }
          : !binding
            ? { reason: `Runtime command "${commandId}" is not live-bound.` }
            : enableState?.reason
              ? { reason: enableState.reason }
              : {})
      };
    }

    if (featureRuntimeCommandIds.has(commandId)) {
      const evidence: RuntimeCommandReachability =
        runtimeFeatureCommandBridge.getRuntimeCommand(commandId, context);
      return evidence;
    }

    const registeredSeed = getPlatformCommandSeedById(commandId);
    return {
      commandId,
      registered: Boolean(registeredSeed),
      bound: false,
      reachable: false,
      currentlyAvailable: false,
      reason: registeredSeed
        ? `Runtime command "${commandId}" is declared but has no live binding.`
        : `Runtime command "${commandId}" is unknown.`
    };
  }, [
    assemblyCommandBridge,
    hasUnsavedProjectChanges,
    runtimeCommandBridge,
    runtimeFeatureCommandBridge
  ]);

  const getRuntimeFeaturePanelEvidence = useCallback((
    panelId: string
  ): RuntimePanelAccessEvidence | undefined => {
    const panel = runtimePanelBridge.getRuntimePanel(panelId);
    if (!panel) {
      return undefined;
    }
    return {
      panelId,
      registered: panel.registered,
      bound: panel.bound,
      visible: panel.visible,
      open: panel.open,
      available: panel.available,
      capabilities: panel.capabilities,
      ...(panel.reason ? { reason: panel.reason } : {})
    };
  }, [runtimePanelBridge]);

  const createCurrentRuntimeFeatureAccessEvidence = useCallback((
    externalEvidence?: RuntimeFeatureAccessExternalEvidence
  ): RuntimeFeatureAccessEvidence => {
    const viewport = runtimeViewportBridge.getRuntimeViewport(RUNTIME_VIEWPORT_IDS.main);
    const viewportEvidence: RuntimeViewportAccessEvidence = viewport
      ? {
          viewportId: viewport.viewportId,
          registered: viewport.registered,
          bound: viewport.bound,
          available: viewport.available,
          visible: viewport.visible,
          cssWidth: viewport.cssWidth,
          cssHeight: viewport.cssHeight,
          cameraResolvable: viewport.cameraResolvable,
          resizeSupported: viewport.bound,
          sceneLifecycleGeneration: viewport.sceneLifecycleGeneration,
          resizeGeneration: viewport.resizeGeneration,
          ...(viewport.reason ? { reason: viewport.reason } : {})
        }
      : {
          viewportId: RUNTIME_VIEWPORT_IDS.main,
          registered: false,
          bound: false,
          available: false,
          visible: false,
          cssWidth: 0,
          cssHeight: 0,
          cameraResolvable: false,
          resizeSupported: false,
          sceneLifecycleGeneration: 0,
          resizeGeneration: 0,
          reason: `Runtime viewport "${RUNTIME_VIEWPORT_IDS.main}" is unknown.`
        };

    return {
      getCommand: getRuntimeFeatureCommandEvidence,
      getPanel: getRuntimeFeaturePanelEvidence,
      selection: createRuntimeSelectionAccessEvidence({
        selection: runtimeSelectionRef.current,
        entities: platformEntitiesRef.current,
        activeGroupEditId: activeGroupEditIdRef.current,
        capabilities: RUNTIME_SELECTION_AUTHORITY_CAPABILITIES
      }),
      entities: createRuntimeEntityAccessEvidence({
        entities: platformEntitiesRef.current,
        authority: RUNTIME_ENTITY_AUTHORITY_CAPABILITIES
      }),
      viewport: viewportEvidence,
      ...(externalEvidence?.quality ? { quality: externalEvidence.quality } : {}),
      ...(runtimeSurfaceExecutionAuthority
        ? { surfaceExecution: runtimeSurfaceExecutionAuthority.getEvidenceSnapshot() }
        : {})
    };
  }, [
    getRuntimeFeatureCommandEvidence,
    getRuntimeFeaturePanelEvidence,
    runtimeSurfaceExecutionAuthority,
    runtimeViewportBridge
  ]);

  const createCurrentRuntimeFeatureAccessReport = useCallback((
    externalEvidence?: RuntimeFeatureAccessExternalEvidence
  ) => createRuntimeFeatureAccessReport({
    features: platformFeatureAccessMatrix,
    surfaces: currentPlatformSurfaceInventory,
    evidence: createCurrentRuntimeFeatureAccessEvidence(externalEvidence),
    ...(runtimeFeatureAccessDiagnosticsSessionId
      ? { runtimeSessionId: runtimeFeatureAccessDiagnosticsSessionId }
      : {})
  }), [
    createCurrentRuntimeFeatureAccessEvidence,
    runtimeFeatureAccessDiagnosticsSessionId
  ]);

  useEffect(() => () => {
    runtimeSurfaceExecutionAuthority?.reset();
  }, [runtimeSurfaceExecutionAuthority]);

  useEffect(() => {
    const diagnosticsSessionId = runtimeFeatureAccessDiagnosticsSessionId;
    if (
      !enableE2EDiagnostics
      || !diagnosticsSessionId
      || !runtimeSurfaceExecutionAuthority
    ) {
      return;
    }

    const diagnosticsBridge: RuntimeFeatureAccessE2EBridge = {
      getReport: () => createCurrentRuntimeFeatureAccessReport(),
      getFeature: (featureId) =>
        createCurrentRuntimeFeatureAccessReport().features.find(
          (feature) => feature.featureId === featureId
        ),
      getGate: (externalEvidence) => createRuntimeFeatureAccessGate({
        features: platformFeatureAccessMatrix,
        surfaces: currentPlatformSurfaceInventory,
        evidence: createCurrentRuntimeFeatureAccessEvidence(externalEvidence),
        runtimeSessionId: diagnosticsSessionId
      }),
      listBlockedRequired: () =>
        createCurrentRuntimeFeatureAccessReport().requiredRuntimeFeatures.filter(
          (feature) => feature.status === "blocked"
        ),
      listPlanned: () => createCurrentRuntimeFeatureAccessReport().plannedFeatures,
      getCommandExecution: (commandId) =>
        runtimeCommandExecutionProbesRef.current.get(commandId)
        ?? { commandId, attemptCount: 0, executedCount: 0 },
      listCommandExecutions: () =>
        [...runtimeCommandExecutionProbesRef.current.values()]
          .sort((left, right) => left.commandId.localeCompare(right.commandId)),
      getDiagnosticsSessionId: () => diagnosticsSessionId,
      getRequiredSurfaceExecutionCommandIds: () =>
        runtimeSurfaceExecutionAuthority.requiredCommandIds,
      beginSurfaceExecutionObservation: (commandId) =>
        runtimeSurfaceExecutionAuthority.beginObservation(commandId),
      completeSurfaceExecutionObservation: (token) =>
        runtimeSurfaceExecutionAuthority.completeObservation(token),
      getSurfaceExecutionEvidence: () =>
        runtimeSurfaceExecutionAuthority.getEvidenceSnapshot()
    };
    window.__atrvisuRuntimeFeatureAccess = diagnosticsBridge;

    return () => {
      if (window.__atrvisuRuntimeFeatureAccess === diagnosticsBridge) {
        delete window.__atrvisuRuntimeFeatureAccess;
      }
    };
  }, [
    createCurrentRuntimeFeatureAccessEvidence,
    createCurrentRuntimeFeatureAccessReport,
    enableE2EDiagnostics,
    runtimeFeatureAccessDiagnosticsSessionId,
    runtimeSurfaceExecutionAuthority
  ]);

  const executeAssemblyCommand = useCallback((
    commandId: AssemblyCommandId,
    groupId?: string,
    payload?: unknown
  ) => {
    const groupEntityId = groupId ? createLegacyPlatformEntityId("group", groupId) : undefined;
    const result = assemblyCommandBridge.executeCommand(commandId, {
      selectionIds: groupEntityId ? [groupEntityId] : runtimeSelectionRef.current.ids,
      primarySelectionId: groupEntityId ?? runtimeSelectionRef.current.primaryId,
      hasUnsavedChanges: hasUnsavedProjectChanges,
      payload
    });
    recordRuntimeCommandExecution(commandId, result);
    return result.handled;
  }, [assemblyCommandBridge, hasUnsavedProjectChanges, recordRuntimeCommandExecution]);

  const coreEditorCommandContext = useMemo(() => ({
    selectionIds: runtimeSelection.ids,
    primarySelectionId: runtimeSelection.primaryId,
    hasUnsavedChanges: hasUnsavedProjectChanges
  }), [hasUnsavedProjectChanges, runtimeSelection]);

  const canExecuteCoreEditorCommand = useCallback(
    (commandId: CoreEditorCommandId) => runtimeCommandBridge.canExecuteCommand(
      commandId,
      coreEditorCommandContext,
      runtimeCommandBindings
    ),
    [coreEditorCommandContext, runtimeCommandBindings, runtimeCommandBridge]
  );

  const executeCoreEditorCommand = useCallback((commandId: CoreEditorCommandId) => {
    const result = runtimeCommandBridge.executeCommand(commandId, coreEditorCommandContext);
    recordRuntimeCommandExecution(commandId, result);
    return result.handled;
  }, [coreEditorCommandContext, recordRuntimeCommandExecution, runtimeCommandBridge]);

  const executeRuntimeFeatureCommand = useCallback(async (
    commandId: RuntimeFeatureCommandId,
    payload?: unknown
  ): Promise<RuntimeFeatureCommandOperationResult> => {
    try {
      const result = await runtimeFeatureCommandBridge.executeCommand(commandId, {
        selectionIds: runtimeSelectionRef.current.ids,
        primarySelectionId: runtimeSelectionRef.current.primaryId,
        hasUnsavedChanges: hasUnsavedProjectChanges,
        payload
      });
      recordRuntimeCommandExecution(commandId, result);
      return result;
    } catch (error) {
      const result = createFailedRuntimeCommandResult(error);
      recordRuntimeCommandExecution(commandId, result);
      return result;
    }
  }, [
    hasUnsavedProjectChanges,
    recordRuntimeCommandExecution,
    runtimeFeatureCommandBridge
  ]);

  const requestProjectImportFile = useCallback((
    onResult: (result: RuntimeFeatureCommandOperationResult) => void
  ) => {
    if (projectImportAcquisitionPendingRef.current) {
      return false;
    }
    const request = projectImportRequestLifecycleRef.current.begin(onResult);
    const input = projectImportFileInputRef.current;
    if (!input) {
      projectImportRequestLifecycleRef.current.cancel(request.requestId);
      return false;
    }
    projectImportAcquisitionPendingRef.current = true;
    setIsProjectImportAcquisitionPending(true);
    input.value = "";
    input.click();
    return true;
  }, []);

  const handleProjectImportFileChange = useCallback(async (
    event: ChangeEvent<HTMLInputElement>
  ) => {
    const input = event.currentTarget;
    const file = input.files?.[0];
    const currentRequest = projectImportRequestLifecycleRef.current.getCurrent();
    const request = currentRequest
      ? projectImportRequestLifecycleRef.current.capture(currentRequest.requestId)
      : null;
    input.value = "";
    try {
      await executeProjectImportRequest(
        request,
        file,
        (payload: ProjectImportCommandPayload) => executeRuntimeFeatureCommand(
          RUNTIME_FEATURE_COMMAND_IDS.projectImportJson,
          payload
        )
      );
    } finally {
      projectImportAcquisitionPendingRef.current = false;
      setIsProjectImportAcquisitionPending(false);
    }
  }, [executeRuntimeFeatureCommand]);

  const handleProjectImportFileCancel = useCallback(() => {
    const currentRequest = projectImportRequestLifecycleRef.current.getCurrent();
    if (currentRequest) {
      projectImportRequestLifecycleRef.current.cancel(currentRequest.requestId);
    }
    if (projectImportFileInputRef.current) {
      projectImportFileInputRef.current.value = "";
    }
    projectImportAcquisitionPendingRef.current = false;
    setIsProjectImportAcquisitionPending(false);
  }, []);

  useEffect(() => {
    const input = projectImportFileInputRef.current;
    if (!input) {
      return;
    }
    input.addEventListener("cancel", handleProjectImportFileCancel);
    return () => {
      input.removeEventListener("cancel", handleProjectImportFileCancel);
    };
  }, [handleProjectImportFileCancel]);

  const commandSurfaceMetadataRegistry = useMemo(() => ({
    get: (commandId: string) => runtimeCommandBridge.registry.get(commandId)
      ?? runtimeFeatureCommandBridge.registry.get(commandId)
      ?? assemblyCommandBridge.registry.get(commandId),
    list: () => {
      const definitions = [
        ...runtimeCommandBridge.registry.list(),
        ...runtimeFeatureCommandBridge.registry.list(),
        ...assemblyCommandBridge.registry.list()
      ];
      return [...new Map(definitions.map((definition) => [definition.id, definition])).values()];
    }
  }), [assemblyCommandBridge, runtimeCommandBridge, runtimeFeatureCommandBridge]);

  const commandSurfaceCoreBridge = useMemo(() => ({
    registry: runtimeCommandBridge.registry,
    canExecuteCommand: runtimeCommandBridge.canExecuteCommand,
    executeCommand: (commandId: string, context?: CommandContext) => {
      const resolvedContext = context ?? {
      selectionIds: runtimeSelectionRef.current.ids,
      primarySelectionId: runtimeSelectionRef.current.primaryId,
      hasUnsavedChanges: hasUnsavedProjectChangesRef.current
      };
      const result = runtimeCommandBridge.executeCommand(commandId, resolvedContext);
      recordRuntimeCommandExecution(commandId, result);
      return result;
    }
  }), [recordRuntimeCommandExecution, runtimeCommandBridge]);

  const commandSurfaceRuntimeBridge = useMemo(() => ({
    registry: runtimeFeatureCommandBridge.registry,
    getRuntimeCommand: runtimeFeatureCommandBridge.getRuntimeCommand,
    executeCommand: async (commandId: string, context?: CommandContext) => {
      const resolvedContext = context ?? {
      selectionIds: runtimeSelectionRef.current.ids,
      primarySelectionId: runtimeSelectionRef.current.primaryId,
      hasUnsavedChanges: hasUnsavedProjectChangesRef.current
      };
      const result = await runtimeFeatureCommandBridge.executeCommand(commandId, resolvedContext);
      recordRuntimeCommandExecution(commandId, result);
      return result;
    }
  }), [recordRuntimeCommandExecution, runtimeFeatureCommandBridge]);

  const commandSurfaceAssemblyBridge = useMemo(() => ({
    registry: assemblyCommandBridge.registry,
    getRuntimeCommand: (commandId: string, context?: CommandContext) =>
      assemblyCommandBridge.getRuntimeCommand(commandId, context ?? {
        selectionIds: runtimeSelectionRef.current.ids,
        primarySelectionId: runtimeSelectionRef.current.primaryId,
        hasUnsavedChanges: hasUnsavedProjectChangesRef.current
      }),
    executeCommand: (commandId: string, context?: CommandContext) => {
      const resolvedContext = context ?? {
        selectionIds: runtimeSelectionRef.current.ids,
        primarySelectionId: runtimeSelectionRef.current.primaryId,
        hasUnsavedChanges: hasUnsavedProjectChangesRef.current
      };
      const result = assemblyCommandBridge.executeCommand(commandId as AssemblyCommandId, resolvedContext);
      recordRuntimeCommandExecution(commandId, result);
      return result;
    }
  }), [assemblyCommandBridge, recordRuntimeCommandExecution]);

  const getCommandSurfaceContext = useCallback(() => ({
    selectionIds: runtimeSelectionRef.current.ids,
    primarySelectionId: runtimeSelectionRef.current.primaryId,
    hasUnsavedChanges: hasUnsavedProjectChangesRef.current
  }), []);

  const getCommandSurfacePressedState = useCallback((commandId: string) => {
    if (commandId === RUNTIME_FEATURE_COMMAND_IDS.toggleLabels) {
      return overlaySettingsRef.current.showLabels;
    }
    if (commandId === RUNTIME_FEATURE_COMMAND_IDS.showMeasurements) {
      return placementSettingsRef.current.showMeasurementHelpers;
    }
    if (commandId === RUNTIME_FEATURE_COMMAND_IDS.toggleConnectionPoints) {
      return overlaySettingsRef.current.showConnectionPoints;
    }
    if (commandId === RUNTIME_FEATURE_COMMAND_IDS.viewpoints) {
      const state = runtimePanelStateRef.current;
      return !state.isPrimaryDockCollapsed
        && state.activePrimaryPanelId === RUNTIME_PANEL_IDS.viewpoints;
    }
    if (commandId === RUNTIME_FEATURE_COMMAND_IDS.alignmentTools) {
      return runtimePanelStateRef.current.isAdvancedAlignmentOpen;
    }
    return undefined;
  }, []);

  const commandSurfaceAdapter = useMemo(() => createCommandSurfaceAdapter({
    metadataRegistry: commandSurfaceMetadataRegistry,
    coreBridge: commandSurfaceCoreBridge,
    runtimeBridge: commandSurfaceRuntimeBridge,
    assemblyBridge: commandSurfaceAssemblyBridge,
    getContext: getCommandSurfaceContext,
    getPressed: getCommandSurfacePressedState,
    importRequest: {
      request: requestProjectImportFile,
      isPending: () => projectImportAcquisitionPendingRef.current
    }
  }), [
    commandSurfaceCoreBridge,
    commandSurfaceAssemblyBridge,
    commandSurfaceMetadataRegistry,
    commandSurfaceRuntimeBridge,
    getCommandSurfaceContext,
    getCommandSurfacePressedState,
    requestProjectImportFile
  ]);

  useSyncExternalStore(
    commandSurfaceAdapter.subscribe,
    commandSurfaceAdapter.getRevision,
    commandSurfaceAdapter.getRevision
  );

  const commandSurfaceMenus = commandSurfaceAdapter.getMenus();
  const commandBarItems = commandSurfaceAdapter.getCommandBarItems();
  const commandPaletteItems = commandSurfaceAdapter.getCommandPaletteItems();
  const executeCommandSurfaceItem = useCallback((commandId: string) => {
    void commandSurfaceAdapter.execute(commandId);
  }, [commandSurfaceAdapter]);

  useEffect(() => {
    if (!enableE2EDiagnostics) {
      return;
    }

    const diagnosticsBridge: ProjectRuntimeCommandE2EBridge = {
      execute: (commandId, payload) => {
        if (!PROJECT_RUNTIME_COMMAND_IDS.includes(commandId)) {
          return Promise.resolve(createUnavailableRuntimeCommandResult(
            `Project runtime command "${commandId}" is unsupported.`
          ));
        }
        return executeRuntimeFeatureCommand(commandId, payload);
      },
      getActiveContext: () => ({
        projectId: currentProjectId,
        layoutId: currentLayoutId,
        revisionId: currentRevisionId,
        hasUnsavedChanges: hasUnsavedProjectChanges
      })
    };
    window.__atrvisuProjectCommands = diagnosticsBridge;

    return () => {
      if (window.__atrvisuProjectCommands === diagnosticsBridge) {
        delete window.__atrvisuProjectCommands;
      }
    };
  }, [
    currentLayoutId,
    currentProjectId,
    currentRevisionId,
    enableE2EDiagnostics,
    executeRuntimeFeatureCommand,
    hasUnsavedProjectChanges
  ]);

  const canExecuteUndoCommand = canExecuteCoreEditorCommand(CORE_EDITOR_COMMAND_IDS.undo).enabled;
  const canExecuteRedoCommand = canExecuteCoreEditorCommand(CORE_EDITOR_COMMAND_IDS.redo).enabled;
  const canExecuteDuplicateSelectedCommand = canExecuteCoreEditorCommand(
    CORE_EDITOR_COMMAND_IDS.duplicateSelected
  ).enabled;

  const executeUndoCommand = useMemo(
    () => createCoreEditorCommandAction(CORE_EDITOR_COMMAND_IDS.undo, executeCoreEditorCommand),
    [executeCoreEditorCommand]
  );
  const executeRedoCommand = useMemo(
    () => createCoreEditorCommandAction(CORE_EDITOR_COMMAND_IDS.redo, executeCoreEditorCommand),
    [executeCoreEditorCommand]
  );
  const executeDeleteSelectedCommand = useMemo(
    () => createCoreEditorCommandAction(CORE_EDITOR_COMMAND_IDS.deleteSelected, executeCoreEditorCommand),
    [executeCoreEditorCommand]
  );
  const executeDuplicateSelectedCommand = useMemo(
    () => createCoreEditorCommandAction(CORE_EDITOR_COMMAND_IDS.duplicateSelected, executeCoreEditorCommand),
    [executeCoreEditorCommand]
  );

  useEffect(() => {
    try {
      const rawLayout = window.localStorage.getItem(AUTOSAVE_KEY);
      if (!rawLayout) {
        setAutosaveReady(true);
        return;
      }

      const parsedLayout = JSON.parse(rawLayout) as AtrVisuLayout;
      if (
        parsedLayout.appName === "AtrVisu" &&
        parsedLayout.version === 1 &&
        (parsedLayout.objects.length > 0 ||
          (parsedLayout.civilReferences?.length ?? 0) > 0 ||
          (parsedLayout.annotations?.length ?? 0) > 0 ||
          (parsedLayout.viewpoints?.length ?? 0) > 0 ||
          (parsedLayout.layers?.length ?? 0) > 0 ||
          (parsedLayout.groups?.length ?? 0) > 0)
      ) {
        setRecoveryLayout(parsedLayout);
        return;
      }

      window.localStorage.removeItem(AUTOSAVE_KEY);
      setAutosaveReady(true);
    } catch {
      window.localStorage.removeItem(AUTOSAVE_KEY);
      setAutosaveReady(true);
    }
  }, []);

  useEffect(() => {
    if (!autosaveReady) {
      return;
    }
    if (isBenchmarkMode) {
      return;
    }

    const autosaveId = window.setTimeout(() => {
      try {
        if (
          placedMachines.length === 0 &&
          civilReferences.length === 0 &&
          annotations.length === 0 &&
          viewpoints.length === 0 &&
          layers.length <= 1 &&
          groups.length === 0
        ) {
          window.localStorage.removeItem(AUTOSAVE_KEY);
          return;
        }

        window.localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(createLayoutSnapshot()));
      } catch {
        // Autosave is best-effort; explicit export remains available.
      }
    }, AUTOSAVE_DELAY_MS);

    return () => {
      window.clearTimeout(autosaveId);
    };
  }, [annotations.length, autosaveReady, civilReferences.length, createLayoutSnapshot, groups.length, isBenchmarkMode, layers.length, placedMachines.length, viewpoints.length]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLocaleLowerCase() === "k") {
        const target = event.target as HTMLElement | null;
        if (!target?.closest("input, textarea, select, [contenteditable='true']")
          && document.querySelector('[role="dialog"][aria-modal="true"]') === null) {
          event.preventDefault();
          setIsCommandPaletteOpen(true);
        }
        return;
      }
      if (event.key === "Escape" && isConnectionPointSnapOpen) {
        event.preventDefault();
        runtimePanelBridge.closePanel(RUNTIME_PANEL_IDS.connectionPointSnap);
        return;
      }
      const action = resolveEditorShortcut({
        key: event.key,
        target: event.target,
        ctrlKey: event.ctrlKey,
        metaKey: event.metaKey,
        shiftKey: event.shiftKey,
        altKey: event.altKey,
        repeat: event.repeat,
        modalOpen: document.querySelector('[role="dialog"][aria-modal="true"], dialog[open]') !== null
      });
      if (!action) {
        return;
      }

      const commandId = getEditorCommandIdForShortcutAction(action);
      if (commandId) {
        const handled = executeCoreEditorCommand(commandId);
        if (shouldPreventEditorShortcutDefault(action, handled)) {
          event.preventDefault();
        }
        return;
      }

      if (action === "rename-selected") {
        const context = {
          selectionIds: runtimeSelectionRef.current.ids,
          primarySelectionId: runtimeSelectionRef.current.primaryId,
          hasUnsavedChanges: hasUnsavedProjectChangesRef.current
        };
        if (runtimeFeatureCommandBridge.getRuntimeCommand(
          RUNTIME_FEATURE_COMMAND_IDS.renameSelected,
          context
        ).currentlyAvailable) {
          event.preventDefault();
          void executeRuntimeFeatureCommand(RUNTIME_FEATURE_COMMAND_IDS.renameSelected);
        }
        return;
      }

      const runHandledAction = (handled: boolean, execute: () => void) => {
        if (!shouldPreventEditorShortcutDefault(action, handled)) {
          return false;
        }
        event.preventDefault();
        execute();
        return true;
      };

      if (action === "clear-selection") {
        runHandledAction(
          runtimeSelection.ids.length > 0,
          clearSelection
        );
        return;
      }

      const canNudgeSelection =
        runtimeSelectionMovementEvaluation.allowed
        && selectedAlignableEntities.length > 0;
      if (!canNudgeSelection) {
        return;
      }

      const step = event.shiftKey
        ? nudgeSettings.largeNudgeStepMm
        : event.altKey || event.ctrlKey
          ? nudgeSettings.smallNudgeStepMm
          : nudgeSettings.nudgeStepMm;
      const delta = {
        "nudge-left": { x: -step, y: 0 },
        "nudge-right": { x: step, y: 0 },
        "nudge-forward": { x: 0, y: -step },
        "nudge-back": { x: 0, y: step }
      } as Partial<Record<string, { x: number; y: number }>>;
      const nudgeDelta = delta[action];

      if (nudgeDelta) {
        runHandledAction(true, () => moveSelectedByDelta(nudgeDelta.x, nudgeDelta.y));
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [
    clearSelection,
    executeCoreEditorCommand,
    executeRuntimeFeatureCommand,
    isConnectionPointSnapOpen,
    moveSelectedByDelta,
    nudgeSettings,
    runtimeSelection.ids.length,
    runtimeSelectionMovementEvaluation.allowed,
    runtimeFeatureCommandBridge,
    runtimePanelBridge,
    selectedAlignableEntities.length
  ]);

  const getPanelSectionRuntimeProps = (panelId: PanelSectionId) => ({
    expanded: panelSectionExpansion[panelId],
    visible: panelSectionVisibility[panelId],
    onExpandedChange: (expanded: boolean) => {
      if (expanded) {
        runtimePanelBridge.openPanel(panelId);
      } else {
        runtimePanelBridge.closePanel(panelId);
      }
    }
  });

  const editorRuntimeRegistry = createEditorRuntimeRegistry(
    editorDefinitionRegistry,
    [{
      editorId: LAYOUT_3D_EDITOR_ID,
      render: () => (
        <>
          <BabylonScene
            ref={sceneRef}
            placedMachines={visiblePlacedMachines}
            civilReferences={visibleCivilReferences}
            annotations={visibleAnnotations}
            selectedMachineIds={selectedMachineIds}
            primarySelectedMachineId={primarySelectedMachineId}
            selectedCivilReferenceId={selectedCivilReferenceId}
            selectedCivilReferenceIds={selectedCivilReferenceIds}
            selectedAnnotationId={selectedAnnotationId}
            lockedMachineIds={lockedMachineIds}
            lockedCivilReferenceIds={lockedCivilReferenceIds}
            lockedAnnotationIds={lockedAnnotationIds}
            activeGroupEditMachineIds={activeGroupEditMachineIds}
            selectedAssemblyId={selectedGroupId}
            activeGroupEditId={activeGroupEditId}
            onSelectMachine={selectMachine}
            onSelectCivilReference={selectCivilReferenceForEditing}
            onSelectAnnotation={selectAnnotationForEditing}
            onUpdateMachine={updateMachine}
            onSetMachinePositions={setMachinePositions}
            onSetAnnotationPosition={setAnnotationPosition}
            onSetCivilReferencePosition={setCivilReferencePosition}
            canBeginObjectDrag={canBeginObjectDrag}
            isSimulationRunning={isSimulationRunning}
            simulationSpeed={simulationSpeed}
            overlaySettings={overlaySettings}
            collisionResult={collisionResult}
            enableE2EDiagnostics={enableE2EDiagnostics}
            onVisualDiagnosticsChange={handleVisualDiagnosticsChange}
            onPerformanceMetricsChange={setLatestPerformanceMetrics}
          />
          <div className="workbench-viewport-context-layer" aria-live="polite">
            <ViewportArrangeBar
              selectionCount={selectedAlignableEntities.length}
              movementAllowed={!selectedGroup && runtimeSelectionMovementEvaluation.allowed}
              canDistribute={!selectedGroup && selectedAlignableEntities.length >= 3}
              canGroup={!selectedGroup && selectedAlignableEntities.length >= 2}
              canUngroup={Boolean(selectedGroup)}
              canOpenAdvancedAlignment={!selectedGroup && selectedAlignableEntities.length >= 2}
              connectAndSnapAvailable={connectionPointSnapAvailable && panelSectionVisibility[RUNTIME_PANEL_IDS.connectionPointSnap] !== false}
              connectAndSnapOpen={isConnectionPointSnapOpen}
              onAlign={(action) => executeRuntimeFeatureCommand(
                RUNTIME_FEATURE_COMMAND_IDS.alignSelection,
                { kind: "align", action } satisfies RuntimeAlignmentPayload
              )}
              onDistribute={(action) => executeRuntimeFeatureCommand(
                RUNTIME_FEATURE_COMMAND_IDS.alignSelection,
                { kind: "distribute", action } satisfies RuntimeAlignmentPayload
              )}
              onEqualGap={(action) => executeRuntimeFeatureCommand(
                RUNTIME_FEATURE_COMMAND_IDS.alignSelection,
                { kind: "equal-gap", action } satisfies RuntimeAlignmentPayload
              )}
              onGroup={() => executeCommandSurfaceItem(ASSEMBLY_COMMAND_IDS.createGroup)}
              onUngroup={() => executeCommandSurfaceItem(ASSEMBLY_COMMAND_IDS.ungroup)}
              onOpenAdvancedAlignment={() => executeCommandSurfaceItem(
                RUNTIME_FEATURE_COMMAND_IDS.alignmentTools
              )}
              onToggleConnectAndSnap={() => runtimePanelBridge.togglePanel(RUNTIME_PANEL_IDS.connectionPointSnap)}
            />
            {isConnectionPointSnapOpen && connectionPointSnapAvailable && panelSectionVisibility[RUNTIME_PANEL_IDS.connectionPointSnap] !== false ? (
              <div className="viewport-connect-popover" role="dialog" aria-label="Connect & Snap" data-testid="connect-and-snap-popover">
                <header><strong>Connect &amp; Snap</strong><button type="button" aria-label="Close Connect & Snap" onClick={() => runtimePanelBridge.closePanel(RUNTIME_PANEL_IDS.connectionPointSnap)}>Close</button></header>
                <ConnectionPointSnapPanel
                  selectedMachines={selectedMachines}
                  primarySelectedMachine={selectedMachine}
                  productFlowOnly
                  onSnap={(selection, movingPoint, fixedPoint) => {
                    void executeRuntimeFeatureCommand(
                      RUNTIME_FEATURE_COMMAND_IDS.connectionPointSnap,
                      { selection, movingPoint, fixedPoint } satisfies RuntimeConnectionSnapPayload
                    ).then(() => runtimePanelBridge.closePanel(RUNTIME_PANEL_IDS.connectionPointSnap));
                  }}
                />
              </div>
            ) : null}
          </div>
          {!isProjectStorageLoading
          && !hasAcceptedWorkingLayout ? (
            <EmptyProjectWelcome
              recoveryAvailable={Boolean(recoveryLayout)}
              onResumeRecovery={() => {
                void executeRuntimeFeatureCommand(RUNTIME_FEATURE_COMMAND_IDS.projectRestorePrompt);
              }}
              onDiscardRecovery={dismissAutosavedLayout}
              onCreateNewLayout={() => {
                void executeRuntimeFeatureCommand(RUNTIME_FEATURE_COMMAND_IDS.projectManager, { intent: "create" });
              }}
              onOpenExistingProject={() => {
                void executeRuntimeFeatureCommand(RUNTIME_FEATURE_COMMAND_IDS.projectManager, { intent: "open" });
              }}
            />
          ) : null}
        </>
      )
    }]
  );

  const activeWorkspaceLabel = workspaceProjection.activeWorkspaceId
    ? workspaceFallbackLabels[workspaceProjection.activeWorkspaceId]
    : "Custom Workspace";
  const workspacePanelOptions = useMemo(() => {
    const reachabilityById = new Map(
      workspacePanelReachability.map((panel) => [panel.panelId, panel])
    );
    return liveWorkspacePanelDescriptors.flatMap(({ definition }) => {
      const panel = reachabilityById.get(definition.id);
      if (!panel?.bound) {
        return [];
      }
      return [{
        id: definition.id,
        label: panel.title,
        visible: panelPreferences.get(definition.id)?.visible ?? definition.defaultVisible,
        available: panel.available,
        ...(panel.reason ? { unavailableReason: panel.reason } : {})
      }];
    });
  }, [panelPreferences, workspacePanelReachability]);
  const workspaceOptions = workspacePresetRegistry.presets.map((preset) => ({
    id: preset.id as WorkspaceId,
    label: workspaceFallbackLabels[preset.id],
    tooltip: workspaceFallbackTooltips[preset.id]
  }));

  useEffect(() => {
    if (panelSectionVisibility[activePrimaryPanelId as PanelSectionId] !== false) {
      return;
    }
    const nextPanelId = PRIMARY_DOCK_PANEL_IDS.find(
      (panelId) => panelSectionVisibility[panelId] !== false
    );
    if (nextPanelId) {
      setActivePrimaryPanelId(nextPanelId);
    }
  }, [activePrimaryPanelId, panelSectionVisibility]);

  const primarySelectionEntity = runtimeSelection.primaryId
    ? platformEntities.find((entity) => entity.id === runtimeSelection.primaryId)
    : undefined;
  const primaryDockInset = isPrimaryDockPresentationCollapsed ? 0 : effectivePrimaryDockWidth;
  const bottomDockInset = STATUS_BAR_HEIGHT;
  const layerNames = new Map(layers.map((layer) => [layer.id, layer.name]));
  const showLegacyCompatibilityStack = false;

  return (
    <WorkbenchShell
      workspaceInspectorMode={workspaceProjection.inspectorMode}
      applicationBar={(
        <WorkbenchApplicationBar
          workspaceControl={(
            <WorkspacePreferencesControl
              activeWorkspaceId={workspaceProjection.activeWorkspaceId}
              activeWorkspaceLabel={activeWorkspaceLabel}
              workspaceOptions={workspaceOptions}
              theme={uiPreferences.theme}
              density={uiPreferences.density}
              panelOptions={workspacePanelOptions}
              readOnly={workspacePreferencesReadOnly}
              readOnlyReason={workspacePreferencesReadOnlyReason}
              onSelectCurrentArrangement={() => {
                if (!workspacePreferencesReadOnly) {
                  workspaceRuntime.useCurrentArrangement();
                }
              }}
              onSelectWorkspace={(workspaceId) => {
                if (!workspacePreferencesReadOnly) {
                  workspaceRuntime.applyWorkspace(workspaceId);
                }
              }}
              onSelectTheme={(theme) => {
                if (!workspacePreferencesReadOnly) {
                  workspaceRuntime.updateTheme(theme);
                }
              }}
              onSelectDensity={(density) => {
                if (!workspacePreferencesReadOnly) {
                  workspaceRuntime.updateDensity(density);
                }
              }}
              onTogglePanel={(panelId, visible) => {
                const panel = runtimePanelBridge.getRuntimePanel(panelId);
                if (!workspacePreferencesReadOnly && panel?.bound && panel.available) {
                  workspaceRuntime.updatePanelVisibility(panelId, visible);
                }
              }}
            />
          )}
          hasUnsavedChanges={hasUnsavedProjectChanges}
          projectContext={{
            project: currentProject?.projectName ?? "No project",
            layout: currentLayout?.layoutName ?? "No layout",
            revision: currentRevision?.revisionCode ?? "No revision"
          }}
          onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
        />
      )}
      menuBar={(
        <WorkbenchMenuBar
          menus={commandSurfaceMenus}
          onExecute={executeCommandSurfaceItem}
        />
      )}
      commandBar={(
        <WorkbenchCommandBar
          items={commandBarItems}
          emphasizedCommandIds={workspaceProjection.emphasizedCommandIds}
          onExecute={executeCommandSurfaceItem}
        />
      )}
      primaryDock={(
        <WorkbenchPrimaryDock
          items={[
            {
              panelId: RUNTIME_PANEL_IDS.machineLibrary,
              label: "Library",
              content: (
                <MachineLibrary
                  onImportAsset={() => { void executeRuntimeFeatureCommand(RUNTIME_FEATURE_COMMAND_IDS.importAsset); }}
                  onCreateVariant={async (selection) => { const result = await executeRuntimeFeatureCommand(RUNTIME_FEATURE_COMMAND_IDS.createCustomVariant, selection); if (!result.handled) throw new Error(result.reason); }}
                  onAddMachine={async (selection) =>
                    (await executeRuntimeFeatureCommand(
                      RUNTIME_FEATURE_COMMAND_IDS.addMachine,
                      selection
                    )).status === "executed"}
                  isLibraryManagerOpen={isLibraryManagerOpen}
                  isTaxonomyManagerOpen={isTaxonomyManagerOpen}
                  onCloseLibraryManager={() => setIsLibraryManagerOpen(false)}
                  onCloseTaxonomyManager={() => runtimePanelBridge.closePanel(RUNTIME_PANEL_IDS.taxonomyManager)}
                  onLibraryManagerRuntimeControllerChange={setLibraryManagerRuntimeController}
                />
              )
            },
            {
              panelId: RUNTIME_PANEL_IDS.layoutExplorer,
              label: "Explorer",
              badge: platformEntities.length > 0 ? `${platformEntities.length}` : undefined,
              content: (
                <LayoutExplorer
                  entities={platformEntities}
                  selection={runtimeSelection}
                  layerNames={layerNames}
                  onSelectEntity={selectPlatformEntityForEditing}
                  renameRequestEntityId={renameRequest?.entityId}
                  renameRequestVersion={renameRequest?.version}
                  onRenameEntity={(entityId, name) =>
                    commandSurfaceAdapter.execute(
                      RUNTIME_FEATURE_COMMAND_IDS.renameSelected,
                      { entityId, name }
                    ).then((result) => result.handled)}
                  onRenameRequestHandled={() => setRenameRequest(null)}
                />
              )
            },
            {
              panelId: RUNTIME_PANEL_IDS.layers,
              label: "Layers",
              badge: layers.length > 1 ? `${layers.length}` : undefined,
              content: (
                <LayersPanel
                  layers={layers}
                  placedMachines={placedMachines}
                  annotations={annotations}
                  civilReferences={civilReferences}
                  selectedLayerId={selectedLayerId}
                  onSelectLayer={setSelectedLayerId}
                  onAddLayer={addLayer}
                  onRenameLayer={renameLayer}
                  onDeleteLayer={removeLayer}
                  onToggleVisibility={toggleLayerVisibility}
                  onToggleLocked={toggleLayerLocked}
                  onIsolateLayer={isolateSelectedLayer}
                  onShowAllLayers={showAllLayoutLayers}
                />
              )
            },
            {
              panelId: RUNTIME_PANEL_IDS.groups,
              label: "Groups",
              badge: groups.length > 0 ? `${groups.length}` : undefined,
              content: (
                <AssemblyTreePanel
                  groups={groups}
                  placedMachines={placedMachines}
                  civilReferences={civilReferences}
                  selectedGroupId={selectedGroupId}
                  activeGroupEditId={activeGroupEditId}
                  explicitSelectedEntityCount={explicitSelectedAlignableEntityIds.length}
                  removableSelectedEntityCount={removableActiveGroupEntityIds.length}
                  onCreateGroupFromSelection={(name) =>
                    executeAssemblyCommand(ASSEMBLY_COMMAND_IDS.createGroup, undefined, { name })}
                  onAddSelectionToGroup={(groupId) =>
                    executeAssemblyCommand(ASSEMBLY_COMMAND_IDS.addSelected, groupId)}
                  onRemoveSelectionFromGroup={(groupId) =>
                    executeAssemblyCommand(ASSEMBLY_COMMAND_IDS.removeSelected, groupId)}
                  onRenameGroup={renameObjectGroup}
                  onEnterGroupEdit={(groupId) => executeAssemblyCommand(ASSEMBLY_COMMAND_IDS.enterEdit, groupId)}
                  onExitGroupEdit={() => executeAssemblyCommand(ASSEMBLY_COMMAND_IDS.exitEdit)}
                  onUngroup={(groupId) => executeAssemblyCommand(ASSEMBLY_COMMAND_IDS.ungroup, groupId)}
                  onSelectGroup={selectObjectGroup}
                  onToggleGroupCollapsed={toggleGroupCollapsed}
                />
              )
            },
            {
              panelId: RUNTIME_PANEL_IDS.viewpoints,
              label: "Viewpoints",
              badge: viewpoints.length > 0 ? `${viewpoints.length}` : undefined,
              content: (
                <ViewpointsPanel
                  viewpoints={viewpoints}
                  selectedViewpointId={selectedViewpointId}
                  onSelectViewpoint={setSelectedViewpointId}
                  onCaptureViewpoint={captureViewpoint}
                  onApplyViewpoint={applyViewpoint}
                  onUpdateViewpoint={updateSelectedViewpointFromCurrentView}
                  onRenameViewpoint={renameViewpoint}
                  onDeleteViewpoint={removeViewpoint}
                  onStepViewpoint={stepViewpoint}
                />
              )
            }
          ].filter((item) => panelSectionVisibility[item.panelId] !== false)}
          activePanelId={activePrimaryPanelId}
          collapsed={isPrimaryDockPresentationCollapsed}
          width={effectivePrimaryDockWidth}
          minWidth={primaryDockWidthBounds.min}
          maxWidth={primaryDockWidthBounds.max}
          resizeEnabled={dockResizeEnabled}
          bottomInset={bottomDockInset}
          onActivate={(panelId) => {
            if (panelId === RUNTIME_PANEL_IDS.viewpoints) {
              runtimePanelBridge.togglePanel(panelId);
            } else {
              runtimePanelBridge.openPanel(panelId);
            }
          }}
          onToggleCollapsed={() => runtimePanelBridge.togglePanel(RUNTIME_PANEL_IDS.primaryDockShell)}
          onResize={setPrimaryDockWidth}
        />
      )}
      editorLeftInset={primaryDockInset}
      editorRightInset={isInspectorPresentationCollapsed ? 0 : panelWidth}
      editorBottomInset={bottomDockInset}
      editorHost={(
        <EditorHost
          activeEditorId={LAYOUT_3D_EDITOR_ID}
          definitionRegistry={editorDefinitionRegistry}
          runtimeRegistry={editorRuntimeRegistry}
        />
      )}
      secondaryDock={isInspectorPresentationCollapsed ? (
        <div className="workbench-dock-reopen-control is-right" data-app-shell-zone="machine-properties">
          <WorkbenchDockCollapseButton
            side="right"
            collapsed
            onToggle={openInspectorPresentation}
            testId="right-dock-collapse-toggle"
          />
        </div>
      ) : (
        <aside
          className="machine-panel"
          data-testid="right-panel"
          data-app-shell-zone="machine-properties"
          style={{
            "--panel-width": `${panelWidth}px`,
            bottom: `${bottomDockInset}px`,
            height: "auto"
          } as CSSProperties}
          aria-label="Context Inspector"
        >
          <button
            className="panel-resize-handle"
            type="button"
            aria-label="Resize right panel"
            onPointerDown={startPanelResize}
          />
          <header className="workbench-inspector-header">
            <strong>Inspector</strong>
            <WorkbenchDockCollapseButton
              side="right"
              collapsed={false}
              onToggle={closeInspectorPresentation}
              testId="right-dock-collapse-toggle"
            />
          </header>
          {showLegacyCompatibilityStack ? (
            <>
          {recoveryLayout ? (
            <section className="recovery-prompt" aria-label="Autosave recovery">
              <p>A previous unsaved layout was found. Restore it?</p>
              <div className="recovery-actions">
                <button
                  type="button"
                  onClick={() => executeRuntimeFeatureCommand(RUNTIME_FEATURE_COMMAND_IDS.projectRestorePrompt)}
                >
                  Restore
                </button>
                <button type="button" onClick={dismissAutosavedLayout}>
                  Dismiss
                </button>
              </div>
            </section>
          ) : null}
          <PanelSection
            title="Machine Library"
            defaultExpanded
            {...getPanelSectionRuntimeProps(RUNTIME_PANEL_IDS.machineLibrary)}
          >
            <MachineLibrary
              onImportAsset={() => { void executeRuntimeFeatureCommand(RUNTIME_FEATURE_COMMAND_IDS.importAsset); }}
              onCreateVariant={async (selection) => { const result = await executeRuntimeFeatureCommand(RUNTIME_FEATURE_COMMAND_IDS.createCustomVariant, selection); if (!result.handled) throw new Error(result.reason); }}
              onAddMachine={async (selection) =>
                (await executeRuntimeFeatureCommand(
                  RUNTIME_FEATURE_COMMAND_IDS.addMachine,
                  selection
                )).status === "executed"}
              isLibraryManagerOpen={isLibraryManagerOpen}
              isTaxonomyManagerOpen={isTaxonomyManagerOpen}
              onCloseLibraryManager={() => setIsLibraryManagerOpen(false)}
              onCloseTaxonomyManager={() => runtimePanelBridge.closePanel(RUNTIME_PANEL_IDS.taxonomyManager)}
              onLibraryManagerRuntimeControllerChange={setLibraryManagerRuntimeController}
            />
          </PanelSection>
          <PanelSection
            title="Layout Controls"
            defaultExpanded
            {...getPanelSectionRuntimeProps(RUNTIME_PANEL_IDS.layoutControls)}
          >
            <LayoutControls onExportLayout={exportLayout} onImportLayout={importLayout} />
          </PanelSection>
          <PanelSection
            title="Viewpoints"
            defaultExpanded={false}
            badge={viewpoints.length > 0 ? `${viewpoints.length}` : undefined}
            {...getPanelSectionRuntimeProps(RUNTIME_PANEL_IDS.viewpoints)}
          >
            <ViewpointsPanel
              viewpoints={viewpoints}
              selectedViewpointId={selectedViewpointId}
              onSelectViewpoint={setSelectedViewpointId}
              onCaptureViewpoint={captureViewpoint}
              onApplyViewpoint={applyViewpoint}
              onUpdateViewpoint={updateSelectedViewpointFromCurrentView}
              onRenameViewpoint={renameViewpoint}
              onDeleteViewpoint={removeViewpoint}
              onStepViewpoint={stepViewpoint}
            />
          </PanelSection>
          <PanelSection
            title="Layers"
            defaultExpanded={false}
            badge={layers.length > 1 ? `${layers.length}` : undefined}
            {...getPanelSectionRuntimeProps(RUNTIME_PANEL_IDS.layers)}
          >
            <LayersPanel
              layers={layers}
              placedMachines={placedMachines}
              annotations={annotations}
              civilReferences={civilReferences}
              selectedLayerId={selectedLayerId}
              onSelectLayer={setSelectedLayerId}
              onAddLayer={addLayer}
              onRenameLayer={renameLayer}
              onDeleteLayer={removeLayer}
              onToggleVisibility={toggleLayerVisibility}
              onToggleLocked={toggleLayerLocked}
              onIsolateLayer={isolateSelectedLayer}
              onShowAllLayers={showAllLayoutLayers}
            />
          </PanelSection>
          <PanelSection
            title="Building / Civil"
            defaultExpanded={false}
            badge={civilReferences.length > 0 ? `${civilReferences.length}` : undefined}
            {...getPanelSectionRuntimeProps(RUNTIME_PANEL_IDS.civilReferences)}
          >
            <CivilReferencePanel
              onAddCivilReference={(type) => {
                const commandId = {
                  "floor-area": RUNTIME_FEATURE_COMMAND_IDS.addFloor,
                  wall: RUNTIME_FEATURE_COMMAND_IDS.addWall,
                  column: RUNTIME_FEATURE_COMMAND_IDS.addColumn,
                  walkway: RUNTIME_FEATURE_COMMAND_IDS.addWalkway,
                  "restricted-area": RUNTIME_FEATURE_COMMAND_IDS.addRestrictedZone,
                  "reference-zone": RUNTIME_FEATURE_COMMAND_IDS.addReferenceZone
                } as const;
                const runtimeCommandId = commandId[type as keyof typeof commandId];
                if (runtimeCommandId) {
                  executeRuntimeFeatureCommand(runtimeCommandId);
                } else if (isCivilReferenceType(type)) {
                  addCivilReference(type);
                }
              }}
            />
          </PanelSection>
          <PanelSection
            title="Assembly Tree"
            defaultExpanded={false}
            badge={groups.length > 0 ? `${groups.length}` : undefined}
            {...getPanelSectionRuntimeProps(RUNTIME_PANEL_IDS.groups)}
          >
            <AssemblyTreePanel
              groups={groups}
              placedMachines={placedMachines}
              civilReferences={civilReferences}
              selectedGroupId={selectedGroupId}
              activeGroupEditId={activeGroupEditId}
              explicitSelectedEntityCount={explicitSelectedAlignableEntityIds.length}
              removableSelectedEntityCount={removableActiveGroupEntityIds.length}
              onCreateGroupFromSelection={(name) =>
                executeAssemblyCommand(ASSEMBLY_COMMAND_IDS.createGroup, undefined, { name })}
              onAddSelectionToGroup={(groupId) =>
                executeAssemblyCommand(ASSEMBLY_COMMAND_IDS.addSelected, groupId)}
              onRemoveSelectionFromGroup={(groupId) =>
                executeAssemblyCommand(ASSEMBLY_COMMAND_IDS.removeSelected, groupId)}
              onRenameGroup={renameObjectGroup}
              onEnterGroupEdit={(groupId) => executeAssemblyCommand(ASSEMBLY_COMMAND_IDS.enterEdit, groupId)}
              onExitGroupEdit={() => executeAssemblyCommand(ASSEMBLY_COMMAND_IDS.exitEdit)}
              onUngroup={(groupId) => executeAssemblyCommand(ASSEMBLY_COMMAND_IDS.ungroup, groupId)}
              onSelectGroup={selectObjectGroup}
              onToggleGroupCollapsed={toggleGroupCollapsed}
            />
          </PanelSection>
          <PanelSection
            title="Project Manager"
            defaultExpanded
            badge={hasUnsavedProjectChanges ? "Unsaved" : currentRevision?.revisionCode ?? "None"}
            {...getPanelSectionRuntimeProps(RUNTIME_PANEL_IDS.projectStatus)}
          >
            <section className="project-status-panel" aria-label="Current project status">
              <div className="property-readout">
                <span>Current Project</span>
                <strong>{currentProject?.projectName ?? "None"}</strong>
              </div>
              <div className="property-readout">
                <span>Current Layout</span>
                <strong>{currentLayout?.layoutName ?? "None"}</strong>
              </div>
              <div className="property-readout">
                <span>Current Revision</span>
                <strong>{currentRevision?.revisionCode ?? "None"}</strong>
              </div>
              <div className={`project-dirty-state${hasUnsavedProjectChanges ? " is-dirty" : ""}`}>
                {isProjectStorageLoading
                  ? "Loading project storage"
                  : projectStorageError
                    ? "Project storage unavailable"
                    : hasUnsavedProjectChanges
                      ? "Unsaved changes"
                      : "No unsaved project changes"}
              </div>
              {projectStorageError ? <p className="manager-validation">{projectStorageError}</p> : null}
              <button
                className="manager-open-button"
                data-testid="open-project-manager"
                type="button"
                disabled={isProjectStorageLoading}
                onClick={() => executeRuntimeFeatureCommand(RUNTIME_FEATURE_COMMAND_IDS.projectManager)}
              >
                Project Manager
              </button>
            </section>
          </PanelSection>
          <PanelSection
            title="Performance Benchmark"
            defaultExpanded={false}
            badge={isBenchmarkMode ? "Benchmark" : undefined}
            {...getPanelSectionRuntimeProps(RUNTIME_PANEL_IDS.performanceBenchmarkLauncher)}
          >
            <section className="project-status-panel" aria-label="Performance benchmark entry">
              <p className="collision-note">
                Optional scene diagnostics for FPS, mesh counts, and snapshot size.
              </p>
              <button
                className="manager-open-button"
                data-testid="open-performance-benchmark"
                type="button"
                onClick={() =>
                  executeRuntimeFeatureCommand(RUNTIME_FEATURE_COMMAND_IDS.performanceBenchmark)}
              >
                Performance Benchmark
              </button>
            </section>
          </PanelSection>
          <PanelSection
            title="Simulation Controls"
            defaultExpanded={false}
            badge={isSimulationRunning ? "Running" : undefined}
            {...getPanelSectionRuntimeProps(RUNTIME_PANEL_IDS.simulationControls)}
          >
            <SimulationControls
              isRunning={isSimulationRunning}
              speed={simulationSpeed}
              onToggleRunning={() => setIsSimulationRunning((current) => !current)}
              onChangeSpeed={setSimulationSpeed}
            />
          </PanelSection>
          <PanelSection
            title="Annotations"
            defaultExpanded={false}
            badge={annotations.length > 0 ? `${annotations.length}` : undefined}
            expandSignal={editingAnnotationId ? annotationSelectionSignal : null}
            {...getPanelSectionRuntimeProps(RUNTIME_PANEL_IDS.annotations)}
          >
            <AnnotationsPanel
              annotations={annotations}
              selectedAnnotationId={editingAnnotationId}
              placedMachines={placedMachines}
              layers={layers}
              isSelectedAnnotationLocked={selectedAnnotationLocked}
              onAddAnnotation={(type) =>
                executeRuntimeFeatureCommand(RUNTIME_FEATURE_COMMAND_IDS.createAnnotation, type)}
              onSelectAnnotation={selectAnnotationForEditing}
              onUpdateAnnotation={updateSelectedAnnotation}
              onChangeAnnotationLayer={changeAnnotationLayer}
              onCommitAnnotationEdit={commitAnnotationEdit}
              onDeleteAnnotation={executeDeleteSelectedCommand}
            />
          </PanelSection>
          <PanelSection
            title="Precision Placement"
            defaultExpanded
            badge={placementSettings.gridSnapEnabled ? `${placementSettings.gridSnapStepMm} mm` : "Free"}
            {...getPanelSectionRuntimeProps(RUNTIME_PANEL_IDS.precisionPlacement)}
          >
            <PrecisionPlacementPanel
              settings={placementSettings}
              placedMachines={placedMachines}
              selectedMachine={singleSelectedMachine}
              nudgeSettings={nudgeSettings}
              onChangeSettings={(settings) => {
                const rotationChanged =
                  settings.rotationSnapEnabled !== placementSettings.rotationSnapEnabled
                  || settings.rotationSnapStepDeg !== placementSettings.rotationSnapStepDeg;
                const measurementChanged =
                  settings.showMeasurementHelpers !== placementSettings.showMeasurementHelpers;
                if (rotationChanged) {
                  executeRuntimeFeatureCommand(RUNTIME_FEATURE_COMMAND_IDS.rotationSnap, settings);
                } else if (measurementChanged) {
                  executeRuntimeFeatureCommand(RUNTIME_FEATURE_COMMAND_IDS.showMeasurements, settings);
                } else {
                  setPlacementSettings(settings);
                }
              }}
              onChangeNudgeSettings={setNudgeSettings}
              onUpdateMachine={updateMachine}
            />
          </PanelSection>
          <PanelSection
            title="Alignment Tools"
            defaultExpanded={false}
            badge={selectedAlignableEntities.length >= 2 ? `${selectedAlignableEntities.length}` : undefined}
            {...getPanelSectionRuntimeProps(RUNTIME_PANEL_IDS.alignmentTools)}
          >
            <AlignmentToolsPanel
              selectedEntityCount={selectedAlignableEntities.length}
              primarySelectionLabel={primarySelectedAlignable?.label}
              onAlign={(action) => executeRuntimeFeatureCommand(
                RUNTIME_FEATURE_COMMAND_IDS.alignSelection,
                { kind: "align", action } satisfies RuntimeAlignmentPayload
              )}
              onDistribute={(action) => executeRuntimeFeatureCommand(
                RUNTIME_FEATURE_COMMAND_IDS.alignSelection,
                { kind: "distribute", action } satisfies RuntimeAlignmentPayload
              )}
              onEqualGap={(action) => executeRuntimeFeatureCommand(
                RUNTIME_FEATURE_COMMAND_IDS.alignSelection,
                { kind: "equal-gap", action } satisfies RuntimeAlignmentPayload
              )}
              onPairAlign={(action, gapMm) => executeRuntimeFeatureCommand(
                RUNTIME_FEATURE_COMMAND_IDS.alignSelection,
                { kind: "pair", action, gapMm } satisfies RuntimeAlignmentPayload
              )}
              onPairAnchorSnap={(primaryAnchor, secondaryAnchor) => executeRuntimeFeatureCommand(
                RUNTIME_FEATURE_COMMAND_IDS.alignSelection,
                { kind: "anchor", primaryAnchor, secondaryAnchor } satisfies RuntimeAlignmentPayload
              )}
            />
          </PanelSection>
          {connectionPointSnapAvailable ? (
            <PanelSection
              title="Connection Point Snap"
              defaultExpanded
              badge="2"
              {...getPanelSectionRuntimeProps(RUNTIME_PANEL_IDS.connectionPointSnap)}
            >
              <ConnectionPointSnapPanel
                selectedMachines={selectedMachines}
                primarySelectedMachine={selectedMachine}
                productFlowOnly
                onSnap={(selection, movingPoint, fixedPoint) => executeRuntimeFeatureCommand(
                  RUNTIME_FEATURE_COMMAND_IDS.connectionPointSnap,
                  { selection, movingPoint, fixedPoint } satisfies RuntimeConnectionSnapPayload
                )}
                onClearSelection={clearSelection}
              />
            </PanelSection>
          ) : null}
          <PanelSection
            title="Display / Overlay Controls"
            defaultExpanded={false}
            {...getPanelSectionRuntimeProps(RUNTIME_PANEL_IDS.displayOverlayControls)}
          >
            <DisplayOverlayControls
              settings={overlaySettings}
              onChange={(settings) => {
                if (settings.showLabels !== overlaySettings.showLabels) {
                  executeRuntimeFeatureCommand(RUNTIME_FEATURE_COMMAND_IDS.toggleLabels, settings);
                } else if (settings.showConnectionPoints !== overlaySettings.showConnectionPoints) {
                  executeRuntimeFeatureCommand(
                    RUNTIME_FEATURE_COMMAND_IDS.toggleConnectionPoints,
                    settings
                  );
                } else {
                  setOverlaySettings(settings);
                }
              }}
            />
          </PanelSection>
          <PanelSection
            title="Collision Check"
            defaultExpanded
            badge={collisionSettings.enabled ? `${collisionResult.pairs.length}` : "Off"}
            {...getPanelSectionRuntimeProps(RUNTIME_PANEL_IDS.collisionCheck)}
          >
            <CollisionCheckPanel
              settings={collisionSettings}
              result={collisionResult}
              onChange={setCollisionSettings}
            />
          </PanelSection>
            </>
          ) : null}
          <PanelSection
            title={editingAnnotationId ? "Annotation Properties" : selectedGroup ? "Assembly Properties" : selectedCivilReference ? "Civil Reference Properties" : selectedAlignableEntities.length > 1 ? "Multi-Selection" : "Selected Object Properties"}
            defaultExpanded
            badge={editingAnnotationId ? "Annotation" : selectedGroup ? selectedGroup.name : selectedCivilReference ? selectedCivilReference.name : selectedAlignableEntities.length > 1 ? `${selectedAlignableEntities.length}` : selectedMachine ? getPlacedMachineDisplayName(selectedMachine) : "None"}
            {...getPanelSectionRuntimeProps(RUNTIME_PANEL_IDS.inspector)}
          >
            {editingAnnotationId ? (
              <WorkbenchContextContribution
                panelId={RUNTIME_PANEL_IDS.annotations}
                title="Annotation Details"
                badge="Annotation"
                {...getPanelSectionRuntimeProps(RUNTIME_PANEL_IDS.annotations)}
              >
                <AnnotationsPanel
                  variant="properties"
                  annotations={annotations}
                  selectedAnnotationId={editingAnnotationId}
                  placedMachines={placedMachines}
                  layers={layers}
                  isSelectedAnnotationLocked={selectedAnnotationLocked}
                  onAddAnnotation={(type) =>
                    executeRuntimeFeatureCommand(RUNTIME_FEATURE_COMMAND_IDS.createAnnotation, type)}
                  onSelectAnnotation={selectAnnotationForEditing}
                  onUpdateAnnotation={updateSelectedAnnotation}
                  onChangeAnnotationLayer={changeAnnotationLayer}
                  onCommitAnnotationEdit={commitAnnotationEdit}
                  onDeleteAnnotation={executeDeleteSelectedCommand}
                />
              </WorkbenchContextContribution>
            ) : selectedGroup && (selectedCivilReferenceIds.length > 0 || selectedMachineIds.length <= 1) ? (
              <div className="property-grid" data-testid="assembly-properties-panel">
                <div className="property-readout">
                  <span>Assembly</span>
                  <strong>{selectedGroup.name}</strong>
                </div>
                <div className="property-readout">
                  <span>Members</span>
                  <strong>{selectedAlignableEntities.length}</strong>
                </div>
                <div className="property-readout">
                  <span>Mode</span>
                  <strong>{activeGroupEditId === selectedGroup.id ? "Editing members" : "Rigid assembly"}</strong>
                </div>
                <div className="selection-actions">
                  {activeGroupEditId === selectedGroup.id ? (
                    <button type="button" onClick={() => executeAssemblyCommand(ASSEMBLY_COMMAND_IDS.exitEdit)}>
                      Exit Group Edit
                    </button>
                  ) : (
                    <button type="button" onClick={() => executeAssemblyCommand(ASSEMBLY_COMMAND_IDS.enterEdit, selectedGroup.id)}>
                      Edit Group
                    </button>
                  )}
                  <button className="danger-action" type="button" onClick={() => executeAssemblyCommand(ASSEMBLY_COMMAND_IDS.ungroup, selectedGroup.id)}>
                    Ungroup
                  </button>
                </div>
              </div>
            ) : selectedCivilReference ? (
              <CivilReferenceProperties
                selectedCivilReference={selectedCivilReference}
                layers={layers}
                isLocked={selectedCivilReferenceLocked}
                onUpdateCivilReference={updateSelectedCivilReference}
                onChangeLayer={changeCivilReferenceLayer}
                onDeleteCivilReference={executeDeleteSelectedCommand}
              />
            ) : selectedMachineIds.length > 1 && selectedCivilReferenceIds.length === 0 ? (
              <MultiSelectionProperties
                selectedMachines={selectedMachines}
                assemblyName={selectedGroup?.name}
                primarySelectedMachine={selectedMachine}
                selectionBounds={selectionBounds}
              />
            ) : selectedAlignableEntities.length > 1 ? (
              <div className="property-grid">
                <div className="property-readout">
                  <span>{selectedGroup ? "Assembly" : "Selected entities"}</span>
                  <strong>{selectedGroup?.name ?? selectedAlignableEntities.length}</strong>
                </div>
              </div>
            ) : singleSelectedMachine ? (
              <>
                <MachineProperties
                  selectedMachine={singleSelectedMachine}
                  layers={layers}
                  isLocked={selectedMachineLocked}
                  placementSettings={placementSettings}
                  visualDiagnostics={selectedVisualDiagnostics}
                  collisionPairs={selectedCollisionPairs}
                  onUpdateMachine={updateMachine}
                  onChangeLayer={changeMachineLayer}
                  onDuplicateSelected={executeDuplicateSelectedCommand}
                  onDeleteSelected={executeDeleteSelectedCommand}
                />
                <WorkbenchContextContribution
                  panelId={RUNTIME_PANEL_IDS.precisionPlacement}
                  title="Placement Settings"
                  badge={placementSettings.gridSnapEnabled
                    ? `${placementSettings.gridSnapStepMm} mm`
                    : "Free"}
                  {...getPanelSectionRuntimeProps(RUNTIME_PANEL_IDS.precisionPlacement)}
                >
                  <PrecisionPlacementPanel
                    settings={placementSettings}
                    placedMachines={placedMachines}
                    selectedMachine={singleSelectedMachine}
                    nudgeSettings={nudgeSettings}
                    onChangeSettings={setPlacementSettings}
                    onChangeNudgeSettings={setNudgeSettings}
                    onUpdateMachine={updateMachine}
                  />
                </WorkbenchContextContribution>
              </>
            ) : (
              <p className="empty-selection" data-testid="inspector-empty-state">
                Select a machine, civil reference, annotation, or group to inspect it.
              </p>
            )}
          </PanelSection>
          {showLegacyCompatibilityStack && !editingAnnotationId ? (
            <PanelSection
              title={selectedGroup ? "Assembly Properties" : selectedCivilReference ? "Civil Reference Properties" : selectedAlignableEntities.length > 1 ? "Multi-Selection" : "Selected Object Properties"}
              defaultExpanded={selectedAlignableEntities.length > 0 || Boolean(selectedCivilReference) || Boolean(selectedGroup)}
              badge={selectedGroup ? selectedGroup.name : selectedCivilReference ? selectedCivilReference.name : selectedAlignableEntities.length > 1 ? `${selectedAlignableEntities.length}` : selectedMachine ? getPlacedMachineDisplayName(selectedMachine) : "None"}
              {...getPanelSectionRuntimeProps(RUNTIME_PANEL_IDS.inspector)}
            >
              {selectedGroup && (selectedCivilReferenceIds.length > 0 || selectedMachineIds.length <= 1) ? (
                <div className="property-grid" data-testid="assembly-properties-panel">
                  <div className="property-readout">
                    <span>Assembly</span>
                    <strong>{selectedGroup.name}</strong>
                  </div>
                  <div className="property-readout">
                    <span>Members</span>
                    <strong>{selectedAlignableEntities.length}</strong>
                  </div>
                  <div className="property-readout">
                    <span>Mode</span>
                    <strong>{activeGroupEditId === selectedGroup.id ? "Editing members" : "Rigid assembly"}</strong>
                  </div>
                  <div className="selection-actions">
                    {activeGroupEditId === selectedGroup.id ? (
                      <button type="button" onClick={() => executeAssemblyCommand(ASSEMBLY_COMMAND_IDS.exitEdit)}>
                        Exit Group Edit
                      </button>
                    ) : (
                      <button type="button" onClick={() => executeAssemblyCommand(ASSEMBLY_COMMAND_IDS.enterEdit, selectedGroup.id)}>
                        Edit Group
                      </button>
                    )}
                    <button className="danger-action" type="button" onClick={() => executeAssemblyCommand(ASSEMBLY_COMMAND_IDS.ungroup, selectedGroup.id)}>
                      Ungroup
                    </button>
                  </div>
                </div>
              ) : selectedCivilReference ? (
                <CivilReferenceProperties
                  selectedCivilReference={selectedCivilReference}
                  layers={layers}
                  isLocked={selectedCivilReferenceLocked}
                  onUpdateCivilReference={updateSelectedCivilReference}
                  onChangeLayer={changeCivilReferenceLayer}
                  onDeleteCivilReference={executeDeleteSelectedCommand}
                />
              ) : selectedMachineIds.length > 1 && selectedCivilReferenceIds.length === 0 ? (
                <MultiSelectionProperties
                  selectedMachines={selectedMachines}
                  assemblyName={selectedGroup?.name}
                  primarySelectedMachine={selectedMachine}
                  selectionBounds={selectionBounds}
                />
              ) : selectedAlignableEntities.length > 1 ? (
                <div className="property-grid">
                  <div className="property-readout">
                    <span>{selectedGroup ? "Assembly" : "Selected entities"}</span>
                    <strong>{selectedGroup?.name ?? selectedAlignableEntities.length}</strong>
                  </div>
                  <p className="collision-note">Use Alignment Tools to align the selected machines and civil references.</p>
                  <button type="button" onClick={clearSelection}>
                    Clear Selection
                  </button>
                </div>
              ) : (
                <MachineProperties
                  selectedMachine={singleSelectedMachine}
                  layers={layers}
                  isLocked={selectedMachineLocked}
                  placementSettings={placementSettings}
                  visualDiagnostics={selectedVisualDiagnostics}
                  collisionPairs={selectedCollisionPairs}
                  onUpdateMachine={updateMachine}
                  onChangeLayer={changeMachineLayer}
                  onDuplicateSelected={executeDuplicateSelectedCommand}
                  onDeleteSelected={executeDeleteSelectedCommand}
                />
              )}
            </PanelSection>
          ) : null}
        </aside>
      )}
      statusBar={(
        <WorkbenchStatusBar
          selectionCount={runtimeSelection.ids.length}
          primarySelection={primarySelectionEntity
            ? { name: primarySelectionEntity.name, type: primarySelectionEntity.type }
            : undefined}
          snapLabel={[
            placementSettings.gridSnapEnabled ? `${placementSettings.gridSnapStepMm} mm grid` : "Grid off",
            placementSettings.rotationSnapEnabled ? `${placementSettings.rotationSnapStepDeg} deg rotation` : "Rotation off"
          ].join(" | ")}
          dirty={hasUnsavedProjectChanges}
        />
      )}
      overlayLayer={(
        <div className="workbench-overlay-layer">
          <input
            ref={projectImportFileInputRef}
            className="file-input"
            data-testid="import-project-file"
            type="file"
            accept="application/json,.json"
            onChange={handleProjectImportFileChange}
          />
          {isCommandPaletteOpen ? (
            <CommandPalette
              items={commandPaletteItems}
              onExecute={executeCommandSurfaceItem}
              onClose={() => setIsCommandPaletteOpen(false)}
            />
          ) : null}
          {isAdvancedAlignmentOpen ? (
            <div className="manager-backdrop" data-testid="advanced-alignment-tool-surface">
              <section className="manager-dialog workbench-tool-dialog" role="dialog" aria-modal="true" aria-label="Advanced Alignment">
                <header className="manager-header">
                  <div><span>Arrange</span><h2>Advanced Alignment</h2></div>
                  <button type="button" aria-label="Close Advanced Alignment" onClick={() => runtimePanelBridge.closePanel(RUNTIME_PANEL_IDS.alignmentTools)}>Close</button>
                </header>
                <div className="workbench-tool-dialog-body">
                  <AlignmentToolsPanel
                    selectedEntityCount={selectedAlignableEntities.length}
                    primarySelectionLabel={primarySelectedAlignable?.label}
                    movementAllowed={!selectedGroup && runtimeSelectionMovementEvaluation.allowed}
                    onAlign={(action) => executeRuntimeFeatureCommand(RUNTIME_FEATURE_COMMAND_IDS.alignSelection, { kind: "align", action } satisfies RuntimeAlignmentPayload)}
                    onDistribute={(action) => executeRuntimeFeatureCommand(RUNTIME_FEATURE_COMMAND_IDS.alignSelection, { kind: "distribute", action } satisfies RuntimeAlignmentPayload)}
                    onEqualGap={(action) => executeRuntimeFeatureCommand(RUNTIME_FEATURE_COMMAND_IDS.alignSelection, { kind: "equal-gap", action } satisfies RuntimeAlignmentPayload)}
                    onPairAlign={(action, gapMm) => executeRuntimeFeatureCommand(RUNTIME_FEATURE_COMMAND_IDS.alignSelection, { kind: "pair", action, gapMm } satisfies RuntimeAlignmentPayload)}
                    onPairAnchorSnap={(primaryAnchor, secondaryAnchor) => executeRuntimeFeatureCommand(RUNTIME_FEATURE_COMMAND_IDS.alignSelection, { kind: "anchor", primaryAnchor, secondaryAnchor } satisfies RuntimeAlignmentPayload)}
                  />
                </div>
              </section>
            </div>
          ) : null}
          {isProjectManagerOpen ? (
            <ProjectManager
              entryIntent={projectManagerEntryIntent}
              projects={projects}
              currentProjectId={currentProjectId}
              currentLayoutId={currentLayoutId}
              currentRevisionId={currentRevisionId}
              currentSnapshot={createLayoutSnapshot()}
              hasSceneObjects={placedMachines.length > 0 || civilReferences.length > 0}
              isDirty={hasUnsavedProjectChanges}
              onClose={() => runtimePanelBridge.closePanel(RUNTIME_PANEL_IDS.projectManager)}
              onProjectsChanged={setProjects}
              onCurrentSelectionChange={(projectId, layoutId, revisionId) => {
                setCurrentProjectId(projectId);
                setCurrentLayoutId(layoutId);
                setCurrentRevisionId(revisionId);
              }}
              onLoadRevision={loadRevisionSnapshot}
              onSavedRevision={(projectId, layoutId, revisionId) => {
                setCurrentProjectId(projectId);
                setCurrentLayoutId(layoutId);
                setCurrentRevisionId(revisionId);
                setHasAcceptedWorkingLayout(true);
                void refreshProjects();
                setHasUnsavedProjectChanges(false);
              }}
              onExecuteRuntimeCommand={(commandId, payload) => {
                return executeRuntimeFeatureCommand(commandId, payload);
              }}
              onRequestProjectImport={requestProjectImportFile}
            />
          ) : null}
          {isAssetImportOpen && <NativeAssetImport onClose={() => setIsAssetImportOpen(false)} />}
          {isHelpOpen ? (
            <HelpModal
              initialSection={helpSection}
              onClose={() => runtimePanelBridge.closePanel(RUNTIME_PANEL_IDS.help)}
            />
          ) : null}
          {isCommercialOutputsOpen ? (
            <CommercialOutputsModal
              snapshot={commercialOutputSnapshot}
              actions={{
                bom: commercialOutputSnapshot.equipmentCount > 0
                  ? { enabled: true }
                  : { enabled: false, reason: "Add equipment before exporting a BOM." },
                plan: commercialOutputSnapshot.extents
                  ? { enabled: true }
                  : { enabled: false, reason: "Add visible layout geometry before exporting a plan." },
                snapshot: commercialOutputSnapshot.planFootprints.some((footprint) => footprint.visible)
                  ? { enabled: true }
                  : { enabled: false, reason: "Add visible scene content before exporting a snapshot." }
              }}
              onExport={async (kind: CommercialOutputKind) => {
                const commandId = kind === "bom"
                  ? RUNTIME_FEATURE_COMMAND_IDS.exportBomExcel
                  : kind === "plan"
                    ? RUNTIME_FEATURE_COMMAND_IDS.exportLayoutPdf
                    : RUNTIME_FEATURE_COMMAND_IDS.exportScenePng;
                const result = await executeRuntimeFeatureCommand(commandId);
                if (!result.handled) {
                  throw new Error(result.reason ?? "The commercial output command was not completed.");
                }
              }}
              onClose={() => runtimePanelBridge.closePanel(RUNTIME_PANEL_IDS.commercialOutputs)}
            />
          ) : null}
          {isPerformanceBenchmarkOpen ? (
            <PerformanceBenchmarkModal
              currentSnapshot={createLayoutSnapshot()}
              latestMetrics={latestPerformanceMetrics}
              onApplyBenchmarkScene={applyBenchmarkMachines}
              onRestoreScene={restoreBenchmarkSnapshot}
              onClearBenchmarkScene={clearBenchmarkScene}
              onClose={() => runtimePanelBridge.closePanel(RUNTIME_PANEL_IDS.performanceBenchmark)}
            />
          ) : null}
          {isDisplayOverlayControlsOpen ? (
            <div className="manager-backdrop" data-testid="display-overlay-tool-surface">
              <section
                className="manager-dialog workbench-tool-dialog"
                role="dialog"
                aria-modal="true"
                aria-label="Display / Overlay Controls"
              >
                <header className="manager-header">
                  <div>
                    <span>View Tool</span>
                    <h2>Display / Overlay Controls</h2>
                  </div>
                  <button
                    type="button"
                    aria-label="Close Display / Overlay Controls"
                    onClick={() => runtimePanelBridge.closePanel(RUNTIME_PANEL_IDS.displayOverlayControls)}
                  >
                    Close
                  </button>
                </header>
                <div className="workbench-tool-dialog-body">
                  <DisplayOverlayControls
                    settings={overlaySettings}
                    onChange={(settings) => {
                      if (settings.showLabels !== overlaySettings.showLabels) {
                        executeRuntimeFeatureCommand(RUNTIME_FEATURE_COMMAND_IDS.toggleLabels, settings);
                      } else if (settings.showConnectionPoints !== overlaySettings.showConnectionPoints) {
                        executeRuntimeFeatureCommand(
                          RUNTIME_FEATURE_COMMAND_IDS.toggleConnectionPoints,
                          settings
                        );
                      } else {
                        setOverlaySettings(settings);
                      }
                    }}
                  />
                </div>
              </section>
            </div>
          ) : null}
          {isCollisionCheckOpen ? (
            <div className="manager-backdrop" data-testid="collision-check-tool-surface">
              <section className="manager-dialog workbench-tool-dialog" role="dialog" aria-modal="true" aria-label="Collision Check">
                <header className="manager-header">
                  <div>
                    <span>Engineering Tool</span>
                    <h2>Collision Check</h2>
                  </div>
                  <button
                    type="button"
                    aria-label="Close Collision Check"
                    onClick={() => runtimePanelBridge.closePanel(RUNTIME_PANEL_IDS.collisionCheck)}
                  >
                    Close
                  </button>
                </header>
                <div className="workbench-tool-dialog-body">
                  <CollisionCheckPanel
                    settings={collisionSettings}
                    result={collisionResult}
                    onChange={setCollisionSettings}
                  />
                </div>
              </section>
            </div>
          ) : null}
          {isLayoutControlsOpen ? (
            <div className="manager-backdrop" data-testid="layout-controls-tool-surface">
              <section
                className="manager-dialog workbench-tool-dialog"
                role="dialog"
                aria-modal="true"
                aria-label="Layout Import / Export"
              >
                <header className="manager-header">
                  <div>
                    <span>File Tool</span>
                    <h2>Layout Import / Export</h2>
                  </div>
                  <button
                    type="button"
                    aria-label="Close Layout Import / Export"
                    onClick={() => runtimePanelBridge.closePanel(RUNTIME_PANEL_IDS.layoutControls)}
                  >
                    Close
                  </button>
                </header>
                <div className="workbench-tool-dialog-body">
                  <LayoutControls onExportLayout={exportLayout} onImportLayout={importLayout} />
                </div>
              </section>
            </div>
          ) : null}
          {isSimulationControlsOpen ? (
            <div className="manager-backdrop" data-testid="simulation-controls-tool-surface">
              <section className="manager-dialog workbench-tool-dialog" role="dialog" aria-modal="true" aria-label="Simulation Controls">
                <header className="manager-header">
                  <div>
                    <span>Global Tool</span>
                    <h2>Simulation Controls</h2>
                  </div>
                  <button
                    type="button"
                    aria-label="Close Simulation Controls"
                    onClick={() => runtimePanelBridge.closePanel(RUNTIME_PANEL_IDS.simulationControls)}
                  >
                    Close
                  </button>
                </header>
                <div className="workbench-tool-dialog-body">
                  <SimulationControls
                    isRunning={isSimulationRunning}
                    speed={simulationSpeed}
                    onToggleRunning={() => setIsSimulationRunning((current) => !current)}
                    onChangeSpeed={setSimulationSpeed}
                  />
                </div>
              </section>
            </div>
          ) : null}
        </div>
      )}
    />
  );
}
